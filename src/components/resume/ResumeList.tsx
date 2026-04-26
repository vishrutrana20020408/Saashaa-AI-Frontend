"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  Search,
  Filter,
  Layers3,
  Sparkles,
} from "lucide-react";
import ResumeCard, { ResumeCardData } from "./ResumeCard";

/**
 * src/components/resume/ResumeList.tsx
 *
 * Backend Integrated Resume List
 *
 * Purpose:
 * - Fetch and display resumes or resume versions from backend
 * - Reuse ResumeCard for each item
 * - Support search, filtering, refresh
 * - Work for user/admin resume pages
 *
 * Latest project alignment:
 * - backend-first resume/version listing flow
 * - supports user/admin endpoint fallback
 * - supports ApiResponse wrappers (data / payload / result)
 * - supports array and pageable response shapes
 * - credentials: "include"
 * - bearer token fallback
 * - consistent with resume editor / preview / tailoring flows
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type GenericObject = Record<string, unknown>;

type ResumeListProps = {
  source?: "user-resumes" | "resume-versions" | "admin-resumes";
  resumeId?: string | number;
  endpoint?: string;
  cardType?: "resume" | "version";
  routeBase?: string;
  title?: string;
  subtitle?: string;
  autoFetch?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  compactCards?: boolean;
  className?: string;
  emptyMessage?: string;
  onDuplicate?: (data: ResumeCardData) => void;
  onTailor?: (data: ResumeCardData) => void;
  onPreview?: (data: ResumeCardData) => void;
  onDownload?: (data: ResumeCardData) => Promise<void> | void;
  onLoaded?: (items: ResumeCardData[]) => void;
};

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
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

function unwrapPayload<T = unknown>(input: unknown): T | null {
  if (!input || typeof input !== "object") return null;

  const obj = input as ApiEnvelope<T> & GenericObject;

  if (obj.data !== undefined && obj.data !== null) return obj.data as T;
  if (obj.payload !== undefined && obj.payload !== null) return obj.payload as T;
  if (obj.result !== undefined && obj.result !== null) return obj.result as T;

  return input as T;
}

function normalizeResumeItem(input: unknown): ResumeCardData | null {
  if (!input || typeof input !== "object") return null;

  const source = input as GenericObject;

  const normalized: ResumeCardData = {
    resumeId: readNumber(source.resumeId, source.resume_id, source.id),
    resumeVersionId: readNumber(
      source.resumeVersionId,
      source.resume_version_id,
      source.versionId,
      source.version_id
    ),
    versionId: readNumber(
      source.versionId,
      source.version_id,
      source.resumeVersionId,
      source.resume_version_id
    ),
    resumeName: readString(source.resumeName, source.resume_name, source.name, source.title),
    versionName: readString(source.versionName, source.version_name),
    fileName: readString(
      source.fileName,
      source.file_name,
      source.originalFileName,
      source.original_file_name
    ),
    atsScore: readNumber(source.atsScore, source.ats_score, source.score),
    versionCode: readString(source.versionCode, source.version_code),
    versionType: readString(source.versionType, source.version_type),
    isBaseVersion: normalizeBoolean(source.isBaseVersion ?? source.is_base_version),
    updatedAt: readString(source.updatedAt, source.updated_at),
    createdAt: readString(source.createdAt, source.created_at),
    previewUrl: readString(source.previewUrl, source.preview_url, source.fileUrl, source.file_url),
    downloadUrl: readString(source.downloadUrl, source.download_url),
    rawText: readString(source.rawText, source.raw_text),
  };

  const hasUsefulData =
    normalized.resumeId !== undefined ||
    normalized.resumeVersionId !== undefined ||
    normalized.versionId !== undefined ||
    Boolean(normalized.resumeName) ||
    Boolean(normalized.versionName) ||
    Boolean(normalized.fileName);

  return hasUsefulData ? normalized : null;
}

function extractResumeList(input: unknown): ResumeCardData[] {
  if (Array.isArray(input)) {
    return input
      .map(normalizeResumeItem)
      .filter((item): item is ResumeCardData => Boolean(item));
  }

  if (!input || typeof input !== "object") return [];

  const payload = unwrapPayload<unknown>(input);

  if (Array.isArray(payload)) {
    return payload
      .map(normalizeResumeItem)
      .filter((item): item is ResumeCardData => Boolean(item));
  }

  if (!payload || typeof payload !== "object") return [];

  const source = payload as GenericObject;

  const possibleArrays: unknown[] = [
    source.content,
    source.items,
    source.list,
    source.resumes,
    source.resumeList,
    source.resume_list,
    source.versions,
    source.versionList,
    source.version_list,
  ];

  for (const candidate of possibleArrays) {
    if (Array.isArray(candidate)) {
      return candidate
        .map(normalizeResumeItem)
        .filter((item): item is ResumeCardData => Boolean(item));
    }
  }

  return [];
}

function buildEndpointCandidates(params: {
  source: "user-resumes" | "resume-versions" | "admin-resumes";
  endpoint?: string;
  resumeId?: string | number;
}) {
  if (params.endpoint) {
    return [params.endpoint];
  }

  const rid =
    params.resumeId !== undefined && params.resumeId !== null
      ? String(params.resumeId)
      : undefined;

  if (params.source === "resume-versions" && rid) {
    return [
      `${API_BASE_URL}/api/user/resume/${rid}/versions`,
      `${API_BASE_URL}/api/user/resume/${rid}/version/list`,
      `${API_BASE_URL}/api/user/resume/${rid}/version`,
      `${API_BASE_URL}/api/admin/resume/${rid}/versions`,
      `${API_BASE_URL}/api/admin/resume/${rid}/version/list`,
      `${API_BASE_URL}/api/admin/resume/${rid}/version`,
    ];
  }

  if (params.source === "admin-resumes") {
    return [
      `${API_BASE_URL}/api/admin/resume/list`,
      `${API_BASE_URL}/api/admin/resume`,
    ];
  }

  return [
    `${API_BASE_URL}/api/user/resume/list`,
    `${API_BASE_URL}/api/user/resume`,
    `${API_BASE_URL}/api/user/resume/all`,
  ];
}

export default function ResumeList({
  source = "user-resumes",
  resumeId,
  endpoint,
  cardType = "resume",
  routeBase = "/user/resume",
  title = "Resume List",
  subtitle = "Browse and manage resumes fetched from backend.",
  autoFetch = true,
  searchable = true,
  filterable = true,
  compactCards = false,
  className = "",
  emptyMessage = "No resumes found.",
  onDuplicate,
  onTailor,
  onPreview,
  onDownload,
  onLoaded,
}: ResumeListProps) {
  const [items, setItems] = useState<ResumeCardData[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const authHeaders = useMemo<HeadersInit>(() => {
    const token = getStoredToken();

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const endpointCandidates = useMemo(
    () => buildEndpointCandidates({ source, endpoint, resumeId }),
    [source, endpoint, resumeId]
  );

  const fetchResumes = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let resolvedList: ResumeCardData[] = [];

        for (const candidate of endpointCandidates) {
          try {
            const response = await fetch(candidate, {
              method: "GET",
              headers: authHeaders,
              credentials: "include",
              cache: "no-store",
            });

            if (!response.ok) {
              if ([401, 403, 404].includes(response.status)) continue;
              continue;
            }

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) continue;

            const result = await response.json();
            const extracted = extractResumeList(result);

            if (Array.isArray(extracted)) {
              resolvedList = extracted;
              break;
            }
          } catch {
            continue;
          }
        }

        setItems(resolvedList);
        onLoaded?.(resolvedList);
      } catch (error) {
        console.error("ResumeList fetch error:", error);
        setErrorMessage("Unable to load resume list from backend.");
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders, endpointCandidates, onLoaded]
  );

  useEffect(() => {
    if (!autoFetch) return;
    fetchResumes();
  }, [autoFetch, fetchResumes]);

  const versionTypes = useMemo(() => {
    const set = new Set<string>();

    items.forEach((item) => {
      const value = String(item.versionType || "").trim().toUpperCase();
      if (value) set.add(value);
    });

    return ["ALL", ...Array.from(set)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const haystack = [
        item.resumeName,
        item.versionName,
        item.fileName,
        item.versionCode,
        item.versionType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(search.toLowerCase());

      const matchesType =
        typeFilter === "ALL" ||
        String(item.versionType || "").toUpperCase() === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [items, search, typeFilter]);

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl ${className}`}
    >
      <div className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              {cardType === "version" ? <Layers3 size={20} /> : <FileText size={20} />}
            </div>

            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-white/55">{subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchResumes(true)}
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

        {(searchable || filterable) && (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
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
                  placeholder="Search resumes, versions, file names..."
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                />
              </div>
            )}

            {filterable && (
              <div className="relative min-w-45">
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
            )}
          </div>
        )}

        {loading ? (
          <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
            <Loader2 className="animate-spin text-indigo-300" size={28} />
            <p className="text-sm text-white/60">Loading resume list...</p>
          </div>
        ) : errorMessage ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <p className="text-sm text-red-100">{errorMessage}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-10 text-center">
            <FileText className="mx-auto text-white/35" size={28} />
            <p className="mt-3 font-medium text-white/70">{emptyMessage}</p>
            <p className="mt-1 text-sm text-white/45">
              Try changing your search or filter.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredItems.map((item, index) => (
              <ResumeCard
                key={`${item.resumeId}-${item.resumeVersionId || item.versionId || index}`}
                data={item}
                type={cardType}
                routeBase={routeBase}
                compact={compactCards}
                showViewButton={true}
                showEditButton={true}
                showPreviewButton={true}
                showDownloadButton={true}
                showDuplicateButton={!!onDuplicate}
                showTailorButton={!!onTailor}
                showOpenArrow={false}
                onDuplicate={onDuplicate}
                onTailor={onTailor}
                onPreview={onPreview}
                onDownload={onDownload}
              />
            ))}
          </div>
        )}

        {!loading && !errorMessage && filteredItems.length > 0 && (
          <div className="mt-5 flex items-center gap-2 text-sm text-white/50">
            <Sparkles size={15} className="text-indigo-300" />
            Showing {filteredItems.length} of {items.length} item(s)
          </div>
        )}
      </div>
    </div>
  );
}