"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Loader2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Sparkles,
} from "lucide-react";
import {
  buildInterviewSessionEndEndpoint,
  buildInterviewSessionStartEndpoint,
  buildInterviewSessionCancelEndpoint,
  buildInterviewEvaluationEndpoint,
  extractApiMessage,
  fetchInterviewJson,
  getAuthHeaders,
  getNoCacheFetchOptions,
  normalizeRole,
  parseApiError,
  resolveInterviewSessionId,
} from "../../config/interviewConfig";

/**
 * src/components/interview/InterviewControls.tsx
 *
 * Backend-integrated Interview Controls
 *
 * Purpose:
 * - reusable interview session control bar for user/admin interview pages
 * - integrates with backend session lifecycle endpoints
 * - supports start / pause(local UI) / end / cancel / evaluate
 * - supports audio/video/realtime UI toggles for frontend interview experiences
 * - stays aligned with backend-first project ideology
 *
 * Expected backend-aligned endpoints:
 * - POST /api/interview/session/{sessionId}/start
 * - POST /api/interview/session/{sessionId}/end
 * - POST /api/interview/session/{sessionId}/cancel
 * - GET  /api/interview/evaluation/{sessionId}
 *
 * Notes:
 * - pause/resume is handled as a UI/session-state convenience unless your backend
 *   later exposes dedicated pause endpoints
 * - AI-engine remains backend orchestrated; frontend never talks to AI-engine directly
 * - works with USER / ADMIN flows
 */

export type InterviewControlsSessionLike = {
  interviewSessionId?: number | string;
  sessionId?: number | string;
  id?: number | string;
  title?: string;
  name?: string;
  status?: string;
  mode?: string;
  type?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
};

export type InterviewControlsEvaluationLike = {
  overallScore?: number;
  technicalScore?: number;
  communicationScore?: number;
  confidenceScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  summary?: string;
};

type InterviewControlsProps = {
  session: InterviewControlsSessionLike | null | undefined;

  className?: string;
  disabled?: boolean;
  compact?: boolean;

  allowStart?: boolean;
  allowPause?: boolean;
  allowEnd?: boolean;
  allowCancel?: boolean;
  allowEvaluate?: boolean;

  showRealtimeToggles?: boolean;
  showTimer?: boolean;
  autoStartTimerWhenInProgress?: boolean;

  initialMicEnabled?: boolean;
  initialVideoEnabled?: boolean;
  initialSpeakerEnabled?: boolean;
  initialRealtimeEnabled?: boolean;
  initialPaused?: boolean;

  startEndpoint?: string;
  endEndpoint?: string;
  cancelEndpoint?: string;
  evaluationEndpoint?: string;

  onStarted?: (payload: unknown) => void;
  onEnded?: (payload: unknown) => void;
  onCancelled?: (payload: unknown) => void;
  onEvaluated?: (payload: InterviewControlsEvaluationLike | null, raw: unknown) => void;

  onPauseChange?: (paused: boolean) => void;
  onMicChange?: (enabled: boolean) => void;
  onVideoChange?: (enabled: boolean) => void;
  onSpeakerChange?: (enabled: boolean) => void;
  onRealtimeChange?: (enabled: boolean) => void;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function getSessionStatus(session: InterviewControlsSessionLike | null | undefined) {
  return String(session?.status || "").trim().toUpperCase();
}

function useInterviewTimer(enabled: boolean, startedAt?: string) {
  const [baseNow, setBaseNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;

    const id = window.setInterval(() => {
      setBaseNow(Date.now());
    }, 1000);

    return () => window.clearInterval(id);
  }, [enabled]);

  const seconds = useMemo(() => {
    if (!enabled || !startedAt) return 0;

    const startMs = new Date(startedAt).getTime();
    if (Number.isNaN(startMs)) return 0;

    return Math.max(0, Math.floor((baseNow - startMs) / 1000));
  }, [enabled, startedAt, baseNow]);

  return seconds;
}

export default function InterviewControls({
  session,
  className = "",
  disabled = false,
  compact = false,

  allowStart = true,
  allowPause = true,
  allowEnd = true,
  allowCancel = true,
  allowEvaluate = true,

  showRealtimeToggles = true,
  showTimer = true,
  autoStartTimerWhenInProgress = true,

  initialMicEnabled = true,
  initialVideoEnabled = false,
  initialSpeakerEnabled = true,
  initialRealtimeEnabled = false,
  initialPaused = false,

  startEndpoint,
  endEndpoint,
  cancelEndpoint,
  evaluationEndpoint,

  onStarted,
  onEnded,
  onCancelled,
  onEvaluated,

  onPauseChange,
  onMicChange,
  onVideoChange,
  onSpeakerChange,
  onRealtimeChange,
}: InterviewControlsProps) {
  const [loadingAction, setLoadingAction] = useState<
    "start" | "end" | "cancel" | "evaluate" | null
  >(null);

  const [paused, setPaused] = useState(initialPaused);
  const [micEnabled, setMicEnabled] = useState(initialMicEnabled);
  const [videoEnabled, setVideoEnabled] = useState(initialVideoEnabled);
  const [speakerEnabled, setSpeakerEnabled] = useState(initialSpeakerEnabled);
  const [realtimeEnabled, setRealtimeEnabled] = useState(initialRealtimeEnabled);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionId = resolveInterviewSessionId(session);
  const sessionStatus = getSessionStatus(session);

  const resolvedStartEndpoint = useMemo(() => {
    if (!sessionId) return "";
    return startEndpoint || buildInterviewSessionStartEndpoint(sessionId);
  }, [sessionId, startEndpoint]);

  const resolvedEndEndpoint = useMemo(() => {
    if (!sessionId) return "";
    return endEndpoint || buildInterviewSessionEndEndpoint(sessionId);
  }, [sessionId, endEndpoint]);

  const resolvedCancelEndpoint = useMemo(() => {
    if (!sessionId) return "";
    return cancelEndpoint || buildInterviewSessionCancelEndpoint(sessionId);
  }, [sessionId, cancelEndpoint]);

  const resolvedEvaluationEndpoint = useMemo(() => {
    if (!sessionId) return "";
    return evaluationEndpoint || buildInterviewEvaluationEndpoint(sessionId);
  }, [sessionId, evaluationEndpoint]);

  const isCreated =
    sessionStatus === "CREATED" || sessionStatus === "DRAFT" || !sessionStatus;
  const isInProgress = sessionStatus === "IN_PROGRESS";
  const isCompleted =
    sessionStatus === "COMPLETED" || sessionStatus === "EVALUATED";
  const isEndedLike =
    isCompleted || sessionStatus === "FAILED" || sessionStatus === "CANCELLED";

  const timerEnabled = showTimer && autoStartTimerWhenInProgress && isInProgress;
  const elapsedSeconds = useInterviewTimer(timerEnabled, session?.startedAt);

  const canStart =
    allowStart && !disabled && !!sessionId && (isCreated || sessionStatus === "PAUSED");
  const canPause = allowPause && !disabled && !!sessionId && isInProgress;
  const canEnd = allowEnd && !disabled && !!sessionId && isInProgress;
  const canCancel =
    allowCancel && !disabled && !!sessionId && !isEndedLike && sessionStatus !== "CANCELLED";
  const canEvaluate =
    allowEvaluate && !disabled && !!sessionId && (isCompleted || sessionStatus === "COMPLETED");

  const runAction = async <
    TPayload = unknown
  >(
    action: "start" | "end" | "cancel" | "evaluate",
    endpoint: string,
    method: "POST" | "GET"
  ): Promise<{ payload: TPayload | null; raw: unknown; message: string | null }> => {
    setLoadingAction(action);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!endpoint) {
        throw new Error("Interview session endpoint is not available.");
      }

      if (method === "GET") {
        const result = await fetchInterviewJson<TPayload>(endpoint, {
          method: "GET",
        });
        return result;
      }

      const response = await fetch(
        endpoint,
        getNoCacheFetchOptions("POST", {
          headers: getAuthHeaders(),
          body: JSON.stringify({}),
        })
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const raw = await response.json();
      const payload = raw && typeof raw === "object"
        ? ((raw as any).data ??
            (raw as any).payload ??
            (raw as any).result ??
            raw) ?? null
        : null;

      return {
        payload,
        raw,
        message: extractApiMessage(raw),
      };
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStart = async () => {
    try {
      const { payload, raw, message } = await runAction("start", resolvedStartEndpoint, "POST");
      setPaused(false);
      setSuccessMessage(message || "Interview session started successfully.");
      onPauseChange?.(false);
      onStarted?.(payload ?? raw);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to start interview session.");
    }
  };

  const handleEnd = async () => {
    try {
      const { payload, raw, message } = await runAction("end", resolvedEndEndpoint, "POST");
      setSuccessMessage(message || "Interview session ended successfully.");
      onEnded?.(payload ?? raw);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to end interview session.");
    }
  };

  const handleCancel = async () => {
    try {
      const { payload, raw, message } = await runAction(
        "cancel",
        resolvedCancelEndpoint,
        "POST"
      );
      setSuccessMessage(message || "Interview session cancelled successfully.");
      onCancelled?.(payload ?? raw);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to cancel interview session.");
    }
  };

  const handleEvaluate = async () => {
    try {
      const { payload, raw, message } = await runAction<InterviewControlsEvaluationLike>(
        "evaluate",
        resolvedEvaluationEndpoint,
        "GET"
      );
      setSuccessMessage(message || "Interview evaluation loaded successfully.");
      onEvaluated?.(payload, raw);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to load interview evaluation.");
    }
  };

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    onPauseChange?.(next);
  };

  const toggleMic = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    onMicChange?.(next);
  };

  const toggleVideo = () => {
    const next = !videoEnabled;
    setVideoEnabled(next);
    onVideoChange?.(next);
  };

  const toggleSpeaker = () => {
    const next = !speakerEnabled;
    setSpeakerEnabled(next);
    onSpeakerChange?.(next);
  };

  const toggleRealtime = () => {
    const next = !realtimeEnabled;
    setRealtimeEnabled(next);
    onRealtimeChange?.(next);
  };

  const statusPill = useMemo(() => {
    if (isInProgress) {
      return "border-blue-400/20 bg-blue-500/15 text-blue-100";
    }
    if (isCompleted) {
      return "border-green-400/20 bg-green-500/15 text-green-100";
    }
    if (sessionStatus === "CANCELLED" || sessionStatus === "FAILED") {
      return "border-red-400/20 bg-red-500/15 text-red-100";
    }
    return "border-white/10 bg-white/10 text-white/80";
  }, [isCompleted, isInProgress, sessionStatus]);

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl",
        className
      )}
    >
      <div className={compact ? "p-4" : "p-6"}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">
                Interview Controls
              </h3>

              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                  statusPill
                )}
              >
                {sessionStatus || "CREATED"}
              </span>

              {paused && isInProgress && (
                <span className="inline-flex items-center rounded-full border border-yellow-400/20 bg-yellow-500/15 px-3 py-1 text-xs font-semibold text-yellow-100">
                  Paused (UI)
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-white/55">
              Control interview lifecycle and realtime interaction state.
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/60">
              {sessionId ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Session ID: {String(sessionId)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-red-100">
                  No session attached
                </span>
              )}

              {showTimer && isInProgress && (
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-indigo-100">
                  <Clock3 size={12} />
                  {formatDuration(elapsedSeconds)}
                </span>
              )}

              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-emerald-100">
                <Sparkles size={12} />
                Backend integrated
              </span>
            </div>
          </div>

          {showRealtimeToggles && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleMic}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold transition disabled:opacity-50",
                  micEnabled
                    ? "bg-white/10 hover:bg-white/15"
                    : "border border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/15"
                )}
              >
                {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                {micEnabled ? "Mic On" : "Mic Off"}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold transition disabled:opacity-50",
                  videoEnabled
                    ? "bg-white/10 hover:bg-white/15"
                    : "border border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/15"
                )}
              >
                {videoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                {videoEnabled ? "Video On" : "Video Off"}
              </button>

              <button
                type="button"
                onClick={toggleSpeaker}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold transition disabled:opacity-50",
                  speakerEnabled
                    ? "bg-white/10 hover:bg-white/15"
                    : "border border-red-400/20 bg-red-500/10 text-red-100 hover:bg-red-500/15"
                )}
              >
                {speakerEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                {speakerEnabled ? "Speaker On" : "Speaker Off"}
              </button>

              <button
                type="button"
                onClick={toggleRealtime}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold transition disabled:opacity-50",
                  realtimeEnabled
                    ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                    : "bg-white/10 hover:bg-white/15"
                )}
              >
                <Radio size={16} />
                {realtimeEnabled ? "Realtime On" : "Realtime Off"}
              </button>
            </div>
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

        <div className="mt-5 flex flex-wrap gap-3">
          {allowStart && (
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart || loadingAction !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-4 py-2.5 font-semibold transition hover:opacity-95 disabled:opacity-50"
            >
              {loadingAction === "start" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Start
                </>
              )}
            </button>
          )}

          {allowPause && (
            <button
              type="button"
              onClick={togglePause}
              disabled={!canPause || loadingAction !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
              {paused ? "Resume" : "Pause"}
            </button>
          )}

          {allowEnd && (
            <button
              type="button"
              onClick={handleEnd}
              disabled={!canEnd || loadingAction !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              {loadingAction === "end" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Ending...
                </>
              ) : (
                <>
                  <Square size={16} />
                  End
                </>
              )}
            </button>
          )}

          {allowCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={!canCancel || loadingAction !== null}
              className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 font-semibold text-red-100 transition hover:bg-red-500/15 disabled:opacity-50"
            >
              {loadingAction === "cancel" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Cancel
                </>
              )}
            </button>
          )}

          {allowEvaluate && (
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={!canEvaluate || loadingAction !== null}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              {loadingAction === "evaluate" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Loading Evaluation...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Evaluate
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
