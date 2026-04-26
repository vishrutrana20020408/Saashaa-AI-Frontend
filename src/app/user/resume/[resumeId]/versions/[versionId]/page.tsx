"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Save,
  Sparkles,
  CalendarDays,
  Layers3,
  Eye,
  Copy,
  Wand2,
  Trophy,
  Tag,
  GitBranch,
} from "lucide-react";

/**
 * src/app/(public)/user/resume/[resumeId]/versions/[versionId]/page.tsx
 *
 * Backend-integrated User Resume Version Detail Page
 *
 * Expected backend endpoints:
 * GET  /api/user/resume/{resumeId}/versions/{versionId}
 * PUT  /api/user/resume/{resumeId}/versions/{versionId}/content
 * POST /api/user/resume/{resumeId}/versions/{versionId}/ats-score
 * GET  /api/user/resume/{resumeId}/versions/{versionId}/download
 * GET  /api/user/resume/{resumeId}/versions/{versionId}/preview
 *
 * Design goals:
 * - aligned with latest backend-driven frontend structure
 * - resilient to small response-shape differences
 * - token + cookie aware requests
 * - supports edit / preview / ATS / download flows
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  getVersionById: (resumeId: string, versionId: string) =>
    `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}`,

  updateVersionContent: (resumeId: string, versionId: string) =>
    `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/content`,

  calculateAts: (resumeId: string, versionId: string) =>
    `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/ats-score`,

  downloadVersion: (resumeId: string, versionId: string) =>
    `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/download`,

  previewVersion: (resumeId: string, versionId: string) =>
    `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/preview`,
};

type ResumeVersionDetail = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  versionName?: string;
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
  jobApplicationCode?: string | null;
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
};

type UpdateContentRequest = {
  rawText: string;
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

function buildAuthHeaders(includeJson = true): HeadersInit {
  const token = getStoredToken();

  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null): T | null {
  if (!json) return null;
  const envelope = json as ApiEnvelope<T>;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
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

function formatDateTime(value?: string): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function safePrettyJson(value?: string): string {
  if (!value) return "";

  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

function normalizeVersion(raw: any): ResumeVersionDetail | null {
  if (!raw || typeof raw !== "object") return null;

  const resumeId =
    normalizeNumber(raw.resumeId) ??
    normalizeNumber(raw.parentResumeId) ??
    normalizeNumber(raw.resume?.resumeId) ??
    normalizeNumber(raw.resume?.id);

  const resumeVersionId =
    normalizeNumber(raw.resumeVersionId) ??
    normalizeNumber(raw.versionId) ??
    normalizeNumber(raw.id);

  const versionId =
    normalizeNumber(raw.versionId) ??
    normalizeNumber(raw.resumeVersionId) ??
    normalizeNumber(raw.id);

  return {
    resumeId,
    resumeVersionId,
    versionId,
    resumeName:
      normalizeString(raw.resumeName) ||
      normalizeString(raw.resumeTitle) ||
      normalizeString(raw.resume?.resumeName) ||
      normalizeString(raw.resume?.name),
    versionName:
      normalizeString(raw.versionName) ||
      normalizeString(raw.name) ||
      normalizeString(raw.title),
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
    jobApplicationCode:
      normalizeString(raw.jobApplicationCode) ||
      normalizeString(raw.applicationCode) ||
      null,
    updatedAt:
      normalizeString(raw.updatedAt) ||
      normalizeString(raw.lastModifiedAt) ||
      normalizeString(raw.modifiedAt),
    createdAt:
      normalizeString(raw.createdAt) ||
      normalizeString(raw.uploadedAt) ||
      normalizeString(raw.generatedAt),
  };
}

export default function UserResumeVersionDetailPage() {
  const router = useRouter();
  const params = useParams<{ resumeId: string; versionId: string }>();

  const resumeId = String(params?.resumeId || "");
  const versionId = String(params?.versionId || "");

  const [version, setVersion] = useState<ResumeVersionDetail | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [savedResumeText, setSavedResumeText] = useState("");

  const [tips, setTips] = useState<string[]>([
    "Add measurable achievements and outcomes.",
    "Include keywords from the target job description.",
    "Keep formatting simple and ATS-friendly.",
    "Highlight skills, projects, and impact clearly.",
  ]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [showEditor, setShowEditor] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const commonHeaders = buildAuthHeaders(true);

  const prettyStructuredJson = useMemo(
    () => safePrettyJson(version?.structuredContentJson),
    [version?.structuredContentJson]
  );

  const hasUnsavedChanges = useMemo(
    () => resumeText !== savedResumeText,
    [resumeText, savedResumeText]
  );

  const hydrateVersion = useCallback((data: ResumeVersionDetail | null) => {
    if (!data) return;

    setVersion(data);

    const nextText = data.rawText || "";
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

  const fetchVersion = useCallback(
    async (isRefresh = false) => {
      if (!resumeId || !versionId) {
        setErrorMessage("Resume version route is invalid.");
        setLoading(false);
        return;
      }

      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await fetch(
          API_ROUTES.getVersionById(resumeId, versionId),
          {
            method: "GET",
            headers: commonHeaders,
            credentials: "include",
            cache: "no-store",
          }
        );

        const resultJson = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            (resultJson as ApiEnvelope<any>)?.message ||
              `Failed to fetch resume version. Status: ${response.status}`
          );
        }

        const resultData = normalizeVersion(unwrapResponse<any>(resultJson));

        if (!resultData) {
          throw new Error(
            (resultJson as ApiEnvelope<any>)?.message ||
              "Resume version not found."
          );
        }

        hydrateVersion(resultData);
      } catch (error: any) {
        console.error("Fetch resume version error:", error);
        setErrorMessage(
          error?.message || "Unable to load resume version details from backend."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [commonHeaders, hydrateVersion, resumeId, versionId]
  );

  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);

  const saveVersionContent = async () => {
    const trimmed = resumeText.trim();

    if (!trimmed) {
      setErrorMessage("Resume version content cannot be empty.");
      setSuccessMessage(null);
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload: UpdateContentRequest = {
        rawText: resumeText,
      };

      const response = await fetch(
        API_ROUTES.updateVersionContent(resumeId, versionId),
        {
          method: "PUT",
          headers: commonHeaders,
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Failed to save resume version. Status: ${response.status}`
        );
      }

      const resultData = normalizeVersion(unwrapResponse<any>(resultJson));

      if (resultData) {
        hydrateVersion(resultData);
      } else {
        setSavedResumeText(resumeText);
        setVersion((prev) =>
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
        (resultJson as ApiEnvelope<any>)?.message ||
          "Resume version updated successfully."
      );
      setShowEditor(false);
    } catch (error: any) {
      console.error("Save resume version error:", error);
      setErrorMessage(
        error?.message || "Failed to save resume version content."
      );
    } finally {
      setSaving(false);
    }
  };

  const calculateATS = async () => {
    const trimmed = resumeText.trim();

    if (!trimmed) {
      setErrorMessage("Resume version content is empty.");
      setSuccessMessage(null);
      return;
    }

    try {
      setScoring(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(API_ROUTES.calculateAts(resumeId, versionId), {
        method: "POST",
        headers: commonHeaders,
        credentials: "include",
        body: JSON.stringify({
          rawText: resumeText,
        }),
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Failed to calculate ATS. Status: ${response.status}`
        );
      }

      const atsData = unwrapResponse<AtsPayload>(resultJson);
      const nextScore =
        normalizeNumber(atsData?.atsScore) ?? normalizeNumber(atsData?.score);

      if (typeof nextScore === "number") {
        setVersion((prev) => (prev ? { ...prev, atsScore: nextScore } : prev));
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
          "Resume version ATS score calculated successfully."
      );
    } catch (error: any) {
      console.error("ATS score error:", error);
      setErrorMessage(
        error?.message || "Failed to calculate ATS score for this version."
      );
    } finally {
      setScoring(false);
    }
  };

  const downloadVersion = async () => {
    try {
      setDownloading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (version?.fileUrl) {
        window.open(version.fileUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const response = await fetch(
        API_ROUTES.downloadVersion(resumeId, versionId),
        {
          method: "GET",
          headers: buildAuthHeaders(false),
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to download resume version. Status: ${response.status}`
        );
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download =
        version?.fileName ||
        `${version?.versionName || "resume-version"}-${versionId}.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(objectUrl);
    } catch (error: any) {
      console.error("Download resume version error:", error);
      setErrorMessage(error?.message || "Failed to download resume version.");
    } finally {
      setDownloading(false);
    }
  };

  const openPreview = () => {
    const previewUrl =
      version?.previewUrl || API_ROUTES.previewVersion(resumeId, versionId);

    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const openFullPreviewPage = () => {
    router.push(`/user/resume/${resumeId}/versions/${versionId}/preview`);
  };

  const resetEditorChanges = () => {
    setResumeText(savedResumeText);
    setErrorMessage(null);
    setSuccessMessage("Editor reset to last saved content.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-12">
            <Loader2 className="animate-spin" size={32} />
            <h2 className="text-2xl font-bold">Loading Resume Version</h2>
            <p className="text-white/60">
              Fetching version details from your backend.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white">
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            onClick={() => router.push(`/user/resume/${resumeId}`)}
            className="inline-flex items-center gap-2 text-white/70 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Resume Detail
          </button>

          <div className="flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <p className="text-red-100">Resume version not found.</p>
          </div>
        </div>
      </div>
    );
  }

  const score = Math.max(0, Math.min(version.atsScore || 0, 100));
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              onClick={() => router.push(`/user/resume/${resumeId}`)}
              className="mb-4 inline-flex items-center gap-2 text-white/70 transition hover:text-white"
            >
              <ArrowLeft size={18} />
              Back to Resume Detail
            </button>

            <h1 className="bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Resume Version Detail
            </h1>

            <p className="mt-2 max-w-3xl text-white/60">
              View, edit, score, preview, and manage a specific resume version
              using your backend-integrated Resume Management System flow.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => fetchVersion(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              Refresh
            </button>

            <button
              onClick={calculateATS}
              disabled={scoring}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-green-500 to-blue-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
            >
              {scoring ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Calculate ATS
                </>
              )}
            </button>

            <button
              onClick={downloadVersion}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-7">
            <div className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex items-center gap-3">
                <FileText className="text-indigo-300" />
                <h2 className="text-xl font-semibold">Version Information</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Resume Name</p>
                  <p className="text-sm font-semibold text-white/85">
                    {version.resumeName || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Version Name</p>
                  <p className="text-sm font-semibold text-white/85">
                    {version.versionName || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">File Name</p>
                  <p className="break-all text-sm font-semibold text-white/85">
                    {version.fileName || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Resume ID</p>
                  <p className="text-sm font-semibold text-white/85">
                    {version.resumeId ?? "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Version ID</p>
                  <p className="text-sm font-semibold text-white/85">
                    {version.resumeVersionId ?? version.versionId ?? "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Version Code</p>
                  <p className="text-sm font-semibold text-white/85">
                    {version.versionCode || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <Tag size={12} />
                    <span>Version Type</span>
                  </div>
                  <p className="text-sm font-semibold text-white/85">
                    {version.versionType || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <GitBranch size={12} />
                    <span>Parent Version ID</span>
                  </div>
                  <p className="text-sm font-semibold text-white/85">
                    {version.parentVersionId ?? "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Base Version</p>
                  <p className="text-sm font-semibold text-white/85">
                    {version.isBaseVersion ? "Yes" : "No"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Job Application Code</p>
                  <p className="break-all text-sm font-semibold text-white/85">
                    {version.jobApplicationCode || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <CalendarDays size={12} />
                    <span>Created At</span>
                  </div>
                  <p className="text-sm font-semibold text-white/85">
                    {formatDateTime(version.createdAt)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <CalendarDays size={12} />
                    <span>Updated At</span>
                  </div>
                  <p className="text-sm font-semibold text-white/85">
                    {formatDateTime(version.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="text-emerald-300" />
                  <h2 className="text-xl font-semibold">Version Preview</h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={openPreview}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15"
                  >
                    <Eye size={16} />
                    Preview File
                  </button>

                  <button
                    onClick={openFullPreviewPage}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15"
                  >
                    <Layers3 size={16} />
                    Full Preview Page
                  </button>

                  <button
                    onClick={() => setShowEditor(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15"
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>
                </div>
              </div>

              <div className="mt-4 min-h-80 max-h-140 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-4">
                {resumeText ? (
                  <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-white/75">
                    {resumeText}
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-white/45">
                    No version text available.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <Layers3 className="text-purple-300" />
                <h2 className="text-xl font-semibold">Structured Content JSON</h2>
              </div>

              <div className="min-h-55 max-h-105 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4">
                {prettyStructuredJson ? (
                  <pre className="whitespace-pre-wrap wrap-break-word text-sm text-white/75">
                    {prettyStructuredJson}
                  </pre>
                ) : (
                  <div className="text-sm text-white/45">
                    No structured content available.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-5">
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="text-yellow-300" size={18} />
                  <h2 className="text-xl font-semibold">ATS Score</h2>
                </div>
                <span className="text-xs text-white/50">Backend calculated</span>
              </div>

              <div className="relative">
                <svg width="180" height="180" className="h-44 w-44">
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
                    stroke="url(#gradientVersionDetail)"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                    transform="rotate(-90 90 90)"
                  />
                  <defs>
                    <linearGradient id="gradientVersionDetail">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-4xl font-extrabold">{score}%</div>
                    <div className="mt-1 text-xs text-white/55">ATS Score</div>
                  </div>
                </div>
              </div>

              <button
                onClick={calculateATS}
                disabled={scoring}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-green-500 to-blue-600 px-6 py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
              >
                {scoring ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Recalculate ATS
                  </>
                )}
              </button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="text-blue-300" />
                <h2 className="text-xl font-semibold">Improvement Tips</h2>
              </div>

              <div className="space-y-3">
                {tips.length > 0 ? (
                  tips.map((tip, index) => (
                    <div
                      key={`${tip}-${index}`}
                      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-white/40" />
                      <p className="text-sm text-white/70">{tip}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/60">
                    No improvement tips available yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <CalendarDays className="text-indigo-300" />
                <h2 className="text-xl font-semibold">Quick Actions</h2>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setShowEditor(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                >
                  <Edit3 size={18} />
                  Edit Version
                </button>

                <button
                  onClick={openFullPreviewPage}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                >
                  <Eye size={18} />
                  Preview Version
                </button>

                <button
                  onClick={downloadVersion}
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  Download Version
                </button>

                <button
                  onClick={() =>
                    router.push(`/user/resume/${resumeId}/create-duplicate`)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
          <div className="w-full max-w-4xl space-y-4 rounded-2xl border border-white/10 bg-gray-900 p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold sm:text-xl">
                Edit Resume Version
              </h2>

              <button
                onClick={() => {
                  setResumeText(savedResumeText);
                  setShowEditor(false);
                }}
                className="w-full rounded-xl bg-white/10 px-4 py-2 font-semibold transition hover:bg-white/15 sm:w-auto"
              >
                Close
              </button>
            </div>

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="h-64 w-full rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 sm:h-80"
              placeholder="Edit your resume version text here..."
            />

            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <button
                onClick={resetEditorChanges}
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
                  onClick={saveVersionContent}
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
              This updates the selected resume version content in your backend
              Resume Management System.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}