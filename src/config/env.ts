/**
 * src/components/config/env.ts
 *
 * Centralized frontend environment and backend integration config
 * aligned with the latest project update.
 *
 * Purpose:
 * - provide a single source of truth for env-based frontend config
 * - keep frontend aligned with Spring Boot backend + AI-engine architecture
 * - centralize API base URL / WS URL / feature flags / auth helpers
 * - avoid scattering process.env usage across components
 *
 * Project alignment:
 * - backend is the only layer the frontend should call directly
 * - AI-engine remains backend-orchestrated
 * - role-aware auth flow with USER / ADMIN
 * - supports token fallback keys already used across the project
 * - supports resilient backend-integrated frontend structure
 */

export type AppRole = "USER" | "ADMIN" | "UNKNOWN";

export type PublicRuntimeEnv = {
  apiBaseUrl: string;
  backendBaseUrl: string;
  wsBaseUrl: string;
  appName: string;
  nodeEnv: string;
  requestTimeoutMs: number;
  wsReconnectIntervalMs: number;

  features: {
    debug: boolean;
    resumeModule: boolean;
    resumeTailoring: boolean;
    interviewModule: boolean;
    githubAnalysis: boolean;
    profileModule: boolean;
    onboardingModule: boolean;
  };

  auth: {
    tokenKeys: readonly string[];
    roleKeys: readonly string[];
    userIdKeys: readonly string[];
  };
};

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_APP_NAME = "AI Interview System";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;

  return fallback;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeUrl(value: string | undefined, fallback: string): string {
  const resolved = value?.trim() || fallback;
  return trimTrailingSlash(resolved);
}

function buildWsBaseUrl(apiBaseUrl: string, explicitWsBaseUrl?: string): string {
  if (explicitWsBaseUrl?.trim()) {
    return trimTrailingSlash(explicitWsBaseUrl.trim());
  }

  if (apiBaseUrl.startsWith("https://")) {
    return apiBaseUrl.replace(/^https:\/\//i, "wss://");
  }

  if (apiBaseUrl.startsWith("http://")) {
    return apiBaseUrl.replace(/^http:\/\//i, "ws://");
  }

  return apiBaseUrl;
}

const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  DEFAULT_API_BASE_URL;

const API_BASE_URL = normalizeUrl(RAW_API_BASE_URL, DEFAULT_API_BASE_URL);
const WS_BASE_URL = buildWsBaseUrl(
  API_BASE_URL,
  process.env.NEXT_PUBLIC_WS_BASE_URL
);

export const ENV: PublicRuntimeEnv = {
  apiBaseUrl: API_BASE_URL,
  backendBaseUrl: API_BASE_URL,
  wsBaseUrl: WS_BASE_URL,
  appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || DEFAULT_APP_NAME,
  nodeEnv: process.env.NODE_ENV || "development",
  requestTimeoutMs: parseNumber(
    process.env.NEXT_PUBLIC_REQUEST_TIMEOUT_MS,
    120000
  ),
  wsReconnectIntervalMs: parseNumber(
    process.env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL_MS,
    3000
  ),

  features: {
    debug: parseBoolean(process.env.NEXT_PUBLIC_DEBUG, false),
    resumeModule: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_RESUME_MODULE, true),
    resumeTailoring: parseBoolean(
      process.env.NEXT_PUBLIC_ENABLE_RESUME_TAILORING,
      true
    ),
    interviewModule: parseBoolean(
      process.env.NEXT_PUBLIC_ENABLE_INTERVIEW_MODULE,
      true
    ),
    githubAnalysis: parseBoolean(
      process.env.NEXT_PUBLIC_ENABLE_GITHUB_ANALYSIS,
      true
    ),
    profileModule: parseBoolean(
      process.env.NEXT_PUBLIC_ENABLE_PROFILE_MODULE,
      true
    ),
    onboardingModule: parseBoolean(
      process.env.NEXT_PUBLIC_ENABLE_ONBOARDING_MODULE,
      true
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
    ],
    roleKeys: ["userRole", "role"],
    userIdKeys: ["userId", "id", "authUserId", "adminId"],
  },
} as const;

/* -------------------------------------------------------------------------- */
/*                               Basic helpers                                 */
/* -------------------------------------------------------------------------- */

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isDevelopment(): boolean {
  return ENV.nodeEnv === "development";
}

export function isProduction(): boolean {
  return ENV.nodeEnv === "production";
}

export function isDebugEnabled(): boolean {
  return ENV.features.debug;
}

export function normalizeRole(value?: string | null): AppRole {
  const normalized = (value || "").trim().toUpperCase();

  if (normalized === "USER" || normalized === "ROLE_USER") return "USER";
  if (normalized === "ADMIN" || normalized === "ROLE_ADMIN") return "ADMIN";
  return "UNKNOWN";
}

/* -------------------------------------------------------------------------- */
/*                           Local storage auth helpers                        */
/* -------------------------------------------------------------------------- */

export function getStoredToken(): string | null {
  if (!isBrowser()) return null;

  for (const key of ENV.auth.tokenKeys) {
    const value = window.localStorage.getItem(key);
    if (value && value.trim()) return value;
  }

  return null;
}

export function getStoredRole(): AppRole {
  if (!isBrowser()) return "UNKNOWN";

  for (const key of ENV.auth.roleKeys) {
    const value = window.localStorage.getItem(key);
    const normalized = normalizeRole(value);
    if (normalized !== "UNKNOWN") return normalized;
  }

  return "UNKNOWN";
}

export function getStoredUserId(): string | null {
  if (!isBrowser()) return null;

  for (const key of ENV.auth.userIdKeys) {
    const value = window.localStorage.getItem(key);
    if (value && value.trim()) return value;
  }

  return null;
}

export function clearStoredAuth(): void {
  if (!isBrowser()) return;

  for (const key of [
    ...ENV.auth.tokenKeys,
    ...ENV.auth.roleKeys,
    ...ENV.auth.userIdKeys,
  ]) {
    window.localStorage.removeItem(key);
  }
}

/* -------------------------------------------------------------------------- */
/*                            Cookie helper utilities                          */
/* -------------------------------------------------------------------------- */

export function getCookieValue(name: string): string | null {
  if (!isBrowser()) return null;

  const cookies = document.cookie ? document.cookie.split("; ") : [];
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return null;

  const value = match.substring(name.length + 1);
  return decodeURIComponent(value);
}

export function getStoredRoleFromCookies(): AppRole {
  const cookieRole =
    getCookieValue("userRole") || getCookieValue("role") || getCookieValue("user_role");

  return normalizeRole(cookieRole);
}

export function getStoredTokenFromCookies(): string | null {
  return (
    getCookieValue("accessToken") ||
    getCookieValue("token") ||
    getCookieValue("authToken")
  );
}

/* -------------------------------------------------------------------------- */
/*                             Backend URL builders                            */
/* -------------------------------------------------------------------------- */

export function getApiBaseUrl(): string {
  return ENV.apiBaseUrl;
}

export function getBackendBaseUrl(): string {
  return ENV.backendBaseUrl;
}

export function getWsBaseUrl(): string {
  return ENV.wsBaseUrl;
}

export function toAbsoluteApiUrl(path?: string | null): string {
  if (!path) return ENV.apiBaseUrl;

  if (/^https?:\/\//i.test(path)) return path;

  if (path.startsWith("/")) {
    return `${ENV.apiBaseUrl}${path}`;
  }

  return `${ENV.apiBaseUrl}/${path}`;
}

export function toAbsoluteWsUrl(path?: string | null): string {
  if (!path) return ENV.wsBaseUrl;

  if (/^wss?:\/\//i.test(path)) return path;

  if (path.startsWith("/")) {
    return `${ENV.wsBaseUrl}${path}`;
  }

  return `${ENV.wsBaseUrl}/${path}`;
}

/* -------------------------------------------------------------------------- */
/*                          Common backend route helpers                       */
/* -------------------------------------------------------------------------- */

export const API_ROUTES = {
  auth: {
    base: `${ENV.apiBaseUrl}/api/auth`,
    me: `${ENV.apiBaseUrl}/api/auth/me`,
    userRegister: `${ENV.apiBaseUrl}/api/auth/user/register`,
    userLogin: `${ENV.apiBaseUrl}/api/auth/user/login`,
    adminLogin: `${ENV.apiBaseUrl}/api/auth/admin/login`,
  },

  user: {
    base: `${ENV.apiBaseUrl}/api/user`,
    me: `${ENV.apiBaseUrl}/api/user/me`,
    onboarding: `${ENV.apiBaseUrl}/api/user/onboarding`,
    onboardingStatus: `${ENV.apiBaseUrl}/api/user/onboarding/status`,
    onboardingReset: `${ENV.apiBaseUrl}/api/user/onboarding/reset`,
    profile: `${ENV.apiBaseUrl}/api/user/profile`,
    toolKnowledge: `${ENV.apiBaseUrl}/api/user/tool-knowledge`,
  },

  admin: {
    base: `${ENV.apiBaseUrl}/api/admin`,
    home: `${ENV.apiBaseUrl}/api/admin/home`,
    profile: `${ENV.apiBaseUrl}/api/admin/profile`,
  },

  resume: {
    userBase: `${ENV.apiBaseUrl}/api/user/resume`,
    adminBase: `${ENV.apiBaseUrl}/api/admin/resume`,
    current: `${ENV.apiBaseUrl}/api/user/resume/current`,
    upload: `${ENV.apiBaseUrl}/api/user/resume/upload`,
    scan: `${ENV.apiBaseUrl}/api/user/resume/scan`,
  },

  tailoring: {
    base: `${ENV.apiBaseUrl}/api/user/resume/tailor`,
    ping: `${ENV.apiBaseUrl}/api/user/resume/tailor/ping`,
    extractTools: `${ENV.apiBaseUrl}/api/user/resume/tailor/extract-tools`,
    apply: `${ENV.apiBaseUrl}/api/user/resume/tailor/apply`,
    toolAnswers: `${ENV.apiBaseUrl}/api/user/resume/tailor/tool-answers`,
  },

  jobApplication: {
    base: `${ENV.apiBaseUrl}/api/user/job-application`,
  },

  github: {
    base: `${ENV.apiBaseUrl}/api/github`,
    analyze: `${ENV.apiBaseUrl}/api/github/analyze`,
    analyzeResumeProject: `${ENV.apiBaseUrl}/api/github/analyze/resume-project`,
    health: `${ENV.apiBaseUrl}/api/github/health`,
  },

  interview: {
    base: `${ENV.apiBaseUrl}/api/interview`,
    sessionBase: `${ENV.apiBaseUrl}/api/interview/session`,
    realtimeBase: `${ENV.apiBaseUrl}/api/interview/realtime`,
    evaluationBase: `${ENV.apiBaseUrl}/api/interview/evaluation`,
  },
} as const;

/* -------------------------------------------------------------------------- */
/*                          Dynamic route/path builders                        */
/* -------------------------------------------------------------------------- */

export function buildUserResumeDetailUrl(resumeId: string | number): string {
  return `${API_ROUTES.resume.userBase}/${resumeId}`;
}

export function buildUserResumeVersionDetailUrl(
  resumeId: string | number,
  versionId: string | number
): string {
  return `${API_ROUTES.resume.userBase}/${resumeId}/versions/${versionId}`;
}

export function buildUserResumeVersionEditUrl(
  resumeId: string | number,
  versionId: string | number
): string {
  return `${API_ROUTES.resume.userBase}/${resumeId}/versions/${versionId}/edit`;
}

export function buildUserResumeVersionPreviewApiUrl(
  resumeId: string | number,
  versionId: string | number
): string {
  return `${API_ROUTES.resume.userBase}/${resumeId}/versions/${versionId}/preview`;
}

export function buildUserResumeVersionDownloadApiUrl(
  resumeId: string | number,
  versionId: string | number
): string {
  return `${API_ROUTES.resume.userBase}/${resumeId}/versions/${versionId}/download`;
}

export function buildAdminResumeDetailUrl(resumeId: string | number): string {
  return `${API_ROUTES.resume.adminBase}/${resumeId}`;
}

export function buildAdminResumeVersionPreviewApiUrl(
  resumeId: string | number,
  versionId: string | number
): string {
  return `${API_ROUTES.resume.adminBase}/${resumeId}/versions/${versionId}/preview`;
}

export function buildAdminResumeVersionDownloadApiUrl(
  resumeId: string | number,
  versionId: string | number
): string {
  return `${API_ROUTES.resume.adminBase}/${resumeId}/versions/${versionId}/download`;
}

export function buildResumeScopedToolKnowledgeUrl(
  resumeId: string | number
): string {
  return `${API_ROUTES.resume.userBase}/${resumeId}/tool-knowledge`;
}

export function buildInterviewSessionUrl(sessionId: string | number): string {
  return `${API_ROUTES.interview.sessionBase}/${sessionId}`;
}

export function buildInterviewRealtimeWsUrl(
  sessionId: string | number,
  token?: string | null
): string {
  const base = toAbsoluteWsUrl(`/ws/interview/${sessionId}`);
  const authToken = token ?? getStoredToken();

  if (!authToken) return base;

  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(authToken)}`;
}

/* -------------------------------------------------------------------------- */
/*                             Request header helpers                          */
/* -------------------------------------------------------------------------- */

export function getAuthHeaders(
  contentType: string | null = "application/json",
  extraHeaders?: HeadersInit
): HeadersInit {
  const token = getStoredToken();

  return {
    ...(contentType ? { "Content-Type": contentType } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extraHeaders || {}),
  };
}

export function getJsonAuthHeaders(extraHeaders?: HeadersInit): HeadersInit {
  return getAuthHeaders("application/json", extraHeaders);
}

export function getMultipartAuthHeaders(extraHeaders?: HeadersInit): HeadersInit {
  return getAuthHeaders(null, extraHeaders);
}

export function getDefaultFetchOptions(
  method: string = "GET",
  init?: RequestInit
): RequestInit {
  return {
    method,
    credentials: "include",
    cache: "no-store",
    ...init,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Feature flag helpers                           */
/* -------------------------------------------------------------------------- */

export function isResumeModuleEnabled(): boolean {
  return ENV.features.resumeModule;
}

export function isResumeTailoringEnabled(): boolean {
  return ENV.features.resumeTailoring;
}

export function isInterviewModuleEnabled(): boolean {
  return ENV.features.interviewModule;
}

export function isGithubAnalysisEnabled(): boolean {
  return ENV.features.githubAnalysis;
}

export function isProfileModuleEnabled(): boolean {
  return ENV.features.profileModule;
}

export function isOnboardingModuleEnabled(): boolean {
  return ENV.features.onboardingModule;
}

/* -------------------------------------------------------------------------- */
/*                        Frontend role-based route helpers                    */
/* -------------------------------------------------------------------------- */

export function getUserFrontendBaseRoute(): string {
  return "/user";
}

export function getAdminFrontendBaseRoute(): string {
  return "/admin";
}

export function getRoleAwareFrontendBaseRoute(role?: string | null): string {
  const normalized = normalizeRole(role ?? getStoredRole());

  if (normalized === "ADMIN") return getAdminFrontendBaseRoute();
  return getUserFrontendBaseRoute();
}

export function getRoleAwareResumeRoute(role?: string | null): string {
  const normalized = normalizeRole(role ?? getStoredRole());

  if (normalized === "ADMIN") return "/admin/resume";
  return "/user/resume";
}

export function getRoleAwareInterviewRoute(role?: string | null): string {
  const normalized = normalizeRole(role ?? getStoredRole());

  if (normalized === "ADMIN") return "/admin/interview";
  return "/user/interview";
}

/* -------------------------------------------------------------------------- */
/*                         Safe environment debug snapshot                     */
/* -------------------------------------------------------------------------- */

export function getSafeEnvSnapshot() {
  return {
    apiBaseUrl: ENV.apiBaseUrl,
    backendBaseUrl: ENV.backendBaseUrl,
    wsBaseUrl: ENV.wsBaseUrl,
    appName: ENV.appName,
    nodeEnv: ENV.nodeEnv,
    requestTimeoutMs: ENV.requestTimeoutMs,
    wsReconnectIntervalMs: ENV.wsReconnectIntervalMs,
    features: { ...ENV.features },
  };
}

export default ENV;