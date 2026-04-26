"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * src/components/interview/useAuth.ts
 *
 * Backend-integrated auth hook aligned with the latest project update.
 *
 * Purpose:
 * - provide a reusable auth/session hook for interview components/pages
 * - support backend validation through GET /api/auth/me
 * - support legacy/localStorage token fallback strategy already used in project
 * - support cookie/session auth and bearer-token frontend flow
 * - normalize USER / ADMIN role handling
 *
 * Backend alignment:
 * - frontend talks to Spring Boot backend only
 * - expected endpoint: GET /api/auth/me
 * - resilient to data / payload / result wrapped responses
 *
 * Supported response examples:
 * {
 *   "success": true,
 *   "data": {
 *     "id": 1,
 *     "name": "Vishrut Rana",
 *     "email": "user@example.com",
 *     "role": "USER"
 *   }
 * }
 *
 * or:
 * {
 *   "id": 1,
 *   "role": "ROLE_ADMIN"
 * }
 */

export type AuthRole = "USER" | "ADMIN" | "UNKNOWN";

export type AuthUser = {
  id?: number | string;
  userId?: number | string;
  adminId?: number | string;
  name?: string;
  fullName?: string;
  username?: string;
  email?: string;
  role?: string;
  roles?: string[];
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
  content?: T | null;
};

export type UseAuthState = {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: AuthRole;
  token: string | null;
  user: AuthUser | null;
  error: string | null;
  source: "backend" | "local" | "none";
};

export type UseAuthOptions = {
  autoLoad?: boolean;
  requireBackendValidation?: boolean;
  allowedRoles?: AuthRole[];
  meEndpoint?: string;
  onAuthResolved?: (state: UseAuthState) => void;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

const DEFAULT_ME_ENDPOINT = `${API_BASE_URL}/api/auth/me`;

function trim(value?: string | null): string {
  return (value || "").trim();
}

function normalizeRole(value?: string | null): AuthRole {
  const normalized = trim(value).toUpperCase();

  if (normalized === "USER" || normalized === "ROLE_USER") return "USER";
  if (normalized === "ADMIN" || normalized === "ROLE_ADMIN") return "ADMIN";
  return "UNKNOWN";
}

function normalizeRoleFromUser(user?: AuthUser | null): AuthRole {
  if (!user) return "UNKNOWN";

  const directRole = normalizeRole(user.role);
  if (directRole !== "UNKNOWN") return directRole;

  if (Array.isArray(user.roles)) {
    for (const item of user.roles) {
      const normalized = normalizeRole(item);
      if (normalized !== "UNKNOWN") return normalized;
    }
  }

  return "UNKNOWN";
}

function getStoredToken(): string | null {
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

function getStoredRole(): AuthRole {
  if (typeof window === "undefined") return "UNKNOWN";

  return normalizeRole(
    localStorage.getItem("userRole") || localStorage.getItem("role")
  );
}

function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("userId") ||
    localStorage.getItem("id") ||
    localStorage.getItem("authUserId") ||
    localStorage.getItem("adminId") ||
    null
  );
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie ? document.cookie.split("; ") : [];
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return null;

  return decodeURIComponent(match.substring(name.length + 1));
}

function getCookieToken(): string | null {
  return (
    getCookieValue("accessToken") ||
    getCookieValue("token") ||
    getCookieValue("authToken") ||
    null
  );
}

function getCookieRole(): AuthRole {
  return normalizeRole(
    getCookieValue("userRole") ||
      getCookieValue("role") ||
      getCookieValue("user_role")
  );
}

function unwrapPayload<T>(input: unknown): T | null {
  if (!input || typeof input !== "object") {
    return (input as T) ?? null;
  }

  const level1 = input as ApiEnvelope<T>;
  const first =
    level1.data ?? level1.payload ?? level1.result ?? level1.content ?? input;

  if (!first || typeof first !== "object") {
    return (first as T) ?? null;
  }

  const level2 = first as ApiEnvelope<T>;
  const second =
    level2.data ?? level2.payload ?? level2.result ?? level2.content ?? first;

  return (second as T) ?? null;
}

function extractMessage(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;

  const top = input as ApiEnvelope<unknown>;
  if (typeof top.message === "string" && top.message.trim()) {
    return top.message.trim();
  }

  const nested = unwrapPayload<any>(input);
  if (nested && typeof nested === "object" && typeof nested.message === "string") {
    return nested.message.trim();
  }

  return null;
}

function normalizeUser(input: unknown): AuthUser | null {
  if (!input || typeof input !== "object") return null;

  const payload = unwrapPayload<AuthUser>(input) ?? (input as AuthUser);

  if (!payload || typeof payload !== "object") return null;

  return {
    id: payload.id ?? payload.userId ?? payload.adminId,
    userId: payload.userId ?? payload.id,
    adminId: payload.adminId,
    name: payload.name ?? payload.fullName ?? payload.username,
    fullName: payload.fullName ?? payload.name,
    username: payload.username,
    email: payload.email,
    role: payload.role,
    roles: Array.isArray(payload.roles) ? payload.roles : undefined,
  };
}

function isBackendAuthenticated(input: unknown, responseOk: boolean): boolean {
  if (!input || typeof input !== "object") return responseOk;

  const payload = unwrapPayload<Record<string, unknown>>(input);
  if (!payload || typeof payload !== "object") {
    return responseOk;
  }

  if (typeof payload.authenticated === "boolean") {
    return payload.authenticated;
  }

  if (typeof payload.valid === "boolean") {
    return payload.valid;
  }

  return responseOk;
}

function buildLocalFallbackState(
  allowedRoles?: AuthRole[]
): UseAuthState {
  const token = getStoredToken() || getCookieToken();
  const role = (() => {
    const localRole = getStoredRole();
    if (localRole !== "UNKNOWN") return localRole;

    const cookieRole = getCookieRole();
    if (cookieRole !== "UNKNOWN") return cookieRole;

    return "UNKNOWN";
  })();

  const userId = getStoredUserId();

  const allowed =
    !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(role);

  const isAuthenticated = Boolean(token) && role !== "UNKNOWN" && allowed;

  return {
    isLoading: false,
    isAuthenticated,
    role: isAuthenticated ? role : "UNKNOWN",
    token,
    user: isAuthenticated
      ? {
          id: userId ?? undefined,
          userId: userId ?? undefined,
          role,
        }
      : null,
    error: null,
    source: isAuthenticated ? "local" : "none",
  };
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await response.json();
      const message =
        extractMessage(json) ||
        (typeof (json as any)?.error === "string" ? (json as any).error : null) ||
        (typeof (json as any)?.details === "string"
          ? (json as any).details
          : null);

      if (message) return message;
    } else {
      const text = await response.text();
      if (text.trim()) return text.trim();
    }
  } catch {
    // ignore
  }

  if (response.status === 401) return "You are not authenticated.";
  if (response.status === 403) return "You do not have permission to access this page.";
  return `Auth check failed with status ${response.status}.`;
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;

  [
    "token",
    "authToken",
    "accessToken",
    "jwtToken",
    "adminToken",
    "admin_token",
    "userRole",
    "role",
    "userId",
    "id",
    "authUserId",
    "adminId",
  ].forEach((key) => {
    localStorage.removeItem(key);
  });
}

export default function useAuth(options: UseAuthOptions = {}) {
  const {
    autoLoad = true,
    requireBackendValidation = true,
    allowedRoles,
    meEndpoint = DEFAULT_ME_ENDPOINT,
    onAuthResolved,
  } = options;

  const initialState = useMemo<UseAuthState>(
    () => ({
      isLoading: autoLoad,
      isAuthenticated: false,
      role: "UNKNOWN",
      token: getStoredToken() || getCookieToken(),
      user: null,
      error: null,
      source: "none",
    }),
    [autoLoad]
  );

  const [state, setState] = useState<UseAuthState>(initialState);

  const resolveState = useCallback(
    (next: UseAuthState) => {
      setState(next);
      onAuthResolved?.(next);
      return next;
    },
    [onAuthResolved]
  );

  const refreshAuth = useCallback(async (): Promise<UseAuthState> => {
    const localFallback = buildLocalFallbackState(allowedRoles);

    if (!requireBackendValidation) {
      return resolveState(localFallback);
    }

    try {
      const token = getStoredToken() || getCookieToken();

      const response = await fetch(meEndpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        if (localFallback.isAuthenticated) {
          return resolveState({
            ...localFallback,
            error: await parseErrorMessage(response),
          });
        }

        return resolveState({
          isLoading: false,
          isAuthenticated: false,
          role: "UNKNOWN",
          token,
          user: null,
          error: await parseErrorMessage(response),
          source: "none",
        });
      }

      const raw = await response.json();
      const authenticated = isBackendAuthenticated(raw, response.ok);
      const user = normalizeUser(raw);
      const role = normalizeRoleFromUser(user);
      const allowed =
        !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(role);

      const next: UseAuthState = {
        isLoading: false,
        isAuthenticated:
          authenticated && Boolean(user) && role !== "UNKNOWN" && allowed,
        role:
          authenticated && Boolean(user) && role !== "UNKNOWN" && allowed
            ? role
            : "UNKNOWN",
        token,
        user:
          authenticated && Boolean(user) && role !== "UNKNOWN" && allowed
            ? user
            : null,
        error: null,
        source: "backend",
      };

      return resolveState(next);
    } catch (error: any) {
      if (localFallback.isAuthenticated) {
        return resolveState({
          ...localFallback,
          error: error?.message || null,
        });
      }

      return resolveState({
        isLoading: false,
        isAuthenticated: false,
        role: "UNKNOWN",
        token: getStoredToken() || getCookieToken(),
        user: null,
        error: error?.message || "Unable to validate authentication.",
        source: "none",
      });
    }
  }, [allowedRoles, meEndpoint, requireBackendValidation, resolveState]);

  useEffect(() => {
    if (!autoLoad) return;

    refreshAuth();
  }, [autoLoad, refreshAuth]);

  const isUser = state.role === "USER";
  const isAdmin = state.role === "ADMIN";
  const hasAllowedRole =
    !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(state.role);

  return {
    ...state,
    isUser,
    isAdmin,
    hasAllowedRole,
    refreshAuth,
    clearStoredAuth,
  };
}