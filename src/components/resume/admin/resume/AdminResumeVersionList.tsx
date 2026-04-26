"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Search,
  Filter,
  Layers3,
  CalendarDays,
  BadgeCheck,
  Download,
  Eye,
  FileText,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Star,
} from "lucide-react";

/**
 * src/components/resume/editor/AdminResumeVersionList.tsx
 *
 * Latest project-aligned admin resume version list.
 *
 * Backend integration:
 * - GET /api/admin/resume/{resumeId}
 * - GET /api/admin/resume/{resumeId}/versions
 *
 * Supported query params on versions endpoint:
 * - page
 * - size
 * - search
 * - sortBy
 * - sortDir
 * - versionType
 *
 * Supported response shapes:
 * - Spring pageable
 * - plain array
 * - wrapped in data/result/payload/content
 *
 * Notes:
 * - Uses bearer token from localStorage when present
 * - Also sends credentials: "include" for cookie/session support
 * - Merges resume.baseVersion/latestVersion/resume.versions with fetched versions
 * - Preserves backend-contract-based frontend ideology
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
  versionCode?: string | null;
  versionName?: string | null;
  versionType?: string | null;
  atsScore?: number | null;
  isBaseVersion?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  fileUrl?: string | null;
  previewUrl?: string | null;
  jobApplicationCode?: string | null;
  rawText?: string | null;
  structuredContentJson?: unknown;
  parentVersionId?: number | null;
  resumeId?: number | null;
};

type ResumeDetails = {
  resumeId?: number;
  id?: number;
  resumeCode?: string | null;
  title?: string | null;
  resumeName?: string | null;
  originalFileName?: string | null;
  fileName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  currentRole?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  latestVersion?: ResumeVersion | null;
  baseVersion?: ResumeVersion | null;
  versions?: ResumeVersion[] | null;
};

type PageResponse<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  items?: T[];
  rows?: T[];
  list?: T[];
};

type AdminResumeVersionListProps = {
  resumeId: string | number;
  apiBaseUrl?: string;
  pageSize?: number;
  detailBasePath?: string;
  previewBasePath?: string;
  showResumeHeader?: boolean;
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

function normalizePageResponse<T>(
  raw: T[] | PageResponse<T> | Record<string, unknown>,
  fallbackPage: number,
  fallbackSize: number
) {
  if (Array.isArray(raw)) {
    return {
      content: raw,
      totalElements: raw.length,
      totalPages: 1,
      number: 0,
      size: raw.length || fallbackSize,
    };
  }

  const maybePage = raw as PageResponse<T>;

  if (Array.isArray(maybePage.content)) {
    return {
      content: maybePage.content,
      totalElements: maybePage.totalElements ?? maybePage.content.length,
      totalPages: maybePage.totalPages ?? 1,
      number: maybePage.number ?? fallbackPage,
      size: maybePage.size ?? fallbackSize,
    };
  }

  const arr = maybePage.items || maybePage.rows || maybePage.list || [];

  return {
    content: arr,
    totalElements: maybePage.totalElements ?? arr.length,
    totalPages: maybePage.totalPages ?? 1,
    number: maybePage.number ?? fallbackPage,
    size: maybePage.size ?? fallbackSize,
  };
}

function safeText(value?: Nullable<string>, fallback = "—") {
  if (!value || !String(value).trim()) return fallback;
  return String(value).trim();
}

function formatDate(value?: Nullable<string>) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getResumeVersionId(version: ResumeVersion) {
  return version.resumeVersionId ?? version.id ?? null;
}

function getResumeId(resume: ResumeDetails | null) {
  return resume?.resumeId ?? resume?.id ?? null;
}

function getScoreClass(score?: number | null) {
  if (score === null || score === undefined) {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }
  if (score >= 80) return "border-green-200 bg-green-100 text-green-700";
  if (score >= 60) return "border-yellow-200 bg-yellow-100 text-yellow-700";
  return "border-red-200 bg-red-100 text-red-700";
}

function getVersionTypeClass(type?: Nullable<string>) {
  const normalized = String(type || "").toUpperCase();

  if (normalized.includes("BASE")) {
    return "bg-green-50 text-green-700 border-green-200";
  }
  if (normalized.includes("TAILOR")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (normalized.includes("JOB")) {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }
  if (normalized.includes("DUPLICATE")) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
}

function dedupeVersions(
  resume: ResumeDetails | null,
  versions: ResumeVersion[]
): ResumeVersion[] {
  const all = [
    ...(resume?.versions || []),
    ...(resume?.baseVersion ? [resume.baseVersion] : []),
    ...(resume?.latestVersion ? [resume.latestVersion] : []),
    ...versions,
  ];

  const map = new Map<string | number, ResumeVersion>();

  for (const version of all) {
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

export default function AdminResumeVersionList({
  resumeId,
  apiBaseUrl = "",
  pageSize = 10,
  detailBasePath = "/admin/resume",
  previewBasePath = "/admin/resume",
  showResumeHeader = true,
  className = "",
}: AdminResumeVersionListProps) {
  const [resume, setResume] = useState<ResumeDetails | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [size] = useState(pageSize);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [versionType, setVersionType] = useState("ALL");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("desc");

  const normalizedApiBaseUrl = useMemo(
    () => apiBaseUrl.replace(/\/$/, ""),
    [apiBaseUrl]
  );

  const detailUrl = `${normalizedApiBaseUrl}/api/admin/resume/${resumeId}`;
  const versionsBaseUrl = `${normalizedApiBaseUrl}/api/admin/resume/${resumeId}/versions`;

  const loadResume = useCallback(async () => {
    try {
      const data = await fetchJson<ResumeDetails>(detailUrl);
      setResume(data);
    } catch {
      setResume(null);
    }
  }, [detailUrl]);

  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("size", String(size));
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);

      if (search.trim()) params.set("search", search.trim());
      if (versionType !== "ALL") params.set("versionType", versionType);

      const raw = await fetchJson<
        ResumeVersion[] | PageResponse<ResumeVersion> | Record<string, unknown>
      >(`${versionsBaseUrl}?${params.toString()}`);

      const normalized = normalizePageResponse<ResumeVersion>(raw, page, size);

      setVersions(normalized.content || []);
      setTotalPages(Math.max(1, normalized.totalPages || 1));
      setTotalElements(normalized.totalElements || 0);
    } catch (err) {
      setVersions([]);
      setTotalPages(1);
      setTotalElements(0);
      setError(
        err instanceof Error ? err.message : "Failed to load resume versions."
      );
    } finally {
      setVersionsLoading(false);
    }
  }, [page, search, size, sortBy, sortDir, versionType, versionsBaseUrl]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([loadResume(), loadVersions()]);
    setLoading(false);
  }, [loadResume, loadVersions]);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  const normalizedVersions = useMemo(
    () => dedupeVersions(resume, versions),
    [resume, versions]
  );

  const latestVersionId = getResumeVersionId(resume?.latestVersion || {});
  const baseVersionId = getResumeVersionId(resume?.baseVersion || {});

  const stats = useMemo(() => {
    const total = normalizedVersions.length;
    const base = normalizedVersions.filter((v) => v.isBaseVersion).length;
    const tailored = normalizedVersions.filter((v) =>
      String(v.versionType || "").toUpperCase().includes("TAILOR")
    ).length;

    const scores = normalizedVersions
      .map((v) => v.atsScore)
      .filter((score): score is number => score !== null && score !== undefined);

    const maxScore = scores.length ? Math.max(...scores) : null;

    return { total, base, tailored, maxScore };
  }, [normalizedVersions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setVersionType("ALL");
    setSortBy("updatedAt");
    setSortDir("desc");
    setPage(0);
  };

  const hasPrevious = page > 0;
  const hasNext = page + 1 < totalPages;

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {showResumeHeader && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Resume Version List
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage all versions for a single resume from the admin panel.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                  Resume ID: {getResumeId(resume) ?? resumeId}
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

              {(resume?.fullName ||
                resume?.title ||
                resume?.resumeName ||
                resume?.originalFileName ||
                resume?.fileName) && (
                <p className="mt-3 text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">
                    {safeText(
                      resume?.fullName ||
                        resume?.title ||
                        resume?.resumeName ||
                        resume?.originalFileName ||
                        resume?.fileName
                    )}
                  </span>
                  {resume?.email ? (
                    <span className="text-gray-500"> • {resume.email}</span>
                  ) : null}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`${detailBasePath}/${resumeId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <FileText className="h-4 w-4" />
                Resume Details
              </Link>

              <button
                onClick={() => void reloadAll()}
                className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    loading || versionsLoading ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Search & Filters
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <form onSubmit={handleSearchSubmit} className="xl:col-span-5">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search version
            </label>
            <div className="flex items-center rounded-xl border border-gray-200 bg-white px-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by version name, code, job code..."
                className="w-full rounded-xl bg-transparent px-3 py-3 text-sm outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Search
              </button>
            </div>
          </form>

          <div className="xl:col-span-3">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Version Type
            </label>
            <select
              value={versionType}
              onChange={(e) => {
                setPage(0);
                setVersionType(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none"
            >
              <option value="ALL">All</option>
              <option value="BASE">BASE</option>
              <option value="TAILORED">TAILORED</option>
              <option value="JOB_TARGETED">JOB_TARGETED</option>
              <option value="CUSTOM">CUSTOM</option>
              <option value="DUPLICATE">DUPLICATE</option>
            </select>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setPage(0);
                setSortBy(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none"
            >
              <option value="updatedAt">Updated At</option>
              <option value="createdAt">Created At</option>
              <option value="versionName">Version Name</option>
              <option value="versionType">Version Type</option>
              <option value="atsScore">ATS Score</option>
            </select>
          </div>

          <div className="xl:col-span-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Order
            </label>
            <select
              value={sortDir}
              onChange={(e) => {
                setPage(0);
                setSortDir(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          <div className="flex items-end xl:col-span-1">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Layers3 className="h-5 w-5 text-gray-700" />}
          label="Total Versions"
          value={String(stats.total)}
        />
        <StatCard
          icon={<Star className="h-5 w-5 text-gray-700" />}
          label="Base Versions"
          value={String(stats.base)}
        />
        <StatCard
          icon={<GitBranch className="h-5 w-5 text-gray-700" />}
          label="Tailored Versions"
          value={String(stats.tailored)}
        />
        <StatCard
          icon={<BadgeCheck className="h-5 w-5 text-gray-700" />}
          label="Best ATS"
          value={stats.maxScore === null ? "N/A" : String(stats.maxScore)}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Resume Versions</h2>
          <p className="text-sm text-gray-600">
            Page {totalElements === 0 ? 0 : page + 1} of {totalPages}
          </p>
        </div>

        {loading || versionsLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl bg-gray-100"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-700">
                  Failed to load resume versions
                </h3>
                <p className="mt-1 text-sm text-red-600">{error}</p>
                <button
                  onClick={() => void reloadAll()}
                  className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : normalizedVersions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <Layers3 className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No versions found
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Try changing the search or version type filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {normalizedVersions.map((version) => {
              const versionId = getResumeVersionId(version);
              const isLatest =
                latestVersionId !== null &&
                String(latestVersionId) === String(versionId);
              const isBase =
                version.isBaseVersion === true ||
                (baseVersionId !== null &&
                  String(baseVersionId) === String(versionId));

              const previewUrl = version.previewUrl || version.fileUrl || null;
              const downloadUrl = version.fileUrl || version.previewUrl || null;

              return (
                <div
                  key={String(versionId ?? `${version.versionCode}-${version.createdAt}`)}
                  className="rounded-2xl border border-gray-200 p-5 transition hover:border-gray-300"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {safeText(
                                version.versionName ||
                                  version.versionCode ||
                                  `Version ${versionId ?? ""}`.trim()
                              )}
                            </h3>

                            {isBase && (
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                Base Version
                              </span>
                            )}

                            {isLatest && (
                              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                Latest
                              </span>
                            )}

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getVersionTypeClass(
                                version.versionType
                              )}`}
                            >
                              {safeText(version.versionType, "UNKNOWN")}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                              Version ID: {versionId ?? "—"}
                            </span>

                            {version.versionCode && (
                              <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                                Code: {version.versionCode}
                              </span>
                            )}

                            {version.parentVersionId !== null &&
                              version.parentVersionId !== undefined && (
                                <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-700">
                                  Parent: {version.parentVersionId}
                                </span>
                              )}
                          </div>
                        </div>

                        <div
                          className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getScoreClass(
                            version.atsScore
                          )}`}
                        >
                          ATS: {version.atsScore ?? "N/A"}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <DetailBlock
                          label="Version Name"
                          value={safeText(version.versionName)}
                        />
                        <DetailBlock
                          label="Version Type"
                          value={safeText(version.versionType)}
                        />
                        <DetailBlock
                          label="Job Application Code"
                          value={safeText(version.jobApplicationCode)}
                        />
                        <DetailBlock
                          label="Parent Version ID"
                          value={
                            version.parentVersionId === null ||
                            version.parentVersionId === undefined
                              ? "—"
                              : String(version.parentVersionId)
                          }
                        />
                        <DetailBlock
                          label="Created At"
                          value={formatDate(version.createdAt)}
                        />
                        <DetailBlock
                          label="Updated At"
                          value={formatDate(version.updatedAt)}
                        />
                        <DetailBlock
                          label="Base Version"
                          value={isBase ? "Yes" : "No"}
                        />
                        <DetailBlock
                          label="ATS Score"
                          value={
                            version.atsScore === null ||
                            version.atsScore === undefined
                              ? "N/A"
                              : String(version.atsScore)
                          }
                        />
                      </div>

                      {version.rawText && (
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Extracted Text Preview
                          </p>
                          <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                            {version.rawText}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex w-full flex-row flex-wrap gap-3 xl:w-auto xl:flex-col">
                      <Link
                        href={`${detailBasePath}/${resumeId}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        <FileText className="h-4 w-4" />
                        Resume Details
                      </Link>

                      <Link
                        href={`${previewBasePath}/${resumeId}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                      >
                        <Eye className="h-4 w-4" />
                        Open Preview
                      </Link>

                      {previewUrl && (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                        >
                          <Eye className="h-4 w-4" />
                          Direct Preview
                        </a>
                      )}

                      {downloadUrl && (
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span>
              Total records:{" "}
              <span className="font-semibold">{totalElements}</span>
            </span>
            <span>
              Last updated:{" "}
              <span className="font-semibold">{formatDate(resume?.updatedAt)}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => hasPrevious && setPage((prev) => prev - 1)}
              disabled={!hasPrevious || versionsLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <span className="text-sm font-medium text-gray-700">
              Page {totalElements === 0 ? 0 : page + 1} of {totalPages}
            </span>

            <button
              onClick={() => hasNext && setPage((prev) => prev + 1)}
              disabled={!hasNext || versionsLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gray-100 p-3">{icon}</div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 wrap-break-word text-sm font-medium text-gray-900">
        {value}
      </p>
    </div>
  );
}