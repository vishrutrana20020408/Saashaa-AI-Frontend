"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Play,
  Clock3,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { X } from "lucide-react";
/**
 * src/app/user/dashboard/page.tsx
 *
 * Backend integrated User Dashboard
 *
 * Expected backend endpoints:
 * GET  /api/auth/me
 * GET  /api/user/dashboard
 * POST /api/user/interview/session
 *
 * This version is resilient to small backend response-shape differences
 * and aligned with the latest frontend/backend project update.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  me: `${API_BASE_URL}/api/auth/me`,
  dashboard: `${API_BASE_URL}/api/user/dashboard`,
  peerRanks: `${API_BASE_URL}/api/user/dashboard/ranks`,
  userResume: `${API_BASE_URL}/api/user/dashboard/user-resume`,
  createInterviewSession: `${API_BASE_URL}/api/user/interview/session`,
};

type NullableString = string | null | undefined;

interface AuthUser {
  id?: number | string;
  userId?: string;
  authUserId?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  userRole?: string;
  roles?: string[];
  authenticated?: boolean;
  valid?: boolean;
}

interface ContinueSession {
  sessionId: string;
  domain: string;
  category: string;
  unansweredQuestions: number;
  interviewToken?: string;
}

interface PastActivity {
  id: number;
  domain: string;
  category?: string;
  score: number;
  date: string;
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

interface DashboardData {
  userName?: string;
  userId?: string;
  continueSession?: ContinueSession | null;
  pastActivities?: PastActivity[];
  domains?: DomainItem[];
  resumeScore?: number | null;
  interviewResultScore?: number | null;
  mockInterviewResultScore?: number | null;
  latestInterviewSessionId?: number | string;
  latestMockInterviewSessionId?: number | string;
  interviewConfidence?: number | null;
  interviewAccuracy?: number | null;
  interviewSkills?: number | null;
  interviewTools?: number | null;
  interviewTypingSpeed?: number | null;
  interviewReadingSpeed?: number | null;
  mockConfidence?: number | null;
  mockAccuracy?: number | null;
  mockSkills?: number | null;
  mockTools?: number | null;
  mockTypingSpeed?: number | null;
  mockReadingSpeed?: number | null;
  mockInterviewCount?: number | null;
}

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  payload?: T;
  result?: T;
}

type RawInput = unknown;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

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

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDashboardNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUserId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;

  const possibleKeys = ["userId", "authUserId", "id"];
  for (const key of possibleKeys) {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
  }

  return null;
}

function normalizeDomainCategory(raw: RawInput): DomainCategory {
  const data = asRecord(raw);

  return {
    label: normalizeString(
      data.label ?? data.name ?? data.title,
      "Category"
    ),
    value: normalizeString(
      data.value ?? data.code ?? data.label ?? data.name ?? data.title,
      "category"
    )
      .toLowerCase()
      .replace(/\s+/g, "-"),
  };
}

function normalizeDomainItem(raw: RawInput): DomainItem {
  const data = asRecord(raw);
  const rawCategories = Array.isArray(data.categories)
    ? data.categories
    : Array.isArray(data.subdomains)
    ? data.subdomains
    : Array.isArray(data.options)
    ? data.options
    : [];

  return {
    title: normalizeString(data.title ?? data.domain ?? data.name, "Domain"),
    subtitle: normalizeString(
      data.subtitle ?? data.description,
      "Practice interview questions"
    ),
    icon: normalizeString(data.icon, "✨"),
    categories: rawCategories.map(normalizeDomainCategory),
  };
}

function normalizePastActivity(raw: RawInput, index: number): PastActivity {
  const data = asRecord(raw);

  return {
    id: normalizeNumber(data.id ?? data.activityId ?? index + 1, index + 1),
    domain: normalizeString(data.domain ?? data.title, "General"),
    category: normalizeString(data.category),
    score: normalizeNumber(
      data.score ?? data.finalScore ?? data.percentage,
      0
    ),
    date: normalizeString(
      data.date ?? data.createdAt ?? data.updatedAt,
      "N/A"
    ),
  };
}

function normalizeContinueSession(raw: RawInput): ContinueSession | null {
  if (!raw) return null;

  const data = asRecord(raw);
  const sessionId = normalizeString(data.sessionId ?? data.id);
  if (!sessionId) return null;

  return {
    sessionId,
    domain: normalizeString(data.domain, "General"),
    category: normalizeString(data.category, "General"),
    unansweredQuestions: normalizeNumber(
      data.unansweredQuestions ?? data.remainingQuestions,
      0
    ),
    interviewToken: normalizeString(data.interviewToken ?? data.token),
  };
}

function isInterviewContinueSession(session: ContinueSession | null): boolean {
  if (!session) return false;

  const normalizedCategory = normalizeString(session.category)
    .trim()
    .toLowerCase();
  const normalizedDomain = normalizeString(session.domain)
    .trim()
    .toLowerCase();

  return [
    "job profile interview",
    "job profile",
    "mock interview",
  ].includes(normalizedCategory) ||
    ["job profile interview", "mock interview"].includes(normalizedDomain);
}

function normalizeDashboardData(raw: RawInput): DashboardData {
  const data = asRecord(raw);
  const rawActivities = Array.isArray(data.pastActivities)
    ? data.pastActivities
    : Array.isArray(data.activities)
    ? data.activities
    : Array.isArray(data.history)
    ? data.history
    : [];

  const rawDomains = Array.isArray(data.domains)
    ? data.domains
    : Array.isArray(data.domainOptions)
    ? data.domainOptions
    : [];

  return {
    userName: normalizeString(data.userName ?? data.name ?? data.fullName),
    userId:
      normalizeUserId(
        data.userId ?? data.id ?? data.authUserId ?? data.userIdString
      ) || undefined,
    interviewResultScore: normalizeDashboardNumber(
      data.interviewResultScore ?? data.interviewScore ?? data.latestInterviewScore ?? data.evaluationScore
    ),
    mockInterviewResultScore: normalizeDashboardNumber(
      data.mockInterviewResultScore ?? data.mockInterviewScore ?? data.latestMockInterviewScore ?? data.mockScore
    ),
    latestInterviewSessionId: normalizeUserId(
      data.latestInterviewSessionId ?? data.interviewSessionId ?? data.lastInterviewSessionId
    ) || undefined,
    latestMockInterviewSessionId: normalizeUserId(
      data.latestMockInterviewSessionId ?? data.mockInterviewSessionId ?? data.lastMockSessionId
    ) || undefined,
    continueSession: normalizeContinueSession(data.continueSession),
    pastActivities: rawActivities.map(normalizePastActivity),
    domains:
      rawDomains.length > 0
        ? rawDomains
            .map(normalizeDomainItem)
            .filter((item: DomainItem) => item.categories.length > 0)
        : fallbackDomains,
    resumeScore: normalizeDashboardNumber(
      data.resumeScore ?? data.atsScore ?? data.resumeRating
    ),
    interviewConfidence: normalizeDashboardNumber(
      data.interviewConfidence ?? data.confidenceScore
    ),
    interviewAccuracy: normalizeDashboardNumber(
      data.interviewAccuracy ?? data.correctAnswerPercentage ?? data.accuracy
    ),
    interviewSkills: normalizeDashboardNumber(
      data.interviewSkills ?? data.skillsScore
    ),
    interviewTools: normalizeDashboardNumber(
      data.interviewTools ?? data.professionalToolsScore
    ),
    interviewTypingSpeed: normalizeDashboardNumber(
      data.interviewTypingSpeed ?? data.typingSpeed
    ),
    interviewReadingSpeed: normalizeDashboardNumber(
      data.interviewReadingSpeed ?? data.readingSpeed
    ),
    mockConfidence: normalizeDashboardNumber(
      data.mockConfidence ?? data.mockInterviewConfidence
    ),
    mockAccuracy: normalizeDashboardNumber(
      data.mockAccuracy ?? data.mockInterviewAccuracy
    ),
    mockSkills: normalizeDashboardNumber(
      data.mockSkills ?? data.mockInterviewSkills
    ),
    mockTools: normalizeDashboardNumber(
      data.mockTools ?? data.mockInterviewTools
    ),
    mockTypingSpeed: normalizeDashboardNumber(
      data.mockTypingSpeed ?? data.mockTypingSpeedValue
    ),
    mockReadingSpeed: normalizeDashboardNumber(
      data.mockReadingSpeed ?? data.mockInterviewReadingSpeed
    ),
    mockInterviewCount: normalizeDashboardNumber(
      data.mockInterviewCount ?? data.mockCount ?? data.mockSessions
    ),
  };
}

interface PeerRank {
  userId: string;
  name: string;
  currentRole?: string;
  currentCompany?: string;
  resumeScore?: number | null;
  experienceYears?: number | null;
  rankScore?: number | null;
  rankLabel?: string;
  position?: number;
}

interface UserResumeSummary {
  userId: string;
  name: string;
  currentCompany?: string;
  currentRole?: string;
  headline?: string;
  profileSummary?: string;
  experienceSummaryJson?: string;
  topSkillsJson?: string;
  resumeTitle?: string;
  resumeUrl?: string;
  resumeFileName?: string;
}

function parseJsonString(value: unknown): unknown {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function summarizeJsonField(value: unknown): string[] {
  const parsed = parseJsonString(value);

  if (Array.isArray(parsed)) {
    return parsed
      .map((item) =>
        typeof item === "string" ? item.trim() : JSON.stringify(item)
      )
      .filter(Boolean);
  }

  if (typeof parsed === "object" && parsed !== null) {
    return Object.values(parsed)
      .map((item) =>
        typeof item === "string" ? item.trim() : JSON.stringify(item)
      )
      .filter(Boolean);
  }

  if (typeof parsed === "string" && parsed.trim()) {
    return [parsed.trim()];
  }

  return [];
}

function formatRankScore(score: number | null | undefined): string {
  if (typeof score !== "number" || Number.isNaN(score)) return "-";
  return `${Math.round(score)}`;
}

export default function DashboardPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("User");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [peerRanks, setPeerRanks] = useState<PeerRank[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedResume, setSelectedResume] = useState<UserResumeSummary | null>(null);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [ranksLoading, setRanksLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  const [authChecking, setAuthChecking] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => getStoredUserId());

  const token = useMemo(() => getAuthToken(), []);

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

      const authId =
        normalizeUserId(meData.userId ?? meData.id ?? meData.authUserId) ||
        localStorage.getItem("userId");

      if (authId) {
        setCurrentUserId(authId);
        localStorage.setItem("userId", authId);
      }

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

  const fetchDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        setError(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setPageLoading(true);
        }

        const commonHeaders: HeadersInit = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const dashboardResponse = await fetch(API_ROUTES.dashboard, {
          method: "GET",
          headers: commonHeaders,
          credentials: "include",
          cache: "no-store",
        });

        if (!dashboardResponse.ok) {
          throw new Error(
            `Dashboard fetch failed with status ${dashboardResponse.status}`
          );
        }

        const dashboardJson: unknown = await dashboardResponse.json();

        const normalized = normalizeDashboardData(
          unwrapResponse<DashboardData>(
            dashboardJson as ApiEnvelope<DashboardData> | DashboardData
          ) || {}
        );

        setDashboardData(normalized);

        if (normalized.userName) {
          setUserName(normalized.userName);
          localStorage.setItem("userName", normalized.userName);
        }
      } catch {
        const storedName = localStorage.getItem("userName");
        if (storedName) {
          setUserName(storedName);
        }

        setDashboardData({
          userName: storedName || "User",
          continueSession: null,
          pastActivities: [],
          domains: fallbackDomains,
        });

        setError("Unable to load dashboard data from backend.");
      } finally {
        setPageLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  const normalizePeerRank = (raw: RawInput): PeerRank => {
    const data = asRecord(raw);

    return {
      userId: normalizeUserId(data.userId ?? data.id ?? data.authUserId) ?? "",
      name: normalizeString(data.name ?? data.fullName ?? data.userName ?? data.username, "Unknown"),
      currentRole: normalizeString(data.currentRole ?? data.role),
      currentCompany: normalizeString(data.currentCompany ?? data.company),
      resumeScore: normalizeDashboardNumber(data.resumeScore ?? data.score),
      experienceYears: normalizeDashboardNumber(data.experienceYears ?? data.yearsOfExperience),
      rankScore: normalizeDashboardNumber(data.rankScore ?? data.score),
      rankLabel: normalizeString(data.rankLabel ?? data.rank ?? data.category, "Unranked"),
      position: normalizeNumber(data.position ?? data.rankPosition ?? data.positionIndex),
    };
  };

  const fetchPeerRanks = useCallback(async () => {
    try {
      setError(null);
      setRanksLoading(true);

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(API_ROUTES.peerRanks, {
        method: "GET",
        headers,
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Peer ranks fetch failed with status ${response.status}`);
      }

      const json: unknown = await response.json();
      const raw = unwrapResponse<unknown>(json) ?? [];
      const ranks = Array.isArray(raw) ? raw.map(normalizePeerRank) : [];

      setPeerRanks(ranks);

      if (currentUserId && !selectedUserId && ranks.length > 0) {
        const self = ranks.find((rank) => rank.userId === currentUserId);
        const target = self ?? ranks[0];
        setSelectedUserId(target.userId);
      }
    } catch {
      setError("Unable to load peer rankings.");
    } finally {
      setRanksLoading(false);
    }
  }, [currentUserId, selectedUserId, token]);

  const fetchResumeSummary = useCallback(
    async (userId: string) => {
      try {
        setError(null);
        setResumeLoading(true);

        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const response = await fetch(
          `${API_ROUTES.userResume}/${encodeURIComponent(userId)}`,
          {
            method: "GET",
            headers,
            credentials: "include",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(`Resume summary fetch failed with status ${response.status}`);
        }

        const json: unknown = await response.json();
        const data = unwrapResponse<Record<string, unknown>>(
          json as ApiEnvelope<Record<string, unknown>> | Record<string, unknown>
        ) ?? {};

        setSelectedResume({
          userId: normalizeUserId(data.userId) ?? userId,
          name: normalizeString(data.name ?? data.fullName ?? data.userName, "Unknown"),
          currentCompany: normalizeString(data.currentCompany),
          currentRole: normalizeString(data.currentRole),
          headline: normalizeString(data.headline),
          profileSummary: normalizeString(data.profileSummary),
          experienceSummaryJson: normalizeString(data.experienceSummaryJson),
          topSkillsJson: normalizeString(data.topSkillsJson),
          resumeTitle: normalizeString(data.resumeTitle),
          resumeUrl: normalizeString(data.resumeUrl),
          resumeFileName: normalizeString(data.resumeFileName),
        });
      } catch {
        setError("Unable to load resume summary.");
      } finally {
        setResumeLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (selectedUserId && selectedResume?.userId !== selectedUserId) {
      fetchResumeSummary(selectedUserId);
    }
  }, [fetchResumeSummary, selectedResume?.userId, selectedUserId]);

  useEffect(() => {
    if (currentUserId && peerRanks.length > 0 && !selectedUserId) {
      const self = peerRanks.find((rank) => rank.userId === currentUserId);
      const target = self ?? peerRanks[0];
      if (target) {
        setSelectedUserId(target.userId);
      }
    }
  }, [currentUserId, peerRanks, selectedUserId]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const allowed = await validateUserAccess();
      if (!allowed || cancelled) return;
      await fetchDashboard(false);
      await fetchPeerRanks();
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [fetchDashboard, fetchPeerRanks, validateUserAccess]);

  const continueSession = dashboardData?.continueSession || null;
  const showContinuePanel = isInterviewContinueSession(continueSession);

  const resumeLastSession = () => {
    if (!continueSession) return;

    const domainValue = continueSession.domain.toLowerCase().replace(/\s+/g, "-");
    const categoryValue = continueSession.category.toLowerCase().replace(/\s+/g, "-");
    const interviewToken =
      continueSession.interviewToken ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}`);

    const searchParams = new URLSearchParams({
      domain: domainValue,
      category: categoryValue,
      token: interviewToken,
      sessionId: continueSession.sessionId,
    });

    router.push(`/user/interview?${searchParams.toString()}`);
  };

  if (authChecking || pageLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#0f172a] text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-linear-to-br from-indigo-900 via-purple-900 to-slate-900" />
        </div>

        <div className="px-6 py-24 md:px-16">
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
            <Loader2 className="animate-spin" size={32} />
            <h2 className="text-2xl font-bold">
              {authChecking ? "Verifying User Access" : "Loading Dashboard"}
            </h2>
            <p className="text-white/60">
              {authChecking
                ? "Please wait while your session is validated with the backend."
                : "Fetching your interview data from the backend."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f172a] text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-900 via-purple-900 to-slate-900" />
        <div className="absolute -left-25 -top-25 h-96 w-96 animate-pulse rounded-full bg-purple-600 opacity-20 blur-3xl" />
        <div className="absolute -bottom-30 -right-25 h-112 w-md animate-pulse rounded-full bg-blue-600 opacity-20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[50px_50px]" />
      </div>

      <div className="flex justify-end px-6 pt-8 md:px-16">
        <button
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 transition hover:bg-white/15 disabled:opacity-60"
        >
          {refreshing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <RefreshCw size={18} />
          )}
          Refresh
        </button>
      </div>

      {error ? (
        <div className="px-6 pt-4 md:px-16">
          <div className="flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-100">
            <AlertCircle className="mt-0.5" size={18} />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      <section className="flex flex-col items-center justify-between gap-16 px-6 py-16 md:flex-row md:px-16 md:py-24">
        <div className="max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
            <ShieldCheck className="h-4 w-4" />
            User Dashboard
          </div>

          <h2 className="text-4xl font-bold leading-tight md:text-5xl text-(--foreground)">
            Ready for the Interview{" "}
            <span className="bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {userName}
            </span>
          </h2>

          <p className="text-lg text-(--muted)">
            Practice smarter with backend-powered sessions, real interview
            categories, and activity tracking.
          </p>

          <button
            onClick={() => router.push("/user/interviewdashboard")}
            className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-8 py-3 font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30"
          >
            <Play size={18} />
            Start Interview
          </button>
        </div>

      </section>

      {showContinuePanel ? (
        <section className="px-6 pb-20 md:px-16">
          <h3 className="mb-8 text-2xl font-semibold text-(--foreground)">Continue Where You Left</h3>

          <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-(--border) bg-(--card) p-8 backdrop-blur-xl transition-all duration-500 hover:shadow-xl md:flex-row">
            <>
              <div>
                <p className="text-sm text-(--muted)">Last Session</p>
                <h4 className="mt-1 text-xl font-semibold text-(--foreground)">
                  {continueSession?.domain} - {continueSession?.category}
                </h4>
                <p className="mt-1 text-sm text-(--muted)">
                  {continueSession?.unansweredQuestions} unanswered questions remaining
                </p>
              </div>

              <button
                onClick={resumeLastSession}
                className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-3 font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30"
              >
                <Clock3 size={18} />
                Resume
              </button>
            </>
          </div>
        </section>
      ) : null}

      <section className="px-6 pb-24 md:px-16">
        <div className="space-y-8">
          <div className="rounded-3xl border border-(--border) bg-(--card) p-6 shadow-xl backdrop-blur-xl w-full">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-(--muted)">Peer Ranking Board</p>
                <h3 className="text-2xl font-semibold text-(--foreground)">Career rank & community leaderboard</h3>
              </div>
              <button
                onClick={fetchPeerRanks}
                disabled={ranksLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-(--border) bg-(--background) px-4 py-2 text-sm text-(--foreground) transition hover:bg-(--accent) disabled:opacity-60"
              >
                {ranksLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh ranks
              </button>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-(--border) bg-(--background)/50 p-1 max-h-165 overflow-y-auto">
              {ranksLoading ? (
                <div className="flex min-h-55 items-center justify-center p-12 text-(--muted)">
                  Loading ranks...
                </div>
              ) : (
                <table className="min-w-full divide-y divide-(--border) text-left text-sm text-(--foreground)">
                  <thead className="bg-(--background) text-xs uppercase tracking-[0.22em] text-(--muted)">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {peerRanks.length > 0 ? (
                      peerRanks.map((rank) => {
                        const isCurrent = rank.userId === currentUserId;

                        return (
                          <tr
                            key={rank.userId}
                            onClick={() => {
                              setSelectedUserId(rank.userId);
                              setResumeModalOpen(true);
                            }}
                            className={`cursor-pointer transition hover:bg-(--accent) ${
                              isCurrent ? "bg-primary/10" : ""
                            } ${
                              selectedUserId === rank.userId ? "border-l-4 border-(--primary)" : ""
                            }`}
                          >
                            <td className="px-4 py-4 font-semibold text-(--foreground)/80">
                              {rank.position ?? "-"}
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-medium text-(--foreground)">{rank.name}</div>
                              {isCurrent ? (
                                <div className="text-xs text-(--primary)">You</div>
                              ) : null}
                            </td>
                            <td className="px-4 py-4 text-(--muted)">
                              {rank.currentRole || rank.currentCompany || "N/A"}
                            </td>
                            <td className="px-4 py-4 text-(--muted)">
                              {formatRankScore(rank.rankScore)}
                            </td>
                            <td className="px-4 py-4 text-(--muted)">{rank.rankLabel || "Unranked"}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-(--muted)">
                          No rankings available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <p className="mt-4 text-sm text-(--muted)">
              Click any user to preview their resume summary. Your row is highlighted.
            </p>
          </div>

        </div>
      </section>

      {resumeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-(--card) p-6 shadow-2xl border border-(--border)">
            <button
              type="button"
              onClick={() => setResumeModalOpen(false)}
              className="absolute right-4 top-4 rounded-full border border-(--border) bg-(--background) p-2 text-(--foreground) transition hover:bg-(--accent)"
            >
              <X size={18} />
            </button>

            <div className="space-y-5">
              <div>
                <p className="text-sm text-(--muted)">Resume Summary</p>
                <h3 className="text-3xl font-semibold text-(--foreground)">
                  {selectedResume?.name || "Peer Resume"}
                </h3>
              </div>

              {resumeLoading ? (
                <div className="flex min-h-45 items-center justify-center rounded-3xl bg-(--background) p-8 text-(--muted)">
                  <Loader2 className="animate-spin" size={28} />
                </div>
              ) : selectedResume ? (
                <div className="space-y-6 text-sm text-(--foreground)/80">
                  {selectedResume.currentRole || selectedResume.currentCompany ? (
                    <div className="rounded-3xl bg-(--background) p-5">
                      <p className="text-sm text-(--muted)">Current role</p>
                      <p className="mt-1 text-xl font-semibold text-(--foreground)">
                        {selectedResume.currentRole || "N/A"}
                      </p>
                      <p className="text-(--muted)">{selectedResume.currentCompany || ""}</p>
                    </div>
                  ) : null}

                  {selectedResume.headline ? (
                    <div>
                      <p className="text-sm text-(--muted)">Headline</p>
                      <p className="mt-2 text-(--foreground)">{selectedResume.headline}</p>
                    </div>
                  ) : null}

                  {selectedResume.profileSummary ? (
                    <div>
                      <p className="text-sm text-(--muted)">Summary</p>
                      <p className="mt-2 leading-7 text-(--foreground)/80">
                        {selectedResume.profileSummary}
                      </p>
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-(--background) p-5">
                      <p className="text-sm text-(--muted)">Experience / Companies</p>
                      {summarizeJsonField(selectedResume.experienceSummaryJson).length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm text-(--foreground)/80">
                          {summarizeJsonField(selectedResume.experienceSummaryJson).map((item, index) => (
                            <li key={index} className="list-disc pl-4">{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-(--muted)">No experience details available.</p>
                      )}
                    </div>

                    <div className="rounded-3xl bg-(--background) p-5">
                      <p className="text-sm text-(--muted)">Projects / Skills</p>
                      {summarizeJsonField(selectedResume.topSkillsJson).length > 0 ? (
                        <ul className="mt-3 space-y-2 text-sm text-(--foreground)/80">
                          {summarizeJsonField(selectedResume.topSkillsJson).map((item, index) => (
                            <li key={index} className="list-disc pl-4">{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-(--muted)">No project or skills details available.</p>
                      )}
                    </div>
                  </div>

                  {selectedResume.resumeFileName ? (
                    <div className="rounded-3xl bg-(--background) p-5">
                      <p className="text-sm text-(--muted)">Resume file</p>
                      <p className="mt-1 text-(--foreground)">{selectedResume.resumeFileName}</p>
                      {selectedResume.resumeUrl ? (
                        <a
                          href={selectedResume.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-sm font-semibold text-(--primary) hover:underline"
                        >
                          View resume document
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="min-h-45 rounded-3xl bg-(--background) p-8 text-(--muted)">
                  Select a ranked user row to preview that user&apos;s resume summary.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}