"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FileText,
  RefreshCw,
  Download,
  Eye,
  Edit3,
  Copy,
  Wand2,
  Upload,
  Plus,
  Loader2,
  CalendarDays,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

/**
 * src/app/components/ResumeHeader.tsx
 *
 * Backend integrated Resume Header
 *
 * Purpose:
 * - Reusable header for resume pages
 * - Shows current resume / version summary
 * - Supports backend-aware actions like refresh, preview, download,
 *   duplicate, tailor, upload, edit, create new
 *
 * Works for:
 * - current resume pages
 * - resume detail pages
 * - resume version pages
 * - admin/user resume modules
 *
 * Expected compatible backend data:
 * {
 *   resumeId: 1,
 *   resumeVersionId: 21,
 *   versionId: 21,
 *   resumeName: "Base Resume",
 *   versionName: "Backend Developer Version",
 *   fileName: "Vishrut_Rana_Resume.pdf",
 *   atsScore: 84,
 *   versionCode: "VER-003",
 *   versionType: "TAILORED",
 *   isBaseVersion: false,
 *   updatedAt: "2026-03-12T20:30:00",
 *   previewUrl: "http://localhost:8080/api/user/resume/1/versions/21/preview",
 *   downloadUrl: "http://localhost:8080/api/user/resume/1/versions/21/download"
 * }
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export type ResumeHeaderData = {
  resumeId?: number | string;
  resumeVersionId?: number | string;
  versionId?: number | string;
  resumeName?: string;
  versionName?: string;
  fileName?: string;
  atsScore?: number;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  updatedAt?: string;
  previewUrl?: string;
  downloadUrl?: string;
};

type ResumeHeaderProps = {
  data?: ResumeHeaderData | null;

  /**
   * Header text
   */
  title?: string;
  subtitle?: string;

  /**
   * Route helpers
   */
  routeBase?: string;
  backHref?: string;

  /**
   * UI flags
   */
  showBackButton?: boolean;
  showMeta?: boolean;
  showRefreshButton?: boolean;
  showPreviewButton?: boolean;
  showDownloadButton?: boolean;
  showEditButton?: boolean;
  showDuplicateButton?: boolean;
  showTailorButton?: boolean;
  showUploadButton?: boolean;
  showCreateButton?: boolean;

  /**
   * Action labels
   */
  refreshLabel?: string;
  previewLabel?: string;
  downloadLabel?: string;
  editLabel?: string;
  duplicateLabel?: string;
  tailorLabel?: string;
  uploadLabel?: string;
  createLabel?: string;

  /**
   * Loading flags
   */
  refreshing?: boolean;
  downloading?: boolean;
  disabled?: boolean;

  /**
   * Callbacks
   */
  onRefresh?: () => void | Promise<void>;
  onPreview?: (data: ResumeHeaderData | null) => void;
  onDownload?: (data: ResumeHeaderData | null) => void | Promise<void>;
  onDuplicate?: (data: ResumeHeaderData | null) => void;
  onTailor?: (data: ResumeHeaderData | null) => void;
  onUpload?: () => void;
  onCreate?: () => void;

  /**
   * Style
   */
  className?: string;
};

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

function getScoreBadgeClasses(score: number) {
  if (score >= 85) return "bg-green-500/15 text-green-200 border-green-400/20";
  if (score >= 70) return "bg-yellow-500/15 text-yellow-100 border-yellow-400/20";
  return "bg-red-500/15 text-red-200 border-red-400/20";
}

export default function ResumeHeader({
  data = null,
  title = "Resume Manager",
  subtitle = "Manage your resume, versions, downloads, and tailoring flow.",
  routeBase = "/user/resume",
  backHref,
  showBackButton = false,
  showMeta = true,
  showRefreshButton = true,
  showPreviewButton = true,
  showDownloadButton = true,
  showEditButton = false,
  showDuplicateButton = false,
  showTailorButton = false,
  showUploadButton = false,
  showCreateButton = false,
  refreshLabel = "Refresh",
  previewLabel = "Preview",
  downloadLabel = "Download",
  editLabel = "Edit",
  duplicateLabel = "Duplicate",
  tailorLabel = "Tailor",
  uploadLabel = "Upload",
  createLabel = "Create",
  refreshing = false,
  downloading = false,
  disabled = false,
  onRefresh,
  onPreview,
  onDownload,
  onDuplicate,
  onTailor,
  onUpload,
  onCreate,
  className = "",
}: ResumeHeaderProps) {
  const [internalDownloading, setInternalDownloading] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwtToken")
      : null;

  const resumeId = String(data?.resumeId ?? "");
  const versionId = String(data?.resumeVersionId ?? data?.versionId ?? "");

  const editHref = useMemo(() => {
    if (resumeId && versionId) {
      return `${routeBase}/${resumeId}/versions/${versionId}/edit`;
    }
    if (resumeId) {
      return `${routeBase}/${resumeId}`;
    }
    return `${routeBase}`;
  }, [routeBase, resumeId, versionId]);

  const resolvedPreviewUrl = useMemo(() => {
    if (data?.previewUrl) return data.previewUrl;
    if (resumeId && versionId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/preview`;
    }
    if (resumeId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/preview`;
    }
    return `${API_BASE_URL}/api/user/resume/current/preview`;
  }, [data?.previewUrl, resumeId, versionId]);

  const resolvedDownloadUrl = useMemo(() => {
    if (data?.downloadUrl) return data.downloadUrl;
    if (resumeId && versionId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/download`;
    }
    if (resumeId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/download`;
    }
    return `${API_BASE_URL}/api/user/resume/current/download`;
  }, [data?.downloadUrl, resumeId, versionId]);

  const displayName = data?.versionName || data?.resumeName || "Resume";
  const safeScore = Math.max(0, Math.min(data?.atsScore ?? 0, 100));

  const handlePreview = () => {
    if (disabled) return;

    if (onPreview) {
      onPreview(data);
      return;
    }

    window.open(resolvedPreviewUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async () => {
    if (disabled || internalDownloading || downloading) return;

    if (onDownload) {
      await onDownload(data);
      return;
    }

    try {
      setInternalDownloading(true);

      const response = await fetch(resolvedDownloadUrl, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = data?.fileName || `${displayName}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ResumeHeader download error:", error);
    } finally {
      setInternalDownloading(false);
    }
  };

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl text-white ${className}`}
    >
      <div className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {showBackButton && backHref && (
              <div className="mb-4">
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-2 text-white/70 hover:text-white transition"
                >
                  <ArrowLeft size={18} />
                  Back
                </Link>
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 grid place-items-center shadow-lg">
                <FileText size={22} />
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {title}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-white/60 max-w-3xl">
                  {subtitle}
                </p>

                {showMeta && data && (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold bg-white/10 text-white/85 border-white/10">
                        {displayName}
                      </span>

                      {typeof data.atsScore === "number" && (
                        <span
                          className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${getScoreBadgeClasses(
                            safeScore
                          )}`}
                        >
                          <Sparkles size={12} className="mr-1" />
                          ATS {safeScore}%
                        </span>
                      )}

                      {data.versionType && (
                        <span
                          className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${getTypeBadgeClasses(
                            data.versionType
                          )}`}
                        >
                          {data.versionType}
                        </span>
                      )}

                      {data.isBaseVersion && (
                        <span className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold bg-indigo-500/15 text-indigo-100 border-indigo-400/20">
                          Base Version
                        </span>
                      )}

                      {data.versionCode && (
                        <span className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold bg-white/10 text-white/75 border-white/10">
                          {data.versionCode}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs text-white/45 mb-1">
                          Resume Name
                        </p>
                        <p className="text-sm font-semibold text-white/85 wrap-break-word">
                          {data.resumeName || "N/A"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs text-white/45 mb-1">
                          Version Name
                        </p>
                        <p className="text-sm font-semibold text-white/85 wrap-break-word">
                          {data.versionName || "N/A"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs text-white/45 mb-1">File Name</p>
                        <p className="text-sm font-semibold text-white/85 break-all">
                          {data.fileName || "N/A"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-center gap-2 text-xs text-white/45 mb-1">
                          <CalendarDays size={12} />
                          <span>Updated At</span>
                        </div>
                        <p className="text-sm font-semibold text-white/85 wrap-break-word">
                          {formatDateTime(data.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            {showRefreshButton && (
              <button
                type="button"
                onClick={() => onRefresh?.()}
                disabled={disabled || refreshing}
                className="rounded-xl px-4 py-2.5 font-semibold bg-white/10 hover:bg-white/15 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {refreshing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                {refreshLabel}
              </button>
            )}

            {showPreviewButton && (
              <button
                type="button"
                onClick={handlePreview}
                disabled={disabled}
                className="rounded-xl px-4 py-2.5 font-semibold bg-white/10 hover:bg-white/15 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Eye size={16} />
                {previewLabel}
              </button>
            )}

            {showDownloadButton && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={disabled || downloading || internalDownloading}
                className="rounded-xl px-4 py-2.5 font-semibold bg-linear-to-r from-blue-500 to-purple-600 hover:opacity-95 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {downloading || internalDownloading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {downloadLabel}
              </button>
            )}

            {showEditButton && (
              <Link
                href={editHref}
                className="rounded-xl px-4 py-2.5 font-semibold bg-white/10 hover:bg-white/15 transition inline-flex items-center justify-center gap-2"
              >
                <Edit3 size={16} />
                {editLabel}
              </Link>
            )}

            {showDuplicateButton && (
              <button
                type="button"
                onClick={() => onDuplicate?.(data)}
                disabled={disabled}
                className="rounded-xl px-4 py-2.5 font-semibold bg-white/10 hover:bg-white/15 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Copy size={16} />
                {duplicateLabel}
              </button>
            )}

            {showTailorButton && (
              <button
                type="button"
                onClick={() => onTailor?.(data)}
                disabled={disabled}
                className="rounded-xl px-4 py-2.5 font-semibold bg-white/10 hover:bg-white/15 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Wand2 size={16} />
                {tailorLabel}
              </button>
            )}

            {showUploadButton && (
              <button
                type="button"
                onClick={onUpload}
                disabled={disabled}
                className="rounded-xl px-4 py-2.5 font-semibold bg-white/10 hover:bg-white/15 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload size={16} />
                {uploadLabel}
              </button>
            )}

            {showCreateButton && (
              <button
                type="button"
                onClick={onCreate}
                disabled={disabled}
                className="rounded-xl px-4 py-2.5 font-semibold bg-white/10 hover:bg-white/15 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus size={16} />
                {createLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}