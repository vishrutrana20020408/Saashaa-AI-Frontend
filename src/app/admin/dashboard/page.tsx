"use client";

import { motion } from "framer-motion";
import {
  Building2,
  Briefcase,
  FileText,
  ShieldCheck,
  Users,
  BrainCircuit,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AdminSectionId =
  | "company"
  | "interview"
  | "resumes"
  | "users"
  | "companydashboard";

interface DashboardSection {
  id: AdminSectionId;
  title: string;
  description: string;
  bg: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  statLabel: string;
}

interface BackendEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
}

interface AuthMeLike {
  authenticated?: boolean;
  valid?: boolean;
  role?: string;
  userRole?: string;
  roles?: string[];
  data?: AuthMeLike | null;
  payload?: AuthMeLike | null;
  result?: AuthMeLike | null;
}

interface AdminDashboardSummary {
  totalCompanies?: number;
  totalUsers?: number;
  totalAdmins?: number;
  totalResumes?: number;
  totalResumeVersions?: number;
  totalInterviews?: number;
  totalAiSessions?: number;
  totalJobs?: number;
  activeCompanies?: number;
  pendingCompanies?: number;
  scheduledInterviews?: number;
  completedInterviews?: number;
  aiEngineStatus?: string;
  lastUpdated?: string;
}

interface SectionSummaryMap {
  company: number | null;
  interview: number | null;
  resumes: number | null;
  users: number | null;
  companydashboard: number | null;
}

function normalizeRole(value?: string | null): string {
  return (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
}

function unwrapPayload<T extends object>(
  value: BackendEnvelope<T> | T | null | undefined
): T | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as BackendEnvelope<T> & T;
  return candidate.data ?? candidate.payload ?? candidate.result ?? (candidate as T);
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function getStoredToken(): string {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    ""
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
  ].forEach((key) => localStorage.removeItem(key));
}

async function fetchJsonWithAuth<T>(
  url: string,
  token: string
): Promise<{ ok: boolean; status: number; data: T | null; raw: string }> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    cache: "no-store",
  });

  const raw = await response.text();
  const data = safeJsonParse<T>(raw);

  return {
    ok: response.ok,
    status: response.status,
    data,
    raw,
  };
}

const SECTIONS: DashboardSection[] = [
  {
    id: "company",
    title: "Company Management",
    description:
      "Manage registered companies, approvals, verification status, and company data.",
    bg: "bg-linear-to-br from-blue-600 to-indigo-700",
    route: "/admin/company",
    icon: Building2,
    statLabel: "Companies",
  },
  {
    id: "interview",
    title: "Interview Management",
    description:
      "Monitor scheduled interviews, AI sessions, reports, and candidate performance.",
    bg: "bg-linear-to-br from-purple-600 to-pink-600",
    route: "/admin/interviewdashboard",
    icon: BrainCircuit,
    statLabel: "Interviews",
  },
  {
    id: "resumes",
    title: "Resume Management",
    description:
      "Review candidate resumes, AI scoring results, version history, and document analytics.",
    bg: "bg-linear-to-br from-emerald-600 to-teal-600",
    route: "/admin/resume",
    icon: FileText,
    statLabel: "Resumes",
  },
  {
    id: "users",
    title: "User Management",
    description:
      "Manage students, creators, companies, and admin accounts.",
    bg: "bg-linear-to-br from-orange-500 to-red-600",
    route: "/admin/users",
    icon: Users,
    statLabel: "Users",
  },
  {
    id: "companydashboard",
    title: "Company Dashboard Overview",
    description:
      "Monitor company-level analytics, job postings, hiring activity, and platform engagement.",
    bg: "bg-linear-to-br from-slate-700 to-gray-900",
    route: "/admin/companydashboard",
    icon: Briefcase,
    statLabel: "Jobs / Metrics",
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();

  const backendBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      "http://localhost:8080"
    );
  }, []);

  const [authChecking, setAuthChecking] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error, setError] = useState("");
  const [adminName, setAdminName] = useState("Admin");

  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [sectionStats, setSectionStats] = useState<SectionSummaryMap>({
    company: null,
    interview: null,
    resumes: null,
    users: null,
    companydashboard: null,
  });

  const validateAdminSession = useCallback(async (): Promise<string | null> => {
    const token = getStoredToken();

    if (!token) {
      clearStoredAuth();
      router.replace("/auth/login");
      return null;
    }

    try {
      const authResponse = await fetchJsonWithAuth<AuthMeLike | BackendEnvelope<AuthMeLike>>(
        `${backendBaseUrl}/api/auth/me`,
        token
      );

      if (!authResponse.ok || !authResponse.data) {
        clearStoredAuth();
        router.replace("/auth/login");
        return null;
      }

      const authPayload = unwrapPayload<AuthMeLike>(authResponse.data);
      const role = normalizeRole(
        authPayload?.userRole ?? authPayload?.role ?? authPayload?.roles?.[0]
      );

      const authenticated = Boolean(
        authPayload?.authenticated ?? authPayload?.valid ?? authResponse.ok
      );

      if (!authenticated) {
        clearStoredAuth();
        router.replace("/auth/login");
        return null;
      }

      if (role !== "ADMIN") {
        router.replace("/user");
        return null;
      }

      const storedName =
        typeof window !== "undefined"
          ? localStorage.getItem("userName") || "Admin"
          : "Admin";

      setAdminName(storedName);
      return token;
    } catch {
      clearStoredAuth();
      router.replace("/auth/login");
      return null;
    } finally {
      setAuthChecking(false);
    }
  }, [backendBaseUrl, router]);

  const loadDashboardSummary = useCallback(
    async (token: string) => {
      setLoadingSummary(true);
      setError("");

      try {
        /**
         * Preferred backend summary endpoint:
         * GET /api/admin/dashboard/summary
         *
         * The page also gracefully falls back if this endpoint
         * is not implemented yet.
         */
        const dashboardResponse = await fetchJsonWithAuth<
          AdminDashboardSummary | BackendEnvelope<AdminDashboardSummary>
        >(`${backendBaseUrl}/api/admin/dashboard/summary`, token);

        const dashboardPayload = dashboardResponse.data
          ? unwrapPayload<AdminDashboardSummary>(dashboardResponse.data)
          : null;

        const mergedSummary: AdminDashboardSummary = {
          totalCompanies: dashboardPayload?.totalCompanies,
          totalUsers: dashboardPayload?.totalUsers,
          totalAdmins: dashboardPayload?.totalAdmins,
          totalResumes: dashboardPayload?.totalResumes,
          totalResumeVersions: dashboardPayload?.totalResumeVersions,
          totalInterviews: dashboardPayload?.totalInterviews,
          totalAiSessions: dashboardPayload?.totalAiSessions,
          totalJobs: dashboardPayload?.totalJobs,
          activeCompanies: dashboardPayload?.activeCompanies,
          pendingCompanies: dashboardPayload?.pendingCompanies,
          scheduledInterviews: dashboardPayload?.scheduledInterviews,
          completedInterviews: dashboardPayload?.completedInterviews,
          aiEngineStatus: dashboardPayload?.aiEngineStatus ?? "UNKNOWN",
          lastUpdated:
            dashboardPayload?.lastUpdated ?? new Date().toISOString(),
        };

        setSummary(mergedSummary);
        setSectionStats({
          company:
            mergedSummary.totalCompanies ??
            mergedSummary.activeCompanies ??
            null,
          interview:
            mergedSummary.totalInterviews ??
            mergedSummary.totalAiSessions ??
            mergedSummary.scheduledInterviews ??
            null,
          resumes:
            mergedSummary.totalResumes ??
            mergedSummary.totalResumeVersions ??
            null,
          users:
            (mergedSummary.totalUsers ?? null) !== null
              ? (mergedSummary.totalUsers ?? 0) +
                (mergedSummary.totalAdmins ?? 0)
              : null,
          companydashboard:
            mergedSummary.totalJobs ??
            mergedSummary.activeCompanies ??
            null,
        });

        if (!dashboardResponse.ok) {
          setError(
            "Admin dashboard summary endpoint is not fully available yet. Showing available module navigation."
          );
        }
      } catch {
        setSummary(null);
        setSectionStats({
          company: null,
          interview: null,
          resumes: null,
          users: null,
          companydashboard: null,
        });
        setError(
          "Unable to load dashboard summary from the backend right now."
        );
      } finally {
        setLoadingSummary(false);
      }
    },
    [backendBaseUrl]
  );

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const token = await validateAdminSession();
      if (!token || cancelled) return;
      await loadDashboardSummary(token);
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [loadDashboardSummary, validateAdminSession]);

  const handleRefresh = async () => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    await loadDashboardSummary(token);
  };

  if (authChecking) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-950 text-white px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-cyan-400" />
          <h1 className="text-2xl font-semibold">Checking admin access</h1>
          <p className="mt-2 text-sm text-slate-300">
            Verifying your backend session and role permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                <ShieldCheck className="h-4 w-4" />
                Admin Control Center
              </div>

              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                Welcome, {adminName}
              </h1>

              <p className="mt-3 max-w-3xl text-base text-slate-300 md:text-lg">
                This dashboard is connected to your backend-admin flow and is
                designed to manage companies, users, resumes, interviews, and
                platform-level analytics in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loadingSummary}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingSummary ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh Dashboard
              </button>

              <button
                type="button"
                onClick={() => router.push("/admin/profile")}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                <ShieldCheck className="h-4 w-4" />
                View Admin Profile
              </button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-slate-400">Total Users</p>
              <h2 className="mt-2 text-3xl font-bold">
                {summary?.totalUsers ?? "—"}
              </h2>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-slate-400">Total Companies</p>
              <h2 className="mt-2 text-3xl font-bold">
                {summary?.totalCompanies ?? "—"}
              </h2>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-slate-400">Total Resumes</p>
              <h2 className="mt-2 text-3xl font-bold">
                {summary?.totalResumes ?? "—"}
              </h2>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-slate-400">Total Interviews</p>
              <h2 className="mt-2 text-3xl font-bold">
                {summary?.totalInterviews ?? "—"}
              </h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-cyan-100">
              <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">
                AI Engine Status
              </p>
              <p className="mt-2 text-lg font-semibold">
                {summary?.aiEngineStatus || "Unknown"}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-100">
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-300">
                Active Companies
              </p>
              <p className="mt-2 text-lg font-semibold">
                {summary?.activeCompanies ?? "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-purple-400/20 bg-purple-400/10 p-4 text-purple-100">
              <p className="text-xs uppercase tracking-[0.16em] text-purple-300">
                Scheduled Interviews
              </p>
              <p className="mt-2 text-lg font-semibold">
                {summary?.scheduledInterviews ?? "—"}
              </p>
            </div>
          </div>

          {error ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-amber-100">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">
              Admin Management Modules
            </h2>
            <p className="mt-2 text-sm text-slate-400 md:text-base">
              Navigate into each backend-integrated module to manage your
              platform data and AI-assisted workflows.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {SECTIONS.map((section, index) => {
            const Icon = section.icon;
            const statValue = sectionStats[section.id];

            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className={`relative overflow-hidden rounded-3xl p-6 shadow-2xl ${section.bg}`}
              >
                <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-white/10 blur-2xl" />
                <div className="relative z-10 flex h-full flex-col justify-between gap-6">
                  <div>
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                        <Icon className="h-7 w-7 text-white" />
                      </div>

                      <div className="rounded-2xl bg-black/20 px-4 py-2 text-right backdrop-blur">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">
                          {section.statLabel}
                        </p>
                        <p className="text-2xl font-bold">
                          {loadingSummary ? "..." : statValue ?? "—"}
                        </p>
                      </div>
                    </div>

                    <h3 className="text-3xl font-bold">{section.title}</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
                      {section.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(section.route)}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:scale-[1.02]"
                    >
                      Manage Module
                      <ArrowRight className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById("admin-top")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
                    >
                      Overview
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <div id="admin-top" className="h-1 w-full" />
    </div>
  );
}