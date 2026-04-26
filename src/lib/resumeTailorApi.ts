// src/lib/resumeTailorApi.ts
//
// Central Resume Tailoring API client for frontend ↔ backend integration.
//
// Purpose:
// - Single reusable API layer for resume tailoring flows
// - Supports latest backend tailoring flow:
//   - extract tools from JD
//   - submit tool answers
//   - apply tailoring
//   - ping backend tailor module
// - Supports:
//   - tailored version generation
//   - ATS/result metadata normalization
//   - preview/download helpers
//   - version lookup helpers
//
// Latest project update alignment:
// - Uses backend controller routes under /api/user/resume/tailor/*
// - Aligned with ResumeTailorRequest, ToolKnowledgeAnswerRequest,
//   ResumeTailorResponse, and ApiResponse wrapper usage
// - Preserves backend-first frontend ideology
// - Works with Spring Boot backend and cookie/session auth
//
// Backend endpoints:
//   POST /api/user/resume/tailor/extract-tools
//   POST /api/user/resume/tailor/apply
//   POST /api/user/resume/tailor/tool-answers
//   GET  /api/user/resume/tailor/ping
//
// Related resume endpoints used for helpers:
//   GET  /api/user/resume/{resumeId}/versions/{resumeVersionId}
//   GET  /api/user/resume/{resumeId}/versions/{resumeVersionId}/preview
//   GET  /api/user/resume/{resumeId}/versions/{resumeVersionId}/download
//
// Supported response styles:
// - plain object / plain array
// - wrapped { data | result | payload | content }
// - nested wrapped payloads

export const RESUME_TAILOR_API_PATHS = {
  BASE: "/api/user/resume/tailor",
  EXTRACT_TOOLS: "/api/user/resume/tailor/extract-tools",
  APPLY: "/api/user/resume/tailor/apply",
  TOOL_ANSWERS: "/api/user/resume/tailor/tool-answers",
  PING: "/api/user/resume/tailor/ping",
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
  status?: number;
  timestamp?: string;
  path?: string;
  data?: T | null;
  result?: T | null;
  payload?: T | null;
  content?: T | null;
};

export type ResumeStructuredContent = Record<string, unknown> | null;

export type ResumeVersionType =
  | "BASE"
  | "TAILORED"
  | "DUPLICATE"
  | "JOB_TARGETED"
  | "CUSTOM"
  | string;

export type ResumeVersionStatus =
  | "ACTIVE"
  | "DRAFT"
  | "PROCESSED"
  | "ARCHIVED"
  | string;

export type ResumeVersion = {
  resumeVersionId?: number;
  id?: number;
  resumeId?: number | null;

  versionCode?: string | null;
  versionName?: string | null;
  versionType?: ResumeVersionType | null;

  atsScore?: number | null;
  isBaseVersion?: boolean | null;
  parentVersionId?: number | null;

  rawText?: string | null;
  structuredContentJson?: ResumeStructuredContent;

  fileUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;

  jobApplicationCode?: string | null;
  status?: ResumeVersionStatus | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ResumeTailorToolAnswer = {
  toolName?: string | null;
  answer?: string | null;
  known?: boolean | null;
  notes?: string | null;
};

export type ResumeTailorRequest = {
  resumeVersionId: number | string;
  companyName?: string;
  jobTitle?: string;
  jobDescription: string;
  knownTools?: string[];
  unknownTools?: string[];
  additionalNotes?: string;
};

export type ToolKnowledgeAnswerRequest = {
  resumeVersionId?: number | string;
  companyName?: string;
  jobTitle?: string;
  jobDescription?: string;
  toolAnswers: ResumeTailorToolAnswer[];
  additionalNotes?: string;
};

export type ResumeTailorResponse = {
  resumeId?: number | null;
  resumeVersionId?: number | null;
  versionId?: number | null;

  versionCode?: string | null;
  versionName?: string | null;
  versionType?: string | null;

  atsScore?: number | null;

  rawText?: string | null;
  structuredContentJson?: ResumeStructuredContent;

  fileUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;

  detectedTools?: string[];
  missingTools?: string[];
  suggestedTools?: string[];
  requiresToolAnswers?: boolean | null;
  toolQuestions?: string[];

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ResumeTailorApiRequestOptions = {
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

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeNullableNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

export function getResumeVersionId(
  version: Partial<ResumeVersion> | null | undefined
): number | null {
  if (!version) return null;
  return safeNullableNumber(version.resumeVersionId ?? version.id);
}

/* =========================================================
   HTTP CORE
========================================================= */

export class ResumeTailorApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "ResumeTailorApiError";
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
  options: ResumeTailorApiRequestOptions = {},
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
    throw new ResumeTailorApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return unwrapResponse<T>(payload);
}

async function get<T>(
 path: string,
  options?: ResumeTailorApiRequestOptions,
  queryParams?: Record<string, unknown>
): Promise<T> {
  return request<T>("GET", path, options, undefined, queryParams);
}

async function post<T>(
  path: string,
  body?: unknown,
  options?: ResumeTailorApiRequestOptions,
  queryParams?: Record<string, unknown>
): Promise<T> {
  return request<T>("POST", path, options, body, queryParams);
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeResumeVersion(
  version: Partial<ResumeVersion>
): ResumeVersion {
  return {
    resumeVersionId: safeNullableNumber(version.resumeVersionId ?? version.id) ?? undefined,
    id: safeNullableNumber(version.id ?? version.resumeVersionId) ?? undefined,
    resumeId: safeNullableNumber(version.resumeId),

    versionCode: safeNullableString(version.versionCode),
    versionName: safeNullableString(version.versionName),
    versionType: version.versionType ?? null,

    atsScore: safeNullableNumber(version.atsScore),
    isBaseVersion: safeBoolean(version.isBaseVersion),
    parentVersionId: safeNullableNumber(version.parentVersionId),

    rawText: safeNullableString(version.rawText),
    structuredContentJson: safeParseJson(version.structuredContentJson),

    fileUrl: safeNullableString(version.fileUrl),
    previewUrl: safeNullableString(version.previewUrl),
    downloadUrl: safeNullableString(version.downloadUrl),

    jobApplicationCode: safeNullableString(version.jobApplicationCode),
    status: version.status ?? null,

    createdAt: safeNullableString(version.createdAt),
    updatedAt: safeNullableString(version.updatedAt),
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

export function normalizeResumeTailorResponse(
  data: Partial<ResumeTailorResponse>
): ResumeTailorResponse {
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

    fileUrl: safeNullableString(data.fileUrl),
    previewUrl: safeNullableString(data.previewUrl),
    downloadUrl: safeNullableString(data.downloadUrl),

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
   PAYLOAD BUILDERS
========================================================= */

export function buildResumeTailorRequest(
  input: ResumeTailorRequest
): ResumeTailorRequest {
  const jobDescription = safeString(input.jobDescription).trim();
  if (!jobDescription) {
    throw new Error("Job description is required.");
  }

  if (
    input.resumeVersionId === undefined ||
    input.resumeVersionId === null ||
    input.resumeVersionId === ""
  ) {
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

export function buildToolKnowledgeAnswerRequest(
  input: ToolKnowledgeAnswerRequest
): ToolKnowledgeAnswerRequest {
  return {
    resumeVersionId:
      input.resumeVersionId !== undefined &&
      input.resumeVersionId !== null &&
      input.resumeVersionId !== ""
        ? input.resumeVersionId
        : undefined,
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
   API METHODS
========================================================= */

export async function pingResumeTailor(
  options?: ResumeTailorApiRequestOptions
): Promise<{ success: boolean; message?: string }> {
  const raw = await get<{ success?: boolean; message?: string }>(
    RESUME_TAILOR_API_PATHS.PING,
    options
  );

  return {
    success: raw?.success ?? true,
    message: raw?.message ?? undefined,
  };
}

export async function extractResumeTailorTools(
  payload: ResumeTailorRequest,
  options?: ResumeTailorApiRequestOptions
): Promise<ResumeTailorResponse> {
  const raw = await post<ResumeTailorResponse>(
    RESUME_TAILOR_API_PATHS.EXTRACT_TOOLS,
    buildResumeTailorRequest(payload),
    options
  );

  return normalizeResumeTailorResponse(raw);
}

export async function applyResumeTailor(
  payload: ResumeTailorRequest,
  options?: ResumeTailorApiRequestOptions
): Promise<ResumeTailorResponse> {
  const raw = await post<ResumeTailorResponse>(
    RESUME_TAILOR_API_PATHS.APPLY,
    buildResumeTailorRequest(payload),
    options
  );

  return normalizeResumeTailorResponse(raw);
}

export async function submitResumeTailorToolAnswers(
  payload: ToolKnowledgeAnswerRequest,
  options?: ResumeTailorApiRequestOptions
): Promise<ResumeTailorResponse> {
  const raw = await post<ResumeTailorResponse>(
    RESUME_TAILOR_API_PATHS.TOOL_ANSWERS,
    buildToolKnowledgeAnswerRequest(payload),
    options
  );

  return normalizeResumeTailorResponse(raw);
}

/* =========================================================
   VERSION HELPERS
========================================================= */

export async function getTailoredResumeVersion(
  resumeId: string | number,
  resumeVersionId: string | number,
  options?: ResumeTailorApiRequestOptions
): Promise<ResumeVersion> {
  const raw = await get<ResumeVersion>(
    `${RESUME_TAILOR_API_PATHS.RESUMES}/${resumeId}/versions/${resumeVersionId}`,
    options
  );

  return normalizeResumeVersion(raw);
}

export function getTailoredResumePreviewUrl(
  item:
    | Partial<ResumeTailorResponse>
    | Partial<ResumeVersion>
    | null
    | undefined,
  resumeId?: string | number,
  apiBaseUrl?: string
): string | null {
  if (!item) return null;

  if ("previewUrl" in item && item.previewUrl) {
    return item.previewUrl;
  }

  const resolvedResumeId =
    safeNullableNumber((item as Partial<ResumeVersion>).resumeId) ??
    (resumeId !== undefined && resumeId !== null ? Number(resumeId) : null);

  const resolvedVersionId =
    safeNullableNumber(
      (item as Partial<ResumeTailorResponse>).resumeVersionId ??
        (item as Partial<ResumeTailorResponse>).versionId ??
        (item as Partial<ResumeVersion>).resumeVersionId ??
        (item as Partial<ResumeVersion>).id
    );

  if (!resolvedResumeId || !resolvedVersionId) return null;

  return buildUrl(
    `${RESUME_TAILOR_API_PATHS.RESUMES}/${resolvedResumeId}/versions/${resolvedVersionId}/preview`,
    undefined,
    apiBaseUrl
  );
}

export function getTailoredResumeDownloadUrl(
  item:
    | Partial<ResumeTailorResponse>
    | Partial<ResumeVersion>
    | null
    | undefined,
  resumeId?: string | number,
  apiBaseUrl?: string
): string | null {
  if (!item) return null;

  if ("downloadUrl" in item && item.downloadUrl) {
    return item.downloadUrl;
  }

  if ("fileUrl" in item && item.fileUrl) {
    return item.fileUrl;
  }

  const resolvedResumeId =
    safeNullableNumber((item as Partial<ResumeVersion>).resumeId) ??
    (resumeId !== undefined && resumeId !== null ? Number(resumeId) : null);

  const resolvedVersionId =
    safeNullableNumber(
      (item as Partial<ResumeTailorResponse>).resumeVersionId ??
        (item as Partial<ResumeTailorResponse>).versionId ??
        (item as Partial<ResumeVersion>).resumeVersionId ??
        (item as Partial<ResumeVersion>).id
    );

  if (!resolvedResumeId || !resolvedVersionId) return null;

  return buildUrl(
    `${RESUME_TAILOR_API_PATHS.RESUMES}/${resolvedResumeId}/versions/${resolvedVersionId}/download`,
    undefined,
    apiBaseUrl
  );
}

/* =========================================================
   UI HELPERS
========================================================= */

export function getResumeTailorStatusBadgeClass(
  status?: string | null
): string {
  const normalized = (status || "").toUpperCase();

  if (["COMPLETED", "ACCEPTED"].includes(normalized)) {
    return "border-green-200 bg-green-100 text-green-700";
  }

  if (["PENDING", "PROCESSING"].includes(normalized)) {
    return "border-blue-200 bg-blue-100 text-blue-700";
  }

  if (["FAILED", "REJECTED"].includes(normalized)) {
    return "border-red-200 bg-red-100 text-red-700";
  }

  if (["ARCHIVED"].includes(normalized)) {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }

  return "border-yellow-200 bg-yellow-100 text-yellow-700";
}

export function getTailorDisplayTitle(
  item: Partial<ResumeTailorResponse> | Partial<ResumeVersion> | null | undefined
): string {
  if (!item) return "Tailored Resume";

  return (
    safeNullableString((item as Partial<ResumeTailorResponse>).versionName) ||
    safeNullableString((item as Partial<ResumeVersion>).versionName) ||
    safeNullableString((item as Partial<ResumeTailorResponse>).versionCode) ||
    "Tailored Resume"
  );
}

export function getTailorToolSummary(
  item: Partial<ResumeTailorResponse> | null | undefined
): {
  detectedTools: string[];
  missingTools: string[];
  suggestedTools: string[];
} {
  return {
    detectedTools: uniqueStrings(item?.detectedTools),
    missingTools: uniqueStrings(item?.missingTools),
    suggestedTools: uniqueStrings(item?.suggestedTools),
  };
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const resumeTailorApi = {
  pingResumeTailor,
  extractResumeTailorTools,
  applyResumeTailor,
  submitResumeTailorToolAnswers,

  getTailoredResumeVersion,
  getTailoredResumePreviewUrl,
  getTailoredResumeDownloadUrl,

  normalizeResumeVersion,
  normalizeResumeTailorToolAnswer,
  normalizeResumeTailorResponse,

  buildResumeTailorRequest,
  buildToolKnowledgeAnswerRequest,

  getResumeVersionId,
  getResumeTailorStatusBadgeClass,
  getTailorDisplayTitle,
  getTailorToolSummary,
};

/* =========================================================
   EXAMPLE USAGE

   import { resumeTailorApi } from "@/lib/resumeTailorApi";

   const tools = await resumeTailorApi.extractResumeTailorTools({
     resumeVersionId: 12,
     jobDescription: "Looking for a React frontend developer...",
     jobTitle: "Frontend Engineer",
     companyName: "OpenAI",
   });

   const tailored = await resumeTailorApi.applyResumeTailor({
     resumeVersionId: 12,
     jobDescription: "Looking for a React frontend developer...",
     jobTitle: "Frontend Engineer",
     companyName: "OpenAI",
     knownTools: ["React", "TypeScript"],
     unknownTools: ["GraphQL"],
   });

   const withAnswers = await resumeTailorApi.submitResumeTailorToolAnswers({
     resumeVersionId: 12,
     toolAnswers: [
       { toolName: "GraphQL", known: false, answer: "Limited exposure" },
     ],
   });
========================================================= */