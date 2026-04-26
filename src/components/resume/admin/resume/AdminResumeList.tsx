"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Eye,
  Download,
  FileText,
  Layers3,
  CalendarDays,
  BadgeCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
} from "lucide-react";

/**
 * src/components/resume/admin/AdminResumeList.tsx
 *
 * Admin resume list integrated with the latest Resume Management System backend flow.
 *
 * Preferred backend endpoint:
 * GET /api/admin/resume
 *
 * Supported query params:
 * - page
 * - size
 * - search
 * - status
 * - sortBy
 * - sortDir
 *
 * Supported response shapes:
 * 1) Spring pageable:
 *    {
 *      content: [...],
 *      totalElements: 100,
 *      totalPages: 10,
 *      number: 0,
 *      size: 10
 *    }
 *
 * 2) Wrapped pageable:
 *    {
 *      data / payload / result / content: {
 *        content: [...],
 *        totalElements,
 *        totalPages,
 *        number,
 *        size
 *      }
 *    }
 *
 * 3) Simple array:
 *    [...]
 *
 * 4) Wrapped simple array:
 *    { data / payload / result / content: [...] }
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

type ResumeVersionSummary = {
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
};

type ResumeItem = {
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
  currentRole?: string | null;
  experienceLevel?: string | null;
  summary?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
  fileUrl?: string | null;
  previewUrl?: string | null;
  latestVersion?: ResumeVersionSummary | null;
  baseVersion?: ResumeVersionSummary | null;
  versions?: ResumeVersionSummary[] | null;
  versionCount?: number | null;
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

type AdminResumeListProps = {
  apiBaseUrl?: string;
  detailsBasePath?: string;
  pageSize?: number;
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
      // ignore error body parse failure
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

function scoreBadge(score?: number | null) {
  if (score === null || score === undefined) {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }
  if (score >= 80) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 60) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function getResumeId(resume: ResumeItem) {
  return resume.resumeId ?? resume.id ?? null;
}

function getLatestVersion(resume: ResumeItem) {
  if (resume.latestVersion) return resume.latestVersion;

  if (resume.versions?.length) {
    return [...resume.versions].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    })[0];
  }

  if (resume.baseVersion) return resume.baseVersion;

  return null;
}

function getVersionCount(resume: ResumeItem) {
  if (resume.versionCount !== null && resume.versionCount !== undefined) {
    return resume.versionCount;
  }

  if (resume.versions) return resume.versions.length;

  let count = 0;
  if (resume.baseVersion) count += 1;
  if (resume.latestVersion && resume.latestVersion !== resume.baseVersion) count += 1;

  return count || 1;
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

  const fallbackArray =
    maybePage.items || maybePage.rows || maybePage.list || [];

  return {
    content: fallbackArray,
    totalElements: maybePage.totalElements ?? fallbackArray.length,
    totalPages: maybePage.totalPages ?? 1,
    number: maybePage.number ?? fallbackPage,
    size: maybePage.size ?? fallbackSize,
  };
}

export default function AdminResumeList({
  apiBaseUrl = "",
  detailsBasePath = "/admin/resume",
  pageSize = 10,
}: AdminResumeListProps) {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("desc");

  const [page, setPage] = useState(0);
  const [size] = useState(pageSize);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const normalizedApiBaseUrl = useMemo(
    () => apiBaseUrl.replace(/\/$/, ""),
    [apiBaseUrl]
  );

  const loadResumes = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("size", String(size));
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);

      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const url = `${normalizedApiBaseUrl}/api/admin/resume?${params.toString()}`;

      const raw = await fetchJson<
        ResumeItem[] | PageResponse<ResumeItem> | Record<string, unknown>
      >(url);

      const normalized = normalizePageResponse<ResumeItem>(raw, page, size);

      setResumes(normalized.content || []);
      setTotalPages(Math.max(1, normalized.totalPages || 1));
      setTotalElements(normalized.totalElements || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resumes.");
      setResumes([]);
      setTotalPages(1);
      setTotalElements(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [normalizedApiBaseUrl, page, search, size, sortBy, sortDir, statusFilter]);

  useEffect(() => {
    void loadResumes();
  }, [loadResumes]);

  const filteredResumes = useMemo(() => {
    if (!Array.isArray(resumes)) return [];
    return resumes;
  }, [resumes]);

  const hasPrevious = page > 0;
  const hasNext = page + 1 < totalPages;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput);
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("ALL");
    setSortBy("updatedAt");
    setSortDir("desc");
    setPage(0);
  };

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Resume List</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage uploaded resumes, inspect version history, review ATS scores,
              and open detailed admin resume views aligned with the latest backend flow.
            </p>
          </div>

          <button
            onClick={() => void loadResumes(true)}
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
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Search & Filters</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <form onSubmit={handleSearchSubmit} className="xl:col-span-5">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search resume
            </label>
            <div className="flex items-center rounded-xl border border-gray-200 bg-white px-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, role, title, file name..."
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

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(0);
                setStatusFilter(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PROCESSED">PROCESSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
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
              <option value="fullName">Full Name</option>
              <option value="email">Email</option>
              <option value="title">Title</option>
              <option value="resumeName">Resume Name</option>
            </select>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Sort Direction
            </label>
            <select
              value={sortDir}
              onChange={(e) => {
                setPage(0);
                setSortDir(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-100 p-3">
              <FileText className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Total Resumes
              </p>
              <p className="text-lg font-bold text-gray-900">{totalElements}</p>
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
                Current Page
              </p>
              <p className="text-lg font-bold text-gray-900">
                {totalElements === 0 ? 0 : page + 1} / {totalPages}
              </p>
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
                Showing
              </p>
              <p className="text-lg font-bold text-gray-900">
                {filteredResumes.length} records
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl bg-gray-100"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-700">
                  Failed to load resumes
                </h3>
                <p className="mt-1 text-sm text-red-600">{error}</p>
                <button
                  onClick={() => void loadResumes(true)}
                  className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : filteredResumes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <FileText className="mx-auto h-10 w-10 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No resumes found
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Try changing the search term or filter options.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResumes.map((resume, index) => {
              const resumeEntityId = getResumeId(resume);
              const latestVersion = getLatestVersion(resume);
              const previewUrl =
                latestVersion?.previewUrl ||
                resume.previewUrl ||
                latestVersion?.fileUrl ||
                resume.fileUrl;

              const downloadUrl =
                latestVersion?.fileUrl ||
                resume.fileUrl ||
                latestVersion?.previewUrl ||
                resume.previewUrl;

              return (
                <div
                  key={String(resumeEntityId ?? `${resume.resumeCode || "resume"}-${index}`)}
                  className="rounded-2xl border border-gray-200 p-5 transition hover:border-gray-300"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {safeText(
                              resume.fullName ||
                                resume.resumeName ||
                                resume.title ||
                                resume.originalFileName ||
                                resume.fileName ||
                                "Resume"
                            )}
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                            <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                              Resume ID: {resumeEntityId ?? "—"}
                            </span>

                            {resume.resumeCode && (
                              <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
                                Code: {resume.resumeCode}
                              </span>
                            )}

                            {resume.status && (
                              <span className="rounded-full bg-purple-50 px-3 py-1 font-medium text-purple-700">
                                Status: {resume.status}
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${scoreBadge(
                            latestVersion?.atsScore
                          )}`}
                        >
                          ATS: {latestVersion?.atsScore ?? "N/A"}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <DetailBlock label="Email" value={safeText(resume.email)} />
                        <DetailBlock label="Phone" value={safeText(resume.phone)} />
                        <DetailBlock label="Location" value={safeText(resume.location)} />
                        <DetailBlock
                          label="Current Role"
                          value={safeText(resume.currentRole)}
                        />
                        <DetailBlock
                          label="Experience Level"
                          value={safeText(resume.experienceLevel)}
                        />
                        <DetailBlock
                          label="Version Count"
                          value={String(getVersionCount(resume))}
                        />
                        <DetailBlock
                          label="Latest Version"
                          value={safeText(
                            latestVersion?.versionName ||
                              latestVersion?.versionCode
                          )}
                        />
                        <DetailBlock
                          label="Version Type"
                          value={safeText(latestVersion?.versionType)}
                        />
                        <DetailBlock
                          label="Updated At"
                          value={formatDate(
                            latestVersion?.updatedAt ||
                              resume.updatedAt ||
                              latestVersion?.createdAt ||
                              resume.createdAt
                          )}
                        />
                      </div>

                      {resume.summary && (
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Summary
                          </p>
                          <p className="line-clamp-3 text-sm leading-6 text-gray-700">
                            {resume.summary}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex w-full flex-row flex-wrap gap-3 xl:w-auto xl:flex-col">
                      {resumeEntityId !== null && (
                        <Link
                          href={`${detailsBasePath}/${resumeEntityId}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Link>
                      )}

                      {previewUrl && (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
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
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
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
          <p className="text-sm text-gray-600">
            Total records: <span className="font-semibold">{totalElements}</span>
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => hasPrevious && setPage((prev) => prev - 1)}
              disabled={!hasPrevious || loading}
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
              disabled={!hasNext || loading}
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
