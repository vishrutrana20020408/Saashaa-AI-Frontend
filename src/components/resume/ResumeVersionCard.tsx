"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Layers3,
  Sparkles,
  CalendarDays,
  Eye,
  Edit3,
  Download,
  Copy,
  Wand2,
  FileText,
  Loader2,
  GitBranch,
  Tag,
  CheckCircle2,
  ArrowRight,
  Briefcase,
} from "lucide-react";

/**
 * src/components/resume/ResumeVersionCard.tsx
 *
 * Backend-integrated Resume Version Card
 *
 * Aligned with latest project update:
 * - supports user/admin resume version display flows
 * - supports backend-driven preview/download URL fallbacks
 * - aligns with resume versioning + tailoring ideology
 * - resilient to backend payload variations
 * - compatible with current user resume flow and admin inspection flow
 *
 * Common backend patterns supported:
 *
 * User:
 * GET /api/user/resume/{resumeId}/versions/{versionId}
 * GET /api/user/resume/{resumeId}/versions/{versionId}/preview
 * GET /api/user/resume/{resumeId}/versions/{versionId}/download
 *
 * Admin:
 * GET /api/admin/resume/{resumeId}/versions/{versionId}
 * GET /api/admin/resume/{resumeId}/versions/{versionId}/preview
 * GET /api/admin/resume/{resumeId}/versions/{versionId}/download
 *
 * Compatible data examples:
 * {
 *   "resumeId": 1,
 *   "resumeVersionId": 11,
 *   "versionId": 11,
 *   "resumeName": "Main Resume",
 *   "versionName": "Backend Developer Version",
 *   "fileName": "Vishrut_Backend_Resume.pdf",
 *   "atsScore": 84,
 *   "versionCode": "VER-001",
 *   "versionType": "TAILORED",
 *   "isBaseVersion": false,
 *   "parentVersionId": 5,
 *   "jobApplicationCode": "JOB-123",
 *   "updatedAt": "2026-03-12T20:30:00",
 *   "createdAt": "2026-03-12T19:00:00",
 *   "previewUrl": "http://localhost:8080/api/user/resume/1/versions/11/preview",
 *   "downloadUrl": "http://localhost:8080/api/user/resume/1/versions/11/download",
 *   "rawText": "..."
 * }
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

export type ResumeVersionCardData = {
  resumeId?: number | string;
  id?: number | string;

  resumeVersionId?: number | string;
  versionId?: number | string;
  currentVersionId?: number | string;

  resumeName?: string;
  title?: string;
  versionName?: string;
  fileName?: string;
  originalFileName?: string;

  atsScore?: number | string;
  versionCode?: string;
  resumeCode?: string;
  versionType?: string;

  isBaseVersion?: boolean;
  baseVersion?: boolean;

  parentVersionId?: number | string | null;
  parentId?: number | string | null;

  jobApplicationCode?: string | null;
  applicationCode?: string | null;

  updatedAt?: string;
  createdAt?: string;

  previewUrl?: string;
  downloadUrl?: string;
  fileUrl?: string;

  rawText?: string;
  structuredContentJson?: unknown;

  status?: string;
};

type ResumeVersionCardProps = {
  data: ResumeVersionCardData;

  /**
   * Examples:
   * /user/resume
   * /admin/resume
   */
  routeBase?: string;

  /**
   * Backend side used for fallback preview/download endpoints.
   * - user  => /api/user/resume/...
   * - admin => /api/admin/resume/...
   */
  backendScope?: "user" | "admin";

  className?: string;
  compact?: boolean;
  clickable?: boolean;

  showRawPreview?: boolean;
  showParentInfo?: boolean;
  showJobApplicationCode?: boolean;
  showActions?: boolean;
  showEditButton?: boolean;
  showDuplicateButton?: boolean;
  showTailorButton?: boolean;
  showOpenArrow?: boolean;
  disableDefaultNavigationWhenClickable?: boolean;

  onClick?: (data: ResumeVersionCardData) => void;
  onPreview?: (data: ResumeVersionCardData) => void;
  onDownload?: (data: ResumeVersionCardData) => Promise<void> | void;
  onDuplicate?: (data: ResumeVersionCardData) => void;
  onTailor?: (data: ResumeVersionCardData) => void;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
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

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
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

function getScoreBadgeClasses(score: number) {
  if (score >= 85) {
    return "border-green-400/20 bg-green-500/15 text-green-200";
  }
  if (score >= 70) {
    return "border-yellow-400/20 bg-yellow-500/15 text-yellow-100";
  }
  return "border-red-400/20 bg-red-500/15 text-red-200";
}

function getTypeBadgeClasses(type?: string) {
  const normalized = (type || "").trim().toUpperCase();

  if (normalized === "BASE") {
    return "border-indigo-400/20 bg-indigo-500/15 text-indigo-100";
  }
  if (normalized === "TAILORED") {
    return "border-purple-400/20 bg-purple-500/15 text-purple-100";
  }
  if (normalized === "DUPLICATE") {
    return "border-blue-400/20 bg-blue-500/15 text-blue-100";
  }
  if (normalized === "JOB_TARGETED") {
    return "border-pink-400/20 bg-pink-500/15 text-pink-100";
  }
  if (normalized === "BASE_VERSION") {
    return "border-indigo-400/20 bg-indigo-500/15 text-indigo-100";
  }
  return "border-white/10 bg-white/10 text-white/80";
}

function withAbsoluteUrl(url?: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
}

function resolveResumeId(data: ResumeVersionCardData) {
  return data.resumeId ?? data.id;
}

function resolveVersionId(data: ResumeVersionCardData) {
  return data.resumeVersionId ?? data.versionId ?? data.currentVersionId;
}

function resolveParentVersionId(data: ResumeVersionCardData) {
  return data.parentVersionId ?? data.parentId ?? null;
}

function resolveJobApplicationCode(data: ResumeVersionCardData) {
  return data.jobApplicationCode ?? data.applicationCode ?? null;
}

function resolveIsBaseVersion(data: ResumeVersionCardData) {
  return Boolean(data.isBaseVersion ?? data.baseVersion ?? false);
}

function resolvePreviewUrl(
  data: ResumeVersionCardData,
  backendScope: "user" | "admin"
) {
  if (data.previewUrl) return withAbsoluteUrl(data.previewUrl);

  const resumeId = resolveResumeId(data);
  const versionId = resolveVersionId(data);

  if (!resumeId || !versionId) return "#";

  return `${API_BASE_URL}/api/${backendScope}/resume/${resumeId}/versions/${versionId}/preview`;
}

function resolveDownloadUrl(
  data: ResumeVersionCardData,
  backendScope: "user" | "admin"
) {
  if (data.downloadUrl) return withAbsoluteUrl(data.downloadUrl);
  if (data.fileUrl) return withAbsoluteUrl(data.fileUrl);

  const resumeId = resolveResumeId(data);
  const versionId = resolveVersionId(data);

  if (!resumeId || !versionId) return "#";

  return `${API_BASE_URL}/api/${backendScope}/resume/${resumeId}/versions/${versionId}/download`;
}

function buildFriendlyErrorMessage(status: number) {
  if (status === 401) return "You are not authenticated. Please log in again.";
  if (status === 403) return "You do not have permission to access this resume version.";
  if (status === 404) return "Resume version file was not found.";
  return `Download failed with status ${status}.`;
}

export default function ResumeVersionCard({
  data,
  routeBase = "/user/resume",
  backendScope = "user",
  className = "",
  compact = false,
  clickable = false,
  showRawPreview = true,
  showParentInfo = true,
  showJobApplicationCode = true,
  showActions = true,
  showEditButton = true,
  showDuplicateButton = true,
  showTailorButton = true,
  showOpenArrow = false,
  disableDefaultNavigationWhenClickable = false,
  onClick,
  onPreview,
  onDownload,
  onDuplicate,
  onTailor,
}: ResumeVersionCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const token = getStoredToken();

  const role =
    typeof window !== "undefined"
      ? normalizeRole(localStorage.getItem("userRole"))
      : "";

  const resolvedBackendScope: "user" | "admin" =
    backendScope ||
    (role === "ADMIN" || role === "ROLE_ADMIN" ? "admin" : "user");

  const resumeId = String(resolveResumeId(data) ?? "");
  const versionId = String(resolveVersionId(data) ?? "");

  const detailHref = useMemo(() => {
    if (resumeId && versionId) {
      return `${routeBase}/${resumeId}/versions/${versionId}`;
    }
    return routeBase;
  }, [routeBase, resumeId, versionId]);

  const editHref = useMemo(() => {
    if (resumeId && versionId) {
      return `${routeBase}/${resumeId}/versions/${versionId}/edit`;
    }
    return routeBase;
  }, [routeBase, resumeId, versionId]);

  const previewHref = useMemo(() => {
    return resolvePreviewUrl(data, resolvedBackendScope);
  }, [data, resolvedBackendScope]);

  const downloadHref = useMemo(() => {
    return resolveDownloadUrl(data, resolvedBackendScope);
  }, [data, resolvedBackendScope]);

  const score = Math.max(0, Math.min(toSafeNumber(data.atsScore, 0), 100));
  const title = data.versionName || data.versionCode || "Resume Version";
  const parentVersionId = resolveParentVersionId(data);
  const jobApplicationCode = resolveJobApplicationCode(data);
  const isBaseVersion = resolveIsBaseVersion(data);
  const fileName = data.fileName || data.originalFileName || "N/A";
  const resumeName = data.resumeName || data.title || "Resume";

  const handlePreview = () => {
    if (onPreview) {
      onPreview(data);
      return;
    }

    if (previewHref !== "#" && typeof window !== "undefined") {
      window.open(previewHref, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = async () => {
    if (downloading) return;

    try {
      setDownloading(true);
      setDownloadError(null);

      if (onDownload) {
        await onDownload(data);
        return;
      }

      if (!downloadHref || downloadHref === "#") {
        throw new Error("No download URL is available for this resume version.");
      }

      const response = await fetch(downloadHref, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(buildFriendlyErrorMessage(response.status));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download =
        data.fileName || data.originalFileName || `${title}.pdf`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("ResumeVersionCard download error:", error);
      setDownloadError(
        error?.message || "Failed to download resume version."
      );
    } finally {
      setDownloading(false);
    }
  };

  const cardClasses = cn(
    "rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl transition hover:border-indigo-400/20 hover:shadow-2xl",
    className
  );

  const content = (
    <div className={compact ? "p-4" : "p-6"}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Layers3 size={20} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="wrap-break-word text-lg font-semibold text-white">
                {title}
              </h3>

              {isBaseVersion && (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-100">
                  <CheckCircle2 size={12} />
                  Base
                </span>
              )}
            </div>

            <p className="mt-1 wrap-break-word text-sm text-white/55">
              {resumeName}
            </p>

            {(data.fileName || data.originalFileName) && (
              <p className="mt-1 break-all text-xs text-white/45">
                {fileName}
              </p>
            )}
          </div>
        </div>

        {showOpenArrow && !clickable && (
          <Link
            href={detailHref}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/15"
          >
            Open
            <ArrowRight size={14} />
          </Link>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold",
            getScoreBadgeClasses(score)
          )}
        >
          <Sparkles size={12} className="mr-1" />
          ATS {score}%
        </span>

        {data.versionType && (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold",
              getTypeBadgeClasses(data.versionType)
            )}
          >
            {data.versionType}
          </span>
        )}

        {data.versionCode && (
          <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
            <Tag size={12} className="mr-1" />
            {data.versionCode}
          </span>
        )}
      </div>

      <div
        className={cn(
          "mt-5 grid gap-3",
          compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
        )}
      >
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-1 text-xs text-white/45">Version ID</p>
          <p className="wrap-break-word text-sm font-semibold text-white/85">
            {data.resumeVersionId ?? data.versionId ?? data.currentVersionId ?? "N/A"}
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

        {showParentInfo && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
              <GitBranch size={12} />
              <span>Parent Version</span>
            </div>
            <p className="wrap-break-word text-sm font-semibold text-white/85">
              {parentVersionId ?? "N/A"}
            </p>
          </div>
        )}

        {showJobApplicationCode && (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
              <Briefcase size={12} />
              <span>Job Application Code</span>
            </div>
            <p className="wrap-break-word text-sm font-semibold text-white/85">
              {jobApplicationCode || "N/A"}
            </p>
          </div>
        )}
      </div>

      {showRawPreview && data.rawText && !compact && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 flex items-center gap-2">
            <FileText size={14} className="text-indigo-300" />
            <p className="text-xs text-white/55">Preview Text</p>
          </div>
          <p className="line-clamp-3 whitespace-pre-wrap wrap-break-word text-sm text-white/65">
            {data.rawText}
          </p>
        </div>
      )}

      {downloadError && (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3">
          <p className="text-sm text-red-100">{downloadError}</p>
        </div>
      )}

      {showActions && (
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={detailHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
          >
            <Eye size={16} />
            View
          </Link>

          {showEditButton && (
            <Link
              href={editHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
            >
              <Edit3 size={16} />
              Edit
            </Link>
          )}

          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
          >
            <Eye size={16} />
            Preview
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-4 py-2.5 font-semibold transition hover:opacity-95 disabled:opacity-50"
          >
            {downloading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download size={16} />
                Download
              </>
            )}
          </button>

          {showDuplicateButton && (
            <button
              type="button"
              onClick={() => onDuplicate?.(data)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
            >
              <Copy size={16} />
              Duplicate
            </button>
          )}

          {showTailorButton && (
            <button
              type="button"
              onClick={() => onTailor?.(data)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
            >
              <Wand2 size={16} />
              Tailor
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (clickable && !disableDefaultNavigationWhenClickable) {
    return (
      <Link
        href={detailHref}
        className={cardClasses}
        onClick={() => onClick?.(data)}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(cardClasses, clickable && "cursor-pointer")}
      onClick={() => {
        if (clickable) onClick?.(data);
      }}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(data);
        }
      }}
    >
      {content}
    </div>
  );
}