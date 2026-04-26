// src/lib/profileNavbarApi.ts
//
// Central Profile Navbar API client for frontend ↔ backend integration.
//
// Purpose:
// - Single reusable API layer for navbar/profile-menu related flows
// - Supports both USER and ADMIN navbar/profile dropdowns
// - Provides lightweight profile summary data for:
//   - ProfileButton
//   - ProfileDropdown
//   - UserNavbar
//   - AdminNavbar
// - Handles logout integration with backend
// - Normalizes backend response shapes for stable frontend usage
//
// Recommended backend endpoints:
//   GET  /api/auth/me
//   GET  /api/user/profile
//   GET  /api/admin/profile
//   POST /api/auth/logout
//
// Optional endpoints supported by fallback logic:
//   GET  /api/user/me
//   GET  /api/admin/me
//   GET  /api/user/profile/me
//   GET  /api/admin/profile/me
//   POST /api/auth/signout
//   POST /logout
//
// Supported response styles:
// - plain object
// - wrapped { data | result | payload | content }
// - nested wrapped payloads
// - boolean/string-friendly backend values
//
// Notes:
// - Uses cookie/session auth via credentials: "include"
// - Keeps bearer token fallback for older frontend auth flow
// - Designed to align with your Interview System / Resume Management System architecture
// - Mirrors latest project update around resilient auth/profile handling

export const PROFILE_NAVBAR_API_PATHS = {
  AUTH_ME: "/api/auth/me",
  AUTH_LOGOUT: "/api/auth/logout",
  USER_PROFILE: "/api/user/profile",
  ADMIN_PROFILE: "/api/admin/profile",
} as const;

/* =========================================================
   TYPES
========================================================= */

export type UserRole = "USER" | "ADMIN" | "UNKNOWN" | string;

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

export type AuthMePayload = {
  userId?: number | null;
  adminId?: number | null;
  profileId?: number | null;

  role?: string | null;
  userRole?: string | null;
  roles?: string[] | null;

  email?: string | null;
  username?: string | null;

  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;

  onboardingDone?: boolean | null;
  userOnboardingDone?: boolean | null;
};

export type AuthMeResponse = {
  success?: boolean;
  authenticated?: boolean;
  valid?: boolean;

  userId?: number | null;
  adminId?: number | null;
  profileId?: number | null;

  role?: string | null;
  userRole?: string | null;
  roles?: string[] | null;

  email?: string | null;
  username?: string | null;

  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;

  onboardingDone?: boolean | null;
  userOnboardingDone?: boolean | null;

  data?: AuthMePayload | null;
};

export type UserProfileNavbarData = {
  profileId?: number | null;
  id?: number | null;
  userId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;
  headline?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  currentRole?: string | null;
  summary?: string | null;
  profileCompletionPercentage?: number | null;
  completionPercentage?: number | null;
  profileCompleted?: boolean | null;
  updatedAt?: string | null;
};

export type AdminProfileNavbarData = {
  profileId?: number | null;
  id?: number | null;
  adminId?: number | null;
  userId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;
  headline?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  currentRole?: string | null;
  designation?: string | null;
  department?: string | null;
  summary?: string | null;
  profileCompletionPercentage?: number | null;
  completionPercentage?: number | null;
  profileCompleted?: boolean | null;
  updatedAt?: string | null;
};

export type NavbarProfileSummary = {
  userId?: number | null;
  adminId?: number | null;
  profileId?: number | null;

  role: UserRole | null;
  email?: string | null;

  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;

  displayName: string;
  subtitle?: string | null;
  location?: string | null;

  headline?: string | null;
  currentRole?: string | null;
  designation?: string | null;
  department?: string | null;

  profileCompletionPercentage?: number | null;
  profileCompleted?: boolean | null;
  onboardingDone?: boolean | null;

  initials: string;
  updatedAt?: string | null;
};

export type LogoutResponse = {
  success?: boolean;
  message?: string;
};

export type ProfileNavbarApiRequestOptions = {
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
    process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") ||
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

function safeString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeNumber(value: unknown): number | null {
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

function normalizeRole(role: unknown): UserRole | null {
  if (typeof role !== "string" || !role.trim()) return null;
  return role.trim().toUpperCase().replace(/^ROLE_/, "");
}

function normalizeRolesArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim().toUpperCase().replace(/^ROLE_/, "") : ""))
    .filter(Boolean);
}

function resolveRoleFromSources(...values: unknown[]): UserRole | null {
  for (const value of values) {
    const direct = normalizeRole(value);
    if (direct) return direct;

    if (Array.isArray(value)) {
      const fromArray = normalizeRolesArray(value)[0];
      if (fromArray) return fromArray;
    }
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

function clearFrontendSession() {
  if (typeof window === "undefined") return;

  const keys = [
    "accessToken",
    "token",
    "authToken",
    "jwtToken",
    "refreshToken",
    "userRole",
    "role",
    "userOnboardingDone",
    "onboardingDone",
    "adminInterviewToken",
    "adminToken",
    "admin_token",
    "userId",
    "id",
    "authUserId",
    "adminId",
  ];

  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  const cookieNames = [
    "accessToken",
    "token",
    "refreshToken",
    "userRole",
    "role",
    "userOnboardingDone",
    "onboardingDone",
  ];

  for (const name of cookieNames) {
    try {
      document.cookie = `${encodeURIComponent(
        name
      )}=; path=/; max-age=0; samesite=lax`;
    } catch {
      // ignore
    }
  }
}

function buildInitials(...values: Array<string | null | undefined>): string {
  const parts = values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .flatMap((value) => value.trim().split(/\s+/));

  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
}

/* =========================================================
   HTTP CORE
========================================================= */

export class ProfileNavbarApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "ProfileNavbarApiError";
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
  options: ProfileNavbarApiRequestOptions = {},
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
    throw new ProfileNavbarApiError(
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
  options: ProfileNavbarApiRequestOptions = {},
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

  if (lastError instanceof ProfileNavbarApiError) {
    throw lastError;
  }

  throw new ProfileNavbarApiError("Request failed.", 500, lastError);
}

/* =========================================================
   PATH HELPERS
========================================================= */

function authMePaths() {
  return [
    PROFILE_NAVBAR_API_PATHS.AUTH_ME,
    "/api/user/me",
    "/api/admin/me",
  ];
}

function userProfilePaths() {
  return [
    PROFILE_NAVBAR_API_PATHS.USER_PROFILE,
    `${PROFILE_NAVBAR_API_PATHS.USER_PROFILE}/me`,
  ];
}

function adminProfilePaths() {
  return [
    PROFILE_NAVBAR_API_PATHS.ADMIN_PROFILE,
    `${PROFILE_NAVBAR_API_PATHS.ADMIN_PROFILE}/me`,
  ];
}

function logoutPaths() {
  return [
    PROFILE_NAVBAR_API_PATHS.AUTH_LOGOUT,
    "/api/auth/signout",
    "/logout",
  ];
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeAuthMeResponse(
  value: Partial<AuthMeResponse> | null | undefined
): AuthMeResponse | null {
  if (!value) return null;

  const nested = value.data ?? null;

  return {
    success: typeof value.success === "boolean" ? value.success : undefined,
    authenticated:
      safeBoolean(value.authenticated) ??
      safeBoolean(value.valid) ??
      undefined,
    valid: safeBoolean(value.valid) ?? undefined,

    userId: safeNumber(value.userId ?? nested?.userId),
    adminId: safeNumber(value.adminId ?? nested?.adminId),
    profileId: safeNumber(value.profileId ?? nested?.profileId),

    role:
      (resolveRoleFromSources(
        value.role,
        value.userRole,
        value.roles,
        nested?.role,
        nested?.userRole,
        nested?.roles
      ) as string | null) ?? null,
    userRole:
      (resolveRoleFromSources(
        value.userRole,
        value.role,
        value.roles,
        nested?.userRole,
        nested?.role,
        nested?.roles
      ) as string | null) ?? null,
    roles: normalizeRolesArray(value.roles ?? nested?.roles),

    email: safeString(value.email ?? nested?.email),
    username: safeString(value.username ?? nested?.username),

    firstName: safeString(value.firstName ?? nested?.firstName),
    lastName: safeString(value.lastName ?? nested?.lastName),
    fullName: safeString(value.fullName ?? nested?.fullName ?? value.name ?? nested?.name),
    name: safeString(value.name ?? nested?.name),

    onboardingDone:
      safeBoolean(value.onboardingDone ?? nested?.onboardingDone) ?? undefined,
    userOnboardingDone:
      safeBoolean(value.userOnboardingDone ?? nested?.userOnboardingDone) ?? undefined,

    data: {
      userId: safeNumber(nested?.userId),
      adminId: safeNumber(nested?.adminId),
      profileId: safeNumber(nested?.profileId),
      role: (resolveRoleFromSources(nested?.role, nested?.userRole, nested?.roles) as string | null) ?? null,
      userRole:
        (resolveRoleFromSources(nested?.userRole, nested?.role, nested?.roles) as string | null) ?? null,
      roles: normalizeRolesArray(nested?.roles),
      email: safeString(nested?.email),
      username: safeString(nested?.username),
      firstName: safeString(nested?.firstName),
      lastName: safeString(nested?.lastName),
      fullName: safeString(nested?.fullName ?? nested?.name),
      name: safeString(nested?.name),
      onboardingDone: safeBoolean(nested?.onboardingDone),
      userOnboardingDone: safeBoolean(nested?.userOnboardingDone),
    },
  };
}

export function normalizeUserProfileNavbarData(
  value: Partial<UserProfileNavbarData> | null | undefined
): UserProfileNavbarData | null {
  if (!value) return null;

  return {
    profileId: safeNumber(value.profileId ?? value.id),
    id: safeNumber(value.id ?? value.profileId),
    userId: safeNumber(value.userId),
    firstName: safeString(value.firstName),
    lastName: safeString(value.lastName),
    fullName: safeString(value.fullName ?? value.name),
    name: safeString(value.name),
    headline: safeString(value.headline),
    email: safeString(value.email),
    phone: safeString(value.phone),
    location: safeString(value.location),
    currentRole: safeString(value.currentRole),
    summary: safeString(value.summary),
    profileCompletionPercentage: safeNumber(value.profileCompletionPercentage),
    completionPercentage: safeNumber(value.completionPercentage),
    profileCompleted: safeBoolean(value.profileCompleted),
    updatedAt: safeString(value.updatedAt),
  };
}

export function normalizeAdminProfileNavbarData(
  value: Partial<AdminProfileNavbarData> | null | undefined
): AdminProfileNavbarData | null {
  if (!value) return null;

  return {
    profileId: safeNumber(value.profileId ?? value.id),
    id: safeNumber(value.id ?? value.profileId),
    adminId: safeNumber(value.adminId),
    userId: safeNumber(value.userId),
    firstName: safeString(value.firstName),
    lastName: safeString(value.lastName),
    fullName: safeString(value.fullName ?? value.name),
    name: safeString(value.name),
    headline: safeString(value.headline),
    email: safeString(value.email),
    phone: safeString(value.phone),
    location: safeString(value.location),
    currentRole: safeString(value.currentRole),
    designation: safeString(value.designation),
    department: safeString(value.department),
    summary: safeString(value.summary),
    profileCompletionPercentage: safeNumber(value.profileCompletionPercentage),
    completionPercentage: safeNumber(value.completionPercentage),
    profileCompleted: safeBoolean(value.profileCompleted),
    updatedAt: safeString(value.updatedAt),
  };
}

/* =========================================================
   SUMMARY BUILDERS
========================================================= */

export function buildNavbarProfileSummary(input: {
  auth?: AuthMeResponse | null;
  userProfile?: UserProfileNavbarData | null;
  adminProfile?: AdminProfileNavbarData | null;
}): NavbarProfileSummary {
  const auth = input.auth ?? null;
  const userProfile = input.userProfile ?? null;
  const adminProfile = input.adminProfile ?? null;

  const role =
    resolveRoleFromSources(
      auth?.userRole,
      auth?.role,
      auth?.roles,
      auth?.data?.userRole,
      auth?.data?.role,
      auth?.data?.roles
    ) ??
    (adminProfile ? "ADMIN" : userProfile ? "USER" : null);

  const profileCompletion =
    safeNumber(
      userProfile?.profileCompletionPercentage ??
        userProfile?.completionPercentage ??
        adminProfile?.profileCompletionPercentage ??
        adminProfile?.completionPercentage
    ) ?? null;

  const profileCompleted =
    safeBoolean(userProfile?.profileCompleted ?? adminProfile?.profileCompleted) ??
    (profileCompletion !== null ? profileCompletion >= 70 : null);

  const firstName =
    userProfile?.firstName ??
    adminProfile?.firstName ??
    auth?.firstName ??
    auth?.data?.firstName ??
    null;

  const lastName =
    userProfile?.lastName ??
    adminProfile?.lastName ??
    auth?.lastName ??
    auth?.data?.lastName ??
    null;

  const fullName =
    userProfile?.fullName ??
    adminProfile?.fullName ??
    auth?.fullName ??
    auth?.data?.fullName ??
    auth?.name ??
    auth?.data?.name ??
    null;

  const displayName =
    fullName ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    userProfile?.name ||
    adminProfile?.name ||
    userProfile?.email ||
    adminProfile?.email ||
    auth?.email ||
    auth?.data?.email ||
    (role === "ADMIN" ? "Admin" : "User");

  const subtitle =
    adminProfile?.designation ||
    userProfile?.currentRole ||
    adminProfile?.currentRole ||
    adminProfile?.headline ||
    userProfile?.headline ||
    (role === "ADMIN" ? "Admin Panel" : "User Panel");

  return {
    userId:
      safeNumber(userProfile?.userId) ??
      safeNumber(auth?.userId) ??
      safeNumber(auth?.data?.userId),
    adminId:
      safeNumber(adminProfile?.adminId) ??
      safeNumber(auth?.adminId) ??
      safeNumber(auth?.data?.adminId),
    profileId:
      safeNumber(userProfile?.profileId) ??
      safeNumber(adminProfile?.profileId) ??
      safeNumber(auth?.profileId) ??
      safeNumber(auth?.data?.profileId),

    role,
    email:
      userProfile?.email ??
      adminProfile?.email ??
      auth?.email ??
      auth?.data?.email ??
      null,

    firstName,
    lastName,
    fullName,

    displayName,
    subtitle,
    location: userProfile?.location ?? adminProfile?.location ?? null,

    headline: userProfile?.headline ?? adminProfile?.headline ?? null,
    currentRole: userProfile?.currentRole ?? adminProfile?.currentRole ?? null,
    designation: adminProfile?.designation ?? null,
    department: adminProfile?.department ?? null,

    profileCompletionPercentage: profileCompletion,
    profileCompleted,
    onboardingDone:
      safeBoolean(auth?.userOnboardingDone) ??
      safeBoolean(auth?.onboardingDone) ??
      safeBoolean(auth?.data?.userOnboardingDone) ??
      safeBoolean(auth?.data?.onboardingDone),

    initials: buildInitials(displayName),
    updatedAt: userProfile?.updatedAt ?? adminProfile?.updatedAt ?? null,
  };
}

/* =========================================================
   API METHODS
========================================================= */

export async function getAuthMe(
  options?: ProfileNavbarApiRequestOptions
): Promise<AuthMeResponse | null> {
  const raw = await requestWithFallback<AuthMeResponse>(
    ["GET"],
    authMePaths(),
    options
  );

  return normalizeAuthMeResponse(raw);
}

export async function getUserNavbarProfile(
  options?: ProfileNavbarApiRequestOptions
): Promise<UserProfileNavbarData | null> {
  const raw = await requestWithFallback<UserProfileNavbarData>(
    ["GET"],
    userProfilePaths(),
    options
  );

  return normalizeUserProfileNavbarData(raw);
}

export async function getAdminNavbarProfile(
  options?: ProfileNavbarApiRequestOptions
): Promise<AdminProfileNavbarData | null> {
  const raw = await requestWithFallback<AdminProfileNavbarData>(
    ["GET"],
    adminProfilePaths(),
    options
  );

  return normalizeAdminProfileNavbarData(raw);
}

export async function getNavbarProfileSummary(
  options?: ProfileNavbarApiRequestOptions
): Promise<NavbarProfileSummary> {
  const auth = await getAuthMe(options);

  const role =
    resolveRoleFromSources(
      auth?.userRole,
      auth?.role,
      auth?.roles,
      auth?.data?.userRole,
      auth?.data?.role,
      auth?.data?.roles
    ) ?? "USER";

  if (role === "ADMIN") {
    const adminProfile = await getAdminNavbarProfile(options);
    return buildNavbarProfileSummary({
      auth,
      adminProfile,
    });
  }

  const userProfile = await getUserNavbarProfile(options);
  return buildNavbarProfileSummary({
    auth,
    userProfile,
  });
}

export async function logoutProfileSession(
  options?: ProfileNavbarApiRequestOptions
): Promise<LogoutResponse> {
  try {
    const raw = await requestWithFallback<LogoutResponse>(
      ["POST"],
      logoutPaths(),
      options,
      {}
    );

    clearFrontendSession();

    return {
      success: raw?.success ?? true,
      message: raw?.message ?? "Logged out successfully.",
    };
  } catch (error) {
    clearFrontendSession();

    if (error instanceof ProfileNavbarApiError) {
      return {
        success: true,
        message: error.message || "Logged out locally.",
      };
    }

    return {
      success: true,
      message: "Logged out locally.",
    };
  }
}

/* =========================================================
   UI HELPERS
========================================================= */

export function getNavbarRoleLabel(role?: string | null): string {
  const normalized = normalizeRole(role);
  if (normalized === "ADMIN") return "Admin";
  if (normalized === "USER") return "User";
  return "Account";
}

export function getNavbarCompletionLabel(
  completion?: number | null
): string {
  if (completion === null || completion === undefined) return "Incomplete";
  if (completion >= 100) return "Complete";
  if (completion >= 70) return "Almost complete";
  if (completion >= 40) return "In progress";
  return "Get started";
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const profileNavbarApi = {
  getAuthMe,
  getUserNavbarProfile,
  getAdminNavbarProfile,
  getNavbarProfileSummary,
  logoutProfileSession,

  normalizeAuthMeResponse,
  normalizeUserProfileNavbarData,
  normalizeAdminProfileNavbarData,
  buildNavbarProfileSummary,

  getNavbarRoleLabel,
  getNavbarCompletionLabel,
  normalizeRole,
  clearFrontendSession,
};

/* =========================================================
   EXAMPLE USAGE

   import { profileNavbarApi } from "@/lib/profileNavbarApi";

   const summary = await profileNavbarApi.getNavbarProfileSummary();

   const logoutResult = await profileNavbarApi.logoutProfileSession();
========================================================= */