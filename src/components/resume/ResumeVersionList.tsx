"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Layers3,
  Search,
  Filter,
  Sparkles,
  GitBranch,
  Database,
} from "lucide-react";
import ResumeVersionCard, {
  ResumeVersionCardData,
} from "./ResumeVersionCard";

/**
 * src/components/resume/ResumeVersionList.tsx
 *
 * Backend-integrated Resume Version List
 *
 * Latest project-aligned features:
 * - works for both user/admin resume version flows
 * - supports direct endpoint override or auto endpoint generation
 * - resilient backend response unwrapping (data / payload / result)
 * - supports pageable and array responses
 * - supports backend-style filtering/sorting query params when enabled
 * - keeps frontend filtering as a resilient fallback
 *
 * Common backend patterns supported:
 *
 * User:
 * GET /api/user/resume/{resumeId}/versions
 *
 * Admin:
 * GET /api/admin/resume/{resumeId}/versions
 *
 * Possible backend response shapes supported:
 *
 * A) Standard wrapped array:
 * {
 *   success: true,
 *   message: "...",
 *   data: [ ... ]
 * }
 *
 * B) Wrapped pageable:
 * {
 *   success: true,
 *   message: "...",
 *   data: {
 *     content: [ ... ],
 *     totalElements: 14,
 *     totalPages: 2,
 *     number: 0,
 *     size: 10
 *   }
 * }
 *
 * C) Flexible envelopes:
 * {
 *   payload: [ ... ]
 * }
 * or
 * {
 *   result: {
 *     content: [ ... ]
 *   }
 * }
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

type ResumeVersionListArray = ResumeVersionCardData[];
type ResumeVersionListPage = {
  content?: ResumeVersionCardData[] | null;
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
};

type ResumeVersionListResponse = {
  success?: boolean;
  message?: string;
  data?: ResumeVersionListArray | ResumeVersionListPage | null;
  payload?: ResumeVersionListArray | ResumeVersionListPage | null;
  result?: ResumeVersionListArray | ResumeVersionListPage | null;
};

type ResumeVersionListProps = {
  resumeId: string | number;
  endpoint?: string;

  /**
   * Examples:
   * /user/resume
   * /admin/resume
   */
  routeBase?: string;

  /**
   * Controls auto-generated backend endpoint
   */
  source?: "user" | "admin";

  title?: string;
  subtitle?: string;
  className?: string;
  emptyMessage?: string;

  autoFetch?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  compactCards?: boolean;
  clickableCards?: boolean;
  showRawPreview?: boolean;
  showParentInfo?: boolean;
  showJobApplicationCode?: boolean;

  /**
   * Optional backend query support
   * If your backend supports these params, this can reduce payload size.
   * Frontend filtering still remains active as fallback.
   */
  useBackendQueryParams?: boolean;
  initialSearch?: string;
  initialTypeFilter?: string;
  initialBaseFilter?: string;
  initialSortBy?:
    | "UPDATED_DESC"
    | "UPDATED_ASC"
    | "ATS_DESC"
    | "ATS_ASC"
    | "NAME_ASC"
    | "NAME_DESC";

  onLoaded?: (items: ResumeVersionCardData[]) => void;
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

function unwrapEnvelope<T>(input: any): T | null {
  if (!input || typeof input !== "object") return input ?? null;
  return (input.data ?? input.payload ?? input.result ?? input) as T;
}

function parseResponseMessage(input: any): string | null {
  if (!input || typeof input !== "object") return null;

  if (typeof input.message === "string" && input.message.trim()) {
    return input.message.trim();
  }

  const nested = unwrapEnvelope<any>(input);
  if (nested && typeof nested === "object") {
    if (typeof nested.message === "string" && nested.message.trim()) {
      return nested.message.trim();
    }
  }

  return null;
}

function isPageShape(value: any): value is ResumeVersionListPage {
  return !!value && typeof value === "object" && "content" in value;
}

function extractListPayload(input: ResumeVersionListResponse | any) {
  const first = unwrapEnvelope<ResumeVersionListArray | ResumeVersionListPage>(input);
  const second = unwrapEnvelope<ResumeVersionListArray | ResumeVersionListPage>(first);

  if (Array.isArray(second)) {
    return {
      items: second,
      totalElements: second.length,
      totalPages: 1,
      pageNumber: 0,
      pageSize: second.length,
    };
  }

  if (isPageShape(second)) {
    const content = Array.isArray(second.content) ? second.content : [];
    return {
      items: content,
      totalElements:
        typeof second.totalElements === "number"
          ? second.totalElements
          : content.length,
      totalPages:
        typeof second.totalPages === "number" ? second.totalPages : 1,
      pageNumber: typeof second.number === "number" ? second.number : 0,
      pageSize: typeof second.size === "number" ? second.size : content.length,
    };
  }

  return {
    items: [] as ResumeVersionCardData[],
    totalElements: 0,
    totalPages: 0,
    pageNumber: 0,
    pageSize: 0,
  };
}

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function resolveIsBaseVersion(item: ResumeVersionCardData) {
  return Boolean(item.isBaseVersion ?? item.baseVersion ?? false);
}

function resolveJobApplicationCode(item: ResumeVersionCardData) {
  return item.jobApplicationCode ?? item.applicationCode ?? "";
}

function resolveParentVersionId(item: ResumeVersionCardData) {
  return item.parentVersionId ?? item.parentId ?? "";
}

function buildFriendlyFetchError(status: number) {
  if (status === 401) return "You are not authenticated. Please log in again.";
  if (status === 403) return "You do not have permission to view these resume versions.";
  if (status === 404) return "Resume versions were not found for this resume.";
  return `Failed to fetch resume versions. Status: ${status}`;
}

function sanitizeVersionItem(
  item: ResumeVersionCardData,
  source: "user" | "admin"
): ResumeVersionCardData {
  const resumeId = item.resumeId ?? item.id;
  const versionId = item.resumeVersionId ?? item.versionId ?? item.currentVersionId;

  const previewUrl =
    item.previewUrl ||
    (resumeId && versionId
      ? `${API_BASE_URL}/api/${source}/resume/${resumeId}/versions/${versionId}/preview`
      : undefined);

  const downloadUrl =
    item.downloadUrl ||
    item.fileUrl ||
    (resumeId && versionId
      ? `${API_BASE_URL}/api/${source}/resume/${resumeId}/versions/${versionId}/download`
      : undefined);

  return {
    ...item,
    atsScore: toSafeNumber(item.atsScore, 0),
    previewUrl,
    downloadUrl,
  };
}

function buildBackendQueryEndpoint(
  baseEndpoint: string,
  search: string,
  typeFilter: string,
  sortBy: string
) {
  const url = new URL(baseEndpoint, API_BASE_URL);

  if (search.trim()) {
    url.searchParams.set("search", search.trim());
  }

  if (typeFilter !== "ALL") {
    url.searchParams.set("versionType", typeFilter);
  }

  switch (sortBy) {
    case "ATS_DESC":
      url.searchParams.set("sortBy", "atsScore");
      url.searchParams.set("sortDir", "desc");
      break;
    case "ATS_ASC":
      url.searchParams.set("sortBy", "atsScore");
      url.searchParams.set("sortDir", "asc");
      break;
    case "NAME_ASC":
      url.searchParams.set("sortBy", "versionName");
      url.searchParams.set("sortDir", "asc");
      break;
    case "NAME_DESC":
      url.searchParams.set("sortBy", "versionName");
      url.searchParams.set("sortDir", "desc");
      break;
    case "UPDATED_ASC":
      url.searchParams.set("sortBy", "updatedAt");
      url.searchParams.set("sortDir", "asc");
      break;
    default:
      url.searchParams.set("sortBy", "updatedAt");
      url.searchParams.set("sortDir", "desc");
      break;
  }

  return url.toString();
}

export default function ResumeVersionList({
  resumeId,
  endpoint,
  routeBase = "/user/resume",
  source = "user",
  title = "Resume Versions",
  subtitle = "Browse and manage resume versions fetched from backend.",
  className = "",
  emptyMessage = "No resume versions found.",
  autoFetch = true,
  searchable = true,
  filterable = true,
  compactCards = false,
  clickableCards = false,
  showRawPreview = true,
  showParentInfo = true,
  showJobApplicationCode = true,
  useBackendQueryParams = false,
  initialSearch = "",
  initialTypeFilter = "ALL",
  initialBaseFilter = "ALL",
  initialSortBy = "UPDATED_DESC",
  onLoaded,
  onPreview,
  onDownload,
  onDuplicate,
  onTailor,
}: ResumeVersionListProps) {
  const [items, setItems] = useState<ResumeVersionCardData[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<string>(initialTypeFilter);
  const [baseFilter, setBaseFilter] = useState<string>(initialBaseFilter);
  const [sortBy, setSortBy] = useState<string>(initialSortBy);

  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(0);

  const token = getStoredToken();

  const role =
    typeof window !== "undefined"
      ? normalizeRole(localStorage.getItem("userRole"))
      : "";

  const resolvedSource: "user" | "admin" =
    source || (role === "ADMIN" || role === "ROLE_ADMIN" ? "admin" : "user");

  const commonHeaders = useMemo<HeadersInit>(
    () => ({
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const baseResolvedEndpoint = useMemo(() => {
    if (endpoint) return endpoint;

    if (resolvedSource === "admin") {
      return `${API_BASE_URL}/api/admin/resume/${resumeId}/versions`;
    }

    return `${API_BASE_URL}/api/user/resume/${resumeId}/versions`;
  }, [endpoint, resolvedSource, resumeId]);

  const resolvedEndpoint = useMemo(() => {
    if (!useBackendQueryParams) return baseResolvedEndpoint;

    return buildBackendQueryEndpoint(
      baseResolvedEndpoint,
      search,
      typeFilter,
      sortBy
    );
  }, [baseResolvedEndpoint, useBackendQueryParams, search, typeFilter, sortBy]);

  const fetchVersions = async (isRefresh = false) => {
    try {
      setErrorMessage(null);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(resolvedEndpoint, {
        method: "GET",
        headers: commonHeaders,
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(buildFriendlyFetchError(response.status));
      }

      const result: ResumeVersionListResponse = await response.json();
      const extracted = extractListPayload(result);

      const sanitizedItems = extracted.items.map((item) =>
        sanitizeVersionItem(item, resolvedSource)
      );

      setItems(sanitizedItems);
      setTotalElements(extracted.totalElements);
      setTotalPages(extracted.totalPages);
      setPageNumber(extracted.pageNumber);
      setBackendMessage(parseResponseMessage(result));
      onLoaded?.(sanitizedItems);
    } catch (error: any) {
      console.error("ResumeVersionList fetch error:", error);
      setErrorMessage(
        error?.message || "Unable to load resume versions from backend."
      );
      setItems([]);
      setTotalElements(0);
      setTotalPages(0);
      setPageNumber(0);
      setBackendMessage(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!autoFetch) return;
    fetchVersions();
  }, [autoFetch, resolvedEndpoint]);

  const versionTypes = useMemo(() => {
    const set = new Set<string>();

    items.forEach((item) => {
      if (item.versionType) {
        set.add(String(item.versionType).toUpperCase());
      }
    });

    return ["ALL", ...Array.from(set)];
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const searched = items.filter((item) => {
      const haystack = [
        item.resumeName,
        item.title,
        item.versionName,
        item.fileName,
        item.originalFileName,
        item.versionCode,
        item.resumeCode,
        item.versionType,
        resolveJobApplicationCode(item),
        resolveParentVersionId(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || haystack.includes(normalizedSearch);

      const matchesType =
        typeFilter === "ALL" ||
        String(item.versionType || "").toUpperCase() === typeFilter;

      const isBase = resolveIsBaseVersion(item);
      const matchesBase =
        baseFilter === "ALL" ||
        (baseFilter === "BASE" && isBase) ||
        (baseFilter === "NON_BASE" && !isBase);

      return matchesSearch && matchesType && matchesBase;
    });

    const sorted = [...searched].sort((a, b) => {
      const aScore = toSafeNumber(a.atsScore, 0);
      const bScore = toSafeNumber(b.atsScore, 0);

      if (sortBy === "ATS_DESC") {
        return bScore - aScore;
      }

      if (sortBy === "ATS_ASC") {
        return aScore - bScore;
      }

      if (sortBy === "NAME_ASC") {
        return String(a.versionName || a.versionCode || "").localeCompare(
          String(b.versionName || b.versionCode || "")
        );
      }

      if (sortBy === "NAME_DESC") {
        return String(b.versionName || b.versionCode || "").localeCompare(
          String(a.versionName || a.versionCode || "")
        );
      }

      const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();

      if (sortBy === "UPDATED_ASC") {
        return aDate - bDate;
      }

      return bDate - aDate;
    });

    return sorted;
  }, [items, search, typeFilter, baseFilter, sortBy]);

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl",
        className
      )}
    >
      <div className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Layers3 size={20} />
            </div>

            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-white/55">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchVersions(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/50">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <Database size={14} className="text-indigo-300" />
            Source: {resolvedSource}
          </div>

          {backendMessage && (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Sparkles size={14} className="text-emerald-300" />
              {backendMessage}
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Layers3 size={14} className="text-purple-300" />
              Page {pageNumber + 1} of {totalPages}
            </div>
          )}
        </div>

        {(searchable || filterable) && (
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto_auto_auto]">
            {searchable && (
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search versions, code, file name, job code..."
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                />
              </div>
            )}

            {filterable && (
              <>
                <div className="relative min-w-42.5">
                  <Filter
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                  >
                    {versionTypes.map((type) => (
                      <option key={type} value={type} className="bg-slate-900">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative min-w-42.5">
                  <GitBranch
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <select
                    value={baseFilter}
                    onChange={(e) => setBaseFilter(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                  >
                    <option value="ALL" className="bg-slate-900">
                      All Versions
                    </option>
                    <option value="BASE" className="bg-slate-900">
                      Base Only
                    </option>
                    <option value="NON_BASE" className="bg-slate-900">
                      Non-Base Only
                    </option>
                  </select>
                </div>

                <div className="relative min-w-42.5">
                  <Sparkles
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                  >
                    <option value="UPDATED_DESC" className="bg-slate-900">
                      Latest Updated
                    </option>
                    <option value="UPDATED_ASC" className="bg-slate-900">
                      Oldest Updated
                    </option>
                    <option value="ATS_DESC" className="bg-slate-900">
                      ATS High to Low
                    </option>
                    <option value="ATS_ASC" className="bg-slate-900">
                      ATS Low to High
                    </option>
                    <option value="NAME_ASC" className="bg-slate-900">
                      Name A to Z
                    </option>
                    <option value="NAME_DESC" className="bg-slate-900">
                      Name Z to A
                    </option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
            <Loader2 className="animate-spin text-indigo-300" size={28} />
            <p className="text-sm text-white/60">Loading resume versions...</p>
          </div>
        ) : errorMessage ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <p className="text-sm text-red-100">{errorMessage}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-10 text-center">
            <Layers3 className="mx-auto text-white/35" size={28} />
            <p className="mt-3 font-medium text-white/70">{emptyMessage}</p>
            <p className="mt-1 text-sm text-white/45">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredItems.map((item, index) => (
              <ResumeVersionCard
                key={`${item.resumeId ?? item.id ?? "resume"}-${
                  item.resumeVersionId ??
                  item.versionId ??
                  item.currentVersionId ??
                  index
                }`}
                data={item}
                routeBase={routeBase}
                backendScope={resolvedSource}
                compact={compactCards}
                clickable={clickableCards}
                showRawPreview={showRawPreview}
                showParentInfo={showParentInfo}
                showJobApplicationCode={showJobApplicationCode}
                showActions={true}
                showEditButton={true}
                showDuplicateButton={!!onDuplicate}
                showTailorButton={!!onTailor}
                showOpenArrow={false}
                onPreview={onPreview}
                onDownload={onDownload}
                onDuplicate={onDuplicate}
                onTailor={onTailor}
              />
            ))}
          </div>
        )}

        {!loading && !errorMessage && filteredItems.length > 0 && (
          <div className="mt-5 flex items-center gap-2 text-sm text-white/50">
            <Sparkles size={15} className="text-indigo-300" />
            Showing {filteredItems.length} of {items.length} loaded version(s)
            {totalElements > items.length ? ` • total backend count: ${totalElements}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}