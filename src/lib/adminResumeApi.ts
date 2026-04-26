// src/lib/adminResumeApi.ts
//
// Central admin resume API client for frontend ↔ backend integration.
//
// Purpose:
// - Single source of truth for all admin resume API calls
// - Reusable by:
//   - AdminResumeList
//   - AdminResumeDetails
//   - AdminResumePreview
//   - AdminResumeVersionList
//   - AdminResumeUserFilter
//   - future admin resume dashboard pages
//
// Architecture alignment:
// - Works with Spring Boot backend
// - Supports cookie/session auth via credentials: "include"
// - Keeps bearer token fallback for older frontend auth flow
// - Supports wrapped response styles and pageable payloads
// - Supports endpoint fallback patterns for better backend compatibility
//
// Recommended backend endpoints:
//   GET    /api/admin/resume
//   GET    /api/admin/resume/{resumeId}
//   GET    /api/admin/resume/{resumeId}/versions
//   GET    /api/admin/users
//   GET    /api/admin/resume/{resumeId}/download
//   GET    /api/admin/resume/{resumeId}/preview
//   POST   /api/admin/resume/{resumeId}/status
//   DELETE /api/admin/resume/{resumeId}
//
// Supported response styles:
// - plain object / plain array
// - Spring pageable
// - wrapped { data | result | payload | content }
// - nested wrapped payloads
//
// This file is client-safe and can also be used in server code if token/cookies
// are passed explicitly through request options.

export const ADMIN_RESUME_API_PATHS = {
  RESUMES: "/api/admin/resume",
  USERS: "/api/admin/users",
  HOME: "/api/admin/home",
} as const;

/* =========================================================
   TYPES
========================================================= */

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  details?: unknown;
  status?: number;
  timestamp?: string;
  path?: string;
  data?: T | null;
  result?: T | null;
  payload?: T | null;
  content?: T | null;
};

export type PageableResponse<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
  items?: T[];
  rows?: T[];
  list?: T[];
};

export type ApiListResponse<T> = {
  items: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

export type SortDirection = "asc" | "desc";

export type ResumeVersionType =
  | "BASE"
  | "TAILORED"
  | "DUPLICATE"
  | "JOB_TARGETED"
  | "CUSTOM"
  | string;

export type ResumeStatus =
  | "ACTIVE"
  | "DRAFT"
  | "PROCESSED"
  | "ARCHIVED"
  | string;

export type AdminUserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "ENABLED"
  | "DISABLED"
  | "UNKNOWN"
  | string;

export type ResumeVersion = {
  resumeVersionId?: number;
  id?: number;
  versionCode?: string | null;
  versionName?: string | null;
  versionType?: ResumeVersionType | null;
  atsScore?: number | null;
  isBaseVersion?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  fileUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  jobApplicationCode?: string | null;
  rawText?: string | null;
  structuredContentJson?: unknown;
  parentVersionId?: number | null;
  resumeId?: number | null;
  status?: ResumeStatus | null;
};

export type ResumeItem = {
  resumeId?: number;
  id?: number;
  resumeCode?: string | null;
  userId?: number | null;
  candidateId?: number | null;
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
  status?: ResumeStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  fileUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  latestVersion?: ResumeVersion | null;
  baseVersion?: ResumeVersion | null;
  versions?: ResumeVersion[];
  versionCount?: number | null;
};

export type ResumeDetails = ResumeItem & {
  structuredContentJson?: unknown;
  rawText?: string | null;
};

export type AdminUser = {
  userId?: number;
  id?: number;
  adminUserId?: number;
  candidateId?: number;
  userCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  location?: string | null;
  city?: string | null;
  currentRole?: string | null;
  designation?: string | null;
  totalResumes?: number | null;
  active?: boolean | null;
  enabled?: boolean | null;
  status?: AdminUserStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ListQueryParams = {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
  status?: string;
};

export type ResumeListQueryParams = ListQueryParams & {
  userId?: number | string;
  candidateId?: number | string;
};

export type ResumeVersionListQueryParams = ListQueryParams & {
  versionType?: string;
};

export type AdminUserListQueryParams = ListQueryParams;

export type UpdateResumeStatusPayload = {
  status: ResumeStatus;
};

export type AdminResumeApiRequestOptions = {
  token?: string | null;
  apiBaseUrl?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  withCredentials?: RequestCredentials;
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function getApiBaseUrl(apiBaseUrl?: string): string {
  if (typeof apiBaseUrl === "string" && apiBaseUrl.trim()) {
    return apiBaseUrl.replace(/\/+$/, "");
  }

  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, "") ||
    "http://localhost:8080"
  );
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token") ||
    null
  );
}

function unwrapResponse<T>(value: unknown): T {
  if (value && typeof value === "object") {
    const level1 = value as ApiEnvelope<T>;
    const first =
      level1.data ?? level1.result ?? level1.payload ?? level1.content ?? value;

    if (first && typeof first === "object") {
      const level2 = first as ApiEnvelope<T>;
      return (level2.data ??
        level2.result ??
        level2.payload ??
        level2.content ??
        first) as T;
    }

    return first as T;
  }

  return value as T;
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeNullableNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

function safeParseJson(value: unknown): unknown {
  if (typeof value === "string" && value.trim()) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    return (
      safeString(record.message) ||
      safeString(record.error) ||
      safeString(record.details) ||
      `Request failed with status ${status}`
    );
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return `Request failed with status ${status}`;
}

function buildUrl(
  path: string,
  params?: Record<string, unknown>,
  apiBaseUrl?: string
): string {
  const base = getApiBaseUrl(apiBaseUrl);
  const url = new URL(
    `${base}${path}`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost"
  );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        !(typeof value === "string" && value.trim() === "")
      ) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return `${base}${path}${url.search}`;
}

function normalizePageableList<T>(
  raw: T[] | PageableResponse<T> | Record<string, unknown>,
  fallbackPage = 0,
  fallbackSize = 10
): ApiListResponse<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw,
      totalElements: raw.length,
      totalPages: 1,
      page: 0,
      size: raw.length || fallbackSize,
    };
  }

  const maybePage = raw as PageableResponse<T>;
  const fallbackArray = maybePage.content || maybePage.items || maybePage.rows || maybePage.list || [];

  return {
    items: fallbackArray,
    totalElements: safeNumber(maybePage.totalElements, fallbackArray.length),
    totalPages: Math.max(1, safeNumber(maybePage.totalPages, fallbackArray.length > 0 ? 1 : 0)),
    page: safeNumber(maybePage.number, fallbackPage),
    size: safeNumber(maybePage.size, fallbackSize),
  };
}

function extractApiMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const top = payload as ApiEnvelope<unknown>;
  if (typeof top.message === "string" && top.message.trim()) {
    return top.message.trim();
  }

  const nested = unwrapResponse<any>(payload);
  if (nested && typeof nested === "object" && typeof nested.message === "string") {
    return nested.message.trim();
  }

  return null;
}

function getResumeId(resume: Partial<ResumeItem> | null | undefined): number | null {
  if (!resume) return null;
  return safeNullableNumber(resume.resumeId ?? resume.id);
}

function getResumeVersionId(
  version: Partial<ResumeVersion> | null | undefined
): number | null {
  if (!version) return null;
  return safeNullableNumber(version.resumeVersionId ?? version.id);
}

function getUserId(user: Partial<AdminUser> | null | undefined): number | null {
  if (!user) return null;
  return (
    safeNullableNumber(user.userId) ??
    safeNullableNumber(user.id) ??
    safeNullableNumber(user.adminUserId) ??
    safeNullableNumber(user.candidateId)
  );
}

/* =========================================================
   HTTP CORE
========================================================= */

export class AdminResumeApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "AdminResumeApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  options: AdminResumeApiRequestOptions = {},
  body?: unknown,
  queryParams?: Record<string, unknown>
): Promise<T> {
  const token = options.token ?? getAccessToken();
  const url = buildUrl(path, queryParams, options.apiBaseUrl);

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: options.withCredentials ?? "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
    cache: "no-store",
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new AdminResumeApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return unwrapResponse<T>(payload as T);
}

async function requestWithFallback<T>(
  methods: string[],
  paths: string[],
  options: AdminResumeApiRequestOptions = {},
  body?: unknown,
  queryParams?: Record<string, unknown>
): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    for (const method of methods) {
      try {
        return await request<T>(method, path, options, body, queryParams);
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (lastError instanceof AdminResumeApiError) {
    throw lastError;
  }

  throw new AdminResumeApiError("Request failed.", 500, lastError);
}

async function get<T>(
  path: string,
  options?: AdminResumeApiRequestOptions,
  queryParams?: Record<string, unknown>
): Promise<T> {
  return request<T>("GET", path, options, undefined, queryParams);
}

async function del<T>(
  path: string,
  options?: AdminResumeApiRequestOptions,
  queryParams?: Record<string, unknown>
): Promise<T> {
  return request<T>("DELETE", path, options, undefined, queryParams);
}

/* =========================================================
   PATH HELPERS
========================================================= */

function adminResumePaths(resumeId: string | number) {
  return [`${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}`];
}

function adminResumeVersionPaths(
  resumeId: string | number,
  versionId: string | number
) {
  return [
    `${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}/versions/${versionId}`,
    `${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}/version/${versionId}`,
  ];
}

function adminResumePreviewPaths(resumeId: string | number) {
  return [`${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}/preview`];
}

function adminResumeDownloadPaths(resumeId: string | number) {
  return [`${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}/download`];
}

function adminResumeVersionPreviewPaths(
  resumeId: string | number,
  versionId: string | number
) {
  return [
    `${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}/versions/${versionId}/preview`,
    `${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}/version/${versionId}/preview`,
  ];
}

function adminResumeVersionDownloadPaths(
  resumeId: string | number,
  versionId: string | number
) {
  return [
    `${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}/versions/${versionId}/download`,
    `${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}/version/${versionId}/download`,
  ];
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeResumeVersion(version: Partial<ResumeVersion>): ResumeVersion {
  return {
    resumeVersionId: version.resumeVersionId ?? version.id ?? undefined,
    id: version.id ?? version.resumeVersionId ?? undefined,
    versionCode: safeNullableString(version.versionCode),
    versionName: safeNullableString(version.versionName),
    versionType: version.versionType ?? null,
    atsScore:
      typeof version.atsScore === "number"
        ? version.atsScore
        : safeNullableNumber(version.atsScore),
    isBaseVersion:
      typeof version.isBaseVersion === "boolean"
        ? version.isBaseVersion
        : safeBoolean(version.isBaseVersion),
    createdAt: safeNullableString(version.createdAt),
    updatedAt: safeNullableString(version.updatedAt),
    fileUrl: safeNullableString(version.fileUrl),
    previewUrl: safeNullableString(version.previewUrl),
    downloadUrl: safeNullableString(version.downloadUrl),
    jobApplicationCode: safeNullableString(version.jobApplicationCode),
    rawText: safeNullableString(version.rawText),
    structuredContentJson: safeParseJson(version.structuredContentJson),
    parentVersionId: safeNullableNumber(version.parentVersionId),
    resumeId: safeNullableNumber(version.resumeId),
    status: version.status ?? null,
  };
}

export function normalizeResumeItem(resume: Partial<ResumeItem>): ResumeItem {
  return {
    resumeId: resume.resumeId ?? resume.id ?? undefined,
    id: resume.id ?? resume.resumeId ?? undefined,
    resumeCode: safeNullableString(resume.resumeCode),
    userId: safeNullableNumber(resume.userId),
    candidateId: safeNullableNumber(resume.candidateId),
    title: safeNullableString(resume.title),
    originalFileName: safeNullableString(resume.originalFileName),
    fileName: safeNullableString(resume.fileName),
    fullName: safeNullableString(resume.fullName),
    email: safeNullableString(resume.email),
    phone: safeNullableString(resume.phone),
    location: safeNullableString(resume.location),
    summary: safeNullableString(resume.summary),
    currentRole: safeNullableString(resume.currentRole),
    experienceLevel: safeNullableString(resume.experienceLevel),
    status: resume.status ?? null,
    createdAt: safeNullableString(resume.createdAt),
    updatedAt: safeNullableString(resume.updatedAt),
    fileUrl: safeNullableString(resume.fileUrl),
    previewUrl: safeNullableString(resume.previewUrl),
    downloadUrl: safeNullableString(resume.downloadUrl),
    latestVersion: resume.latestVersion
      ? normalizeResumeVersion(resume.latestVersion)
      : null,
    baseVersion: resume.baseVersion
      ? normalizeResumeVersion(resume.baseVersion)
      : null,
    versions: Array.isArray(resume.versions)
      ? resume.versions.map(normalizeResumeVersion)
      : [],
    versionCount:
      typeof resume.versionCount === "number"
        ? resume.versionCount
        : safeNullableNumber(resume.versionCount),
  };
}

export function normalizeResumeDetails(
  resume: Partial<ResumeDetails>
): ResumeDetails {
  return {
    ...normalizeResumeItem(resume),
    structuredContentJson: safeParseJson(resume.structuredContentJson),
    rawText: safeNullableString(resume.rawText),
  };
}

export function normalizeAdminUser(user: Partial<AdminUser>): AdminUser {
  return {
    userId: safeNullableNumber(user.userId) ?? undefined,
    id: safeNullableNumber(user.id) ?? undefined,
    adminUserId: safeNullableNumber(user.adminUserId) ?? undefined,
    candidateId: safeNullableNumber(user.candidateId) ?? undefined,
    userCode: safeNullableString(user.userCode),
    firstName: safeNullableString(user.firstName),
    lastName: safeNullableString(user.lastName),
    fullName: safeNullableString(user.fullName),
    name: safeNullableString(user.name),
    email: safeNullableString(user.email),
    phone: safeNullableString(user.phone),
    mobile: safeNullableString(user.mobile),
    location: safeNullableString(user.location),
    city: safeNullableString(user.city),
    currentRole: safeNullableString(user.currentRole),
    designation: safeNullableString(user.designation),
    totalResumes:
      typeof user.totalResumes === "number"
        ? user.totalResumes
        : safeNullableNumber(user.totalResumes),
    active:
      typeof user.active === "boolean"
        ? user.active
        : safeBoolean(user.active),
    enabled:
      typeof user.enabled === "boolean"
        ? user.enabled
        : safeBoolean(user.enabled),
    status: user.status ?? null,
    createdAt: safeNullableString(user.createdAt),
    updatedAt: safeNullableString(user.updatedAt),
  };
}

/* =========================================================
   QUERY BUILDERS
========================================================= */

function buildResumeListQuery(params: ResumeListQueryParams = {}) {
  return {
    page: params.page ?? 0,
    size: params.size ?? 10,
    search: params.search,
    sortBy: params.sortBy ?? "updatedAt",
    sortDir: params.sortDir ?? "desc",
    status: params.status,
    userId: params.userId,
    candidateId: params.candidateId,
  };
}

function buildVersionListQuery(params: ResumeVersionListQueryParams = {}) {
  return {
    page: params.page ?? 0,
    size: params.size ?? 10,
    search: params.search,
    sortBy: params.sortBy ?? "updatedAt",
    sortDir: params.sortDir ?? "desc",
    versionType: params.versionType,
    status: params.status,
  };
}

function buildUserListQuery(params: AdminUserListQueryParams = {}) {
  return {
    page: params.page ?? 0,
    size: params.size ?? 10,
    search: params.search,
    sortBy: params.sortBy ?? "updatedAt",
    sortDir: params.sortDir ?? "desc",
    status: params.status,
  };
}

/* =========================================================
   RESUME LIST
========================================================= */

export async function getAdminResumeList(
  params: ResumeListQueryParams = {},
  options?: AdminResumeApiRequestOptions
): Promise<ApiListResponse<ResumeItem>> {
  const raw = await get<ResumeItem[] | PageableResponse<ResumeItem> | Record<string, unknown>>(
    ADMIN_RESUME_API_PATHS.RESUMES,
    options,
    buildResumeListQuery(params)
  );

  const normalized = normalizePageableList<ResumeItem>(
    raw,
    params.page ?? 0,
    params.size ?? 10
  );

  return {
    ...normalized,
    items: normalized.items.map(normalizeResumeItem),
  };
}

export async function getAdminResumeById(
  resumeId: string | number,
  options?: AdminResumeApiRequestOptions
): Promise<ResumeDetails> {
  const raw = await requestWithFallback<ResumeDetails>(
    ["GET"],
    adminResumePaths(resumeId),
    options
  );

  return normalizeResumeDetails(raw);
}

export async function deleteAdminResumeById(
  resumeId: string | number,
  options?: AdminResumeApiRequestOptions
): Promise<{ success: boolean; message?: string }> {
  const raw = await del<{ success?: boolean; message?: string }>(
    `${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}`,
    options
  );

  return {
    success: raw?.success ?? true,
    message: raw?.message || undefined,
  };
}

export async function updateAdminResumeStatus(
  resumeId: string | number,
  payload: UpdateResumeStatusPayload,
  options?: AdminResumeApiRequestOptions
): Promise<{ success: boolean; message?: string; status?: string }> {
  const raw = await requestWithFallback<
    { success?: boolean; message?: string; status?: string }
  >(
    ["POST", "PATCH", "PUT"],
    [`${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}/status`],
    options,
    payload
  );

  return {
    success: raw?.success ?? true,
    message: raw?.message || undefined,
    status: raw?.status ?? payload.status,
  };
}

/* =========================================================
   RESUME VERSIONS
========================================================= */

export async function getAdminResumeVersions(
  resumeId: string | number,
  params: ResumeVersionListQueryParams = {},
  options?: AdminResumeApiRequestOptions
): Promise<ApiListResponse<ResumeVersion>> {
  const raw = await get<
    ResumeVersion[] | PageableResponse<ResumeVersion> | Record<string, unknown>
  >(
    `${ADMIN_RESUME_API_PATHS.RESUMES}/${resumeId}/versions`,
    options,
    buildVersionListQuery(params)
  );

  const normalized = normalizePageableList<ResumeVersion>(
    raw,
    params.page ?? 0,
    params.size ?? 10
  );

  return {
    ...normalized,
    items: normalized.items.map(normalizeResumeVersion),
  };
}

export async function getAdminResumeVersionById(
  resumeId: string | number,
  versionId: string | number,
  options?: AdminResumeApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await requestWithFallback<ResumeVersion>(
    ["GET"],
    adminResumeVersionPaths(resumeId, versionId),
    options
  );

  return normalizeResumeVersion(raw);
}

/* =========================================================
   ADMIN USERS
========================================================= */

export async function getAdminUsers(
  params: AdminUserListQueryParams = {},
  options?: AdminResumeApiRequestOptions
): Promise<ApiListResponse<AdminUser>> {
  const raw = await get<
    AdminUser[] | PageableResponse<AdminUser> | Record<string, unknown>
  >(
    ADMIN_RESUME_API_PATHS.USERS,
    options,
    buildUserListQuery(params)
  );

  const normalized = normalizePageableList<AdminUser>(
    raw,
    params.page ?? 0,
    params.size ?? 10
  );

  return {
    ...normalized,
    items: normalized.items.map(normalizeAdminUser),
  };
}

export async function getAdminUserById(
  userId: string | number,
  options?: AdminResumeApiRequestOptions
): Promise<AdminUser> {
  const raw = await get<AdminUser>(
    `${ADMIN_RESUME_API_PATHS.USERS}/${userId}`,
    options
  );

  return normalizeAdminUser(raw);
}

export async function getAdminResumesByUserId(
  userId: string | number,
  params: Omit<ResumeListQueryParams, "userId"> = {},
  options?: AdminResumeApiRequestOptions
): Promise<ApiListResponse<ResumeItem>> {
  return getAdminResumeList(
    {
      ...params,
      userId,
    },
    options
  );
}

/* =========================================================
   DOWNLOAD / PREVIEW HELPERS
========================================================= */

export async function getAdminResumeBlob(
  resumeId: string | number,
  options?: AdminResumeApiRequestOptions
): Promise<Blob> {
  const token = options?.token ?? getAccessToken();
  const url = buildUrl(adminResumeDownloadPaths(resumeId)[0], undefined, options?.apiBaseUrl);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    credentials: options?.withCredentials ?? "include",
    signal: options?.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await parseResponseBody(response);
    throw new AdminResumeApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return response.blob();
}

export async function getAdminResumeVersionBlob(
  resumeId: string | number,
  versionId: string | number,
  options?: AdminResumeApiRequestOptions
): Promise<Blob> {
  const token = options?.token ?? getAccessToken();
  const url = buildUrl(
    adminResumeVersionDownloadPaths(resumeId, versionId)[0],
    undefined,
    options?.apiBaseUrl
  );

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    credentials: options?.withCredentials ?? "include",
    signal: options?.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await parseResponseBody(response);
    throw new AdminResumeApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return response.blob();
}

export function getAdminResumePreviewUrl(
  resume: Partial<ResumeItem> | Partial<ResumeDetails> | null | undefined,
  apiBaseUrl?: string
): string | null {
  if (!resume) return null;

  const latest = resume.latestVersion;
  if (latest?.previewUrl) return latest.previewUrl;
  if (resume.previewUrl) return resume.previewUrl;
  if (latest?.fileUrl) return latest.fileUrl;
  if (resume.fileUrl) return resume.fileUrl;

  const resumeId = getResumeId(resume);
  if (!resumeId) return null;

  return buildUrl(adminResumePreviewPaths(resumeId)[0], undefined, apiBaseUrl);
}

export function getAdminResumeDownloadUrl(
  resume: Partial<ResumeItem> | Partial<ResumeDetails> | null | undefined,
  apiBaseUrl?: string
): string | null {
  if (!resume) return null;

  const latest = resume.latestVersion;
  if (latest?.downloadUrl) return latest.downloadUrl;
  if (resume.downloadUrl) return resume.downloadUrl;
  if (latest?.fileUrl) return latest.fileUrl;
  if (resume.fileUrl) return resume.fileUrl;
  if (latest?.previewUrl) return latest.previewUrl;
  if (resume.previewUrl) return resume.previewUrl;

  const resumeId = getResumeId(resume);
  if (!resumeId) return null;

  return buildUrl(adminResumeDownloadPaths(resumeId)[0], undefined, apiBaseUrl);
}

export function getAdminResumeVersionPreviewUrl(
  version: Partial<ResumeVersion> | null | undefined,
  resumeId?: string | number,
  apiBaseUrl?: string
): string | null {
  if (!version) return null;
  if (version.previewUrl) return version.previewUrl;
  if (version.fileUrl) return version.fileUrl;

  const versionId = getResumeVersionId(version);
  if (!versionId || !resumeId) return null;

  return buildUrl(
    adminResumeVersionPreviewPaths(resumeId, versionId)[0],
    undefined,
    apiBaseUrl
  );
}

export function getAdminResumeVersionDownloadUrl(
  version: Partial<ResumeVersion> | null | undefined,
  resumeId?: string | number,
  apiBaseUrl?: string
): string | null {
  if (!version) return null;
  if (version.downloadUrl) return version.downloadUrl;
  if (version.fileUrl) return version.fileUrl;
  if (version.previewUrl) return version.previewUrl;

  const versionId = getResumeVersionId(version);
  if (!versionId || !resumeId) return null;

  return buildUrl(
    adminResumeVersionDownloadPaths(resumeId, versionId)[0],
    undefined,
    apiBaseUrl
  );
}

/* =========================================================
   DOMAIN HELPERS FOR COMPONENTS
========================================================= */

export function getLatestResumeVersion(
  resume: Partial<ResumeItem> | Partial<ResumeDetails> | null | undefined
): ResumeVersion | null {
  if (!resume) return null;

  if (resume.latestVersion) {
    return normalizeResumeVersion(resume.latestVersion);
  }

  if (Array.isArray(resume.versions) && resume.versions.length > 0) {
    const sorted = [...resume.versions].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return normalizeResumeVersion(sorted[0]);
  }

  return null;
}

export function getBaseResumeVersion(
  resume: Partial<ResumeItem> | Partial<ResumeDetails> | null | undefined
): ResumeVersion | null {
  if (!resume) return null;

  if (resume.baseVersion) {
    return normalizeResumeVersion(resume.baseVersion);
  }

  if (Array.isArray(resume.versions) && resume.versions.length > 0) {
    const base = resume.versions.find((version) => version.isBaseVersion);
    return base ? normalizeResumeVersion(base) : null;
  }

  return null;
}

export function getResumeVersionCount(
  resume: Partial<ResumeItem> | Partial<ResumeDetails> | null | undefined
): number {
  if (!resume) return 0;
  if (typeof resume.versionCount === "number") return resume.versionCount;
  if (Array.isArray(resume.versions)) return resume.versions.length;

  let count = 0;
  if (resume.baseVersion) count += 1;
  if (resume.latestVersion) count += 1;
  return count || 1;
}

export function dedupeResumeVersions(
  resume: Partial<ResumeItem> | Partial<ResumeDetails> | null | undefined,
  versions: Partial<ResumeVersion>[] = []
): ResumeVersion[] {
  const all = [
    ...(resume?.versions || []),
    ...(resume?.baseVersion ? [resume.baseVersion] : []),
    ...(resume?.latestVersion ? [resume.latestVersion] : []),
    ...versions,
  ];

  const map = new Map<string | number, ResumeVersion>();

  for (const version of all) {
    const normalized = normalizeResumeVersion(version);
    const key =
      normalized.resumeVersionId ??
      normalized.id ??
      normalized.versionCode ??
      `${normalized.versionName}-${normalized.createdAt}`;

    if (!map.has(key)) {
      map.set(key, normalized);
    }
  }

  return [...map.values()].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export function getAdminUserDisplayName(
  user: Partial<AdminUser> | null | undefined
): string {
  if (!user) return "—";
  return (
    user.fullName ||
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    "—"
  );
}

export function getAdminUserStatus(
  user: Partial<AdminUser> | null | undefined
): AdminUserStatus {
  if (!user) return "UNKNOWN";
  if (user.status) return user.status;
  if (user.active === true || user.enabled === true) return "ACTIVE";
  if (user.active === false || user.enabled === false) return "INACTIVE";
  return "UNKNOWN";
}

/* =========================================================
   CONVENIENCE OBJECT EXPORT
========================================================= */

export const adminResumeApi = {
  getAdminResumeList,
  getAdminResumeById,
  deleteAdminResumeById,
  updateAdminResumeStatus,

  getAdminResumeVersions,
  getAdminResumeVersionById,

  getAdminUsers,
  getAdminUserById,
  getAdminResumesByUserId,

  getAdminResumeBlob,
  getAdminResumeVersionBlob,
  getAdminResumePreviewUrl,
  getAdminResumeDownloadUrl,
  getAdminResumeVersionPreviewUrl,
  getAdminResumeVersionDownloadUrl,

  getLatestResumeVersion,
  getBaseResumeVersion,
  getResumeVersionCount,
  dedupeResumeVersions,

  getAdminUserDisplayName,
  getAdminUserStatus,

  normalizeResumeVersion,
  normalizeResumeItem,
  normalizeResumeDetails,
  normalizeAdminUser,
  getResumeId,
  getResumeVersionId,
  getUserId,
  extractApiMessage,
};

/* =========================================================
   EXAMPLE USAGE

   import { adminResumeApi } from "@/lib/adminResumeApi";

   const resumes = await adminResumeApi.getAdminResumeList({
     page: 0,
     size: 10,
     search: "frontend",
     sortBy: "updatedAt",
     sortDir: "desc",
   });

   const details = await adminResumeApi.getAdminResumeById(12);
   const versions = await adminResumeApi.getAdminResumeVersions(12, { page: 0, size: 10 });
========================================================= */