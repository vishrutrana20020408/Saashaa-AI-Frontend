"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  ExternalLink,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Layers3,
  CalendarDays,
  Sparkles,
  BadgeCheck,
  ScanSearch,
} from "lucide-react";

/**
 * src/components/resume/ResumePreview.tsx
 *
 * Backend Integrated Resume Preview
 *
 * Latest-project aligned goals:
 * - backend-first resume preview flow
 * - supports current resume, resume by resumeId, and specific version preview
 * - supports user/admin endpoint fallback
 * - supports ApiResponse wrappers (data / payload / result)
 * - supports direct backend preview/download URLs
 * - supports inline iframe preview with fallback text/structured preview
 * - supports credentials: "include" + bearer token fallback
 *
 * Typical backend families:
 * - GET /api/user/resume/current
 * - GET /api/user/resume/{resumeId}
 * - GET /api/user/resume/{resumeId}/versions/{versionId}
 * - GET /api/user/resume/current/preview
 * - GET /api/user/resume/{resumeId}/preview
 * - GET /api/user/resume/{resumeId}/versions/{versionId}/preview
 * - GET /api/user/resume/current/download
 * - GET /api/user/resume/{resumeId}/download
 * - GET /api/user/resume/{resumeId}/versions/{versionId}/download
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type GenericObject = Record<string, unknown>;

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

export type ResumePreviewData = {
  resumeId?: number | string;
  resumeVersionId?: number | string;
  versionId?: number | string;
  resumeName?: string;
  versionName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  previewUrl?: string;
  downloadUrl?: string;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  updatedAt?: string;
  createdAt?: string;
  fileUrl?: string;
  structuredContentJson?: string;
};

type ResumePreviewProps = {
  resumeId?: string | number;
  versionId?: string | number;
  autoFetch?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  heightClassName?: string;
  showHeader?: boolean;
  showMeta?: boolean;
  showActions?: boolean;
  showInlinePreview?: boolean;
  showFallbackText?: boolean;
  disabled?: boolean;
  onLoaded?: (data: ResumePreviewData) => void;
  onPreviewOpen?: (data: ResumePreviewData | null) => void;
  onDownload?: (data: ResumePreviewData | null) => Promise<void> | void;
};

function getStoredToken(): string | null {
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

function formatDateTime(value?: string) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getTypeBadgeClasses(type?: string) {
  const normalized = (type || "").toUpperCase();

  if (normalized === "BASE") {
    return "bg-indigo-500/15 text-indigo-100 border-indigo-400/20";
  }
  if (normalized === "TAILORED") {
    return "bg-purple-500/15 text-purple-100 border-purple-400/20";
  }
  if (normalized === "DUPLICATE") {
    return "bg-blue-500/15 text-blue-100 border-blue-400/20";
  }
  return "bg-white/10 text-white/80 border-white/10";
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }
  return undefined;
}

function readString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function safeParseJson(value?: string): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function unwrapPayload<T = unknown>(input: unknown): T | null {
  if (!input || typeof input !== "object") return null;

  const obj = input as ApiEnvelope<T> & GenericObject;

  if (obj.data !== undefined && obj.data !== null) return obj.data as T;
  if (obj.payload !== undefined && obj.payload !== null) return obj.payload as T;
  if (obj.result !== undefined && obj.result !== null) return obj.result as T;

  return input as T;
}

function mapResumePayloadToPreviewData(input: unknown): ResumePreviewData | null {
  if (!input || typeof input !== "object") return null;

  const payload =
    unwrapPayload<Record<string, unknown>>(input) &&
    typeof unwrapPayload<Record<string, unknown>>(input) === "object"
      ? (unwrapPayload<Record<string, unknown>>(input) as Record<string, unknown>)
      : (input as Record<string, unknown>);

  const structuredContentJson = readString(
    payload.structuredContentJson,
    payload.structured_content_json
  );

  const structuredContent = safeParseJson(structuredContentJson);
  const source =
    structuredContent && typeof structuredContent === "object"
      ? { ...payload, ...structuredContent }
      : payload;

  const mapped: ResumePreviewData = {
    resumeId: readNumber(source.resumeId, source.resume_id, source.id),
    resumeVersionId: readNumber(
      source.resumeVersionId,
      source.resume_version_id,
      source.versionId,
      source.version_id
    ),
    versionId: readNumber(
      source.versionId,
      source.version_id,
      source.resumeVersionId,
      source.resume_version_id
    ),
    resumeName: readString(source.resumeName, source.resume_name, source.name),
    versionName: readString(source.versionName, source.version_name),
    fileName: readString(
      source.fileName,
      source.file_name,
      source.originalFileName,
      source.original_file_name
    ),
    atsScore: readNumber(source.atsScore, source.ats_score),
    rawText: readString(source.rawText, source.raw_text),
    previewUrl: readString(source.previewUrl, source.preview_url, source.fileUrl, source.file_url),
    downloadUrl: readString(source.downloadUrl, source.download_url),
    versionCode: readString(source.versionCode, source.version_code),
    versionType: readString(source.versionType, source.version_type),
    isBaseVersion: normalizeBoolean(source.isBaseVersion ?? source.is_base_version),
    updatedAt: readString(source.updatedAt, source.updated_at),
    createdAt: readString(source.createdAt, source.created_at),
    fileUrl: readString(source.fileUrl, source.file_url),
    structuredContentJson,
  };

  if (!mapped.resumeName && mapped.fileName) {
    mapped.resumeName = mapped.fileName;
  }

  const hasUsefulData =
    mapped.resumeId !== undefined ||
    mapped.resumeVersionId !== undefined ||
    mapped.versionId !== undefined ||
    Boolean(mapped.previewUrl) ||
    Boolean(mapped.downloadUrl) ||
    Boolean(mapped.fileUrl) ||
    Boolean(mapped.fileName) ||
    Boolean(mapped.rawText) ||
    Boolean(mapped.structuredContentJson);

  return hasUsefulData ? mapped : null;
}

function buildEndpointCandidates(params: {
  resumeId?: string | number;
  versionId?: string | number;
}) {
  const rid =
    params.resumeId !== undefined && params.resumeId !== null
      ? String(params.resumeId)
      : undefined;
  const vid =
    params.versionId !== undefined && params.versionId !== null
      ? String(params.versionId)
      : undefined;

  const getCandidates: string[] = [];
  const previewCandidates: string[] = [];
  const downloadCandidates: string[] = [];

  if (rid && vid) {
    getCandidates.push(
      `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}`,
      `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}`,
      `${API_BASE_URL}/api/user/resume/version/${vid}`,
      `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}`,
      `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}`,
      `${API_BASE_URL}/api/admin/resume/version/${vid}`
    );

    previewCandidates.push(
      `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/preview`,
      `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/preview`,
      `${API_BASE_URL}/api/user/resume/version/${vid}/preview`,
      `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/preview`,
      `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/preview`,
      `${API_BASE_URL}/api/admin/resume/version/${vid}/preview`
    );

    downloadCandidates.push(
      `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/download`,
      `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/download`,
      `${API_BASE_URL}/api/user/resume/version/${vid}/download`,
      `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/download`,
      `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/download`,
      `${API_BASE_URL}/api/admin/resume/version/${vid}/download`
    );
  } else if (rid) {
    getCandidates.push(
      `${API_BASE_URL}/api/user/resume/${rid}`,
      `${API_BASE_URL}/api/user/resume/${rid}/latest`,
      `${API_BASE_URL}/api/admin/resume/${rid}`,
      `${API_BASE_URL}/api/admin/resume/${rid}/latest`
    );

    previewCandidates.push(
      `${API_BASE_URL}/api/user/resume/${rid}/preview`,
      `${API_BASE_URL}/api/user/resume/${rid}/latest/preview`,
      `${API_BASE_URL}/api/admin/resume/${rid}/preview`,
      `${API_BASE_URL}/api/admin/resume/${rid}/latest/preview`
    );

    downloadCandidates.push(
      `${API_BASE_URL}/api/user/resume/${rid}/download`,
      `${API_BASE_URL}/api/user/resume/${rid}/latest/download`,
      `${API_BASE_URL}/api/admin/resume/${rid}/download`,
      `${API_BASE_URL}/api/admin/resume/${rid}/latest/download`
    );
  } else {
    getCandidates.push(
      `${API_BASE_URL}/api/user/resume/current`,
      `${API_BASE_URL}/api/user/resume/latest`,
      `${API_BASE_URL}/api/admin/resume/current`,
      `${API_BASE_URL}/api/admin/resume/latest`
    );

    previewCandidates.push(
      `${API_BASE_URL}/api/user/resume/current/preview`,
      `${API_BASE_URL}/api/user/resume/latest/preview`,
      `${API_BASE_URL}/api/admin/resume/current/preview`,
      `${API_BASE_URL}/api/admin/resume/latest/preview`
    );

    downloadCandidates.push(
      `${API_BASE_URL}/api/user/resume/current/download`,
      `${API_BASE_URL}/api/user/resume/latest/download`,
      `${API_BASE_URL}/api/admin/resume/current/download`,
      `${API_BASE_URL}/api/admin/resume/latest/download`
    );
  }

  return {
    get: getCandidates,
    preview: previewCandidates,
    download: downloadCandidates,
  };
}

export default function ResumePreview({
  resumeId,
  versionId,
  autoFetch = true,
  title = "Resume Preview",
  subtitle = "Preview your resume directly from backend endpoints.",
  className = "",
  heightClassName = "h-[720px]",
  showHeader = true,
  showMeta = true,
  showActions = true,
  showInlinePreview = true,
  showFallbackText = true,
  disabled = false,
  onLoaded,
  onPreviewOpen,
  onDownload,
}: ResumePreviewProps) {
  const [data, setData] = useState<ResumePreviewData | null>(null);

  const [loading, setLoading] = useState(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [iframeFailed, setIframeFailed] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authHeaders = useMemo<HeadersInit>(() => {
    const token = getStoredToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const endpointCandidates = useMemo(
    () => buildEndpointCandidates({ resumeId, versionId }),
    [resumeId, versionId]
  );

  const resolvedPreviewUrl = useMemo(() => {
    return data?.previewUrl || endpointCandidates.preview[0] || "";
  }, [data?.previewUrl, endpointCandidates.preview]);

  const resolvedDownloadUrl = useMemo(() => {
    return data?.downloadUrl || data?.fileUrl || endpointCandidates.download[0] || "";
  }, [data?.downloadUrl, data?.fileUrl, endpointCandidates.download]);

  const fetchResume = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let resolvedData: ResumePreviewData | null = null;

        for (const endpoint of endpointCandidates.get) {
          try {
            const response = await fetch(endpoint, {
              method: "GET",
              headers: authHeaders,
              credentials: "include",
              cache: "no-store",
            });

            if (!response.ok) {
              if ([401, 403, 404].includes(response.status)) continue;
              continue;
            }

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) continue;

            const result = await response.json();
            const mapped = mapResumePayloadToPreviewData(result);
            if (!mapped) continue;

            resolvedData = {
              ...mapped,
              previewUrl: mapped.previewUrl || endpointCandidates.preview[0],
              downloadUrl:
                mapped.downloadUrl || mapped.fileUrl || endpointCandidates.download[0],
            };

            break;
          } catch {
            continue;
          }
        }

        if (!resolvedData) {
          const fallbackOnly =
            endpointCandidates.preview[0] || endpointCandidates.download[0]
              ? {
                  previewUrl: endpointCandidates.preview[0],
                  downloadUrl: endpointCandidates.download[0],
                }
              : null;

          if (fallbackOnly) {
            resolvedData = fallbackOnly;
          } else {
            throw new Error("Resume preview data not found.");
          }
        }

        setData(resolvedData);
        setIframeFailed(false);

        if (resolvedData.fileName && typeof window !== "undefined") {
          localStorage.setItem("userResumeName", resolvedData.fileName);
        }

        onLoaded?.(resolvedData);
      } catch (error) {
        console.error("ResumePreview fetch error:", error);
        setErrorMessage("Unable to load resume preview from backend.");
        setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders, endpointCandidates.download, endpointCandidates.get, endpointCandidates.preview, onLoaded]
  );

  useEffect(() => {
    if (!autoFetch) return;
    fetchResume();
  }, [autoFetch, fetchResume]);

  const handleOpenPreview = useCallback(() => {
    if (disabled) return;

    if (onPreviewOpen) {
      onPreviewOpen(data);
      return;
    }

    if (!resolvedPreviewUrl) {
      setErrorMessage("Preview URL is not available.");
      return;
    }

    window.open(resolvedPreviewUrl, "_blank", "noopener,noreferrer");
  }, [data, disabled, onPreviewOpen, resolvedPreviewUrl]);

  const handleDownload = useCallback(async () => {
    if (disabled || downloading) return;

    if (onDownload) {
      await onDownload(data);
      return;
    }

    if (!resolvedDownloadUrl) {
      setErrorMessage("Download URL is not available.");
      return;
    }

    try {
      setDownloading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const token = getStoredToken();

      const response = await fetch(resolvedDownloadUrl, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      anchor.download = data?.fileName || "resume.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
      setSuccessMessage("Resume downloaded successfully.");
    } catch (error) {
      console.error("ResumePreview download error:", error);
      setErrorMessage("Failed to download resume.");
    } finally {
      setDownloading(false);
    }
  }, [data, disabled, downloading, onDownload, resolvedDownloadUrl]);

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl text-white ${className}`}
    >
      <div className="p-6">
        {showHeader && (
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Eye size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-sm text-white/55">{subtitle}</p>

                {showMeta && data && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(data.versionName || data.resumeName) && (
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                        {data.versionName || data.resumeName}
                      </span>
                    )}

                    {typeof data.atsScore === "number" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-green-400/20 bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-100">
                        <Sparkles size={12} />
                        ATS {data.atsScore}%
                      </span>
                    )}

                    {data.versionType && (
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getTypeBadgeClasses(
                          data.versionType
                        )}`}
                      >
                        {data.versionType}
                      </span>
                    )}

                    {data.isBaseVersion && (
                      <span className="rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-100">
                        Base Version
                      </span>
                    )}

                    {data.versionCode && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                        <BadgeCheck size={12} />
                        {data.versionCode}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {showActions && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => fetchResume(true)}
                  disabled={disabled || loading || refreshing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
                >
                  {refreshing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={handleOpenPreview}
                  disabled={disabled || !resolvedPreviewUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
                >
                  <ExternalLink size={16} />
                  Open
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={disabled || downloading || !resolvedDownloadUrl}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-4 py-2.5 font-semibold transition hover:opacity-95 disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  Download
                </button>
              </div>
            )}
          </div>
        )}

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

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
            <Loader2 className="animate-spin text-indigo-300" size={28} />
            <p className="text-sm text-white/60">Loading resume preview...</p>
          </div>
        ) : !data ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-10 text-center">
            <FileText className="mx-auto text-white/35" size={28} />
            <p className="mt-3 font-medium text-white/70">No resume preview available.</p>
          </div>
        ) : (
          <>
            {showMeta && (
              <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">Resume Name</p>
                  <p className="wrap-break-word text-sm font-semibold text-white/85">
                    {data.resumeName || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <Layers3 size={12} />
                    <span>Version Name</span>
                  </div>
                  <p className="wrap-break-word text-sm font-semibold text-white/85">
                    {data.versionName || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">File Name</p>
                  <p className="break-all text-sm font-semibold text-white/85">
                    {data.fileName || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <CalendarDays size={12} />
                    <span>Updated At</span>
                  </div>
                  <p className="wrap-break-word text-sm font-semibold text-white/85">
                    {formatDateTime(data.updatedAt || data.createdAt)}
                  </p>
                </div>
              </div>
            )}

            {showInlinePreview && !iframeFailed && resolvedPreviewUrl && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
                <iframe
                  src={resolvedPreviewUrl}
                  title="Resume Preview"
                  className={`w-full ${heightClassName}`}
                  onError={() => setIframeFailed(true)}
                />
              </div>
            )}

            {((showInlinePreview && iframeFailed) ||
              (showInlinePreview && !resolvedPreviewUrl)) &&
              showFallbackText && (
                <>
                  <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                    <p className="text-sm text-yellow-100">
                      Inline preview is not available. Showing text preview instead.
                    </p>
                  </div>

                  <div
                    className={`overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4 ${heightClassName}`}
                  >
                    {data.rawText ? (
                      <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-white/75">
                        {data.rawText}
                      </pre>
                    ) : data.structuredContentJson ? (
                      <div className="space-y-3 text-sm text-white/75">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                          <ScanSearch size={12} />
                          Structured content available from backend
                        </div>
                        <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-white/75">
                          {data.structuredContentJson}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-sm text-white/45">
                        No fallback text preview available.
                      </div>
                    )}
                  </div>
                </>
              )}

            {!showInlinePreview && showFallbackText && (
              <div
                className={`overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4 ${heightClassName}`}
              >
                {data.rawText ? (
                  <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-white/75">
                    {data.rawText}
                  </pre>
                ) : data.structuredContentJson ? (
                  <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-white/75">
                    {data.structuredContentJson}
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-white/45">
                    No text preview available.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}