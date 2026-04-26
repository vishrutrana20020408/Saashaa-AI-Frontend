"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  CalendarDays,
  Tag,
  Layers3,
  Sparkles,
  GitBranch,
} from "lucide-react";

/**
 * src/app/(public)/user/resume/[resumeId]/versions/[versionId]/preview/page.tsx
 *
 * Backend-integrated Resume Version Preview Page
 *
 * Expected backend endpoints:
 * GET /api/user/resume/{resumeId}/versions/{versionId}
 * GET /api/user/resume/{resumeId}/versions/{versionId}/preview
 * GET /api/user/resume/{resumeId}/versions/{versionId}/download
 *
 * Page responsibilities:
 * - fetch version metadata from backend
 * - display inline preview through backend preview endpoint
 * - fallback to raw text preview when iframe preview is unavailable
 * - support open in new tab + download
 * - remain resilient to small backend response-shape differences
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  getVersionById: (resumeId: string, versionId: string) =>
    `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}`,

  previewVersion: (resumeId: string, versionId: string) =>
    `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/preview`,

  downloadVersion: (resumeId: string, versionId: string) =>
    `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/download`,
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

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
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

function formatDateTime(value?: string): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

export default function UserResumeVersionPreviewPage() {
  const router = useRouter();
  const params = useParams<{ resumeId: string; versionId: string }>();

  const resumeId = String(params?.resumeId || "");
  const versionId = String(params?.versionId || "");

  const [version, setVersion] = useState<ResumeVersionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const commonHeaders = buildAuthHeaders(true);

  const previewUrl = useMemo(() => {
    return version?.previewUrl || API_ROUTES.previewVersion(resumeId, versionId);
  }, [resumeId, versionId, version?.previewUrl]);

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

        setVersion(resultData);
        setIframeFailed(false);

        if (typeof window !== "undefined") {
          if (resultData.fileName) {
            localStorage.setItem("userResumeName", resultData.fileName);
          }
          if (resultData.resumeId != null) {
            localStorage.setItem("activeResumeId", String(resultData.resumeId));
          }
          if (
            resultData.resumeVersionId != null ||
            resultData.versionId != null
          ) {
            localStorage.setItem(
              "activeResumeVersionId",
              String(resultData.resumeVersionId ?? resultData.versionId)
            );
          }
        }
      } catch (error: any) {
        console.error("Fetch resume version preview error:", error);
        setErrorMessage(
          error?.message || "Unable to load resume version preview from backend."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [commonHeaders, resumeId, versionId]
  );

  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);

  const downloadVersion = async () => {
    try {
      setDownloading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (version?.fileUrl) {
        window.open(version.fileUrl, "_blank", "noopener,noreferrer");
        setSuccessMessage("Resume version download opened successfully.");
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
      setSuccessMessage("Resume version downloaded successfully.");
    } catch (error: any) {
      console.error("Download resume version error:", error);
      setErrorMessage(error?.message || "Failed to download resume version.");
    } finally {
      setDownloading(false);
    }
  };

  const openInNewTab = () => {
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-12">
            <Loader2 className="animate-spin" size={32} />
            <h2 className="text-2xl font-bold">Loading Preview</h2>
            <p className="text-white/60">
              Fetching resume version preview from your backend.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!version) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white">
        <div className="mx-auto max-w-7xl space-y-6">
          <button
            onClick={() =>
              router.push(`/user/resume/${resumeId}/versions/${versionId}`)
            }
            className="inline-flex items-center gap-2 text-white/70 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Version Detail
          </button>

          <div className="flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <p className="text-red-100">Resume version not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              onClick={() =>
                router.push(`/user/resume/${resumeId}/versions/${versionId}`)
              }
              className="mb-4 inline-flex items-center gap-2 text-white/70 transition hover:text-white"
            >
              <ArrowLeft size={18} />
              Back to Version Detail
            </button>

            <h1 className="bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Resume Version Preview
            </h1>

            <p className="mt-2 max-w-3xl text-white/60">
              Preview this backend-linked resume version with inline rendering and
              automatic text fallback when document preview is unavailable.
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
              onClick={openInNewTab}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
            >
              <ExternalLink size={18} />
              Open in New Tab
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
          <div className="space-y-6 xl:col-span-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Eye className="text-indigo-300" />
                  <div>
                    <h2 className="text-xl font-semibold">Document Preview</h2>
                    <p className="text-sm text-white/50">
                      Inline preview powered by the backend preview endpoint
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={openInNewTab}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15"
                  >
                    <ExternalLink size={16} />
                    Open
                  </button>

                  <button
                    onClick={downloadVersion}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15 disabled:opacity-50"
                  >
                    {downloading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} />
                    )}
                    Download
                  </button>
                </div>
              </div>

              {!iframeFailed ? (
                <div className="min-h-[720px] overflow-hidden rounded-2xl border border-white/10 bg-white">
                  <iframe
                    src={previewUrl}
                    title="Resume Version Preview"
                    className="h-[720px] w-full"
                    onError={() => setIframeFailed(true)}
                  />
                </div>
              ) : (
                <>
                  <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5">
                    <p className="text-sm text-yellow-100">
                      Inline preview could not be displayed. Showing raw text
                      fallback instead.
                    </p>
                  </div>

                  <div className="min-h-[520px] max-h-[720px] overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-4">
                    {version.rawText ? (
                      <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-white/75">
                        {version.rawText}
                      </pre>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-sm text-white/45">
                        No fallback text preview available.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6 xl:col-span-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <FileText className="text-blue-300" />
                <h2 className="text-xl font-semibold">Version Summary</h2>
              </div>

              <div className="space-y-3">
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

                <div className="grid grid-cols-2 gap-3">
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
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <Tag className="text-indigo-300" />
                <h2 className="text-xl font-semibold">Metadata</h2>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Version Code</p>
                  <p className="text-sm font-semibold text-white/85">
                    {version.versionCode || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Version Type</p>
                  <p className="text-sm font-semibold text-white/85">
                    {version.versionType || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Base Version</p>
                  <p className="text-sm font-semibold text-white/85">
                    {version.isBaseVersion ? "Yes" : "No"}
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
                  <p className="mb-1 text-xs text-white/45">Job Application Code</p>
                  <p className="break-all text-sm font-semibold text-white/85">
                    {version.jobApplicationCode || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <CalendarDays className="text-purple-300" />
                <h2 className="text-xl font-semibold">Dates & Score</h2>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Created At</p>
                  <p className="text-sm font-semibold text-white/85">
                    {formatDateTime(version.createdAt)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Updated At</p>
                  <p className="text-sm font-semibold text-white/85">
                    {formatDateTime(version.updatedAt)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <Sparkles size={12} />
                    <span>ATS Score</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-300">
                    {version.atsScore ?? 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <Layers3 className="text-emerald-300" />
                <h2 className="text-xl font-semibold">Quick Actions</h2>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() =>
                    router.push(
                      `/user/resume/${resumeId}/versions/${versionId}/edit`
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                >
                  <FileText size={18} />
                  Edit Version
                </button>

                <button
                  onClick={() =>
                    router.push(`/user/resume/${resumeId}/versions/${versionId}`)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                >
                  <Eye size={18} />
                  View Detail
                </button>

                <button
                  onClick={openInNewTab}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                >
                  <ExternalLink size={18} />
                  Open Preview
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}