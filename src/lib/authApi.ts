// src/lib/authApi.ts
//
// Central auth API client for frontend ↔ backend integration.
//
// Purpose:
// - Single reusable API layer for authentication/session flows
// - Aligned with the latest Interview System / Resume Management System update
// - Supports:
//   - user login
//   - user registration
//   - admin login
//   - current auth user fetch
//   - logout
//   - auth/session persistence helpers
//   - resilient backend response normalization
//
// Backend alignment:
// - Spring Boot backend
// - Cookie/session auth via credentials: "include"
// - Bearer token fallback for legacy/localStorage frontend auth flow
// - Compatible with wrapped responses:
//   { data | result | payload | content }
//
// Recommended backend endpoints:
//   POST /api/auth/user/login
//   POST /api/auth/user/register
//   POST /api/auth/admin/login
//   GET  /api/auth/me
//   POST /api/auth/logout
//
// Optional fallback-compatible response shapes:
// - plain object
// - wrapped object
// - token field can be token / accessToken / jwtToken
// - role can be role / roles[]
//
// Notes:
// - This file is client-safe.
// - It can also be used in server-side contexts if token/cookies are passed explicitly.

export const AUTH_API_PATHS = {
  USER_LOGIN: "/api/auth/user/login",
  USER_REGISTER: "/api/auth/user/register",
  ADMIN_LOGIN: "/api/auth/admin/login",
  ME: "/api/auth/me",
  LOGOUT: "/api/auth/logout",
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

export type AuthRole = "USER" | "ADMIN" | "COMPANY" | "OWNER" | "UNKNOWN";

export type AuthUser = {
  id?: number | string;
  userId?: number | string;
  adminId?: number | string;
  name?: string | null;
  fullName?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role?: string | null;
  roles?: string[] | null;
};

export type AuthSession = {
  token?: string | null;
  accessToken?: string | null;
  jwtToken?: string | null;
  refreshToken?: string | null;
  role?: string | null;
  roles?: string[] | null;
  id?: number | string;
  userId?: number | string;
  adminId?: number | string;
  onboardingDone?: boolean | null;
  userOnboardingDone?: boolean | null;
  user?: AuthUser | null;
};

export type UserLoginPayload = {
  email?: string;
  username?: string;
  password: string;
};

export type UserRegisterPayload = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phone?: string;
};

export type AdminLoginPayload = {
  email?: string;
  username?: string;
  password: string;
};

export type AuthApiRequestOptions = {
  token?: string | null;
  apiBaseUrl?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  withCredentials?: RequestCredentials;
};

export type AuthStateSnapshot = {
  isAuthenticated: boolean;
  role: AuthRole;
  token: string | null;
  userId: string | null;
  onboardingDone: boolean;
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

function getRoleTokenKey(role?: string | null): string | null {
  if (!role) return null;
  const normalized = normalizeRole(role);

  if (normalized === "USER") return "userToken";
  if (normalized === "ADMIN") return "adminToken";
  if (normalized === "COMPANY") return "companyToken";
  if (normalized === "OWNER") return "ownerToken";

  return null;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const role = normalizeRole(
    localStorage.getItem("userRole") || localStorage.getItem("role") || null
  );
  const roleTokenKey = getRoleTokenKey(role);
  const roleToken = roleTokenKey ? localStorage.getItem(roleTokenKey) : null;

  return (
    roleToken ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token") ||
    localStorage.getItem("userToken") ||
    localStorage.getItem("companyToken") ||
    localStorage.getItem("ownerToken") ||
    null
  );
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

function normalizeRole(value?: string | null): AuthRole {
  const normalized = (value || "").trim().toUpperCase();

  if (normalized === "USER" || normalized === "ROLE_USER") return "USER";
  if (normalized === "ADMIN" || normalized === "ROLE_ADMIN") return "ADMIN";
  if (normalized === "COMPANY" || normalized === "ROLE_COMPANY") return "COMPANY";
  if (normalized === "OWNER" || normalized === "ROLE_OWNER") return "OWNER";
  return "UNKNOWN";
}

function normalizeRoleFromRoles(values?: unknown): AuthRole {
  if (!Array.isArray(values)) return "UNKNOWN";

  for (const value of values) {
    if (typeof value !== "string") continue;
    const role = normalizeRole(value);
    if (role !== "UNKNOWN") return role;
  }

  return "UNKNOWN";
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

/* =========================================================
   COOKIE HELPERS
========================================================= */

export const authCookie = {
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
   AUTH STORAGE HELPERS
========================================================= */

export const authStorage = {
  getToken(): string | null {
    return getAccessToken();
  },

  getRefreshToken(): string | null {
    return getRefreshToken();
  },

  getRole(): AuthRole {
    if (typeof window === "undefined") return "UNKNOWN";
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

  getOnboardingDone(): boolean {
    if (typeof window === "undefined") return false;

    const value =
      localStorage.getItem("userOnboardingDone") ||
      localStorage.getItem("onboardingDone") ||
      authCookie.get("userOnboardingDone") ||
      authCookie.get("onboardingDone");

    return safeBoolean(value) ?? false;
  },

  setToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("accessToken", token);
    localStorage.setItem("jwtToken", token);
    authCookie.set("token", token);
    authCookie.set("accessToken", token);

    const currentRole = normalizeRole(
      localStorage.getItem("userRole") || localStorage.getItem("role") || null
    );
    const roleTokenKey = getRoleTokenKey(currentRole);
    if (roleTokenKey) {
      localStorage.setItem(roleTokenKey, token);
    }
  },

  setRefreshToken(token: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem("refreshToken", token);
    authCookie.set("refreshToken", token);
  },

  setRole(role: string) {
    if (typeof window === "undefined") return;
    const normalized = normalizeRole(role);
    if (normalized === "UNKNOWN") return;

    localStorage.setItem("userRole", normalized);
    localStorage.setItem("role", normalized);
    authCookie.set("userRole", normalized);
    authCookie.set("role", normalized);

    const currentToken = getAccessToken();
    const roleTokenKey = getRoleTokenKey(normalized);
    if (currentToken && roleTokenKey) {
      localStorage.setItem(roleTokenKey, currentToken);
    }
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
    const value = String(done);
    localStorage.setItem("userOnboardingDone", value);
    localStorage.setItem("onboardingDone", value);
    authCookie.set("userOnboardingDone", value);
    authCookie.set("onboardingDone", value);
  },

  clear() {
    if (typeof window === "undefined") return;

    [
      "token",
      "authToken",
      "accessToken",
      "jwtToken",
      "refreshToken",
      "userRole",
      "role",
      "userId",
      "id",
      "authUserId",
      "adminId",
      "adminToken",
      "admin_token",
      "userToken",
      "companyToken",
      "ownerToken",
      "userOnboardingDone",
      "onboardingDone",
      "userEmail",
      "userName",
    ].forEach((key) => localStorage.removeItem(key));

    [
      "token",
      "accessToken",
      "refreshToken",
      "userRole",
      "role",
      "userOnboardingDone",
      "onboardingDone",
    ].forEach(authCookie.remove);
  },
};

/* =========================================================
   HTTP CORE
========================================================= */

export class AuthApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "AuthApiError";
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
  options: AuthApiRequestOptions = {},
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
    throw new AuthApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return unwrapResponse<T>(payload as T);
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeAuthUser(input: Partial<AuthUser> | null | undefined): AuthUser | null {
  if (!input) return null;

  return {
    id: input.id ?? input.userId ?? input.adminId,
    userId: input.userId ?? input.id,
    adminId: input.adminId,
    name: safeString(input.name),
    fullName: safeString(input.fullName),
    username: safeString(input.username),
    firstName: safeString(input.firstName),
    lastName: safeString(input.lastName),
    email: safeString(input.email),
    role: safeString(input.role),
    roles: Array.isArray(input.roles) ? normalizeStringArray(input.roles) : undefined,
  };
}

export function normalizeAuthSession(
  input: Partial<AuthSession> | null | undefined
): AuthSession | null {
  if (!input) return null;

  const normalizedUser = normalizeAuthUser(input.user || null);

  return {
    token:
      safeString(input.token) ||
      safeString(input.accessToken) ||
      safeString(input.jwtToken),
    accessToken:
      safeString(input.accessToken) ||
      safeString(input.token) ||
      safeString(input.jwtToken),
    jwtToken:
      safeString(input.jwtToken) ||
      safeString(input.accessToken) ||
      safeString(input.token),
    refreshToken: safeString(input.refreshToken),
    role: safeString(input.role),
    roles: Array.isArray(input.roles) ? normalizeStringArray(input.roles) : undefined,
    id: input.id ?? input.userId ?? input.adminId ?? normalizedUser?.id,
    userId: input.userId ?? input.id ?? normalizedUser?.userId,
    adminId: input.adminId ?? normalizedUser?.adminId,
    onboardingDone: safeBoolean(input.onboardingDone),
    userOnboardingDone: safeBoolean(input.userOnboardingDone),
    user: normalizedUser,
  };
}

export function isAuthSessionValid(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  const payload = input as Record<string, unknown>;

  if (typeof payload.authenticated === "boolean") {
    return payload.authenticated;
  }

  if (typeof payload.valid === "boolean") {
    return payload.valid;
  }

  return true;
}

export function getSessionRole(session: Partial<AuthSession> | null | undefined): AuthRole {
  if (!session) return "UNKNOWN";

  const directRole = normalizeRole(session.role);
  if (directRole !== "UNKNOWN") return directRole;

  const rolesRole = normalizeRoleFromRoles(session.roles);
  if (rolesRole !== "UNKNOWN") return rolesRole;

  const userRole = normalizeRole(session.user?.role);
  if (userRole !== "UNKNOWN") return userRole;

  return normalizeRoleFromRoles(session.user?.roles);
}

export function getSessionToken(session: Partial<AuthSession> | null | undefined): string | null {
  if (!session) return null;

  return (
    safeString(session.accessToken) ||
    safeString(session.token) ||
    safeString(session.jwtToken) ||
    null
  );
}

export function getSessionUserId(
  session: Partial<AuthSession> | null | undefined
): string | null {
  if (!session) return null;

  const value =
    session.userId ??
    session.id ??
    session.adminId ??
    session.user?.userId ??
    session.user?.id ??
    session.user?.adminId;

  if (value === undefined || value === null) return null;
  return String(value);
}

export function isOnboardingDone(
  session: Partial<AuthSession> | null | undefined
): boolean {
  if (!session) return false;

  return (
    safeBoolean(session.userOnboardingDone) ??
    safeBoolean(session.onboardingDone) ??
    false
  );
}

/* =========================================================
   SESSION PERSISTENCE HELPERS
========================================================= */

export function persistAuthSession(session: Partial<AuthSession> | null | undefined): AuthStateSnapshot {
  const normalized = normalizeAuthSession(session);
  const token = getSessionToken(normalized);
  const role = getSessionRole(normalized);
  const userId = getSessionUserId(normalized);
  const onboardingDone = isOnboardingDone(normalized);

  if (token) authStorage.setToken(token);
  if (normalized?.refreshToken) authStorage.setRefreshToken(normalized.refreshToken);
  if (role !== "UNKNOWN") authStorage.setRole(role);
  if (userId) authStorage.setUserId(userId);
  authStorage.setOnboardingDone(onboardingDone);

  return {
    isAuthenticated: Boolean(token) && role !== "UNKNOWN",
    role,
    token,
    userId,
    onboardingDone,
  };
}

export function clearAuthSession(): void {
  authStorage.clear();
}

export function getCurrentAuthSnapshot(): AuthStateSnapshot {
  const token = authStorage.getToken();
  const role = authStorage.getRole();
  const userId = authStorage.getUserId();
  const onboardingDone = authStorage.getOnboardingDone();

  return {
    isAuthenticated: Boolean(token) && role !== "UNKNOWN",
    role,
    token,
    userId,
    onboardingDone,
  };
}

/* =========================================================
   PAYLOAD BUILDERS
========================================================= */

export function buildUserLoginPayload(input: UserLoginPayload): UserLoginPayload {
  return {
    email: safeString(input.email)?.trim() || undefined,
    username: safeString(input.username)?.trim() || undefined,
    password: safeString(input.password)?.trim() || "",
  };
}

export function buildUserRegisterPayload(input: UserRegisterPayload): UserRegisterPayload {
  return {
    firstName: safeString(input.firstName)?.trim() || undefined,
    lastName: safeString(input.lastName)?.trim() || undefined,
    fullName: safeString(input.fullName)?.trim() || undefined,
    name: safeString(input.name)?.trim() || undefined,
    email: safeString(input.email)?.trim() || "",
    password: safeString(input.password)?.trim() || "",
    confirmPassword: safeString(input.confirmPassword)?.trim() || undefined,
    phone: safeString(input.phone)?.trim() || undefined,
  };
}

export function buildAdminLoginPayload(input: AdminLoginPayload): AdminLoginPayload {
  return {
    email: safeString(input.email)?.trim() || undefined,
    username: safeString(input.username)?.trim() || undefined,
    password: safeString(input.password)?.trim() || "",
  };
}

/* =========================================================
   API METHODS
========================================================= */

export async function loginUser(
  payload: UserLoginPayload,
  options?: AuthApiRequestOptions
): Promise<AuthSession> {
  const raw = await request<AuthSession>(
    "POST",
    AUTH_API_PATHS.USER_LOGIN,
    options,
    buildUserLoginPayload(payload)
  );

  return normalizeAuthSession(raw) || {};
}

export async function registerUser(
  payload: UserRegisterPayload,
  options?: AuthApiRequestOptions
): Promise<AuthSession> {
  const raw = await request<AuthSession>(
    "POST",
    AUTH_API_PATHS.USER_REGISTER,
    options,
    buildUserRegisterPayload(payload)
  );

  return normalizeAuthSession(raw) || {};
}

export async function loginAdmin(
  payload: AdminLoginPayload,
  options?: AuthApiRequestOptions
): Promise<AuthSession> {
  const raw = await request<AuthSession>(
    "POST",
    AUTH_API_PATHS.ADMIN_LOGIN,
    options,
    buildAdminLoginPayload(payload)
  );

  return normalizeAuthSession(raw) || {};
}

export async function getCurrentAuthUser(
  options?: AuthApiRequestOptions
): Promise<AuthSession> {
  const raw = await request<AuthSession>("GET", AUTH_API_PATHS.ME, options);

  if (raw && typeof raw === "object" && !isAuthSessionValid(raw)) {
    return {};
  }

  return normalizeAuthSession(raw) || {};
}

export async function logout(
  options?: AuthApiRequestOptions
): Promise<{ success: boolean; message?: string }> {
  const raw = await request<{ success?: boolean; message?: string }>(
    "POST",
    AUTH_API_PATHS.LOGOUT,
    options,
    {}
  );

  return {
    success: raw?.success ?? true,
    message: raw?.message || undefined,
  };
}

/* =========================================================
   HIGHER LEVEL HELPERS
========================================================= */

export async function loginUserAndPersist(
  payload: UserLoginPayload,
  options?: AuthApiRequestOptions
): Promise<{ session: AuthSession; snapshot: AuthStateSnapshot }> {
  const session = await loginUser(payload, options);
  const snapshot = persistAuthSession(session);
  return { session, snapshot };
}

export async function registerUserAndPersist(
  payload: UserRegisterPayload,
  options?: AuthApiRequestOptions
): Promise<{ session: AuthSession; snapshot: AuthStateSnapshot }> {
  const session = await registerUser(payload, options);
  const snapshot = persistAuthSession(session);
  return { session, snapshot };
}

export async function loginAdminAndPersist(
  payload: AdminLoginPayload,
  options?: AuthApiRequestOptions
): Promise<{ session: AuthSession; snapshot: AuthStateSnapshot }> {
  const session = await loginAdmin(payload, options);
  const snapshot = persistAuthSession(session);
  return { session, snapshot };
}

export async function logoutAndClear(
  options?: AuthApiRequestOptions
): Promise<{ success: boolean; message?: string }> {
  try {
    const result = await logout(options);
    clearAuthSession();
    return result;
  } catch (error) {
    clearAuthSession();
    throw error;
  }
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const authApi = {
  loginUser,
  registerUser,
  loginAdmin,
  getCurrentAuthUser,
  logout,

  loginUserAndPersist,
  registerUserAndPersist,
  loginAdminAndPersist,
  logoutAndClear,

  normalizeAuthUser,
  normalizeAuthSession,
  getSessionRole,
  getSessionToken,
  getSessionUserId,
  isOnboardingDone,

  persistAuthSession,
  clearAuthSession,
  getCurrentAuthSnapshot,

  buildUserLoginPayload,
  buildUserRegisterPayload,
  buildAdminLoginPayload,

  extractMessage,
  normalizeRole,
  authStorage,
  authCookie,
};

/* =========================================================
   EXAMPLE USAGE

   import { authApi } from "@/lib/authApi";

   const { session, snapshot } = await authApi.loginUserAndPersist({
     email: "user@example.com",
     password: "secret123",
   });

   const me = await authApi.getCurrentAuthUser();

   await authApi.logoutAndClear();
========================================================= */