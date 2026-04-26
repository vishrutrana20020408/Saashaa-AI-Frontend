"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Mail,
  Settings,
  LayoutDashboard,
  LogOut,
  Loader2,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

type ProfileRole = "USER" | "ADMIN";

type GenericApiResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  role?: string;
  userRole?: string;
  id?: number;
};

type ProfileData = {
  id?: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  role: ProfileRole;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

const API_ROUTES = {
  userProfileMe: `${API_BASE_URL}/api/user/profile/me`,
  adminProfileMe: `${API_BASE_URL}/api/admin/profile/me`,
  userHome: `${API_BASE_URL}/api/user/home`,
  adminHome: `${API_BASE_URL}/api/admin/home`,
  authMe: `${API_BASE_URL}/api/auth/me`,
  logout: `${API_BASE_URL}/api/auth/logout`,
  fallbackLogout: `${API_BASE_URL}/logout`,
};

function unwrapPayload(
  payload: GenericApiResponse | Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!payload) return null;

  const envelope = payload as GenericApiResponse;
  return (
    envelope.data ??
    envelope.payload ??
    envelope.result ??
    (payload as Record<string, unknown>)
  );
}

function normalizeRole(value: unknown): ProfileRole | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/^ROLE_/, "");
  if (normalized === "ADMIN") return "ADMIN";
  if (normalized === "USER") return "USER";
  return null;
}

function readString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function readNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
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
    "adminInterviewToken",
    "userOnboardingDone",
    "onboardingDone",
  ].forEach((key) => localStorage.removeItem(key));
}

export default function ProfileDropdown() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const buildProfile = useCallback(
    (
      payload: GenericApiResponse | Record<string, unknown>,
      fallbackRole: ProfileRole
    ): ProfileData => {
      const raw = unwrapPayload(payload) || {};

      const firstName = readString(
        raw.firstName,
        (payload as GenericApiResponse).firstName
      );

      const lastName = readString(
        raw.lastName,
        (payload as GenericApiResponse).lastName
      );

      const fullName =
        readString(
          raw.fullName,
          (payload as GenericApiResponse).fullName,
          [firstName, lastName].filter(Boolean).join(" ")
        ) || (fallbackRole === "ADMIN" ? "Admin" : "User");

      const email = readString(raw.email, (payload as GenericApiResponse).email);

      const role =
        normalizeRole(raw.userRole) ||
        normalizeRole(raw.role) ||
        normalizeRole((payload as GenericApiResponse).userRole) ||
        normalizeRole((payload as GenericApiResponse).role) ||
        fallbackRole;

      return {
        id: readNumber(raw.id, raw.userId, raw.adminId, (payload as GenericApiResponse).id),
        firstName,
        lastName,
        fullName,
        email,
        role,
      };
    },
    []
  );

  const persistProfileLocally = useCallback((resolvedProfile: ProfileData) => {
    if (typeof window === "undefined") return;

    localStorage.setItem("userRole", resolvedProfile.role);
    localStorage.setItem("role", resolvedProfile.role);

    if (resolvedProfile.fullName) {
      localStorage.setItem("userName", resolvedProfile.fullName);
    }

    if (resolvedProfile.email) {
      localStorage.setItem("userEmail", resolvedProfile.email);
    }

    if (resolvedProfile.id !== undefined) {
      localStorage.setItem("authId", String(resolvedProfile.id));
    }
  }, []);

  const fetchProfile = useCallback(
    async (showRefreshLoader = false) => {
      try {
        if (showRefreshLoader) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const token = getStoredToken();

        const headers: HeadersInit = {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const endpoints: Array<{ url: string; role: ProfileRole }> = [
          { url: API_ROUTES.userProfileMe, role: "USER" },
          { url: API_ROUTES.adminProfileMe, role: "ADMIN" },
          { url: API_ROUTES.userHome, role: "USER" },
          { url: API_ROUTES.adminHome, role: "ADMIN" },
          { url: API_ROUTES.authMe, role: "USER" },
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint.url, {
              method: "GET",
              credentials: "include",
              headers,
              cache: "no-store",
            });

            if (response.ok) {
              const payload: GenericApiResponse | Record<string, unknown> =
                await response.json();
              const resolvedProfile = buildProfile(payload, endpoint.role);
              setProfile(resolvedProfile);
              persistProfileLocally(resolvedProfile);
              return;
            }

            if ([401, 403, 404].includes(response.status)) {
              continue;
            }
          } catch {
            continue;
          }
        }

        throw new Error("No authenticated user/admin profile found.");
      } catch (err) {
        console.error("Failed to load profile dropdown data:", err);
        setProfile(null);
        setError("Unable to load profile details.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildProfile, persistProfileLocally]
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const initials = useMemo(() => {
    const name = profile?.fullName?.trim() || "";
    if (!name) return "P";

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 1).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [profile?.fullName]);

  const roleLabel = profile?.role === "ADMIN" ? "Admin" : "User";

  const profilePath = profile?.role === "ADMIN" ? "/admin/profile" : "/user/profile";
  const dashboardPath =
    profile?.role === "ADMIN" ? "/admin/dashboard" : "/user/dashboard";
  const settingsPath = profile?.role === "ADMIN" ? "/admin/profile" : "/user/profile";

  const handleNavigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  const handleLogout = useCallback(async () => {
    try {
      setLoggingOut(true);
      setOpen(false);

      const token = getStoredToken();

      const headers: HeadersInit = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const logoutEndpoints = [API_ROUTES.logout, API_ROUTES.fallbackLogout];

      let logoutCompleted = false;

      for (const endpoint of logoutEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            credentials: "include",
            headers,
          });

          if (response.ok || response.status === 401 || response.status === 403) {
            logoutCompleted = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!logoutCompleted) {
        console.warn("Logout endpoint did not complete successfully.");
      }

      clearStoredAuth();
      router.replace("/auth/login");
    } catch (err) {
      console.error("Logout failed:", err);
      clearStoredAuth();
      router.replace("/auth/login");
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !loading && !loggingOut && setOpen((prev) => !prev)}
        disabled={loading || loggingOut}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        aria-label="Toggle profile dropdown"
        aria-expanded={open}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : initials}
        </div>

        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-[160px] truncate text-sm font-semibold text-slate-900">
            {loading ? "Loading..." : profile?.fullName || "Profile"}
          </p>
          <p className="max-w-[160px] truncate text-xs text-slate-500">
            {loading ? "Please wait" : profile?.email || roleLabel}
          </p>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+12px)] z-50 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-slate-900">
                  {profile?.fullName || "Profile"}
                </p>

                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  {profile?.role === "ADMIN" ? (
                    <Shield className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span>{roleLabel}</span>
                </div>

                {profile?.email && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </div>
            )}
          </div>

          <div className="p-2">
            <button
              type="button"
              onClick={() => handleNavigate(profilePath)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <User className="h-4 w-4" />
              View Profile
            </button>

            <button
              type="button"
              onClick={() => handleNavigate(dashboardPath)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </button>

            <button
              type="button"
              onClick={() => handleNavigate(settingsPath)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Settings className="h-4 w-4" />
              Account Settings
            </button>

            <button
              type="button"
              onClick={() => fetchProfile(true)}
              disabled={refreshing}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {refreshing ? "Refreshing..." : "Refresh Profile"}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}