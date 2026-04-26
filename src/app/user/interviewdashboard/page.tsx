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

interface DomainCategory {
  label: string;
  value: string;
}

interface DomainItem {
  title: string;
  subtitle: string;
  icon?: string;
  categories: DomainCategory[];
}

interface CreateInterviewSessionRequest {
  domain: string;
  category: string;
}

interface CreateInterviewSessionResponseData {
  sessionId?: string;
  token?: string;
  interviewToken?: string;
  domain?: string;
  category?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  me: `${API_BASE_URL}/api/auth/me`,
  dashboard: `${API_BASE_URL}/api/user/dashboard`,
  createInterviewSession: `${API_BASE_URL}/api/user/interview/session`,
};

const fallbackDomains: DomainItem[] = [
  {
    title: "Technical",
    subtitle: "Engineering & Development",
    icon: "💡",
    categories: [
      { label: "DSA", value: "dsa" },
      { label: "DBMS", value: "dbms" },
      { label: "Data Analytics", value: "data-analytics" },
      { label: "Data Scientist", value: "data-scientist" },
      { label: "Coding", value: "coding" },
    ],
  },
  {
    title: "HR",
    subtitle: "Behavioral & Culture Fit",
    icon: "🧠",
    categories: [
      { label: "IQ Test", value: "iq-test" },
      { label: "Document Verification", value: "document-verification" },
      { label: "Communication Skills", value: "communication-skills" },
      { label: "Confidence Building", value: "confidence-building" },
    ],
  },
  {
    title: "Marketing",
    subtitle: "Growth & Strategy",
    icon: "📈",
    categories: [
      { label: "Sales", value: "sales" },
      { label: "Marketing Manager", value: "marketing-manager" },
      { label: "Marketing Analyser", value: "marketing-analyser" },
      { label: "Marketing Specialist", value: "marketing-specialist" },
    ],
  },
];

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null | undefined): T | null {
  if (!json || typeof json !== "object") return null;
  const envelope = json as ApiEnvelope<T> & T;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const possibleKeys = [
    "token",
    "authToken",
    "jwtToken",
    "jwt",
    "accessToken",
    "userToken",
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  return null;
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  [
    "token",
    "authToken",
    "jwtToken",
    "jwt",
    "accessToken",
    "userToken",
    "userRole",
    "role",
    "userEmail",
    "userName",
    "authId",
    "userOnboardingDone",
    "onboardingDone",
  ].forEach((key) => localStorage.removeItem(key));
}

function normalizeRole(value?: NullableString): string {
  return (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
}

function isUserRole(role?: string, roles?: string[]) {
  const normalizedRole = normalizeRole(role);
  const normalizedRoles = Array.isArray(roles)
    ? roles.map((item) => normalizeRole(item))
    : [];

  return normalizedRole === "USER" || normalizedRoles.includes("USER");
}

function normalizeString(value: NullableString, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeDomainCategory(raw: any): DomainCategory {
  return {
    label: normalizeString(raw?.label ?? raw?.name ?? raw?.title, "Category"),
    value: normalizeString(
      raw?.value ??
        raw?.code ??
        raw?.label ??
        raw?.name ??
        raw?.title,
      "category"
    )
      .toLowerCase()
      .replace(/\s+/g, "-"),
  };
}

function normalizeDomainItem(raw: any): DomainItem {
  const rawCategories = Array.isArray(raw?.categories)
    ? raw.categories
    : Array.isArray(raw?.subdomains)
    ? raw.subdomains
    : Array.isArray(raw?.options)
    ? raw.options
    : [];

  return {
    title: normalizeString(raw?.title ?? raw?.domain ?? raw?.name, "Domain"),
    subtitle: normalizeString(
      raw?.subtitle ?? raw?.description,
      "Practice interview questions"
    ),
    icon: normalizeString(raw?.icon, "✨"),
    categories: rawCategories.map(normalizeDomainCategory),
  };
}

function safeRandomToken() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}`;
}

export default function InterviewDashboard() {
  const router = useRouter();

  const token = useMemo(() => getAuthToken(), []);

  const [authChecking, setAuthChecking] = useState(true);
  const [loadingDomains, setLoadingDomains] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);

  const [userName, setUserName] = useState("User");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [hasAppliedJob, setHasAppliedJob] = useState(false);
  const [mockModalStage, setMockModalStage] = useState<
    "closed" | "select-domain" | "document-verification"
  >("closed");

  const validateUserAccess = useCallback(async (): Promise<boolean> => {
    if (!token) {
      clearStoredAuth();
      router.replace("/auth/login");
      return false;
    }

    try {
      const response = await fetch(API_ROUTES.me, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
      });

      const json: ApiEnvelope<AuthUser> | AuthUser | null = await response
        .json()
        .catch(() => null);

      const meData = unwrapResponse<AuthUser>(json);

      if (!response.ok || !meData) {
        throw new Error("Unable to validate session.");
      }

      const authenticated = Boolean(
        meData.authenticated ?? meData.valid ?? response.ok
      );

      if (!authenticated) {
        throw new Error("Session is not valid.");
      }

      if (!isUserRole(meData.userRole ?? meData.role, meData.roles)) {
        router.replace("/admin");
        return false;
      }

      const backendName =
        normalizeString(meData.fullName) ||
        normalizeString(meData.name) ||
        normalizeString(meData.firstName) ||
        localStorage.getItem("userName") ||
        "User";

      setUserName(backendName);
      localStorage.setItem("userName", backendName);

      return true;
    } catch {
      clearStoredAuth();
      router.replace("/auth/login");
      return false;
    } finally {
      setAuthChecking(false);
    }
  }, [router, token]);

  const loadDashboard = useCallback(async () => {
    setLoadingDomains(true);
    setError(null);
    setInfoMessage(null);

    try {
      const response = await fetch(API_ROUTES.dashboard, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Dashboard fetch failed with status ${response.status}`);
      }

      const json: ApiEnvelope<any> | any = await response.json().catch(() => null);
      const data = unwrapResponse<any>(json) || {};

      const backendName =
        normalizeString(data?.userName) ||
        normalizeString(data?.fullName) ||
        normalizeString(data?.name) ||
        normalizeString(data?.firstName) ||
        localStorage.getItem("userName") ||
        "User";

      setUserName(backendName);
      localStorage.setItem("userName", backendName);
      setInfoMessage(
        "Your interview dashboard is ready. Start a job profile or mock interview."
      );
    } catch {
      setInfoMessage(
        "Your interview dashboard is ready. Start a job profile or mock interview."
      );
      setError("Unable to load dashboard metadata from backend.");
    } finally {
      setLoadingDomains(false);
    }
  }, [token]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasAppliedJob(localStorage.getItem("hasAppliedJob") === "true");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const allowed = await validateUserAccess();
      if (!allowed || cancelled) return;
      await loadDashboard();
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [loadDashboard, validateUserAccess]);

  const startInterview = useCallback(async (type: "job" | "mock") => {
    try {
      setCreatingSession(true);
      setError(null);

      const interviewMode = type === "job" ? "REAL" : "MOCK";
      const interviewName =
        type === "job" ? "Job Profile Interview" : "Mock Interview";
      const interviewType = type === "job" ? "MIXED" : "MIXED";
      const payload = {
        interviewType,
        interviewMode,
        domain: interviewName,
        category: type === "job" ? "Job Profile" : "Mock Interview",
        role: interviewName,
      };

      const response = await fetch(API_ROUTES.createInterviewSession, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Create session failed with status ${response.status}`);
      }

      const resultJson: ApiEnvelope<CreateInterviewSessionResponseData> | any =
        await response.json().catch(() => null);

      const sessionData =
        unwrapResponse<CreateInterviewSessionResponseData>(resultJson) || {};

      const interviewToken =
        sessionData?.token ||
        sessionData?.interviewToken ||
        safeRandomToken();
      const sessionId = sessionData?.sessionId || "";

      const domainValue = normalizeString(sessionData?.domain || interviewName)
        .toLowerCase()
        .replace(/\s+/g, "-");
      const categoryValue = normalizeString(
        sessionData?.category || (type === "job" ? "Job Profile" : "Mock Interview")
      )
        .toLowerCase()
        .replace(/\s+/g, "-");

      const searchParams = new URLSearchParams({
        domain: domainValue,
        category: categoryValue,
        token: interviewToken,
      });

      if (sessionId) {
        searchParams.set("sessionId", sessionId);
      }

      router.push(`/user/interview?${searchParams.toString()}`);
    } catch {
      setError("Unable to start interview session from backend.");
    } finally {
      setCreatingSession(false);
    }
  }, [router, token]);

  const openMockInterviewModal = useCallback(() => {
    setMockModalStage("select-domain");
  }, []);

  const closeMockInterviewModal = useCallback(() => {
    setMockModalStage("closed");
  }, []);

  const selectDocumentVerification = useCallback(() => {
    setMockModalStage("document-verification");
  }, []);

  const confirmDocumentVerification = useCallback(async () => {
    closeMockInterviewModal();
    await startInterview("mock");
  }, [closeMockInterviewModal, startInterview]);

  useEffect(() => {
    if (mockModalStage === "closed") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMockInterviewModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeMockInterviewModal, mockModalStage]);

  if (authChecking || loadingDomains) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4 dark:bg-slate-950 dark:text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/50 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-slate-900/95 backdrop-blur-xl">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-indigo-400" />
          <h1 className="text-2xl font-bold">
            {authChecking ? "Verifying Access" : "Loading Interview Dashboard"}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {authChecking
              ? "Please wait while your user session is validated with the backend."
              : "Loading interview dashboard."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4 dark:bg-slate-950 dark:text-white">
      <div className="w-full max-w-5xl">
        <div className="bg-white border border-slate-200/60 rounded-3xl p-10 md:p-16 shadow-2xl dark:bg-slate-900/95 dark:border-white/10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
            <ShieldCheck className="h-4 w-4" />
            Interview Practice
          </div>

          <h1 className="text-4xl font-bold mb-4">
            AI Interview Practice Dashboard
          </h1>

          <p className="text-slate-600 dark:text-slate-300 mb-3">
            Welcome, {userName}. Start a job profile or mock interview session.
          </p>

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-10">
            Sessions are created through the backend and routed into the live
            interview flow.
          </p>

          {error ? (
            <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-100 text-sm flex items-start gap-3 text-left">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {infoMessage ? (
            <div className="mx-auto mb-6 max-w-2xl rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-amber-100 text-sm text-left">
              {infoMessage}
            </div>
          ) : null}

          <div
            className={`grid gap-6 mt-10 ${
              hasAppliedJob ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            }`}
          >
            {hasAppliedJob ? (
              <button
                type="button"
                onClick={() => startInterview("job")}
                className="group rounded-3xl border border-slate-200/60 bg-white shadow-sm px-8 py-10 text-left transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                  <Briefcase size={24} />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Job Profile Interview</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Start an interview designed around a job profile and use case.
                </p>
              </button>
            ) : null}

            <button
              type="button"
              onClick={openMockInterviewModal}
              className="group rounded-3xl border border-slate-200/60 bg-white shadow-sm px-8 py-10 text-left transition hover:border-purple-300 hover:bg-purple-50 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-purple-600 text-white shadow-lg shadow-purple-500/20">
                <Brain size={24} />
              </div>
              <h3 className="text-2xl font-semibold mb-3 text-slate-900 dark:text-white">Mock Interview</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Practice interview questions and get a realistic training session.
              </p>
            </button>
          </div>

          {!hasAppliedJob ? (
            <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-100 text-sm">
              Apply for a job in the Jobs section to unlock Job Profile Interview sessions.
            </div>
          ) : null}

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="inline-flex items-center gap-2 rounded-3xl border border-slate-300/60 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Profile
            </button>
          </div>

          {mockModalStage !== "closed" ? (
            <div
              className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4"
              onClick={closeMockInterviewModal}
            >
              <div
                className="w-full max-w-xl rounded-3xl border border-white/10 bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-white"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {mockModalStage === "select-domain"
                        ? "Non-Tech Domain"
                        : "Document Verification"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {mockModalStage === "select-domain"
                        ? "Select the non-technical interview path. Document Verification is available now."
                        : "Complete document verification and then start your Mock Interview session."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeMockInterviewModal}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-white"
                    aria-label="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="mt-6 grid gap-4">
                  {mockModalStage === "select-domain" ? (
                    <button
                      type="button"
                      onClick={selectDocumentVerification}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 text-left text-slate-900 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-indigo-600 text-white">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <p className="text-lg font-semibold">Non-Tech Domain</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Choose the non-technical practice path and continue to document verification.
                          </p>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={confirmDocumentVerification}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 text-left text-slate-900 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-indigo-600 text-white">
                          <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <p className="text-lg font-semibold">Document Verification</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Verify your documents and start your mock interview session automatically.
                          </p>
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
