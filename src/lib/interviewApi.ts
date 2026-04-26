// src/lib/interviewApi.ts
//
// Central Interview API client for frontend ↔ backend integration.
//
// Purpose:
// - Single reusable API layer for interview flows
// - Aligned with the latest Interview System / Resume Management System architecture
// - Supports:
//   - interview session listing/fetching
//   - interview session lifecycle actions
//   - question retrieval
//   - answer submission
//   - transcript retrieval
//   - evaluation retrieval
//   - config / help / health endpoints
//   - resilient backend response normalization
//
// Backend alignment:
// - Spring Boot backend is the only service called by frontend
// - AI-engine remains backend orchestrated
// - Cookie/session auth via credentials: "include"
// - Bearer token fallback for legacy/localStorage auth flow
// - Compatible with wrapped responses:
//   { data | result | payload | content }
//
// Recommended backend endpoints:
//   GET  /api/interview/health
//   GET  /api/interview/ping
//   GET  /api/interview/config
//   GET  /api/interview/help/mock
//   GET  /api/interview/session/{sessionId}
//   POST /api/interview/session/{sessionId}/start
//   POST /api/interview/session/{sessionId}/end
//   POST /api/interview/session/{sessionId}/cancel
//   GET  /api/interview/session/{sessionId}/questions
//   GET  /api/interview/session/{sessionId}/transcript
//   POST /api/interview/session/{sessionId}/answer
//   GET  /api/interview/evaluation/{sessionId}
//   GET  /api/user/interview/sessions
//   GET  /api/admin/interview/sessions
//
// Notes:
// - This file is client-safe.
// - It can also be used in server-side contexts if token/cookies are passed explicitly.

export const INTERVIEW_API_PATHS = {
  BASE: "/api/interview",
  HEALTH: "/api/interview/health",
  PING: "/api/interview/ping",
  CONFIG: "/api/interview/config",
  HELP_MOCK: "/api/interview/help/mock",
  SESSION_BASE: "/api/interview/session",
  EVALUATION_BASE: "/api/interview/evaluation",
  USER_SESSIONS: "/api/user/interview/session",
  ADMIN_SESSIONS: "/api/admin/interview/sessions",
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

export type SortDirection = "asc" | "desc";

export type InterviewMode =
  | "TEXT"
  | "VOICE"
  | "VIDEO"
  | "MIXED"
  | string;

export type InterviewType =
  | "TECHNICAL"
  | "HR"
  | "BEHAVIORAL"
  | "SYSTEM_DESIGN"
  | "GENERAL"
  | string;

export type InterviewStatus =
  | "DRAFT"
  | "CREATED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "EVALUATED"
  | "CANCELLED"
  | "FAILED"
  | string;

export type InterviewSession = {
  interviewSessionId?: number | string;
  sessionId?: number | string;
  id?: number | string;

  title?: string | null;
  name?: string | null;
  jobTitle?: string | null;
  companyName?: string | null;

  mode?: InterviewMode | null;
  type?: InterviewType | null;
  status?: InterviewStatus | null;

  startedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  language?: string | null;
  interviewLanguage?: string | null;
  preferredLanguage?: string | null;
  speechLanguage?: string | null;
  locale?: string | null;

  allowMixedLanguage?: boolean | null;
  requiresClearSpeech?: boolean | null;
  voiceInputEnabled?: boolean | null;
  textInputEnabled?: boolean | null;

  languageNotice?: string | null;
  communicationInstructions?: string | null;
};

export type InterviewQuestionResponse = {
  questionId?: number | string;
  sessionId?: number | string;
  turnId?: number | string;
  question?: string | null;
  title?: string | null;
  questionType?: string | null;
  category?: string | null;
  difficulty?: number | null;
  questionIndex?: number | null;
  totalQuestions?: number | null;
  expectedAnswerTimeSeconds?: number | null;
  hintAllowed?: boolean | null;
  sampleAnswerAllowed?: boolean | null;
  resumeBased?: boolean | null;
  githubBased?: boolean | null;
  jobDescriptionBased?: boolean | null;
  sourceSummary?: string | null;
  targetSkills?: string[];
  followUpHint?: string | null;
  mockGuidance?: string | null;
  sampleAnswerOutline?: string[];
  tags?: string[];
  finalQuestion?: boolean | null;
  generatedAt?: string | null;
  message?: string | null;
};

export type InterviewAnswer = {
  id?: number | string;
  answerId?: number | string;
  questionId?: number | string;
  answer?: string | null;
  answerText?: string | null;
  content?: string | null;
  feedback?: string | null;
  score?: number | null;
  createdAt?: string | null;
};

export type InterviewTranscriptItem = {
  id?: number | string;
  transcriptId?: number | string;
  messageId?: number | string;
  speaker?: string | null;
  role?: string | null;
  text?: string | null;
  content?: string | null;
  message?: string | null;
  type?: string | null;
  eventType?: string | null;
  timestamp?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type InterviewCategoryScore = {
  name?: string | null;
  score?: number | null;
  feedback?: string | null;
};

export type InterviewEvaluation = {
  sessionId?: number | string;
  interviewSessionId?: number | string;

  overallScore?: number | null;
  technicalScore?: number | null;
  communicationScore?: number | null;
  confidenceScore?: number | null;

  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];

  summary?: string | null;
  detailedFeedback?: string | null;
  interviewerNotes?: string | null;

  categoryScores?: InterviewCategoryScore[];
};

export type InterviewHealthResponse = {
  status?: string | null;
  service?: string | null;
  message?: string | null;
  timestamp?: string | null;
};

export type InterviewConfigResponse = {
  supportedModes?: string[];
  supportedTypes?: string[];
  defaultMode?: string | null;
  defaultType?: string | null;
  features?: Record<string, boolean>;
  defaults?: Record<string, unknown>;
};

export type InterviewHelpAction = {
  label?: string | null;
  href?: string | null;
  type?: string | null;
};

export type InterviewHelpResponse = {
  title?: string | null;
  subtitle?: string | null;
  tips?: string[];
  steps?: string[];
  checklist?: string[];
  quickActions?: InterviewHelpAction[];
  supportNote?: string | null;
  recommendedMode?: string | null;
  recommendedType?: string | null;
};

export type InterviewSessionListQueryParams = {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
  status?: string;
  mode?: string;
  type?: string;
};

export type SubmitInterviewAnswerPayload = {
  sessionId?: string | number;
  interviewSessionId?: string | number;
  questionId: string | number;
  answer: string;
  answerText?: string;
  elapsedTimeSeconds?: number;
};

export type InterviewApiRequestOptions = {
  token?: string | null;
  apiBaseUrl?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  withCredentials?: RequestCredentials;
};

export type ApiListResponse<T> = {
  items: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

type PageableResponse<T> = {
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

function safeString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
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

function extractMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const top = value as ApiEnvelope<unknown>;
  if (typeof top.message === "string" && top.message.trim()) {
    return top.message.trim();
  }

  const nested = unwrapResponse<any>(value);
  if (nested && typeof nested === "object" && typeof nested.message === "string") {
    return nested.message.trim();
  }

  return null;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    return (
      (typeof record.message === "string" && record.message) ||
      (typeof record.error === "string" && record.error) ||
      (typeof record.details === "string" && record.details) ||
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
  const fallbackArray =
    maybePage.content || maybePage.items || maybePage.rows || maybePage.list || [];

  return {
    items: fallbackArray,
    totalElements: Number.isFinite(Number(maybePage.totalElements))
      ? Number(maybePage.totalElements)
      : fallbackArray.length,
    totalPages: Math.max(
      1,
      Number.isFinite(Number(maybePage.totalPages))
        ? Number(maybePage.totalPages)
        : fallbackArray.length > 0
          ? 1
          : 0
    ),
    page: Number.isFinite(Number(maybePage.number))
      ? Number(maybePage.number)
      : fallbackPage,
    size: Number.isFinite(Number(maybePage.size))
      ? Number(maybePage.size)
      : fallbackSize,
  };
}

/* =========================================================
   HTTP CORE
========================================================= */

export class InterviewApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "InterviewApiError";
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
  options: InterviewApiRequestOptions = {},
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
    throw new InterviewApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return unwrapResponse<T>(payload as T);
}

/* =========================================================
   ENDPOINT BUILDERS
========================================================= */

export function buildInterviewSessionDetailPath(sessionId: string | number): string {
  return `${INTERVIEW_API_PATHS.SESSION_BASE}/${sessionId}`;
}

export function buildInterviewSessionStartPath(sessionId: string | number): string {
  return `${INTERVIEW_API_PATHS.SESSION_BASE}/${sessionId}/start`;
}

export function buildInterviewSessionEndPath(sessionId: string | number): string {
  return `${INTERVIEW_API_PATHS.SESSION_BASE}/${sessionId}/end`;
}

export function buildInterviewSessionCancelPath(sessionId: string | number): string {
  return `${INTERVIEW_API_PATHS.SESSION_BASE}/${sessionId}/cancel`;
}

export function buildInterviewSessionQuestionsPath(sessionId: string | number): string {
  return `${INTERVIEW_API_PATHS.SESSION_BASE}/${sessionId}/questions`;
}

export function buildInterviewSessionTranscriptPath(sessionId: string | number): string {
  return `${INTERVIEW_API_PATHS.SESSION_BASE}/${sessionId}/transcript`;
}

export function buildInterviewSessionAnswerPath(sessionId: string | number): string {
  return `${INTERVIEW_API_PATHS.SESSION_BASE}/${sessionId}/answer`;
}

export function buildInterviewSessionNextQuestionPath(sessionId: string | number): string {
  return `${INTERVIEW_API_PATHS.SESSION_BASE}/${sessionId}/next-question`;
}

export function buildInterviewEvaluationPath(sessionId: string | number): string {
  return `${INTERVIEW_API_PATHS.EVALUATION_BASE}/${sessionId}`;
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeInterviewSession(
  input: Partial<InterviewSession> | null | undefined
): InterviewSession | null {
  if (!input) return null;

  return {
    interviewSessionId: input.interviewSessionId ?? input.sessionId ?? input.id,
    sessionId: input.sessionId ?? input.interviewSessionId ?? input.id,
    id: input.id ?? input.sessionId ?? input.interviewSessionId,

    title: safeString(input.title),
    name: safeString(input.name),
    jobTitle: safeString(input.jobTitle),
    companyName: safeString(input.companyName),

    mode: input.mode ?? null,
    type: input.type ?? null,
    status: input.status ?? null,

    startedAt: safeString(input.startedAt),
    endedAt: safeString(input.endedAt),
    createdAt: safeString(input.createdAt),
    updatedAt: safeString(input.updatedAt),

    language: safeString(input.language),
    interviewLanguage: safeString(input.interviewLanguage),
    preferredLanguage: safeString(input.preferredLanguage),
    speechLanguage: safeString(input.speechLanguage),
    locale: safeString(input.locale),

    allowMixedLanguage: safeBoolean(input.allowMixedLanguage),
    requiresClearSpeech: safeBoolean(input.requiresClearSpeech),
    voiceInputEnabled: safeBoolean(input.voiceInputEnabled),
    textInputEnabled: safeBoolean(input.textInputEnabled),

    languageNotice: safeString(input.languageNotice),
    communicationInstructions: safeString(input.communicationInstructions),
  };
}

export function normalizeInterviewQuestion(
  input: Partial<InterviewQuestionResponse> | null | undefined
): InterviewQuestionResponse | null {
  if (!input) return null;

  return {
    questionId: input.questionId ?? input.questionId,
    sessionId: safeString(input.sessionId) ?? undefined,
    turnId: safeString(input.turnId) ?? undefined,
    question: safeString(input.question),
    title: safeString(input.title),
    questionType: safeString(input.questionType),
    category: safeString(input.category),
    difficulty: safeNumber(input.difficulty),
    questionIndex: safeNumber(input.questionIndex),
    totalQuestions: safeNumber(input.totalQuestions),
    expectedAnswerTimeSeconds: safeNumber(input.expectedAnswerTimeSeconds),
    hintAllowed: safeBoolean(input.hintAllowed),
    sampleAnswerAllowed: safeBoolean(input.sampleAnswerAllowed),
    resumeBased: safeBoolean(input.resumeBased),
    githubBased: safeBoolean(input.githubBased),
    jobDescriptionBased: safeBoolean(input.jobDescriptionBased),
    sourceSummary: safeString(input.sourceSummary),
    targetSkills: Array.isArray(input.targetSkills) ? input.targetSkills : [],
    followUpHint: safeString(input.followUpHint),
    mockGuidance: safeString(input.mockGuidance),
    sampleAnswerOutline: Array.isArray(input.sampleAnswerOutline) ? input.sampleAnswerOutline : [],
    tags: Array.isArray(input.tags) ? input.tags : [],
    finalQuestion: safeBoolean(input.finalQuestion),
    generatedAt: safeString(input.generatedAt),
    message: safeString(input.message),
  };
}

export function normalizeInterviewAnswer(
  input: Partial<InterviewAnswer> | null | undefined
): InterviewAnswer | null {
  if (!input) return null;

  return {
    id: input.id ?? input.answerId,
    answerId: input.answerId ?? input.id,
    questionId: input.questionId,
    answer: safeString(input.answer),
    answerText: safeString(input.answerText),
    content: safeString(input.content),
    feedback: safeString(input.feedback),
    score: safeNumber(input.score),
    createdAt: safeString(input.createdAt),
  };
}

export function normalizeInterviewTranscriptItem(
  input: Partial<InterviewTranscriptItem> | null | undefined
): InterviewTranscriptItem | null {
  if (!input) return null;

  return {
    id: input.id ?? input.transcriptId ?? input.messageId,
    transcriptId: input.transcriptId ?? input.id,
    messageId: input.messageId ?? input.id,
    speaker: safeString(input.speaker),
    role: safeString(input.role),
    text: safeString(input.text),
    content: safeString(input.content),
    message: safeString(input.message),
    type: safeString(input.type),
    eventType: safeString(input.eventType),
    timestamp: safeString(input.timestamp),
    createdAt: safeString(input.createdAt),
    updatedAt: safeString(input.updatedAt),
  };
}

export function normalizeInterviewCategoryScore(
  input: Partial<InterviewCategoryScore> | null | undefined
): InterviewCategoryScore | null {
  if (!input) return null;

  const name = safeString(input.name);
  const score = safeNumber(input.score);
  const feedback = safeString(input.feedback);

  if (!name && score === null && !feedback) return null;

  return {
    name,
    score,
    feedback,
  };
}

export function normalizeInterviewEvaluation(
  input: Partial<InterviewEvaluation> | null | undefined
): InterviewEvaluation | null {
  if (!input) return null;

  return {
    sessionId: input.sessionId ?? input.interviewSessionId,
    interviewSessionId: input.interviewSessionId ?? input.sessionId,

    overallScore: safeNumber(input.overallScore),
    technicalScore: safeNumber(input.technicalScore),
    communicationScore: safeNumber(input.communicationScore),
    confidenceScore: safeNumber(input.confidenceScore),

    strengths: normalizeStringArray(input.strengths),
    weaknesses: normalizeStringArray(input.weaknesses),
    recommendations: normalizeStringArray(input.recommendations),

    summary: safeString(input.summary),
    detailedFeedback: safeString(input.detailedFeedback),
    interviewerNotes: safeString(input.interviewerNotes),

    categoryScores: Array.isArray(input.categoryScores)
      ? input.categoryScores
          .map((item) => normalizeInterviewCategoryScore(item))
          .filter((item): item is InterviewCategoryScore => Boolean(item))
      : [],
  };
}

export function normalizeInterviewHealthResponse(
  input: Partial<InterviewHealthResponse> | null | undefined
): InterviewHealthResponse | null {
  if (!input) return null;

  return {
    status: safeString(input.status),
    service: safeString(input.service),
    message: safeString(input.message),
    timestamp: safeString(input.timestamp),
  };
}

export function normalizeInterviewConfigResponse(
  input: Partial<InterviewConfigResponse> | null | undefined
): InterviewConfigResponse | null {
  if (!input) return null;

  return {
    supportedModes: normalizeStringArray(input.supportedModes),
    supportedTypes: normalizeStringArray(input.supportedTypes),
    defaultMode: safeString(input.defaultMode),
    defaultType: safeString(input.defaultType),
    features:
      input.features && typeof input.features === "object"
        ? Object.fromEntries(
            Object.entries(input.features).map(([key, value]) => [
              key,
              safeBoolean(value) ?? false,
            ])
          )
        : {},
    defaults:
      input.defaults && typeof input.defaults === "object"
        ? input.defaults
        : {},
  };
}

export function normalizeInterviewHelpAction(
  input: Partial<InterviewHelpAction> | null | undefined
): InterviewHelpAction | null {
  if (!input) return null;

  const label = safeString(input.label);
  const href = safeString(input.href);
  const type = safeString(input.type);

  if (!label && !href && !type) return null;

  return { label, href, type };
}

export function normalizeInterviewHelpResponse(
  input: Partial<InterviewHelpResponse> | null | undefined
): InterviewHelpResponse | null {
  if (!input) return null;

  return {
    title: safeString(input.title),
    subtitle: safeString(input.subtitle),
    tips: normalizeStringArray(input.tips),
    steps: normalizeStringArray(input.steps),
    checklist: normalizeStringArray(input.checklist),
    quickActions: Array.isArray(input.quickActions)
      ? input.quickActions
          .map((item) => normalizeInterviewHelpAction(item))
          .filter((item): item is InterviewHelpAction => Boolean(item))
      : [],
    supportNote: safeString(input.supportNote),
    recommendedMode: safeString(input.recommendedMode),
    recommendedType: safeString(input.recommendedType),
  };
}

/* =========================================================
   QUERY BUILDERS
========================================================= */

function buildInterviewSessionListQuery(
  params: InterviewSessionListQueryParams = {}
) {
  return {
    page: params.page ?? 0,
    size: params.size ?? 10,
    search: params.search,
    sortBy: params.sortBy ?? "updatedAt",
    sortDir: params.sortDir ?? "desc",
    status: params.status,
    mode: params.mode,
    type: params.type,
  };
}

/* =========================================================
   HEALTH / CONFIG / HELP
========================================================= */

export async function getInterviewHealth(
  options?: InterviewApiRequestOptions
): Promise<InterviewHealthResponse> {
  const raw = await request<InterviewHealthResponse>(
    "GET",
    INTERVIEW_API_PATHS.HEALTH,
    options
  );

  return normalizeInterviewHealthResponse(raw) || {};
}

export async function pingInterview(
  options?: InterviewApiRequestOptions
): Promise<InterviewHealthResponse> {
  const raw = await request<InterviewHealthResponse>(
    "GET",
    INTERVIEW_API_PATHS.PING,
    options
  );

  return normalizeInterviewHealthResponse(raw) || {};
}

export async function getInterviewConfig(
  options?: InterviewApiRequestOptions
): Promise<InterviewConfigResponse> {
  const raw = await request<InterviewConfigResponse>(
    "GET",
    INTERVIEW_API_PATHS.CONFIG,
    options
  );

  return normalizeInterviewConfigResponse(raw) || {};
}

export async function getMockInterviewHelp(
  options?: InterviewApiRequestOptions
): Promise<InterviewHelpResponse> {
  const raw = await request<InterviewHelpResponse>(
    "GET",
    INTERVIEW_API_PATHS.HELP_MOCK,
    options
  );

  return normalizeInterviewHelpResponse(raw) || {};
}

/* =========================================================
   SESSION LISTING
========================================================= */

export async function getUserInterviewSessions(
  params: InterviewSessionListQueryParams = {},
  options?: InterviewApiRequestOptions
): Promise<ApiListResponse<InterviewSession>> {
  const raw = await request<
    InterviewSession[] | PageableResponse<InterviewSession> | Record<string, unknown>
  >(
    "GET",
    INTERVIEW_API_PATHS.USER_SESSIONS,
    options,
    undefined,
    buildInterviewSessionListQuery(params)
  );

  const normalized = normalizePageableList<InterviewSession>(
    raw,
    params.page ?? 0,
    params.size ?? 10
  );

  return {
    ...normalized,
    items: normalized.items
      .map((item) => normalizeInterviewSession(item))
      .filter((item): item is InterviewSession => Boolean(item)),
  };
}

export async function getAdminInterviewSessions(
  params: InterviewSessionListQueryParams = {},
  options?: InterviewApiRequestOptions
): Promise<ApiListResponse<InterviewSession>> {
  const raw = await request<
    InterviewSession[] | PageableResponse<InterviewSession> | Record<string, unknown>
  >(
    "GET",
    INTERVIEW_API_PATHS.ADMIN_SESSIONS,
    options,
    undefined,
    buildInterviewSessionListQuery(params)
  );

  const normalized = normalizePageableList<InterviewSession>(
    raw,
    params.page ?? 0,
    params.size ?? 10
  );

  return {
    ...normalized,
    items: normalized.items
      .map((item) => normalizeInterviewSession(item))
      .filter((item): item is InterviewSession => Boolean(item)),
  };
}

/* =========================================================
   SESSION DETAIL / LIFECYCLE
========================================================= */

export async function getInterviewSessionById(
  sessionId: string | number,
  options?: InterviewApiRequestOptions
): Promise<InterviewSession> {
  const raw = await request<InterviewSession>(
    "GET",
    buildInterviewSessionDetailPath(sessionId),
    options
  );

  return normalizeInterviewSession(raw) || {};
}

export async function startInterviewSession(
  sessionId: string | number,
  payload: Record<string, unknown> = {},
  options?: InterviewApiRequestOptions
): Promise<{ success: boolean; message?: string; session?: InterviewSession | null }> {
  const raw = await request<Record<string, unknown>>(
    "POST",
    buildInterviewSessionStartPath(sessionId),
    options,
    payload
  );

  const session = normalizeInterviewSession(unwrapResponse<InterviewSession | null>(raw));

  return {
    success: true,
    message: extractMessage(raw) || undefined,
    session,
  };
}

export async function endInterviewSession(
  sessionId: string | number,
  payload: Record<string, unknown> = {},
  options?: InterviewApiRequestOptions
): Promise<{ success: boolean; message?: string; session?: InterviewSession | null }> {
  const raw = await request<Record<string, unknown>>(
    "POST",
    buildInterviewSessionEndPath(sessionId),
    options,
    payload
  );

  const session = normalizeInterviewSession(unwrapResponse<InterviewSession | null>(raw));

  return {
    success: true,
    message: extractMessage(raw) || undefined,
    session,
  };
}

export async function cancelInterviewSession(
  sessionId: string | number,
  payload: Record<string, unknown> = {},
  options?: InterviewApiRequestOptions
): Promise<{ success: boolean; message?: string; session?: InterviewSession | null }> {
  const raw = await request<Record<string, unknown>>(
    "POST",
    buildInterviewSessionCancelPath(sessionId),
    options,
    payload
  );

  const session = normalizeInterviewSession(unwrapResponse<InterviewSession | null>(raw));

  return {
    success: true,
    message: extractMessage(raw) || undefined,
    session,
  };
}

/* =========================================================
   QUESTIONS / ANSWERS / TRANSCRIPT / EVALUATION
========================================================= */

export async function getInterviewNextQuestion(
  sessionId: string | number,
  options?: InterviewApiRequestOptions
): Promise<InterviewQuestionResponse> {
  const raw = await request<InterviewQuestionResponse>(
    "POST",
    buildInterviewSessionNextQuestionPath(sessionId),
    options
  );

  return raw;
}

export async function submitInterviewAnswer(
  sessionId: string | number,
  payload: SubmitInterviewAnswerPayload,
  options?: InterviewApiRequestOptions
): Promise<InterviewAnswer> {
  const body: SubmitInterviewAnswerPayload = {
    sessionId: payload.sessionId ?? sessionId,
    interviewSessionId: payload.interviewSessionId ?? sessionId,
    questionId: payload.questionId,
    answer: payload.answer,
    answerText: payload.answerText ?? payload.answer,
    elapsedTimeSeconds: payload.elapsedTimeSeconds ?? 0,
  };

  const raw = await request<InterviewAnswer>(
    "POST",
    buildInterviewSessionAnswerPath(sessionId),
    options,
    body
  );

  return normalizeInterviewAnswer(raw) || {};
}

export async function getInterviewTranscript(
  sessionId: string | number,
  options?: InterviewApiRequestOptions
): Promise<InterviewTranscriptItem[]> {
  const raw = await request<
    InterviewTranscriptItem[] | { items?: InterviewTranscriptItem[]; transcript?: InterviewTranscriptItem[]; messages?: InterviewTranscriptItem[] }
  >(
    "GET",
    buildInterviewSessionTranscriptPath(sessionId),
    options
  );

  const source = Array.isArray(raw)
    ? raw
    : (raw as { items?: InterviewTranscriptItem[]; transcript?: InterviewTranscriptItem[]; messages?: InterviewTranscriptItem[] }).items ||
      (raw as { items?: InterviewTranscriptItem[]; transcript?: InterviewTranscriptItem[]; messages?: InterviewTranscriptItem[] }).transcript ||
      (raw as { items?: InterviewTranscriptItem[]; transcript?: InterviewTranscriptItem[]; messages?: InterviewTranscriptItem[] }).messages ||
      [];

  return source
    .map((item) => normalizeInterviewTranscriptItem(item))
    .filter((item): item is InterviewTranscriptItem => Boolean(item));
}

export async function getInterviewEvaluation(
  sessionId: string | number,
  options?: InterviewApiRequestOptions
): Promise<InterviewEvaluation> {
  const raw = await request<InterviewEvaluation>(
    "GET",
    buildInterviewEvaluationPath(sessionId),
    options
  );

  return normalizeInterviewEvaluation(raw) || {};
}

/* =========================================================
   DOMAIN HELPERS
========================================================= */

export function resolveInterviewSessionId(
  session: Partial<InterviewSession> | null | undefined
): string | number | null {
  if (!session) return null;
  return session.interviewSessionId ?? session.sessionId ?? session.id ?? null;
}

export function resolveInterviewSessionTitle(
  session: Partial<InterviewSession> | null | undefined
): string {
  if (!session) return "Interview Session";
  return (
    session.title ||
    session.name ||
    (session.jobTitle ? `${session.jobTitle} Interview` : "") ||
    "Interview Session"
  );
}

export function resolveInterviewStatus(
  session: Partial<InterviewSession> | null | undefined
): string {
  return safeString(session?.status) || "UNKNOWN";
}

export function isInterviewCompleted(
  session: Partial<InterviewSession> | null | undefined
): boolean {
  const status = resolveInterviewStatus(session).toUpperCase();
  return status === "COMPLETED" || status === "EVALUATED";
}

export function isInterviewInProgress(
  session: Partial<InterviewSession> | null | undefined
): boolean {
  return resolveInterviewStatus(session).toUpperCase() === "IN_PROGRESS";
}

export function getInterviewPrimaryScore(
  evaluation: Partial<InterviewEvaluation> | null | undefined
): number {
  if (!evaluation) return 0;

  return (
    safeNumber(evaluation.overallScore) ??
    safeNumber(evaluation.technicalScore) ??
    safeNumber(evaluation.communicationScore) ??
    safeNumber(evaluation.confidenceScore) ??
    0
  );
}

export function hasInterviewEvaluationContent(
  evaluation: Partial<InterviewEvaluation> | null | undefined
): boolean {
  if (!evaluation) return false;

  return Boolean(
    safeString(evaluation.summary) ||
      safeString(evaluation.detailedFeedback) ||
      normalizeStringArray(evaluation.strengths).length ||
      normalizeStringArray(evaluation.recommendations).length ||
      (Array.isArray(evaluation.categoryScores) && evaluation.categoryScores.length > 0)
  );
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const interviewApi = {
  getInterviewHealth,
  pingInterview,
  getInterviewConfig,
  getMockInterviewHelp,

  getUserInterviewSessions,
  getAdminInterviewSessions,

  getInterviewSessionById,
  startInterviewSession,
  endInterviewSession,
  cancelInterviewSession,

  getInterviewNextQuestion,
  submitInterviewAnswer,
  getInterviewTranscript,
  getInterviewEvaluation,

  buildInterviewSessionDetailPath,
  buildInterviewSessionStartPath,
  buildInterviewSessionEndPath,
  buildInterviewSessionCancelPath,
  buildInterviewSessionQuestionsPath,
  buildInterviewSessionTranscriptPath,
  buildInterviewSessionAnswerPath,
  buildInterviewEvaluationPath,

  normalizeInterviewSession,
  normalizeInterviewQuestion,
  normalizeInterviewAnswer,
  normalizeInterviewTranscriptItem,
  normalizeInterviewCategoryScore,
  normalizeInterviewEvaluation,
  normalizeInterviewHealthResponse,
  normalizeInterviewConfigResponse,
  normalizeInterviewHelpResponse,

  resolveInterviewSessionId,
  resolveInterviewSessionTitle,
  resolveInterviewStatus,
  isInterviewCompleted,
  isInterviewInProgress,
  getInterviewPrimaryScore,
  hasInterviewEvaluationContent,

  extractMessage,
};

/* =========================================================
   EXAMPLE USAGE

   import { interviewApi } from "@/lib/interviewApi";

   const sessions = await interviewApi.getUserInterviewSessions({
     page: 0,
     size: 10,
     status: "IN_PROGRESS",
   });

   const session = await interviewApi.getInterviewSessionById(12);
   const questions = await interviewApi.getInterviewQuestions(12);

   const answer = await interviewApi.submitInterviewAnswer(12, {
     questionId: 101,
     answer: "I would design the service with ...",
   });

   const transcript = await interviewApi.getInterviewTranscript(12);
   const evaluation = await interviewApi.getInterviewEvaluation(12);
========================================================= */