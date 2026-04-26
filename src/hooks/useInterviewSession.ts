"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildInterviewEvaluationEndpoint,
  buildInterviewRealtimeWsUrl,
  buildInterviewSessionCancelEndpoint,
  buildInterviewSessionDetailEndpoint,
  buildInterviewSessionEndEndpoint,
  buildInterviewSessionQuestionsEndpoint,
  buildInterviewSessionStartEndpoint,
  buildInterviewSubmitAnswerEndpoint,
  extractApiMessage,
  fetchInterviewJson,
  getAuthHeaders,
  getNoCacheFetchOptions,
  parseApiError,
  resolveInterviewSessionId,
} from "../config/interviewConfig";

/**
 * src/components/interview/useInterviewSession.ts
 *
 * Backend-integrated interview session hook
 * aligned with the latest project update.
 *
 * Purpose:
 * - centralize interview session lifecycle handling for frontend interview pages/components
 * - fetch session details, questions, transcript, evaluation
 * - submit answers to backend
 * - manage realtime websocket connection
 * - keep frontend strictly aligned with backend-first architecture
 *
 * Backend-aligned endpoints:
 * - GET  /api/interview/session/{sessionId}
 * - GET  /api/interview/session/{sessionId}/questions
 * - GET  /api/interview/session/{sessionId}/transcript
 * - GET  /api/interview/evaluation/{sessionId}
 * - POST /api/interview/session/{sessionId}/start
 * - POST /api/interview/session/{sessionId}/end
 * - POST /api/interview/session/{sessionId}/cancel
 * - POST /api/interview/session/{sessionId}/answer
 *
 * Notes:
 * - frontend never calls AI-engine directly
 * - backend remains the only orchestration layer
 * - response handling stays resilient to wrapped payloads
 */

export type InterviewSessionRole = "INTERVIEWER" | "CANDIDATE" | "SYSTEM" | "UNKNOWN";

export type InterviewSessionStatus =
  | "DRAFT"
  | "CREATED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "EVALUATED"
  | "CANCELLED"
  | "FAILED"
  | "UNKNOWN";

export type InterviewSessionQuestion = {
  id?: number | string;
  questionId?: number | string;
  content?: string;
  question?: string;
  type?: string;
  order?: number;
};

export type InterviewSessionAnswer = {
  id?: number | string;
  answerId?: number | string;
  questionId?: number | string;
  answer?: string;
  answerText?: string;
  content?: string;
  feedback?: string;
  score?: number | string;
  createdAt?: string;
};

export type InterviewSessionTranscriptItem = {
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

export type InterviewSessionEvaluation = {
  sessionId?: number | string;
  interviewSessionId?: number | string;
  overallScore?: number | string;
  technicalScore?: number | string;
  communicationScore?: number | string;
  confidenceScore?: number | string;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  recommendations?: string[] | null;
  summary?: string | null;
  detailedFeedback?: string | null;
  interviewerNotes?: string | null;
  categoryScores?: Array<{
    name?: string;
    score?: number | string;
    feedback?: string;
  }> | null;
};

export type InterviewSessionData = {
  interviewSessionId?: number | string;
  sessionId?: number | string;
  id?: number | string;
  title?: string;
  name?: string;
  jobTitle?: string;
  companyName?: string;
  mode?: string;
  type?: string;
  status?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  updatedAt?: string;
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

export type InterviewRealtimeMessage = {
  event?: string;
  type?: string;
  sessionId?: number | string;
  payload?: unknown;
  timestamp?: string;
};

export type UseInterviewSessionOptions = {
  sessionId: string | number;

  autoLoad?: boolean;
  autoFetchQuestions?: boolean;
  autoFetchTranscript?: boolean;
  autoFetchEvaluation?: boolean;
  autoConnectRealtime?: boolean;

  detailEndpoint?: string;
  questionsEndpoint?: string;
  transcriptEndpoint?: string;
  evaluationEndpoint?: string;
  startEndpoint?: string;
  endEndpoint?: string;
  cancelEndpoint?: string;
  answerEndpoint?: string;
  realtimeWsUrl?: string;

  onSessionLoaded?: (session: InterviewSessionData | null, raw: unknown) => void;
  onQuestionsLoaded?: (questions: InterviewSessionQuestion[], raw: unknown) => void;
  onTranscriptLoaded?: (transcript: InterviewSessionTranscriptItem[], raw: unknown) => void;
  onEvaluationLoaded?: (
    evaluation: InterviewSessionEvaluation | null,
    raw: unknown
  ) => void;
  onAnswerSubmitted?: (answer: InterviewSessionAnswer | null, raw: unknown) => void;
  onRealtimeMessage?: (message: InterviewRealtimeMessage) => void;
};

export type UseInterviewSessionResult = {
  sessionId: string | number;
  session: InterviewSessionData | null;
  questions: InterviewSessionQuestion[];
  transcript: InterviewSessionTranscriptItem[];
  evaluation: InterviewSessionEvaluation | null;
  submittedAnswers: Record<string, InterviewSessionAnswer>;

  loading: boolean;
  loadingQuestions: boolean;
  loadingTranscript: boolean;
  loadingEvaluation: boolean;
  submittingAnswer: boolean;
  performingAction: boolean;

  connectedRealtime: boolean;
  realtimeEnabled: boolean;
  realtimeMessages: InterviewRealtimeMessage[];

  error: string | null;
  successMessage: string | null;

  status: InterviewSessionStatus;
  isInProgress: boolean;
  isCompleted: boolean;
  isEndedLike: boolean;

  fetchSession: (isRefresh?: boolean) => Promise<InterviewSessionData | null>;
  fetchQuestions: () => Promise<InterviewSessionQuestion[]>;
  fetchTranscript: () => Promise<InterviewSessionTranscriptItem[]>;
  fetchEvaluation: () => Promise<InterviewSessionEvaluation | null>;

  startSession: () => Promise<unknown>;
  endSession: () => Promise<unknown>;
  cancelSession: () => Promise<unknown>;

  submitAnswer: (input: {
    questionId: string | number;
    answer: string;
    elapsedTimeSeconds?: number;
  }) => Promise<InterviewSessionAnswer | null>;

  enableRealtime: () => void;
  disableRealtime: () => void;
  reconnectRealtime: () => void;

  clearMessages: () => void;
  clearError: () => void;
  clearSuccess: () => void;
};

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeStatus(value?: string | null): InterviewSessionStatus {
  const normalized = String(value || "").trim().toUpperCase();

  if (
    normalized === "DRAFT" ||
    normalized === "CREATED" ||
    normalized === "IN_PROGRESS" ||
    normalized === "COMPLETED" ||
    normalized === "EVALUATED" ||
    normalized === "CANCELLED" ||
    normalized === "FAILED"
  ) {
    return normalized;
  }

  return "UNKNOWN";
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeSession(input: any): InterviewSessionData | null {
  if (!input || typeof input !== "object") return null;

  return {
    interviewSessionId: input.interviewSessionId ?? input.sessionId ?? input.id,
    sessionId: input.sessionId ?? input.interviewSessionId ?? input.id,
    id: input.id ?? input.sessionId ?? input.interviewSessionId,
    title: input.title ?? input.name ?? "",
    name: input.name ?? input.title ?? "",
    jobTitle: input.jobTitle ?? "",
    companyName: input.companyName ?? "",
    mode: input.mode ?? "",
    type: input.type ?? "",
    status: input.status ?? "",
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    language: input.language ?? null,
    interviewLanguage: input.interviewLanguage ?? null,
    preferredLanguage: input.preferredLanguage ?? null,
    speechLanguage: input.speechLanguage ?? null,
    locale: input.locale ?? null,
    allowMixedLanguage: input.allowMixedLanguage ?? null,
    requiresClearSpeech: input.requiresClearSpeech ?? null,
    voiceInputEnabled: input.voiceInputEnabled ?? null,
    textInputEnabled: input.textInputEnabled ?? null,
    languageNotice: input.languageNotice ?? null,
    communicationInstructions: input.communicationInstructions ?? null,
  };
}

function normalizeQuestions(input: unknown): InterviewSessionQuestion[] {
  if (!Array.isArray(input)) return [];

  return input.map((item: any, index) => ({
    id: item?.id ?? item?.questionId ?? index + 1,
    questionId: item?.questionId ?? item?.id ?? index + 1,
    content:
      typeof item?.content === "string"
        ? item.content
        : typeof item?.question === "string"
          ? item.question
          : "",
    question:
      typeof item?.question === "string"
        ? item.question
        : typeof item?.content === "string"
          ? item.content
          : "",
    type: typeof item?.type === "string" ? item.type : "GENERAL",
    order: toSafeNumber(item?.order, index + 1),
  }));
}

function normalizeTranscript(input: unknown): InterviewSessionTranscriptItem[] {
  if (Array.isArray(input)) return input as InterviewSessionTranscriptItem[];

  if (input && typeof input === "object") {
    const obj = input as any;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.transcript)) return obj.transcript;
    if (Array.isArray(obj.messages)) return obj.messages;
  }

  return [];
}

function normalizeEvaluation(input: any): InterviewSessionEvaluation | null {
  if (!input || typeof input !== "object") return null;

  return {
    ...input,
    overallScore: toSafeNumber(input.overallScore, 0),
    technicalScore: toSafeNumber(input.technicalScore, 0),
    communicationScore: toSafeNumber(input.communicationScore, 0),
    confidenceScore: toSafeNumber(input.confidenceScore, 0),
    strengths: normalizeStringArray(input.strengths),
    weaknesses: normalizeStringArray(input.weaknesses),
    recommendations: normalizeStringArray(input.recommendations),
    summary: typeof input.summary === "string" ? input.summary.trim() : "",
    detailedFeedback:
      typeof input.detailedFeedback === "string"
        ? input.detailedFeedback.trim()
        : "",
    interviewerNotes:
      typeof input.interviewerNotes === "string"
        ? input.interviewerNotes.trim()
        : "",
    categoryScores: Array.isArray(input.categoryScores)
      ? input.categoryScores.map((item: any) => ({
          name: typeof item?.name === "string" ? item.name.trim() : "",
          score: toSafeNumber(item?.score, 0),
          feedback: typeof item?.feedback === "string" ? item.feedback.trim() : "",
        }))
      : [],
  };
}

function normalizeAnswer(input: any): InterviewSessionAnswer | null {
  if (!input || typeof input !== "object") return null;

  return {
    id: input.id ?? input.answerId,
    answerId: input.answerId ?? input.id,
    questionId: input.questionId,
    answer: input.answer ?? input.answerText ?? input.content ?? "",
    answerText: input.answerText ?? input.answer ?? input.content ?? "",
    content: input.content ?? input.answer ?? input.answerText ?? "",
    feedback: input.feedback ?? "",
    score: input.score,
    createdAt: input.createdAt,
  };
}

export default function useInterviewSession(
  options: UseInterviewSessionOptions
): UseInterviewSessionResult {
  const {
    sessionId,
    autoLoad = true,
    autoFetchQuestions = true,
    autoFetchTranscript = false,
    autoFetchEvaluation = false,
    autoConnectRealtime = false,
    detailEndpoint,
    questionsEndpoint,
    transcriptEndpoint,
    evaluationEndpoint,
    startEndpoint,
    endEndpoint,
    cancelEndpoint,
    answerEndpoint,
    realtimeWsUrl,
    onSessionLoaded,
    onQuestionsLoaded,
    onTranscriptLoaded,
    onEvaluationLoaded,
    onAnswerSubmitted,
    onRealtimeMessage,
  } = options;

  const [session, setSession] = useState<InterviewSessionData | null>(null);
  const [questions, setQuestions] = useState<InterviewSessionQuestion[]>([]);
  const [transcript, setTranscript] = useState<InterviewSessionTranscriptItem[]>([]);
  const [evaluation, setEvaluation] = useState<InterviewSessionEvaluation | null>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Record<string, InterviewSessionAnswer>
  >({});

  const [loading, setLoading] = useState(autoLoad);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [performingAction, setPerformingAction] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [realtimeEnabled, setRealtimeEnabled] = useState(autoConnectRealtime);
  const [connectedRealtime, setConnectedRealtime] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<InterviewRealtimeMessage[]>([]);

  const websocketRef = useRef<WebSocket | null>(null);

  const resolvedSessionId = useMemo(
    () => resolveInterviewSessionId({ interviewSessionId: sessionId, sessionId }),
    [sessionId]
  );

  const resolvedDetailEndpoint = useMemo(() => {
    return detailEndpoint || buildInterviewSessionDetailEndpoint(sessionId);
  }, [detailEndpoint, sessionId]);

  const resolvedQuestionsEndpoint = useMemo(() => {
    return questionsEndpoint || buildInterviewSessionQuestionsEndpoint(sessionId);
  }, [questionsEndpoint, sessionId]);

  const resolvedTranscriptEndpoint = useMemo(() => {
    return transcriptEndpoint || `${buildInterviewSessionDetailEndpoint(sessionId)}/transcript`;
  }, [transcriptEndpoint, sessionId]);

  const resolvedEvaluationEndpoint = useMemo(() => {
    return evaluationEndpoint || buildInterviewEvaluationEndpoint(sessionId);
  }, [evaluationEndpoint, sessionId]);

  const resolvedStartEndpoint = useMemo(() => {
    return startEndpoint || buildInterviewSessionStartEndpoint(sessionId);
  }, [startEndpoint, sessionId]);

  const resolvedEndEndpoint = useMemo(() => {
    return endEndpoint || buildInterviewSessionEndEndpoint(sessionId);
  }, [endEndpoint, sessionId]);

  const resolvedCancelEndpoint = useMemo(() => {
    return cancelEndpoint || buildInterviewSessionCancelEndpoint(sessionId);
  }, [cancelEndpoint, sessionId]);

  const resolvedAnswerEndpoint = useMemo(() => {
    return answerEndpoint || buildInterviewSubmitAnswerEndpoint(sessionId);
  }, [answerEndpoint, sessionId]);

  const resolvedRealtimeWsUrl = useMemo(() => {
    return realtimeWsUrl || buildInterviewRealtimeWsUrl(sessionId);
  }, [realtimeWsUrl, sessionId]);

  const status = normalizeStatus(session?.status);
  const isInProgress = status === "IN_PROGRESS";
  const isCompleted = status === "COMPLETED" || status === "EVALUATED";
  const isEndedLike =
    isCompleted || status === "FAILED" || status === "CANCELLED";

  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccessMessage(null), []);
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const fetchSession = useCallback(
    async (isRefresh = false): Promise<InterviewSessionData | null> => {
      try {
        clearMessages();
        if (!isRefresh) setLoading(true);

        const { payload, raw, message } =
          await fetchInterviewJson<InterviewSessionData>(resolvedDetailEndpoint, {
            method: "GET",
          });

        const normalized = normalizeSession(payload);
        setSession(normalized);
        if (message) setSuccessMessage(message);
        onSessionLoaded?.(normalized, raw);
        return normalized;
      } catch (err: any) {
        setError(err?.message || "Failed to load interview session.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [resolvedDetailEndpoint, onSessionLoaded, clearMessages]
  );

  const fetchQuestions = useCallback(async (): Promise<InterviewSessionQuestion[]> => {
    try {
      setLoadingQuestions(true);
      clearMessages();

      const { payload, raw, message } =
        await fetchInterviewJson<
          InterviewSessionQuestion[] | { questions?: InterviewSessionQuestion[] }
        >(resolvedQuestionsEndpoint, {
          method: "GET",
        });

      const list = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as any)?.questions)
          ? (payload as any).questions
          : [];

      const normalized = normalizeQuestions(list);
      setQuestions(normalized);
      if (message) setSuccessMessage(message);
      onQuestionsLoaded?.(normalized, raw);
      return normalized;
    } catch (err: any) {
      setError(err?.message || "Failed to load interview questions.");
      setQuestions([]);
      return [];
    } finally {
      setLoadingQuestions(false);
    }
  }, [resolvedQuestionsEndpoint, onQuestionsLoaded, clearMessages]);

  const fetchTranscript = useCallback(
    async (): Promise<InterviewSessionTranscriptItem[]> => {
      try {
        setLoadingTranscript(true);
        clearMessages();

        const { payload, raw, message } =
          await fetchInterviewJson<InterviewSessionTranscriptItem[] | Record<string, unknown>>(
            resolvedTranscriptEndpoint,
            {
              method: "GET",
            }
          );

        const normalized = normalizeTranscript(payload);
        setTranscript(normalized);
        if (message) setSuccessMessage(message);
        onTranscriptLoaded?.(normalized, raw);
        return normalized;
      } catch (err: any) {
        setError(err?.message || "Failed to load interview transcript.");
        setTranscript([]);
        return [];
      } finally {
        setLoadingTranscript(false);
      }
    },
    [resolvedTranscriptEndpoint, onTranscriptLoaded, clearMessages]
  );

  const fetchEvaluation = useCallback(
    async (): Promise<InterviewSessionEvaluation | null> => {
      try {
        setLoadingEvaluation(true);
        clearMessages();

        const { payload, raw, message } =
          await fetchInterviewJson<InterviewSessionEvaluation>(resolvedEvaluationEndpoint, {
            method: "GET",
          });

        const normalized = normalizeEvaluation(payload);
        setEvaluation(normalized);
        if (message) setSuccessMessage(message);
        onEvaluationLoaded?.(normalized, raw);
        return normalized;
      } catch (err: any) {
        setError(err?.message || "Failed to load interview evaluation.");
        setEvaluation(null);
        return null;
      } finally {
        setLoadingEvaluation(false);
      }
    },
    [resolvedEvaluationEndpoint, onEvaluationLoaded, clearMessages]
  );

  const runLifecycleAction = useCallback(
    async (endpoint: string, fallbackSuccess: string) => {
      try {
        setPerformingAction(true);
        clearMessages();

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
        const message = extractApiMessage(raw) || fallbackSuccess;
        setSuccessMessage(message);

        await fetchSession(true);
        return raw;
      } catch (err: any) {
        setError(err?.message || "Interview action failed.");
        throw err;
      } finally {
        setPerformingAction(false);
      }
    },
    [clearMessages, fetchSession]
  );

  const startSession = useCallback(async () => {
    return runLifecycleAction(resolvedStartEndpoint, "Interview session started.");
  }, [resolvedStartEndpoint, runLifecycleAction]);

  const endSession = useCallback(async () => {
    return runLifecycleAction(resolvedEndEndpoint, "Interview session ended.");
  }, [resolvedEndEndpoint, runLifecycleAction]);

  const cancelSession = useCallback(async () => {
    return runLifecycleAction(resolvedCancelEndpoint, "Interview session cancelled.");
  }, [resolvedCancelEndpoint, runLifecycleAction]);

  const submitAnswer = useCallback(
    async (input: {
      questionId: string | number;
      answer: string;
      elapsedTimeSeconds?: number;
    }): Promise<InterviewSessionAnswer | null> => {
      try {
        setSubmittingAnswer(true);
        clearMessages();

        if (!String(input.answer || "").trim()) {
          throw new Error("Answer is required.");
        }

        const payload = {
          sessionId: resolvedSessionId,
          interviewSessionId: resolvedSessionId,
          questionId: input.questionId,
          answer: input.answer.trim(),
          answerText: input.answer.trim(),
          elapsedTimeSeconds: input.elapsedTimeSeconds ?? 0,
        };

        const response = await fetch(
          resolvedAnswerEndpoint,
          getNoCacheFetchOptions("POST", {
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
          })
        );

        if (!response.ok) {
          throw new Error(await parseApiError(response));
        }

        const raw = await response.json();
        const payloadData =
          (raw as any)?.data ??
          (raw as any)?.payload ??
          (raw as any)?.result ??
          raw;

        const normalized = normalizeAnswer(payloadData);
        if (normalized) {
          setSubmittedAnswers((prev) => ({
            ...prev,
            [String(input.questionId)]: normalized,
          }));
        }

        const message = extractApiMessage(raw) || "Answer submitted successfully.";
        setSuccessMessage(message);
        onAnswerSubmitted?.(normalized, raw);

        return normalized;
      } catch (err: any) {
        setError(err?.message || "Failed to submit answer.");
        return null;
      } finally {
        setSubmittingAnswer(false);
      }
    },
    [
      clearMessages,
      onAnswerSubmitted,
      resolvedAnswerEndpoint,
      resolvedSessionId,
    ]
  );

  const disableRealtime = useCallback(() => {
    setRealtimeEnabled(false);
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    setConnectedRealtime(false);
  }, []);

  const enableRealtime = useCallback(() => {
    setRealtimeEnabled(true);
  }, []);

  const reconnectRealtime = useCallback(() => {
    disableRealtime();
    setTimeout(() => {
      setRealtimeEnabled(true);
    }, 50);
  }, [disableRealtime]);

  useEffect(() => {
    if (!autoLoad) return;
    fetchSession();
  }, [autoLoad, fetchSession]);

  useEffect(() => {
    if (!autoLoad || !autoFetchQuestions) return;
    fetchQuestions();
  }, [autoLoad, autoFetchQuestions, fetchQuestions]);

  useEffect(() => {
    if (!autoLoad || !autoFetchTranscript) return;
    fetchTranscript();
  }, [autoLoad, autoFetchTranscript, fetchTranscript]);

  useEffect(() => {
    if (!autoLoad || !autoFetchEvaluation) return;
    fetchEvaluation();
  }, [autoLoad, autoFetchEvaluation, fetchEvaluation]);

  useEffect(() => {
    if (!realtimeEnabled || !resolvedRealtimeWsUrl) {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      setConnectedRealtime(false);
      return;
    }

    const ws = new WebSocket(resolvedRealtimeWsUrl);
    websocketRef.current = ws;

    ws.onopen = () => {
      setConnectedRealtime(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as InterviewRealtimeMessage;
        setRealtimeMessages((prev) => [parsed, ...prev].slice(0, 50));
        onRealtimeMessage?.(parsed);
      } catch {
        const parsed: InterviewRealtimeMessage = {
          type: "message",
          sessionId: resolvedSessionId ?? undefined,
          payload: event.data,
          timestamp: new Date().toISOString(),
        };
        setRealtimeMessages((prev) => [parsed, ...prev].slice(0, 50));
        onRealtimeMessage?.(parsed);
      }
    };

    ws.onerror = () => {
      setConnectedRealtime(false);
    };

    ws.onclose = () => {
      setConnectedRealtime(false);
    };

    return () => {
      ws.close();
      websocketRef.current = null;
    };
  }, [realtimeEnabled, resolvedRealtimeWsUrl, resolvedSessionId, onRealtimeMessage]);

  return {
    sessionId,
    session,
    questions,
    transcript,
    evaluation,
    submittedAnswers,

    loading,
    loadingQuestions,
    loadingTranscript,
    loadingEvaluation,
    submittingAnswer,
    performingAction,

    connectedRealtime,
    realtimeEnabled,
    realtimeMessages,

    error,
    successMessage,

    status,
    isInProgress,
    isCompleted,
    isEndedLike,

    fetchSession,
    fetchQuestions,
    fetchTranscript,
    fetchEvaluation,

    startSession,
    endSession,
    cancelSession,

    submitAnswer,

    enableRealtime,
    disableRealtime,
    reconnectRealtime,

    clearMessages,
    clearError,
    clearSuccess,
  };
}