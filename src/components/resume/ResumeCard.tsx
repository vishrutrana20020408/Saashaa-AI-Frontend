"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  FileText,
  Download,
  Eye,
  Edit3,
  Copy,
  Wand2,
  Sparkles,
  CalendarDays,
  Layers3,
  Loader2,
  ChevronRight,
} from "lucide-react";

/**
 * src/components/resume/ResumeCard.tsx
 *
 * Backend Integrated Resume Card
 *
 * Purpose:
 * - Display a resume or resume version summary
 * - Support quick actions like view, edit, preview, download
 * - Work with Resume Management System pages
 *
 * Latest project alignment:
 * - backend-first route generation
 * - supports current backend resume/version contracts
 * - supports user/admin listing usage
 * - supports direct backend preview/download fallback
 * - supports bearer token fallback + credentials: "include"
 * - keeps frontend aligned with resume tailoring / duplicate / editor flows
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export type ResumeCardData = {
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
  createdAt?: string;
  previewUrl?: string;
  downloadUrl?: string;
  rawText?: string;
};

type ResumeCardProps = {
  data: ResumeCardData;
  type?: "resume" | "version";
  routeBase?: string;
  showViewButton?: boolean;
  showEditButton?: boolean;
  showPreviewButton?: boolean;
  showDownloadButton?: boolean;
  showDuplicateButton?: boolean;
  showTailorButton?: boolean;
  showOpenArrow?: boolean;
  onDuplicate?: (data: ResumeCardData) => void;
  onTailor?: (data: ResumeCardData) => void;
  onPreview?: (data: ResumeCardData) => void;
  onDownload?: (data: ResumeCardData) => Promise<void> | void;
  className?: string;
  compact?: boolean;
  clickable?: boolean;
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

function normalizeResumeCardData(data: ResumeCardData): ResumeCardData {
  return {
    ...data,
    resumeId: readNumber(data.resumeId),
    resumeVersionId: readNumber(data.resumeVersionId, data.versionId),
    versionId: readNumber(data.versionId, data.resumeVersionId),
    resumeName: readString(data.resumeName),
    versionName: readString(data.versionName),
    fileName: readString(data.fileName),
    atsScore: readNumber(data.atsScore),
    versionCode: readString(data.versionCode),
    versionType: readString(data.versionType),
    isBaseVersion: normalizeBoolean(data.isBaseVersion),
    updatedAt: readString(data.updatedAt),
    createdAt: readString(data.createdAt),
    previewUrl: readString(data.previewUrl),
    downloadUrl: readString(data.downloadUrl),
    rawText: readString(data.rawText),
  };
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
  const normalized = (type || "").toUpperCase();

  if (normalized === "BASE") {
    return "border-indigo-400/20 bg-indigo-500/15 text-indigo-100";
  }
  if (normalized === "TAILORED") {
    return "border-purple-400/20 bg-purple-500/15 text-purple-100";
  }
  if (normalized === "DUPLICATE") {
    return "border-blue-400/20 bg-blue-500/15 text-blue-100";
  }

  return "border-white/10 bg-white/10 text-white/80";
}

export default function ResumeCard({
  data,
  type = "resume",
  routeBase = "/user/resume",
  showViewButton = true,
  showEditButton = true,
  showPreviewButton = true,
  showDownloadButton = true,
  showDuplicateButton = true,
  showTailorButton = true,
  showOpenArrow = false,
  onDuplicate,
  onTailor,
  onPreview,
  onDownload,
  className = "",
  compact = false,
  clickable = false,
}: ResumeCardProps) {
  const [downloading, setDownloading] = useState(false);

  const normalizedData = useMemo(() => normalizeResumeCardData(data), [data]);

  const resumeId = normalizedData.resumeId
    ? String(normalizedData.resumeId)
    : "";
  const versionId = normalizedData.resumeVersionId ?? normalizedData.versionId
    ? String(normalizedData.resumeVersionId ?? normalizedData.versionId)
    : "";

  const isVersionCard =
    type === "version" || Boolean(normalizedData.resumeVersionId ?? normalizedData.versionId);

  const detailHref = useMemo(() => {
    if (isVersionCard && resumeId && versionId) {
      return `${routeBase}/${resumeId}/versions/${versionId}`;
    }

    if (resumeId) {
      return `${routeBase}/${resumeId}`;
    }

    return routeBase;
  }, [isVersionCard, resumeId, routeBase, versionId]);

  const editHref = useMemo(() => {
    if (isVersionCard && resumeId && versionId) {
      return `${routeBase}/${resumeId}/versions/${versionId}/edit`;
    }

    if (resumeId) {
      return `${routeBase}/${resumeId}`;
    }

    return routeBase;
  }, [isVersionCard, resumeId, routeBase, versionId]);

  const previewHref = useMemo(() => {
    if (normalizedData.previewUrl) return normalizedData.previewUrl;

    if (isVersionCard && resumeId && versionId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/preview`;
    }

    if (resumeId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/preview`;
    }

    return "#";
  }, [isVersionCard, normalizedData.previewUrl, resumeId, versionId]);

  const downloadHref = useMemo(() => {
    if (normalizedData.downloadUrl) return normalizedData.downloadUrl;

    if (isVersionCard && resumeId && versionId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/download`;
    }

    if (resumeId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/download`;
    }

    return "#";
  }, [isVersionCard, normalizedData.downloadUrl, resumeId, versionId]);

  const displayTitle = useMemo(() => {
    if (isVersionCard) {
      return (
        normalizedData.versionName ||
        normalizedData.resumeName ||
        normalizedData.fileName ||
        "Resume Version"
      );
    }

    return (
      normalizedData.resumeName ||
      normalizedData.versionName ||
      normalizedData.fileName ||
      "Resume"
    );
  }, [isVersionCard, normalizedData.fileName, normalizedData.resumeName, normalizedData.versionName]);

  const displaySubtitle = useMemo(() => {
    if (isVersionCard) {
      return normalizedData.resumeName || normalizedData.fileName || "Resume";
    }

    return normalizedData.fileName || normalizedData.versionName || "Resume file";
  }, [isVersionCard, normalizedData.fileName, normalizedData.resumeName, normalizedData.versionName]);

  const score = Math.max(0, Math.min(normalizedData.atsScore ?? 0, 100));

  const handlePreview = useCallback(() => {
    if (onPreview) {
      onPreview(normalizedData);
      return;
    }

    if (previewHref && previewHref !== "#") {
      window.open(previewHref, "_blank", "noopener,noreferrer");
    }
  }, [normalizedData, onPreview, previewHref]);

  const handleDownload = useCallback(async () => {
    if (downloading) return;

    try {
      setDownloading(true);

      if (onDownload) {
        await onDownload(normalizedData);
        return;
      }

      if (!downloadHref || downloadHref === "#") {
        throw new Error("Download URL not available.");
      }

      const token = getStoredToken();

      const response = await fetch(downloadHref, {
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
      anchor.download = normalizedData.fileName || `${displayTitle}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ResumeCard download error:", error);
    } finally {
      setDownloading(false);
    }
  }, [displayTitle, downloadHref, downloading, normalizedData, onDownload]);

  const CardBody = (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl transition hover:border-indigo-400/20 hover:shadow-2xl ${className}`}
    >
      <div className={compact ? "p-4" : "p-6"}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              {isVersionCard ? <Layers3 size={20} /> : <FileText size={20} />}
            </div>

            <div className="min-w-0">
              <h3 className="wrap-break-word text-lg font-semibold text-white">
                {displayTitle}
              </h3>

              <p className="mt-1 wrap-break-word text-sm text-white/55">
                {displaySubtitle}
              </p>

              {normalizedData.fileName && isVersionCard && (
                <p className="mt-1 break-all text-xs text-white/45">
                  {normalizedData.fileName}
                </p>
              )}
            </div>
          </div>

          {showOpenArrow && (
            <Link
              href={detailHref}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15"
              aria-label="Open resume"
            >
              <ChevronRight size={18} />
            </Link>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${getScoreBadgeClasses(
              score
            )}`}
          >
            <Sparkles size={12} className="mr-1" />
            ATS {score}%
          </span>

          {normalizedData.versionType && (
            <span
              className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${getTypeBadgeClasses(
                normalizedData.versionType
              )}`}
            >
              {normalizedData.versionType}
            </span>
          )}

          {normalizedData.isBaseVersion && (
            <span className="inline-flex items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-100">
              Base Version
            </span>
          )}

          {normalizedData.versionCode && (
            <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
              {normalizedData.versionCode}
            </span>
          )}
        </div>

        <div
          className={`mt-5 grid gap-3 ${
            compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
          }`}
        >
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="mb-1 text-xs text-white/45">
              {isVersionCard ? "Version ID" : "Resume ID"}
            </p>
            <p className="wrap-break-word text-sm font-semibold text-white/85">
              {isVersionCard
                ? normalizedData.resumeVersionId ?? normalizedData.versionId ?? "N/A"
                : normalizedData.resumeId ?? "N/A"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
              <CalendarDays size={12} />
              <span>{isVersionCard ? "Updated At" : "Last Updated"}</span>
            </div>
            <p className="wrap-break-word text-sm font-semibold text-white/85">
              {formatDateTime(normalizedData.updatedAt || normalizedData.createdAt)}
            </p>
          </div>
        </div>

        {normalizedData.rawText && !compact && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="mb-2 text-xs text-white/45">Preview Text</p>
            <p className="line-clamp-3 whitespace-pre-wrap wrap-break-word text-sm text-white/65">
              {normalizedData.rawText}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          {showViewButton && (
            <Link
              href={detailHref}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold transition ${
                clickable || showOpenArrow
                  ? "bg-white/10 hover:bg-white/15"
                  : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <Eye size={16} />
              View
            </Link>
          )}

          {showEditButton && (
            <Link
              href={editHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
            >
              <Edit3 size={16} />
              Edit
            </Link>
          )}

          {showPreviewButton && (
            <button
              type="button"
              onClick={handlePreview}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
            >
              <Eye size={16} />
              Preview
            </button>
          )}

          {showDownloadButton && (
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
          )}

          {showDuplicateButton && (
            <button
              type="button"
              onClick={() => onDuplicate?.(normalizedData)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
            >
              <Copy size={16} />
              Duplicate
            </button>
          )}

          {showTailorButton && (
            <button
              type="button"
              onClick={() => onTailor?.(normalizedData)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
            >
              <Wand2 size={16} />
              Tailor
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (clickable && !showViewButton && !showOpenArrow) {
    return <Link href={detailHref}>{CardBody}</Link>;
  }

  return CardBody;
}