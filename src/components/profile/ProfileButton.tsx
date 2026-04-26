"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  ChevronDown,
  Loader2,
  LogOut,
  Settings,
  Mail,
} from "lucide-react";

type ProfileRole = "USER" | "ADMIN";

type ResolvedProfile = {
  id?: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  role: ProfileRole;
};

type GenericApiResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function ProfileButton() {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ResolvedProfile | null>(null);

  const extractText = (...values: unknown[]): string | undefined => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  };

  const extractNumber = (...values: unknown[]): number | undefined => {
    for (const value of values) {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
    }
    return undefined;
  };

  const buildProfileFromResponse = useCallback(
    (payload: GenericApiResponse, fallbackRole: ProfileRole): ResolvedProfile => {
      const data = (payload?.data || {}) as Record<string, unknown>;

      const firstName = extractText(data.firstName, payload.firstName);
      const lastName = extractText(data.lastName, payload.lastName);
      const fullName =
        extractText(
          data.fullName,
          payload.fullName,
          [firstName, lastName].filter(Boolean).join(" ")
        ) || (fallbackRole === "ADMIN" ? "Admin" : "User");

      const email = extractText(data.email, payload.email);

      const roleFromPayload = extractText(data.role, payload.role);
      const normalizedRole: ProfileRole =
        roleFromPayload === "ADMIN" ? "ADMIN" : fallbackRole;

      return {
        id: extractNumber(data.id, data.userId, data.adminId, payload.id),
        firstName,
        lastName,
        fullName,
        email,
        role: normalizedRole,
      };
    },
    []
  );

  const tryFetchJson = useCallback(async (url: string) => {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    return response;
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      /*
       * Backend-aware resolution strategy:
       * 1. Try dedicated profile endpoints first
       * 2. Fall back to protected home/session endpoints
       * This matches your Interview System architecture where profile storage
       * and profile viewing are backend-backed for both user/admin.
       */

      const candidates: Array<{ url: string; role: ProfileRole }> = [
        { url: `${API_BASE_URL}/api/user/profile/me`, role: "USER" },
        { url: `${API_BASE_URL}/api/admin/profile/me`, role: "ADMIN" },
        { url: `${API_BASE_URL}/api/user/home`, role: "USER" },
        { url: `${API_BASE_URL}/api/admin/home`, role: "ADMIN" },
      ];

      for (const candidate of candidates) {
        try {
          const response = await tryFetchJson(candidate.url);

          if (response.ok) {
            const payload: GenericApiResponse = await response.json();
            const resolved = buildProfileFromResponse(payload, candidate.role);
            setProfile(resolved);
            return;
          }

          if (response.status === 401 || response.status === 403 || response.status === 404) {
            continue;
          }
        } catch {
          continue;
        }
      }

      throw new Error("No authenticated profile session found.");
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError("Unable to load profile.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [buildProfileFromResponse, tryFetchJson]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [profile?.fullName]);

  const roleLabel = profile?.role === "ADMIN" ? "Admin" : "User";

  const profileRoute =
    profile?.role === "ADMIN" ? "/admin/profile" : "/user/profile";

  const dashboardRoute =
    profile?.role === "ADMIN" ? "/admin/dashboard" : "/user/dashboard";

  const handleNavigateProfile = () => {
    setOpen(false);
    router.push(profileRoute);
  };

  const handleNavigateDashboard = () => {
    setOpen(false);
    router.push(dashboardRoute);
  };

  const handleLogout = useCallback(async () => {
    try {
      setLoggingOut(true);
      setOpen(false);

      const logoutEndpoints = [
        `${API_BASE_URL}/api/auth/logout`,
        `${API_BASE_URL}/logout`,
      ];

      let completed = false;

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
            completed = true;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!completed) {
        console.warn("Backend logout endpoint did not complete successfully.");
      }

      try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("adminInterviewToken");
      } catch {
        // ignore localStorage cleanup issues
      }

      router.replace("/auth/login");
    } catch (err) {
      console.error("Logout failed:", err);
      router.replace("/auth/login");
    } finally {
      setLoggingOut(false);
    }
  }, [router]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !loading && setOpen((prev) => !prev)}
        disabled={loading || loggingOut}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
        aria-label="Open profile menu"
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
          className={`h-4 w-4 text-slate-500 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
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
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}
          </div>

          <div className="p-2">
            <button
              type="button"
              onClick={handleNavigateProfile}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <User className="h-4 w-4" />
              View Profile
            </button>

            <button
              type="button"
              onClick={handleNavigateDashboard}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <Settings className="h-4 w-4" />
              Go to Dashboard
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