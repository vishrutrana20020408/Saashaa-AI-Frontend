"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  FileCheck2,
  Eye,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BadgeCheck,
  CalendarDays,
  FolderOpen,
  Globe,
  Type,
  ScanSearch,
  FileCode2,
} from "lucide-react";

type GenericApiResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

type ResumeFormatData = {
  resumeId?: number;
  resumeVersionId?: number;
  versionCode?: string;
  versionName?: string;
  versionType?: string;
  fileUrl?: string;
  previewUrl?: string;
  fileName?: string;
  originalFileName?: string;
  fileType?: string;
  mimeType?: string;
  fileExtension?: string;
  fileSize?: number;
  atsScore?: number;
  isBaseVersion?: boolean;
  jobApplicationCode?: string;
  createdAt?: string;
  updatedAt?: string;
  parsedAt?: string;
  rawText?: string;
  structuredContentJson?: string;
  templateName?: string;
  formatType?: string;
  sectionCount?: number;
  pageCount?: number;
  wordCount?: number;
  hasPreview?: boolean;
  hasStructuredContent?: boolean;
  hasRawText?: boolean;
};

type ResumeFormatCardProps = {
  resumeId?: number | string;
  resumeVersionId?: number | string;
  title?: string;
  className?: string;
  showRefreshButton?: boolean;
  showPreviewButton?: boolean;
  showDownloadButton?: boolean;
  onLoaded?: (data: ResumeFormatData) => void;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function ResumeFormatCard({
  resumeId,
  resumeVersionId,
  title = "Resume Format Details",
  className = "",
  showRefreshButton = true,
  showPreviewButton = true,
  showDownloadButton = true,
  onLoaded,
}: ResumeFormatCardProps) {
  const [resumeFormat, setResumeFormat] = useState<ResumeFormatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const readString = (...values: unknown[]): string | undefined => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return undefined;
  };

  const readNumber = (...values: unknown[]): number | undefined => {
    for (const value of values) {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
        return Number(value);
      }
    }
    return undefined;
  };

  const readBoolean = (...values: unknown[]): boolean | undefined => {
    for (const value of values) {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
      }
      if (typeof value === "number") {
        if (value === 1) return true;
        if (value === 0) return false;
      }
    }
    return undefined;
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null || Number.isNaN(bytes)) {
      return "Not available";
    }

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const safeParseJson = (value?: string): Record<string, unknown> | null => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };

  const countWords = (value?: string) => {
    if (!value) return 0;
    return value.trim().split(/\s+/).filter(Boolean).length;
  };

  const countSectionsFromStructured = (structured?: Record<string, unknown> | null) => {
    if (!structured) return 0;

    const keys = Object.keys(structured).filter((key) => {
      const value = structured[key];
      if (value === null || value === undefined) return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "string") return value.trim().length > 0;
      if (typeof value === "object") return Object.keys(value as object).length > 0;
      return true;
    });

    return keys.length;
  };

  const mapPayloadToResumeFormat = useCallback((payload: GenericApiResponse | Record<string, unknown>) => {
    const root = payload as Record<string, unknown>;
    const data =
      root.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : root;

    const structuredContentJson = readString(
      data.structuredContentJson,
      data.structured_content_json,
      root.structuredContentJson,
      root.structured_content_json
    );

    const rawText = readString(
      data.rawText,
      data.raw_text,
      root.rawText,
      root.raw_text
    );

    const structured = safeParseJson(structuredContentJson);

    const mapped: ResumeFormatData = {
      resumeId: readNumber(data.resumeId, data.resume_id, root.resumeId),
      resumeVersionId: readNumber(
        data.resumeVersionId,
        data.resume_version_id,
        data.id,
        root.resumeVersionId
      ),
      versionCode: readString(data.versionCode, data.version_code),
      versionName: readString(data.versionName, data.version_name),
      versionType: readString(data.versionType, data.version_type),
      fileUrl: readString(data.fileUrl, data.file_url),
      previewUrl: readString(data.previewUrl, data.preview_url),
      fileName: readString(data.fileName, data.file_name),
      originalFileName: readString(data.originalFileName, data.original_file_name),
      fileType: readString(data.fileType, data.file_type),
      mimeType: readString(data.mimeType, data.mime_type),
      fileExtension: readString(data.fileExtension, data.file_extension),
      fileSize: readNumber(data.fileSize, data.file_size),
      atsScore: readNumber(data.atsScore, data.ats_score),
      isBaseVersion: readBoolean(data.isBaseVersion, data.is_base_version),
      jobApplicationCode: readString(data.jobApplicationCode, data.job_application_code),
      createdAt: readString(data.createdAt, data.created_at),
      updatedAt: readString(data.updatedAt, data.updated_at),
      parsedAt: readString(data.parsedAt, data.parsed_at),
      rawText,
      structuredContentJson,
      templateName: readString(data.templateName, data.template_name),
      formatType: readString(data.formatType, data.format_type, data.resumeFormat),
      sectionCount:
        readNumber(data.sectionCount, data.section_count) ??
        countSectionsFromStructured(structured),
      pageCount: readNumber(data.pageCount, data.page_count),
      wordCount: readNumber(data.wordCount, data.word_count) ?? countWords(rawText),
      hasPreview:
        readBoolean(data.hasPreview, data.has_preview) ??
        Boolean(readString(data.previewUrl, data.preview_url)),
      hasStructuredContent:
        readBoolean(data.hasStructuredContent, data.has_structured_content) ??
        Boolean(structuredContentJson),
      hasRawText:
        readBoolean(data.hasRawText, data.has_raw_text) ??
        Boolean(rawText),
    };

    if (!mapped.fileExtension) {
      const name = mapped.originalFileName || mapped.fileName;
      if (name && name.includes(".")) {
        mapped.fileExtension = name.split(".").pop()?.toLowerCase();
      }
    }

    if (!mapped.fileType) {
      mapped.fileType = mapped.fileExtension?.toUpperCase() || mapped.mimeType;
    }

    if (!mapped.formatType) {
      mapped.formatType =
        mapped.fileExtension?.toUpperCase() ||
        mapped.mimeType ||
        "Resume Document";
    }

    return mapped;
  }, []);

  const fetchResumeFormat = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");
        setSuccessMessage("");

        const versionId =
          resumeVersionId !== undefined && resumeVersionId !== null
            ? String(resumeVersionId)
            : undefined;

        const currentResumeId =
          resumeId !== undefined && resumeId !== null ? String(resumeId) : undefined;

        const endpoints: string[] = [];

        if (versionId) {
          endpoints.push(
            `${API_BASE_URL}/api/user/resume/version/${versionId}`,
            `${API_BASE_URL}/api/user/resume/versions/${versionId}`,
            `${API_BASE_URL}/api/user/resume/version/${versionId}/details`,
            `${API_BASE_URL}/api/admin/resume/version/${versionId}`,
            `${API_BASE_URL}/api/admin/resume/versions/${versionId}`,
            `${API_BASE_URL}/api/admin/resume/version/${versionId}/details`
          );
        }

        if (currentResumeId) {
          endpoints.push(
            `${API_BASE_URL}/api/user/resume/${currentResumeId}`,
            `${API_BASE_URL}/api/user/resume/${currentResumeId}/latest`,
            `${API_BASE_URL}/api/admin/resume/${currentResumeId}`,
            `${API_BASE_URL}/api/admin/resume/${currentResumeId}/latest`
          );
        }

        endpoints.push(
          `${API_BASE_URL}/api/user/resume/latest`,
          `${API_BASE_URL}/api/admin/resume/latest`
        );

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              method: "GET",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              cache: "no-store",
            });

            if (!response.ok) {
              if ([401, 403, 404].includes(response.status)) continue;
              continue;
            }

            const payload = (await response.json()) as GenericApiResponse;
            const mapped = mapPayloadToResumeFormat(payload);

            const hasUsefulData =
              mapped.resumeVersionId !== undefined ||
              mapped.resumeId !== undefined ||
              Boolean(mapped.fileUrl) ||
              Boolean(mapped.previewUrl) ||
              Boolean(mapped.structuredContentJson) ||
              Boolean(mapped.rawText);

            if (!hasUsefulData) continue;

            setResumeFormat(mapped);
            onLoaded?.(mapped);

            if (showRefresh) {
              setSuccessMessage("Resume format details refreshed successfully.");
            }
            return;
          } catch {
            continue;
          }
        }

        throw new Error("Unable to fetch resume format details from backend.");
      } catch (err) {
        console.error("Failed to load resume format details:", err);
        setResumeFormat(null);
        setError("Unable to load resume format details from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mapPayloadToResumeFormat, onLoaded, resumeId, resumeVersionId]
  );

  useEffect(() => {
    fetchResumeFormat();
  }, [fetchResumeFormat]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const previewLink = resumeFormat?.previewUrl || resumeFormat?.fileUrl;
  const downloadLink = resumeFormat?.fileUrl || resumeFormat?.previewUrl;

  const formatBadge = useMemo(() => {
    if (!resumeFormat) return "Resume";
    return (
      resumeFormat.fileExtension?.toUpperCase() ||
      resumeFormat.fileType ||
      resumeFormat.formatType ||
      "Resume"
    );
  }, [resumeFormat]);

  if (loading) {
    return (
      <section className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-5 w-32 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error && !resumeFormat) {
    return (
      <section className={`rounded-3xl border border-red-200 bg-white p-6 shadow-sm ${className}`}>
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold">Resume format load failed</h3>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => fetchResumeFormat(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-100 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 min-h-[64px] min-w-[64px] items-center justify-center rounded-3xl bg-slate-900 text-lg font-bold text-white shadow-sm">
              <FileText className="h-7 w-7" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {formatBadge}
                </span>
                {resumeFormat?.isBaseVersion && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    <FileCheck2 className="h-3.5 w-3.5" />
                    Base Version
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Backend-integrated resume file format, structure, preview, and document metadata.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {resumeFormat?.versionName && (
                  <MetaChip icon={<FileText className="h-3.5 w-3.5" />} text={resumeFormat.versionName} />
                )}
                {resumeFormat?.versionType && (
                  <MetaChip icon={<FileCode2 className="h-3.5 w-3.5" />} text={resumeFormat.versionType} />
                )}
                {resumeFormat?.templateName && (
                  <MetaChip icon={<Type className="h-3.5 w-3.5" />} text={resumeFormat.templateName} />
                )}
                {resumeFormat?.resumeVersionId !== undefined && (
                  <MetaChip
                    icon={<FolderOpen className="h-3.5 w-3.5" />}
                    text={`Version #${resumeFormat.resumeVersionId}`}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {showRefreshButton && (
              <button
                type="button"
                onClick={() => fetchResumeFormat(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            )}

            {showPreviewButton && previewLink && (
              <a
                href={previewLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <Eye className="h-4 w-4" />
                Preview
              </a>
            )}

            {showDownloadButton && downloadLink && (
              <a
                href={downloadLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TopStatCard
            icon={<FileCode2 className="h-4 w-4" />}
            label="File Type"
            value={resumeFormat?.fileType || resumeFormat?.mimeType || "Not available"}
          />
          <TopStatCard
            icon={<FolderOpen className="h-4 w-4" />}
            label="File Size"
            value={formatFileSize(resumeFormat?.fileSize)}
          />
          <TopStatCard
            icon={<ScanSearch className="h-4 w-4" />}
            label="ATS Score"
            value={
              resumeFormat?.atsScore !== undefined
                ? `${resumeFormat.atsScore}%`
                : "Not available"
            }
          />
          <TopStatCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Updated"
            value={formatDateTime(resumeFormat?.updatedAt)}
          />
        </div>

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {error && resumeFormat && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <SectionCard title="Document Details" icon={<FileText className="h-5 w-5 text-indigo-600" />}>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem label="Resume ID" value={resumeFormat?.resumeId !== undefined ? String(resumeFormat.resumeId) : undefined} />
                <InfoItem label="Resume Version ID" value={resumeFormat?.resumeVersionId !== undefined ? String(resumeFormat.resumeVersionId) : undefined} />
                <InfoItem label="Version Code" value={resumeFormat?.versionCode} />
                <InfoItem label="Version Name" value={resumeFormat?.versionName} />
                <InfoItem label="Version Type" value={resumeFormat?.versionType} />
                <InfoItem label="Template Name" value={resumeFormat?.templateName} />
                <InfoItem label="Format Type" value={resumeFormat?.formatType} />
                <InfoItem label="File Extension" value={resumeFormat?.fileExtension?.toUpperCase()} />
                <InfoItem label="MIME Type" value={resumeFormat?.mimeType} />
                <InfoItem label="Job Application Code" value={resumeFormat?.jobApplicationCode} />
              </div>
            </SectionCard>

            <SectionCard title="Structure Analysis" icon={<ScanSearch className="h-5 w-5 text-indigo-600" />}>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem
                  label="Structured Content"
                  value={resumeFormat?.hasStructuredContent ? "Available" : "Not available"}
                />
                <InfoItem
                  label="Raw Text Extracted"
                  value={resumeFormat?.hasRawText ? "Available" : "Not available"}
                />
                <InfoItem
                  label="Preview Available"
                  value={resumeFormat?.hasPreview ? "Available" : "Not available"}
                />
                <InfoItem
                  label="Section Count"
                  value={
                    resumeFormat?.sectionCount !== undefined
                      ? String(resumeFormat.sectionCount)
                      : undefined
                  }
                />
                <InfoItem
                  label="Page Count"
                  value={
                    resumeFormat?.pageCount !== undefined
                      ? String(resumeFormat.pageCount)
                      : undefined
                  }
                />
                <InfoItem
                  label="Word Count"
                  value={
                    resumeFormat?.wordCount !== undefined
                      ? String(resumeFormat.wordCount)
                      : undefined
                  }
                />
              </div>
            </SectionCard>

            <SectionCard title="Storage & Processing" icon={<Globe className="h-5 w-5 text-indigo-600" />}>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem label="Created At" value={formatDateTime(resumeFormat?.createdAt)} />
                <InfoItem label="Updated At" value={formatDateTime(resumeFormat?.updatedAt)} />
                <InfoItem label="Parsed At" value={formatDateTime(resumeFormat?.parsedAt)} />
                <InfoItem label="File URL" value={resumeFormat?.fileUrl} />
                <InfoItem label="Preview URL" value={resumeFormat?.previewUrl} />
                <InfoItem label="Original File Name" value={resumeFormat?.originalFileName || resumeFormat?.fileName} />
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Format Summary</h3>

              <div className="mt-4 space-y-3">
                <CompactInfoRow
                  label="Format"
                  value={resumeFormat?.formatType || formatBadge}
                />
                <CompactInfoRow
                  label="Base Version"
                  value={resumeFormat?.isBaseVersion ? "Yes" : "No"}
                />
                <CompactInfoRow
                  label="Has Preview"
                  value={resumeFormat?.hasPreview ? "Yes" : "No"}
                />
                <CompactInfoRow
                  label="Structured Parse"
                  value={resumeFormat?.hasStructuredContent ? "Yes" : "No"}
                />
                <CompactInfoRow
                  label="Raw Text"
                  value={resumeFormat?.hasRawText ? "Yes" : "No"}
                />
                <CompactInfoRow
                  label="File Size"
                  value={formatFileSize(resumeFormat?.fileSize)}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">Quality Flags</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <QualityChip
                  active={Boolean(resumeFormat?.hasPreview)}
                  activeText="Preview Ready"
                  inactiveText="No Preview"
                />
                <QualityChip
                  active={Boolean(resumeFormat?.hasStructuredContent)}
                  activeText="Structured Parsed"
                  inactiveText="No Structured Parse"
                />
                <QualityChip
                  active={Boolean(resumeFormat?.hasRawText)}
                  activeText="Text Extracted"
                  inactiveText="No Raw Text"
                />
                <QualityChip
                  active={Boolean(resumeFormat?.atsScore !== undefined)}
                  activeText="ATS Scored"
                  inactiveText="No ATS Score"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetaChip({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {icon}
      {text}
    </span>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TopStatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <p className="mt-2 wrap-break-word text-sm font-semibold text-slate-900">
        {value?.trim() ? value : "Not available"}
      </p>
    </div>
  );
}

function CompactInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}

function QualityChip({
  active,
  activeText,
  inactiveText,
}: {
  active: boolean;
  activeText: string;
  inactiveText: string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {active ? activeText : inactiveText}
    </span>
  );
}