"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Send,
  MessageSquareText,
  Sparkles,
  Clock3,
  FileText,
  Bot,
  User2,
  PlayCircle,
  Radio,
  BadgeCheck,
  ChevronRight,
  ArrowRight,
  History,
} from "lucide-react";

import InterviewControls from "./InterviewControls";
import InterviewFeedbackPanel, {
  InterviewFeedbackEvaluation,
} from "./InterviewFeedbackPanel";
import InterviewLanguageNotice from "./InterviewLanguageNotice";
import { TypingTest, CodeEditor } from "./TechnicalTasks";

import {
  INTERVIEW_CONFIG,
  buildInterviewEvaluationEndpoint,
  buildInterviewRealtimeWsUrl,
  buildInterviewSessionDetailEndpoint,
  buildInterviewSessionQuestionsEndpoint,
  buildInterviewSessionStartEndpoint,
  buildInterviewSubmitAnswerEndpoint,
  extractApiMessage,
  fetchInterviewJson,
  getAuthHeaders,
  getNoCacheFetchOptions,
  normalizeRole,
  parseApiError,
  postInterviewJson,
  resolveInterviewSessionId,
  resolveInterviewSessionTitle,
  resolveInterviewStatus,
} from "../../config/interviewConfig";

/**
 * src/components/interview/InterviewRoom.tsx
 *
 * Backend-integrated Interview Room
 */

type InterviewRoomSession = {
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
  interviewToken?: string;
  token?: string;

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

type InterviewRoomQuestion = {
  id?: number | string;
  questionId?: number | string;
  content?: string;
  question?: string;
  type?: string;
  order?: number;
};

type InterviewRoomAnswer = {
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

type RealtimeMessage = {
  event?: string;
  type?: string;
  sessionId?: number | string;
  payload?: any;
  timestamp?: string;
};

type InterviewRoomProps = {
  sessionId: string | number;

  className?: string;
  disabled?: boolean;
  autoLoad?: boolean;
  autoConnectRealtime?: boolean;
  autoFetchQuestions?: boolean;
  autoStartSession?: boolean;
  showFeedbackPanel?: boolean;
  showLanguageNotice?: boolean;
  showControls?: boolean;

  detailEndpoint?: string;
  questionsEndpoint?: string;
  answerEndpoint?: string;
  startEndpoint?: string;
  evaluationEndpoint?: string;
  realtimeWsUrl?: string;

  onSessionLoaded?: (session: InterviewRoomSession | null, raw: unknown) => void;
  onQuestionsLoaded?: (questions: InterviewRoomQuestion[], raw: unknown) => void;
  onAnswerSubmitted?: (payload: unknown, raw: unknown) => void;
  onRealtimeMessage?: (message: RealtimeMessage) => void;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeQuestions(input: unknown): InterviewRoomQuestion[] {
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

function normalizeSession(input: any): InterviewRoomSession | null {
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
    interviewToken: input.interviewToken ?? input.token ?? null,
    token: input.token ?? input.interviewToken ?? null,
  };
}

function normalizeAnswerPayload(input: any): InterviewRoomAnswer | null {
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

function extractQuestionText(question: InterviewRoomQuestion | null | undefined) {
  return question?.content || question?.question || "Question";
}

function useElapsedSeconds(startedAt?: string, active = false) {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;

    const id = window.setInterval(() => {
      setTick(Date.now());
    }, 1000);

    return () => window.clearInterval(id);
  }, [active]);

  return useMemo(() => {
    if (!startedAt || !active) return 0;
    const startMs = new Date(startedAt).getTime();
    if (Number.isNaN(startMs)) return 0;
    return Math.max(0, Math.floor((tick - startMs) / 1000));
  }, [startedAt, active, tick]);
}

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
      s
    ).padStart(2, "0")}`;
  }

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function InterviewRoom({
  sessionId,
  className = "",
  disabled = false,
  autoLoad = true,
  autoConnectRealtime = false,
  autoFetchQuestions = true,
  autoStartSession = false,
  showFeedbackPanel = true,
  showLanguageNotice = true,
  showControls = true,
  detailEndpoint,
  questionsEndpoint,
  answerEndpoint,
  startEndpoint,
  evaluationEndpoint,
  realtimeWsUrl,
  onSessionLoaded,
  onQuestionsLoaded,
  onAnswerSubmitted,
  onRealtimeMessage,
}: InterviewRoomProps) {
  const [session, setSession] = useState<InterviewRoomSession | null>(null);
  const [questions, setQuestions] = useState<InterviewRoomQuestion[]>([]);
  const [mcqPhase, setMcqPhase] = useState(false);
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [mcqTimer, setMcqTimer] = useState(600); // 10 minutes
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Record<string, InterviewRoomAnswer>
  >({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState("");
  const [showTaskPopup, setShowTaskPopup] = useState<"typing" | "code" | null>(null);

  const handleTaskComplete = (data: any) => {
    console.log("Task completed:", data);
    setShowTaskPopup(null);
  };

  const [loading, setLoading] = useState(autoLoad);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  
  // Proctoring States
  const [cameraActive, setCameraActive] = useState(false);
  const [faceVisible, setFaceVisible] = useState(true);
  const [tabWarning, setTabWarning] = useState(false);
  const [proctoringMessage, setProctoringMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Tab Visibility Check
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabWarning(true);
        setProctoringMessage("Warning: You switched tabs! Please stay on the test screen.");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Camera Logic
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        setCameraActive(false);
        setProctoringMessage("Camera required! Please turn on your camera to proceed.");
      }
    };
    startCamera();
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [realtimeEnabled, setRealtimeEnabled] = useState(autoConnectRealtime);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<RealtimeMessage[]>([]);

  const websocketRef = useRef<WebSocket | null>(null);

  const role =
    typeof window !== "undefined"
      ? normalizeRole(localStorage.getItem("userRole") || localStorage.getItem("role"))
      : "UNKNOWN";

  const resolvedSessionId = useMemo(
    () => resolveInterviewSessionId({ sessionId, interviewSessionId: sessionId }),
    [sessionId]
  );

  const resolvedDetailEndpoint = useMemo(() => {
    if (!resolvedSessionId) return "";
    return detailEndpoint || buildInterviewSessionDetailEndpoint(resolvedSessionId);
  }, [detailEndpoint, resolvedSessionId]);

  const resolvedQuestionsEndpoint = useMemo(() => {
    if (!resolvedSessionId) return "";
    return questionsEndpoint || buildInterviewSessionQuestionsEndpoint(resolvedSessionId);
  }, [questionsEndpoint, resolvedSessionId]);

  const resolvedAnswerEndpoint = useMemo(() => {
    if (!resolvedSessionId) return "";
    return answerEndpoint || buildInterviewSubmitAnswerEndpoint(resolvedSessionId);
  }, [answerEndpoint, resolvedSessionId]);

  const resolvedStartEndpoint = useMemo(() => {
    if (!resolvedSessionId) return "";
    return startEndpoint || buildInterviewSessionStartEndpoint(resolvedSessionId);
  }, [startEndpoint, resolvedSessionId]);

  const resolvedEvaluationEndpoint = useMemo(() => {
    if (!resolvedSessionId) return "";
    return evaluationEndpoint || buildInterviewEvaluationEndpoint(resolvedSessionId);
  }, [evaluationEndpoint, resolvedSessionId]);

  const resolvedRealtimeWsUrl = useMemo(() => {
    if (!resolvedSessionId) return "";
    return realtimeWsUrl || buildInterviewRealtimeWsUrl(resolvedSessionId);
  }, [realtimeWsUrl, resolvedSessionId]);

  const sessionStatus = resolveInterviewStatus(session || undefined);
  const isInProgress = sessionStatus === "IN_PROGRESS";
  const isCompleted = sessionStatus === "COMPLETED" || sessionStatus === "EVALUATED";
  const elapsedSeconds = useElapsedSeconds(session?.startedAt, isInProgress);

  const currentQuestion = questions[currentQuestionIndex] || null;
  const currentQuestionKey = String(
    currentQuestion?.questionId ?? currentQuestion?.id ?? currentQuestionIndex
  );

  const fetchSessionDetails = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        if (!resolvedDetailEndpoint) {
          throw new Error("Interview session detail endpoint is not available.");
        }

        const { payload, raw, message } =
          await fetchInterviewJson<InterviewRoomSession>(resolvedDetailEndpoint, {
            method: "GET",
          });

        const normalized = normalizeSession(payload);
        setSession(normalized);
        setSuccessMessage(message || "Interview session loaded successfully.");
        onSessionLoaded?.(normalized, raw);
      } catch (error: any) {
        console.error("InterviewRoom session fetch error:", error);
        setErrorMessage(error?.message || "Failed to load interview session.");
        setSession(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [resolvedDetailEndpoint, onSessionLoaded]
  );

  const fetchQuestions = useCallback(async () => {
    try {
      setLoadingQuestions(true);
      setErrorMessage(null);

      if (!resolvedQuestionsEndpoint) {
        throw new Error("Interview question endpoint is not available.");
      }

      const { payload, raw, message } =
        await fetchInterviewJson<InterviewRoomQuestion[] | { questions?: InterviewRoomQuestion[] }>(
          resolvedQuestionsEndpoint,
          {
            method: "GET",
          }
        );

      const list = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as any)?.questions)
          ? (payload as any).questions
          : [];

      const normalized = normalizeQuestions(list);
      setQuestions(normalized);
      setCurrentQuestionIndex(0);

      if (message) {
        setSuccessMessage(message);
      }

      onQuestionsLoaded?.(normalized, raw);
    } catch (error: any) {
      console.error("InterviewRoom questions fetch error:", error);
      setErrorMessage(error?.message || "Failed to load interview questions.");
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }, [resolvedQuestionsEndpoint, onQuestionsLoaded]);

  const startInterviewSession = useCallback(async () => {
    try {
      if (!resolvedStartEndpoint) return;

      const response = await fetch(
        resolvedStartEndpoint,
        getNoCacheFetchOptions("POST", {
          headers: getAuthHeaders(),
          body: JSON.stringify({}),
        })
      );

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const raw = await response.json();
      const msg = extractApiMessage(raw) || "Interview started successfully.";
      setSuccessMessage(msg);

      await fetchSessionDetails(true);
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to start interview session.");
    }
  }, [resolvedStartEndpoint, fetchSessionDetails]);

  useEffect(() => {
    if (!autoLoad) return;
    fetchSessionDetails();
  }, [autoLoad, fetchSessionDetails]);

  useEffect(() => {
    if (!autoLoad || !autoFetchQuestions || !resolvedQuestionsEndpoint) return;
    fetchQuestions();
  }, [autoLoad, autoFetchQuestions, resolvedQuestionsEndpoint, fetchQuestions]);

  useEffect(() => {
    if (!autoStartSession) return;
    if (!session) return;

    const status = resolveInterviewStatus(session);
    if (status === "CREATED" || status === "DRAFT") {
      startInterviewSession();
    }
  }, [autoStartSession, session, startInterviewSession]);

  useEffect(() => {
    if (!realtimeEnabled || !resolvedRealtimeWsUrl) {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      setRealtimeConnected(false);
      return;
    }

    const ws = new WebSocket(resolvedRealtimeWsUrl);
    websocketRef.current = ws;

    ws.onopen = () => {
      setRealtimeConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as RealtimeMessage;
        setRealtimeMessages((prev) => [parsed, ...prev].slice(0, 20));
        onRealtimeMessage?.(parsed);
      } catch {
        const parsed: RealtimeMessage = {
          type: "message",
          payload: event.data,
          sessionId: resolvedSessionId ?? undefined,
          timestamp: new Date().toISOString(),
        };
        setRealtimeMessages((prev) => [parsed, ...prev].slice(0, 20));
        onRealtimeMessage?.(parsed);
      }
    };

    ws.onerror = () => {
      setRealtimeConnected(false);
    };

    ws.onclose = () => {
      setRealtimeConnected(false);
    };

    return () => {
      ws.close();
      websocketRef.current = null;
    };
  }, [realtimeEnabled, resolvedRealtimeWsUrl, resolvedSessionId, onRealtimeMessage]);

  const handleSubmitAnswer = async () => {
    try {
      setSubmittingAnswer(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!currentQuestion) {
        throw new Error("No active question available.");
      }

      if (!answerInput.trim()) {
        throw new Error("Please enter your answer before submitting.");
      }

      if (!resolvedAnswerEndpoint) {
        throw new Error("Answer submission endpoint is not available.");
      }

      const payload = {
        sessionId: resolvedSessionId,
        interviewSessionId: resolvedSessionId,
        questionId: currentQuestion.questionId ?? currentQuestion.id,
        answer: answerInput.trim(),
        answerText: answerInput.trim(),
        elapsedTimeSeconds: elapsedSeconds,
        token: session?.token ?? session?.interviewToken,
        sessionToken: session?.token ?? session?.interviewToken,
      };

      const { payload: responsePayload, raw, message } = await postInterviewJson<
        InterviewRoomAnswer,
        typeof payload
      >(resolvedAnswerEndpoint, payload);

      const normalizedAnswer = normalizeAnswerPayload(responsePayload) || {
        questionId: currentQuestion.questionId ?? currentQuestion.id,
        answer: answerInput.trim(),
        answerText: answerInput.trim(),
        content: answerInput.trim(),
      };

      setSubmittedAnswers((prev) => ({
        ...prev,
        [currentQuestionKey]: normalizedAnswer,
      }));

      setSuccessMessage(message || "Answer submitted successfully.");
      setAnswerInput("");
      onAnswerSubmitted?.(responsePayload ?? raw, raw);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        await fetchSessionDetails(true);
      }
    } catch (error: any) {
      console.error("InterviewRoom answer submit error:", error);
      setErrorMessage(error?.message || "Failed to submit answer.");
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleGoToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    const q = questions[index];
    const key = String(q?.questionId ?? q?.id ?? index);
    const existing = submittedAnswers[key];
    setAnswerInput(existing?.answerText || existing?.answer || existing?.content || "");
  };

  const currentAnswered = Boolean(submittedAnswers[currentQuestionKey]);
  const completedCount = Object.keys(submittedAnswers).length;
  const progressPercent =
    questions.length > 0 ? Math.round((completedCount / questions.length) * 100) : 0;

  return (
    <div className={cn("space-y-6 text-white", className)}>
      {/* Task Popups */}
      {showTaskPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl animate-in fade-in zoom-in duration-300">
            {showTaskPopup === "typing" ? (
              <TypingTest onComplete={handleTaskComplete} />
            ) : (
              <CodeEditor onComplete={handleTaskComplete} />
            )}
          </div>
        </div>
      )}

      {/* Proctoring Banner */}
      {(proctoringMessage || tabWarning) && (
        <div className="bg-red-500 text-white p-3 rounded-2xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="font-bold">{proctoringMessage || "Warning: Proctored Session"}</span>
          </div>
          {tabWarning && <button onClick={() => setTabWarning(false)} className="text-xs underline">Dismiss</button>}
        </div>
      )}

      {/* Header / Session Info */}
      <div className="rounded-3xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
        <div className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
                <BrainCircuit size={22} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold">
                    {session ? resolveInterviewSessionTitle(session) : "Interview Room"}
                  </h1>

                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                    {role}
                  </span>

                  {session?.type && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-100">
                      {session.type}
                    </span>
                  )}

                  {session?.mode && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/20 bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-100">
                      {session.mode}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-white/55">
                  Backend-driven interview room with real-time AI feedback.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                    Session: {String(resolvedSessionId)}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                    <BadgeCheck size={12} />
                    Backend integrated
                  </span>

                  {isInProgress && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/20 bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-100">
                      <Clock3 size={12} />
                      {formatDuration(elapsedSeconds)}
                    </span>
                  )}

                  {realtimeEnabled && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold",
                        realtimeConnected
                          ? "border-green-400/20 bg-green-500/10 text-green-100"
                          : "border-yellow-400/20 bg-yellow-500/10 text-yellow-100"
                      )}
                    >
                      <Radio size={12} />
                      {realtimeConnected ? "Realtime Connected" : "Realtime Connecting"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchSessionDetails(true);
                if (autoFetchQuestions) fetchQuestions();
              }}
              disabled={disabled || loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh Room
            </button>
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

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="mb-1 text-xs text-white/45">Status</p>
              <p className="text-sm font-semibold text-white/85">{sessionStatus || "N/A"}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="mb-1 text-xs text-white/45">Job Title</p>
              <p className="text-sm font-semibold text-white/85">
                {session?.jobTitle || "N/A"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="mb-1 text-xs text-white/45">Company</p>
              <p className="text-sm font-semibold text-white/85">
                {session?.companyName || "N/A"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="mb-1 text-xs text-white/45">Progress</p>
              <p className="text-sm font-semibold text-white/85">
                {completedCount}/{questions.length} answered
              </p>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-linear-to-r from-blue-500 to-purple-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {showControls && (
        <InterviewControls
          session={session}
          onStarted={() => fetchSessionDetails(true)}
          onEnded={() => fetchSessionDetails(true)}
          onCancelled={() => fetchSessionDetails(true)}
          onEvaluated={(payload) => {
            if (payload) {
              setSuccessMessage("Interview evaluation loaded.");
            }
          }}
          onRealtimeChange={setRealtimeEnabled}
          initialRealtimeEnabled={autoConnectRealtime}
        />
      )}

      {showLanguageNotice && (
        <InterviewLanguageNotice
          sessionId={resolvedSessionId ?? undefined}
          session={session}
        />
      )}

      {/* Main Content: Questions and Evaluation */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText size={18} className="text-indigo-300" />
                  <h2 className="text-lg font-semibold">Interview Questions</h2>
                </div>

                <button
                  type="button"
                  onClick={fetchQuestions}
                  disabled={disabled || loadingQuestions}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/15 disabled:opacity-50"
                >
                  {loadingQuestions ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <RefreshCw size={15} />
                  )}
                  Refresh Questions
                </button>
              </div>

              <AnimatePresence mode="wait">
                {mcqPhase ? (
                  <motion.div key="mcq" className="space-y-6">
                    <div className="flex justify-between items-center mb-6 bg-white/5 p-4 rounded-2xl border">
                      <h2 className="text-xl font-bold">MCQ Technical Test</h2>
                      <div className="flex items-center gap-2 text-indigo-400 font-mono">
                        <Clock3 size={18} />
                        {formatDuration(mcqTimer)}
                      </div>
                    </div>
                    {mcqQuestions.map((q, idx) => (
                      <div key={idx} className="bg-white/5 p-6 rounded-3xl border border-white/10">
                        <p className="text-lg font-medium mb-4">{idx + 1}. {q.question}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.options.map((opt: string, optIdx: number) => (
                            <button 
                              key={optIdx}
                              onClick={() => setMcqAnswers(prev => ({...prev, [idx]: optIdx}))}
                              className={cn(
                                "p-4 rounded-xl border transition-all text-left",
                                mcqAnswers[idx] === optIdx ? "bg-indigo-600 border-indigo-400" : "bg-white/5 border-white/10 hover:bg-white/10"
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => setMcqPhase(false)}
                      className="w-full py-4 bg-indigo-600 rounded-2xl font-bold text-white hover:bg-indigo-700 transition"
                    >
                      Submit Test & Start Interview
                    </button>
                  </motion.div>
                ) : loading || loadingQuestions ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/20 bg-white/5 py-24 text-center"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
                      <div className="relative grid h-16 w-16 place-items-center rounded-full bg-white/10">
                        <Loader2 className="animate-spin text-indigo-400" size={32} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Preparing your interview...</h3>
                      <p className="mt-1 text-sm text-white/45">
                        We're fetching the latest questions and session details.
                      </p>
                    </div>
                  </motion.div>
                ) : questions.length > 0 ? (
                  <motion.div
                    key={`question-${currentQuestionIndex}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    {/* Question Navigation Chips */}
                    <div className="flex flex-wrap gap-2">
                      {questions.map((question, index) => {
                        const key = String(question.questionId ?? question.id ?? index);
                        const answered = Boolean(submittedAnswers[key]);
                        const active = index === currentQuestionIndex;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleGoToQuestion(index)}
                            className={cn(
                              "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                              active
                                ? "border-indigo-400/20 bg-indigo-500/15 text-indigo-100 scale-105 shadow-lg shadow-indigo-500/20"
                                : answered
                                  ? "border-green-400/20 bg-green-500/10 text-green-100"
                                  : "border-white/10 bg-white/10 text-white/75 hover:bg-white/15"
                            )}
                          >
                            Q{index + 1}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Question Box */}
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-6 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Bot size={80} />
                      </div>
                      <div className="mb-4 flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                          <Bot size={18} />
                        </div>
                        <p className="text-sm font-bold tracking-tight text-white/90 uppercase">
                          Question {currentQuestionIndex + 1} of {questions.length}
                        </p>
                      </div>

                      <p className="whitespace-pre-wrap wrap-break-word text-xl font-medium leading-relaxed text-white/95">
                        {extractQuestionText(currentQuestion)}
                      </p>
                    </div>

                    {/* Answer Area */}
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-6 shadow-inner">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                            <User2 size={18} />
                          </div>
                          <p className="text-sm font-bold tracking-tight text-white/90 uppercase">
                            Your Answer
                          </p>
                        </div>
                        {currentAnswered && (
                           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                             <CheckCircle2 size={12} />
                             Submitted
                           </div>
                        )}
                      </div>

                      <textarea
                        value={answerInput}
                        onChange={(e) => setAnswerInput(e.target.value)}
                        disabled={disabled || submittingAnswer || isCompleted}
                        placeholder="Type your response here..."
                        className="min-h-62.5 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-lg leading-relaxed text-white placeholder:text-white/20 outline-none transition-all focus:border-indigo-400/50 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/5 disabled:opacity-60"
                      />

                      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {!currentAnswered ? (
                            <button
                              type="button"
                              onClick={handleSubmitAnswer}
                              disabled={
                                disabled ||
                                submittingAnswer ||
                                !currentQuestion ||
                                !answerInput.trim()
                              }
                              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-8 py-4 font-bold text-white shadow-xl shadow-indigo-600/20 transition-all hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                            >
                              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                              {submittingAnswer ? (
                                <>
                                  <Loader2 size={20} className="animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <Send size={20} />
                                  Submit Answer
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="flex items-center gap-4">
                              {currentQuestionIndex < questions.length - 1 ? (
                                <button
                                  type="button"
                                  onClick={() => handleGoToQuestion(currentQuestionIndex + 1)}
                                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-8 py-4 font-bold text-white transition hover:bg-white/15 hover:border-white/20"
                                >
                                  Next Question
                                  <ArrowRight size={20} />
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 px-6 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                                  <CheckCircle2 size={20} />
                                  Final Question Completed
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Instant Feedback if available */}
                    {submittedAnswers[currentQuestionKey]?.feedback && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-sm"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles size={18} className="text-indigo-400" />
                            <p className="text-sm font-bold tracking-tight text-white/90 uppercase">
                              Instant Evaluation
                            </p>
                          </div>
                          {submittedAnswers[currentQuestionKey].score && (
                             <div className="text-2xl font-black text-indigo-400">
                               {submittedAnswers[currentQuestionKey].score}%
                             </div>
                          )}
                        </div>

                        <p className="whitespace-pre-wrap wrap-break-word text-base leading-relaxed text-white/80">
                          {submittedAnswers[currentQuestionKey].feedback}
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="no-questions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/20 bg-white/5 py-24 text-center"
                  >
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-white/10">
                      <FileText className="text-white/40" size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">No questions available</h3>
                      <p className="mt-1 text-sm text-white/45">
                        Start the interview session to generate your personalized questions.
                      </p>
                    </div>
                    <button
                      onClick={startInterviewSession}
                      className="mt-4 rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-indigo-500"
                    >
                      Start Interview
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sidebar: Summary and Evaluation */}
        <div className="space-y-6 xl:col-span-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="p-0">
              <div className="aspect-video bg-black relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/80 rounded-lg text-[10px] font-bold flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE PROCTORING
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <History size={18} className="text-indigo-300" />
                <h2 className="text-lg font-semibold">Navigation</h2>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">Current Question</p>
                  <p className="text-sm font-semibold text-white/85">
                    {questions.length > 0
                      ? `${currentQuestionIndex + 1} / ${questions.length}`
                      : "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">Answered</p>
                  <p className="text-sm font-semibold text-white/85">
                    {completedCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">Completion</p>
                  <p className="text-sm font-semibold text-white/85">
                    {progressPercent}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {showFeedbackPanel && (
            <InterviewFeedbackPanel
              sessionId={resolvedSessionId ?? undefined}
              session={session}
              endpoint={resolvedEvaluationEndpoint}
              autoFetch={isCompleted}
              title="Interview Evaluation"
              subtitle="Performance summary from backend."
              onLoaded={(evaluation: InterviewFeedbackEvaluation | null) => {
                if (evaluation) {
                  setSuccessMessage("Interview evaluation synced.");
                }
              }}
            />
          )}

          {realtimeEnabled && (
            <div className="rounded-3xl border border-white/10 bg-white/5 shadow-xl backdrop-blur-xl">
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Radio size={18} className="text-indigo-300" />
                  <h2 className="text-lg font-semibold">Realtime Events</h2>
                </div>

                {realtimeMessages.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
                    <PlayCircle className="mx-auto text-white/35" size={26} />
                    <p className="mt-3 font-medium text-white/70">
                      No realtime events yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {realtimeMessages.map((message, index) => (
                      <div
                        key={`${message.timestamp || "msg"}-${index}`}
                        className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-indigo-400/20 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-100">
                            {message.type || message.event || "message"}
                          </span>
                        </div>

                        <pre className="overflow-x-auto whitespace-pre-wrap wrap-break-word text-xs text-white/70">
                          {typeof message.payload === "string"
                            ? message.payload
                            : JSON.stringify(message.payload ?? message, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
