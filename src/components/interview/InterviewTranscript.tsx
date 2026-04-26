"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Download,
  Copy,
  MessageSquareText,
  User2,
  Bot,
  Clock3,
  Filter,
  Sparkles,
} from "lucide-react";
import {
  fetchInterviewJson,
  normalizeRole,
  resolveInterviewSessionId,
} from "../../config/interviewConfig";

/**
 * src/components/interview/InterviewTranscript.tsx
 *
 * Backend-integrated Interview Transcript
 *
 * Purpose:
 * - display interview transcript/messages fetched from backend
 * - support user/admin interview detail pages and interview room history
 * - support transcript search, speaker filtering, and export helpers
 * - stay aligned with latest backend-first Interview System architecture
 *
 * Expected backend-aligned endpoints:
 * - GET /api/interview/session/{sessionId}/transcript
 * - or custom endpoint override from parent
 *
 * Supported backend response styles:
 * - { success, data: [...] }
 * - { success, data: { items: [...] } }
 * - { success, payload: [...] }
 * - { success, result: [...] }
 * - nested wrapped responses
 *
 * Supported transcript item patterns:
 * {
 *   id: 1,
 *   speaker: "INTERVIEWER",
 *   text: "Tell me about yourself",
 *   timestamp: "2026-03-25T18:40:00",
 *   type: "QUESTION"
 * }
 *
 * or
 *
 * {
 *   transcriptId: 1,
 *   role: "USER",
 *   content: "I am a backend developer...",
 *   createdAt: "2026-03-25T18:40:30",
 *   eventType: "ANSWER"
 * }
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

export type InterviewTranscriptItem = {
  id?: number | string;
  transcriptId?: number | string;
  messageId?: number | string;

  speaker?: string;
  role?: string;

  text?: string;
  content?: string;
  message?: string;

  type?: string;
  eventType?: string;

  timestamp?: string;
  createdAt?: string;
  updatedAt?: string;
};

type InterviewTranscriptSessionLike = {
  interviewSessionId?: number | string;
  sessionId?: number | string;
  id?: number | string;
  title?: string;
  name?: string;
};

type InterviewTranscriptResponse =
  | InterviewTranscriptItem[]
  | {
      items?: InterviewTranscriptItem[];
      transcript?: InterviewTranscriptItem[];
      messages?: InterviewTranscriptItem[];
    };

type InterviewTranscriptProps = {
  sessionId?: string | number;
  session?: InterviewTranscriptSessionLike | null;

  endpoint?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  autoFetch?: boolean;

  title?: string;
  subtitle?: string;
  emptyMessage?: string;

  searchable?: boolean;
  filterable?: boolean;
  showRefresh?: boolean;
  showExportActions?: boolean;
  showTimestamps?: boolean;
  showEventType?: boolean;

  onLoaded?: (items: NormalizedTranscriptItem[], raw: unknown) => void;
};

type NormalizedTranscriptItem = {
  id: string;
  speaker: string;
  text: string;
  type: string;
  timestamp?: string;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function toArrayPayload(payload: InterviewTranscriptResponse | null | undefined) {
  if (!payload) return [];

  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.transcript)) return payload.transcript;
  if (Array.isArray(payload.messages)) return payload.messages;

  return [];
}

function normalizeTranscriptItem(
  item: InterviewTranscriptItem,
  index: number
): NormalizedTranscriptItem {
  const rawSpeaker = String(item.speaker || item.role || "UNKNOWN").trim().toUpperCase();

  let normalizedSpeaker = rawSpeaker;
  if (["USER", "CANDIDATE", "APPLICANT", "ME"].includes(rawSpeaker)) {
    normalizedSpeaker = "CANDIDATE";
  } else if (
    ["INTERVIEWER", "ASSISTANT", "AI", "SYSTEM", "BOT"].includes(rawSpeaker)
  ) {
    normalizedSpeaker = "INTERVIEWER";
  }

  return {
    id: String(item.id ?? item.transcriptId ?? item.messageId ?? index + 1),
    speaker: normalizedSpeaker,
    text: String(item.text ?? item.content ?? item.message ?? "").trim(),
    type: String(item.type ?? item.eventType ?? "MESSAGE").trim().toUpperCase(),
    timestamp: item.timestamp ?? item.createdAt ?? item.updatedAt,
  };
}

function formatDateTime(value?: string) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function extractMessage(raw: any): string | null {
  if (!raw || typeof raw !== "object") return null;

  if (typeof raw.message === "string" && raw.message.trim()) {
    return raw.message.trim();
  }

  const nested =
    raw.data ?? raw.payload ?? raw.result ?? raw.content ?? null;

  if (nested && typeof nested === "object" && typeof nested.message === "string") {
    return nested.message.trim();
  }

  return null;
}

function extractPayload(raw: any): InterviewTranscriptResponse | null {
  if (!raw || typeof raw !== "object") return raw ?? null;

  const first = raw.data ?? raw.payload ?? raw.result ?? raw.content ?? raw;

  if (first && typeof first === "object") {
    const second =
      (first as any).data ??
      (first as any).payload ??
      (first as any).result ??
      (first as any).content ??
      first;

    return second as InterviewTranscriptResponse;
  }

  return first as InterviewTranscriptResponse;
}

function speakerBadgeClasses(speaker: string) {
  if (speaker === "CANDIDATE") {
    return "border-blue-400/20 bg-blue-500/15 text-blue-100";
  }
  if (speaker === "INTERVIEWER") {
    return "border-purple-400/20 bg-purple-500/15 text-purple-100";
  }
  return "border-white/10 bg-white/10 text-white/75";
}

export default function InterviewTranscript({
  sessionId,
  session,
  endpoint,
  className = "",
  compact = false,
  disabled = false,
  autoFetch = true,

  title = "Interview Transcript",
  subtitle = "Conversation history and question-answer transcript from backend.",
  emptyMessage = "No transcript entries available.",

  searchable = true,
  filterable = true,
  showRefresh = true,
  showExportActions = true,
  showTimestamps = true,
  showEventType = true,

  onLoaded,
}: InterviewTranscriptProps) {
  const [items, setItems] = useState<NormalizedTranscriptItem[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState<string>("ALL");

  const role =
    typeof window !== "undefined"
      ? normalizeRole(localStorage.getItem("userRole") || localStorage.getItem("role"))
      : "UNKNOWN";

  const resolvedSessionId = useMemo(() => {
    if (sessionId !== undefined && sessionId !== null) return sessionId;
    return resolveInterviewSessionId(session || undefined);
  }, [sessionId, session]);

  const resolvedEndpoint = useMemo(() => {
    if (endpoint) return endpoint;
    if (!resolvedSessionId) return "";
    return `${API_BASE_URL}/api/interview/session/${resolvedSessionId}/transcript`;
  }, [endpoint, resolvedSessionId]);

  const fetchTranscript = async (isRefresh = false) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!resolvedEndpoint) {
        throw new Error("Interview transcript endpoint is not available.");
      }

      const { payload, raw, message } =
        await fetchInterviewJson<InterviewTranscriptResponse>(resolvedEndpoint, {
          method: "GET",
        });

      const normalized = toArrayPayload(payload)
        .map(normalizeTranscriptItem)
        .filter((item) => item.text);

      setItems(normalized);
      setSuccessMessage(message || extractMessage(raw) || "Interview transcript loaded successfully.");
      onLoaded?.(normalized, raw);
    } catch (error: unknown) {
      console.error("InterviewTranscript fetch error:", error);
      setItems([]);
      const message =
        typeof error === "object" && error && "message" in error && typeof (error as any).message === "string"
          ? (error as any).message
          : "Failed to load interview transcript from backend.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!autoFetch || !resolvedEndpoint) return;
    fetchTranscript();
  }, [autoFetch, resolvedEndpoint]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSpeaker =
        speakerFilter === "ALL" || item.speaker === speakerFilter;

      const haystack = `${item.speaker} ${item.type} ${item.text}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);

      return matchesSpeaker && matchesSearch;
    });
  }, [items, search, speakerFilter]);

  const speakerOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.speaker) set.add(item.speaker);
    });
    return ["ALL", ...Array.from(set)];
  }, [items]);

  const transcriptText = useMemo(() => {
    return filteredItems
      .map((item) => {
        const time = item.timestamp ? ` [${formatDateTime(item.timestamp)}]` : "";
        return `${item.speaker}${time}: ${item.text}`;
      })
      .join("\n\n");
  }, [filteredItems]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcriptText);
      setSuccessMessage("Transcript copied to clipboard.");
    } catch {
      setErrorMessage("Failed to copy transcript.");
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([transcriptText], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `interview-transcript-${resolvedSessionId || "session"}.txt`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
      setSuccessMessage("Transcript downloaded successfully.");
    } catch {
      setErrorMessage("Failed to download transcript.");
    }
  };

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
              <FileText size={20} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{title}</h2>

                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                  {role}
                </span>

                {resolvedSessionId && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-100">
                    Session: {String(resolvedSessionId)}
                  </span>
                )}
              </div>

              <p className="text-sm text-white/55">{subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {showExportActions && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={disabled || filteredItems.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
                >
                  <Copy size={16} />
                  Copy
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={disabled || filteredItems.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
                >
                  <Download size={16} />
                  Download
                </button>
              </>
            )}

            {showRefresh && (
              <button
                type="button"
                onClick={() => fetchTranscript(true)}
                disabled={disabled || loading || refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
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
        </div>

        {(searchable || filterable) && (
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_auto]">
            {searchable && (
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transcript..."
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                />
              </div>
            )}

            {filterable && (
              <div className="relative min-w-45">
                <Filter
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <select
                  value={speakerFilter}
                  onChange={(e) => setSpeakerFilter(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                >
                  {speakerOptions.map((speaker) => (
                    <option key={speaker} value={speaker} className="bg-slate-900">
                      {speaker === "ALL" ? "All Speakers" : speaker}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

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
            <p className="text-sm text-white/60">Loading interview transcript...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-10 text-center">
            <MessageSquareText className="mx-auto text-white/35" size={28} />
            <p className="mt-3 font-medium text-white/70">{emptyMessage}</p>
            <p className="mt-1 text-sm text-white/45">
              Try changing your filters or wait for backend transcript generation.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-4">
              {filteredItems.map((item, index) => {
                const isCandidate = item.speaker === "CANDIDATE";
                const isInterviewer = item.speaker === "INTERVIEWER";

                return (
                  <div
                    key={item.id || index}
                    className={cn(
                      "rounded-2xl border p-4",
                      isCandidate
                        ? "border-blue-400/10 bg-blue-500/5"
                        : isInterviewer
                          ? "border-purple-400/10 bg-purple-500/5"
                          : "border-white/10 bg-black/20"
                    )}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                          speakerBadgeClasses(item.speaker)
                        )}
                      >
                        {isCandidate ? (
                          <User2 size={12} />
                        ) : isInterviewer ? (
                          <Bot size={12} />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        {item.speaker}
                      </span>

                      {showEventType && item.type && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/75">
                          {item.type}
                        </span>
                      )}

                      {showTimestamps && item.timestamp && (
                        <span className="inline-flex items-center gap-1 text-xs text-white/45">
                          <Clock3 size={12} />
                          {formatDateTime(item.timestamp)}
                        </span>
                      )}
                    </div>

                    <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-white/80">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center gap-2 text-sm text-white/50">
              <Sparkles size={15} className="text-indigo-300" />
              Showing {filteredItems.length} of {items.length} transcript entries
            </div>
          </>
        )}
      </div>
    </div>
  );
}
