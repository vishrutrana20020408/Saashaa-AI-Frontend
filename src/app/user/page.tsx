"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  FileText,
  Wand2,
  Copy,
  Upload,
  CheckCircle2,
  Layers3,
  BarChart3,
  ArrowRight,
  Eye,
} from "lucide-react";
import { USER_LINKS } from "@/components/nav/UserNavbar";
import { resolveInterviewStatus } from "@/config/interviewConfig";

type DomainType = "Technical" | "Non-Technical";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

type AuthUserLike = {
  id?: number | string;
  name?: string;
  Name?: string;
  firstName?: string;
  FirstName?: string;
  username?: string;
  email?: string;
  role?: string;
  userRole?: string;
  roles?: string[];
};

type OnboardingStatusData = {
  done?: boolean;
  resumeUploaded?: boolean;
  resumeScanned?: boolean;
  resumeFileName?: string | null;
  domain?: DomainType | null;
  subDomainMode?: "single" | "any" | "multi" | null;
  subDomainSingle?: string | null;
  subDomainMulti?: string[];
  jobTitles?: string[];
};

type ResumeData = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  structuredContentJson?: string;
  fileUrl?: string;
  previewUrl?: string;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  parentVersionId?: number | null;
  updatedAt?: string;
  createdAt?: string;
};

type JobApplicationData = {
  jobApplicationId?: number;
  jobTitle?: string;
  companyName?: string;
  status?: string;
  appliedAt?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

const API_ROUTES = {
  authMe: `${API_BASE_URL}/api/auth/me`,
  userMe: `${API_BASE_URL}/api/user/me`,
  onboardingStatus: `${API_BASE_URL}/api/user/onboarding/status`,
  currentResume: `${API_BASE_URL}/api/user/resume/current`,
  jobApplications: `${API_BASE_URL}/api/user/job-application`,
  dashboard: `${API_BASE_URL}/api/user/dashboard`,
};

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null): T | null {
  if (!json) return null;
  const envelope = json as ApiEnvelope<T>;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(
  value: unknown,
  fallback?: number
): number | undefined {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
  return false;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
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

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildContinueInterviewHref(session: any) {
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

  return `/user/interview?${params.toString()}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeAuthUser(raw: any): AuthUserLike | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    id: raw.id,
    name:
      normalizeString(raw.name) ||
      normalizeString(raw.Name) ||
      normalizeString(raw.firstName) ||
      normalizeString(raw.FirstName) ||
      normalizeString(raw.username),
    firstName:
      normalizeString(raw.firstName) ||
      normalizeString(raw.FirstName) ||
      normalizeString(raw.name) ||
      normalizeString(raw.Name),
    username: normalizeString(raw.username),
    email: normalizeString(raw.email),
    role: normalizeString(raw.role),
    userRole: normalizeString(raw.userRole),
    roles: Array.isArray(raw.roles) ? raw.roles : [],
  };
}

function normalizeOnboardingStatusData(raw: any): OnboardingStatusData | null {
  if (!raw || typeof raw !== "object") return null;

  const domainValue = normalizeString(raw?.domain);
  const normalizedDomain =
    domainValue === "Technical" || domainValue === "Non-Technical"
      ? (domainValue as DomainType)
      : null;

  const modeValue = normalizeString(raw?.subDomainMode);
  const normalizedMode =
    modeValue === "single" || modeValue === "any" || modeValue === "multi"
      ? modeValue
      : null;

  return {
    done: normalizeBoolean(raw?.done),
    resumeUploaded: normalizeBoolean(raw?.resumeUploaded ?? raw?.resumeScanned),
    resumeScanned: normalizeBoolean(raw?.resumeScanned ?? raw?.resumeUploaded),
    resumeFileName: normalizeString(raw?.resumeFileName) || null,
    domain: normalizedDomain,
    subDomainMode: normalizedMode,
    subDomainSingle: normalizeString(raw?.subDomainSingle) || null,
    subDomainMulti: normalizeStringArray(raw?.subDomainMulti),
    jobTitles: normalizeStringArray(raw?.jobTitles),
  };
}

function normalizeResumeData(raw: any): ResumeData | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    resumeId:
      normalizeNumber(raw.resumeId) ??
      normalizeNumber(raw.id) ??
      normalizeNumber(raw.resume?.resumeId) ??
      normalizeNumber(raw.resume?.id),

    resumeVersionId:
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.currentVersionId),

    versionId:
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.currentVersionId),

    resumeName:
      normalizeString(raw.resumeName) ||
      normalizeString(raw.name) ||
      normalizeString(raw.resumeTitle),

    fileName:
      normalizeString(raw.fileName) ||
      normalizeString(raw.originalFileName) ||
      normalizeString(raw.documentName),

    atsScore:
      normalizeNumber(raw.atsScore) ??
      normalizeNumber(raw.score) ??
      normalizeNumber(raw.ats) ??
      0,

    rawText:
      normalizeString(raw.rawText) ||
      normalizeString(raw.contentText) ||
      normalizeString(raw.textContent) ||
      normalizeString(raw.content),

    structuredContentJson:
      normalizeString(raw.structuredContentJson) ||
      normalizeString(raw.structuredContent) ||
      normalizeString(raw.structuredJson),

    fileUrl:
      normalizeString(raw.fileUrl) ||
      normalizeString(raw.downloadUrl) ||
      normalizeString(raw.filePath),

    previewUrl:
      normalizeString(raw.previewUrl) ||
      normalizeString(raw.previewFileUrl),

    versionCode: normalizeString(raw.versionCode),
    versionType: normalizeString(raw.versionType),
    isBaseVersion: normalizeBoolean(
      raw.isBaseVersion ?? raw.baseVersion ?? raw.isBase
    ),
    parentVersionId: normalizeNumber(raw.parentVersionId, null as never) ?? null,
    updatedAt:
      normalizeString(raw.updatedAt) ||
      normalizeString(raw.lastModifiedAt) ||
      normalizeString(raw.modifiedAt) ||
      normalizeString(raw.createdAt),
    createdAt:
      normalizeString(raw.createdAt) ||
      normalizeString(raw.uploadedAt) ||
      normalizeString(raw.generatedAt),
  };
}

export default function UserLandingPage() {
  const router = useRouter();

  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [firstName, setFirstName] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  const [onboarding, setOnboarding] = useState<OnboardingStatusData | null>(null);
  const [resume, setResume] = useState<ResumeData | null>(null);

  const [loadingResume, setLoadingResume] = useState(false);
  const [pendingInterview, setPendingInterview] = useState<{
    title: string;
    href: string;
    status: string;
  } | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [latestApplication, setLatestApplication] = useState<JobApplicationData | null>(null);
  const [loadingJobApplication, setLoadingJobApplication] = useState(false);
  const [dashboardAnalytics, setDashboardAnalytics] = useState<{
    resumeScore?: number | null;
    interviewResultScore?: number | null;
    mockInterviewResultScore?: number | null;
    latestInterviewSessionId?: number | string | null;
    latestMockInterviewSessionId?: number | string | null;
    mockInterviewCount?: number | null;
  } | null>(null);

  const domain = onboarding?.domain || "";
  const subDomainMode = onboarding?.subDomainMode || "single";
  const subDomainSingle = onboarding?.subDomainSingle || "";
  const subDomainMulti = onboarding?.subDomainMulti || [];
  const jobTitles = onboarding?.jobTitles || [];

  const trackLabel = useMemo(() => {
    if (!domain) return "Not configured";

    if (subDomainMode === "any") {
      return "Any (Auto-pick best track)";
    }

    if (subDomainMode === "multi") {
      return subDomainMulti.length > 0
        ? subDomainMulti.join(" • ")
        : "Multiple tracks";
    }

    return subDomainSingle || "Single track";
  }, [domain, subDomainMode, subDomainMulti, subDomainSingle]);

  const selectedJobTitlesLabel = useMemo(() => {
    if (!jobTitles.length) return "No job titles selected";
    return jobTitles.join(" • ");
  }, [jobTitles]);

  const appliedJobTitleLabel = useMemo(() => {
    if (latestApplication?.jobTitle) {
      return latestApplication.companyName
        ? `${latestApplication.jobTitle} at ${latestApplication.companyName}`
        : latestApplication.jobTitle;
    }

    return selectedJobTitlesLabel;
  }, [latestApplication, selectedJobTitlesLabel]);

  const heroSubtitle = useMemo(() => {
    if (latestApplication?.jobTitle) {
      return `Applied for ${latestApplication.jobTitle}${latestApplication.companyName ? ` at ${latestApplication.companyName}` : ""}.`;
    }

    return "Tailor resumes, manage versions, and prepare for interviews with AI-assisted backend workflows.";
  }, [latestApplication]);

  const loadPendingInterviewSession = useCallback(async (token: string) => {
    setPendingLoading(true);
    setPendingInterview(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/user/interview/session`, {
        method: "GET",
        headers,
        credentials: "include",
        cache: "no-store",
      });

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
          ["PENDING", "IN_PROGRESS"].includes(resolveInterviewStatus(session))
      );

      if (pending) {
        const href = buildContinueInterviewHref(pending);
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
      // ignore pending interview lookup failures
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadLatestJobApplication = useCallback(async (token: string) => {
    setLoadingJobApplication(true);
    setLatestApplication(null);

    try {
      const response = await fetch(
        `${API_ROUTES.jobApplications}?size=1&sortBy=appliedAt&sortDir=desc`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
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

      const applications = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.content)
        ? payload.content
        : [];

      const latest = applications[0] ?? null;
      if (latest && (latest.jobTitle || latest.companyName || latest.status)) {
        setLatestApplication({
          jobApplicationId: latest.jobApplicationId ?? latest.id,
          jobTitle: normalizeString(latest.jobTitle),
          companyName: normalizeString(latest.companyName),
          status: normalizeString(latest.status),
          appliedAt: normalizeString(latest.appliedAt),
        });
      }
    } catch {
      // ignore application lookup failures
    } finally {
      setLoadingJobApplication(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setAuthError("");

      const token = getStoredToken();
      const role = getStoredRole();

      if (!token || role !== "USER") {
        router.replace("/auth/login");
        return;
      }

      const [authRes, userRes, onboardingRes, resumeRes, dashboardRes] = await Promise.allSettled([
        fetch(API_ROUTES.authMe, {
          method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
          credentials: "include",
          cache: "no-store",
        }),
        fetch(API_ROUTES.userMe, {
          method: "GET",
          headers: {
            ...getAuthHeaders(),
          },
          credentials: "include",
          cache: "no-store",
        }),
        fetch(API_ROUTES.onboardingStatus, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          credentials: "include",
          cache: "no-store",
        }),
        fetch(API_ROUTES.currentResume, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          credentials: "include",
          cache: "no-store",
        }),
        fetch(API_ROUTES.dashboard, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      let resolvedName = "";
      let mustGoLogin = false;

      if (authRes.status === "fulfilled") {
        if (authRes.value.status === 401 || authRes.value.status === 403) {
          mustGoLogin = true;
        } else if (authRes.value.ok) {
          const json = await authRes.value.json().catch(() => null);
          const user = normalizeAuthUser(unwrapResponse<any>(json));
          resolvedName =
            normalizeString(user?.firstName) ||
            normalizeString(user?.name) ||
            normalizeString(user?.username);
        }
      }

      if (!resolvedName && userRes.status === "fulfilled") {
        if (userRes.value.status === 401 || userRes.value.status === 403) {
          mustGoLogin = true;
        } else if (userRes.value.ok) {
          const json = await userRes.value.json().catch(() => null);
          const user = normalizeAuthUser(unwrapResponse<any>(json));
          resolvedName =
            normalizeString(user?.firstName) ||
            normalizeString(user?.name) ||
            normalizeString(user?.username);
        }
      }

      if (mustGoLogin) {
        router.replace("/auth/login");
        return;
      }

      await loadPendingInterviewSession(token);
      await loadLatestJobApplication(token);

      if (resolvedName) {
        setFirstName(resolvedName);
        if (typeof window !== "undefined") {
          localStorage.setItem("userName", resolvedName);
        }
      } else if (typeof window !== "undefined") {
        setFirstName(localStorage.getItem("userName") || "");
      }

      if (onboardingRes.status === "fulfilled") {
        if (onboardingRes.value.status === 401 || onboardingRes.value.status === 403) {
          router.replace("/auth/login");
          return;
        }

        if (onboardingRes.value.ok) {
          const json = await onboardingRes.value.json().catch(() => null);
          const status = normalizeOnboardingStatusData(unwrapResponse<any>(json));

          if (status) {
            setOnboarding(status);

            if (typeof window !== "undefined") {
              localStorage.setItem(
                "userOnboardingDone",
                String(Boolean(status.done))
              );
              localStorage.setItem(
                "onboardingDone",
                String(Boolean(status.done))
              );

              if (status.domain) {
                localStorage.setItem("userDomain", status.domain);
              }
              if (status.subDomainMode) {
                localStorage.setItem("userSubDomainMode", status.subDomainMode);
              }
              localStorage.setItem(
                "userSubDomainSingle",
                status.subDomainSingle || ""
              );
              localStorage.setItem(
                "userSubDomainMulti",
                JSON.stringify(status.subDomainMulti || [])
              );
              localStorage.setItem(
                "userJobTitles",
                JSON.stringify(status.jobTitles || [])
              );
            }

            if (!status.done) {
              router.replace("/user/setup");
              return;
            }
          }
        }
      }

      if (resumeRes.status === "fulfilled") {
        if (resumeRes.value.ok) {
          const json = await resumeRes.value.json().catch(() => null);
          const currentResume = normalizeResumeData(unwrapResponse<any>(json));
          setResume(currentResume);

          if (typeof window !== "undefined") {
            if (currentResume?.fileName) {
              localStorage.setItem("userResumeName", currentResume.fileName);
            }
            if (currentResume?.resumeId != null) {
              localStorage.setItem("activeResumeId", String(currentResume.resumeId));
            }
            if (
              currentResume?.resumeVersionId != null ||
              currentResume?.versionId != null
            ) {
              localStorage.setItem(
                "activeResumeVersionId",
                String(currentResume.resumeVersionId ?? currentResume.versionId)
              );
            }
          }
        } else if (resumeRes.value.status !== 404) {
          setLoadingResume(false);
        }
      }

      if (dashboardRes.status === "fulfilled" && dashboardRes.value.ok) {
        const json = await dashboardRes.value.json().catch(() => null);
        const payload = unwrapResponse<any>(json);
        setDashboardAnalytics({
          resumeScore: normalizeNumber(payload?.resumeScore) ?? null,
          interviewResultScore: normalizeNumber(payload?.interviewResultScore) ?? null,
          mockInterviewResultScore: normalizeNumber(payload?.mockInterviewResultScore) ?? null,
          latestInterviewSessionId: payload?.latestInterviewSessionId ?? null,
          latestMockInterviewSessionId: payload?.latestMockInterviewSessionId ?? null,
          mockInterviewCount: normalizeNumber(payload?.mockInterviewCount) ?? null,
        });
      }
    } catch (err: any) {
      setAuthError(err?.message || "Failed to load dashboard.");
    } finally {
      setBooting(false);
      setRefreshing(false);
      setLoadingResume(false);
    }
  }, [router, loadLatestJobApplication, loadPendingInterviewSession]);

  useEffect(() => {
    setLoadingResume(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refreshDashboard = () => {
    setRefreshing(true);
    setLoadingResume(true);
    fetchDashboardData();
  };

  const changeTrack = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userOnboardingDone");
      localStorage.removeItem("onboardingDone");
    }
    router.push("/user/setup");
  };

  if (booting) {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white">
            <span className="font-bold">S</span>
          </div>
          <div className="mb-4 flex justify-center">
            <Loader2 className="animate-spin text-indigo-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Loading your dashboard…
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Preparing your backend-integrated user workspace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-indigo-50">
      <header className="w-full border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">
              S
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-slate-900">SaaShaa AI</p>
              <p className="text-xs text-slate-500">User Dashboard</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              onClick={refreshDashboard}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh
            </button>

            <div className="text-sm text-slate-700 sm:text-right">
              {authError ? (
                <span className="text-red-600">{authError}</span>
              ) : (
                <div className="space-y-0.5">
                  <div className="font-semibold">
                    Welcome to SaaShaa AI{firstName ? `, Dear ${firstName}` : ""}
                  </div>
                  <div className="wrap-break-word text-xs text-slate-500">
                    Track:{" "}
                    <span className="font-semibold text-slate-700">
                      {domain || "Not configured"}
                    </span>{" "}
                    •{" "}
                    <span className="font-semibold text-slate-700">
                      {trackLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-12 lg:px-8">
        <div className="rounded-3xl bg-linear-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-xl sm:p-10">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-5xl">
            {authError
              ? "Welcome to SaaShaa AI"
              : `Welcome to SaaShaa AI${firstName ? `, Dear ${firstName}` : ""}`}
          </h1>

          <p className="mt-4 max-w-2xl text-sm text-white/85 sm:text-base md:text-lg">
            {heroSubtitle}
          </p>

          <div className="mt-4 space-y-2 text-sm text-white/80">
            <div>
              Current Track: <span className="font-semibold">{domain || "Not configured"}</span> •{" "}
              <span className="font-semibold">{trackLabel}</span>
            </div>
            <div>
              Applied Role: <span className="font-semibold">{appliedJobTitleLabel}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm text-white/85 sm:grid-cols-2">
            <div className="rounded-3xl bg-white/10 p-4">
              <span className="font-semibold">Resume Tailoring</span> for your {latestApplication?.jobTitle ? `${latestApplication.jobTitle} application` : "selected job titles"} with ATS-smart suggestions and versioned resume management.
            </div>
            <div className="rounded-3xl bg-white/10 p-4">
              <span className="font-semibold">Mock Interview Prep</span> based on your {latestApplication?.jobTitle ? `${latestApplication.jobTitle} application` : "selected domain and job focus"}.
            </div>
            <div className="rounded-3xl bg-white/10 p-4">
              <span className="font-semibold">Profile Progress</span> for onboarding, skills, and interview readiness aligned to your applied role.
            </div>
            <div className="rounded-3xl bg-white/10 p-4">
              <span className="font-semibold">Fast Access</span> to resume, interview, and application workflows.
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
            <Link
              href="/user/resume"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 transition hover:bg-white/90"
            >
              Open Resume
            </Link>

            <Link
              href="/user/interview"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-transparent px-6 py-3 font-semibold transition hover:bg-white/10"
            >
              Start Interview
            </Link>

            <button
              onClick={changeTrack}
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-transparent px-6 py-3 font-semibold transition hover:bg-white/10"
              title="Change onboarding selections"
            >
              Change Track
            </button>
          </div>
        </div>
      </section>

      {pendingInterview && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">
                  Pending Interview
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Continue {pendingInterview.title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {pendingInterview.status === "IN_PROGRESS"
                    ? "Resume your in-progress session and keep your momentum going."
                    : "A pending interview session is waiting for your next step."}
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
        </section>
      )}

      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-600">
              Quick Access
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              Open user sections from your navigation.
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              These cards are generated from your user navbar so new pages appear automatically.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {USER_LINKS.filter((link) => link.path !== "/user").map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-300 hover:bg-indigo-50"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm transition group-hover:bg-indigo-700">
                  {link.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{link.name}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Open the {link.name.toLowerCase()} page from your current dashboard.
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-4 inline-flex rounded-2xl bg-purple-50 p-3 text-purple-600">
              <Wand2 size={24} />
            </div>
            <h2 className="mb-2 text-lg font-bold text-slate-900 sm:text-xl">
              Resume Tailoring
            </h2>
            <p className="mb-6 text-sm text-slate-600 sm:text-base">
              Tailor your current resume to job descriptions and create backend-managed tailored versions.
            </p>
            <Link
              href="/user/resume/tailor"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700 sm:w-auto"
            >
              Tailor Resume
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-4 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-600">
              <Sparkles size={24} />
            </div>
            <h2 className="mb-2 text-lg font-bold text-slate-900 sm:text-xl">
              Prepare for Interviews
            </h2>
            <p className="mb-6 text-sm text-slate-600 sm:text-base">
              Practice and manage AI-assisted interview sessions based on your selected domain and track.
            </p>
            <Link
              href="/user/interview"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
            >
              Start Interview
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {latestApplication?.jobTitle && (
          <div className="mb-6 rounded-2xl border bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="text-indigo-600" size={22} />
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                Latest Applied Role
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-1 text-xs text-slate-500">Job Title</p>
                <p className="text-sm font-semibold text-slate-900">
                  {latestApplication.jobTitle}
                </p>
              </div>

              {latestApplication.companyName && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">Company</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {latestApplication.companyName}
                  </p>
                </div>
              )}

              {latestApplication.status && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">Status</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {latestApplication.status}
                  </p>
                </div>
              )}

              {latestApplication.appliedAt && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="mb-1 text-xs text-slate-500">Applied On</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDateTime(latestApplication.appliedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-[2fr_1fr]">
          <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6 shadow-lg sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <FileText className="text-indigo-600" size={22} />
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Current Resume
                </h2>
              </div>

              {loadingResume ? (
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                <span>Loading resume details…</span>
              </div>
            ) : resume ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="mb-1 text-xs text-slate-500">Resume Name</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {resume.resumeName || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="mb-1 text-xs text-slate-500">File Name</p>
                    <p className="break-all text-sm font-semibold text-slate-900">
                      {resume.fileName || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="mb-1 text-xs text-slate-500">ATS Score</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {resume.atsScore ?? 0}%
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="mb-1 text-xs text-slate-500">Updated At</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatDateTime(resume.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/user/resume"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Eye size={18} />
                    Open Resume Page
                  </Link>

                  {resume.resumeId != null && (
                    <Link
                      href={`/user/resume/${resume.resumeId}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <FileText size={18} />
                      View Detail
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  No current resume found yet. Upload your resume to start the resume management flow.
                </p>
                <Link
                  href="/user/resume/upload"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
                >
                  <Upload size={18} />
                  Upload Resume
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Layers3 className="text-purple-600" size={22} />
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                Resume Workflows
              </h2>
            </div>

            <p className="mb-6 text-sm text-slate-600 sm:text-base">
              Manage resume uploads, current resume editing, duplicate creation, version creation, and tailoring using the latest backend-integrated project flow.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/user/resume"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FileText size={18} />
                Resume Dashboard
              </Link>

              <Link
                href="/user/resume/upload"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Upload size={18} />
                Upload Resume
              </Link>

              <Link
                href="/user/resume/create-duplicate"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Copy size={18} />
                Create Duplicate
              </Link>

              <Link
                href="/user/resume/tailor"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Wand2 size={18} />
                Tailor Resume
              </Link>
            </div>
          </div>
        </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <BarChart3 className="text-slate-900" size={22} />
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                AI Analytics Preview
              </h2>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Current Resume ATS</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {dashboardAnalytics?.resumeScore != null
                    ? `${Math.round(dashboardAnalytics.resumeScore)}%`
                    : resume?.atsScore != null
                    ? `${Math.round(resume.atsScore)}%`
                    : "N/A"}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-sm text-slate-500">Interview</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {dashboardAnalytics?.interviewResultScore != null
                      ? `${Math.round(dashboardAnalytics.interviewResultScore)}%`
                      : "N/A"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-sm text-slate-500">Mock Interview</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {dashboardAnalytics?.mockInterviewResultScore != null
                      ? `${Math.round(dashboardAnalytics.mockInterviewResultScore)}%`
                      : "N/A"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-sm text-slate-500">Mock Sessions</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {dashboardAnalytics?.mockInterviewCount != null
                      ? dashboardAnalytics.mockInterviewCount
                      : "N/A"}
                  </p>
                </div>
              </div>

              {(dashboardAnalytics?.latestInterviewSessionId || dashboardAnalytics?.latestMockInterviewSessionId) ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm text-slate-500">Latest Results</p>
                  <div className="space-y-3">
                    {dashboardAnalytics?.latestInterviewSessionId ? (
                      <Link
                        href={`/user/interview/result/${dashboardAnalytics.latestInterviewSessionId}`}
                        className="block rounded-2xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        View Interview Result
                      </Link>
                    ) : null}
                    {dashboardAnalytics?.latestMockInterviewSessionId ? (
                      <Link
                        href={`/user/interview/result/${dashboardAnalytics.latestMockInterviewSessionId}`}
                        className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                      >
                        View Mock Result
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-lg sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600" size={22} />
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              Your Profile Summary
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-1 text-xs text-slate-500">Domain</p>
              <p className="text-sm font-semibold text-slate-900">
                {domain || "Not configured"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-1 text-xs text-slate-500">Sub-domain Mode</p>
              <p className="text-sm font-semibold capitalize text-slate-900">
                {subDomainMode}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-1 text-xs text-slate-500">Track</p>
              <p className="text-sm font-semibold text-slate-900">{trackLabel}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-1 text-xs text-slate-500">Job Titles</p>
              <p className="text-sm font-semibold text-slate-900">
                {jobTitles.length}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}