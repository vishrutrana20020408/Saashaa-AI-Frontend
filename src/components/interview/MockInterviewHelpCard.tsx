"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  PlayCircle,
  FileText,
  BrainCircuit,
  Target,
  MessageSquareText,
  Radio,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  ClipboardList,
} from "lucide-react";

/**
 * src/components/interview/MockInterviewHelpCard.tsx
 *
 * Backend-integrated Mock Interview Help Card
 *
 * Purpose:
 * - show interview guidance, readiness tips, and backend-driven help content
 * - reusable for interview dashboard, session setup, interview room sidebar, and result pages
 * - aligned with latest backend-first Interview System architecture
 *
 * Supported backend patterns:
 * 1) GET /api/interview/help/mock
 * 2) GET /api/interview/config
 * 3) custom endpoint override from parent
 *
 * Supported response styles:
 * - { success, data }
 * - { success, payload }
 * - { success, result }
 * - nested wrapped responses
 *
 * Possible backend payload examples:
 * {
 *   title: "Mock Interview Help",
 *   subtitle: "Prepare before you begin",
 *   tips: ["...", "..."],
 *   steps: ["...", "..."],
 *   checklist: ["...", "..."],
 *   quickActions: [
 *     { label: "Open Interview Room", href: "/user/interview/12" }
 *   ],
 *   supportNote: "Answer clearly and stay concise.",
 *   recommendedMode: "TEXT",
 *   recommendedType: "TECHNICAL"
 * }
 *
 * Notes:
 * - frontend never calls AI-engine directly
 * - backend remains the source of truth for dynamic interview guidance
 * - safe fallback content is used when backend help content is unavailable
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
  content?: T | null;
};

export type MockInterviewHelpAction = {
  label?: string;
  href?: string;
  type?: string;
};

export type MockInterviewHelpPayload = {
  title?: string | null;
  subtitle?: string | null;
  tips?: string[] | null;
  steps?: string[] | null;
  checklist?: string[] | null;
  quickActions?: MockInterviewHelpAction[] | null;
  supportNote?: string | null;
  recommendedMode?: string | null;
  recommendedType?: string | null;
};

type MockInterviewHelpCardProps = {
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  autoFetch?: boolean;

  endpoint?: string;

  title?: string;
  subtitle?: string;

  fallbackMode?: string;
  fallbackType?: string;

  showRefresh?: boolean;
  showChecklist?: boolean;
  showSteps?: boolean;
  showTips?: boolean;
  showActions?: boolean;
  showSupportNote?: boolean;

  interviewRoomHref?: string;
  interviewSetupHref?: string;
  dashboardHref?: string;

  onLoaded?: (payload: MockInterviewHelpPayload | null, raw: unknown) => void;
};

const DEFAULT_HELP: Required<MockInterviewHelpPayload> = {
  title: "Mock Interview Help",
  subtitle: "Use this guide to get ready before starting your mock interview.",
  tips: [
    "Read the question fully before answering.",
    "Keep answers structured and role-relevant.",
    "Highlight impact, ownership, and measurable outcomes.",
    "Use concise examples from your projects or work experience.",
  ],
  steps: [
    "Review the interview type and target role.",
    "Check language, microphone, and interview settings.",
    "Start the session and answer one question at a time.",
    "Review backend feedback after completing the session.",
  ],
  checklist: [
    "Resume version selected",
    "Interview type confirmed",
    "Stable internet connection",
    "Quiet environment",
    "Clear speaking pace",
  ],
  quickActions: [],
  supportNote:
    "Speak clearly, stay relevant to the question, and focus on structured answers.",
  recommendedMode: "TEXT",
  recommendedType: "TECHNICAL",
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getStoredToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token")
  );
}

function unwrapPayload<T>(input: unknown): T | null {
  if (!input || typeof input !== "object") return input as T | null;

  const level1 = input as ApiEnvelope<T>;
  const first = (level1.data ??
    level1.payload ??
    level1.result ??
    level1.content ??
    input) as T | ApiEnvelope<T>;

  if (!first || typeof first !== "object") return first as T | null;

  const level2 = first as ApiEnvelope<T>;
  return (level2.data ??
    level2.payload ??
    level2.result ??
    level2.content ??
    first) as T | null;
}

function extractMessage(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;

  const top = input as ApiEnvelope<unknown>;
  if (typeof top.message === "string" && top.message.trim()) {
    return top.message.trim();
  }

  const nested = unwrapPayload<any>(input);
  if (nested && typeof nested === "object") {
    const maybeMessage = (nested as { message?: string }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage.trim();
    }
  }

  return null;
}

async function parseErrorMessage(response: Response) {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await response.json();
      const message =
        extractMessage(json) ||
        (typeof (json as any)?.error === "string" ? (json as any).error : null) ||
        (typeof (json as any)?.details === "string"
          ? (json as any).details
          : null);

      if (message) return message;
    } else {
      const text = await response.text();
      if (text.trim()) return text.trim();
    }
  } catch {
    // ignore
  }

  if (response.status === 401) return "You are not authenticated. Please log in again.";
  if (response.status === 403) return "You do not have permission to view mock interview help.";
  if (response.status === 404) return "Mock interview help content was not found.";
  return `Request failed with status ${response.status}.`;
}

function normalizeStringArray(input: unknown, fallback: string[]) {
  if (!Array.isArray(input)) return fallback;
  const cleaned = input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return cleaned.length > 0 ? cleaned : fallback;
}

function normalizeActions(input: unknown): MockInterviewHelpAction[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => ({
      label:
        typeof item?.label === "string" && item.label.trim()
          ? item.label.trim()
          : "",
      href:
        typeof item?.href === "string" && item.href.trim()
          ? item.href.trim()
          : "",
      type:
        typeof item?.type === "string" && item.type.trim()
          ? item.type.trim()
          : "",
    }))
    .filter((item) => item.label && item.href);
}

function normalizeHelpPayload(
  payload: MockInterviewHelpPayload | null | undefined,
  fallbacks?: Partial<MockInterviewHelpPayload>
): Required<MockInterviewHelpPayload> {
  const mergedFallback: Required<MockInterviewHelpPayload> = {
    title: DEFAULT_HELP.title,
    subtitle: DEFAULT_HELP.subtitle,
    tips: normalizeStringArray(fallbacks?.tips || undefined, (DEFAULT_HELP.tips || []) as string[]),
    steps: normalizeStringArray(fallbacks?.steps || undefined, (DEFAULT_HELP.steps || []) as string[]),
    checklist: normalizeStringArray(fallbacks?.checklist || undefined, (DEFAULT_HELP.checklist || []) as string[]),
    quickActions: Array.isArray(fallbacks?.quickActions)
      ? (fallbacks?.quickActions || []).filter(Boolean)
      : DEFAULT_HELP.quickActions,
    supportNote: fallbacks?.supportNote || DEFAULT_HELP.supportNote,
    recommendedMode: fallbacks?.recommendedMode || DEFAULT_HELP.recommendedMode,
    recommendedType: fallbacks?.recommendedType || DEFAULT_HELP.recommendedType,
  };

  return {
    title:
      typeof payload?.title === "string" && payload.title.trim()
        ? payload.title.trim()
        : mergedFallback.title,
    subtitle:
      typeof payload?.subtitle === "string" && payload.subtitle.trim()
        ? payload.subtitle.trim()
        : mergedFallback.subtitle,
    tips: normalizeStringArray(payload?.tips, (mergedFallback.tips || []) as string[]),
    steps: normalizeStringArray(payload?.steps, (mergedFallback.steps || []) as string[]),
    checklist: normalizeStringArray(payload?.checklist, (mergedFallback.checklist || []) as string[]),
    quickActions: normalizeActions(payload?.quickActions),
    supportNote:
      typeof payload?.supportNote === "string" && payload.supportNote.trim()
        ? payload.supportNote.trim()
        : mergedFallback.supportNote,
    recommendedMode:
      typeof payload?.recommendedMode === "string" && payload.recommendedMode.trim()
        ? payload.recommendedMode.trim()
        : mergedFallback.recommendedMode,
    recommendedType:
      typeof payload?.recommendedType === "string" && payload.recommendedType.trim()
        ? payload.recommendedType.trim()
        : mergedFallback.recommendedType,
  };
}

export default function MockInterviewHelpCard({
  className = "",
  compact = false,
  disabled = false,
  autoFetch = true,

  endpoint,

  title,
  subtitle,

  fallbackMode = "TEXT",
  fallbackType = "TECHNICAL",

  showRefresh = true,
  showChecklist = true,
  showSteps = true,
  showTips = true,
  showActions = true,
  showSupportNote = true,

  interviewRoomHref = "/user/interview",
  interviewSetupHref = "/user/interview/setup",
  dashboardHref = "/user",

  onLoaded,
}: MockInterviewHelpCardProps) {
  const [loading, setLoading] = useState(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const initialFallback = useMemo<Partial<MockInterviewHelpPayload>>(
    () => ({
      title: title || DEFAULT_HELP.title,
      subtitle: subtitle || DEFAULT_HELP.subtitle,
      recommendedMode: fallbackMode,
      recommendedType: fallbackType,
      quickActions: [
        { label: "Open Interview Room", href: interviewRoomHref, type: "room" },
        { label: "Interview Setup", href: interviewSetupHref, type: "setup" },
        { label: "Back to Dashboard", href: dashboardHref, type: "dashboard" },
      ],
    }),
    [title, subtitle, fallbackMode, fallbackType, interviewRoomHref, interviewSetupHref, dashboardHref]
  );

  const [data, setData] = useState<Required<MockInterviewHelpPayload>>(
    normalizeHelpPayload(null, initialFallback)
  );

  const resolvedEndpoint = useMemo(() => {
    if (endpoint) return endpoint;
    return `${API_BASE_URL}/api/interview/help/mock`;
  }, [endpoint]);

  const fetchHelp = async (isRefresh = false) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = getStoredToken();

      const response = await fetch(resolvedEndpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const raw = await response.json();
      const payload = unwrapPayload<MockInterviewHelpPayload>(raw);
      const normalized = normalizeHelpPayload(payload, initialFallback);

      if ((normalized.quickActions || []).length === 0) {
        normalized.quickActions = normalizeHelpPayload(null, initialFallback).quickActions;
      }

      setData(normalized);
      setSuccessMessage(extractMessage(raw) || "Mock interview help loaded successfully.");
      onLoaded?.(normalized, raw);
    } catch (error: any) {
      const fallbackData = normalizeHelpPayload(null, initialFallback);
      setData(fallbackData);
      setErrorMessage(
        error?.message || "Unable to load backend help content. Showing fallback guidance."
      );
      onLoaded?.(fallbackData, null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setData(normalizeHelpPayload(null, initialFallback));
  }, [initialFallback]);

  useEffect(() => {
    if (!autoFetch) return;
    fetchHelp();
  }, [autoFetch, resolvedEndpoint]);

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl",
        className
      )}
    >
      <div className={compact ? "p-4" : "p-6"}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              <LifeBuoy size={20} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{data.title}</h2>

                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-100">
                  <BrainCircuit size={12} />
                  {data.recommendedType}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/20 bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-100">
                  <Radio size={12} />
                  {data.recommendedMode}
                </span>
              </div>

              <p className="text-sm text-white/55">{data.subtitle}</p>
            </div>
          </div>

          {showRefresh && (
            <button
              type="button"
              onClick={() => fetchHelp(true)}
              disabled={disabled || loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh
            </button>
          )}
        </div>

        {successMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
            <CheckCircle2 size={18} className="mt-0.5 text-green-300" />
            <p className="text-sm text-green-100">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <p className="text-sm text-red-100">{errorMessage}</p>
          </div>
        )}

        {loading ? (
          <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
            <Loader2 className="animate-spin text-indigo-300" size={28} />
            <p className="text-sm text-white/60">Loading mock interview help...</p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {showSupportNote && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-300" />
                  <h3 className="text-base font-semibold">Support Note</h3>
                </div>
                <p className="whitespace-pre-wrap wrap-break-word text-sm text-white/75">
                  {data.supportNote}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
              {showSteps && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <PlayCircle size={16} className="text-indigo-300" />
                    <h3 className="text-base font-semibold">Steps</h3>
                  </div>

                  <div className="space-y-3">
                    {(data.steps || []).map((step, index) => (
                      <div
                        key={`${step}-${index}`}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-100">
                            {index + 1}
                          </span>
                          <p className="text-sm text-white/75">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showTips && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-300" />
                    <h3 className="text-base font-semibold">Tips</h3>
                  </div>

                  <div className="space-y-3">
                    {(data.tips || []).map((tip, index) => (
                      <div
                        key={`${tip}-${index}`}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <p className="text-sm text-white/75">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showChecklist && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <ClipboardList size={16} className="text-indigo-300" />
                    <h3 className="text-base font-semibold">Checklist</h3>
                  </div>

                  <div className="space-y-3">
                    {(data.checklist || []).map((item, index) => (
                      <div
                        key={`${item}-${index}`}
                        className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <CheckCircle2 size={16} className="mt-0.5 text-green-300" />
                        <p className="text-sm text-white/75">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {showActions && (data.quickActions || []).length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen size={16} className="text-indigo-300" />
                  <h3 className="text-base font-semibold">Quick Actions</h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  {(data.quickActions || []).map((action, index) => (
                    <Link
                      key={`${action.label}-${index}`}
                      href={action.href || "#"}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
                    >
                      {action.type === "room" ? (
                        <MessageSquareText size={16} />
                      ) : action.type === "setup" ? (
                        <Target size={16} />
                      ) : (
                        <FileText size={16} />
                      )}
                      {action.label}
                      <ArrowRight size={15} />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}