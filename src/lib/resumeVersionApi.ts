// src/lib/resumeVersionApi.ts
//
// Central Resume Version API client for frontend ↔ backend integration.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - Cookie/session auth supported via credentials: "include"
// - Bearer token fallback retained for older auth flow
// - Supports wrapped backend response styles:
//   { success, message, data | payload | result | content }
// - Supports pageable payloads and common fallback endpoint patterns
// - Aligned with resume version, preview/download, ATS, duplicate/restore,
//   and base-version flows used across the project

export const RESUME_VERSION_API_PATHS = {
  RESUMES: "/api/user/resume",
} as const;

/* =========================================================
   TYPES
========================================================= */

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  details?: unknown;
  data?: T;
  result?: T;
  payload?: T;
  content?: T;
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

export type ResumeVersionStatus =
  | "ACTIVE"
  | "DRAFT"
  | "PROCESSED"
  | "ARCHIVED"
  | string;

export type ResumeVersionType =
  | "BASE"
  | "TAILORED"
  | "DUPLICATE"
  | "JOB_TARGETED"
  | "CUSTOM"
  | string;

export type ResumeStructuredContent = Record<string, unknown> | null;

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
  structuredContentJson?: ResumeStructuredContent;
  parentVersionId?: number | null;
  resumeId?: number | null;
  status?: ResumeVersionStatus | null;
};

export type ResumeVersionDetails = ResumeVersion & {
  sections?: unknown[];
  metadata?: Record<string, unknown> | null;
};

export type ResumeVersionListQueryParams = {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
  versionType?: string;
  status?: string;
  jobApplicationCode?: string;
};

export type CreateResumeVersionPayload = {
  versionName?: string;
  versionType?: ResumeVersionType;
  parentVersionId?: number | null;
  jobApplicationCode?: string | null;
  rawText?: string | null;
  structuredContentJson?: ResumeStructuredContent;
  fileUrl?: string | null;
  previewUrl?: string | null;
  atsScore?: number | null;
  status?: ResumeVersionStatus;
};

export type UpdateResumeVersionPayload = {
  versionName?: string;
  versionType?: ResumeVersionType;
  jobApplicationCode?: string | null;
  rawText?: string | null;
  structuredContentJson?: ResumeStructuredContent;
  fileUrl?: string | null;
  previewUrl?: string | null;
  atsScore?: number | null;
  status?: ResumeVersionStatus;
};

export type UpdateResumeVersionStatusPayload = {
  status: ResumeVersionStatus;
};

export type DuplicateResumeVersionPayload = {
  versionName?: string;
  reason?: string;
  companyName?: string;
  jobTitle?: string;
  copyStructuredContent?: boolean;
  copyRawText?: boolean;
  generatePreview?: boolean;
};

export type RestoreResumeVersionPayload = {
  restoreAsBase?: boolean;
  versionName?: string;
};

export type ResumeVersionAtsScoreRequestPayload = {
  jobDescription?: string;
  rawText?: string | null;
};

export type ResumeVersionAtsScoreResponse = {
  success?: boolean;
  message?: string;
  atsScore?: number | null;
  score?: number | null;
  suggestions?: string[];
  keywordsMatched?: string[];
  keywordsMissing?: string[];
};

export type ResumeVersionApiRequestOptions = {
  token?: string | null;
  apiBaseUrl?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  withCredentials?: boolean;
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function getApiBaseUrl(apiBaseUrl?: string): string {
  if (typeof apiBaseUrl === "string" && apiBaseUrl.trim()) {
    return apiBaseUrl.trim().replace(/\/+$/, "");
  }

  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, "") ||
    ""
  );
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token") ||
    null
  );
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeNullableNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

function uniqueStrings(values?: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0
      )
    ),
  ];
}

function safeParseStructuredContent(value: unknown): ResumeStructuredContent {
  if (!value) return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as ResumeStructuredContent;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as ResumeStructuredContent)
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    return (
      safeString(record.message) ||
      safeString(record.error) ||
      safeString(record.details) ||
      `Request failed with status ${status}`
    );
  }

  return `Request failed with status ${status}`;
}

function unwrapResponse<T>(value: unknown): T {
  let current = value;
  let depth = 0;

  while (current && typeof current === "object" && depth < 6) {
    const obj = current as Record<string, unknown>;

    if (obj.data !== undefined) {
      current = obj.data;
      depth += 1;
      continue;
    }

    if (obj.payload !== undefined) {
      current = obj.payload;
      depth += 1;
      continue;
    }

    if (obj.result !== undefined) {
      current = obj.result;
      depth += 1;
      continue;
    }

    if (
      obj.content !== undefined &&
      !Array.isArray(current) &&
      !("totalElements" in obj) &&
      !("totalPages" in obj) &&
      !("number" in obj) &&
      !("size" in obj)
    ) {
      current = obj.content;
      depth += 1;
      continue;
    }

    break;
  }

  return current as T;
}

function buildUrl(
  path: string,
  params?: Record<string, unknown>,
  apiBaseUrl?: string
): string {
  const base = getApiBaseUrl(apiBaseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const tempBase =
    base ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000");

  const url = new URL(`${tempBase}${normalizedPath}`);

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

  if (!base) {
    return `${normalizedPath}${url.search}`;
  }

  return `${base}${normalizedPath}${url.search}`;
}

function normalizePageableList<T>(
  raw: unknown,
  fallbackPage = 0,
  fallbackSize = 10
): ApiListResponse<T> {
  const unwrapped = unwrapResponse<unknown>(raw);

  if (Array.isArray(unwrapped)) {
    return {
      items: unwrapped as T[],
      totalElements: unwrapped.length,
      totalPages: 1,
      page: 0,
      size: unwrapped.length || fallbackSize,
    };
  }

  const obj =
    unwrapped && typeof unwrapped === "object"
      ? (unwrapped as PageableResponse<T> & Record<string, unknown>)
      : {};

  const content = Array.isArray(obj.content)
    ? obj.content
    : Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.rows)
        ? obj.rows
        : Array.isArray(obj.list)
          ? obj.list
          : [];

  return {
    items: content,
    totalElements: safeNumber(obj.totalElements, content.length),
    totalPages: Math.max(1, safeNumber(obj.totalPages, content.length ? 1 : 1)),
    page: safeNumber(obj.number, fallbackPage),
    size: safeNumber(obj.size, fallbackSize),
  };
}

export function getResumeVersionId(
  version: Partial<ResumeVersion> | null | undefined
): number | null {
  if (!version) return null;
  return safeNullableNumber(version.resumeVersionId ?? version.id);
}

/* =========================================================
   HTTP CORE
========================================================= */

export class ResumeVersionApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "ResumeVersionApiError";
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

function buildRequestHeaders(
  token?: string | null,
  customHeaders?: HeadersInit,
  hasJsonBody = false
): Headers {
  const headers = new Headers(customHeaders || {});

  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function request<T>(
  method: string,
  path: string,
  options: ResumeVersionApiRequestOptions = {},
  body?: unknown,
  queryParams?: Record<string, unknown>
): Promise<T> {
  const token = options.token ?? getAccessToken();
  const url = buildUrl(path, queryParams, options.apiBaseUrl);
  const hasBody = body !== undefined;
  const credentials: RequestCredentials =
    options.withCredentials === false ? "omit" : "include";

  const response = await fetch(url, {
    method,
    headers: buildRequestHeaders(token, options.headers, hasBody),
    credentials,
    body: hasBody ? JSON.stringify(body) : undefined,
    signal: options.signal,
    cache: "no-store",
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new ResumeVersionApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return unwrapResponse<T>(payload);
}

async function requestWithFallback<T>(
  methods: string[],
  paths: string[],
  options: ResumeVersionApiRequestOptions = {},
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

  if (lastError instanceof ResumeVersionApiError) {
    throw lastError;
  }

  throw new ResumeVersionApiError("Request failed.", 500, lastError);
}

async function get<T>(
  path: string,
  options?: ResumeVersionApiRequestOptions,
  queryParams?: Record<string, unknown>
): Promise<T> {
  return request<T>("GET", path, options, undefined, queryParams);
}

/* =========================================================
   PATH HELPERS
========================================================= */

function listPaths(resumeId: string | number): string[] {
  return [
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version`,
  ];
}

function versionPaths(
  resumeId: string | number,
  resumeVersionId: string | number
): string[] {
  return [
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/version/${resumeVersionId}`,
  ];
}

function updatePaths(
  resumeId: string | number,
  resumeVersionId: string | number
): string[] {
  return [
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/content`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/content`,
  ];
}

function statusPaths(
  resumeId: string | number,
  resumeVersionId: string | number
): string[] {
  return [
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/status`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/status`,
  ];
}

function setBasePaths(
  resumeId: string | number,
  resumeVersionId: string | number
): string[] {
  return [
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/set-base`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/set-base`,
  ];
}

function duplicatePaths(
  resumeId: string | number,
  resumeVersionId: string | number
): string[] {
  return [
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/duplicate`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/duplicate`,
  ];
}

function restorePaths(
  resumeId: string | number,
  resumeVersionId: string | number
): string[] {
  return [
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/restore`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/restore`,
  ];
}

function atsPaths(
  resumeId: string | number,
  resumeVersionId: string | number
): string[] {
  return [
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/ats-score`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/ats-score`,
  ];
}

function previewPaths(
  resumeId: string | number,
  resumeVersionId: string | number
): string[] {
  return [
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/preview`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/preview`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/version/${resumeVersionId}/preview`,
  ];
}

function downloadPaths(
  resumeId: string | number,
  resumeVersionId: string | number
): string[] {
  return [
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/download`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/download`,
    `${RESUME_VERSION_API_PATHS.RESUMES}/version/${resumeVersionId}/download`,
  ];
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeResumeVersion(
  version: Partial<ResumeVersion> | Record<string, unknown>
): ResumeVersion {
  const source = version as Record<string, unknown>;

  return {
    resumeVersionId: safeNullableNumber(
      source.resumeVersionId ?? source.id ?? source.versionId
    ) ?? undefined,
    id:
      safeNullableNumber(source.id ?? source.resumeVersionId ?? source.versionId) ??
      undefined,
    versionCode: safeString(source.versionCode) || null,
    versionName: safeString(source.versionName) || null,
    versionType:
      (safeString(source.versionType) || safeString(source.type) || null) as
        | ResumeVersionType
        | null,
    atsScore:
      safeNullableNumber(source.atsScore ?? source.score ?? source.ats) ?? null,
    isBaseVersion:
      safeBoolean(source.isBaseVersion ?? source.baseVersion ?? source.isBase) ??
      null,
    createdAt:
      safeString(source.createdAt ?? source.created_on ?? source.createdDate) || null,
    updatedAt:
      safeString(source.updatedAt ?? source.updated_on ?? source.updatedDate) || null,
    fileUrl: safeString(source.fileUrl ?? source.fileURL) || null,
    previewUrl: safeString(source.previewUrl ?? source.previewURL) || null,
    downloadUrl: safeString(source.downloadUrl ?? source.downloadURL) || null,
    jobApplicationCode:
      safeString(source.jobApplicationCode ?? source.applicationCode) || null,
    rawText: typeof source.rawText === "string" ? source.rawText : null,
    structuredContentJson: safeParseStructuredContent(
      source.structuredContentJson ?? source.structuredContent
    ),
    parentVersionId:
      safeNullableNumber(source.parentVersionId ?? source.parentId) ?? null,
    resumeId: safeNullableNumber(source.resumeId) ?? null,
    status:
      (safeString(source.status) || safeString(source.versionStatus) || null) as
        | ResumeVersionStatus
        | null,
  };
}

export function normalizeResumeVersionDetails(
  version: Partial<ResumeVersionDetails> | Record<string, unknown>
): ResumeVersionDetails {
  const base = normalizeResumeVersion(version);
  const source = version as Record<string, unknown>;

  return {
    ...base,
    sections: Array.isArray(source.sections) ? source.sections : undefined,
    metadata:
      source.metadata && typeof source.metadata === "object"
        ? (source.metadata as Record<string, unknown>)
        : null,
  };
}

/* =========================================================
   QUERY BUILDERS
========================================================= */

function buildVersionListQuery(params: ResumeVersionListQueryParams = {}) {
  return {
    page: params.page ?? 0,
    size: params.size ?? 10,
    search: params.search,
    sortBy: params.sortBy ?? "updatedAt",
    sortDir: params.sortDir ?? "desc",
    versionType: params.versionType,
    status: params.status,
    jobApplicationCode: params.jobApplicationCode,
  };
}

/* =========================================================
   PAYLOAD BUILDERS
========================================================= */

export function buildCreateResumeVersionPayload(
  input: CreateResumeVersionPayload
): CreateResumeVersionPayload {
  return {
    versionName: safeString(input.versionName).trim() || undefined,
    versionType: input.versionType,
    parentVersionId:
      typeof input.parentVersionId === "number" ? input.parentVersionId : null,
    jobApplicationCode: safeString(input.jobApplicationCode).trim() || null,
    rawText: typeof input.rawText === "string" ? input.rawText : null,
    structuredContentJson:
      input.structuredContentJson && typeof input.structuredContentJson === "object"
        ? input.structuredContentJson
        : null,
    fileUrl: safeString(input.fileUrl).trim() || null,
    previewUrl: safeString(input.previewUrl).trim() || null,
    atsScore: typeof input.atsScore === "number" ? input.atsScore : null,
    status: input.status,
  };
}

export function buildUpdateResumeVersionPayload(
  input: UpdateResumeVersionPayload
): UpdateResumeVersionPayload {
  return {
    versionName: safeString(input.versionName).trim() || undefined,
    versionType: input.versionType,
    jobApplicationCode: safeString(input.jobApplicationCode).trim() || null,
    rawText: typeof input.rawText === "string" ? input.rawText : null,
    structuredContentJson:
      input.structuredContentJson && typeof input.structuredContentJson === "object"
        ? input.structuredContentJson
        : null,
    fileUrl: safeString(input.fileUrl).trim() || null,
    previewUrl: safeString(input.previewUrl).trim() || null,
    atsScore: typeof input.atsScore === "number" ? input.atsScore : null,
    status: input.status,
  };
}

export function buildDuplicateResumeVersionPayload(
  input?: DuplicateResumeVersionPayload
): DuplicateResumeVersionPayload | undefined {
  if (!input) return undefined;

  return {
    versionName: safeString(input.versionName).trim() || undefined,
    reason: safeString(input.reason).trim() || undefined,
    companyName: safeString(input.companyName).trim() || undefined,
    jobTitle: safeString(input.jobTitle).trim() || undefined,
    copyStructuredContent:
      typeof input.copyStructuredContent === "boolean"
        ? input.copyStructuredContent
        : undefined,
    copyRawText:
      typeof input.copyRawText === "boolean" ? input.copyRawText : undefined,
    generatePreview:
      typeof input.generatePreview === "boolean" ? input.generatePreview : undefined,
  };
}

export function buildRestoreResumeVersionPayload(
  input?: RestoreResumeVersionPayload
): RestoreResumeVersionPayload | undefined {
  if (!input) return undefined;

  return {
    restoreAsBase:
      typeof input.restoreAsBase === "boolean" ? input.restoreAsBase : undefined,
    versionName: safeString(input.versionName).trim() || undefined,
  };
}

/* =========================================================
   VERSION CRUD
========================================================= */

export async function getResumeVersionList(
  resumeId: string | number,
  params: ResumeVersionListQueryParams = {},
  options?: ResumeVersionApiRequestOptions
): Promise<ApiListResponse<ResumeVersion>> {
  const raw = await requestWithFallback<
    ResumeVersion[] | PageableResponse<ResumeVersion> | Record<string, unknown>
  >(["GET"], listPaths(resumeId), options, undefined, buildVersionListQuery(params));

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

export async function getResumeVersionById(
  resumeId: string | number,
  resumeVersionId: string | number,
  options?: ResumeVersionApiRequestOptions
): Promise<ResumeVersionDetails> {
  const raw = await requestWithFallback<ResumeVersionDetails>(
    ["GET"],
    versionPaths(resumeId, resumeVersionId),
    options
  );

  return normalizeResumeVersionDetails(raw);
}

export async function createResumeVersion(
  resumeId: string | number,
  payload: CreateResumeVersionPayload,
  options?: ResumeVersionApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await requestWithFallback<ResumeVersion>(
    ["POST"],
    listPaths(resumeId),
    options,
    buildCreateResumeVersionPayload(payload)
  );

  return normalizeResumeVersion(raw);
}

export async function updateResumeVersion(
  resumeId: string | number,
  resumeVersionId: string | number,
  payload: UpdateResumeVersionPayload,
  options?: ResumeVersionApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await requestWithFallback<ResumeVersion>(
    ["PUT", "PATCH"],
    updatePaths(resumeId, resumeVersionId),
    options,
    buildUpdateResumeVersionPayload(payload)
  );

  return normalizeResumeVersion(raw);
}

export async function deleteResumeVersion(
  resumeId: string | number,
  resumeVersionId: string | number,
  options?: ResumeVersionApiRequestOptions
): Promise<{ success: boolean; message?: string }> {
  const raw = await requestWithFallback<
    { success?: boolean; message?: string } | Record<string, unknown> | string
  >(
    ["DELETE"],
    [
      `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}`,
      `${RESUME_VERSION_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}`,
    ],
    options
  );

  if (typeof raw === "string") {
    return {
      success: true,
      message: raw,
    };
  }

  const obj = raw && typeof raw === "object" ? raw : {};

  return {
    success:
      typeof (obj as { success?: unknown }).success === "boolean"
        ? Boolean((obj as { success?: unknown }).success)
        : true,
    message: safeString((obj as { message?: unknown }).message) || undefined,
  };
}

/* =========================================================
   VERSION ACTIONS
========================================================= */

export async function updateResumeVersionStatus(
  resumeId: string | number,
  resumeVersionId: string | number,
  payload: UpdateResumeVersionStatusPayload,
  options?: ResumeVersionApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await requestWithFallback<ResumeVersion>(
    ["PATCH", "PUT", "POST"],
    statusPaths(resumeId, resumeVersionId),
    options,
    {
      status: safeString(payload.status).trim(),
    }
  );

  return normalizeResumeVersion(raw);
}

export async function setResumeVersionAsBase(
  resumeId: string | number,
  resumeVersionId: string | number,
  options?: ResumeVersionApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await requestWithFallback<ResumeVersion>(
    ["PATCH", "POST", "PUT"],
    setBasePaths(resumeId, resumeVersionId),
    options,
    {}
  );

  return normalizeResumeVersion(raw);
}

export async function duplicateResumeVersion(
  resumeId: string | number,
  resumeVersionId: string | number,
  payload?: DuplicateResumeVersionPayload,
  options?: ResumeVersionApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await requestWithFallback<ResumeVersion>(
    ["POST"],
    duplicatePaths(resumeId, resumeVersionId),
    options,
    buildDuplicateResumeVersionPayload(payload) || {}
  );

  return normalizeResumeVersion(raw);
}

export async function restoreResumeVersion(
  resumeId: string | number,
  resumeVersionId: string | number,
  payload?: RestoreResumeVersionPayload,
  options?: ResumeVersionApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await requestWithFallback<ResumeVersion>(
    ["POST"],
    restorePaths(resumeId, resumeVersionId),
    options,
    buildRestoreResumeVersionPayload(payload) || {}
  );

  return normalizeResumeVersion(raw);
}

export async function calculateResumeVersionAtsScore(
  resumeId: string | number,
  resumeVersionId: string | number,
  payload?: ResumeVersionAtsScoreRequestPayload,
  options?: ResumeVersionApiRequestOptions
): Promise<ResumeVersionAtsScoreResponse> {
  const raw = await requestWithFallback<ResumeVersionAtsScoreResponse>(
    ["POST", "PUT"],
    atsPaths(resumeId, resumeVersionId),
    options,
    payload || {}
  );

  return {
    success:
      typeof raw?.success === "boolean" ? raw.success : true,
    message: typeof raw?.message === "string" ? raw.message : undefined,
    atsScore:
      typeof raw?.atsScore === "number"
        ? raw.atsScore
        : typeof raw?.score === "number"
          ? raw.score
          : null,
    score:
      typeof raw?.score === "number"
        ? raw.score
        : typeof raw?.atsScore === "number"
          ? raw.atsScore
          : null,
    suggestions: uniqueStrings(raw?.suggestions),
    keywordsMatched: uniqueStrings(raw?.keywordsMatched),
    keywordsMissing: uniqueStrings(raw?.keywordsMissing),
  };
}

/* =========================================================
   URL HELPERS
========================================================= */

export function getResumeVersionPreviewUrl(
  version: Partial<ResumeVersion> | null | undefined,
  resumeId?: string | number,
  apiBaseUrl?: string
): string | null {
  if (!version) return null;

  if (typeof version.previewUrl === "string" && version.previewUrl.trim()) {
    return version.previewUrl;
  }

  const versionId = getResumeVersionId(version);
  if (!resumeId || !versionId) return null;

  return buildUrl(previewPaths(resumeId, versionId)[0], undefined, apiBaseUrl);
}

export function getResumeVersionDownloadUrl(
  version: Partial<ResumeVersion> | null | undefined,
  resumeId?: string | number,
  apiBaseUrl?: string
): string | null {
  if (!version) return null;

  if (typeof version.downloadUrl === "string" && version.downloadUrl.trim()) {
    return version.downloadUrl;
  }

  const versionId = getResumeVersionId(version);
  if (!resumeId || !versionId) return null;

  return buildUrl(downloadPaths(resumeId, versionId)[0], undefined, apiBaseUrl);
}

/* =========================================================
   DOMAIN HELPERS
========================================================= */

export function dedupeResumeVersions(
  versions: Partial<ResumeVersion>[] = []
): ResumeVersion[] {
  const map = new Map<string | number, ResumeVersion>();

  for (const version of versions) {
    const normalized = normalizeResumeVersion(version);

    const key =
      normalized.resumeVersionId ??
      normalized.id ??
      normalized.versionCode ??
      `${normalized.versionName || "version"}-${normalized.createdAt || ""}`;

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

export function getLatestResumeVersion(
  versions: Partial<ResumeVersion>[] = []
): ResumeVersion | null {
  const items = dedupeResumeVersions(versions);
  return items[0] || null;
}

export function getBaseResumeVersion(
  versions: Partial<ResumeVersion>[] = []
): ResumeVersion | null {
  const items = dedupeResumeVersions(versions);

  return (
    items.find((item) => item.isBaseVersion === true) ||
    items.find((item) => (item.versionType || "").toUpperCase().includes("BASE")) ||
    null
  );
}

export function getResumeVersionDisplayTitle(
  version: Partial<ResumeVersion> | null | undefined
): string {
  if (!version) return "Resume Version";

  return (
    (typeof version.versionName === "string" && version.versionName.trim()) ||
    (typeof version.versionCode === "string" && version.versionCode.trim()) ||
    (typeof version.jobApplicationCode === "string" &&
      version.jobApplicationCode.trim()) ||
    "Resume Version"
  );
}

export function getResumeVersionStatusBadgeClass(
  status?: string | null
): string {
  const normalized = (status || "").trim().toUpperCase();

  if (["ACTIVE", "PROCESSED"].includes(normalized)) {
    return "border-green-200 bg-green-100 text-green-700";
  }

  if (["DRAFT"].includes(normalized)) {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }

  if (["ARCHIVED"].includes(normalized)) {
    return "border-red-200 bg-red-100 text-red-700";
  }

  return "border-yellow-200 bg-yellow-100 text-yellow-700";
}

export function getResumeVersionTypeBadgeClass(type?: string | null): string {
  const normalized = (type || "").trim().toUpperCase();

  if (normalized.includes("BASE")) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (normalized.includes("TAILOR")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (normalized.includes("JOB")) {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (normalized.includes("DUPLICATE")) {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  return "border-gray-200 bg-gray-100 text-gray-700";
}

export function getAtsScoreBadgeClass(score?: number | null): string {
  if (score === null || score === undefined) {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }

  if (score >= 80) {
    return "border-green-200 bg-green-100 text-green-700";
  }

  if (score >= 60) {
    return "border-yellow-200 bg-yellow-100 text-yellow-700";
  }

  return "border-red-200 bg-red-100 text-red-700";
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const resumeVersionApi = {
  getResumeVersionList,
  getResumeVersionById,
  createResumeVersion,
  updateResumeVersion,
  deleteResumeVersion,

  updateResumeVersionStatus,
  setResumeVersionAsBase,
  duplicateResumeVersion,
  restoreResumeVersion,
  calculateResumeVersionAtsScore,

  getResumeVersionPreviewUrl,
  getResumeVersionDownloadUrl,

  normalizeResumeVersion,
  normalizeResumeVersionDetails,

  buildCreateResumeVersionPayload,
  buildUpdateResumeVersionPayload,
  buildDuplicateResumeVersionPayload,
  buildRestoreResumeVersionPayload,

  getResumeVersionId,
  dedupeResumeVersions,
  getLatestResumeVersion,
  getBaseResumeVersion,
  getResumeVersionDisplayTitle,
  getResumeVersionStatusBadgeClass,
  getResumeVersionTypeBadgeClass,
  getAtsScoreBadgeClass,
};

/* =========================================================
   EXAMPLE USAGE

   import { resumeVersionApi } from "@/lib/resumeVersionApi";

   const versions = await resumeVersionApi.getResumeVersionList(12, {
     page: 0,
     size: 10,
     sortBy: "updatedAt",
     sortDir: "desc",
   });

   const version = await resumeVersionApi.getResumeVersionById(12, 34);

   const duplicated = await resumeVersionApi.duplicateResumeVersion(12, 34, {
     versionName: "Copied Version",
     copyStructuredContent: true,
     copyRawText: true,
     generatePreview: true,
   });
========================================================= */