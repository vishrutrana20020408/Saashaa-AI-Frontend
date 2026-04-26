"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminNavbar from "../../components/nav/AdminNavbar";
import AdminFooter from "../../components/nav/AdminFooter";
import ScrollToTop from "../../components/common/ScrollToTop";
import "./admin.css";

/**
 * src/app/admin/layout.tsx
 *
 * Backend-integrated Admin Layout
 *
 * Features:
 * - Protects all /admin routes
 * - Validates admin session against backend
 * - Uses JWT token from localStorage if present
 * - Redirects unauthorized users to login
 * - Shows loading / error UI while session is being verified
 * - Hides navbar/footer on selected fullscreen admin pages
 * - Stays aligned with the latest admin auth flow used across admin pages
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  me: `${API_BASE_URL}/api/auth/me`,
  validateAdmin: `${API_BASE_URL}/api/admin/validate`,
};

interface AuthUser {
  id?: number;
  email?: string;
  name?: string;
  fullName?: string;
  role?: string;
  roles?: string[];
  authenticated?: boolean;
  valid?: boolean;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  payload?: T;
  result?: T;
}

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null | undefined): T | null {
  if (!json || typeof json !== "object") return null;

  const envelope = json as ApiEnvelope<T> & T;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function getStoredToken(): string {
  if (typeof window === "undefined") return "";

  const possibleKeys = [
    "adminToken",
    "admin_token",
    "token",
    "authToken",
    "jwtToken",
    "jwt",
    "accessToken",
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  return "";
}

function getStoredRole(): string {
  if (typeof window === "undefined") return "";

  const possibleKeys = ["userRole", "role", "adminRole"];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);
    if (value) return value.toUpperCase();
  }

  return "";
}

function normalizeRole(value?: string): string {
  return (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
}

function isAdminRole(role?: string, roles?: string[]) {
  const normalizedRole = normalizeRole(role);
  const normalizedRoles = Array.isArray(roles)
    ? roles.map((item) => normalizeRole(item))
    : [];

  return normalizedRole === "ADMIN" || normalizedRoles.includes("ADMIN");
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  const keys = [
    "adminToken",
    "admin_token",
    "token",
    "authToken",
    "jwtToken",
    "jwt",
    "accessToken",
    "userRole",
    "role",
    "adminRole",
    "userEmail",
    "userName",
    "authId",
    "userOnboardingDone",
    "onboardingDone",
  ];

  keys.forEach((key) => localStorage.removeItem(key));
}

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isFullscreenAdminPage = useMemo(() => {
    return (
      pathname === "/admin/company/login" ||
      pathname.startsWith("/admin/company/login") ||
      pathname === "/admin/interview"
    );
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    const redirectToLogin = () => {
      router.replace("/auth/login");
    };

    const redirectToUser = () => {
      router.replace("/user");
    };

    const verifyByMeEndpoint = async (token: string) => {
      const response = await fetch(API_ROUTES.me, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
      });

      const json: ApiEnvelope<AuthUser> | AuthUser | null = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          (json as ApiEnvelope<AuthUser>)?.message ||
            `Auth verification failed with status ${response.status}`
        );
      }

      const user = unwrapResponse<AuthUser>(json);

      if (!user) {
        throw new Error("Invalid auth response from /api/auth/me.");
      }

      const authenticated = Boolean(user.authenticated ?? user.valid ?? response.ok);

      return {
        authenticated,
        isAdmin: isAdminRole(user.role, user.roles),
      };
    };

    const verifyByAdminEndpoint = async (token: string) => {
      const response = await fetch(API_ROUTES.validateAdmin, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
      });

      const json:
        | ApiEnvelope<AuthUser | boolean>
        | AuthUser
        | boolean
        | null = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (json as ApiEnvelope<AuthUser | boolean>)?.message ||
            `Admin validation failed with status ${response.status}`
        );
      }

      const unwrapped = unwrapResponse<AuthUser | boolean>(json);

      if (typeof unwrapped === "boolean") {
        return {
          authenticated: unwrapped,
          isAdmin: unwrapped,
        };
      }

      if (unwrapped && typeof unwrapped === "object") {
        return {
          authenticated: true,
          isAdmin: isAdminRole(
            (unwrapped as AuthUser).role,
            (unwrapped as AuthUser).roles
          ),
        };
      }

      return {
        authenticated: Boolean((json as ApiEnvelope<AuthUser | boolean>)?.success),
        isAdmin: Boolean((json as ApiEnvelope<AuthUser | boolean>)?.success),
      };
    };

    const verifyAdminAccess = async () => {
      // Bypass auth for login and registration pages
      if (
        pathname === "/admin/login" ||
        pathname === "/admin/company/login" ||
        pathname.startsWith("/admin/login") ||
        pathname.startsWith("/admin/company/login")
      ) {
        if (isMounted) setIsAuthorized(true);
        if (isMounted) setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      setAuthError(null);

      // First check if we have stored admin credentials
      const storedToken = getStoredToken();
      const storedRole = getStoredRole();

      if (storedToken && storedRole === "ADMIN") {
        if (isMounted) setIsAuthorized(true);
        if (isMounted) setAuthLoading(false);
        return;
      }

      // If no stored credentials, try backend verification
      if (!storedToken) {
        if (!isMounted) return;
        clearStoredAuth();
        setAuthLoading(false);
        redirectToLogin();
        return;
      }

      const token = storedToken;

      if (!token) {
        if (!isMounted) return;
        clearStoredAuth();
        setAuthLoading(false);
        redirectToLogin();
        return;
      }

      try {
        let authenticated = false;
        let isAdmin = false;

        try {
          const result = await verifyByMeEndpoint(token);
          authenticated = result.authenticated;
          isAdmin = result.isAdmin;
        } catch (meError) {
          console.error("Primary /api/auth/me check failed:", meError);
          const fallbackResult = await verifyByAdminEndpoint(token);
          authenticated = fallbackResult.authenticated;
          isAdmin = fallbackResult.isAdmin;
        }

        const storageSaysAdmin = storedRole === "ADMIN" || storedRole === "ROLE_ADMIN";

        if (!isMounted) return;

        if (!authenticated) {
          clearStoredAuth();
          setAuthError("Your admin session is no longer valid.");
          redirectToLogin();
          return;
        }

        if (!isAdmin && storageSaysAdmin) {
          setIsAuthorized(true);
          return;
        }

        if (!isAdmin) {
          setAuthError("You do not have permission to access the admin panel.");
          redirectToUser();
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Admin auth verification error:", error);

        const fallbackToken = getStoredToken();
        const fallbackRole = getStoredRole();

        const isAdminFallback =
          !!fallbackToken &&
          (fallbackRole === "ADMIN" || fallbackRole === "ROLE_ADMIN");

        if (!isMounted) return;

        if (!isAdminFallback) {
          clearStoredAuth();
          setAuthError(
            error instanceof Error
              ? error.message
              : "Unable to verify admin session."
          );
          redirectToLogin();
          return;
        }

        setIsAuthorized(true);
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    void verifyAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [router, pathname]);

  if (authLoading) {
    return (
      <div className="admin-container">
        <div className="admin-page-shell">
          <div className="admin-loading">
            <div className="admin-spinner" />
            <h2 className="admin-loading-title">Verifying Admin Access</h2>
            <p className="admin-loading-text">
              Please wait while your admin session is being validated with the
              backend.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return authError ? (
      <div className="admin-container">
        <div className="admin-page-shell">
          <div className="admin-error-state">
            <h2 className="admin-error-title">Admin access denied</h2>
            <p className="admin-error-text">{authError}</p>
          </div>
        </div>
      </div>
    ) : null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-(--background) text-(--foreground)">
      {!isFullscreenAdminPage && <AdminNavbar />}
      <main className="flex-1 pt-16">{children}</main>
      {!isFullscreenAdminPage && <ScrollToTop />}
      {!isFullscreenAdminPage && <AdminFooter />}
    </div>
  );
}