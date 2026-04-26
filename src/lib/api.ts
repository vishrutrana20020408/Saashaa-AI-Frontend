// src/lib/api.ts
//
// Centralized backend-integrated API client for the Next.js frontend.
//
// Purpose:
// - works with Spring Boot backend
// - supports JWT via Authorization header
// - supports cookie/session auth via credentials: "include"
// - supports JSON, multipart upload, text, blob
// - supports wrapped backend responses:
//   { data: ... } / { result: ... } / { payload: ... } / { content: ... }
// - provides typed endpoint helpers for Interview System / Resume Management System
//
// Latest project alignment:
// - backend-first frontend architecture
// - role-aware USER / ADMIN routing and auth fallback strategy
// - resume versioning, tailoring, profile sync, onboarding, interview flows
// - AI-engine remains backend orchestrated only

export type Primitive = string | number | boolean | null | undefined;

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

export type ApiErrorPayload = {
  success?: boolean;
  message?: string;
  error?: string;
  details?: unknown;
  status?: number;
  path?: string;
  timestamp?: string;
};

export class ApiError extends Error {
  status: number;
  payload?: ApiErrorPayload;
  url?: string;

  constructor(
    message: string,
    status: number,
    payload?: ApiErrorPayload,
    url?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.url = url;
  }
}

export type ApiClientOptions = {
  baseUrl?: string;
  getAccessToken?: () => string | null;
  getRefreshToken?: () => string | null;
  onUnauthorized?: (error: ApiError) => void;
  onForbidden?: (error: ApiError) => void;
  defaultHeaders?: Record<string, string>;
  withCredentials?: boolean;
  unwrapResponse?: boolean;
};

export type RequestJsonInit = RequestInit & {
  json?: unknown;
  unwrapResponse?: boolean;
  rawResponse?: boolean;
};

export type UploadFields = Record<string, Primitive>;
export type UploadFiles = Record<string, File | Blob>;

function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function joinUrl(base: string, path: string): string {
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

function buildQueryString(
  params?: Record<string, Primitive | Primitive[]>
): string {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || typeof value === "undefined") return;

    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (v === null || typeof v === "undefined") return;
        searchParams.append(key, String(v));
      });
      return;
    }

    searchParams.append(key, String(value));
  });

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export function unwrapApiResponse<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === "object") {
    const obj = value as ApiEnvelope<T>;
    if (typeof obj.data !== "undefined") return obj.data as T;
    if (typeof obj.result !== "undefined") return obj.result as T;
    if (typeof obj.payload !== "undefined") return obj.payload as T;
    if (typeof obj.content !== "undefined") return obj.content as T;
  }
  return value as T;
}

export function unwrapNestedApiResponse<T>(value: unknown): T {
  const level1 = unwrapApiResponse<T>(value as T | ApiEnvelope<T>);
  return unwrapApiResponse<T>(level1 as T | ApiEnvelope<T>);
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function normalizeRole(value?: string | null): string | null {
  const normalized = (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
  return normalized || null;
}

export function extractApiMessage(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;

  const obj = input as ApiEnvelope<unknown>;
  if (typeof obj.message === "string" && obj.message.trim()) {
    return obj.message.trim();
  }

  const nested = unwrapNestedApiResponse<any>(input);
  if (nested && typeof nested === "object" && typeof nested.message === "string") {
    return nested.message.trim();
  }

  return null;
}

/* =========================================================
   COOKIE HELPERS
========================================================= */
export const cookie = {
  set(name: string, value: string, days = 365) {
    if (typeof document === "undefined") return;
    const maxAge = Math.floor(days * 24 * 60 * 60);
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
      value
    )}; path=/; max-age=${maxAge}; samesite=lax`;
  },

  get(name: string): string {
    if (typeof document === "undefined") return "";
    const target = `${encodeURIComponent(name)}=`;
    const parts = document.cookie.split(";").map((part) => part.trim());
    const found = parts.find((part) => part.startsWith(target));
    return found ? decodeURIComponent(found.slice(target.length)) : "";
  },

  remove(name: string) {
    if (typeof document === "undefined") return;
    document.cookie = `${encodeURIComponent(
      name
    )}=; path=/; max-age=0; samesite=lax`;
  },
};

/* =========================================================
   LOCAL AUTH STORAGE HELPERS
========================================================= */
export const authStorage = {
  getAccessToken(): string | null {
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
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refreshToken");
  },

  getRole(): string | null {
    if (typeof window === "undefined") return null;
    return normalizeRole(
      localStorage.getItem("userRole") || localStorage.getItem("role")
    );
  },

  getUserId(): string | null {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("userId") ||
      localStorage.getItem("id") ||
      localStorage.getItem("authUserId") ||
      localStorage.getItem("adminId") ||
      null
    );
  },

  setAccessToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("accessToken", token);
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("jwtToken", token);
    cookie.set("accessToken", token);
    cookie.set("token", token);
  },

  setRefreshToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("refreshToken", token);
    cookie.set("refreshToken", token);
  },

  setRole(role: string) {
    if (typeof window === "undefined") return;
    const normalized = normalizeRole(role);
    if (!normalized) return;

    localStorage.setItem("userRole", normalized);
    localStorage.setItem("role", normalized);
    cookie.set("userRole", normalized);
    cookie.set("role", normalized);
  },

  setUserId(id: string | number) {
    if (typeof window === "undefined") return;
    const value = String(id);
    localStorage.setItem("userId", value);
    localStorage.setItem("id", value);
    localStorage.setItem("authUserId", value);
  },

  setOnboardingDone(done: boolean) {
    if (typeof window === "undefined") return;
    localStorage.setItem("userOnboardingDone", String(done));
    localStorage.setItem("onboardingDone", String(done));
    cookie.set("userOnboardingDone", String(done));
    cookie.set("onboardingDone", String(done));
  },

  clear() {
    if (typeof window === "undefined") return;

    [
      "accessToken",
      "token",
      "authToken",
      "jwtToken",
      "refreshToken",
      "userRole",
      "role",
      "userId",
      "id",
      "authUserId",
      "adminId",
      "userEmail",
      "userName",
      "authId",
      "userOnboardingDone",
      "onboardingDone",
      "adminInterviewToken",
      "currentResumeId",
      "currentResumeVersionId",
      "currentResumeAtsScore",
      "userResumeName",
    ].forEach((key) => localStorage.removeItem(key));

    [
      "accessToken",
      "token",
      "refreshToken",
      "userRole",
      "role",
      "userOnboardingDone",
      "onboardingDone",
    ].forEach(cookie.remove);
  },
};

/* =========================================================
   API CLIENT
========================================================= */
export class ApiClient {
  private baseUrl: string;
  private getAccessTokenFn: () => string | null;
  private getRefreshTokenFn: () => string | null;
  private onUnauthorized?: (error: ApiError) => void;
  private onForbidden?: (error: ApiError) => void;
  private defaultHeaders: Record<string, string>;
  private withCredentials: boolean;
  private defaultUnwrapResponse: boolean;

  constructor(options?: ApiClientOptions) {
    const envBase =
      options?.baseUrl ||
      (typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.NEXT_PUBLIC_BACKEND_URL ||
          process.env.NEXT_PUBLIC_API_URL
        : "") ||
      "http://localhost:8080";

    this.baseUrl = normalizeBaseUrl(envBase);
    this.getAccessTokenFn =
      options?.getAccessToken || (() => authStorage.getAccessToken());
    this.getRefreshTokenFn =
      options?.getRefreshToken || (() => authStorage.getRefreshToken());
    this.onUnauthorized = options?.onUnauthorized;
    this.onForbidden = options?.onForbidden;
    this.defaultHeaders = options?.defaultHeaders || {};
    this.withCredentials = options?.withCredentials ?? true;
    this.defaultUnwrapResponse = options?.unwrapResponse ?? true;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  private buildAuthHeaders(): Record<string, string> {
    const accessToken = this.getAccessTokenFn();
    const refreshToken = this.getRefreshTokenFn();

    return {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(refreshToken ? { "X-Refresh-Token": refreshToken } : {}),
    };
  }

  private async parseResponseBody(response: Response): Promise<{
    text: string;
    json: unknown | null;
  }> {
    const text = await response.text();
    const json = safeJsonParse(text);
    return { text, json };
  }

  private createError(
    response: Response,
    bodyText: string,
    bodyJson: unknown,
    url: string
  ): ApiError {
    const payload =
      (bodyJson as ApiErrorPayload | null) ||
      safeJsonParse<ApiErrorPayload>(bodyText) ||
      undefined;

    const message =
      payload?.message ||
      payload?.error ||
      (bodyText && bodyText.length < 500 ? bodyText : "") ||
      `Request failed (${response.status})`;

    return new ApiError(message, response.status, payload, url);
  }

  private async request<T>(
    path: string,
    init: RequestJsonInit = {}
  ): Promise<T> {
    const url = joinUrl(this.baseUrl, path);
    const headers = new Headers(init.headers || {});

    headers.set("Accept", "application/json");

    Object.entries(this.defaultHeaders).forEach(([key, value]) => {
      if (!headers.has(key)) headers.set(key, value);
    });

    Object.entries(this.buildAuthHeaders()).forEach(([key, value]) => {
      if (!headers.has(key)) headers.set(key, value);
    });

    let body = init.body;

    if (typeof init.json !== "undefined") {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(init.json);
    } else if (body && !isFormData(body) && typeof body === "string") {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "text/plain");
      }
    }

    const response = await fetch(url, {
      ...init,
      headers,
      body,
      credentials:
        init.credentials ?? (this.withCredentials ? "include" : "same-origin"),
      cache: init.cache ?? "no-store",
    });

    if (init.rawResponse) {
      return response as unknown as T;
    }

    const { text, json } = await this.parseResponseBody(response);

    if (!response.ok) {
      const error = this.createError(response, text, json, url);

      if (response.status === 401 && this.onUnauthorized) {
        try {
          this.onUnauthorized(error);
        } catch {
          // ignore callback failure
        }
      }

      if (response.status === 403 && this.onForbidden) {
        try {
          this.onForbidden(error);
        } catch {
          // ignore callback failure
        }
      }

      throw error;
    }

    if (!text) {
      return {} as T;
    }

    const shouldUnwrap =
      typeof init.unwrapResponse === "boolean"
        ? init.unwrapResponse
        : this.defaultUnwrapResponse;

    if (json !== null) {
      return shouldUnwrap
        ? unwrapNestedApiResponse<T>(json as T | ApiEnvelope<T>)
        : (json as T);
    }

    return text as T;
  }

  get<T>(path: string, init?: RequestJsonInit) {
    return this.request<T>(path, { ...(init || {}), method: "GET" });
  }

  post<T>(path: string, json?: unknown, init?: RequestJsonInit) {
    return this.request<T>(path, {
      ...(init || {}),
      method: "POST",
      json,
    });
  }

  put<T>(path: string, json?: unknown, init?: RequestJsonInit) {
    return this.request<T>(path, {
      ...(init || {}),
      method: "PUT",
      json,
    });
  }

  patch<T>(path: string, json?: unknown, init?: RequestJsonInit) {
    return this.request<T>(path, {
      ...(init || {}),
      method: "PATCH",
      json,
    });
  }

  delete<T>(path: string, init?: RequestJsonInit) {
    return this.request<T>(path, { ...(init || {}), method: "DELETE" });
  }

  getWithQuery<T>(
    path: string,
    query?: Record<string, Primitive | Primitive[]>,
    init?: RequestJsonInit
  ) {
    return this.get<T>(`${path}${buildQueryString(query)}`, init);
  }

  postWithQuery<T>(
    path: string,
    query?: Record<string, Primitive | Primitive[]>,
    json?: unknown,
    init?: RequestJsonInit
  ) {
    return this.post<T>(`${path}${buildQueryString(query)}`, json, init);
  }

  async upload<T>(
    path: string,
    files: UploadFiles,
    fields?: UploadFields,
    init?: RequestJsonInit
  ) {
    const form = new FormData();

    Object.entries(files).forEach(([key, file]) => {
      form.append(key, file);
    });

    if (fields) {
      Object.entries(fields).forEach(([key, value]) => {
        if (value === null || typeof value === "undefined") return;
        form.append(key, String(value));
      });
    }

    return this.request<T>(path, {
      ...(init || {}),
      method: "POST",
      body: form,
    });
  }

  async getBlob(path: string, init?: RequestInit): Promise<Blob> {
    const url = joinUrl(this.baseUrl, path);
    const headers = new Headers(init?.headers || {});

    Object.entries(this.defaultHeaders).forEach(([key, value]) => {
      if (!headers.has(key)) headers.set(key, value);
    });

    Object.entries(this.buildAuthHeaders()).forEach(([key, value]) => {
      if (!headers.has(key)) headers.set(key, value);
    });

    const response = await fetch(url, {
      ...(init || {}),
      method: "GET",
      headers,
      credentials:
        init?.credentials ?? (this.withCredentials ? "include" : "same-origin"),
      cache: init?.cache ?? "no-store",
    });

    if (!response.ok) {
      const { text, json } = await this.parseResponseBody(response);
      throw this.createError(response, text, json, url);
    }

    return response.blob();
  }

  async getText(path: string, init?: RequestInit): Promise<string> {
    const url = joinUrl(this.baseUrl, path);
    const headers = new Headers(init?.headers || {});

    Object.entries(this.defaultHeaders).forEach(([key, value]) => {
      if (!headers.has(key)) headers.set(key, value);
    });

    Object.entries(this.buildAuthHeaders()).forEach(([key, value]) => {
      if (!headers.has(key)) headers.set(key, value);
    });

    const response = await fetch(url, {
      ...(init || {}),
      method: "GET",
      headers,
      credentials:
        init?.credentials ?? (this.withCredentials ? "include" : "same-origin"),
      cache: init?.cache ?? "no-store",
    });

    if (!response.ok) {
      const { text, json } = await this.parseResponseBody(response);
      throw this.createError(response, text, json, url);
    }

    return response.text();
  }

  async download(path: string, filename?: string): Promise<void> {
    const blob = await this.getBlob(path);
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename || "download";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(objectUrl);
  }
}

/* =========================================================
   DEFAULT SINGLETON
========================================================= */
export const api = new ApiClient({
  getAccessToken: () => authStorage.getAccessToken(),
  getRefreshToken: () => authStorage.getRefreshToken(),
  onUnauthorized: () => {
    authStorage.clear();
  },
  onForbidden: () => {
    // no-op by default
  },
  withCredentials: true,
  unwrapResponse: true,
});

/* =========================================================
   AUTH HELPERS
========================================================= */
export type LoginResponse = {
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  role?: string;
  userRole?: string;
  id?: number | string;
  userId?: number | string;
  adminId?: number | string;
  onboardingDone?: boolean;
  userOnboardingDone?: boolean;
};

export function persistLoginSession(payload: LoginResponse) {
  const accessToken = payload.accessToken || payload.token;
  const role = normalizeRole(payload.userRole || payload.role);
  const onboardingDone =
    payload.userOnboardingDone ?? payload.onboardingDone ?? false;
  const userId = payload.userId ?? payload.id ?? payload.adminId;

  if (accessToken) authStorage.setAccessToken(accessToken);
  if (payload.refreshToken) authStorage.setRefreshToken(payload.refreshToken);
  if (role) authStorage.setRole(role);
  if (typeof userId !== "undefined" && userId !== null) {
    authStorage.setUserId(userId);
  }
  authStorage.setOnboardingDone(Boolean(onboardingDone));
}

export function clearLoginSession() {
  authStorage.clear();
}

/* =========================================================
   ENDPOINTS
========================================================= */
export const endpoints = {
  auth: {
    userLogin: "/api/auth/user/login",
    userRegister: "/api/auth/user/register",
    adminLogin: "/api/auth/admin/login",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
  },

  user: {
    me: "/api/user/me",
    home: "/api/user/home",
    onboarding: "/api/user/onboarding",
    onboardingStatus: "/api/user/onboarding/status",
    onboardingOptions: "/api/user/onboarding/options",
    dashboard: "/api/user/dashboard",
    toolKnowledge: "/api/user/tool-knowledge",
    profile: {
      me: "/api/user/profile/me",
      base: "/api/user/profile",
      sync: "/api/user/profile/sync",
      syncResume: "/api/user/profile/sync-resume",
    },
  },

  resume: {
    editorConfig: "/api/resume/editor/config",
    current: "/api/user/resume/current",
    latest: "/api/user/resume/latest",
    scan: "/api/user/resume/scan",
    upload: "/api/user/resume/upload",
    list: "/api/user/resume",
    currentContent: "/api/user/resume/content",
    byId: (resumeId: Primitive) => `/api/user/resume/${resumeId}`,
    currentPreview: "/api/user/resume/current/preview",
    currentDownload: "/api/user/resume/current/download",
    latestPreview: "/api/user/resume/latest/preview",
    latestDownload: "/api/user/resume/latest/download",
    preview: (resumeId: Primitive) => `/api/user/resume/${resumeId}/preview`,
    download: (resumeId: Primitive) => `/api/user/resume/${resumeId}/download`,
    content: (resumeId: Primitive) => `/api/user/resume/${resumeId}/content`,
    atsScore: (resumeId: Primitive) => `/api/user/resume/${resumeId}/ats-score`,
    tailorLegacy: (resumeId: Primitive) => `/api/user/resume/${resumeId}/tailor`,
    parse: (resumeId: Primitive) => `/api/user/resume/${resumeId}/parse`,
    versions: (resumeId: Primitive) => `/api/user/resume/${resumeId}/versions`,
    versionById: (resumeId: Primitive, versionId: Primitive) =>
      `/api/user/resume/${resumeId}/versions/${versionId}`,
    versionPreview: (resumeId: Primitive, versionId: Primitive) =>
      `/api/user/resume/${resumeId}/versions/${versionId}/preview`,
    versionDownload: (resumeId: Primitive, versionId: Primitive) =>
      `/api/user/resume/${resumeId}/versions/${versionId}/download`,
    versionContent: (resumeId: Primitive, versionId: Primitive) =>
      `/api/user/resume/${resumeId}/versions/${versionId}/content`,
    versionAtsScore: (resumeId: Primitive, versionId: Primitive) =>
      `/api/user/resume/${resumeId}/versions/${versionId}/ats-score`,
    versionToolKnowledge: (resumeId: Primitive) =>
      `/api/user/resume/${resumeId}/tool-knowledge`,
    tailor: {
      base: "/api/user/resume/tailor",
      ping: "/api/user/resume/tailor/ping",
      extractTools: "/api/user/resume/tailor/extract-tools",
      apply: "/api/user/resume/tailor/apply",
      toolAnswers: "/api/user/resume/tailor/tool-answers",
    },
  },

  jobApplication: {
    base: "/api/user/job-application",
    byId: (applicationId: Primitive) => `/api/user/job-application/${applicationId}`,
  },

  github: {
    base: "/api/github",
    analyze: "/api/github/analyze",
    analyzeResumeProject: "/api/github/analyze/resume-project",
    health: "/api/github/health",
  },

  interview: {
    base: "/api/interview",
    health: "/api/interview/health",
    ping: "/api/interview/ping",
    config: "/api/interview/config",
    helpMock: "/api/interview/help/mock",
    sessionBase: "/api/interview/session",
    realtimeBase: "/api/interview/realtime",
    evaluationBase: "/api/interview/evaluation",

    listUserSessions: "/api/user/interview/session",
    listAdminSessions: "/api/admin/interview/sessions",

    sessionById: (sessionId: Primitive) => `/api/interview/session/${sessionId}`,
    sessionStart: (sessionId: Primitive) => `/api/interview/session/${sessionId}/start`,
    sessionEnd: (sessionId: Primitive) => `/api/interview/session/${sessionId}/end`,
    sessionCancel: (sessionId: Primitive) => `/api/interview/session/${sessionId}/cancel`,
    sessionQuestions: (sessionId: Primitive) =>
      `/api/interview/session/${sessionId}/questions`,
    sessionTranscript: (sessionId: Primitive) =>
      `/api/interview/session/${sessionId}/transcript`,
    sessionAnswer: (sessionId: Primitive) =>
      `/api/interview/session/${sessionId}/answer`,
    evaluationBySession: (sessionId: Primitive) =>
      `/api/interview/evaluation/${sessionId}`,
  },

  admin: {
    home: "/api/admin/home",
    users: "/api/admin/users",
    profile: {
      me: "/api/admin/profile/me",
      base: "/api/admin/profile",
      sync: "/api/admin/profile/sync",
      syncResume: "/api/admin/profile/sync-resume",
    },
    resume: {
      current: "/api/admin/resume/current",
      latest: "/api/admin/resume/latest",
      list: "/api/admin/resume",
      upload: "/api/admin/resume/upload",
      byId: (resumeId: Primitive) => `/api/admin/resume/${resumeId}`,
      preview: (resumeId: Primitive) => `/api/admin/resume/${resumeId}/preview`,
      download: (resumeId: Primitive) => `/api/admin/resume/${resumeId}/download`,
      content: (resumeId: Primitive) => `/api/admin/resume/${resumeId}/content`,
      parse: (resumeId: Primitive) => `/api/admin/resume/${resumeId}/parse`,
      atsScore: (resumeId: Primitive) =>
        `/api/admin/resume/${resumeId}/ats-score`,
      tailor: (resumeId: Primitive) => `/api/admin/resume/${resumeId}/tailor`,
      versions: (resumeId: Primitive) =>
        `/api/admin/resume/${resumeId}/versions`,
      versionById: (resumeId: Primitive, versionId: Primitive) =>
        `/api/admin/resume/${resumeId}/versions/${versionId}`,
      versionPreview: (resumeId: Primitive, versionId: Primitive) =>
        `/api/admin/resume/${resumeId}/versions/${versionId}/preview`,
      versionDownload: (resumeId: Primitive, versionId: Primitive) =>
        `/api/admin/resume/${resumeId}/versions/${versionId}/download`,
      versionContent: (resumeId: Primitive, versionId: Primitive) =>
        `/api/admin/resume/${resumeId}/versions/${versionId}/content`,
      versionAtsScore: (resumeId: Primitive, versionId: Primitive) =>
        `/api/admin/resume/${resumeId}/versions/${versionId}/ats-score`,
    },
  },
};

/* =========================================================
   OPTIONAL TYPED HELPERS
========================================================= */
export const apiHelpers = {
  auth: {
    userLogin: <T>(payload: Record<string, unknown>) =>
      api.post<T>(endpoints.auth.userLogin, payload),

    adminLogin: <T>(payload: Record<string, unknown>) =>
      api.post<T>(endpoints.auth.adminLogin, payload),

    userRegister: <T>(payload: Record<string, unknown>) =>
      api.post<T>(endpoints.auth.userRegister, payload),

    me: <T>() => api.get<T>(endpoints.auth.me),

    logout: <T>() => api.post<T>(endpoints.auth.logout),
  },

  user: {
    me: <T>() => api.get<T>(endpoints.user.me),

    home: <T>() => api.get<T>(endpoints.user.home),

    onboarding: {
      get: <T>() => api.get<T>(endpoints.user.onboarding),
      status: <T>() => api.get<T>(endpoints.user.onboardingStatus),
      save: <T>(payload: Record<string, unknown>) =>
        api.post<T>(endpoints.user.onboarding, payload),
      update: <T>(payload: Record<string, unknown>) =>
        api.put<T>(endpoints.user.onboarding, payload),
      options: <T>() => api.get<T>(endpoints.user.onboardingOptions),
    },

    toolKnowledge: {
      get: <T>() => api.get<T>(endpoints.user.toolKnowledge),
      create: <T>(payload: Record<string, unknown>) =>
        api.post<T>(endpoints.user.toolKnowledge, payload),
      update: <T>(payload: Record<string, unknown>) =>
        api.put<T>(endpoints.user.toolKnowledge, payload),
    },

    profile: {
      me: <T>() => api.get<T>(endpoints.user.profile.me),
      get: <T>() => api.get<T>(endpoints.user.profile.base),
      update: <T>(payload: Record<string, unknown>) =>
        api.put<T>(endpoints.user.profile.base, payload),
      sync: <T>(payload?: Record<string, unknown>) =>
        api.post<T>(endpoints.user.profile.sync, payload || {}),
      syncResume: <T>(payload?: Record<string, unknown>) =>
        api.post<T>(endpoints.user.profile.syncResume, payload || {}),
    },
  },

  resume: {
    editorConfig: <T>() => api.get<T>(endpoints.resume.editorConfig),

    scan: <T>(file: File, extraFields?: UploadFields) =>
      api.upload<T>(endpoints.resume.scan, { file }, extraFields),

    upload: <T>(file: File, extraFields?: UploadFields) =>
      api.upload<T>(endpoints.resume.upload, { file }, extraFields),

    current: <T>() => api.get<T>(endpoints.resume.current),

    latest: <T>() => api.get<T>(endpoints.resume.latest),

    list: <T>(query?: Record<string, Primitive | Primitive[]>) =>
      api.getWithQuery<T>(endpoints.resume.list, query),

    byId: <T>(resumeId: Primitive) => api.get<T>(endpoints.resume.byId(resumeId)),

    update: <T>(resumeId: Primitive, payload: Record<string, unknown>) =>
      api.put<T>(endpoints.resume.byId(resumeId), payload),

    delete: <T>(resumeId: Primitive) =>
      api.delete<T>(endpoints.resume.byId(resumeId)),

    preview: <T>(resumeId: Primitive) =>
      api.get<T>(endpoints.resume.preview(resumeId), { rawResponse: true }),

    downloadBlob: (resumeId: Primitive) =>
      api.getBlob(endpoints.resume.download(resumeId)),

    download: (resumeId: Primitive, filename?: string) =>
      api.download(endpoints.resume.download(resumeId), filename),

    currentContent: <T>() => api.get<T>(endpoints.resume.currentContent),

    content: {
      get: <T>(resumeId: Primitive) =>
        api.get<T>(endpoints.resume.content(resumeId)),
      update: <T>(resumeId: Primitive, payload: Record<string, unknown>) =>
        api.put<T>(endpoints.resume.content(resumeId), payload),
    },

    atsScore: <T>(resumeId: Primitive, payload?: Record<string, unknown>) =>
      api.post<T>(endpoints.resume.atsScore(resumeId), payload || {}),

    parse: <T>(resumeId: Primitive, payload?: Record<string, unknown>) =>
      api.post<T>(endpoints.resume.parse(resumeId), payload || {}),

    tailorLegacy: <T>(resumeId: Primitive, payload: Record<string, unknown>) =>
      api.post<T>(endpoints.resume.tailorLegacy(resumeId), payload),

    versions: <T>(resumeId: Primitive, query?: Record<string, Primitive | Primitive[]>) =>
      api.getWithQuery<T>(endpoints.resume.versions(resumeId), query),

    versionById: <T>(resumeId: Primitive, versionId: Primitive) =>
      api.get<T>(endpoints.resume.versionById(resumeId, versionId)),

    createVersion: <T>(resumeId: Primitive, payload: Record<string, unknown>) =>
      api.post<T>(endpoints.resume.versions(resumeId), payload),

    updateVersion: <T>(
      resumeId: Primitive,
      versionId: Primitive,
      payload: Record<string, unknown>
    ) =>
      api.put<T>(
        endpoints.resume.versionById(resumeId, versionId),
        payload
      ),

    deleteVersion: <T>(resumeId: Primitive, versionId: Primitive) =>
      api.delete<T>(endpoints.resume.versionById(resumeId, versionId)),

    versionPreview: <T>(resumeId: Primitive, versionId: Primitive) =>
      api.get<T>(endpoints.resume.versionPreview(resumeId, versionId), {
        rawResponse: true,
      }),

    versionDownloadBlob: (resumeId: Primitive, versionId: Primitive) =>
      api.getBlob(endpoints.resume.versionDownload(resumeId, versionId)),

    versionDownload: (
      resumeId: Primitive,
      versionId: Primitive,
      filename?: string
    ) =>
      api.download(
        endpoints.resume.versionDownload(resumeId, versionId),
        filename
      ),

    versionContent: {
      get: <T>(resumeId: Primitive, versionId: Primitive) =>
        api.get<T>(endpoints.resume.versionContent(resumeId, versionId)),
      update: <T>(
        resumeId: Primitive,
        versionId: Primitive,
        payload: Record<string, unknown>
      ) =>
        api.put<T>(
          endpoints.resume.versionContent(resumeId, versionId),
          payload
        ),
    },

    versionAtsScore: <T>(
      resumeId: Primitive,
      versionId: Primitive,
      payload?: Record<string, unknown>
    ) =>
      api.post<T>(
        endpoints.resume.versionAtsScore(resumeId, versionId),
        payload || {}
      ),

    toolKnowledge: {
      get: <T>(resumeId: Primitive) =>
        api.get<T>(endpoints.resume.versionToolKnowledge(resumeId)),
      create: <T>(resumeId: Primitive, payload: Record<string, unknown>) =>
        api.post<T>(endpoints.resume.versionToolKnowledge(resumeId), payload),
      update: <T>(resumeId: Primitive, payload: Record<string, unknown>) =>
        api.put<T>(endpoints.resume.versionToolKnowledge(resumeId), payload),
    },

    tailor: {
      ping: <T>() => api.get<T>(endpoints.resume.tailor.ping),
      extractTools: <T>(payload: Record<string, unknown>) =>
        api.post<T>(endpoints.resume.tailor.extractTools, payload),
      apply: <T>(payload: Record<string, unknown>) =>
        api.post<T>(endpoints.resume.tailor.apply, payload),
      toolAnswers: <T>(payload: Record<string, unknown>) =>
        api.post<T>(endpoints.resume.tailor.toolAnswers, payload),
    },
  },

  jobApplication: {
    list: <T>(query?: Record<string, Primitive | Primitive[]>) =>
      api.getWithQuery<T>(endpoints.jobApplication.base, query),
    create: <T>(payload: Record<string, unknown>) =>
      api.post<T>(endpoints.jobApplication.base, payload),
    byId: <T>(applicationId: Primitive) =>
      api.get<T>(endpoints.jobApplication.byId(applicationId)),
  },

  github: {
    health: <T>() => api.get<T>(endpoints.github.health),
    analyze: <T>(payload: Record<string, unknown>) =>
      api.post<T>(endpoints.github.analyze, payload),
    analyzeResumeProject: <T>(payload: Record<string, unknown>) =>
      api.post<T>(endpoints.github.analyzeResumeProject, payload),
  },

  interview: {
    health: <T>() => api.get<T>(endpoints.interview.health),
    ping: <T>() => api.get<T>(endpoints.interview.ping),
    config: <T>() => api.get<T>(endpoints.interview.config),
    helpMock: <T>() => api.get<T>(endpoints.interview.helpMock),

    listUserSessions: <T>(query?: Record<string, Primitive | Primitive[]>) =>
      api.getWithQuery<T>(endpoints.interview.listUserSessions, query),

    listAdminSessions: <T>(query?: Record<string, Primitive | Primitive[]>) =>
      api.getWithQuery<T>(endpoints.interview.listAdminSessions, query),

    sessionById: <T>(sessionId: Primitive) =>
      api.get<T>(endpoints.interview.sessionById(sessionId)),

    start: <T>(sessionId: Primitive, payload?: Record<string, unknown>) =>
      api.post<T>(endpoints.interview.sessionStart(sessionId), payload || {}),

    end: <T>(sessionId: Primitive, payload?: Record<string, unknown>) =>
      api.post<T>(endpoints.interview.sessionEnd(sessionId), payload || {}),

    cancel: <T>(sessionId: Primitive, payload?: Record<string, unknown>) =>
      api.post<T>(endpoints.interview.sessionCancel(sessionId), payload || {}),

    questions: <T>(sessionId: Primitive) =>
      api.get<T>(endpoints.interview.sessionQuestions(sessionId)),

    transcript: <T>(sessionId: Primitive) =>
      api.get<T>(endpoints.interview.sessionTranscript(sessionId)),

    answer: <T>(sessionId: Primitive, payload: Record<string, unknown>) =>
      api.post<T>(endpoints.interview.sessionAnswer(sessionId), payload),

    evaluation: <T>(sessionId: Primitive) =>
      api.get<T>(endpoints.interview.evaluationBySession(sessionId)),
  },

  admin: {
    home: <T>() => api.get<T>(endpoints.admin.home),

    users: <T>(query?: Record<string, Primitive | Primitive[]>) =>
      api.getWithQuery<T>(endpoints.admin.users, query),

    profile: {
      me: <T>() => api.get<T>(endpoints.admin.profile.me),
      get: <T>() => api.get<T>(endpoints.admin.profile.base),
      update: <T>(payload: Record<string, unknown>) =>
        api.put<T>(endpoints.admin.profile.base, payload),
      sync: <T>(payload?: Record<string, unknown>) =>
        api.post<T>(endpoints.admin.profile.sync, payload || {}),
      syncResume: <T>(payload?: Record<string, unknown>) =>
        api.post<T>(endpoints.admin.profile.syncResume, payload || {}),
    },

    resume: {
      current: <T>() => api.get<T>(endpoints.admin.resume.current),

      latest: <T>() => api.get<T>(endpoints.admin.resume.latest),

      list: <T>(query?: Record<string, Primitive | Primitive[]>) =>
        api.getWithQuery<T>(endpoints.admin.resume.list, query),

      upload: <T>(file: File, extraFields?: UploadFields) =>
        api.upload<T>(endpoints.admin.resume.upload, { file }, extraFields),

      byId: <T>(resumeId: Primitive) =>
        api.get<T>(endpoints.admin.resume.byId(resumeId)),

      update: <T>(resumeId: Primitive, payload: Record<string, unknown>) =>
        api.put<T>(endpoints.admin.resume.byId(resumeId), payload),

      delete: <T>(resumeId: Primitive) =>
        api.delete<T>(endpoints.admin.resume.byId(resumeId)),

      preview: <T>(resumeId: Primitive) =>
        api.get<T>(endpoints.admin.resume.preview(resumeId), {
          rawResponse: true,
        }),

      downloadBlob: (resumeId: Primitive) =>
        api.getBlob(endpoints.admin.resume.download(resumeId)),

      download: (resumeId: Primitive, filename?: string) =>
        api.download(endpoints.admin.resume.download(resumeId), filename),

      content: {
        get: <T>(resumeId: Primitive) =>
          api.get<T>(endpoints.admin.resume.content(resumeId)),
        update: <T>(resumeId: Primitive, payload: Record<string, unknown>) =>
          api.put<T>(endpoints.admin.resume.content(resumeId), payload),
      },

      parse: <T>(resumeId: Primitive, payload?: Record<string, unknown>) =>
        api.post<T>(endpoints.admin.resume.parse(resumeId), payload || {}),

      atsScore: <T>(resumeId: Primitive, payload?: Record<string, unknown>) =>
        api.post<T>(endpoints.admin.resume.atsScore(resumeId), payload || {}),

      tailor: <T>(resumeId: Primitive, payload: Record<string, unknown>) =>
        api.post<T>(endpoints.admin.resume.tailor(resumeId), payload),

      versions: <T>(
        resumeId: Primitive,
        query?: Record<string, Primitive | Primitive[]>
      ) => api.getWithQuery<T>(endpoints.admin.resume.versions(resumeId), query),

      versionById: <T>(resumeId: Primitive, versionId: Primitive) =>
        api.get<T>(endpoints.admin.resume.versionById(resumeId, versionId)),

      createVersion: <T>(resumeId: Primitive, payload: Record<string, unknown>) =>
        api.post<T>(endpoints.admin.resume.versions(resumeId), payload),

      updateVersion: <T>(
        resumeId: Primitive,
        versionId: Primitive,
        payload: Record<string, unknown>
      ) =>
        api.put<T>(
          endpoints.admin.resume.versionById(resumeId, versionId),
          payload
        ),

      deleteVersion: <T>(resumeId: Primitive, versionId: Primitive) =>
        api.delete<T>(endpoints.admin.resume.versionById(resumeId, versionId)),

      versionPreview: <T>(resumeId: Primitive, versionId: Primitive) =>
        api.get<T>(endpoints.admin.resume.versionPreview(resumeId, versionId), {
          rawResponse: true,
        }),

      versionDownloadBlob: (resumeId: Primitive, versionId: Primitive) =>
        api.getBlob(endpoints.admin.resume.versionDownload(resumeId, versionId)),

      versionDownload: (
        resumeId: Primitive,
        versionId: Primitive,
        filename?: string
      ) =>
        api.download(
          endpoints.admin.resume.versionDownload(resumeId, versionId),
          filename
        ),

      versionContent: {
        get: <T>(resumeId: Primitive, versionId: Primitive) =>
          api.get<T>(endpoints.admin.resume.versionContent(resumeId, versionId)),
        update: <T>(
          resumeId: Primitive,
          versionId: Primitive,
          payload: Record<string, unknown>
        ) =>
          api.put<T>(
            endpoints.admin.resume.versionContent(resumeId, versionId),
            payload
          ),
      },

      versionAtsScore: <T>(
        resumeId: Primitive,
        versionId: Primitive,
        payload?: Record<string, unknown>
      ) =>
        api.post<T>(
          endpoints.admin.resume.versionAtsScore(resumeId, versionId),
          payload || {}
        ),
    },
  },
};