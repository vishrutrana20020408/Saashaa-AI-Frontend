"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Languages,
  Volume2,
  Mic,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Globe2,
  MessageSquareText,
} from "lucide-react";

/**
 * src/components/interview/InterviewLanguageNotice.tsx
 *
 * Backend-integrated Interview Language Notice
 *
 * Purpose:
 * - show the language currently configured/expected for an interview session
 * - display interview communication guidance before or during the session
 * - support backend-driven session metadata and fallback frontend defaults
 * - fit user/admin interview screens, interview room layouts, and session detail pages
 *
 * Backend alignment:
 * - frontend remains backend-first
 * - AI-engine language handling remains backend orchestrated
 * - this component only reads backend session metadata/config
 *
 * Supported backend patterns:
 * 1) Session detail endpoint:
 *    GET /api/interview/session/{sessionId}
 *
 * 2) Optional user/admin wrappers:
 *    GET /api/user/interview/sessions/{sessionId}
 *    GET /api/admin/interview/sessions/{sessionId}
 *
 * 3) Optional interview config endpoint:
 *    GET /api/interview/config
 *
 * Supported response shapes:
 * - { success, data }
 * - { success, payload }
 * - { success, result }
 * - nested wrappers
 *
 * Expected possible backend fields:
 * {
 *   language: "English",
 *   interviewLanguage: "English",
 *   preferredLanguage: "English",
 *   speechLanguage: "en-IN",
 *   locale: "en-IN",
 *   allowMixedLanguage: false,
 *   requiresClearSpeech: true,
 *   voiceInputEnabled: true,
 *   textInputEnabled: true,
 *   languageNotice: "Please answer in English.",
 *   communicationInstructions: "Use concise, role-relevant responses."
 * }
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

export type InterviewLanguagePayload = {
  language?: string | null;
  interviewLanguage?: string | null;
  preferredLanguage?: string | null;
  speechLanguage?: string | null;
  locale?: string | null;
  allowMixedLanguage?: boolean | null;
  requiresClearSpeech?: boolean | null;
  voiceInputEnabled?: boolean | null;
  textInputEnabled?: boolean | null;
  languageNotice?: string | null;
  communicationInstructions?: string | null;
};

type InterviewSessionLike = {
  interviewSessionId?: number | string;
  sessionId?: number | string;
  id?: number | string;
  language?: string | null;
  interviewLanguage?: string | null;
  preferredLanguage?: string | null;
  speechLanguage?: string | null;
  locale?: string | null;
  allowMixedLanguage?: boolean | null;
  requiresClearSpeech?: boolean | null;
  voiceInputEnabled?: boolean | null;
  textInputEnabled?: boolean | null;
  languageNotice?: string | null;
  communicationInstructions?: string | null;
};

type InterviewLanguageNoticeProps = {
  sessionId?: string | number;
  session?: InterviewSessionLike | null;

  className?: string;
  compact?: boolean;
  disabled?: boolean;
  autoFetch?: boolean;

  title?: string;
  subtitle?: string;

  fetchEndpoint?: string;

  fallbackLanguage?: string;
  fallbackLocale?: string;
  fallbackNotice?: string;
  fallbackInstructions?: string;

  showRefresh?: boolean;
  showInputModes?: boolean;
  showSpeechHints?: boolean;

  onLoaded?: (payload: InterviewLanguagePayload | null, raw: unknown) => void;
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
  if (response.status === 403) return "You do not have permission to view interview language settings.";
  if (response.status === 404) return "Interview language settings were not found.";
  return `Request failed with status ${response.status}.`;
}

function resolveSessionId(session?: InterviewSessionLike | null, explicitId?: string | number) {
  return explicitId ?? session?.interviewSessionId ?? session?.sessionId ?? session?.id;
}

function normalizePayload(
  payload: InterviewLanguagePayload | InterviewSessionLike | null | undefined,
  fallbacks: {
    language: string;
    locale: string;
    notice: string;
    instructions: string;
  }
): Required<InterviewLanguagePayload> {
  const language =
    payload?.interviewLanguage?.trim() ||
    payload?.preferredLanguage?.trim() ||
    payload?.language?.trim() ||
    fallbacks.language;

  const locale = payload?.speechLanguage?.trim() || payload?.locale?.trim() || fallbacks.locale;

  const languageNotice =
    payload?.languageNotice?.trim() ||
    fallbacks.notice ||
    `Please answer in ${language}.`;

  const communicationInstructions =
    payload?.communicationInstructions?.trim() ||
    fallbacks.instructions ||
    "Speak clearly, keep answers structured, and stay relevant to the question.";

  return {
    language,
    interviewLanguage: payload?.interviewLanguage?.trim() || language,
    preferredLanguage: payload?.preferredLanguage?.trim() || language,
    speechLanguage: payload?.speechLanguage?.trim() || locale,
    locale,
    allowMixedLanguage: Boolean(payload?.allowMixedLanguage ?? false),
    requiresClearSpeech: Boolean(payload?.requiresClearSpeech ?? true),
    voiceInputEnabled: Boolean(payload?.voiceInputEnabled ?? true),
    textInputEnabled: Boolean(payload?.textInputEnabled ?? true),
    languageNotice,
    communicationInstructions,
  };
}

export default function InterviewLanguageNotice({
  sessionId,
  session,
  className = "",
  compact = false,
  disabled = false,
  autoFetch = true,

  title = "Interview Language Notice",
  subtitle = "Language expectations and communication guidance for this interview.",

  fetchEndpoint,

  fallbackLanguage = "English",
  fallbackLocale = "en-IN",
  fallbackNotice = "Please answer in English.",
  fallbackInstructions = "Speak clearly, keep responses concise, and use role-relevant terminology.",

  showRefresh = true,
  showInputModes = true,
  showSpeechHints = true,

  onLoaded,
}: InterviewLanguageNoticeProps) {
  const [loading, setLoading] = useState(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const initialResolved = useMemo(
    () =>
      normalizePayload(
        session,
        {
          language: fallbackLanguage,
          locale: fallbackLocale,
          notice: fallbackNotice,
          instructions: fallbackInstructions,
        }
      ),
    [session, fallbackLanguage, fallbackLocale, fallbackNotice, fallbackInstructions]
  );

  const [data, setData] =
    useState<Required<InterviewLanguagePayload>>(initialResolved);

  const resolvedSessionId = useMemo(
    () => resolveSessionId(session, sessionId),
    [session, sessionId]
  );

  const resolvedEndpoint = useMemo(() => {
    if (fetchEndpoint) return fetchEndpoint;
    if (!resolvedSessionId) return "";
    return `${API_BASE_URL}/api/interview/session/${resolvedSessionId}`;
  }, [fetchEndpoint, resolvedSessionId]);

  const fetchLanguageConfig = async (isRefresh = false) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!resolvedEndpoint) {
        const fallbackData = normalizePayload(
          session,
          {
            language: fallbackLanguage,
            locale: fallbackLocale,
            notice: fallbackNotice,
            instructions: fallbackInstructions,
          }
        );
        setData(fallbackData);
        onLoaded?.(fallbackData, null);
        return;
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
      const payload = unwrapPayload<InterviewLanguagePayload | InterviewSessionLike>(raw);

      const normalized = normalizePayload(payload, {
        language: fallbackLanguage,
        locale: fallbackLocale,
        notice: fallbackNotice,
        instructions: fallbackInstructions,
      });

      setData(normalized);
      setSuccessMessage(extractMessage(raw) || "Interview language settings loaded.");
      onLoaded?.(normalized, raw);
    } catch (error: any) {
      const fallbackData = normalizePayload(
        session,
        {
          language: fallbackLanguage,
          locale: fallbackLocale,
          notice: fallbackNotice,
          instructions: fallbackInstructions,
        }
      );
      setData(fallbackData);
      setErrorMessage(
        error?.message || "Unable to load backend language settings. Showing fallback configuration."
      );
      onLoaded?.(fallbackData, null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!autoFetch) return;
    fetchLanguageConfig();
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
              <Languages size={20} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{title}</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-100">
                  <Globe2 size={12} />
                  {data.language}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                  {data.locale}
                </span>
              </div>

              <p className="text-sm text-white/55">{subtitle}</p>

              {resolvedSessionId && (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                    Session: {String(resolvedSessionId)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {showRefresh && (
            <button
              type="button"
              onClick={() => fetchLanguageConfig(true)}
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
            <p className="text-sm text-white/60">
              Loading interview language guidance...
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquareText size={16} className="text-indigo-300" />
                <h3 className="text-base font-semibold">Language Notice</h3>
              </div>
              <p className="whitespace-pre-wrap wrap-break-word text-sm text-white/75">
                {data.languageNotice}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-3 flex items-center gap-2">
                <Globe2 size={16} className="text-indigo-300" />
                <h3 className="text-base font-semibold">Communication Instructions</h3>
              </div>
              <p className="whitespace-pre-wrap wrap-break-word text-sm text-white/75">
                {data.communicationInstructions}
              </p>
            </div>

            {(showInputModes || showSpeechHints) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {showInputModes && (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
                        <Mic size={13} />
                        <span>Voice Input</span>
                      </div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          data.voiceInputEnabled ? "text-green-300" : "text-red-300"
                        )}
                      >
                        {data.voiceInputEnabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
                        <Volume2 size={13} />
                        <span>Text Input</span>
                      </div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          data.textInputEnabled ? "text-green-300" : "text-red-300"
                        )}
                      >
                        {data.textInputEnabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                  </>
                )}

                {showSpeechHints && (
                  <>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
                        <Mic size={13} />
                        <span>Clear Speech</span>
                      </div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          data.requiresClearSpeech ? "text-green-300" : "text-white/70"
                        )}
                      >
                        {data.requiresClearSpeech ? "Recommended" : "Optional"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
                        <Globe2 size={13} />
                        <span>Mixed Language</span>
                      </div>
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          data.allowMixedLanguage ? "text-yellow-200" : "text-white/70"
                        )}
                      >
                        {data.allowMixedLanguage ? "Allowed" : "Not Preferred"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}