"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Users,
  FileText,
  BrainCircuit,
  ArrowRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { ADMIN_LINKS } from "@/components/nav/AdminNavbar";
import { resolveInterviewStatus } from "@/config/interviewConfig";

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  payload?: T;
  result?: T;
}

interface AuthUserLike {
  id?: number | string;
  email?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  FirstName?: string;
  Name?: string;
  role?: string;
  userRole?: string;
  roles?: string[];
  authenticated?: boolean;
  valid?: boolean;
}

interface AdminSummaryCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  buttonLabel: string;
  gradient: string;
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

function getDisplayName(user: AuthUserLike | null): string {
  if (!user) return "Admin";

  const full =
    user.fullName ||
    user.name ||
    user.Name ||
    user.firstName ||
    user.FirstName ||
    "";

  if (!full.trim()) return "Admin";

  return full.trim();
}

function buildAdminContinueInterviewHref(session: any) {
  const sessionId =
    session?.interviewSessionId ?? session?.sessionId ?? session?.id;
  if (!sessionId) return null;

  const params = new URLSearchParams();
  params.set("sessionId", String(sessionId));

  const token = session?.token || session?.interviewToken;
  if (token) {
    params.set("token", String(token));
  }

  const domain = session?.domain || session?.jobTitle || session?.category;
  if (domain) {
    params.set("domain", String(domain));
  }

  const category = session?.category || session?.type;
  if (category) {
    params.set("category", String(category));
  }

  return `/admin/interview?${params.toString()}`;
}

export default function AdminPage() {
  const backendBaseUrl = useMemo(() => {
    const raw =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:8080";

    return raw.endsWith("/") ? raw.slice(0, -1) : raw;
  }, []);

  const [adminName, setAdminName] = useState("Admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingInterview, setPendingInterview] = useState<{
    title: string;
    href: string;
    status: string;
  } | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);

  const fetchAdminIdentity = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getStoredToken();

    if (!token) {
      setError("No admin token found. Please login again.");
      setLoading(false);
      return;
    }

    try {
      const meResponse = await fetch(`${backendBaseUrl}/api/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
      });

      const meJson = await meResponse.json().catch(() => null);
      const meUser = unwrapResponse<AuthUserLike>(meJson);

      if (meResponse.ok && meUser) {
        const authenticated = Boolean(
          meUser.authenticated ?? meUser.valid ?? meResponse.ok
        );

        if (!authenticated) {
          throw new Error("Admin session is not valid.");
        }

        if (!isAdminRole(meUser.userRole ?? meUser.role, meUser.roles)) {
          throw new Error("You are not logged in as an admin.");
        }

        setAdminName(getDisplayName(meUser));
        setLoading(false);
        return;
      }

      const fallbackResponse = await fetch(`${backendBaseUrl}/api/admin/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
      });

      const fallbackText = await fallbackResponse.text();
      const fallbackJson: AuthUserLike | ApiEnvelope<AuthUserLike> | null =
        fallbackText ? JSON.parse(fallbackText) : null;

      if (!fallbackResponse.ok) {
        throw new Error(
          (fallbackJson as ApiEnvelope<AuthUserLike>)?.message ||
            (fallbackText ? fallbackText : "Failed to load admin profile")
        );
      }

      const fallbackUser = unwrapResponse<AuthUserLike>(fallbackJson);

      if (!fallbackUser) {
        throw new Error("Admin profile could not be loaded.");
      }

      setAdminName(getDisplayName(fallbackUser));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load admin profile."
      );
    } finally {
      setLoading(false);
    }
  }, [backendBaseUrl]);

  const fetchPendingInterview = useCallback(async () => {
    setPendingLoading(true);
    setPendingInterview(null);

    const token = getStoredToken();
    if (!token) {
      setPendingLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${backendBaseUrl}/api/admin/interview/sessions/pending`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return;
      }

      const raw = await response.json().catch(() => null);
      const payload = unwrapResponse<any>(raw);
      const sessions = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : [];

      const pending = sessions.find(
        (session: any) =>
          ["CREATED", "ACTIVE", "PENDING", "IN_PROGRESS"].includes(
            resolveInterviewStatus(session)
          )
      );

      if (pending) {
        const href = buildAdminContinueInterviewHref(pending);
        if (href) {
          setPendingInterview({
            title:
              pending.title || pending.jobTitle || pending.name ||
              `Pending Interview`,
            href,
            status: resolveInterviewStatus(pending),
          });
        }
      }
    } catch {
      // ignore pending fetch failures for landing page
    } finally {
      setPendingLoading(false);
    }
  }, [backendBaseUrl]);

  useEffect(() => {
    void fetchAdminIdentity();
    void fetchPendingInterview();
  }, [fetchAdminIdentity, fetchPendingInterview]);

  return (
    <div className="min-h-screen bg-gray-100">
      <section className="bg-linear-to-r from-slate-950 via-slate-900 to-black text-white py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
            <ShieldCheck className="h-4 w-4" />
            Admin Control Center
          </div>

          {loading ? (
            <div className="flex items-center gap-3 text-white/90">
              <Loader2 className="h-6 w-6 animate-spin" />
              <h1 className="text-4xl md:text-5xl font-bold">
                Verifying admin session...
              </h1>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold">
                Welcome to the Admin Panel
              </h1>
              <div className="inline-flex max-w-2xl items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-4 text-red-200">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Unable to verify admin identity</p>
                  <p className="mt-1 text-sm text-red-100/90">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchAdminIdentity}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold">
                Welcome to the Admin Panel, {adminName}
              </h1>
              <p className="max-w-3xl text-lg text-white/75 leading-8">
                Manage companies, users, resumes, jobs, and AI interview workflows
                through the backend-integrated admin system.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-white/10 p-4 text-sm text-white/85">
                  <span className="font-semibold">Platform control</span> for candidate workflows, interview review, and resume quality.
                </div>
                <div className="rounded-3xl bg-white/10 p-4 text-sm text-white/85">
                  <span className="font-semibold">Live oversight</span> on pending interviews, session status, and admin actions.
                </div>
                <div className="rounded-3xl bg-white/10 p-4 text-sm text-white/85">
                  <span className="font-semibold">User management</span> with company verification and profile administration.
                </div>
                <div className="rounded-3xl bg-white/10 p-4 text-sm text-white/85">
                  <span className="font-semibold">Resume and job control</span> for ATS scoring, posting, and platform governance.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Admin Modules</h2>
            <p className="mt-2 max-w-3xl text-gray-600">
              These modules are aligned with your latest backend-integrated project
              structure and support the resume, interview, and job workflow.
            </p>
          </div>

          <div className="space-y-6">
            {pendingInterview && (
              <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-lg">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">
                      Pending Interview
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">
                      Continue {pendingInterview.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {pendingInterview.status === "IN_PROGRESS"
                        ? "Your interview is currently in progress. Resume where you left off."
                        : "A pending interview needs your attention. Continue the session now."}
                    </p>
                  </div>
                  <Link
                    href={pendingInterview.href}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    Continue Interview
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {ADMIN_LINKS.filter((link) => link.path !== "/admin").map((link) => (
                <div
                  key={link.path}
                  className="rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-xl"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                    <ShieldCheck className="h-7 w-7" />
                  </div>

                  <h3 className="text-2xl font-bold">{link.name}</h3>
                  <p className="mt-3 text-white/85 leading-7">
                    Open the {link.name.toLowerCase()} page from your current admin navigation.
                  </p>

                  <Link
                    href={link.path}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Open {link.name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 px-6">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Platform Oversight
          </h2>
          <p className="mt-3 mx-auto max-w-3xl text-gray-600 leading-7">
            Use the dashboard for platform-level monitoring, the resume module for
            ATS and version history, the jobs module to manage job postings, and
            the interview module to monitor AI-powered interview activity.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/admin/dashboard"
              className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
            >
              Go to Dashboard
            </Link>

            <Link
              href="/admin/resume"
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              Open Resume Module
            </Link>

            <Link
              href="/admin/interviewdashboard"
              className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700"
            >
              Open Interview Control
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}