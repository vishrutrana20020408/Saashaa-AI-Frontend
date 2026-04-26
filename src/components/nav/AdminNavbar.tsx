"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Menu, X, ShieldCheck, LogOut, Loader2, Bell } from "lucide-react";
import ThemeToggle from "@/components/common/ThemeToggle";

type AdminLink = {
  name: string;
  path: string;
};

type AdminHomeResponse = {
  success?: boolean;
  message?: string;
  data?: {
    id?: number;
    adminId?: number;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    role?: string;
  };
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  role?: string;
};

export const ADMIN_LINKS: AdminLink[] = [
  { name: "Overview", path: "/admin" },
  { name: "Dashboard", path: "/admin/dashboard" },
  { name: "Apply Jobs", path: "/admin/apply-jobs" },
  { name: "Jobs", path: "/admin/jobs" },
  { name: "Interviews", path: "/admin/interviewdashboard" },
  { name: "Resumes", path: "/admin/resume" },
  { name: "Users", path: "/admin/users" },
];

const AUTH_LINKS: AdminLink[] = [
  { name: "Login", path: "/admin/login" },
];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

function getStoredToken(): string {
  if (typeof window === "undefined") return "";

  const keys = [
    "adminToken",
    "admin_token",
    "token",
    "authToken",
    "jwtToken",
    "jwt",
    "accessToken",
  ];

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  return "";
}

function clearAdminAuthStorage() {
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

export default function AdminNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);
  const scrolled = false;

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [authError, setAuthError] = useState("");

  type NotificationItem = {
    title: string;
    subtitle: string;
    time: string;
  };

  const notifications = useMemo<NotificationItem[]>(() => {
    if (!pathname.startsWith("/admin")) return [];
    return [
      {
        title: "Review job settings",
        subtitle: "Review open job settings and company metadata in the admin panel.",
        time: "2m ago",
      },
      {
        title: "New interview request",
        subtitle: "A candidate has requested a new interview slot.",
        time: "12m ago",
      },
      {
        title: "Report summary ready",
        subtitle: "Candidate review reports are ready for your action.",
        time: "1h ago",
      },
    ];
  }, [pathname]);

  const isActive = useCallback(
    (path: string) => {
      if (path === "/admin/companydashboard") {
        return (
          pathname.startsWith("/admin/companydashboard") ||
          pathname.startsWith("/admin/company")
        );
      }

      if (path === "/admin") {
        return pathname === "/admin";
      }

      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [pathname]
  );

  const adminInitials = useMemo(() => {
    const parts = adminName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "A";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [adminName]);

  const navigate = useCallback(
    (path: string) => {
      setMenuOpen(false);
      router.push(path);
    },
    [router]
  );

  const extractAdminName = (payload: AdminHomeResponse): string => {
    const data = payload?.data;

    const fullName =
      data?.fullName ||
      payload?.fullName ||
      [data?.firstName || payload?.firstName, data?.lastName || payload?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    return fullName || "Admin";
  };

  const extractAdminEmail = (payload: AdminHomeResponse): string => {
    return payload?.data?.email || payload?.email || "";
  };

  const validateAdminSession = useCallback(async () => {
    // Skip validation for public-facing admin auth pages
    if (
      pathname === "/admin/login" ||
      pathname.startsWith("/admin/login") ||
      pathname === "/auth/login" ||
      pathname.startsWith("/auth/login")
    ) {
      setIsCheckingAuth(false);
      return;
    }

    try {
      setIsCheckingAuth(true);
      setAuthError("");

      const token = getStoredToken();
      if (!token) {
        clearAdminAuthStorage();
        router.replace("/auth/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/home`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        clearAdminAuthStorage();
        router.replace("/auth/login");
        return;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const message =
          text && text.trim().startsWith("{")
            ? (() => {
                try {
                  const j = JSON.parse(text);
                  return j?.message || `Admin session validation failed: ${response.status}`;
                } catch {
                  return `Admin session validation failed: ${response.status}`;
                }
              })()
            : `Admin session validation failed: ${response.status}`;
        setAuthError(message);
        return;
      }

      const result: AdminHomeResponse = await response.json();

      setAdminName(extractAdminName(result));
      setAdminEmail(extractAdminEmail(result));
    } catch (error) {
      console.error("Failed to validate admin session:", error);
      setAuthError("Unable to verify admin session.");
      // Do not force logout on transient errors; only 401/403 branch above redirects
    } finally {
      setIsCheckingAuth(false);
    }
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      setMenuOpen(false);

      const logoutEndpoints = [
        `${API_BASE_URL}/api/auth/logout`,
        `${API_BASE_URL}/logout`,
      ];

      let logoutSucceeded = false;

      for (const endpoint of logoutEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (response.ok || response.status === 401 || response.status === 403) {
            logoutSucceeded = true;
            break;
          }
        } catch {
          // try next fallback endpoint
        }
      }

      clearAdminAuthStorage();

      if (!logoutSucceeded) {
        console.warn("Logout endpoint did not respond successfully. Redirecting anyway.");
      }

      router.replace("/auth/login");
    } catch (error) {
      console.error("Logout failed:", error);
      router.replace("/");
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  useEffect(() => {
    validateAdminSession();
  }, [validateAdminSession]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showNotifications &&
        notificationsMenuRef.current &&
        !notificationsMenuRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  if (isCheckingAuth) {
    return (
      <nav className="fixed top-0 z-50 w-full border-b border-(--border) bg-(--card) text-(--foreground) backdrop-blur-xl">
        <div className="mx-auto flex max-w-10xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/20">
              <ShieldCheck className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-wide">Admin Panel</p>
              <p className="text-xs text-(--muted)">Verifying session...</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-(--muted)">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading</span>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-(--border) bg-(--card) text-(--foreground) shadow-lg">
      <div className="mx-auto flex max-w-10xl items-center justify-between px-6 py-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-3 cursor-pointer"
            aria-label="Go to admin overview"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400 text-black font-bold transition">
              {adminInitials}
            </div>

            <div className="text-left">
              <h1 className="text-lg font-bold tracking-wider transition text-(--foreground)">
                Admin Panel
              </h1>
              <p className="max-w-55 truncate text-xs text-(--muted) transition">
                {adminName}
                {adminEmail ? ` • ${adminEmail}` : ""}
              </p>
            </div>
          </button>
        </div>

        {/* Desktop Links */}
        <div className="hidden items-center gap-6 lg:flex">
          {ADMIN_LINKS.map((link) => (
            <button
              key={link.name}
              onClick={() => navigate(link.path)}
              className={`group relative cursor-pointer font-medium transition ${
                isActive(link.path)
                  ? "text-(--primary) font-semibold"
                  : "text-(--foreground) hover:text-(--primary)"
              }`}
            >
              {link.name}
              <span
                className={`absolute left-0 -bottom-1 h-0.5 transition-all duration-300 ${
                  isActive(link.path)
                    ? "w-full bg-cyan-400"
                    : "w-0 bg-cyan-400 group-hover:w-full"
                }`}
              />
            </button>
          ))}

          <ThemeToggle />

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-(--border) bg-(--popover) text-(--foreground) transition hover:bg-(--background)"
              aria-label="Toggle notifications menu"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-semibold text-white shadow-lg shadow-rose-500/30">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && notifications.length > 0 && (
              <div
                ref={notificationsMenuRef}
                className={`absolute right-0 top-full z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-(--border) bg-(--card) text-(--foreground) shadow-2xl shadow-black/10 transition-transform duration-300 ${
                  showNotifications ? "scale-100 opacity-100" : "scale-95 opacity-0"
                }`}
              >
                <div className="flex items-center justify-between border-b border-(--border) px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Notifications</p>
                    <p className="text-xs text-(--muted)">You have {notifications.length} new notifications</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    className="rounded-full px-2 py-1 text-xs font-semibold text-(--muted) transition hover:bg-(--popover)"
                  >
                    Close
                  </button>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto px-3 py-3">
                  {notifications.map((notification, index) => (
                    <div
                      key={index}
                      className="group rounded-3xl border border-(--border) bg-(--popover) p-4 transition hover:-translate-y-0.5 hover:bg-(--background)"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-(--foreground)">{notification.title}</p>
                          <p className="mt-1 text-sm leading-6 text-(--muted)">{notification.subtitle}</p>
                        </div>
                        <span className="text-xs text-(--muted)">{notification.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-(--border) px-4 py-3">
                  <button
                    type="button"
                    onClick={() => router.push("/admin/notifications")}
                    className="w-full rounded-2xl bg-(--primary) px-4 py-2 text-sm font-semibold text-(--primary-foreground) transition hover:opacity-90"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {AUTH_LINKS.map((link) => (
            <button
              key={link.name}
              onClick={() => navigate(link.path)}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition border ${
                isActive(link.path)
                  ? "bg-(--popover) text-(--foreground) border-(--border)"
                  : "text-(--foreground) hover:bg-(--popover) border-(--border)"
              }`}
            >
              {link.name}
            </button>
          ))}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 bg-(--primary) text-(--primary-foreground) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>

        {/* Mobile Toggle */}
        <button
          className="lg:hidden text-(--foreground)"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle admin menu"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>


      {/* Optional Backend/Auth Error */}
      {authError && (
        <div className="px-6 pb-3 text-sm text-red-500">
          {authError}
        </div>
      )}

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden px-6 pb-5 pt-2 transition bg-(--card) text-(--foreground) backdrop-blur-xl">
          <div className="mb-4 rounded-2xl border border-(--border) bg-(--popover) p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 text-black font-bold">
                {adminInitials}
              </div>

              <div className="min-w-0">
                <p className="truncate font-semibold text-(--foreground)">{adminName}</p>
                <p className="truncate text-xs text-(--muted)">
                  {adminEmail || "Authenticated Admin"}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <ThemeToggle />
          </div>

          <div className="flex flex-col gap-2">
            {ADMIN_LINKS.map((link) => (
              <button
                key={link.name}
                onClick={() => navigate(link.path)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  isActive(link.path)
                    ? "border-(--border) bg-(--popover) text-(--foreground)"
                    : "border-(--border) text-(--foreground) hover:bg-(--popover)"
                }`}
              >
                {link.name}
              </button>
            ))}

            <div className="my-2 h-px bg-(--border)" />

            {AUTH_LINKS.map((link) => (
              <button
                key={link.name}
                onClick={() => navigate(link.path)}
                className={`rounded-xl border px-4 py-3 text-left transition font-semibold ${
                  isActive(link.path)
                    ? "border-(--border) bg-(--popover) text-(--foreground)"
                    : "border-(--border) text-(--foreground) hover:bg-(--popover)"
                }`}
              >
                {link.name}
              </button>
            ))}

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-(--primary) px-4 py-3 text-(--primary-foreground) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
