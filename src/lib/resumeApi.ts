// src/lib/resumeApi.ts
//
// Central Resume API client for frontend ↔ backend integration.
//
// Purpose:
// - Single reusable API layer for user resume flows
// - Supports:
//   - resume upload
//   - resume list/details
//   - current/latest resume fetch
//   - resume versions
//   - preview/download URLs
//   - resume editing/saving
//   - backend-aligned resume tailoring flow
//   - ATS scoring
//   - delete/archive/status actions
//
// Architecture alignment:
// - Works with Spring Boot backend
// - Uses cookie/session auth via credentials: "include"
// - Keeps bearer token fallback for older frontend auth flow
// - Supports wrapped backend responses
// - Supports pageable responses
// - Supports fallback endpoint patterns used across your Interview System / Resume Management System
//
// Latest project update alignment:
// - Preserves backend-first frontend structure
// - Supports current resume endpoints
// - Supports version content update endpoints
// - Supports resume tailoring controller routes under /api/user/resume/tailor/*
// - Supports newer ResumeTailorRequest style fields
//
// Recommended backend endpoints:
//   GET    /api/user/resume
//   POST   /api/user/resume/upload
//   GET    /api/user/resume/current
//   GET    /api/user/resume/latest
//   GET    /api/user/resume/{resumeId}
//   PUT    /api/user/resume/{resumeId}
//   DELETE /api/user/resume/{resumeId}
//   GET    /api/user/resume/{resumeId}/versions
//   GET    /api/user/resume/{resumeId}/versions/{resumeVersionId}
//   PUT    /api/user/resume/{resumeId}/versions/{resumeVersionId}/content
//   POST   /api/user/resume/{resumeId}/versions/{resumeVersionId}/ats-score
//   GET    /api/user/resume/current/preview
//   GET    /api/user/resume/current/download
//   GET    /api/user/resume/{resumeId}/preview
//   GET    /api/user/resume/{resumeId}/download
//
// Resume tailoring endpoints:
//   POST   /api/user/resume/tailor/extract-tools
//   POST   /api/user/resume/tailor/apply
//   POST   /api/user/resume/tailor/tool-answers
//   GET    /api/user/resume/tailor/ping
//
// Supported response styles:
// - plain object / plain array
// - Spring pageable
// - wrapped { data | result | payload | content }
// - nested wrapped payloads

export const RESUME_API_PATHS = {
  RESUMES: "/api/user/resume",
  RESUME_UPLOAD: "/api/user/resume/upload",
  CURRENT: "/api/user/resume/current",
  LATEST: "/api/user/resume/latest",
  TAILOR_BASE: "/api/user/resume/tailor",
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

export type ResumeStatus =
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
  status?: ResumeStatus | null;
};

export type ResumeItem = {
  resumeId?: number;
  id?: number;
  resumeCode?: string | null;
  userId?: number | null;
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
  rawText?: string | null;
  structuredContentJson?: ResumeStructuredContent;
  latestVersion?: ResumeVersion | null;
  baseVersion?: ResumeVersion | null;
  versions?: ResumeVersion[];
  versionCount?: number | null;
};

export type ResumeDetails = ResumeItem;

export type ResumeUploadResponse = {
  success?: boolean;
  message?: string;
  resume?: ResumeDetails;
  resumeId?: number | null;
  resumeCode?: string | null;
  previewUrl?: string | null;
  fileUrl?: string | null;
  downloadUrl?: string | null;
};

export type ResumeListQueryParams = {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
  status?: string;
};

export type ResumeVersionListQueryParams = {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
  versionType?: string;
  status?: string;
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
  status?: ResumeStatus;
};

export type UpdateResumePayload = {
  title?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  currentRole?: string;
  experienceLevel?: string;
  status?: ResumeStatus;
  structuredContentJson?: ResumeStructuredContent;
  rawText?: string | null;
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
  status?: ResumeStatus;
};

export type UpdateResumeVersionContentPayload = {
  rawText?: string | null;
  structuredContentJson?: ResumeStructuredContent;
  regeneratePreview?: boolean;
};

export type UpdateResumeStatusPayload = {
  status: ResumeStatus;
};

export type ResumeTailorToolAnswer = {
  toolName?: string | null;
  answer?: string | null;
  known?: boolean | null;
  notes?: string | null;
};

export type TailorResumePayload = {
  resumeVersionId: number | string;
  companyName?: string;
  jobTitle?: string;
  jobDescription: string;
  knownTools?: string[];
  unknownTools?: string[];
  additionalNotes?: string;
};

export type ExtractToolsPayload = {
  resumeVersionId?: number | string;
  companyName?: string;
  jobTitle?: string;
  jobDescription: string;
  additionalNotes?: string;
};

export type ToolKnowledgeAnswerPayload = {
  resumeVersionId?: number | string;
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
  toolAnswers: ResumeTailorToolAnswer[];
  additionalNotes?: string;
};

export type ResumeTailorResult = {
  resumeId?: number | null;
  resumeVersionId?: number | null;
  versionId?: number | null;
  versionCode?: string | null;
  versionName?: string | null;
  versionType?: string | null;
  atsScore?: number | null;
  rawText?: string | null;
  structuredContentJson?: ResumeStructuredContent;
  previewUrl?: string | null;
  downloadUrl?: string | null;
  fileUrl?: string | null;
  detectedTools?: string[];
  missingTools?: string[];
  suggestedTools?: string[];
  requiresToolAnswers?: boolean | null;
  toolQuestions?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AtsScoreRequestPayload = {
  jobDescription?: string;
  resumeVersionId?: number | null;
  rawText?: string | null;
};

export type AtsScoreResponse = {
  success?: boolean;
  message?: string;
  atsScore?: number | null;
  score?: number | null;
  suggestions?: string[] | null;
  keywordsMatched?: string[] | null;
  keywordsMissing?: string[] | null;
};

export type ResumeApiRequestOptions = {
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

function uniqueStrings(values?: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .map((v) => v.trim())
    ),
  ];
}

function safeParseJson(value: unknown): ResumeStructuredContent {
  if (value && typeof value === "object") {
    return value as ResumeStructuredContent;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object"
        ? (parsed as ResumeStructuredContent)
        : null;
    } catch {
      return null;
    }
  }

  return null;
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

export function getResumeId(resume: Partial<ResumeItem> | null | undefined): number | null {
  if (!resume) return null;
  return safeNullableNumber(resume.resumeId ?? resume.id);
}

export function getResumeVersionId(
  version: Partial<ResumeVersion> | null | undefined
): number | null {
  if (!version) return null;
  return safeNullableNumber(version.resumeVersionId ?? version.id);
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

function parseResponseData<T>(payload: unknown): T {
  return unwrapResponse<T>(payload);
}

/* =========================================================
   HTTP CORE
========================================================= */

export class ResumeApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "ResumeApiError";
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
  options: ResumeApiRequestOptions = {},
  body?: unknown,
  queryParams?: Record<string, unknown>,
  contentType: "json" | "none" = "json"
): Promise<T> {
  const token = options.token ?? getAccessToken();
  const url = buildUrl(path, queryParams, options.apiBaseUrl);

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (contentType === "json" && body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: options.withCredentials ?? "include",
    body:
      body !== undefined
        ? contentType === "json"
          ? JSON.stringify(body)
          : (body as BodyInit)
        : undefined,
    signal: options.signal,
    cache: "no-store",
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new ResumeApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return parseResponseData<T>(payload);
}

async function requestWithFallback<T>(
  methods: string[],
  paths: string[],
  options: ResumeApiRequestOptions = {},
  body?: unknown,
  queryParams?: Record<string, unknown>,
  contentType: "json" | "none" = "json"
): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    for (const method of methods) {
      try {
        return await request<T>(
          method,
          path,
          options,
          body,
          queryParams,
          contentType
        );
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (lastError instanceof ResumeApiError) {
    throw lastError;
  }

  throw new ResumeApiError("Request failed.", 500, lastError);
}

async function get<T>(
  path: string,
  options?: ResumeApiRequestOptions,
  queryParams?: Record<string, unknown>
): Promise<T> {
  return request<T>("GET", path, options, undefined, queryParams);
}

async function del<T>(
  path: string,
  options?: ResumeApiRequestOptions,
  queryParams?: Record<string, unknown>
): Promise<T> {
  return request<T>("DELETE", path, options, undefined, queryParams);
}

async function uploadMultipart<T>(
  paths: string[],
  formData: FormData,
  options: ResumeApiRequestOptions = {},
  queryParams?: Record<string, unknown>
): Promise<T> {
  const token = options.token ?? getAccessToken();
  let lastError: unknown = null;

  for (const path of paths) {
    const url = buildUrl(path, queryParams, options.apiBaseUrl);

    try {
      const headers = new Headers(options.headers || {});
      headers.set("Accept", "application/json");
      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        credentials: options.withCredentials ?? "include",
        body: formData,
        signal: options.signal,
        cache: "no-store",
      });

      const payload = await parseResponseBody(response);

      if (!response.ok) {
        lastError = new ResumeApiError(
          extractErrorMessage(payload, response.status),
          response.status,
          payload
        );
        continue;
      }

      return parseResponseData<T>(payload);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof ResumeApiError) {
    throw lastError;
  }

  throw new ResumeApiError("Upload failed.", 500, lastError);
}

/* =========================================================
   PATH HELPERS
========================================================= */

function userResumePaths(resumeId?: string | number) {
  if (resumeId === undefined || resumeId === null || resumeId === "") {
    return [RESUME_API_PATHS.CURRENT, RESUME_API_PATHS.LATEST];
  }

  return [
    `${RESUME_API_PATHS.RESUMES}/${resumeId}`,
    `${RESUME_API_PATHS.RESUMES}/${resumeId}/latest`,
  ];
}

function userResumeVersionPaths(
  resumeId: string | number,
  resumeVersionId: string | number
) {
  return [
    `${RESUME_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}`,
    `${RESUME_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}`,
    `${RESUME_API_PATHS.RESUMES}/version/${resumeVersionId}`,
  ];
}

function versionContentPaths(
  resumeId: string | number,
  resumeVersionId: string | number
) {
  return [
    `${RESUME_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/content`,
    `${RESUME_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/content`,
  ];
}

function previewPaths(resumeId: string | number) {
  return [`${RESUME_API_PATHS.RESUMES}/${resumeId}/preview`];
}

function downloadPaths(resumeId: string | number) {
  return [`${RESUME_API_PATHS.RESUMES}/${resumeId}/download`];
}

function currentPreviewPaths() {
  return [`${RESUME_API_PATHS.CURRENT}/preview`, `${RESUME_API_PATHS.LATEST}/preview`];
}

function currentDownloadPaths() {
  return [`${RESUME_API_PATHS.CURRENT}/download`, `${RESUME_API_PATHS.LATEST}/download`];
}

function versionPreviewPaths(resumeId: string | number, resumeVersionId: string | number) {
  return [
    `${RESUME_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/preview`,
    `${RESUME_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/preview`,
    `${RESUME_API_PATHS.RESUMES}/version/${resumeVersionId}/preview`,
  ];
}

function versionDownloadPaths(resumeId: string | number, resumeVersionId: string | number) {
  return [
    `${RESUME_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/download`,
    `${RESUME_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/download`,
    `${RESUME_API_PATHS.RESUMES}/version/${resumeVersionId}/download`,
  ];
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeResumeVersion(version: Partial<ResumeVersion>): ResumeVersion {
  return {
    resumeVersionId: safeNullableNumber(version.resumeVersionId ?? version.id) ?? undefined,
    id: safeNullableNumber(version.id ?? version.resumeVersionId) ?? undefined,
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
    resumeId: safeNullableNumber(resume.resumeId ?? resume.id) ?? undefined,
    id: safeNullableNumber(resume.id ?? resume.resumeId) ?? undefined,
    resumeCode: safeNullableString(resume.resumeCode),
    userId: safeNullableNumber(resume.userId),
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
    rawText: safeNullableString(resume.rawText),
    structuredContentJson: safeParseJson(resume.structuredContentJson),
    latestVersion: resume.latestVersion ? normalizeResumeVersion(resume.latestVersion) : null,
    baseVersion: resume.baseVersion ? normalizeResumeVersion(resume.baseVersion) : null,
    versions: Array.isArray(resume.versions) ? resume.versions.map(normalizeResumeVersion) : [],
    versionCount:
      typeof resume.versionCount === "number"
        ? resume.versionCount
        : safeNullableNumber(resume.versionCount),
  };
}

export function normalizeResumeDetails(resume: Partial<ResumeDetails>): ResumeDetails {
  return normalizeResumeItem(resume);
}

export function normalizeResumeUploadResponse(
  data: Partial<ResumeUploadResponse>
): ResumeUploadResponse {
  return {
    success: Boolean(data.success),
    message: typeof data.message === "string" ? data.message : undefined,
    resume: data.resume ? normalizeResumeDetails(data.resume) : undefined,
    resumeId: safeNullableNumber(data.resumeId),
    resumeCode: safeNullableString(data.resumeCode),
    previewUrl: safeNullableString(data.previewUrl),
    fileUrl: safeNullableString(data.fileUrl),
    downloadUrl: safeNullableString(data.downloadUrl),
  };
}

export function normalizeResumeTailorToolAnswer(
  answer: Partial<ResumeTailorToolAnswer> | null | undefined
): ResumeTailorToolAnswer | null {
  if (!answer) return null;

  const toolName = safeNullableString(answer.toolName);
  const response = safeNullableString(answer.answer);
  const known = safeBoolean(answer.known);
  const notes = safeNullableString(answer.notes);

  if (!toolName && !response && known === null && !notes) return null;

  return {
    toolName,
    answer: response,
    known,
    notes,
  };
}

export function normalizeResumeTailorResult(
  data: Partial<ResumeTailorResult>
): ResumeTailorResult {
  return {
    resumeId: safeNullableNumber(data.resumeId),
    resumeVersionId: safeNullableNumber(data.resumeVersionId ?? data.versionId),
    versionId: safeNullableNumber(data.versionId ?? data.resumeVersionId),
    versionCode: safeNullableString(data.versionCode),
    versionName: safeNullableString(data.versionName),
    versionType: safeNullableString(data.versionType),
    atsScore: safeNullableNumber(data.atsScore),
    rawText: safeNullableString(data.rawText),
    structuredContentJson: safeParseJson(data.structuredContentJson),
    previewUrl: safeNullableString(data.previewUrl),
    downloadUrl: safeNullableString(data.downloadUrl),
    fileUrl: safeNullableString(data.fileUrl),
    detectedTools: uniqueStrings(data.detectedTools),
    missingTools: uniqueStrings(data.missingTools),
    suggestedTools: uniqueStrings(data.suggestedTools),
    requiresToolAnswers: safeBoolean(data.requiresToolAnswers),
    toolQuestions: uniqueStrings(data.toolQuestions),
    createdAt: safeNullableString(data.createdAt),
    updatedAt: safeNullableString(data.updatedAt),
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
  };
}

function buildResumeVersionListQuery(params: ResumeVersionListQueryParams = {}) {
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

/* =========================================================
   RESUME CRUD
========================================================= */

export async function getResumeList(
  params: ResumeListQueryParams = {},
  options?: ResumeApiRequestOptions
): Promise<ApiListResponse<ResumeItem>> {
  const raw = await get<ResumeItem[] | PageableResponse<ResumeItem> | Record<string, unknown>>(
    RESUME_API_PATHS.RESUMES,
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

export async function getResumeById(
  resumeId: string | number,
  options?: ResumeApiRequestOptions
): Promise<ResumeDetails> {
  const raw = await requestWithFallback<ResumeDetails>(
    ["GET"],
    userResumePaths(resumeId),
    options
  );

  return normalizeResumeDetails(raw);
}

export async function getCurrentResume(
  options?: ResumeApiRequestOptions
): Promise<ResumeDetails> {
  const raw = await requestWithFallback<ResumeDetails>(
    ["GET"],
    userResumePaths(),
    options
  );

  return normalizeResumeDetails(raw);
}

export async function uploadResume(
  file: File,
  payload?: {
    title?: string;
    parse?: boolean;
    extractText?: boolean;
  },
  options?: ResumeApiRequestOptions
): Promise<ResumeUploadResponse> {
  if (!(file instanceof File)) {
    throw new Error("Resume file is required.");
  }

  const formData = new FormData();
  formData.append("file", file);

  if (payload?.title) formData.append("title", payload.title);
  if (payload?.parse !== undefined) formData.append("parse", String(payload.parse));
  if (payload?.extractText !== undefined) {
    formData.append("extractText", String(payload.extractText));
  }

  const raw = await uploadMultipart<ResumeUploadResponse>(
    [RESUME_API_PATHS.RESUME_UPLOAD, `${RESUME_API_PATHS.RESUMES}/upload`],
    formData,
    options
  );

  return normalizeResumeUploadResponse(raw);
}

export async function updateResume(
  resumeId: string | number,
  payload: UpdateResumePayload,
  options?: ResumeApiRequestOptions
): Promise<ResumeDetails> {
  const raw = await requestWithFallback<ResumeDetails>(
    ["PUT", "PATCH"],
    [`${RESUME_API_PATHS.RESUMES}/${resumeId}`],
    options,
    buildUpdateResumePayload(payload)
  );

  return normalizeResumeDetails(raw);
}

export async function deleteResume(
  resumeId: string | number,
  options?: ResumeApiRequestOptions
): Promise<{ success: boolean; message?: string }> {
  const raw = await del<{ success?: boolean; message?: string }>(
    `${RESUME_API_PATHS.RESUMES}/${resumeId}`,
    options
  );

  return {
    success: raw?.success ?? true,
    message: raw?.message ?? undefined,
  };
}

export async function updateResumeStatus(
  resumeId: string | number,
  payload: UpdateResumeStatusPayload,
  options?: ResumeApiRequestOptions
): Promise<ResumeDetails> {
  const raw = await requestWithFallback<ResumeDetails>(
    ["PATCH", "PUT"],
    [`${RESUME_API_PATHS.RESUMES}/${resumeId}/status`],
    options,
    payload
  );

  return normalizeResumeDetails(raw);
}

/* =========================================================
   RESUME VERSIONS
========================================================= */

export async function getResumeVersions(
  resumeId: string | number,
  params: ResumeVersionListQueryParams = {},
  options?: ResumeApiRequestOptions
): Promise<ApiListResponse<ResumeVersion>> {
  const raw = await get<
    ResumeVersion[] | PageableResponse<ResumeVersion> | Record<string, unknown>
  >(
    `${RESUME_API_PATHS.RESUMES}/${resumeId}/versions`,
    options,
    buildResumeVersionListQuery(params)
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

export async function getResumeVersionById(
  resumeId: string | number,
  resumeVersionId: string | number,
  options?: ResumeApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await requestWithFallback<ResumeVersion>(
    ["GET"],
    userResumeVersionPaths(resumeId, resumeVersionId),
    options
  );

  return normalizeResumeVersion(raw);
}

export async function createResumeVersion(
  resumeId: string | number,
  payload: CreateResumeVersionPayload,
  options?: ResumeApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await requestWithFallback<ResumeVersion>(
    ["POST"],
    [`${RESUME_API_PATHS.RESUMES}/${resumeId}/versions`],
    options,
    buildCreateResumeVersionPayload(payload)
  );

  return normalizeResumeVersion(raw);
}

export async function updateResumeVersion(
  resumeId: string | number,
  resumeVersionId: string | number,
  payload: UpdateResumeVersionPayload,
  options?: ResumeApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await requestWithFallback<ResumeVersion>(
    ["PUT", "PATCH"],
    [
      `${RESUME_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}`,
      `${RESUME_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}`,
    ],
    options,
    buildUpdateResumeVersionPayload(payload)
  );

  return normalizeResumeVersion(raw);
}

export async function updateResumeVersionContent(
  resumeId: string | number,
  resumeVersionId: string | number,
  payload: UpdateResumeVersionContentPayload,
  options?: ResumeApiRequestOptions
): Promise<ResumeVersion | ResumeDetails> {
  const raw = await requestWithFallback<ResumeVersion | ResumeDetails>(
    ["PUT", "PATCH"],
    versionContentPaths(resumeId, resumeVersionId),
    options,
    buildUpdateResumeVersionContentPayload(payload)
  );

  if ((raw as ResumeVersion)?.resumeVersionId || (raw as ResumeVersion)?.id) {
    return normalizeResumeVersion(raw as ResumeVersion);
  }

  return normalizeResumeDetails(raw as ResumeDetails);
}

export async function updateResumeVersionStatus(
  resumeId: string | number,
  resumeVersionId: string | number,
  payload: UpdateResumeStatusPayload,
  options?: ResumeApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await requestWithFallback<ResumeVersion>(
    ["PATCH", "PUT"],
    [
      `${RESUME_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/status`,
      `${RESUME_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/status`,
    ],
    options,
    payload
  );

  return normalizeResumeVersion(raw);
}

export async function deleteResumeVersion(
  resumeId: string | number,
  resumeVersionId: string | number,
  options?: ResumeApiRequestOptions
): Promise<{ success: boolean; message?: string }> {
  const raw = await requestWithFallback<{ success?: boolean; message?: string }>(
    ["DELETE"],
    [
      `${RESUME_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}`,
      `${RESUME_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}`,
    ],
    options
  );

  return {
    success: raw?.success ?? true,
    message: raw?.message ?? undefined,
  };
}

/* =========================================================
   TAILORING / ATS
========================================================= */

export async function pingResumeTailor(
  options?: ResumeApiRequestOptions
): Promise<{ success: boolean; message?: string }> {
  const raw = await get<{ success?: boolean; message?: string }>(
    `${RESUME_API_PATHS.TAILOR_BASE}/ping`,
    options
  );

  return {
    success: raw?.success ?? true,
    message: raw?.message ?? undefined,
  };
}

export async function extractResumeTailorTools(
  payload: ExtractToolsPayload,
  options?: ResumeApiRequestOptions
): Promise<ResumeTailorResult> {
  const raw = await request<ResumeTailorResult>(
    "POST",
    `${RESUME_API_PATHS.TAILOR_BASE}/extract-tools`,
    options,
    buildExtractToolsPayload(payload)
  );

  return normalizeResumeTailorResult(raw);
}

export async function applyResumeTailor(
  payload: TailorResumePayload,
  options?: ResumeApiRequestOptions
): Promise<ResumeTailorResult> {
  const raw = await request<ResumeTailorResult>(
    "POST",
    `${RESUME_API_PATHS.TAILOR_BASE}/apply`,
    options,
    buildTailorResumePayload(payload)
  );

  return normalizeResumeTailorResult(raw);
}

export async function submitResumeTailorToolAnswers(
  payload: ToolKnowledgeAnswerPayload,
  options?: ResumeApiRequestOptions
): Promise<ResumeTailorResult> {
  const raw = await request<ResumeTailorResult>(
    "POST",
    `${RESUME_API_PATHS.TAILOR_BASE}/tool-answers`,
    options,
    buildToolKnowledgeAnswerPayload(payload)
  );

  return normalizeResumeTailorResult(raw);
}

export async function tailorResume(
  resumeId: string | number,
  payload: {
    jobDescription: string;
    versionName?: string;
    jobApplicationCode?: string;
    preserveBaseVersion?: boolean;
    targetRole?: string;
    targetCompany?: string;
    notes?: string;
    resumeVersionId?: number | string;
  },
  options?: ResumeApiRequestOptions
): Promise<ResumeTailorResult> {
  const resumeVersionId =
    payload.resumeVersionId !== undefined && payload.resumeVersionId !== null
      ? payload.resumeVersionId
      : null;

  if (!resumeVersionId) {
    throw new Error("resumeVersionId is required for the latest tailoring flow.");
  }

  const raw = await applyResumeTailor(
    {
      resumeVersionId,
      jobDescription: payload.jobDescription,
      companyName: payload.targetCompany,
      jobTitle: payload.targetRole,
      additionalNotes: payload.notes,
      knownTools: [],
      unknownTools: [],
    },
    options
  );

  return normalizeResumeTailorResult(raw);
}

export async function calculateResumeAtsScore(
  resumeId: string | number,
  payload?: AtsScoreRequestPayload,
  options?: ResumeApiRequestOptions
): Promise<AtsScoreResponse> {
  const raw = await requestWithFallback<AtsScoreResponse>(
    ["POST", "PUT"],
    [`${RESUME_API_PATHS.RESUMES}/${resumeId}/ats-score`],
    options,
    payload || {}
  );

  return {
    success: Boolean(raw?.success),
    message: typeof raw?.message === "string" ? raw.message : undefined,
    atsScore:
      typeof raw?.atsScore === "number"
        ? raw.atsScore
        : safeNullableNumber(raw?.atsScore),
    score:
      typeof raw?.score === "number"
        ? raw.score
        : safeNullableNumber(raw?.score),
    suggestions: Array.isArray(raw?.suggestions) ? raw.suggestions : [],
    keywordsMatched: Array.isArray(raw?.keywordsMatched) ? raw.keywordsMatched : [],
    keywordsMissing: Array.isArray(raw?.keywordsMissing) ? raw.keywordsMissing : [],
  };
}

export async function calculateResumeVersionAtsScore(
  resumeId: string | number,
  resumeVersionId: string | number,
  payload?: AtsScoreRequestPayload,
  options?: ResumeApiRequestOptions
): Promise<AtsScoreResponse> {
  const raw = await requestWithFallback<AtsScoreResponse>(
    ["POST", "PUT"],
    [
      `${RESUME_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}/ats-score`,
      `${RESUME_API_PATHS.RESUMES}/${resumeId}/version/${resumeVersionId}/ats-score`,
    ],
    options,
    payload || {}
  );

  return {
    success: Boolean(raw?.success),
    message: typeof raw?.message === "string" ? raw.message : undefined,
    atsScore:
      typeof raw?.atsScore === "number"
        ? raw.atsScore
        : safeNullableNumber(raw?.atsScore),
    score:
      typeof raw?.score === "number"
        ? raw.score
        : safeNullableNumber(raw?.score),
    suggestions: Array.isArray(raw?.suggestions) ? raw.suggestions : [],
    keywordsMatched: Array.isArray(raw?.keywordsMatched) ? raw.keywordsMatched : [],
    keywordsMissing: Array.isArray(raw?.keywordsMissing) ? raw.keywordsMissing : [],
  };
}

/* =========================================================
   URL HELPERS
========================================================= */

export function getCurrentResumePreviewUrl(apiBaseUrl?: string): string {
  return buildUrl(currentPreviewPaths()[0], undefined, apiBaseUrl);
}

export function getCurrentResumeDownloadUrl(apiBaseUrl?: string): string {
  return buildUrl(currentDownloadPaths()[0], undefined, apiBaseUrl);
}

export function getResumePreviewUrl(
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

  return buildUrl(previewPaths(resumeId)[0], undefined, apiBaseUrl);
}

export function getResumeDownloadUrl(
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

  return buildUrl(downloadPaths(resumeId)[0], undefined, apiBaseUrl);
}

export function getResumeVersionPreviewUrl(
  version: Partial<ResumeVersion> | null | undefined,
  resumeId?: string | number,
  apiBaseUrl?: string
): string | null {
  if (!version) return null;
  if (version.previewUrl) return version.previewUrl;
  if (version.fileUrl) return version.fileUrl;

  const versionId = getResumeVersionId(version);
  if (!versionId || !resumeId) return null;

  return buildUrl(versionPreviewPaths(resumeId, versionId)[0], undefined, apiBaseUrl);
}

export function getResumeVersionDownloadUrl(
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

  return buildUrl(versionDownloadPaths(resumeId, versionId)[0], undefined, apiBaseUrl);
}

/* =========================================================
   DOMAIN HELPERS
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
    const base = resume.versions.find((v) => v.isBaseVersion);
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

export function getResumeDisplayTitle(
  resume: Partial<ResumeItem> | Partial<ResumeDetails> | null | undefined
): string {
  if (!resume) return "Resume";
  return (
    resume.title ||
    resume.originalFileName ||
    resume.fileName ||
    resume.fullName ||
    resume.resumeCode ||
    "Resume"
  );
}

export function getResumeStatusBadgeClass(status?: string | null): string {
  const normalized = (status || "").toUpperCase();

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

export function getAtsScoreBadgeClass(score?: number | null): string {
  if (score === null || score === undefined) {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }
  if (score >= 80) return "border-green-200 bg-green-100 text-green-700";
  if (score >= 60) return "border-yellow-200 bg-yellow-100 text-yellow-700";
  return "border-red-200 bg-red-100 text-red-700";
}

/* =========================================================
   PAYLOAD BUILDERS
========================================================= */

export function buildUpdateResumePayload(input: UpdateResumePayload): UpdateResumePayload {
  return {
    title: safeString(input.title).trim() || undefined,
    fullName: safeString(input.fullName).trim() || undefined,
    email: safeString(input.email).trim() || undefined,
    phone: safeString(input.phone).trim() || undefined,
    location: safeString(input.location).trim() || undefined,
    summary: safeString(input.summary).trim() || undefined,
    currentRole: safeString(input.currentRole).trim() || undefined,
    experienceLevel: safeString(input.experienceLevel).trim() || undefined,
    status: input.status,
    structuredContentJson:
      input.structuredContentJson && typeof input.structuredContentJson === "object"
        ? input.structuredContentJson
        : input.structuredContentJson ?? undefined,
    rawText:
      typeof input.rawText === "string" ? input.rawText : input.rawText ?? undefined,
  };
}

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
        : input.structuredContentJson ?? null,
    fileUrl: safeString(input.fileUrl).trim() || null,
    previewUrl: safeString(input.previewUrl).trim() || null,
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
        : input.structuredContentJson ?? null,
    fileUrl: safeString(input.fileUrl).trim() || null,
    previewUrl: safeString(input.previewUrl).trim() || null,
    atsScore: typeof input.atsScore === "number" ? input.atsScore : null,
    status: input.status,
  };
}

export function buildUpdateResumeVersionContentPayload(
  input: UpdateResumeVersionContentPayload
): UpdateResumeVersionContentPayload {
  return {
    rawText: typeof input.rawText === "string" ? input.rawText : null,
    structuredContentJson:
      input.structuredContentJson && typeof input.structuredContentJson === "object"
        ? input.structuredContentJson
        : input.structuredContentJson ?? null,
    regeneratePreview:
      typeof input.regeneratePreview === "boolean"
        ? input.regeneratePreview
        : undefined,
  };
}

export function buildExtractToolsPayload(
  input: ExtractToolsPayload
): ExtractToolsPayload {
  const jobDescription = safeString(input.jobDescription).trim();
  if (!jobDescription) {
    throw new Error("Job description is required.");
  }

  return {
    resumeVersionId: input.resumeVersionId,
    companyName: safeString(input.companyName).trim() || undefined,
    jobTitle: safeString(input.jobTitle).trim() || undefined,
    jobDescription,
    additionalNotes: safeString(input.additionalNotes).trim() || undefined,
  };
}

export function buildTailorResumePayload(input: TailorResumePayload): TailorResumePayload {
  const jobDescription = safeString(input.jobDescription).trim();
  if (!jobDescription) {
    throw new Error("Job description is required.");
  }

  if (input.resumeVersionId === undefined || input.resumeVersionId === null || input.resumeVersionId === "") {
    throw new Error("resumeVersionId is required.");
  }

  return {
    resumeVersionId: input.resumeVersionId,
    companyName: safeString(input.companyName).trim() || undefined,
    jobTitle: safeString(input.jobTitle).trim() || undefined,
    jobDescription,
    knownTools: uniqueStrings(input.knownTools),
    unknownTools: uniqueStrings(input.unknownTools),
    additionalNotes: safeString(input.additionalNotes).trim() || undefined,
  };
}

export function buildToolKnowledgeAnswerPayload(
  input: ToolKnowledgeAnswerPayload
): ToolKnowledgeAnswerPayload {
  return {
    resumeVersionId: input.resumeVersionId,
    companyName: safeString(input.companyName).trim() || undefined,
    jobTitle: safeString(input.jobTitle).trim() || undefined,
    jobDescription: safeString(input.jobDescription).trim() || undefined,
    toolAnswers: Array.isArray(input.toolAnswers)
      ? input.toolAnswers
          .map((item) => normalizeResumeTailorToolAnswer(item))
          .filter((item): item is ResumeTailorToolAnswer => Boolean(item))
      : [],
    additionalNotes: safeString(input.additionalNotes).trim() || undefined,
  };
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const resumeApi = {
  getResumeList,
  getResumeById,
  getCurrentResume,
  uploadResume,
  updateResume,
  deleteResume,
  updateResumeStatus,

  getResumeVersions,
  getResumeVersionById,
  createResumeVersion,
  updateResumeVersion,
  updateResumeVersionContent,
  updateResumeVersionStatus,
  deleteResumeVersion,

  pingResumeTailor,
  extractResumeTailorTools,
  applyResumeTailor,
  submitResumeTailorToolAnswers,
  tailorResume,
  calculateResumeAtsScore,
  calculateResumeVersionAtsScore,

  getCurrentResumePreviewUrl,
  getCurrentResumeDownloadUrl,
  getResumePreviewUrl,
  getResumeDownloadUrl,
  getResumeVersionPreviewUrl,
  getResumeVersionDownloadUrl,

  normalizeResumeItem,
  normalizeResumeDetails,
  normalizeResumeVersion,
  normalizeResumeUploadResponse,
  normalizeResumeTailorResult,
  normalizeResumeTailorToolAnswer,

  getResumeId,
  getResumeVersionId,
  getLatestResumeVersion,
  getBaseResumeVersion,
  getResumeVersionCount,
  dedupeResumeVersions,
  getResumeDisplayTitle,
  getResumeStatusBadgeClass,
  getAtsScoreBadgeClass,

  buildUpdateResumePayload,
  buildCreateResumeVersionPayload,
  buildUpdateResumeVersionPayload,
  buildUpdateResumeVersionContentPayload,
  buildExtractToolsPayload,
  buildTailorResumePayload,
  buildToolKnowledgeAnswerPayload,
};

/* =========================================================
   EXAMPLE USAGE

   import { resumeApi } from "@/lib/resumeApi";

   const resumes = await resumeApi.getResumeList({
     page: 0,
     size: 10,
     search: "frontend",
   });

   const uploaded = await resumeApi.uploadResume(file, {
     title: "My Resume",
     parse: true,
   });

   const details = await resumeApi.getResumeById(1);

   const tools = await resumeApi.extractResumeTailorTools({
     resumeVersionId: 12,
     jobDescription: "Frontend React developer...",
   });

   const tailored = await resumeApi.applyResumeTailor({
     resumeVersionId: 12,
     jobDescription: "Frontend React developer...",
     jobTitle: "Frontend Developer",
     companyName: "OpenAI",
   });
========================================================= */