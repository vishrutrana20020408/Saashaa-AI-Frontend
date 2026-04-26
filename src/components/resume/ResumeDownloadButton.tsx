"use client";

import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  Loader2,
  ExternalLink,
  FileDown,
} from "lucide-react";

/**
 * src/app/components/ResumeDownloadButtons.tsx
 *
 * Backend integrated Resume Download / Preview Buttons
 *
 * Supports:
 * - Current resume download
 * - Resume by resumeId
 * - Resume version by resumeId + versionId
 * - Preview in new tab
 * - Download via backend authenticated fetch
 *
 * Expected backend endpoints:
 *
 * Current resume:
 * GET /api/user/resume/current/download
 * GET /api/user/resume/current/preview
 *
 * Resume by ID:
 * GET /api/user/resume/{resumeId}/download
 * GET /api/user/resume/{resumeId}/preview
 *
 * Resume version by IDs:
 * GET /api/user/resume/{resumeId}/versions/{versionId}/download
 * GET /api/user/resume/{resumeId}/versions/{versionId}/preview
 *
 * Admin examples can also be passed directly with custom URLs:
 * downloadUrl="http://localhost:8080/api/admin/resume/101/download"
 * previewUrl="http://localhost:8080/api/admin/resume/101/preview"
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type ResumeDownloadButtonsProps = {
  resumeId?: string | number;
  versionId?: string | number;

  /**
   * Optional direct backend URLs.
   * If provided, they override generated URLs.
   */
  downloadUrl?: string;
  previewUrl?: string;

  /**
   * Optional filename for downloaded file.
   */
  fileName?: string;

  /**
   * UI options
   */
  showPreviewButton?: boolean;
  showDownloadButton?: boolean;
  showOpenInNewTabButton?: boolean;
  compact?: boolean;
  className?: string;
  disabled?: boolean;

  /**
   * Labels
   */
  downloadLabel?: string;
  previewLabel?: string;
  openInNewTabLabel?: string;

  /**
   * Optional callback hooks
   */
  onDownloadSuccess?: () => void;
  onDownloadError?: (error: unknown) => void;
  onPreviewClick?: () => void;
};

export default function ResumeDownloadButtons({
  resumeId,
  versionId,
  downloadUrl,
  previewUrl,
  fileName,
  showPreviewButton = true,
  showDownloadButton = true,
  showOpenInNewTabButton = false,
  compact = false,
  className = "",
  disabled = false,
  downloadLabel = "Download",
  previewLabel = "Preview",
  openInNewTabLabel = "Open",
  onDownloadSuccess,
  onDownloadError,
  onPreviewClick,
}: ResumeDownloadButtonsProps) {
  const [downloading, setDownloading] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("jwtToken")
      : null;

  const resolvedDownloadUrl = useMemo(() => {
    if (downloadUrl) return downloadUrl;

    if (resumeId && versionId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/download`;
    }

    if (resumeId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/download`;
    }

    return `${API_BASE_URL}/api/user/resume/current/download`;
  }, [downloadUrl, resumeId, versionId]);

  const resolvedPreviewUrl = useMemo(() => {
    if (previewUrl) return previewUrl;

    if (resumeId && versionId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/preview`;
    }

    if (resumeId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/preview`;
    }

    return `${API_BASE_URL}/api/user/resume/current/preview`;
  }, [previewUrl, resumeId, versionId]);

  const resolvedFileName = useMemo(() => {
    if (fileName) return fileName;

    if (resumeId && versionId) {
      return `resume-${resumeId}-version-${versionId}.pdf`;
    }

    if (resumeId) {
      return `resume-${resumeId}.pdf`;
    }

    return "resume.pdf";
  }, [fileName, resumeId, versionId]);

  const buttonSizeClasses = compact
    ? "px-3 py-2 text-sm"
    : "px-4 py-2.5 text-sm";

  const baseButtonClasses =
    "rounded-xl font-semibold transition inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const handlePreview = () => {
    if (disabled) return;

    if (onPreviewClick) {
      onPreviewClick();
    }

    window.open(resolvedPreviewUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenInNewTab = () => {
    if (disabled) return;
    window.open(resolvedPreviewUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async () => {
    if (disabled || downloading) return;

    try {
      setDownloading(true);

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
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = blobUrl;
      anchor.download = resolvedFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(blobUrl);

      if (onDownloadSuccess) {
        onDownloadSuccess();
      }
    } catch (error) {
      console.error("ResumeDownloadButtons download error:", error);
      if (onDownloadError) {
        onDownloadError(error);
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {showPreviewButton && (
        <button
          type="button"
          onClick={handlePreview}
          disabled={disabled}
          className={`${baseButtonClasses} ${buttonSizeClasses} bg-white/10 hover:bg-white/15 text-white`}
        >
          <Eye size={16} />
          {previewLabel}
        </button>
      )}

      {showDownloadButton && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={disabled || downloading}
          className={`${baseButtonClasses} ${buttonSizeClasses} bg-linear-to-r from-blue-500 to-purple-600 hover:opacity-95 text-white`}
        >
          {downloading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              {compact ? <Download size={16} /> : <FileDown size={16} />}
              {downloadLabel}
            </>
          )}
        </button>
      )}

      {showOpenInNewTabButton && (
        <button
          type="button"
          onClick={handleOpenInNewTab}
          disabled={disabled}
          className={`${baseButtonClasses} ${buttonSizeClasses} bg-white/10 hover:bg-white/15 text-white`}
        >
          <ExternalLink size={16} />
          {openInNewTabLabel}
        </button>
      )}
    </div>
  );
}