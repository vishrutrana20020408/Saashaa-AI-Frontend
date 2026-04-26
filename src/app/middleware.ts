import { NextRequest, NextResponse } from "next/server";

/**
 * src/middleware.ts
 *
 * Backend-Integrated Auth Middleware
 *
 * Latest project alignment:
 * - protects /admin and /user routes
 * - supports backend-issued auth cookies
 * - supports legacy/current cookie names
 * - optionally validates token/session against backend
 * - enforces onboarding flow for USER routes
 * - redirects authenticated users away from auth pages
 * - allows ADMIN to bypass user onboarding gate
 *
 * Recommended env:
 * - NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
 * - AUTH_VALIDATE_PATH=/api/auth/me
 *
 * Notes:
 * - Middleware runs on the server/edge, so localStorage is not available.
 * - Onboarding enforcement here relies on cookies and optional backend validation.
 */

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/company/login",
  "/owner/login",
  "/admin/company/login",
];

const DEFAULT_LOGIN_PATH = "/auth/login";
const DEFAULT_USER_HOME = "/user";
const DEFAULT_USER_SETUP = "/user/setup";
const DEFAULT_ADMIN_HOME = "/admin";
const DEFAULT_COMPANY_HOME = "/company";
const DEFAULT_OWNER_HOME = "/owner";
const DEFAULT_PUBLIC_HOME = "/";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") || "";

const AUTH_VALIDATE_PATH =
  process.env.AUTH_VALIDATE_PATH?.trim() || "/api/auth/me";

type AuthState = {
  token: string;
  refreshToken: string;
  role: string;
  onboardingDone: boolean;
  isAdmin: boolean;
  isUser: boolean;
  isCompany: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
};

type BackendValidateResponse = {
  success?: boolean;
  authenticated?: boolean;
  valid?: boolean;
  data?: {
    id?: number | string;
    role?: string;
    userRole?: string;
    roles?: string[];
    onboardingDone?: boolean;
    authenticated?: boolean;
    valid?: boolean;
  } | null;
  role?: string;
  userRole?: string;
  roles?: string[];
  onboardingDone?: boolean;
};

function normalizeRole(role: string | undefined | null): string {
  return (role ?? "").trim().toUpperCase().replace(/^ROLE_/, "");
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return fallback;
}

function getCookieValue(request: NextRequest, ...names: string[]): string {
  for (const name of names) {
    const value = request.cookies.get(name)?.value;
    if (value) return value;
  }
  return "";
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAdminRoute(pathname: string): boolean {
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/company/login"
  ) {
    return false;
  }
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isCompanyRoute(pathname: string): boolean {
  return pathname === "/company" || pathname.startsWith("/company/");
}

function isOwnerRoute(pathname: string): boolean {
  return pathname === "/owner" || pathname.startsWith("/owner/");
}

function isUserRoute(pathname: string): boolean {
  return pathname === "/user" || pathname.startsWith("/user/");
}

function isUserSetupRoute(pathname: string): boolean {
  return (
    pathname === DEFAULT_USER_SETUP ||
    pathname.startsWith(`${DEFAULT_USER_SETUP}/`)
  );
}

function getTokenPathSegment(value: string): string {
  const raw = value
    .replace(/[^A-Za-z0-9\-_.~]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32)
    .replace(/^-+|-+$/g, "");

  return raw || "session-token";
}

function getTokenPathPrefix(token: string): string {
  if (!token) return "";
  return `/${getTokenPathSegment(token)}`;
}

function isTokenRoute(pathname: string, tokenPrefix: string): boolean {
  return (
    tokenPrefix !== "" &&
    (pathname === tokenPrefix || pathname.startsWith(`${tokenPrefix}/`))
  );
}

function redirect(request: NextRequest, path: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  return NextResponse.redirect(url);
}

function nextWithHeaders(auth: AuthState): NextResponse {
  const response = NextResponse.next();

  response.headers.set("x-auth-role", auth.role || "");
  response.headers.set("x-auth-is-admin", String(auth.isAdmin));
  response.headers.set("x-auth-is-user", String(auth.isUser));
  response.headers.set("x-auth-is-company", String(auth.isCompany));
  response.headers.set("x-auth-is-owner", String(auth.isOwner));
  response.headers.set("x-auth-onboarding-done", String(auth.onboardingDone));
  response.headers.set("x-auth-authenticated", String(auth.isAuthenticated));

  return response;
}

function unauthenticatedState(): AuthState {
  return {
    token: "",
    refreshToken: "",
    role: "",
    onboardingDone: false,
    isAdmin: false,
    isUser: false,
    isCompany: false,
    isOwner: false,
    isAuthenticated: false,
  };
}

function buildAuthState(
  token: string,
  refreshToken: string,
  role: string,
  onboardingDone: boolean
): AuthState {
  return {
    token,
    refreshToken,
    role,
    onboardingDone,
    isAdmin: role === "ADMIN",
    isUser: role === "USER",
    isCompany: role === "COMPANY",
    isOwner: role === "OWNER",
    isAuthenticated: Boolean(token),
  };
}

function buildAuthStateFromCookies(request: NextRequest): AuthState {
  const token = getCookieValue(
    request,
    "accessToken",
    "token",
    "access_token",
    "authToken",
    "jwtToken"
  );

  const refreshToken = getCookieValue(
    request,
    "refreshToken",
    "refresh_token"
  );

  const rawRole = getCookieValue(request, "userRole", "role");
  const role = normalizeRole(rawRole);

  const onboardingDone = normalizeBoolean(
    getCookieValue(request, "userOnboardingDone", "onboardingDone"),
    false
  );

  return buildAuthState(token, refreshToken, role, onboardingDone);
}

function extractBackendRole(data: BackendValidateResponse): string {
  const nestedPrimary = normalizeRole(
    data?.data?.userRole || data?.data?.role || ""
  );

  if (nestedPrimary) return nestedPrimary;

  const nestedRoles = Array.isArray(data?.data?.roles)
    ? data.data!.roles!.map((role) => normalizeRole(role))
    : [];

  if (nestedRoles.includes("ADMIN")) return "ADMIN";
  if (nestedRoles.includes("USER")) return "USER";

  const topPrimary = normalizeRole(data?.userRole || data?.role || "");
  if (topPrimary) return topPrimary;

  const topRoles = Array.isArray(data?.roles)
    ? data.roles.map((role) => normalizeRole(role))
    : [];

  if (topRoles.includes("ADMIN")) return "ADMIN";
  if (topRoles.includes("USER")) return "USER";

  return "";
}

/**
 * Optional backend validation.
 *
 * If API_BASE_URL is configured, middleware tries to validate the current
 * token/cookie-backed session with backend.
 *
 * If backend explicitly returns 401/403, middleware treats user as logged out.
 * If backend is unavailable, middleware falls back to cookie-based auth.
 */
async function validateWithBackend(
  request: NextRequest,
  auth: AuthState
): Promise<AuthState> {
  if (!API_BASE_URL || !auth.token) {
    return auth;
  }

  try {
    const validateUrl = `${API_BASE_URL}${AUTH_VALIDATE_PATH}`;

    const response = await fetch(validateUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        Cookie: request.headers.get("cookie") ?? "",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return unauthenticatedState();
      }
      return auth;
    }

    const data = (await response.json()) as BackendValidateResponse;

    const backendAuthenticated = normalizeBoolean(
      data?.data?.authenticated ??
        data?.data?.valid ??
        data?.authenticated ??
        data?.valid,
      true
    );

    if (!backendAuthenticated) {
      return unauthenticatedState();
    }

    const backendRole = extractBackendRole(data) || auth.role;

    const backendOnboardingDone = normalizeBoolean(
      data?.data?.onboardingDone ?? data?.onboardingDone,
      auth.onboardingDone
    );

    return buildAuthState(
      auth.token,
      auth.refreshToken,
      backendRole,
      backendOnboardingDone
    );
  } catch {
    return auth;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /**
   * 1) Build auth state from cookies
   */
  let auth = buildAuthStateFromCookies(request);

  /**
   * 2) Optionally validate with backend
   */
  auth = await validateWithBackend(request, auth);

  const isLoggedIn = auth.isAuthenticated;
  const hasRole = auth.role.length > 0;
  const tokenPrefix = getTokenPathPrefix(auth.token);
  const isTokenUrl = isTokenRoute(pathname, tokenPrefix);

  if (isTokenUrl) {
    if (!isLoggedIn) {
      return redirect(request, DEFAULT_LOGIN_PATH);
    }

    const suffix = pathname.substring(tokenPrefix.length) || "";
    const roleHome = auth.isAdmin
      ? DEFAULT_ADMIN_HOME
      : auth.isCompany
      ? DEFAULT_COMPANY_HOME
      : auth.isOwner
      ? DEFAULT_OWNER_HOME
      : DEFAULT_USER_HOME;

    const targetPath =
      suffix === "" || suffix === "/"
        ? roleHome
        : `${roleHome}${suffix}`;

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = targetPath;
    return NextResponse.rewrite(rewriteUrl);
  }

  if (isLoggedIn && tokenPrefix) {
    if (
      isAdminRoute(pathname) ||
      isCompanyRoute(pathname) ||
      isOwnerRoute(pathname) ||
      isUserRoute(pathname)
    ) {
      const suffix = pathname.replace(/^\/(?:admin|company|owner|user)/, "") || "";
      const redirectPath = `${tokenPrefix}${suffix}` || tokenPrefix;
      return redirect(request, redirectPath);
    }
  }

  /**
   * 3) Redirect authenticated users away from auth routes
   */
  if (isAuthRoute(pathname)) {
    if (!isLoggedIn) {
      return NextResponse.next();
    }

    if (auth.isAdmin) {
      return redirect(request, DEFAULT_ADMIN_HOME);
    }

    if (auth.isCompany) {
      return redirect(request, DEFAULT_COMPANY_HOME);
    }

    if (auth.isOwner) {
      return redirect(request, DEFAULT_OWNER_HOME);
    }

    if (auth.isUser) {
      return redirect(
        request,
        auth.onboardingDone ? DEFAULT_USER_HOME : DEFAULT_USER_SETUP
      );
    }

    return redirect(request, DEFAULT_PUBLIC_HOME);
  }

  /**
   * 4) Public routes outside /admin and /user
   */
  if (!isAdminRoute(pathname) && !isUserRoute(pathname)) {
    return nextWithHeaders(auth);
  }

  /**
   * 5) Protected routes require auth
   */
  if (!isLoggedIn) {
    return redirect(request, DEFAULT_LOGIN_PATH);
  }

  /**
   * 6) Admin area protection
   */
  if (isAdminRoute(pathname)) {
    if (!auth.isAdmin) {
      if (auth.isUser) {
        return redirect(
          request,
          auth.onboardingDone ? DEFAULT_USER_HOME : DEFAULT_USER_SETUP
        );
      }

      if (auth.isCompany) {
        return redirect(request, DEFAULT_COMPANY_HOME);
      }

      if (auth.isOwner) {
        return redirect(request, DEFAULT_OWNER_HOME);
      }

      return redirect(request, DEFAULT_LOGIN_PATH);
    }

    return nextWithHeaders(auth);
  }

  /**
   * 7) Company area protection
   */
  if (isCompanyRoute(pathname)) {
    if (!auth.isCompany) {
      if (auth.isAdmin) {
        return redirect(request, DEFAULT_ADMIN_HOME);
      }
      if (auth.isUser) {
        return redirect(
          request,
          auth.onboardingDone ? DEFAULT_USER_HOME : DEFAULT_USER_SETUP
        );
      }
      if (auth.isOwner) {
        return redirect(request, DEFAULT_OWNER_HOME);
      }
      return redirect(request, DEFAULT_LOGIN_PATH);
    }
    return nextWithHeaders(auth);
  }

  /**
   * 8) Owner area protection
   */
  if (isOwnerRoute(pathname)) {
    if (!auth.isOwner) {
      if (auth.isAdmin) {
        return redirect(request, DEFAULT_ADMIN_HOME);
      }
      if (auth.isCompany) {
        return redirect(request, DEFAULT_COMPANY_HOME);
      }
      if (auth.isUser) {
        return redirect(
          request,
          auth.onboardingDone ? DEFAULT_USER_HOME : DEFAULT_USER_SETUP
        );
      }
      return redirect(request, DEFAULT_LOGIN_PATH);
    }
    return nextWithHeaders(auth);
  }

  /**
   * 9) User area protection
   *
   * Rules:
   * - USER can access /user/**
   * - ADMIN can access /user/** for shared tooling / inspection workflows
   * - Invalid explicit role is blocked
   */
  if (isUserRoute(pathname)) {
    if (hasRole && !(auth.isUser || auth.isAdmin)) {
      return redirect(request, DEFAULT_LOGIN_PATH);
    }

    /**
     * Onboarding gate:
     * - USER without onboarding -> force /user/setup
     * - allow /user/setup itself
     * - ADMIN bypasses onboarding gate
     */
    if (auth.isUser && !auth.onboardingDone && !isUserSetupRoute(pathname)) {
      return redirect(request, DEFAULT_USER_SETUP);
    }

    /**
     * Prevent onboarded user from revisiting setup unnecessarily
     */
    if (auth.isUser && auth.onboardingDone && isUserSetupRoute(pathname)) {
      return redirect(request, DEFAULT_USER_HOME);
    }

    return nextWithHeaders(auth);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/company/:path*",
    "/owner/:path*",
    "/user/:path*",
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/((?!_next|api|auth|admin|company|owner|user|favicon\\.ico).*)",
  ],
};