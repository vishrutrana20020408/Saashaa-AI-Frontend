"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  RefreshCw,
  Loader2,
  Download,
  Edit3,
  Save,
  AlertCircle,
  CheckCircle2,
  FileUp,
  Sparkles,
  X,
  Copy,
  Wand2,
  Eye,
  Plus,
  GitBranch,
  CalendarDays,
  Tag,
} from "lucide-react";
import CloudStorageManager from "@/components/resume/CloudStorageManager";
import { getResumeVersionAtsBadgeClass } from "@/types/resume";

/**
 * src/app/(public)/user/resume/page.tsx
 *
 * Backend-integrated Current Resume Page
 *
 * Latest project alignment:
 * - backend-first frontend architecture
 * - resilient payload normalization
 * - token + cookie aware requests
 * - aligned with resume + version architecture
 * - compatible with current resume management flow
 *
 * Expected backend endpoints:
 * GET    /api/user/resume/current
 * POST   /api/user/resume/upload
 * PUT    /api/user/resume/current/content
 * POST   /api/user/resume/current/ats-score
 * GET    /api/user/resume/current/download
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  getCurrentResume: `${API_BASE_URL}/api/user/resume/current`,
  uploadResume: `${API_BASE_URL}/api/user/resume/upload`,
  updateResumeContent: `${API_BASE_URL}/api/user/resume/current/content`,
  calculateAts: `${API_BASE_URL}/api/user/resume/current/ats-score`,
  downloadResume: `${API_BASE_URL}/api/user/resume/current/download`,
  deleteCurrentResume: `${API_BASE_URL}/api/user/resume/current`,
  updateCurrentResumeFile: `${API_BASE_URL}/api/user/resume/current/file`,
  getAllResumes: `${API_BASE_URL}/api/user/resume`,
};

type ResumeData = {
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
  parentVersionId?: number | null;
  updatedAt?: string;
  createdAt?: string;
};

type AtsPayload = {
  atsScore?: number;
  score?: number;
  tips?: string[];
  suggestions?: string[];
  recommendations?: string[];
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeResumeData(raw: any): ResumeData | null {
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

    parentVersionId: normalizeNumber(raw.parentVersionId, null as never) ?? null,

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

function formatDateTime(value?: string | null): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function safePrettyJson(value?: string) {
  if (!value) return "";

  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

function getResumeAtsBandLabel(score?: number | null): string {
  if (score === null || score === undefined) return "No Score";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  return "Needs Improvement";
}

export default function ResumePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [resume, setResume] = useState<ResumeData | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [savedResumeText, setSavedResumeText] = useState<string>("");

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [showEditor, setShowEditor] = useState<boolean>(false);

  const [tips, setTips] = useState<string[]>([
    "Add more measurable achievements such as metrics, impact, and scale.",
    "Use keywords that match the target job description.",
    "Keep formatting simple and ATS-friendly.",
    "Highlight relevant skills, projects, and experience clearly.",
  ]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [scoring, setScoring] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const token = useMemo(() => getStoredToken(), []);

  const allowedTypes = useMemo(
    () => [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    []
  );

  const commonHeaders = useMemo<HeadersInit>(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const prettyStructuredJson = useMemo(
    () => safePrettyJson(resume?.structuredContentJson),
    [resume?.structuredContentJson]
  );

  const hasUnsavedChanges = useMemo(
    () => resumeText !== savedResumeText,
    [resumeText, savedResumeText]
  );

  const hydrateResumeState = useCallback((data?: ResumeData | null) => {
    if (!data) return;

    setResume(data);

    const nextText = data.rawText ?? "";
    setResumeText(nextText);
    setSavedResumeText(nextText);

    if (typeof window !== "undefined") {
      if (data.fileName) {
        localStorage.setItem("userResumeName", data.fileName);
      }

      if (data.resumeId != null) {
        localStorage.setItem("activeResumeId", String(data.resumeId));
      }

      if (data.resumeVersionId != null || data.versionId != null) {
        localStorage.setItem(
          "activeResumeVersionId",
          String(data.resumeVersionId ?? data.versionId)
        );
      }
    }
  }, []);

  const clearResumeState = useCallback(() => {
    setResume(null);
    setResumeText("");
    setSavedResumeText("");
  }, []);

  const fetchCurrentResume = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await fetch(API_ROUTES.getCurrentResume, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...commonHeaders,
          },
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 404) {
          clearResumeState();
          return;
        }

        const resultJson = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            (resultJson as ApiEnvelope<any>)?.message ||
              `Failed to fetch resume. Status: ${response.status}`
          );
        }

        const resultData = normalizeResumeData(unwrapResponse<any>(resultJson));
        if (resultData) {
          hydrateResumeState(resultData);
        } else {
          clearResumeState();
        }
      } catch (error: any) {
        console.error("Fetch current resume error:", error);
        setErrorMessage(error?.message || "Unable to load resume data from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clearResumeState, commonHeaders, hydrateResumeState]
  );

  useEffect(() => {
    fetchCurrentResume();
  }, [fetchCurrentResume]);

  const validateUploadFile = useCallback(
    (file: File) => {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      const allowedExtensions = ["pdf", "txt", "doc", "docx"];

      if (
        !allowedTypes.includes(file.type) &&
        (!fileExtension || !allowedExtensions.includes(fileExtension))
      ) {
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

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  };

  const uploadResumeToBackend = async (file: File) => {
    if (!validateUploadFile(file)) return;

    try {
      setUploading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API_ROUTES.uploadResume, {
        method: "POST",
        headers: {
          ...commonHeaders,
        },
        credentials: "include",
        body: formData,
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Resume upload failed. Status: ${response.status}`
        );
      }

      const resultData = normalizeResumeData(unwrapResponse<any>(resultJson));

      if (resultData) {
        hydrateResumeState(resultData);
      }

      setSuccessMessage(
        (resultJson as ApiEnvelope<any>)?.message || "Resume uploaded successfully."
      );
      setShowEditor(true);
    } catch (error: any) {
      console.error("Resume upload error:", error);
      setErrorMessage(error?.message || "Failed to upload and parse resume.");
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadResumeToBackend(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadResumeToBackend(e.target.files[0]);
    }
  };

  const saveResumeContent = async () => {
    if (!resumeText.trim()) {
      setErrorMessage("Resume content is empty.");
      setSuccessMessage(null);
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(API_ROUTES.updateResumeContent, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...commonHeaders,
        },
        credentials: "include",
        body: JSON.stringify({
          rawText: resumeText,
        }),
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Failed to save resume content. Status: ${response.status}`
        );
      }

      const resultData = normalizeResumeData(unwrapResponse<any>(resultJson));

      if (resultData) {
        hydrateResumeState(resultData);
      } else {
        setSavedResumeText(resumeText);
        setResume((prev) =>
          prev
            ? {
                ...prev,
                rawText: resumeText,
                updatedAt: new Date().toISOString(),
              }
            : prev
        );
      }

      setSuccessMessage(
        (resultJson as ApiEnvelope<any>)?.message || "Resume updated successfully."
      );
      setShowEditor(false);
    } catch (error: any) {
      console.error("Save resume content error:", error);
      setErrorMessage(error?.message || "Failed to save updated resume content.");
    } finally {
      setSaving(false);
    }
  };

  const calculateATS = async () => {
    if (!resumeText.trim()) {
      setErrorMessage("Upload or edit your resume first.");
      setSuccessMessage(null);
      return;
    }

    try {
      setScoring(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(API_ROUTES.calculateAts, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...commonHeaders,
        },
        credentials: "include",
        body: JSON.stringify({
          rawText: resumeText,
        }),
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Failed to calculate ATS score. Status: ${response.status}`
        );
      }

      const atsData = unwrapResponse<AtsPayload>(resultJson);

      const nextScore =
        normalizeNumber(atsData?.atsScore) ?? normalizeNumber(atsData?.score);

      if (typeof nextScore === "number") {
        setResume((prev) => (prev ? { ...prev, atsScore: nextScore } : prev));
      }

      const nextTips = [
        ...normalizeStringArray(atsData?.tips),
        ...normalizeStringArray(atsData?.suggestions),
        ...normalizeStringArray(atsData?.recommendations),
      ];

      if (nextTips.length > 0) {
        setTips(Array.from(new Set(nextTips)));
      }

      setSuccessMessage(
        (resultJson as ApiEnvelope<any>)?.message ||
          "ATS score calculated successfully."
      );
    } catch (error: any) {
      console.error("ATS score error:", error);
      setErrorMessage(error?.message || "Failed to calculate ATS score.");
    } finally {
      setScoring(false);
    }
  };

  const downloadResume = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (resume?.fileUrl) {
        window.open(resume.fileUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const response = await fetch(API_ROUTES.downloadResume, {
        method: "GET",
        headers: {
          ...commonHeaders,
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to download resume. Status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = resume?.fileName || "Updated_Resume.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Download resume error:", error);
      setErrorMessage(error?.message || "Failed to download resume file.");
    }
  };

  const deleteCurrentResume = async () => {
    if (!confirm("Are you sure you want to delete this resume? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(API_ROUTES.deleteCurrentResume, {
        method: "DELETE",
        headers: {
          ...commonHeaders,
        },
        credentials: "include",
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Failed to delete resume. Status: ${response.status}`
        );
      }

      setSuccessMessage("Resume deleted successfully.");
      clearResumeState();
      await fetchCurrentResume(true);
    } catch (error: any) {
      console.error("Delete resume error:", error);
      setErrorMessage(error?.message || "Failed to delete resume.");
    } finally {
      setDeleting(false);
    }
  };

  const updateResumeFile = async (file: File) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API_ROUTES.updateCurrentResumeFile, {
        method: "PUT",
        headers: {
          ...commonHeaders,
        },
        credentials: "include",
        body: formData,
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Failed to update resume file. Status: ${response.status}`
        );
      }

      const payload = unwrapResponse<any>(resultJson);
      if (payload) {
        hydrateResumeState(payload);
      }

      setSuccessMessage(
        (resultJson as ApiEnvelope<any>)?.message || "Resume file updated successfully."
      );
      await fetchCurrentResume(true);
    } catch (error: any) {
      console.error("Update resume file error:", error);
      setErrorMessage(error?.message || "Failed to update resume file.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateFileClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.txt";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        await updateResumeFile(file);
      }
    };
    input.click();
  };

  const resetLocalView = () => {
    clearResumeState();
    setTips([
      "Add more measurable achievements such as metrics, impact, and scale.",
      "Use keywords that match the target job description.",
      "Keep formatting simple and ATS-friendly.",
      "Highlight relevant skills, projects, and experience clearly.",
    ]);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const score = Math.max(0, Math.min(resume?.atsScore || 0, 100));
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-gray-950 via-gray-900 to-black px-4 py-10 text-white sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Resume Intelligence
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/60 sm:text-base">
              Upload, parse, edit, score, and manage your current resume with
              backend-integrated resume and version workflows.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={calculateATS}
              disabled={scoring || !resumeText.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-green-500 to-blue-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {scoring ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Calculate ATS Score
                </>
              )}
            </button>

            <button
              onClick={downloadResume}
              disabled={!resume?.fileName}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Download size={18} />
              Download Resume
            </button>

            <button
              onClick={handleUpdateFileClick}
              disabled={uploading || !resume}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-yellow-500 to-orange-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <FileUp size={18} />
                  Update File
                </>
              )}
            </button>

            <button
              onClick={() => fetchCurrentResume(true)}
              disabled={refreshing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:opacity-50 sm:w-auto"
            >
              {refreshing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              Refresh
            </button>

            <button
              onClick={deleteCurrentResume}
              disabled={deleting || !resume}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-red-500 to-pink-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {deleting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <X size={18} />
                  Delete Resume
                </>
              )}
            </button>
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

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-12 shadow-xl backdrop-blur-xl">
            <Loader2 className="animate-spin" size={30} />
            <h2 className="text-xl font-semibold">Loading Resume</h2>
            <p className="text-sm text-white/55">
              Fetching your current resume from the backend.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
            <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl sm:p-6 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold sm:text-xl">Current Resume</h2>

                <div className="text-right text-xs text-white/60 sm:text-sm">
                  {resume?.fileName ? (
                    <div className="space-y-1">
                      <div className="break-all text-emerald-300/90">
                        Uploaded:{" "}
                        <span className="text-white/80">{resume.fileName}</span>
                      </div>
                      {resume?.resumeName && (
                        <div className="text-white/40">
                          Resume Name:{" "}
                          <span className="text-white/70">{resume.resumeName}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>PDF • DOC • DOCX • TXT</span>
                  )}
                </div>
              </div>

              <div
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-8 ${
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
                  <FileUp size={34} className="text-blue-300" />
                </div>

                <p className="font-semibold text-white/80">
                  Drag & Drop your resume here
                </p>
                <p className="mt-2 text-xs text-white/50 sm:text-sm">
                  Upload to backend for parsing and resume version management
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Choose File
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowEditor(true)}
                    disabled={!resumeText.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Edit3 size={18} />
                    Update Resume
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Resume ID</p>
                  <p className="text-sm font-semibold text-white/85">
                    {resume?.resumeId ?? "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Version ID</p>
                  <p className="text-sm font-semibold text-white/85">
                    {resume?.resumeVersionId ?? resume?.versionId ?? "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Updated At</p>
                  <p className="text-sm font-semibold text-white/85">
                    {formatDateTime(resume?.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <Tag size={12} />
                    <span>Version Type</span>
                  </div>
                  <p className="text-sm font-semibold text-white/85">
                    {resume?.versionType || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <GitBranch size={12} />
                    <span>Parent Version ID</span>
                  </div>
                  <p className="text-sm font-semibold text-white/85">
                    {resume?.parentVersionId ?? "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <CalendarDays size={12} />
                    <span>Created At</span>
                  </div>
                  <p className="text-sm font-semibold text-white/85">
                    {formatDateTime(resume?.createdAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                    <FileText size={18} />
                    Resume Parsing Preview
                  </h3>
                  <span className="text-xs text-white/50">
                    {resumeText ? "Backend parsed content" : "No content yet"}
                  </span>
                </div>

                <div className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-xl bg-black/30 p-4 text-sm text-white/70">
                  {resumeText || "Upload a resume to preview parsed content here."}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                    <FileText size={18} />
                    Structured Content JSON
                  </h3>
                  <span className="text-xs text-white/50">
                    {prettyStructuredJson ? "Available" : "Not available"}
                  </span>
                </div>

                <div className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap wrap-break-word rounded-xl bg-black/30 p-4 text-sm text-white/70">
                  {prettyStructuredJson || "No structured content available."}
                </div>
              </div>
            </div>

            <div className="space-y-6 lg:col-span-5">
              <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl sm:p-6">
                <div className="flex w-full items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold sm:text-xl">My ATS Score</h2>
                  <span className="text-xs text-white/50 sm:text-sm">
                    Backend calculated
                  </span>
                </div>

                <div className="relative">
                  <svg
                    width="180"
                    height="180"
                    className="h-40 w-40 sm:h-44 sm:w-44"
                    aria-label="ATS score chart"
                  >
                    <circle
                      cx="90"
                      cy="90"
                      r={radius}
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="12"
                      fill="transparent"
                    />
                    <circle
                      cx="90"
                      cy="90"
                      r={radius}
                      stroke="url(#gradientCurrentResume)"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 0.6s ease" }}
                      transform="rotate(-90 90 90)"
                    />
                    <defs>
                      <linearGradient id="gradientCurrentResume">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="text-3xl font-extrabold sm:text-4xl">
                        {score}%
                      </div>
                      <div className="mt-1 text-xs text-white/55">ATS Score</div>
                    </div>
                  </div>
                </div>

                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    onClick={calculateATS}
                    disabled={scoring || !resumeText.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-green-500 to-blue-600 px-6 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {scoring ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Calculating
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Calculate
                      </>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      setResume((prev) => (prev ? { ...prev, atsScore: 0 } : prev))
                    }
                    className="rounded-xl bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/15"
                  >
                    Reset Score
                  </button>
                </div>

                <p className="text-center text-xs text-white/50 sm:text-sm">
                  Your ATS score is based on parsed resume content and backend
                  scoring logic.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl sm:p-6">
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-semibold sm:text-xl">
                    Resume Actions
                  </h2>
                  <p className="text-sm text-white/55">
                    Continue with version-based resume workflows.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setShowEditor(true)}
                    disabled={!resumeText.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Edit3 size={18} />
                    Edit Resume
                  </button>

                  <button
                    onClick={() => router.push("/user/resume/upload")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                  >
                    <Upload size={18} />
                    Upload New Resume
                  </button>

                  <button
                    onClick={() =>
                      resume?.resumeId
                        ? router.push(`/user/resume/${resume.resumeId}`)
                        : router.push("/user/resume")
                    }
                    disabled={!resume?.resumeId}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Eye size={18} />
                    Open Resume Detail
                  </button>

                  <button
                    onClick={() =>
                      resume?.resumeId
                        ? router.push(`/user/resume/${resume.resumeId}/create`)
                        : router.push("/user/resume/create-duplicate")
                    }
                    disabled={!resume?.resumeId}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={18} />
                    Create Version
                  </button>

                  <button
                    onClick={() =>
                      resume?.resumeId
                        ? router.push(`/user/resume/${resume.resumeId}/create-duplicate`)
                        : router.push("/user/resume/create-duplicate")
                    }
                    disabled={!resume?.resumeId}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Copy size={18} />
                    Create Duplicate
                  </button>

                  <button
                    onClick={() => router.push("/user/resume/tailor")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                  >
                    <Wand2 size={18} />
                    Tailor Resume
                  </button>

                  <button
                    onClick={downloadResume}
                    disabled={!resume?.fileName}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={18} />
                    Download
                  </button>

                  <button
                    onClick={resetLocalView}
                    className="rounded-xl border border-red-400/20 bg-red-500/15 px-5 py-3 font-semibold text-red-100 transition hover:bg-red-500/25"
                  >
                    Clear View
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl sm:p-6 lg:col-span-12">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold sm:text-xl">
                  Improvement Tips
                </h2>
                <span className="text-xs text-white/50 sm:text-sm">
                  Resume optimization checklist
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {tips.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-white/40" />
                    <p className="text-sm text-white/70">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Cloud Storage Section */}
        <CloudStorageManager
          onFileSelect={(file) => {
            setSuccessMessage(`Selected: ${file.fileName}`);
          }}
          onFileUpload={(file) => {
            console.log("File uploaded:", file);
          }}
        />
      </div>

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
          <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-white/10 bg-gray-900 p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold sm:text-xl">Edit Resume</h2>

              <button
                onClick={() => {
                  setResumeText(savedResumeText);
                  setShowEditor(false);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/15 sm:w-auto"
              >
                <X size={16} />
                Close
              </button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/25 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Resume ATS Ranking</p>
                  <p className="mt-1 text-sm text-white/55">
                    Backend score for the current resume version. This ranking is based on the stored ATS score already calculated in the backend.
                  </p>
                </div>

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getResumeVersionAtsBadgeClass(resume?.atsScore)}`}
                >
                  {getResumeAtsBandLabel(resume?.atsScore)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Backend ATS Score</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {resume?.atsScore != null ? `${Math.round(resume.atsScore)}%` : "N/A"}
                  </p>
                </div>

                <button
                  onClick={saveResumeContent}
                  disabled={saving || !hasUnsavedChanges}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-fuchsia-500 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={18} />
                  Update Resume
                </button>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-linear-to-r from-green-400 via-blue-500 to-purple-500"
                  style={{ width: `${Math.max(0, Math.min(resume?.atsScore ?? 0, 100))}%` }}
                />
              </div>
            </div>

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="h-56 w-full rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:h-72"
              placeholder="Edit your parsed resume text here..."
            />

            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <button
                onClick={() => setResumeText(savedResumeText)}
                disabled={!hasUnsavedChanges}
                className="w-full rounded-xl bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Reset
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => {
                    setResumeText(savedResumeText);
                    setShowEditor(false);
                  }}
                  className="w-full rounded-xl bg-gray-700 px-6 py-3 font-semibold transition hover:bg-gray-600 sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  onClick={saveResumeContent}
                  disabled={saving || !hasUnsavedChanges}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-xs text-white/50">
              This editor updates the current resume content in your Resume
              Management System backend.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}