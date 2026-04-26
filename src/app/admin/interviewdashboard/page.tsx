"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Brain,
  Briefcase,
  Loader2,
  Play,
  RefreshCw,
  ShieldCheck,
  User2,
  X,
} from "lucide-react";

type NullableString = string | null | undefined;

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  payload?: T;
  result?: T;
}

interface AuthUser {
  id?: number | string;
  name?: string;
  fullName?: string;
  firstName?: string;
  email?: string;
  role?: string;
  userRole?: string;
  roles?: string[];
  authenticated?: boolean;
  valid?: boolean;
}

interface CreateInterviewSessionResponseData {
  sessionId?: string;
  token?: string;
  interviewToken?: string;
  domain?: string;
  category?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  me: `${API_BASE_URL}/api/auth/me`,
  createInterviewSession: `${API_BASE_URL}/api/user/interview/session`,
};

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null | undefined): T | null {
  if (!json || typeof json !== "object") return null;
  const envelope = json as ApiEnvelope<T> & T;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const keys = [
    "accessToken",
    "authToken",
    "token",
    "jwtToken",
    "jwt",
    "userToken",
  ];

  return keys.map((key) => localStorage.getItem(key)).find(Boolean) || null;
}

function clearAuthStorage() {
  if (typeof window === "undefined") return;

  [
    "accessToken",
    "authToken",
    "token",
    "jwtToken",
    "jwt",
    "userToken",
    "userRole",
    "role",
    "userName",
    "userEmail",
  ].forEach((key) => localStorage.removeItem(key));
}

function normalizeText(value?: NullableString, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function sanitizeRouteValue(value?: NullableString): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function isAdminRole(role?: string, roles?: string[]): boolean {
  const normalizedRole = normalizeText(role).toUpperCase().replace(/^ROLE_/, "");
  const normalizedRoles = Array.isArray(roles)
    ? roles.map((item) => normalizeText(item).toUpperCase().replace(/^ROLE_/, ""))
    : [];

  return normalizedRole === "ADMIN" || normalizedRoles.includes("ADMIN");
}

export default function AdminInterviewDashboard() {
  const router = useRouter();
  const token = useMemo(() => getAuthToken(), []);

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);

  const [adminName, setAdminName] = useState("Admin");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const validateAdmin = useCallback(async (): Promise<boolean> => {
    if (!token) {
      clearAuthStorage();
      router.replace("/auth/login");
      return false;
    }

    try {
      const response = await fetch(API_ROUTES.me, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const json = await response.json().catch(() => null);
      const currentUser = unwrapResponse<AuthUser>(json);

      if (!response.ok || !currentUser) {
        throw new Error("Invalid auth response");
      }

      if (!isAdminRole(currentUser.userRole ?? currentUser.role, currentUser.roles)) {
        router.replace("/user");
        return false;
      }

      const resolvedName =
        normalizeText(currentUser.fullName) ||
        normalizeText(currentUser.name) ||
        normalizeText(currentUser.firstName) ||
        "Admin";

      setAdminName(resolvedName);
      localStorage.setItem("userName", resolvedName);
      return true;
    } catch {
      clearAuthStorage();
      router.replace("/auth/login");
      return false;
    } finally {
      setAuthChecking(false);
    }
  }, [router, token]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const allowed = await validateAdmin();
      if (!allowed || cancelled) return;
      setLoading(false);
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [validateAdmin]);

  const startInterview = async (type: "job" | "mock") => {
    setCreatingSession(true);
    setError(null);

    try {
      const interviewMode = type === "job" ? "REAL" : "MOCK";
      const interviewName =
        type === "job" ? "Job Profile Interview" : "Mock Interview";
      const interviewType = type === "job" ? "MIXED" : "MIXED";
      const categoryName = type === "job" ? "Job Profile" : "Mock Interview";

      const response = await fetch(API_ROUTES.createInterviewSession, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          interviewType,
          interviewMode,
          domain: interviewName,
          category: categoryName,
          role: interviewName,
        }),
      });

      const json = await response.json().catch(() => null);
      const sessionData = unwrapResponse<CreateInterviewSessionResponseData>(json) || {};

      const interviewToken =
        normalizeText(sessionData.token) ||
        normalizeText(sessionData.interviewToken) ||
        `${Date.now()}`;

      const sessionId = normalizeText(sessionData.sessionId);
      const routeDomain = sanitizeRouteValue(sessionData.domain || interviewName);
      const routeCategory = sanitizeRouteValue(sessionData.category || categoryName);

      const params = new URLSearchParams({
        domain: routeDomain || sanitizeRouteValue(interviewName),
        category: routeCategory || sanitizeRouteValue(categoryName),
        token: interviewToken,
      });

      if (sessionId) {
        params.set("sessionId", sessionId);
      }

      router.push(`/admin/interview?${params.toString()}`);
    } catch {
      setError("Unable to start interview session. Please try again.");
    } finally {
      setCreatingSession(false);
    }
  };

  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4 dark:bg-slate-950 dark:text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/50 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-slate-900/95 backdrop-blur-xl">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-indigo-400" />
          <h1 className="text-2xl font-bold mb-2">
            {authChecking ? "Verifying admin access" : "Loading interview dashboard"}
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            {authChecking
              ? "Please wait while we verify your admin session."
              : "Loading interview dashboard."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4 py-10 dark:bg-slate-950 dark:text-white">
      <div className="w-full max-w-6xl">
        <div className="rounded-4xl border border-slate-200/50 bg-white p-8 md:p-14 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
          <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <ShieldCheck className="h-4 w-4" />
                Admin Interview Dashboard
              </p>
              <h1 className="text-4xl font-semibold tracking-tight">
                Welcome back, {adminName}
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
                Manage and launch admin interview sessions. Choose a job profile or mock interview to begin.
              </p>
            </div>
            <div className="inline-flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <div className="rounded-2xl bg-indigo-500/10 p-3">
                <User2 className="h-5 w-5 text-indigo-300" />
              </div>
              <div className="text-left">
                <p className="text-sm text-slate-500 dark:text-slate-400">Signed in as</p>
                <p className="font-medium">{adminName}</p>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-8 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="mb-8 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              {info}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => startInterview("job")}
              className="group rounded-3xl border border-slate-200/60 bg-white shadow-sm p-8 text-left transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                <Briefcase size={24} />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-slate-900 dark:text-white">Job Profile Interview</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Launch a job profile based interview session for an admin review.
              </p>
            </button>

            <button
              type="button"
              onClick={() => startInterview("mock")}
              className="group rounded-3xl border border-slate-200/60 bg-white shadow-sm p-8 text-left transition hover:border-purple-300 hover:bg-purple-50 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-purple-600 text-white shadow-lg shadow-purple-500/20">
                <Brain size={24} />
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-slate-900 dark:text-white">Mock Interview</h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Start a mock interview workflow for candidate assessment and training.
              </p>
            </button>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => validateAdmin()}
              className="inline-flex items-center justify-center gap-2 rounded-3xl border border-slate-300/60 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
