"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  RefreshCw,
  Download,
  Eye,
  Edit3,
  Copy,
  Wand2,
  Upload,
  Plus,
  Save,
  Sparkles,
  Loader2,
  ArrowLeft,
  FileText,
  FolderKanban,
  ListChecks,
  ExternalLink,
} from "lucide-react";

/**
 * src/components/resume/ResumeToolbar.tsx
 *
 * Backend Integrated Resume Toolbar
 *
 * Latest project alignment:
 * - backend-first resume management flow
 * - supports current resume, resume by resumeId, and resume version by versionId
 * - works across user/admin resume modules
 * - supports direct backend preview/download URL fallback
 * - supports credentials: "include" + bearer token fallback
 * - keeps routing aligned with version-based resume architecture
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export type ResumeToolbarData = {
  resumeId?: number | string;
  resumeVersionId?: number | string;
  versionId?: number | string;
  resumeName?: string;
  versionName?: string;
  fileName?: string;
  atsScore?: number;
  versionType?: string;
  versionCode?: string;
  previewUrl?: string;
  downloadUrl?: string;
  fileUrl?: string;
  isBaseVersion?: boolean;
};

type ResumeToolbarProps = {
  data?: ResumeToolbarData | null;

  routeBase?: string;
  backHref?: string;
  uploadHref?: string;
  createHref?: string;
  editHref?: string;
  detailHref?: string;
  tailorHref?: string;
  duplicateHref?: string;

  title?: string;
  subtitle?: string;

  showBackButton?: boolean;
  showTitle?: boolean;
  showRefreshButton?: boolean;
  showPreviewButton?: boolean;
  showOpenInNewTabButton?: boolean;
  showDownloadButton?: boolean;
  showSaveButton?: boolean;
  showEditButton?: boolean;
  showDetailButton?: boolean;
  showDuplicateButton?: boolean;
  showTailorButton?: boolean;
  showUploadButton?: boolean;
  showCreateButton?: boolean;
  showSectionsButton?: boolean;
  showProjectsButton?: boolean;
  showVersionsButton?: boolean;

  refreshing?: boolean;
  saving?: boolean;
  downloading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;

  onRefresh?: () => void | Promise<void>;
  onPreview?: (data: ResumeToolbarData | null) => void;
  onOpenInNewTab?: (data: ResumeToolbarData | null) => void;
  onDownload?: (data: ResumeToolbarData | null) => void | Promise<void>;
  onSave?: () => void | Promise<void>;
  onDuplicate?: (data: ResumeToolbarData | null) => void;
  onTailor?: (data: ResumeToolbarData | null) => void;
  onUpload?: () => void;
  onCreate?: () => void;
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

function getGeneratedRoutes(
  routeBase: string,
  data?: ResumeToolbarData | null
) {
  const resumeId = String(data?.resumeId ?? "");
  const versionId = String(data?.resumeVersionId ?? data?.versionId ?? "");

  const hasResume = !!resumeId;
  const hasVersion = !!resumeId && !!versionId;

  return {
    detailHref: hasVersion
      ? `${routeBase}/${resumeId}/versions/${versionId}`
      : hasResume
        ? `${routeBase}/${resumeId}`
        : routeBase,

    editHref: hasVersion
      ? `${routeBase}/${resumeId}/versions/${versionId}/edit`
      : hasResume
        ? `${routeBase}/${resumeId}`
        : routeBase,

    versionsHref: hasResume ? `${routeBase}/${resumeId}` : routeBase,

    sectionsHref: hasVersion
      ? `${routeBase}/${resumeId}/versions/${versionId}/edit`
      : hasResume
        ? `${routeBase}/${resumeId}`
        : routeBase,

    projectsHref: hasVersion
      ? `${routeBase}/${resumeId}/versions/${versionId}/edit`
      : hasResume
        ? `${routeBase}/${resumeId}`
        : routeBase,
  };
}

export default function ResumeToolbar({
  data = null,
  routeBase = "/user/resume",
  backHref,
  uploadHref = "/user/resume/upload",
  createHref = "/user/resume/create-duplicate",
  editHref,
  detailHref,
  tailorHref = "/user/resume/tailor",
  duplicateHref = "/user/resume/create-duplicate",
  title = "Resume Toolbar",
  subtitle = "Quick actions for backend-connected resume management.",
  showBackButton = false,
  showTitle = false,
  showRefreshButton = true,
  showPreviewButton = true,
  showOpenInNewTabButton = false,
  showDownloadButton = true,
  showSaveButton = false,
  showEditButton = true,
  showDetailButton = false,
  showDuplicateButton = false,
  showTailorButton = false,
  showUploadButton = false,
  showCreateButton = false,
  showSectionsButton = false,
  showProjectsButton = false,
  showVersionsButton = false,
  refreshing = false,
  saving = false,
  downloading = false,
  disabled = false,
  compact = false,
  className = "",
  onRefresh,
  onPreview,
  onOpenInNewTab,
  onDownload,
  onSave,
  onDuplicate,
  onTailor,
  onUpload,
  onCreate,
}: ResumeToolbarProps) {
  const [internalDownloading, setInternalDownloading] = useState(false);

  const generatedRoutes = useMemo(
    () => getGeneratedRoutes(routeBase, data),
    [routeBase, data]
  );

  const resolvedEditHref = editHref || generatedRoutes.editHref;
  const resolvedDetailHref = detailHref || generatedRoutes.detailHref;

  const resolvedPreviewUrl = useMemo(() => {
    if (data?.previewUrl) return data.previewUrl;

    const resumeId = String(data?.resumeId ?? "");
    const versionId = String(data?.resumeVersionId ?? data?.versionId ?? "");

    if (resumeId && versionId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/preview`;
    }

    if (resumeId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/preview`;
    }

    return `${API_BASE_URL}/api/user/resume/current/preview`;
  }, [data]);

  const resolvedDownloadUrl = useMemo(() => {
    if (data?.downloadUrl) return data.downloadUrl;
    if (data?.fileUrl) return data.fileUrl;

    const resumeId = String(data?.resumeId ?? "");
    const versionId = String(data?.resumeVersionId ?? data?.versionId ?? "");

    if (resumeId && versionId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/download`;
    }

    if (resumeId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/download`;
    }

    return `${API_BASE_URL}/api/user/resume/current/download`;
  }, [data]);

  const buttonSize = compact ? "px-3 py-2 text-sm" : "px-4 py-2.5 text-sm";
  const buttonBase =
    "rounded-xl font-semibold transition inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const handlePreview = () => {
    if (disabled) return;

    if (onPreview) {
      onPreview(data);
      return;
    }

    if (!resolvedPreviewUrl) return;
    window.open(resolvedPreviewUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenInNewTab = () => {
    if (disabled) return;

    if (onOpenInNewTab) {
      onOpenInNewTab(data);
      return;
    }

    if (!resolvedPreviewUrl) return;
    window.open(resolvedPreviewUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async () => {
    if (disabled || downloading || internalDownloading) return;

    if (onDownload) {
      await onDownload(data);
      return;
    }

    try {
      setInternalDownloading(true);

      const token = getStoredToken();

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
      anchor.download =
        data?.fileName ||
        data?.versionName ||
        data?.resumeName ||
        "resume.pdf";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("ResumeToolbar download error:", error);
    } finally {
      setInternalDownloading(false);
    }
  };

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl ${className}`}
    >
      <div className={compact ? "p-4" : "p-6"}>
        <div className="flex flex-col gap-4">
          {(showTitle || showBackButton) && (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                {showBackButton && backHref && (
                  <div className="mb-3">
                    <Link
                      href={backHref}
                      className="inline-flex items-center gap-2 text-white/70 transition hover:text-white"
                    >
                      <ArrowLeft size={18} />
                      Back
                    </Link>
                  </div>
                )}

                {showTitle && (
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
                      <FileText size={20} />
                    </div>

                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold">{title}</h2>
                      <p className="text-sm text-white/55">{subtitle}</p>

                      {(data?.resumeName ||
                        data?.versionName ||
                        data?.atsScore !== undefined) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {data?.resumeName && (
                            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                              {data.resumeName}
                            </span>
                          )}

                          {data?.versionName && (
                            <span className="rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-100">
                              {data.versionName}
                            </span>
                          )}

                          {typeof data?.atsScore === "number" && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-green-400/20 bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-100">
                              <Sparkles size={12} />
                              ATS {data.atsScore}%
                            </span>
                          )}

                          {data?.versionType && (
                            <span className="rounded-full border border-purple-400/20 bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-100">
                              {data.versionType}
                            </span>
                          )}

                          {data?.versionCode && (
                            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                              {data.versionCode}
                            </span>
                          )}

                          {data?.isBaseVersion && (
                            <span className="rounded-full border border-blue-400/20 bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-100">
                              Base Version
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {showRefreshButton && (
              <button
                type="button"
                onClick={() => onRefresh?.()}
                disabled={disabled || refreshing}
                className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
              >
                {refreshing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Refresh
              </button>
            )}

            {showPreviewButton && (
              <button
                type="button"
                onClick={handlePreview}
                disabled={disabled}
                className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
              >
                <Eye size={16} />
                Preview
              </button>
            )}

            {showOpenInNewTabButton && (
              <button
                type="button"
                onClick={handleOpenInNewTab}
                disabled={disabled}
                className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
              >
                <ExternalLink size={16} />
                Open
              </button>
            )}

            {showDownloadButton && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={disabled || downloading || internalDownloading}
                className={`${buttonBase} ${buttonSize} bg-linear-to-r from-blue-500 to-purple-600 hover:opacity-95`}
              >
                {downloading || internalDownloading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Download
              </button>
            )}

            {showSaveButton && (
              <button
                type="button"
                onClick={() => onSave?.()}
                disabled={disabled || saving}
                className={`${buttonBase} ${buttonSize} bg-linear-to-r from-green-500 to-blue-600 hover:opacity-95`}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save
              </button>
            )}

            {showEditButton && (
              <Link
                href={resolvedEditHref}
                className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
              >
                <Edit3 size={16} />
                Edit
              </Link>
            )}

            {showDetailButton && (
              <Link
                href={resolvedDetailHref}
                className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
              >
                <FileText size={16} />
                Details
              </Link>
            )}

            {showDuplicateButton &&
              (onDuplicate ? (
                <button
                  type="button"
                  onClick={() => onDuplicate(data)}
                  disabled={disabled}
                  className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
                >
                  <Copy size={16} />
                  Duplicate
                </button>
              ) : (
                <Link
                  href={duplicateHref}
                  className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
                >
                  <Copy size={16} />
                  Duplicate
                </Link>
              ))}

            {showTailorButton &&
              (onTailor ? (
                <button
                  type="button"
                  onClick={() => onTailor(data)}
                  disabled={disabled}
                  className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
                >
                  <Wand2 size={16} />
                  Tailor
                </button>
              ) : (
                <Link
                  href={tailorHref}
                  className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
                >
                  <Wand2 size={16} />
                  Tailor
                </Link>
              ))}

            {showUploadButton &&
              (onUpload ? (
                <button
                  type="button"
                  onClick={onUpload}
                  disabled={disabled}
                  className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
                >
                  <Upload size={16} />
                  Upload
                </button>
              ) : (
                <Link
                  href={uploadHref}
                  className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
                >
                  <Upload size={16} />
                  Upload
                </Link>
              ))}

            {showCreateButton &&
              (onCreate ? (
                <button
                  type="button"
                  onClick={onCreate}
                  disabled={disabled}
                  className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
                >
                  <Plus size={16} />
                  Create
                </button>
              ) : (
                <Link
                  href={createHref}
                  className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
                >
                  <Plus size={16} />
                  Create
                </Link>
              ))}

            {showSectionsButton && (
              <Link
                href={generatedRoutes.sectionsHref}
                className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
              >
                <ListChecks size={16} />
                Sections
              </Link>
            )}

            {showProjectsButton && (
              <Link
                href={generatedRoutes.projectsHref}
                className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
              >
                <FolderKanban size={16} />
                Projects
              </Link>
            )}

            {showVersionsButton && (
              <Link
                href={generatedRoutes.versionsHref}
                className={`${buttonBase} ${buttonSize} bg-white/10 hover:bg-white/15`}
              >
                <FileText size={16} />
                Versions
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}