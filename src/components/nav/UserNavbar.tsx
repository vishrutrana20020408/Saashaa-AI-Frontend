"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  User,
  LayoutDashboard,
  FileText,
  HelpCircle,
  Bell,
  Sparkles,
  Briefcase,
  Loader2,
} from "lucide-react";

type NavLink = {
  name: string;
  path: string;
  icon: React.ReactNode;
  exact?: boolean;
};

type AuthMeData = {
  id?: number | string;
  userId?: number | string;
  name?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  emailAddress?: string;
  role?: string;
  userRole?: string;
  roles?: string[];
};

type AuthMeResponse = {
  success?: boolean;
  message?: string;
  data?: AuthMeData | null;
  payload?: AuthMeData | null;
  result?: AuthMeData | null;
  id?: number | string;
  userId?: number | string;
  name?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  emailAddress?: string;
  role?: string;
  userRole?: string;
  roles?: string[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

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
    "adminInterviewToken",
  ].forEach((key) => localStorage.removeItem(key));
}

function unwrapPayload(json: AuthMeResponse | AuthMeData | null): AuthMeData | null {
  if (!json) return null;

  const envelope = json as AuthMeResponse;
  return (
    envelope.data ??
    envelope.payload ??
    envelope.result ?? {
      id: (json as AuthMeData)?.id,
      userId: (json as AuthMeData)?.userId,
      name: (json as AuthMeData)?.name,
      username: (json as AuthMeData)?.username,
      firstName: (json as AuthMeData)?.firstName,
      lastName: (json as AuthMeData)?.lastName,
      fullName: (json as AuthMeData)?.fullName,
      email: (json as AuthMeData)?.email,
      emailAddress: (json as AuthMeData)?.emailAddress,
      role:
        (json as AuthMeResponse)?.userRole ||
        (json as AuthMeResponse)?.role ||
        (json as AuthMeData)?.userRole ||
        (json as AuthMeData)?.role,
      roles:
        (json as AuthMeResponse)?.roles || (json as AuthMeData)?.roles || [],
    }
  );
}

function hasUserRole(user?: AuthMeData | null) {
  const primaryRole = normalizeRole(user?.userRole || user?.role);
  const roles = Array.isArray(user?.roles)
    ? user.roles.map((role) => normalizeRole(role))
    : [];

  return primaryRole === "USER" || roles.includes("USER");
}

export const USER_LINKS: NavLink[] = [
  {
    name: "Overview",
    path: "/user",
    icon: <Sparkles className="h-4 w-4" />,
    exact: true,
  },
  {
    name: "Dashboard",
    path: "/user/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    name: "Interview Dashboard",
    path: "/user/interviewdashboard",
    icon: <User className="h-4 w-4" />,
  },
  {
    name: "Jobs",
    path: "/user/jobs",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    name: "Resume",
    path: "/user/resume",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    name: "Profile",
    path: "/user/profile",
    icon: <User className="h-4 w-4" />,
  },
  {
    name: "Help Desk",
    path: "/user/needhelp",
    icon: <HelpCircle className="h-4 w-4" />,
  },
  {
    name: "Updates",
    path: "/user/update",
    icon: <Bell className="h-4 w-4" />,
  },
];

export default function UserNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authError, setAuthError] = useState("");

  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");

  const extractUserName = (payload: AuthMeData | null): string => {
    if (!payload) return "User";

    const fullName =
      payload.fullName ||
      payload.name ||
      [payload.firstName, payload.lastName].filter(Boolean).join(" ").trim() ||
      payload.username;

    return fullName || "User";
  };

  const extractUserEmail = (payload: AuthMeData | null): string => {
    return payload?.email || payload?.emailAddress || "";
  };

  const validateUserSession = useCallback(async () => {
    // Skip validation for public-facing user auth pages
    if (
      pathname === "/auth/login" ||
      pathname === "/auth/registration" ||
      pathname.startsWith("/auth/login") ||
      pathname.startsWith("/auth/registration")
    ) {
      setIsCheckingAuth(false);
      return;
    }

    try {
      setIsCheckingAuth(true);
      setAuthError("");

      const token = getStoredToken();
      const storedRole = getStoredRole();

      if (!token) {
        clearStoredAuth();
        router.replace("/auth/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        clearStoredAuth();
        router.replace("/auth/login");
        return;
      }

      if (!response.ok) {
        if (storedRole === "USER") {
          setUserName(localStorage.getItem("userName") || "User");
          setUserEmail(localStorage.getItem("userEmail") || "");
          return;
        }

        throw new Error(`User session validation failed: ${response.status}`);
      }

      const result: AuthMeResponse = await response.json().catch(() => ({}));
      const user = unwrapPayload(result);

      const isUser = hasUserRole(user) || storedRole === "USER";

      if (!isUser) {
        clearStoredAuth();
        router.replace("/auth/login");
        return;
      }

      const resolvedName = extractUserName(user);
      const resolvedEmail = extractUserEmail(user);

      setUserName(resolvedName);
      setUserEmail(resolvedEmail);

      localStorage.setItem("userName", resolvedName);

      if (resolvedEmail) {
        localStorage.setItem("userEmail", resolvedEmail);
      }

      localStorage.setItem("userRole", "USER");
      localStorage.setItem("role", "USER");
    } catch (error) {
      console.error("Failed to validate user session:", error);

      const token = getStoredToken();
      const storedRole = getStoredRole();

      if (token && storedRole === "USER") {
        setUserName(localStorage.getItem("userName") || "User");
        setUserEmail(localStorage.getItem("userEmail") || "");
        setAuthError("Using saved session info.");
        return;
      }

      setAuthError("Unable to verify user session.");
      clearStoredAuth();
      router.replace("/auth/login");
    } finally {
      setIsCheckingAuth(false);
    }
  }, [router]);

  const isActive = useCallback(
    (link: NavLink) => {
      if (link.exact) return pathname === link.path;
      return pathname === link.path || pathname.startsWith(`${link.path}/`);
    },
    [pathname]
  );

  const navigate = useCallback(
    (path: string) => {
      setMenuOpen(false);
      router.push(path);
    },
    [router]
  );

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      setMenuOpen(false);

      const token = getStoredToken();

      const logoutEndpoints = [
        `${API_BASE_URL}/api/auth/logout`,
        `${API_BASE_URL}/logout`,
      ];

      for (const endpoint of logoutEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });

          if (response.ok || response.status === 401 || response.status === 403) {
            break;
          }
        } catch {
          // try next endpoint
        }
      }

      clearStoredAuth();
      router.replace("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      clearStoredAuth();
      router.replace("/auth/login");
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    validateUserSession();
  }, [validateUserSession]);

  const userInitial = useMemo(() => {
    const parts = userName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [userName]);

  if (isCheckingAuth) {
    return (
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-slate-950/80 text-white backdrop-blur">
        <div className="mx-auto max-w-10xl px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl grid place-items-center bg-white/10 border border-white/15 font-extrabold">
                S
              </div>
              <div className="text-left leading-tight">
                <p className="text-sm font-semibold tracking-tight">SaaShaa AI</p>
                <p className="text-xs text-white/60">Verifying session...</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-white/80">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading</span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={[
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/90 text-slate-900 shadow-sm border-b border-slate-200 backdrop-blur"
          : "bg-slate-950/30 text-white backdrop-blur border-b border-white/10",
      ].join(" ")}
    >
      <div className="mx-auto max-w-10xl px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <button
            onClick={() => navigate("/user")}
            className="flex items-center gap-3 group"
            aria-label="Go to user home"
          >
            <div
              className={[
                "h-10 w-10 rounded-2xl grid place-items-center font-extrabold transition",
                scrolled
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white/10 text-white border border-white/15",
              ].join(" ")}
            >
              {userInitial}
            </div>

            <div className="text-left leading-tight">
              <p className="text-sm font-semibold tracking-tight">SaaShaa AI</p>
              <p
                className={[
                  "text-xs max-w-55 truncate",
                  scrolled ? "text-slate-500" : "text-white/60",
                ].join(" ")}
              >
                {userName}
                {userEmail ? ` • ${userEmail}` : " • User Panel"}
              </p>
            </div>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {USER_LINKS.map((link) => {
              const active = isActive(link);

              return (
                <button
                  key={link.name}
                  onClick={() => navigate(link.path)}
                  className={[
                    "px-3 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2",
                    active
                      ? scrolled
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        : "bg-white/10 text-white border border-white/15"
                      : scrolled
                      ? "text-slate-700 hover:bg-slate-100"
                      : "text-white/80 hover:text-white hover:bg-white/10",
                  ].join(" ")}
                >
                  {link.icon}
                  <span className="whitespace-nowrap">{link.name}</span>
                </button>
              );
            })}

            <div className="mx-2 h-6 w-px bg-slate-200/70 hidden lg:block" />

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={[
                "px-3 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed",
                scrolled
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-cyan-400 text-slate-950 hover:opacity-90",
              ].join(" ")}
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </nav>

          <button
            className={[
              "lg:hidden inline-flex items-center justify-center rounded-xl p-2 transition",
              scrolled ? "hover:bg-slate-100" : "hover:bg-white/10",
            ].join(" ")}
            onClick={() => setMenuOpen((s) => !s)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? (
              <X className={scrolled ? "text-slate-900" : "text-white"} />
            ) : (
              <Menu className={scrolled ? "text-slate-900" : "text-white"} />
            )}
          </button>
        </div>
      </div>

      {authError && (
        <div className="mx-auto max-w-10xl px-4 sm:px-6 lg:px-8 pb-3">
          <p className={scrolled ? "text-sm text-amber-600" : "text-sm text-amber-300"}>
            {authError}
          </p>
        </div>
      )}

      {menuOpen && (
        <div
          className={[
            "lg:hidden border-t transition",
            scrolled
              ? "bg-(--card) border-(--border) backdrop-blur"
              : "bg-(--background)/70 border-(--border) backdrop-blur",
          ].join(" ")}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4">
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div
                  className={[
                    "h-10 w-10 rounded-2xl grid place-items-center font-extrabold",
                    scrolled
                      ? "bg-indigo-600 text-white"
                      : "bg-white/10 text-white border border-white/15",
                  ].join(" ")}
                >
                  {userInitial}
                </div>

                <div className="min-w-0">
                  <p
                    className={[
                      "truncate font-semibold",
                      scrolled ? "text-slate-900" : "text-white",
                    ].join(" ")}
                  >
                    {userName}
                  </p>
                  <p
                    className={[
                      "truncate text-xs",
                      scrolled ? "text-slate-500" : "text-white/60",
                    ].join(" ")}
                  >
                    {userEmail || "Authenticated User"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              {USER_LINKS.map((link) => {
                const active = isActive(link);

                return (
                  <button
                    key={link.name}
                    onClick={() => navigate(link.path)}
                    className={[
                      "w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition border",
                      active
                        ? scrolled
                          ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                          : "bg-white/10 text-white border-white/15"
                        : scrolled
                        ? "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                        : "bg-white/5 text-white/85 border-white/10 hover:bg-white/10",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={[
                          "h-9 w-9 rounded-xl grid place-items-center border",
                          active
                            ? scrolled
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white/10 text-white border-white/15"
                            : scrolled
                            ? "bg-slate-50 text-slate-700 border-slate-200"
                            : "bg-white/5 text-white border-white/10",
                        ].join(" ")}
                      >
                        {link.icon}
                      </span>
                      <span className="font-semibold">{link.name}</span>
                    </span>

                    <span
                      className={[
                        "text-xs",
                        scrolled ? "text-slate-500" : "text-white/50",
                      ].join(" ")}
                    >
                      {active ? "Active" : ""}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={[
                  "mt-2 w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold transition disabled:opacity-70 disabled:cursor-not-allowed",
                  scrolled
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-cyan-400 text-slate-950 hover:opacity-90",
                ].join(" ")}
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}