"use client";

import { useMemo, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Sparkles,
  Download,
  Trash2,
  ShieldCheck,
} from "lucide-react";

/**
 * src/components/resume/ResumeUploadCard.tsx
 *
 * Backend-integrated resume upload card aligned with the latest project update.
 *
 * Primary backend endpoint:
 * POST /api/user/resume/upload
 *
 * Optional post-upload follow-up endpoint:
 * GET /api/user/resume/current
 *
 * Supported response styles:
 * 1) Direct:
 *    {
 *      success: true,
 *      message: "...",
 *      data: { ...resumePayload }
 *    }
 *
 * 2) Wrapped:
 *    {
 *      success: true,
 *      message: "...",
 *      data: {
 *        success: true,
 *        message: "...",
 *        data: { ...resumePayload }
 *      }
 *    }
 *
 * 3) Flexible backend envelopes:
 *    { data: ... } / { payload: ... } / { result: ... }
 *
 * Notes:
 * - Uses token fallback strategy aligned with project auth flow.
 * - Keeps credentials: "include" for cookie-backed auth compatibility.
 * - Supports resilient backend payload unwrapping.
 * - Stores lightweight resume hints in localStorage for UI continuity.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

type Nullable<T> = T | null | undefined;

export type ResumeUploadResult = {
  resumeId?: number | string;
  id?: number | string;
  resumeVersionId?: number | string;
  versionId?: number | string;
  currentVersionId?: number | string;
  versionCode?: string;
  resumeCode?: string;
  resumeName?: string;
  title?: string;
  versionName?: string;
  fileName?: string;
  originalFileName?: string;
  atsScore?: number;
  rawText?: string;
  structuredContentJson?: unknown;
  previewUrl?: string;
  downloadUrl?: string;
  fileUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

type ResumeUploadCardProps = {
  title?: string;
  subtitle?: string;
  className?: string;
  acceptedTypes?: string;
  maxFileSizeMB?: number;
  disabled?: boolean;
  autoPreviewText?: boolean;
  showPreviewText?: boolean;
  showUploadedActions?: boolean;
  uploadEndpoint?: string;
  currentResumeEndpoint?: string;
  withCurrentResumeRefresh?: boolean;
  uploadFieldName?: string;
  extraFormFields?: Record<string, string | Blob>;
  onUploaded?: (data: ResumeUploadResult) => void;
  onUploadError?: (error: unknown) => void;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeRole(value?: string | null) {
  return (value || "").trim().toUpperCase();
}

function getStoredToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token")
  );
}

function unwrapEnvelope<T>(input: Nullable<ApiEnvelope<T> | T>): Nullable<T> {
  if (!input || typeof input !== "object") return input as Nullable<T>;

  const candidate = input as ApiEnvelope<T>;
  return (candidate.data ??
    candidate.payload ??
    candidate.result ??
    input) as Nullable<T>;
}

function extractResumePayload(
  input: Nullable<ApiEnvelope<ResumeUploadResult> | ResumeUploadResult>
): ResumeUploadResult | null {
  const level1 = unwrapEnvelope<ResumeUploadResult>(input);
  const level2 = unwrapEnvelope<ResumeUploadResult>(level1);

  if (!level2 || typeof level2 !== "object") return null;
  return level2 as ResumeUploadResult;
}

function extractMessage(
  input: Nullable<ApiEnvelope<ResumeUploadResult> | ResumeUploadResult>
) {
  if (!input || typeof input !== "object") return null;

  const top = input as ApiEnvelope<ResumeUploadResult>;
  if (typeof top.message === "string" && top.message.trim()) {
    return top.message.trim();
  }

  const nested = unwrapEnvelope<ResumeUploadResult>(input);
  if (nested && typeof nested === "object") {
    const maybeNested = nested as ApiEnvelope<ResumeUploadResult>;
    if (typeof maybeNested.message === "string" && maybeNested.message.trim()) {
      return maybeNested.message.trim();
    }
  }

  return null;
}

function safeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function resolveResumeId(data: ResumeUploadResult) {
  return data.resumeId ?? data.id;
}

function resolveVersionId(data: ResumeUploadResult) {
  return data.resumeVersionId ?? data.versionId ?? data.currentVersionId;
}

function withAbsoluteUrl(url?: string) {
  if (!url) return undefined;

  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
}

function buildPreviewUrl(data: ResumeUploadResult) {
  if (data.previewUrl) return withAbsoluteUrl(data.previewUrl);

  const resumeId = resolveResumeId(data);
  const versionId = resolveVersionId(data);

  if (resumeId && versionId) {
    return `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/preview`;
  }

  return undefined;
}

function buildDownloadUrl(data: ResumeUploadResult) {
  if (data.downloadUrl) return withAbsoluteUrl(data.downloadUrl);
  if (data.fileUrl) return withAbsoluteUrl(data.fileUrl);

  const resumeId = resolveResumeId(data);
  const versionId = resolveVersionId(data);

  if (resumeId && versionId) {
    return `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/download`;
  }

  return undefined;
}

function sanitizeUploadedData(data: ResumeUploadResult): ResumeUploadResult {
  return {
    ...data,
    atsScore: safeNumber(data.atsScore),
    previewUrl: buildPreviewUrl(data),
    downloadUrl: buildDownloadUrl(data),
  };
}

async function parseErrorMessage(response: Response) {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await response.json();
      const msg =
        extractMessage(json) ||
        (typeof json?.error === "string" ? json.error : null) ||
        (typeof json?.details === "string" ? json.details : null);

      if (msg) return msg;
    } else {
      const text = await response.text();
      if (text?.trim()) return text.trim();
    }
  } catch {
    // ignore parsing errors
  }

  if (response.status === 401) return "You are not authenticated. Please log in again.";
  if (response.status === 403) return "You do not have permission to upload a resume.";
  if (response.status === 413) return "Uploaded file is too large.";
  if (response.status === 415) return "Unsupported file type.";
  return `Upload failed with status ${response.status}.`;
}

export default function ResumeUploadCard({
  title = "Upload Resume",
  subtitle = "Upload your resume to the backend and generate a new current/base resume version.",
  className = "",
  acceptedTypes = ".pdf,.doc,.docx",
  maxFileSizeMB = 10,
  disabled = false,
  autoPreviewText = true,
  showPreviewText = true,
  showUploadedActions = true,
  uploadEndpoint = `${API_BASE_URL}/api/user/resume/upload`,
  currentResumeEndpoint = `${API_BASE_URL}/api/user/resume/current`,
  withCurrentResumeRefresh = true,
  uploadFieldName = "file",
  extraFormFields,
  onUploaded,
  onUploadError,
}: ResumeUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState<ResumeUploadResult | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = getStoredToken();

  const previewText = useMemo(() => {
    if (!autoPreviewText) return "";
    return uploadedData?.rawText || "";
  }, [autoPreviewText, uploadedData?.rawText]);

  const validateFile = (file: File) => {
    const maxBytes = maxFileSizeMB * 1024 * 1024;

    if (file.size > maxBytes) {
      throw new Error(`File size must be less than ${maxFileSizeMB} MB.`);
    }

    const allowed = acceptedTypes
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const lowerName = file.name.toLowerCase();

    const matches = allowed.some((entry) => {
      if (entry.startsWith(".")) return lowerName.endsWith(entry);
      return file.type.toLowerCase() === entry;
    });

    if (!matches) {
      throw new Error(`Only ${acceptedTypes} files are allowed.`);
    }
  };

  const persistResumeHints = (data: ResumeUploadResult) => {
    if (typeof window === "undefined") return;

    const resumeId = resolveResumeId(data);
    const versionId = resolveVersionId(data);

    if (data.fileName || data.originalFileName) {
      localStorage.setItem(
        "userResumeName",
        data.fileName || data.originalFileName || ""
      );
    }

    if (resumeId !== undefined && resumeId !== null) {
      localStorage.setItem("currentResumeId", String(resumeId));
    }

    if (versionId !== undefined && versionId !== null) {
      localStorage.setItem("currentResumeVersionId", String(versionId));
    }

    if (data.resumeName) {
      localStorage.setItem("currentResumeTitle", data.resumeName);
    }

    if (typeof data.atsScore === "number" && Number.isFinite(data.atsScore)) {
      localStorage.setItem("currentResumeAtsScore", String(data.atsScore));
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setUploadedData(null);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearSelectedFileOnly = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelection = (file: File | null) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!file) return;

      validateFile(file);
      setSelectedFile(file);
    } catch (error: any) {
      setSelectedFile(null);
      setErrorMessage(error?.message || "Invalid file selected.");
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || uploading) return;

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
      return;
    }

    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0] || null;
    handleFileSelection(file);
  };

  const tryRefreshCurrentResume = async (): Promise<ResumeUploadResult | null> => {
    if (!withCurrentResumeRefresh) return null;

    try {
      const response = await fetch(currentResumeEndpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) return null;

      const json = await response.json();
      const extracted = extractResumePayload(json);
      return extracted ? sanitizeUploadedData(extracted) : null;
    } catch {
      return null;
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || disabled || uploading) return;

    try {
      setUploading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const role =
        typeof window !== "undefined"
          ? normalizeRole(localStorage.getItem("userRole"))
          : "";

      if (role && role !== "USER" && role !== "ROLE_USER") {
        throw new Error("Only user accounts can upload resumes.");
      }

      const formData = new FormData();
      formData.append(uploadFieldName, selectedFile);

      if (extraFormFields) {
        Object.entries(extraFormFields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const json = await response.json();
      const primaryPayload = extractResumePayload(json);

      if (!primaryPayload) {
        throw new Error(extractMessage(json) || "Resume upload succeeded but no payload was returned.");
      }

      let normalized = sanitizeUploadedData(primaryPayload);

      const refreshed = await tryRefreshCurrentResume();
      if (refreshed) {
        normalized = sanitizeUploadedData({
          ...normalized,
          ...refreshed,
          rawText: normalized.rawText || refreshed.rawText,
        });
      }

      setUploadedData(normalized);
      setSuccessMessage(extractMessage(json) || "Resume uploaded successfully.");
      persistResumeHints(normalized);
      clearSelectedFileOnly();

      onUploaded?.(normalized);
    } catch (error: any) {
      console.error("ResumeUploadCard upload error:", error);
      setErrorMessage(
        error?.message || "Failed to upload resume to backend."
      );
      onUploadError?.(error);
    } finally {
      setUploading(false);
    }
  };

  const openPreview = () => {
    const previewUrl = uploadedData?.previewUrl;
    if (!previewUrl || typeof window === "undefined") return;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const downloadUploaded = async () => {
    const downloadUrl = uploadedData?.downloadUrl;
    if (!downloadUrl) return;

    try {
      setErrorMessage(null);

      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download =
        uploadedData?.fileName ||
        uploadedData?.originalFileName ||
        "resume.pdf";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("ResumeUploadCard download error:", error);
      setErrorMessage(
        error?.message || "Failed to download uploaded resume."
      );
    }
  };

  const uploadedFileName =
    uploadedData?.fileName || uploadedData?.originalFileName || "N/A";

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl",
        className
      )}
    >
      <div className="p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Upload size={20} />
            </div>

            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-white/55">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetState}
            disabled={disabled || uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-white/50">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <ShieldCheck size={14} className="text-emerald-300" />
            Auth-aware backend upload
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <FileText size={14} className="text-indigo-300" />
            Field: {uploadFieldName}
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
            <CheckCircle2 size={18} className="mt-0.5 text-green-300" />
            <p className="text-sm text-green-100">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <p className="text-sm text-red-100">{errorMessage}</p>
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-8",
            dragActive
              ? "border-blue-500 bg-blue-500/10"
              : "border-white/15 bg-black/20"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
              <FileText size={24} className="text-indigo-300" />
            </div>

            <div>
              <p className="font-semibold text-white">
                Drag and drop your resume here
              </p>
              <p className="mt-1 text-sm text-white/50">
                Accepted: {acceptedTypes.replaceAll(",", ", ")} • Max{" "}
                {maxFileSizeMB} MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes}
              className="hidden"
              onChange={(e) => handleFileSelection(e.target.files?.[0] || null)}
              disabled={disabled || uploading}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-95 disabled:opacity-50"
            >
              <Upload size={16} />
              Choose File
            </button>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="mb-1 text-xs text-white/45">Selected File</p>
                <p className="break-all text-sm font-semibold text-white/85">
                  {selectedFile.name}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={clearSelectedFileOnly}
                  disabled={disabled || uploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Remove
                </button>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={disabled || uploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-green-500 to-blue-600 px-4 py-2.5 font-semibold transition hover:opacity-95 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Upload Resume
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {uploadedData && (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-1 text-xs text-white/45">Resume Name</p>
                  <p className="wrap-break-word text-sm font-semibold text-white/85">
                    {uploadedData.resumeName || uploadedData.title || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-1 text-xs text-white/45">Version Name</p>
                  <p className="wrap-break-word text-sm font-semibold text-white/85">
                    {uploadedData.versionName || uploadedData.versionCode || "N/A"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-1 text-xs text-white/45">File Name</p>
                  <p className="break-all text-sm font-semibold text-white/85">
                    {uploadedFileName}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-1 text-xs text-white/45">ATS Score</p>
                  <p className="text-lg font-bold text-emerald-300">
                    {uploadedData.atsScore ?? 0}%
                  </p>
                </div>
              </div>
            </div>

            {showUploadedActions && (
              <div className="flex flex-wrap gap-3">
                {uploadedData.previewUrl && (
                  <button
                    type="button"
                    onClick={openPreview}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
                  >
                    <Eye size={16} />
                    Preview
                  </button>
                )}

                {uploadedData.downloadUrl && (
                  <button
                    type="button"
                    onClick={downloadUploaded}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
                  >
                    <Download size={16} />
                    Download
                  </button>
                )}
              </div>
            )}

            {showPreviewText && previewText && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-indigo-300" />
                  <h3 className="text-sm font-semibold text-white/90">
                    Parsed Resume Preview
                  </h3>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4">
                  <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-white/70">
                    {previewText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}