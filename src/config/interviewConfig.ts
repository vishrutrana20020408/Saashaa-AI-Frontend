/**
 * src/components/config/interviewConfig.ts
 *
 * Backend-integrated interview module configuration
 * aligned with the latest project update.
 *
 * Purpose:
 * - centralize frontend interview API endpoints
 * - centralize auth/token helpers
 * - centralize backend response unwrapping helpers
 * - keep frontend consistent with backend-driven architecture
 *
 * Project alignment:
 * - Spring Boot backend on port 8080 by default
 * - AI-engine remains backend-orchestrated, never called directly from frontend
 * - role-aware routing for USER / ADMIN flows
 * - resilient payload unwrapping using data / payload / result
 * - token fallback strategy aligned with existing project auth flow
 *
 * Expected backend interview-related patterns:
 * - /api/interview/**
 * - /api/user/interview/**
 * - /api/admin/interview/**
 * - /api/interview/session/**
 * - /api/interview/realtime/**
 * - /api/interview/evaluation/**
 *
 * Notes:
 * - This file does not force a single endpoint contract.
 * - It provides a safe, reusable config layer for current and future interview pages.
 */

export type AppRole = "USER" | "ADMIN" | "COMPANY" | "OWNER" | "UNKNOWN";

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

export type InterviewMode =
  | "TEXT"
  | "VOICE"
  | "VIDEO"
  | "LIVE"
  | "PRACTICE"
  | "MOCK";

export type InterviewType =
  | "TECHNICAL"
  | "HR"
  | "BEHAVIORAL"
  | "SYSTEM_DESIGN"
  | "RESUME"
  | "MIXED";

export type InterviewStatus =
  | "DRAFT"
  | "CREATED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "EVALUATED"
  | "CANCELLED"
  | "FAILED";

export type InterviewSessionSummary = {
  interviewSessionId?: number | string;
  sessionId?: number | string;
  id?: number | string;
  title?: string;
  name?: string;
  mode?: InterviewMode | string;
  type?: InterviewType | string;
  status?: InterviewStatus | string;
  jobTitle?: string;
  companyName?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  score?: number;
};

export type InterviewQuestion = {
  id?: number | string;
  questionId?: number | string;
  content?: string;
  question?: string;
  type?: string;
  order?: number;
};

export type InterviewAnswer = {
  id?: number | string;
  answerId?: number | string;
  questionId?: number | string;
  answer?: string;
  content?: string;
  feedback?: string;
  score?: number;
};

export type InterviewEvaluationSummary = {
  sessionId?: number | string;
  interviewSessionId?: number | string;
  overallScore?: number;
  technicalScore?: number;
  communicationScore?: number;
  confidenceScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  summary?: string;
};

export type InterviewCreateRequest = {
  title?: string;
  interviewTitle?: string;
  jobTitle?: string;
  companyName?: string;
  type?: InterviewType | string;
  mode?: InterviewMode | string;
  description?: string;
  resumeVersionId?: number | string;
  difficulty?: string;
  questionCount?: number;
};

export type InterviewAnswerSubmitRequest = {
  sessionId?: number | string;
  interviewSessionId?: number | string;
  questionId?: number | string;
  answer?: string;
  answerText?: string;
  elapsedTimeSeconds?: number;
};

export type InterviewRealtimeMessage = {
  event?: string;
  type?: string;
  sessionId?: number | string;
  payload?: unknown;
  timestamp?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_BASE_URL ||
  API_BASE_URL.replace(/^http/i, "ws");

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export const INTERVIEW_CONFIG = {
  app: {
    apiBaseUrl: trimTrailingSlash(API_BASE_URL),
    wsBaseUrl: trimTrailingSlash(WS_BASE_URL),
    requestTimeoutMs: Number(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT_MS || 120000),
    reconnectIntervalMs: Number(
      process.env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL_MS || 3000
    ),
  },

  auth: {
    tokenKeys: [
      "token",
      "authToken",
      "accessToken",
      "jwtToken",
      "adminToken",
      "admin_token",
      "companyToken",
      "ownerToken",
    ] as const,
    roleKeys: ["userRole", "role", "companyRole", "ownerRole"] as const,
  },

  routes: {
    userInterviewBase: "/user/interview",
    adminInterviewBase: "/admin/interview",
    companyInterviewBase: "/company/interview",
    ownerInterviewBase: "/owner/interview",
  },

  endpoints: {
    authMe: `${trimTrailingSlash(API_BASE_URL)}/api/auth/me`,

    interview: {
      ping: `${trimTrailingSlash(API_BASE_URL)}/api/interview/ping`,
      health: `${trimTrailingSlash(API_BASE_URL)}/api/interview/health`,

      sessionBase: `${trimTrailingSlash(API_BASE_URL)}/api/interview/session`,
      realtimeBase: `${trimTrailingSlash(API_BASE_URL)}/api/interview/realtime`,
      evaluationBase: `${trimTrailingSlash(API_BASE_URL)}/api/interview/evaluation`,

      create: `${trimTrailingSlash(API_BASE_URL)}/api/interview/session`,
      listUserSessions: `${trimTrailingSlash(API_BASE_URL)}/api/user/interview/session`,
      listAdminSessions: `${trimTrailingSlash(API_BASE_URL)}/api/admin/interview/sessions`,
    },
  },

  defaults: {
    mode: "TEXT" as InterviewMode,
    type: "TECHNICAL" as InterviewType,
    status: "CREATED" as InterviewStatus,
    difficulty: "INTERMEDIATE",
    questionCount: 5,
  },
} as const;

/* -------------------------------------------------------------------------- */
/*                               Auth utilities                                */
/* -------------------------------------------------------------------------- */

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  for (const key of INTERVIEW_CONFIG.auth.tokenKeys) {
    const value = localStorage.getItem(key);
    if (value && value.trim()) return value;
  }

  const cookieToken = getCookieToken(INTERVIEW_CONFIG.auth.tokenKeys);
  if (cookieToken) return cookieToken;

  return null;
}

function getCookieToken(keys: readonly string[]): string | null {
  if (typeof document === "undefined" || !document.cookie) return null;

  const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
  for (const key of keys) {
    const match = cookies.find((cookie) => cookie.startsWith(`${key}=`));
    if (match) {
      const value = match.split("=")[1];
      if (value && value.trim()) return decodeURIComponent(value);
    }
  }

  return null;
}

export function getStoredRole(): AppRole {
  if (typeof window === "undefined") return "UNKNOWN";

  for (const key of INTERVIEW_CONFIG.auth.roleKeys) {
    const value = localStorage.getItem(key);
    const normalized = normalizeRole(value);
    if (normalized !== "UNKNOWN") return normalized;
  }

  return "UNKNOWN";
}

export function getTokenPathPrefix(): string {
  const token = getStoredToken();
  if (!token) return "";
  return `/${getTokenPathSegment(token)}`;
}

export function getTokenPathSegment(value: string): string {
  if (!value) return "";

  const safeToken = value
    .replace(/[^A-Za-z0-9\-_.~]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32)
    .replace(/^-+|-+$/g, "");

  return safeToken || "session-token";
}

export function toTokenizedRoute(path: string): string {
  const prefix = getTokenPathPrefix();
  if (!prefix) return path;

  const normalized = path.replace(/^\/(?:user|admin|company|owner)(\/|$)/, "/");
  return `${prefix}${normalized}`.replace(/\/+/g, "/");
}

export function normalizeRole(value?: string | null): AppRole {
  const normalized = (value || "").trim().toUpperCase();

  if (normalized === "USER" || normalized === "ROLE_USER") return "USER";
  if (normalized === "ADMIN" || normalized === "ROLE_ADMIN") return "ADMIN";
  if (normalized === "COMPANY" || normalized === "ROLE_COMPANY") return "COMPANY";
  if (normalized === "OWNER" || normalized === "ROLE_OWNER") return "OWNER";
  return "UNKNOWN";
}

export function getAuthHeaders(
  extraHeaders?: HeadersInit,
  contentType: string | null = "application/json"
): HeadersInit {
  const token = getStoredToken();

  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders || {}),
  };
}

export function getNoCacheFetchOptions(
  method: string = "GET",
  extra?: RequestInit
): RequestInit {
  return {
    method,
    credentials: "include",
    cache: "no-store",
    ...extra,
  };
}

/* -------------------------------------------------------------------------- */
/*                           API response utilities                            */
/* -------------------------------------------------------------------------- */

export function unwrapApiPayload<T>(input: unknown): T | null {
  if (!input || typeof input !== "object") {
    return (input as T) ?? null;
  }

  const level1 = input as ApiEnvelope<T>;
  const first = (level1.data ?? level1.payload ?? level1.result ?? input) as
    | T
    | ApiEnvelope<T>;

  if (!first || typeof first !== "object") {
    return (first as T) ?? null;
  }

  const level2 = first as ApiEnvelope<T>;
  const second = (level2.data ?? level2.payload ?? level2.result ?? first) as T;

  return second ?? null;
}

export function extractApiMessage(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;

  const top = input as ApiEnvelope<unknown>;
  if (typeof top.message === "string" && top.message.trim()) {
    return top.message.trim();
  }

  const nested = unwrapApiPayload<any>(input);
  if (nested && typeof nested === "object") {
    const nestedMessage = (nested as { message?: string }).message;
    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
      return nestedMessage.trim();
    }
  }

  return null;
}

export function isApiSuccess(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;

  const top = input as ApiEnvelope<unknown>;
  if (typeof top.success === "boolean") return top.success;

  const nested = unwrapApiPayload<any>(input);
  if (nested && typeof nested === "object") {
    const maybeSuccess = (nested as { success?: boolean }).success;
    if (typeof maybeSuccess === "boolean") return maybeSuccess;
  }

  return true;
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await response.json();
      const message =
        extractApiMessage(json) ||
        (typeof json?.error === "string" ? json.error : null) ||
        (typeof json?.details === "string" ? json.details : null);

      if (message) return message;
    } else {
      const text = await response.text();
      if (text?.trim()) return text.trim();
    }
  } catch {
    // ignore parsing failures
  }

  if (response.status === 400) return "Invalid interview request.";
  if (response.status === 401) return "You are not authenticated. Please log in again.";
  if (response.status === 403) return "You do not have permission to access this interview resource.";
  if (response.status === 404) return "Interview resource not found.";
  if (response.status === 409) return "Interview request conflicted with current session state.";
  if (response.status === 500) return "Backend interview service failed. Please try again.";

  return `Request failed with status ${response.status}.`;
}

/* -------------------------------------------------------------------------- */
/*                             Endpoint resolvers                              */
/* -------------------------------------------------------------------------- */

export function resolveInterviewBaseByRole(role?: string | null): string {
  const normalized = normalizeRole(role ?? getStoredRole());

  if (normalized === "ADMIN") {
    return INTERVIEW_CONFIG.routes.adminInterviewBase;
  }

  if (normalized === "COMPANY") {
    return INTERVIEW_CONFIG.routes.companyInterviewBase;
  }

  if (normalized === "OWNER") {
    return INTERVIEW_CONFIG.routes.ownerInterviewBase;
  }

  return INTERVIEW_CONFIG.routes.userInterviewBase;
}

export function resolveInterviewListEndpoint(role?: string | null): string {
  const normalized = normalizeRole(role ?? getStoredRole());

  if (normalized === "ADMIN") {
    return INTERVIEW_CONFIG.endpoints.interview.listAdminSessions;
  }

  if (normalized === "COMPANY" || normalized === "OWNER") {
    return INTERVIEW_CONFIG.endpoints.interview.listAdminSessions;
  }

  return INTERVIEW_CONFIG.endpoints.interview.listUserSessions;
}

export function buildInterviewSessionDetailEndpoint(
  sessionId: string | number
): string {
  return `${INTERVIEW_CONFIG.endpoints.interview.sessionBase}/${sessionId}`;
}

export function buildInterviewSessionStartEndpoint(
  sessionId: string | number
): string {
  return `${INTERVIEW_CONFIG.endpoints.interview.sessionBase}/${sessionId}/start`;
}

export function buildInterviewSessionEndEndpoint(
  sessionId: string | number
): string {
  return `${INTERVIEW_CONFIG.endpoints.interview.sessionBase}/${sessionId}/end`;
}

export function buildInterviewSessionCancelEndpoint(
  sessionId: string | number
): string {
  return `${INTERVIEW_CONFIG.endpoints.interview.sessionBase}/${sessionId}/cancel`;
}

export function buildInterviewSessionQuestionsEndpoint(
  sessionId: string | number
): string {
  return `${INTERVIEW_CONFIG.endpoints.interview.sessionBase}/${sessionId}/questions`;
}

export function buildInterviewSubmitAnswerEndpoint(
  sessionId: string | number
): string {
  return `${INTERVIEW_CONFIG.endpoints.interview.sessionBase}/${sessionId}/answer`;
}

export function buildInterviewEvaluationEndpoint(
  sessionId: string | number
): string {
  return `${INTERVIEW_CONFIG.endpoints.interview.evaluationBase}/${sessionId}`;
}

export function buildInterviewRealtimeWsUrl(
  sessionId: string | number,
  token?: string | null
): string {
  const base = `${INTERVIEW_CONFIG.app.wsBaseUrl}/ws/interview/${sessionId}`;
  const authToken = token ?? getStoredToken();

  if (!authToken) return base;

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(authToken)}`;
}

export function buildUserResumeScopedInterviewCreatePayload(
  input: InterviewCreateRequest
): InterviewCreateRequest {
  return {
    title: input.title || input.interviewTitle || input.jobTitle || "Interview Session",
    interviewTitle:
      input.interviewTitle || input.title || input.jobTitle || "Interview Session",
    jobTitle: input.jobTitle || "",
    companyName: input.companyName || "",
    type: input.type || INTERVIEW_CONFIG.defaults.type,
    mode: input.mode || INTERVIEW_CONFIG.defaults.mode,
    description: input.description || "",
    resumeVersionId: input.resumeVersionId,
    difficulty: input.difficulty || INTERVIEW_CONFIG.defaults.difficulty,
    questionCount: input.questionCount || INTERVIEW_CONFIG.defaults.questionCount,
  };
}

/* -------------------------------------------------------------------------- */
/*                            Session data helpers                             */
/* -------------------------------------------------------------------------- */

export function resolveInterviewSessionId(
  session?: Partial<InterviewSessionSummary> | null
): string | number | null {
  return (
    session?.interviewSessionId ??
    session?.sessionId ??
    session?.id ??
    null
  );
}

export function resolveInterviewSessionTitle(
  session?: Partial<InterviewSessionSummary> | null
): string {
  return session?.title || session?.name || session?.jobTitle || "Interview Session";
}

export function resolveInterviewStatus(
  session?: Partial<InterviewSessionSummary> | null
): string {
  return String(
    session?.status || INTERVIEW_CONFIG.defaults.status
  ).toUpperCase();
}

export function resolveInterviewScore(
  session?: Partial<InterviewSessionSummary> | null
): number {
  const score = session?.score as any;
  if (typeof score === "number" && Number.isFinite(score)) return score;
  if (typeof score === "string" && (score as string).trim()) {
    const parsed = Number(score);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function getInterviewStatusBadgeClasses(status?: string): string {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "COMPLETED" || normalized === "EVALUATED") {
    return "bg-green-500/15 text-green-200 border-green-400/20";
  }

  if (normalized === "IN_PROGRESS") {
    return "bg-blue-500/15 text-blue-200 border-blue-400/20";
  }

  if (normalized === "FAILED" || normalized === "CANCELLED") {
    return "bg-red-500/15 text-red-200 border-red-400/20";
  }

  if (normalized === "CREATED" || normalized === "DRAFT") {
    return "bg-yellow-500/15 text-yellow-100 border-yellow-400/20";
  }

  return "bg-white/10 text-white/80 border-white/10";
}

export function getInterviewModeBadgeClasses(mode?: string): string {
  const normalized = String(mode || "").toUpperCase();

  if (normalized === "VOICE") {
    return "bg-indigo-500/15 text-indigo-100 border-indigo-400/20";
  }

  if (normalized === "VIDEO") {
    return "bg-pink-500/15 text-pink-100 border-pink-400/20";
  }

  if (normalized === "LIVE") {
    return "bg-purple-500/15 text-purple-100 border-purple-400/20";
  }

  return "bg-white/10 text-white/80 border-white/10";
}

export function formatInterviewDateTime(value?: string): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* -------------------------------------------------------------------------- */
/*                              Request helpers                                */
/* -------------------------------------------------------------------------- */

export async function fetchInterviewJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ payload: T | null; raw: unknown; message: string | null }> {
  const response = await fetch(
    url,
    getNoCacheFetchOptions(init?.method || "GET", {
      ...init,
      headers: {
        ...getAuthHeaders(undefined, init?.body ? "application/json" : null),
        ...(init?.headers || {}),
      },
    })
  );

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const raw = await response.json();
  return {
    payload: unwrapApiPayload<T>(raw),
    raw,
    message: extractApiMessage(raw),
  };
}

export async function postInterviewJson<TResponse, TRequest>(
  url: string,
  body: TRequest,
  init?: RequestInit
): Promise<{ payload: TResponse | null; raw: unknown; message: string | null }> {
  return fetchInterviewJson<TResponse>(url, {
    method: "POST",
    body: JSON.stringify(body),
    ...init,
  });
}

export async function putInterviewJson<TResponse, TRequest>(
  url: string,
  body: TRequest,
  init?: RequestInit
): Promise<{ payload: TResponse | null; raw: unknown; message: string | null }> {
  return fetchInterviewJson<TResponse>(url, {
    method: "PUT",
    body: JSON.stringify(body),
    ...init,
  });
}

/* -------------------------------------------------------------------------- */
/*                           Query builder helpers                             */
/* -------------------------------------------------------------------------- */

export type InterviewListQueryOptions = {
  search?: string;
  status?: string;
  type?: string;
  mode?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export function buildInterviewListUrl(
  baseUrl: string,
  options?: InterviewListQueryOptions
): string {
  const url = new URL(baseUrl, INTERVIEW_CONFIG.app.apiBaseUrl);

  if (!options) return url.toString();

  if (options.search?.trim()) url.searchParams.set("search", options.search.trim());
  if (options.status?.trim()) url.searchParams.set("status", options.status.trim());
  if (options.type?.trim()) url.searchParams.set("type", options.type.trim());
  if (options.mode?.trim()) url.searchParams.set("mode", options.mode.trim());
  if (typeof options.page === "number") url.searchParams.set("page", String(options.page));
  if (typeof options.size === "number") url.searchParams.set("size", String(options.size));
  if (options.sortBy?.trim()) url.searchParams.set("sortBy", options.sortBy.trim());
  if (options.sortDir?.trim()) url.searchParams.set("sortDir", options.sortDir.trim());

  return url.toString();
}

export default INTERVIEW_CONFIG;