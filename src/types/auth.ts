// src/types/auth.ts
//
// Central auth-related types and helpers for frontend ↔ backend integration.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - JWT / session-aware auth flow
// - Supports cookie/session auth with bearer-token fallback
// - Supports role-based routing for USER / ADMIN flows
// - Supports wrapped backend response styles:
//   { success, message, data | payload | result | content }
// - Aligned with the project's existing auth ideology:
//   resilient payload normalization, multi-key token handling,
//   backend-contract-based frontend auth checks, and role-aware routing

/* =========================================================
   CORE AUTH TYPES
========================================================= */

export type AuthRole = "USER" | "ADMIN" | string;

export type PublicRole = "user" | "admin";

export type AuthTokenKey =
  | "token"
  | "authToken"
  | "accessToken"
  | "jwtToken"
  | "adminToken"
  | "admin_token"
  | "userToken"
  | "companyToken"
  | "ownerToken";

export type AuthEnvelope<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  details?: unknown;
  status?: number;
  timestamp?: string;
  path?: string;
  data?: T;
  payload?: T;
  result?: T;
  content?: T;
};

export type AuthResponseLike = {
  token?: string | null;
  accessToken?: string | null;
  jwtToken?: string | null;
  authToken?: string | null;

  role?: string | null;
  roles?: string[] | null;

  id?: number | string | null;
  userId?: number | string | null;
  adminId?: number | string | null;

  email?: string | null;
  username?: string | null;
  name?: string | null;
  fullName?: string | null;

  expiresAt?: string | null;
  expiresIn?: number | null;

  data?: AuthResponseLike | null;
  payload?: AuthResponseLike | null;
  result?: AuthResponseLike | null;
  content?: AuthResponseLike | null;
};

export type AuthUser = {
  id?: number | null;
  userId?: number | null;
  adminId?: number | null;

  email?: string | null;
  username?: string | null;
  name?: string | null;
  fullName?: string | null;

  role?: AuthRole | null;
  roles?: AuthRole[];

  token?: string | null;
  expiresAt?: string | null;
  expiresIn?: number | null;
};

export type LoginPayload = {
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

export type AuthStatus = "authenticated" | "unauthenticated" | "loading";

/* =========================================================
   AUTH API ROUTE TYPES
========================================================= */

export type AuthRoutes = {
  userRegister: string;
  userLogin: string;
  adminLogin: string;
  me: string;
  logout?: string;
};

export const DEFAULT_AUTH_API_PATHS: AuthRoutes = {
  userRegister: "/api/auth/user/register",
  userLogin: "/api/auth/user/login",
  adminLogin: "/api/auth/admin/login",
  me: "/api/auth/me",
  logout: "/api/auth/logout",
};

/* =========================================================
   STORAGE / COOKIE TYPES
========================================================= */

export type StoredAuthState = {
  token?: string | null;
  role?: AuthRole | null;
  userId?: number | null;
  adminId?: number | null;
  email?: string | null;
  name?: string | null;
};

export type AuthCookieLike = {
  accessToken?: string | null;
  token?: string | null;
  role?: string | null;
  userRole?: string | null;
};

export type AuthResolutionResult = {
  token: string | null;
  role: AuthRole | null;
  userId: number | null;
  adminId: number | null;
  name: string | null;
  email: string | null;
  isAuthenticated: boolean;
};

/* =========================================================
   BASIC HELPERS
========================================================= */

export function safeString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function safeTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function safeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeRole(value?: string | null): AuthRole | null {
  if (!value || typeof value !== "string") return null;

  const normalized = value.trim().toUpperCase();

  if (!normalized) return null;

  if (normalized === "ROLE_USER") return "USER";
  if (normalized === "ROLE_ADMIN") return "ADMIN";

  return normalized;
}

export function normalizeRoles(values?: unknown): AuthRole[] {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .map((item) => normalizeRole(typeof item === "string" ? item : null))
        .filter((item): item is AuthRole => Boolean(item))
    ),
  ];
}

export function toPublicRole(role?: string | null): PublicRole | null {
  const normalized = normalizeRole(role);

  if (normalized === "USER") return "user";
  if (normalized === "ADMIN") return "admin";

  return null;
}

export function isUserRole(role?: string | null): boolean {
  return normalizeRole(role) === "USER";
}

export function isAdminRole(role?: string | null): boolean {
  return normalizeRole(role) === "ADMIN";
}

/* =========================================================
   ENVELOPE / PAYLOAD HELPERS
========================================================= */

export function unwrapAuthPayload<T>(value: T | AuthEnvelope<T> | unknown): T {
  let current = value as unknown;
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

    if (obj.content !== undefined) {
      current = obj.content;
      depth += 1;
      continue;
    }

    break;
  }

  return current as T;
}

export function extractAuthMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const record = payload as Record<string, unknown>;

  return (
    safeTrimmedString(record.message) ||
    safeTrimmedString(record.error) ||
    safeTrimmedString(record.details)
  );
}

/* =========================================================
   TOKEN HELPERS
========================================================= */

export function getTokenFromAuthPayload(
  payload: Partial<AuthResponseLike> | null | undefined
): string | null {
  if (!payload) return null;

  return (
    safeTrimmedString(payload.accessToken) ||
    safeTrimmedString(payload.token) ||
    safeTrimmedString(payload.authToken) ||
    safeTrimmedString(payload.jwtToken) ||
    null
  );
}

export function hasAuthToken(
  payload: Partial<AuthResponseLike> | null | undefined
): boolean {
  return Boolean(getTokenFromAuthPayload(payload));
}

/* =========================================================
   AUTH RESPONSE NORMALIZERS
========================================================= */

export function normalizeAuthResponse(
  input: AuthResponseLike | Record<string, unknown> | null | undefined
): AuthUser | null {
  if (!input) return null;

  const source = unwrapAuthPayload<AuthResponseLike | Record<string, unknown>>(input);
  const record = (source || {}) as Record<string, unknown>;

  const role =
    normalizeRole(safeString(record.role)) ||
    normalizeRoles(record.roles)[0] ||
    null;

  const roles = normalizeRoles(record.roles);
  if (role && !roles.includes(role)) {
    roles.unshift(role);
  }

  return {
    id: safeNumber(record.id),
    userId: safeNumber(record.userId ?? record.id),
    adminId: safeNumber(record.adminId ?? record.id),

    email: safeString(record.email) || null,
    username: safeString(record.username) || null,
    name:
      safeString(record.name) ||
      safeString(record.fullName) ||
      null,
    fullName:
      safeString(record.fullName) ||
      safeString(record.name) ||
      null,

    role,
    roles,

    token:
      safeTrimmedString(record.accessToken) ||
      safeTrimmedString(record.token) ||
      safeTrimmedString(record.authToken) ||
      safeTrimmedString(record.jwtToken) ||
      null,

    expiresAt: safeString(record.expiresAt) || null,
    expiresIn: safeNumber(record.expiresIn),
  };
}

export function getAuthUserDisplayName(
  user: Partial<AuthUser> | null | undefined
): string {
  if (!user) return "User";

  return (
    user.fullName ||
    user.name ||
    user.username ||
    user.email ||
    "User"
  );
}

/* =========================================================
   LOCAL STORAGE HELPERS
========================================================= */

export function getStoredRoleTokenKey(role?: AuthRole | null): string | null {
  if (!role) return null;

  const normalized = normalizeRole(role);
  if (normalized === "USER") return "userToken";
  if (normalized === "ADMIN") return "adminToken";
  if (normalized === "COMPANY") return "companyToken";
  if (normalized === "OWNER") return "ownerToken";

  return null;
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const roleTokenKey = getStoredRoleTokenKey(getStoredRole());
  const roleToken = roleTokenKey ? localStorage.getItem(roleTokenKey) : null;

  return (
    safeTrimmedString(roleToken) ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token") ||
    localStorage.getItem("userToken") ||
    localStorage.getItem("companyToken") ||
    localStorage.getItem("ownerToken") ||
    null
  );
}

export function getStoredRole(): AuthRole | null {
  if (typeof window === "undefined") return null;

  return (
    normalizeRole(localStorage.getItem("userRole")) ||
    normalizeRole(localStorage.getItem("role")) ||
    null
  );
}

export function getStoredUserId(): number | null {
  if (typeof window === "undefined") return null;

  return (
    safeNumber(localStorage.getItem("userId")) ??
    safeNumber(localStorage.getItem("id")) ??
    null
  );
}

export function getStoredAdminId(): number | null {
  if (typeof window === "undefined") return null;

  return (
    safeNumber(localStorage.getItem("adminId")) ??
    safeNumber(localStorage.getItem("id")) ??
    null
  );
}

export function getStoredAuthState(): StoredAuthState {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    token: getStoredAccessToken(),
    role: getStoredRole(),
    userId: getStoredUserId(),
    adminId: getStoredAdminId(),
    email: localStorage.getItem("email") || null,
    name:
      localStorage.getItem("name") ||
      localStorage.getItem("fullName") ||
      null,
  };
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;

  const keys: string[] = [
    "token",
    "authToken",
    "accessToken",
    "jwtToken",
    "adminToken",
    "admin_token",
    "userToken",
    "companyToken",
    "ownerToken",
    "role",
    "userRole",
    "userId",
    "adminId",
    "id",
    "email",
    "name",
    "fullName",
  ];

  keys.forEach((key) => {
    localStorage.removeItem(key);
  });
}

export function persistAuthState(user: Partial<AuthUser> | null | undefined): void {
  if (typeof window === "undefined" || !user) return;

  const token = safeTrimmedString(user.token) || null;
  const role = normalizeRole(user.role || user.roles?.[0] || null);
  const roleTokenKey = getStoredRoleTokenKey(role);

  if (token) {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("jwtToken", token);
    if (roleTokenKey) {
      localStorage.setItem(roleTokenKey, token);
    }
  }

  if (role) {
    localStorage.setItem("userRole", role);
    localStorage.setItem("role", role);
  }

  if (typeof user.userId === "number") {
    localStorage.setItem("userId", String(user.userId));
    localStorage.setItem("id", String(user.userId));
  } else if (typeof user.adminId === "number") {
    localStorage.setItem("adminId", String(user.adminId));
    localStorage.setItem("id", String(user.adminId));
  } else if (typeof user.id === "number") {
    localStorage.setItem("id", String(user.id));
  }

  if (isNonEmptyString(user.email)) {
    localStorage.setItem("email", user.email);
  }

  if (isNonEmptyString(user.name)) {
    localStorage.setItem("name", user.name);
  }

  if (isNonEmptyString(user.fullName)) {
    localStorage.setItem("fullName", user.fullName);
  }
}

/* =========================================================
   COOKIE HELPERS
========================================================= */

export function parseCookieString(cookieString?: string | null): Record<string, string> {
  if (!cookieString || typeof cookieString !== "string") {
    return {};
  }

  return cookieString
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const index = part.indexOf("=");
      if (index === -1) return acc;

      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();

      if (key) {
        acc[key] = decodeURIComponent(value);
      }

      return acc;
    }, {});
}

export function resolveAuthFromCookies(cookieString?: string | null): AuthResolutionResult {
  const cookies = parseCookieString(cookieString);

  const token =
    cookies.accessToken ||
    cookies.token ||
    null;

  const role =
    normalizeRole(cookies.role) ||
    normalizeRole(cookies.userRole) ||
    null;

  return {
    token,
    role,
    userId: safeNumber(cookies.userId),
    adminId: safeNumber(cookies.adminId),
    name: null,
    email: null,
    isAuthenticated: Boolean(token),
  };
}

/* =========================================================
   COMBINED AUTH RESOLUTION
========================================================= */

export function resolveClientAuthState(): AuthResolutionResult {
  const stored = getStoredAuthState();

  return {
    token: stored.token || null,
    role: normalizeRole(stored.role || null),
    userId: safeNumber(stored.userId),
    adminId: safeNumber(stored.adminId),
    name: stored.name || null,
    email: stored.email || null,
    isAuthenticated: Boolean(stored.token),
  };
}

/* =========================================================
   ROUTING / GUARD HELPERS
========================================================= */

export function isAuthenticatedAuthState(
  auth: Partial<AuthResolutionResult> | null | undefined
): boolean {
  return Boolean(auth?.isAuthenticated || auth?.token);
}

export function canAccessUserRoutes(role?: string | null): boolean {
  return isUserRole(role);
}

export function canAccessAdminRoutes(role?: string | null): boolean {
  return isAdminRole(role);
}

export function getDefaultRouteForRole(role?: string | null): string {
  const normalized = normalizeRole(role);

  if (normalized === "ADMIN") return "/admin";
  if (normalized === "USER") return "/user";

  return "/auth/login";
}

export function getLoginRouteForRole(role?: string | null): string {
  const normalized = normalizeRole(role);

  if (normalized === "ADMIN") return "/auth/admin/login";
  return "/auth/login";
}

/* =========================================================
   REQUEST PAYLOAD BUILDERS
========================================================= */

export function buildLoginPayload(input: LoginPayload): LoginPayload {
  return {
    email: safeTrimmedString(input.email),
    username: safeTrimmedString(input.username),
    password: typeof input.password === "string" ? input.password : "",
  };
}

export function buildUserRegisterPayload(
  input: UserRegisterPayload
): UserRegisterPayload {
  return {
    firstName: safeTrimmedString(input.firstName),
    lastName: safeTrimmedString(input.lastName),
    fullName: safeTrimmedString(input.fullName),
    name: safeTrimmedString(input.name),
    email: safeTrimmedString(input.email) || "",
    password: typeof input.password === "string" ? input.password : "",
    confirmPassword: safeTrimmedString(input.confirmPassword),
    phone: safeTrimmedString(input.phone),
  };
}

/* =========================================================
   ERROR HELPERS
========================================================= */

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    return (
      safeTrimmedString(record.message) ||
      safeTrimmedString(record.error) ||
      "Authentication request failed."
    );
  }

  return "Authentication request failed.";
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const authTypeUtils = {
  normalizeRole,
  normalizeRoles,
  toPublicRole,
  isUserRole,
  isAdminRole,

  unwrapAuthPayload,
  extractAuthMessage,

  getTokenFromAuthPayload,
  hasAuthToken,
  normalizeAuthResponse,
  getAuthUserDisplayName,

  getStoredAccessToken,
  getStoredRole,
  getStoredUserId,
  getStoredAdminId,
  getStoredAuthState,
  clearStoredAuth,
  persistAuthState,

  parseCookieString,
  resolveAuthFromCookies,
  resolveClientAuthState,

  isAuthenticatedAuthState,
  canAccessUserRoutes,
  canAccessAdminRoutes,
  getDefaultRouteForRole,
  getLoginRouteForRole,

  buildLoginPayload,
  buildUserRegisterPayload,
  getAuthErrorMessage,
};

/* =========================================================
   EXAMPLE USAGE

   import type {
     AuthResponseLike,
     AuthUser,
     LoginPayload,
     UserRegisterPayload,
   } from "@/types/auth";

   import { authTypeUtils } from "@/types/auth";

   const normalized = authTypeUtils.normalizeAuthResponse(apiResponse);
   const role = authTypeUtils.normalizeRole(normalized?.role);
   const canUseAdmin = authTypeUtils.canAccessAdminRoutes(role);
========================================================= */