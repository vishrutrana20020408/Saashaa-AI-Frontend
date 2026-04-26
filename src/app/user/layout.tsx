"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import UserNavbar from "../../components/nav/UserNavbar";
import UserFooter from "../../components/nav/UserFooter";
import ScrollToTop from "../../components/common/ScrollToTop";
import "./user.css";
import { Loader2 } from "lucide-react";

/**
 * src/app/(public)/user/layout.tsx
 *
 * Backend-integrated User Layout
 *
 * Latest project alignment:
 * - backend-first auth verification
 * - resilient auth response normalization
 * - token lookup from all supported storage keys
 * - role normalization for USER / ROLE_USER
 * - protects all /user routes
 * - keeps onboarding/setup stable
 * - supports backend auth validation with graceful local fallback
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

const API_ROUTES = {
  me: `${API_BASE_URL}/api/auth/me`,
};

interface AuthUser {
  id?: number | string;
  name?: string;
  username?: string;
  email?: string;
  role?: string;
  userRole?: string;
  roles?: string[];
  onboardingDone?: boolean;
  userOnboardingDone?: boolean;
}

interface AuthResponseEnvelope {
  success?: boolean;
  message?: string;
  authenticated?: boolean;
  valid?: boolean;
  data?: AuthUser | null;
  payload?: AuthUser | null;
  result?: AuthUser | null;
  role?: string;
  userRole?: string;
  roles?: string[];
}

function normalizeRole(value?: string | null) {
  return (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
}

function getStoredToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    null
  );
}

function getStoredRole() {
  if (typeof window === "undefined") return "";

  return normalizeRole(
    localStorage.getItem("userRole") || localStorage.getItem("role") || ""
  );
}

function getStoredOnboardingDone() {
  if (typeof window === "undefined") return false;

  const value =
    localStorage.getItem("userOnboardingDone") ||
    localStorage.getItem("onboardingDone") ||
    "";

  return value === "true";
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  [
    "token",
    "authToken",
    "accessToken",
    "jwtToken",
    "userRole",
    "role",
    "userEmail",
    "userName",
    "authId",
    "userOnboardingDone",
    "onboardingDone",
    "activeResumeId",
    "activeResumeVersionId",
  ].forEach((key) => localStorage.removeItem(key));
}

function unwrapAuthUser(
  json: AuthResponseEnvelope | AuthUser | null
): AuthUser | null {
  if (!json) return null;

  const envelope = json as AuthResponseEnvelope;
  const nested = envelope.data ?? envelope.payload ?? envelope.result;

  if (nested && typeof nested === "object") {
    return {
      id: nested.id,
      name: nested.name,
      username: nested.username,
      email: nested.email,
      role: nested.userRole || nested.role,
      userRole: nested.userRole || nested.role,
      roles: Array.isArray(nested.roles) ? nested.roles : [],
      onboardingDone:
        typeof nested.onboardingDone === "boolean"
          ? nested.onboardingDone
          : typeof nested.userOnboardingDone === "boolean"
          ? nested.userOnboardingDone
          : undefined,
      userOnboardingDone:
        typeof nested.userOnboardingDone === "boolean"
          ? nested.userOnboardingDone
          : typeof nested.onboardingDone === "boolean"
          ? nested.onboardingDone
          : undefined,
    };
  }

  const flat = json as AuthUser;
  return {
    id: flat.id,
    name: flat.name,
    username: flat.username,
    email: flat.email,
    role:
      (json as AuthResponseEnvelope)?.userRole ||
      (json as AuthResponseEnvelope)?.role ||
      flat.userRole ||
      flat.role,
    userRole:
      (json as AuthResponseEnvelope)?.userRole ||
      (json as AuthResponseEnvelope)?.role ||
      flat.userRole ||
      flat.role,
    roles:
      (json as AuthResponseEnvelope)?.roles ||
      (Array.isArray(flat.roles) ? flat.roles : []),
    onboardingDone:
      typeof flat.onboardingDone === "boolean"
        ? flat.onboardingDone
        : typeof flat.userOnboardingDone === "boolean"
        ? flat.userOnboardingDone
        : undefined,
    userOnboardingDone:
      typeof flat.userOnboardingDone === "boolean"
        ? flat.userOnboardingDone
        : typeof flat.onboardingDone === "boolean"
        ? flat.onboardingDone
        : undefined,
  };
}

function hasUserRole(user?: AuthUser | null) {
  const primaryRole = normalizeRole(user?.userRole || user?.role);
  const roles = Array.isArray(user?.roles)
    ? user.roles.map((role) => normalizeRole(role))
    : [];

  return primaryRole === "USER" || roles.includes("USER");
}

function persistResolvedUser(user?: AuthUser | null) {
  if (typeof window === "undefined" || !user) return;

  const resolvedRole = normalizeRole(user.userRole || user.role);
  if (resolvedRole) {
    localStorage.setItem("userRole", resolvedRole);
    localStorage.setItem("role", resolvedRole);
  }

  if (user.name) {
    localStorage.setItem("userName", user.name);
  } else if (user.username) {
    localStorage.setItem("userName", user.username);
  }

  if (user.email) {
    localStorage.setItem("userEmail", user.email);
  }

  if (user.id !== undefined && user.id !== null) {
    localStorage.setItem("authId", String(user.id));
  }

  const onboardingDone =
    typeof user.userOnboardingDone === "boolean"
      ? user.userOnboardingDone
      : typeof user.onboardingDone === "boolean"
      ? user.onboardingDone
      : undefined;

  if (typeof onboardingDone === "boolean") {
    localStorage.setItem("userOnboardingDone", String(onboardingDone));
    localStorage.setItem("onboardingDone", String(onboardingDone));
  }
}

export default function UserLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [showScroll, setShowScroll] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  const hideChrome = useMemo(() => {
    return (
      pathname.startsWith("/user/setup") ||
      pathname === "/user/interview" ||
      pathname.startsWith("/user/interview/")
    );
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    const isSetupRoute = pathname.startsWith("/user/setup");

    const redirectToLogin = () => {
      if (!isMounted) return;
      clearStoredAuth();
      setIsAuthed(false);
      router.replace("/auth/login");
    };

    const verifyUserAccess = async () => {
      if (!isMounted) return;

      setAuthLoading(true);

      const token = getStoredToken();
      const storedRole = getStoredRole();
      const storedOnboardingDone = getStoredOnboardingDone();

      const hasStoredUserAccess = !!token && storedRole === "USER";

      if (!token) {
        redirectToLogin();
        return;
      }

      try {
        const response = await fetch(API_ROUTES.me, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          redirectToLogin();
          return;
        }

        if (!response.ok) {
          // Auth endpoint failed but token exists - use localStorage fallback
          if (hasStoredUserAccess) {
            setIsAuthed(true);
            if (!isSetupRoute && !storedOnboardingDone) {
              router.replace("/user/setup");
            }
            return;
          }
          redirectToLogin();
          return;
        }

        const json = await response.json().catch(() => null);
        const user = unwrapAuthUser(json);
        const backendIsUser = hasUserRole(user);
        const backendOnboardingDone = Boolean(
          user?.userOnboardingDone ?? user?.onboardingDone
        );

        if (!isMounted) return;

        if (backendIsUser) {
          persistResolvedUser(user);
          setIsAuthed(true);

          // Only redirect to setup if we're not already on setup page
          if (!isSetupRoute && !backendOnboardingDone) {
            router.replace("/user/setup");
          }

          return;
        }

        // Fallback to stored access if backend check passes but doesn't mark as user
        if (hasStoredUserAccess) {
          setIsAuthed(true);
          if (!isSetupRoute && !storedOnboardingDone) {
            router.replace("/user/setup");
          }
          return;
        }

        redirectToLogin();
      } catch (error) {
        console.error("User auth verification error:", error);

        if (!isMounted) return;

        // On error, use stored credentials as fallback
        if (hasStoredUserAccess) {
          setIsAuthed(true);
          if (!isSetupRoute && !storedOnboardingDone) {
            router.replace("/user/setup");
          }
          return;
        }

        redirectToLogin();
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    verifyUserAccess();

    return () => {
      isMounted = false;
    };
  }, [router, pathname]);

  useEffect(() => {
    if (hideChrome) return;

    const handleScroll = () => {
      const sections = document.querySelectorAll("section");

      if (sections.length > 1) {
        const secondSectionTop = sections[1].getBoundingClientRect().top;
        setShowScroll(secondSectionTop <= 0);
      } else {
        setShowScroll(window.scrollY > 400);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [hideChrome, pathname]);

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-(--background) px-6 text-(--foreground)">
        <div className="w-full max-w-md rounded-3xl border border-(--border) bg-(--card) p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white">
            <span className="font-bold">S</span>
          </div>

          <div className="mb-4 flex justify-center">
            <Loader2 className="animate-spin text-(--primary)" />
          </div>

          <h1 className="text-xl font-semibold tracking-tight">
            Checking your session…
          </h1>
          <p className="mt-2 text-sm text-(--muted)">
            Please wait while we verify your access with the backend.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthed) {
    return null;
  }

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-(--background) text-(--foreground)">
      <div className="sticky top-0 z-40">
        <UserNavbar />
      </div>

      <main className="flex-1 pt-16">{children}</main>

      <div className="mt-auto">
        <UserFooter />
      </div>
    </div>
  );
}