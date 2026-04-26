"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileUp,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowLeft,
  Sparkles,
  RefreshCw,
} from "lucide-react";

/**
 * src/app/(public)/user/resume/upload/page.tsx
 *
 * Backend-integrated Resume Upload Page
 *
 * Latest project alignment:
 * - backend-first resume flow
 * - resilient response normalization
 * - token + cookie aware upload request
 * - upload result aligned with resume/version architecture
 *
 * Expected backend endpoint:
 * POST /api/user/resume/upload
 *
 * Upload field name:
 * file
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  uploadResume: `${API_BASE_URL}/api/user/resume/upload`,
};

type UploadResumeResult = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  structuredContentJson?: string;
  fileUrl?: string;
  previewUrl?: string;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  updatedAt?: string;
  createdAt?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
  parsed?: T | null;
};

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("accessToken")
  );
}

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null): T | null {
  if (!json) return null;
  const envelope = json as ApiEnvelope<T>;
  return (
    envelope.data ??
    envelope.payload ??
    envelope.result ??
    envelope.parsed ??
    (json as T)
  );
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(
  value: unknown,
  fallback?: number
): number | undefined {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    return lower === "true" || lower === "1" || lower === "yes";
  }
  return false;
}

function formatDateTime(value?: string) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeUploadResult(raw: any): UploadResumeResult | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    resumeId:
      normalizeNumber(raw.resumeId) ??
      normalizeNumber(raw.id) ??
      normalizeNumber(raw.resume?.resumeId) ??
      normalizeNumber(raw.resume?.id),

    resumeVersionId:
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.currentVersionId),

    versionId:
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.currentVersionId),

    resumeName:
      normalizeString(raw.resumeName) ||
      normalizeString(raw.name) ||
      normalizeString(raw.resumeTitle),

    fileName:
      normalizeString(raw.fileName) ||
      normalizeString(raw.originalFileName) ||
      normalizeString(raw.documentName),

    atsScore:
      normalizeNumber(raw.atsScore) ??
      normalizeNumber(raw.score) ??
      normalizeNumber(raw.ats) ??
      0,

    rawText:
      normalizeString(raw.rawText) ||
      normalizeString(raw.contentText) ||
      normalizeString(raw.textContent) ||
      normalizeString(raw.content),

    structuredContentJson:
      normalizeString(raw.structuredContentJson) ||
      normalizeString(raw.structuredContent) ||
      normalizeString(raw.structuredJson),

    fileUrl:
      normalizeString(raw.fileUrl) ||
      normalizeString(raw.downloadUrl) ||
      normalizeString(raw.filePath),

    previewUrl:
      normalizeString(raw.previewUrl) ||
      normalizeString(raw.previewFileUrl),

    versionCode: normalizeString(raw.versionCode),
    versionType: normalizeString(raw.versionType),

    isBaseVersion: normalizeBoolean(
      raw.isBaseVersion ?? raw.baseVersion ?? raw.isBase
    ),

    updatedAt:
      normalizeString(raw.updatedAt) ||
      normalizeString(raw.lastModifiedAt) ||
      normalizeString(raw.modifiedAt) ||
      normalizeString(raw.createdAt),

    createdAt:
      normalizeString(raw.createdAt) ||
      normalizeString(raw.uploadedAt) ||
      normalizeString(raw.generatedAt),
  };
}

export default function ResumeUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [uploadedResume, setUploadedResume] = useState<UploadResumeResult | null>(
    null
  );

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = getStoredToken();

  const allowedTypes = useMemo(
    () => [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    []
  );

  const validateFile = useCallback(
    (file: File) => {
      const isValidType =
        allowedTypes.includes(file.type) ||
        /\.(pdf|txt|doc|docx)$/i.test(file.name);

      if (!isValidType) {
        setErrorMessage("Only .pdf, .txt, .doc, and .docx files are allowed.");
        return false;
      }

      const maxSizeMb = 10;
      const maxBytes = maxSizeMb * 1024 * 1024;

      if (file.size > maxBytes) {
        setErrorMessage(`File size must be under ${maxSizeMb} MB.`);
        return false;
      }

      return true;
    },
    [allowedTypes]
  );

  const handleSelectedFile = useCallback(
    (file: File) => {
      setErrorMessage(null);
      setSuccessMessage(null);
      setUploadedResume(null);

      if (!validateFile(file)) return;
      setSelectedFile(file);
    },
    [validateFile]
  );

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectedFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadedResume(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadResume = async () => {
    if (!selectedFile) {
      setErrorMessage("Please choose a resume file first.");
      setSuccessMessage(null);
      return;
    }

    try {
      setUploading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setUploadedResume(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(API_ROUTES.uploadResume, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: formData,
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Resume upload failed with status ${response.status}`
        );
      }

      const normalized = normalizeUploadResult(unwrapResponse<any>(resultJson));

      if (normalized) {
        setUploadedResume(normalized);

        if (typeof window !== "undefined") {
          const uploadedFileName = normalized.fileName || selectedFile.name;

          localStorage.setItem("userResumeName", uploadedFileName);

          if (normalized.resumeId != null) {
            localStorage.setItem("activeResumeId", String(normalized.resumeId));
          }

          if (normalized.resumeVersionId != null || normalized.versionId != null) {
            localStorage.setItem(
              "activeResumeVersionId",
              String(normalized.resumeVersionId ?? normalized.versionId)
            );
          }
        }
      } else if (typeof window !== "undefined") {
        localStorage.setItem("userResumeName", selectedFile.name);
      }

      setSuccessMessage(
        (resultJson as ApiEnvelope<any>)?.message ||
          "Resume uploaded successfully."
      );
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Resume upload error:", error);
      setErrorMessage(error?.message || "Failed to upload resume to backend.");
    } finally {
      setUploading(false);
    }
  };

  const openResumePage = () => {
    if (uploadedResume?.resumeId != null) {
      router.push(`/user/resume/${uploadedResume.resumeId}`);
      return;
    }

    router.push("/user/resume");
  };

  const openVersionPage = () => {
    if (
      uploadedResume?.resumeId != null &&
      (uploadedResume?.resumeVersionId != null || uploadedResume?.versionId != null)
    ) {
      const resumeId = String(uploadedResume.resumeId);
      const versionId = String(
        uploadedResume.resumeVersionId ?? uploadedResume.versionId
      );
      router.push(`/user/resume/${resumeId}/versions/${versionId}`);
      return;
    }

    openResumePage();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.push("/user/resume")}
              className="mb-4 inline-flex items-center gap-2 text-white/70 transition hover:text-white"
            >
              <ArrowLeft size={18} />
              Back to Resume Page
            </button>

            <h1 className="bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Upload Resume
            </h1>

            <p className="mt-2 max-w-2xl text-white/60">
              Upload your resume into the Resume Management System. The backend
              will store it, parse it, create the current version, and prepare it
              for editing, ATS scoring, duplication, and tailoring.
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
            <CheckCircle2 size={18} className="mt-0.5 text-green-300" />
            <p className="text-sm text-green-100">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <p className="text-sm text-red-100">{errorMessage}</p>
          </div>
        )}

        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold sm:text-2xl">
                Resume File Upload
              </h2>
              <p className="mt-2 text-sm text-white/55">
                Supported formats: PDF, DOC, DOCX, TXT
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/70">
              <Sparkles size={16} />
              Backend Integrated
            </div>
          </div>

          <div
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-10 ${
              dragActive
                ? "border-blue-500 bg-blue-500/10"
                : "border-white/15 bg-black/20"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="mb-4 flex justify-center">
              <FileUp size={42} className="text-blue-300" />
            </div>

            <h3 className="text-lg font-semibold text-white">
              Drag and drop your resume here
            </h3>

            <p className="mt-2 text-sm text-white/50">
              or choose a file from your device
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={18} />
                Choose File
              </button>

              <button
                onClick={clearFile}
                disabled={(!selectedFile && !uploadedResume) || uploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={18} />
                Clear
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
            <div className="mb-3 flex items-center gap-3">
              <FileText size={20} className="text-indigo-300" />
              <h3 className="text-base font-semibold">Selected File</h3>
            </div>

            {selectedFile ? (
              <div className="space-y-2 break-all text-sm text-white/75">
                <p>
                  <span className="text-white/45">Name:</span>{" "}
                  <span className="text-white/90">{selectedFile.name}</span>
                </p>
                <p>
                  <span className="text-white/45">Type:</span>{" "}
                  <span className="text-white/90">
                    {selectedFile.type || "Unknown"}
                  </span>
                </p>
                <p>
                  <span className="text-white/45">Size:</span>{" "}
                  <span className="text-white/90">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-white/50">No file selected yet.</p>
            )}
          </div>

          {uploadedResume && (
            <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-green-300" />
                <h3 className="text-base font-semibold">Uploaded Resume Summary</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">Resume Name</p>
                  <p className="text-sm font-semibold text-white/85">
                    {uploadedResume.resumeName || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">File Name</p>
                  <p className="break-all text-sm font-semibold text-white/85">
                    {uploadedResume.fileName || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">Resume ID</p>
                  <p className="text-sm font-semibold text-white/85">
                    {uploadedResume.resumeId ?? "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">Version ID</p>
                  <p className="text-sm font-semibold text-white/85">
                    {uploadedResume.resumeVersionId ??
                      uploadedResume.versionId ??
                      "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">ATS Score</p>
                  <p className="text-2xl font-bold text-emerald-300">
                    {uploadedResume.atsScore ?? 0}%
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">Updated At</p>
                  <p className="text-sm font-semibold text-white/85">
                    {formatDateTime(uploadedResume.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={openResumePage}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                >
                  <FileText size={18} />
                  Open Resume
                </button>

                <button
                  onClick={openVersionPage}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                >
                  <RefreshCw size={18} />
                  Open Version
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col justify-end gap-3 sm:flex-row">
            <button
              onClick={() => router.push("/user/resume")}
              disabled={uploading}
              className="w-full rounded-xl bg-gray-700 px-6 py-3 font-semibold transition hover:bg-gray-600 disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>

            <button
              onClick={uploadResume}
              disabled={!selectedFile || uploading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-green-500 to-blue-600 px-6 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload Resume
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}