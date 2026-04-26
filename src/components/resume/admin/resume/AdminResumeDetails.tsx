"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Briefcase,
  CalendarDays,
  User,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  Layers3,
  Download,
  Eye,
  BadgeCheck,
  AlertCircle,
  FileStack,
  Loader2,
} from "lucide-react";

/**
 * src/components/resume/admin/AdminResumeDetails.tsx
 *
 * Latest project-aligned Admin Resume Details component
 *
 * Backend integration goals:
 * - Admin can inspect a single resume and all versions
 * - Supports backend response wrappers: data / payload / result / content
 * - Supports bearer token + cookie-based auth
 * - Works with current Resume Management System ideology
 *
 * Preferred backend endpoints:
 * - GET /api/admin/resume/{resumeId}
 * - GET /api/admin/resume/{resumeId}/versions
 *
 * Optional fallback response shapes are handled automatically.
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

type AdminResumeDetailsProps = {
  resumeId: number | string;
  backHref?: string;
  apiBaseUrl?: string;
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

function safeText(value?: Nullable<string>, fallback = "—") {
  if (!value || !String(value).trim()) return fallback;
  return String(value).trim();
}

function scoreBadge(score?: number | null) {
  if (score === null || score === undefined) {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }
  if (score >= 80) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 60) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function getResumeId(resume: ResumeDetails | null) {
  return resume?.resumeId ?? resume?.id ?? null;
}

function getVersionId(version: ResumeVersion) {
  return version.resumeVersionId ?? version.id ?? "unknown";
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

  const map = new Map<string | number, ResumeVersion>();

  for (const version of merged) {
    const key =
      version.resumeVersionId ??
      version.id ??
      version.versionCode ??
      `${version.versionName || "version"}-${version.createdAt || ""}`;

    if (!map.has(key)) {
      map.set(key, version);
    }
  }

  return [...map.values()].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function extractVersions(data: ResumeVersionCollection): ResumeVersion[] {
  if (Array.isArray(data)) return data;
  return data?.items || data?.versions || data?.data || data?.content || [];
}

export default function AdminResumeDetails({
  resumeId,
  backHref = "/admin/resume",
  apiBaseUrl = "",
}: AdminResumeDetailsProps) {
  const [resume, setResume] = useState<ResumeDetails | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedBaseUrl = useMemo(
    () => apiBaseUrl.replace(/\/$/, ""),
    [apiBaseUrl]
  );

  const detailUrl = `${normalizedBaseUrl}/api/admin/resume/${resumeId}`;
  const versionsUrl = `${normalizedBaseUrl}/api/admin/resume/${resumeId}/versions`;

  const loadResume = useCallback(async () => {
    try {
      const data = await fetchJson<ResumeDetails>(detailUrl);
      setResume(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load resume details."
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

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    setVersionsLoading(true);
    await Promise.all([loadResume(), loadVersions()]);
    setRefreshing(false);
  }, [loadResume, loadVersions]);

  useEffect(() => {
    void Promise.all([loadResume(), loadVersions()]);
  }, [loadResume, loadVersions]);

  const normalizedVersions = useMemo(
    () => normalizeVersions(resume, versions),
    [resume, versions]
  );

  const latestVersion = useMemo(
    () => getLatestAvailableVersion(resume, normalizedVersions),
    [resume, normalizedVersions]
  );

  const displayResumeId = getResumeId(resume);

  const previewUrl =
    latestVersion?.previewUrl ||
    resume?.previewUrl ||
    latestVersion?.fileUrl ||
    resume?.fileUrl;

  const downloadUrl =
    latestVersion?.fileUrl ||
    resume?.fileUrl ||
    latestVersion?.previewUrl ||
    resume?.previewUrl;

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-gray-700">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading resume details...</span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-44 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-44 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-44 animate-pulse rounded-2xl bg-gray-100" />
        </div>

        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-red-700">
              Failed to load resume details
            </h2>
            <p className="mt-1 text-sm text-red-600">{error}</p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => void refreshAll()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Retry
              </button>

              <Link
                href={backHref}
                className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
              >
                Back to resume list
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-black"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to resume list
            </Link>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {safeText(
                  resume?.title ||
                    resume?.originalFileName ||
                    resume?.fileName ||
                    latestVersion?.versionName ||
                    "Resume Details"
                )}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                  Resume ID: {displayResumeId ?? resumeId}
                </span>

                {resume?.resumeCode && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                    Code: {resume.resumeCode}
                  </span>
                )}

                {resume?.status && (
                  <span className="rounded-full bg-purple-50 px-3 py-1 font-medium text-purple-700">
                    Status: {resume.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void refreshAll()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
              >
                <Eye className="h-4 w-4" />
                Preview
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-3">
              <FileText className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Current Version
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {safeText(
                  latestVersion?.versionName || latestVersion?.versionCode || "N/A"
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-3">
              <Layers3 className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Total Versions
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {normalizedVersions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-3">
              <BadgeCheck className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                ATS Score
              </p>
              <div
                className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${scoreBadge(
                  latestVersion?.atsScore
                )}`}
              >
                {latestVersion?.atsScore ?? "N/A"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-3">
              <CalendarDays className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Updated
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(
                  latestVersion?.updatedAt ||
                    resume?.updatedAt ||
                    latestVersion?.createdAt ||
                    resume?.createdAt
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Candidate Information
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoItem
                icon={<User className="h-4 w-4" />}
                label="Full Name"
                value={safeText(resume?.fullName)}
              />
              <InfoItem
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={safeText(resume?.email)}
              />
              <InfoItem
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={safeText(resume?.phone)}
              />
              <InfoItem
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={safeText(resume?.location)}
              />
              <InfoItem
                icon={<Briefcase className="h-4 w-4" />}
                label="Current Role"
                value={safeText(resume?.currentRole)}
              />
              <InfoItem
                icon={<FileStack className="h-4 w-4" />}
                label="Experience Level"
                value={safeText(resume?.experienceLevel)}
              />
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Professional Summary
              </h3>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                {safeText(resume?.summary, "No summary available.")}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Resume Versions
              </h2>
              {versionsLoading && (
                <span className="text-sm text-gray-500">Loading versions...</span>
              )}
            </div>

            {normalizedVersions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                No resume versions found.
              </div>
            ) : (
              <div className="space-y-4">
                {normalizedVersions.map((version) => {
                  const versionKey = getVersionId(version);

                  return (
                    <div
                      key={String(versionKey)}
                      className="rounded-2xl border border-gray-200 p-4 transition hover:border-gray-300"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-gray-900">
                              {safeText(
                                version.versionName ||
                                  version.versionCode ||
                                  `Version ${versionKey}`
                              )}
                            </h3>

                            {version.isBaseVersion && (
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                Base Version
                              </span>
                            )}

                            {latestVersion &&
                              getVersionId(latestVersion) === versionKey && (
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                  Latest
                                </span>
                              )}

                            {version.versionType && (
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                {version.versionType}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2">
                            <p>
                              <span className="font-medium text-gray-800">
                                Version ID:
                              </span>{" "}
                              {versionKey}
                            </p>
                            <p>
                              <span className="font-medium text-gray-800">
                                ATS Score:
                              </span>{" "}
                              {version.atsScore ?? "N/A"}
                            </p>
                            <p>
                              <span className="font-medium text-gray-800">
                                Created:
                              </span>{" "}
                              {formatDate(version.createdAt)}
                            </p>
                            <p>
                              <span className="font-medium text-gray-800">
                                Updated:
                              </span>{" "}
                              {formatDate(version.updatedAt)}
                            </p>
                            <p>
                              <span className="font-medium text-gray-800">
                                Job Code:
                              </span>{" "}
                              {safeText(version.jobApplicationCode)}
                            </p>
                            <p>
                              <span className="font-medium text-gray-800">
                                Version Code:
                              </span>{" "}
                              {safeText(version.versionCode)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {version.previewUrl && (
                            <a
                              href={version.previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                            >
                              <Eye className="h-4 w-4" />
                              Preview
                            </a>
                          )}

                          {version.fileUrl && (
                            <a
                              href={version.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                          )}
                        </div>
                      </div>

                      {version.rawText && (
                        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Extracted Text Preview
                          </p>
                          <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                            {version.rawText}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Resume Metadata
            </h2>

            <div className="space-y-3 text-sm text-gray-700">
              <MetaRow label="Resume ID" value={String(displayResumeId ?? resumeId)} />
              <MetaRow label="Resume Code" value={safeText(resume?.resumeCode)} />
              <MetaRow
                label="Original File"
                value={safeText(resume?.originalFileName || resume?.fileName)}
              />
              <MetaRow label="Created At" value={formatDate(resume?.createdAt)} />
              <MetaRow label="Updated At" value={formatDate(resume?.updatedAt)} />
              <MetaRow label="Status" value={safeText(resume?.status)} />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Latest Version Snapshot
            </h2>

            {!latestVersion ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                No version snapshot available.
              </div>
            ) : (
              <div className="space-y-3 text-sm text-gray-700">
                <MetaRow
                  label="Version Name"
                  value={safeText(latestVersion.versionName)}
                />
                <MetaRow
                  label="Version Code"
                  value={safeText(latestVersion.versionCode)}
                />
                <MetaRow
                  label="Version Type"
                  value={safeText(latestVersion.versionType)}
                />
                <MetaRow
                  label="ATS Score"
                  value={
                    latestVersion.atsScore === null ||
                    latestVersion.atsScore === undefined
                      ? "N/A"
                      : String(latestVersion.atsScore)
                  }
                />
                <MetaRow
                  label="Base Version"
                  value={latestVersion.isBaseVersion ? "Yes" : "No"}
                />
                <MetaRow
                  label="Updated"
                  value={formatDate(
                    latestVersion.updatedAt || latestVersion.createdAt
                  )}
                />
              </div>
            )}
          </div>

          {previewUrl && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Quick Actions
              </h2>

              <div className="space-y-3">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  <Eye className="h-4 w-4" />
                  Open Resume Preview
                </a>

                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    <Download className="h-4 w-4" />
                    Download Resume File
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2 last:border-b-0">
      <span className="font-medium text-gray-500">{label}</span>
      <span className="text-right text-gray-900">{value}</span>
    </div>
  );
}