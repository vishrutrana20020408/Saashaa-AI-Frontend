"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
} from "lucide-react";

/**
 * src/components/resume/admin/AdminResumePreview.tsx
 *
 * Latest project-aligned admin resume preview component.
 *
 * Backend integration:
 * - GET /api/admin/resume/{resumeId}
 * - GET /api/admin/resume/{resumeId}/versions
 *
 * Supported response wrapper shapes:
 * - plain object / plain array
 * - { data: ... }
 * - { result: ... }
 * - { payload: ... }
 * - { content: ... }
 *
 * Preview priority:
 * 1) selected version previewUrl
 * 2) selected version fileUrl
 * 3) resume previewUrl
 * 4) resume fileUrl
 *
 * Notes:
 * - PDF links are previewed directly in iframe.
 * - DOC/DOCX can fall back to Google Docs viewer.
 * - Images are rendered with <img>.
 * - Backend auth is supported using bearer token + cookies.
 */

type Nullable<T> = T | null | undefined;

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  result?: T | null;
  payload?: T | null;
  content?: T | null;
};

type ResumeVersion = {
  resumeVersionId?: number;
  id?: number;
  versionCode?: string;
  versionName?: string;
  versionType?: string;
  atsScore?: number | null;
  isBaseVersion?: boolean;
  createdAt?: string;
  updatedAt?: string;
  fileUrl?: string | null;
  previewUrl?: string | null;
  jobApplicationCode?: string | null;
  rawText?: string | null;
  structuredContentJson?: unknown;
};

type ResumeDetails = {
  resumeId?: number;
  id?: number;
  resumeCode?: string;
  title?: string | null;
  resumeName?: string | null;
  originalFileName?: string | null;
  fileName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  summary?: string | null;
  currentRole?: string | null;
  experienceLevel?: string | null;
  createdAt?: string;
  updatedAt?: string;
  status?: string | null;
  fileUrl?: string | null;
  previewUrl?: string | null;
  latestVersion?: ResumeVersion | null;
  baseVersion?: ResumeVersion | null;
  versions?: ResumeVersion[] | null;
};

type ResumeVersionCollection =
  | ResumeVersion[]
  | {
      items?: ResumeVersion[];
      versions?: ResumeVersion[];
      data?: ResumeVersion[];
      content?: ResumeVersion[];
    };

type AdminResumePreviewProps = {
  resumeId: string | number;
  apiBaseUrl?: string;
  defaultVersionId?: string | number;
  heightClassName?: string;
  showHeader?: boolean;
  showVersionSelector?: boolean;
  className?: string;
};

function unwrapResponse<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === "object") {
    const obj = value as ApiEnvelope<T>;
    if (obj.data !== undefined && obj.data !== null) return obj.data as T;
    if (obj.result !== undefined && obj.result !== null) return obj.result as T;
    if (obj.payload !== undefined && obj.payload !== null) return obj.payload as T;
    if (obj.content !== undefined && obj.content !== null) return obj.content as T;
  }
  return value as T;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwtToken") ||
    null
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorBody = await response.json();
      message =
        errorBody?.message ||
        errorBody?.error ||
        errorBody?.details ||
        message;
    } catch {
      // ignore parse failure
    }

    throw new Error(message);
  }

  const data = await response.json().catch(() => null);
  return unwrapResponse<T>(data);
}

function safeText(value?: Nullable<string>, fallback = "—") {
  if (!value || !String(value).trim()) return fallback;
  return String(value).trim();
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getVersionId(version: ResumeVersion) {
  return version.resumeVersionId ?? version.id ?? null;
}

function getResumeId(resume: ResumeDetails | null) {
  return resume?.resumeId ?? resume?.id ?? null;
}

function extractVersions(data: ResumeVersionCollection): ResumeVersion[] {
  if (Array.isArray(data)) return data;
  return data?.items || data?.versions || data?.data || data?.content || [];
}

function normalizeVersions(
  resume: ResumeDetails | null,
  versions: ResumeVersion[]
): ResumeVersion[] {
  const merged = [
    ...(resume?.versions || []),
    ...(resume?.baseVersion ? [resume.baseVersion] : []),
    ...(resume?.latestVersion ? [resume.latestVersion] : []),
    ...versions,
  ];

  const seen = new Map<string | number, ResumeVersion>();

  for (const version of merged) {
    const key =
      version.resumeVersionId ??
      version.id ??
      version.versionCode ??
      `${version.versionName || "version"}-${version.createdAt || ""}`;

    if (!seen.has(key)) {
      seen.set(key, version);
    }
  }

  return [...seen.values()].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function getLatestAvailableVersion(
  resume: ResumeDetails | null,
  versions: ResumeVersion[]
) {
  if (resume?.latestVersion) return resume.latestVersion;
  if (!versions.length) return null;

  return [...versions].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  })[0];
}

function buildGoogleDocsViewer(url: string) {
  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
    url
  )}`;
}

function isPdfUrl(url: string) {
  return /\.pdf(\?|#|$)/i.test(url);
}

function isDocUrl(url: string) {
  return /\.(doc|docx)(\?|#|$)/i.test(url);
}

function isImageUrl(url: string) {
  return /\.(png|jpg|jpeg|webp|gif|bmp|svg)(\?|#|$)/i.test(url);
}

function resolvePreviewUrl(
  selectedVersion: ResumeVersion | null,
  resume: ResumeDetails | null
) {
  return (
    selectedVersion?.previewUrl ||
    selectedVersion?.fileUrl ||
    resume?.previewUrl ||
    resume?.fileUrl ||
    null
  );
}

function resolveDownloadUrl(
  selectedVersion: ResumeVersion | null,
  resume: ResumeDetails | null
) {
  return (
    selectedVersion?.fileUrl ||
    resume?.fileUrl ||
    selectedVersion?.previewUrl ||
    resume?.previewUrl ||
    null
  );
}

export default function AdminResumePreview({
  resumeId,
  apiBaseUrl = "",
  defaultVersionId,
  heightClassName = "h-[800px]",
  showHeader = true,
  showVersionSelector = true,
  className = "",
}: AdminResumePreviewProps) {
  const [resume, setResume] = useState<ResumeDetails | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [frameLoading, setFrameLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [useDocsViewer, setUseDocsViewer] = useState(false);

  const normalizedApiBaseUrl = useMemo(
    () => apiBaseUrl.replace(/\/$/, ""),
    [apiBaseUrl]
  );

  const detailUrl = `${normalizedApiBaseUrl}/api/admin/resume/${resumeId}`;
  const versionsUrl = `${normalizedApiBaseUrl}/api/admin/resume/${resumeId}/versions`;

  const loadResume = useCallback(async () => {
    try {
      const data = await fetchJson<ResumeDetails>(detailUrl);
      setResume(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load resume preview."
      );
    } finally {
      setLoading(false);
    }
  }, [detailUrl]);

  const loadVersions = useCallback(async () => {
    try {
      const data = await fetchJson<ResumeVersionCollection>(versionsUrl);
      setVersions(extractVersions(data));
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, [versionsUrl]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setVersionsLoading(true);
    setFrameLoading(true);
    await Promise.all([loadResume(), loadVersions()]);
  }, [loadResume, loadVersions]);

  useEffect(() => {
    void Promise.all([loadResume(), loadVersions()]);
  }, [loadResume, loadVersions]);

  const normalizedVersions = useMemo(
    () => normalizeVersions(resume, versions),
    [resume, versions]
  );

  const selectedVersion = useMemo(() => {
    if (!normalizedVersions.length) return null;

    if (selectedVersionId) {
      return (
        normalizedVersions.find(
          (version) => String(getVersionId(version)) === String(selectedVersionId)
        ) || null
      );
    }

    if (defaultVersionId !== undefined && defaultVersionId !== null) {
      return (
        normalizedVersions.find(
          (version) => String(getVersionId(version)) === String(defaultVersionId)
        ) || null
      );
    }

    return getLatestAvailableVersion(resume, normalizedVersions);
  }, [normalizedVersions, selectedVersionId, defaultVersionId, resume]);

  useEffect(() => {
    if (!selectedVersionId && selectedVersion) {
      const id = getVersionId(selectedVersion);
      if (id !== null) {
        setSelectedVersionId(String(id));
      }
    }
  }, [selectedVersion, selectedVersionId]);

  const previewUrl = resolvePreviewUrl(selectedVersion, resume);
  const downloadUrl = resolveDownloadUrl(selectedVersion, resume);

  const viewerUrl = useMemo(() => {
    if (!previewUrl) return null;

    if (isDocUrl(previewUrl) || useDocsViewer) {
      return buildGoogleDocsViewer(previewUrl);
    }

    return previewUrl;
  }, [previewUrl, useDocsViewer]);

  const resumeTitle =
    resume?.title ||
    resume?.resumeName ||
    resume?.originalFileName ||
    resume?.fileName ||
    selectedVersion?.versionName ||
    "Resume Preview";

  const resetView = () => {
    setZoom(100);
    setUseDocsViewer(false);
  };

  useEffect(() => {
    setFrameLoading(true);
  }, [viewerUrl, selectedVersionId, useDocsViewer]);

  if (loading) {
    return (
      <div
        className={`rounded-2xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}
      >
        <div className="flex items-center gap-3 text-gray-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading resume preview...</span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
        </div>

        <div className="mt-6 h-[600px] animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm ${className}`}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-red-700">
              Failed to load resume preview
            </h2>
            <p className="mt-1 text-sm text-red-600">{error}</p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => void reloadAll()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {showHeader && (
        <div className="border-b border-gray-200 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {safeText(resumeTitle)}
                </h2>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  Resume ID: {getResumeId(resume) ?? resumeId}
                </span>

                {resume?.resumeCode && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    Code: {resume.resumeCode}
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                <span>
                  Candidate:{" "}
                  <span className="font-medium text-gray-900">
                    {safeText(resume?.fullName)}
                  </span>
                </span>
                <span>
                  Updated:{" "}
                  <span className="font-medium text-gray-900">
                    {formatDate(
                      selectedVersion?.updatedAt ||
                        resume?.updatedAt ||
                        selectedVersion?.createdAt ||
                        resume?.createdAt
                    )}
                  </span>
                </span>
                <span>
                  Version:{" "}
                  <span className="font-medium text-gray-900">
                    {safeText(
                      selectedVersion?.versionName || selectedVersion?.versionCode
                    )}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void reloadAll()}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
              )}

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            {showVersionSelector && (
              <div className="min-w-[280px]">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Select Version
                </label>
                <select
                  value={selectedVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none"
                >
                  {normalizedVersions.length === 0 ? (
                    <option value="">No versions available</option>
                  ) : (
                    normalizedVersions.map((version) => {
                      const id = getVersionId(version);
                      const label =
                        version.versionName ||
                        version.versionCode ||
                        `Version ${id ?? "N/A"}`;

                      return (
                        <option key={String(id ?? label)} value={String(id ?? "")}>
                          {label}
                          {version.isBaseVersion ? " • Base" : ""}
                          {resume?.latestVersion &&
                          String(getVersionId(resume.latestVersion)) === String(id)
                            ? " • Latest"
                            : ""}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:items-center">
              <InfoBadge
                label="Type"
                value={safeText(selectedVersion?.versionType)}
              />
              <InfoBadge
                label="ATS"
                value={
                  selectedVersion?.atsScore === null ||
                  selectedVersion?.atsScore === undefined
                    ? "N/A"
                    : String(selectedVersion.atsScore)
                }
              />
              <InfoBadge
                label="Versions"
                value={versionsLoading ? "..." : String(normalizedVersions.length)}
              />
              <InfoBadge
                label="Job Code"
                value={safeText(selectedVersion?.jobApplicationCode)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setZoom((prev) => Math.max(50, prev - 10))}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ZoomOut className="h-4 w-4" />
              Zoom Out
            </button>

            <button
              onClick={() => setZoom((prev) => Math.min(200, prev + 10))}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ZoomIn className="h-4 w-4" />
              Zoom In
            </button>

            <button
              onClick={resetView}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>

            <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
              {zoom}%
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-gray-100">
        {!viewerUrl ? (
          <div className={`flex items-center justify-center ${heightClassName}`}>
            <div className="max-w-md rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
              <FileText className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No preview available
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                This resume does not currently have a preview URL or file URL.
              </p>
            </div>
          </div>
        ) : (
          <>
            {frameLoading && (
              <div
                className={`absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px] ${heightClassName}`}
              >
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-700" />
                  <span className="text-sm font-medium text-gray-700">
                    Loading preview...
                  </span>
                </div>
              </div>
            )}

            <div className={`overflow-auto ${heightClassName}`}>
              <div
                className="mx-auto origin-top transition-transform duration-200"
                style={{
                  transform: `scale(${zoom / 100})`,
                  width: zoom === 100 ? "100%" : `${100 / (zoom / 100)}%`,
                }}
              >
                {isImageUrl(viewerUrl) ? (
                  <div className="flex items-center justify-center p-6">
                    <img
                      src={viewerUrl}
                      alt="Resume Preview"
                      className="max-w-full rounded-xl border border-gray-200 bg-white shadow-sm"
                      onLoad={() => setFrameLoading(false)}
                      onError={() => setFrameLoading(false)}
                    />
                  </div>
                ) : (
                  <iframe
                    key={`${viewerUrl}-${useDocsViewer}`}
                    src={viewerUrl}
                    title="Admin Resume Preview"
                    className="min-h-[900px] w-full border-0 bg-white"
                    onLoad={() => setFrameLoading(false)}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-gray-600">
            {previewUrl ? (
              <>
                Preview source:{" "}
                <span className="font-medium text-gray-900">
                  {isPdfUrl(previewUrl)
                    ? "PDF / browser preview"
                    : isDocUrl(previewUrl)
                    ? useDocsViewer
                      ? "Google Docs viewer"
                      : "Document file"
                    : isImageUrl(previewUrl)
                    ? "Image file"
                    : "Hosted file / preview link"}
                </span>
              </>
            ) : (
              "No preview source available."
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {previewUrl && isDocUrl(previewUrl) && !useDocsViewer && (
              <button
                onClick={() => setUseDocsViewer(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Eye className="h-4 w-4" />
                Use Docs Viewer
              </button>
            )}

            {useDocsViewer && previewUrl && (
              <button
                onClick={() => setUseDocsViewer(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Maximize2 className="h-4 w-4" />
                Use Direct Preview
              </button>
            )}

            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </a>
            )}

            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-black px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                <Download className="h-4 w-4" />
                Download File
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}