"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Editor from "@monaco-editor/react";
import {
  Brain,
  Loader2,
  Mic,
  MicOff,
  MonitorSmartphone,
  Play,
  RefreshCw,
  Video,
  VideoOff,
} from "lucide-react";
import { interviewApi } from "../../../lib/interviewApi";
import type { InterviewQuestionResponse } from "../../../lib/interviewApi";

type NullableString = string | null | undefined;

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: Array<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEventLike) => void;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionType;

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

interface InterviewSessionData {
  sessionId?: string;
  id?: string;
  token?: string;
  interviewToken?: string;
  interviewMode?: string;
  mode?: string;
  domain?: string;
  category?: string;
  question?: string;
  currentQuestion?: string | { question?: string };
  transcript?: string;
  status?: string;
  jobDescription?: string;
  salaryRangeMin?: string | number;
  salaryRangeMax?: string | number;
  salary?: string | number;
  unansweredQuestions?: number;
  remainingQuestions?: number;
}

interface TypingStats {
  correct: number;
  incorrect: number;
  accuracy: number;
  wpm: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  me: `${API_BASE_URL}/api/auth/me`,
  getSessionById: (sessionId: string) =>
    `${API_BASE_URL}/api/user/interview/session/${sessionId}`,
  updateTranscript: (sessionId: string) =>
    `${API_BASE_URL}/api/user/interview/session/${sessionId}/transcript`,
  saveTypingResult: (sessionId: string) =>
    `${API_BASE_URL}/api/user/interview/session/${sessionId}/typing-result`,
};

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

function normalizeInterviewCategory(category: string): string {
  const normalized = category
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_+/g, "-");
  const allowedCategories = [
    "document-verification",
    "sales",
    "call-center",
  ];
  return allowedCategories.includes(normalized)
    ? normalized
    : "document-verification";
}

function getInterviewTitle(category: string, domain: string): string {
  const normalizedCategory = category.trim().toLowerCase();
  const normalizedDomain = domain.trim().toLowerCase();

  if (/hr/.test(normalizedCategory) || /hr/.test(normalizedDomain)) {
    return "HR Interview";
  }
  if (normalizedCategory === "document-verification") {
    return "Document Verification Interview";
  }
  if (normalizedCategory === "sales") {
    return "Sales Interview";
  }
  if (normalizedCategory === "call-center") {
    return "Call Center Interview";
  }
  if (category) {
    return `${category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Interview`;
  }
  if (domain) {
    return `${domain.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Interview`;
  }

  return "Live Interview";
}

function formatTime(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function formatSalaryValue(value?: string | number | null): string {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const normalized = typeof value === "number" ? value : String(value).replace(/[^0-9.]/g, "");
  const amount = Number(normalized);
  if (Number.isNaN(amount)) {
    return String(value);
  }

  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function getReadingText(difficulty: "easy" | "medium" | "hard") {
  if (difficulty === "easy") {
    return "Please read this sentence clearly: The small brown dog jumps over the quiet cat.";
  }
  if (difficulty === "medium") {
    return "Please read the following sentence aloud: Success usually comes to those who prepare and speak clearly.";
  }
  return "Please read the following passage aloud: The quick brown fox jumps over the lazy dog while describing your strengths and speaking with confidence.";
}

function getStatusBadge(
  label: string,
  active: boolean,
  activeText: string,
  inactiveText: string
) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-500" : "bg-rose-500"}`} />
      {label}: {active ? activeText : inactiveText}
    </span>
  );
}

function getFallbackQuestion(category: string) {
  const normalized = category.toLowerCase();

  if (normalized === "coding") {
    return "Write a function to reverse a string.";
  }

  if (normalized === "document-verification") {
    return "Let's check your typing speed skill.";
  }

  if (normalized === "sales") {
    return "Give a short summary of your sales approach for building relationships and closing opportunities.";
  }

  if (normalized === "call-center" || normalized === "callcenter") {
    return "How do you handle a difficult customer call while staying calm and professional?";
  }

  return `Tell me about your experience in ${category || "this domain"}.`;
}

type InterviewStage =
  | "WELCOME"
  | "INTRODUCTION"
  | "SCREENING"
  | "TECHNICAL"
  | "BEHAVIORAL"
  | "ROLE"
  | "HR"
  | "READING"
  | "TYPING"
  | "SALARY"
  | "COMPLETE";

type InterviewRound = {
  label: string;
  prompt: string;
  stage: InterviewStage;
};

function getRoleRoundPrompt(category: string) {
  const normalized = category.toLowerCase();

  if (normalized === "document-verification") {
    return "Role round: Describe how you ensure documents are verified accurately and securely while processing a high volume of cases.";
  }

  if (normalized === "sales") {
    return "Role round: Describe your approach to qualifying potential customers and closing deals while building trust.";
  }

  if (normalized === "call-center") {
    return "Role round: Explain how you handle a difficult customer call, maintain calm, and follow company policy.";
  }

  return "Role round: Describe how you approach your responsibilities and maintain quality in your work.";
}

function getScreeningPrompt(category: string) {
  const normalized = category.toLowerCase();

  if (normalized === "document-verification") {
    return "Screening round: How do you verify documents and ensure accuracy while working efficiently under time pressure?";
  }

  if (normalized === "sales") {
    return "Screening round: How do you qualify a potential lead while keeping the customer comfortable and informed?";
  }

  if (normalized === "call-center") {
    return "Screening round: How do you stay calm and polite while resolving a difficult customer request?";
  }

  return "Screening round: Tell me how you stay organized and accurate while handling day-to-day work tasks.";
}

function safeRandomToken() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}`;
}

export default function InterviewPage() {
  const router = useRouter();
  const params = useSearchParams();

  const domainParam = params.get("domain") || "";
  const categoryParam = params.get("category") || "";
  const tokenParam = params.get("token") || "";
  const sessionIdParam = params.get("sessionId") || "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const transcriptSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiBoxDragging = useRef(false);
  const aiBoxDragOffset = useRef({ x: 0, y: 0 });
  const typingInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [authChecking, setAuthChecking] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [question, setQuestion] = useState("Loading interview focus...");
  const [resolvedSessionId, setResolvedSessionId] = useState(sessionIdParam);
  const [resolvedToken, setResolvedToken] = useState(tokenParam || safeRandomToken());
  const [resolvedDomain, setResolvedDomain] = useState(domainParam);
  const [resolvedCategory, setResolvedCategory] = useState(categoryParam);

  const normalizedCategory = useMemo(
    () => normalizeInterviewCategory(resolvedCategory),
    [resolvedCategory]
  );

  const normalizedDomain = useMemo(
    () => normalizeString(resolvedDomain) || "Non-Tech",
    [resolvedDomain]
  );

  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [faceCheckStatus, setFaceCheckStatus] = useState<string>("Awaiting face check");
  const [faceCheckWarning, setFaceCheckWarning] = useState<string | null>(null);
  const [faceCheckLastSeen, setFaceCheckLastSeen] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [aiBoxPosition, setAiBoxPosition] = useState({ x: 0, y: 0 });
  const [aiCardMinimized, setAiCardMinimized] = useState(false);
  const faceCheckIntervalRef = useRef<number | null>(null);
  const [aiBoxColor, setAiBoxColor] = useState("#0f172a");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [showTypingTest, setShowTypingTest] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [timeLimit] = useState(60);
  const [timeLeft, setTimeLeft] = useState(60);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [savingTypingResult, setSavingTypingResult] = useState(false);

  const [profileName, setProfileName] = useState("Candidate");
  const [interviewStage, setInterviewStage] = useState<InterviewStage>("WELCOME");
  const [voiceRoundIndex, setVoiceRoundIndex] = useState(0);
  const [rounds, setRounds] = useState<Array<InterviewRound>>([]);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestionResponse | null>(null);
  const [interviewRecording, setInterviewRecording] = useState(false);
  const [interviewRecordingUrl, setInterviewRecordingUrl] = useState<string | null>(null);
  const [recordedAnswer, setRecordedAnswer] = useState("");
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [assistantMessage, setAssistantMessage] = useState<string>("");
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);
  const [autoAdvanceStatus, setAutoAdvanceStatus] = useState<string | null>(null);
  const [showReadingPopup, setShowReadingPopup] = useState(false);
  const [salaryExpectation, setSalaryExpectation] = useState("");
  const [salaryNegotiationMessage, setSalaryNegotiationMessage] = useState<string | null>(null);
  const [companySalaryMin, setCompanySalaryMin] = useState<number | null>(null);
  const [companySalaryMax, setCompanySalaryMax] = useState<number | null>(null);
  const [isMockInterview, setIsMockInterview] = useState(false);
  const [salaryFormError, setSalaryFormError] = useState<string | null>(null);

  const interviewRecorderRef = useRef<MediaRecorder | null>(null);
  const agentAudioRef = useRef<HTMLAudioElement | null>(null);
  const roundTranscriptStartRef = useRef(0);
  const silenceTimerRef = useRef<number | null>(null);
  const token = useMemo(() => getAuthToken(), []);

  const easyText =
    "after it follow or each never give follow some when during but up nation play what by over other call again in we before these hand good house word even seem";
  const mediumText =
    "Success usually comes to those who are too busy to be looking for it. Opportunities do not happen, you create them.";
  const hardText =
    "The quick brown fox jumps over the lazy dog while analyzing asynchronous JavaScript execution contexts and algorithmic complexity.";

  const targetText = useMemo(() => {
    if (difficulty === "easy") return easyText;
    if (difficulty === "medium") return mediumText;
    return hardText;
  }, [difficulty, easyText, mediumText, hardText]);

  const speakAgentText = useCallback(async (text: string) => {
    if (!text.trim() || typeof window === "undefined") {
      return;
    }

    setSpeechError(null);

    try {
      const formData = new FormData();
      formData.append("text", text);
      formData.append("voice", "female");
      formData.append("language", "en-IN");
      formData.append("output_format", "mp3");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch("/api/speech/synthesize", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `Speech synthesis failed (${response.status}). Using text mode instead.`;
        console.error(`Speech synthesis failed [${response.status}]:`, errorText);
        setSpeechError(errorMessage);
        setAiSpeaking(false);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], {
        type: response.headers.get("Content-Type") || "audio/mpeg",
      });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = 1.0;
      audio.autoplay = true;
      audio.muted = false;

      agentAudioRef.current?.pause();
      agentAudioRef.current = audio;
      setAiSpeaking(true);

      audio.onended = () => {
        setAiSpeaking(false);
        if (agentAudioRef.current === audio) {
          agentAudioRef.current = null;
        }
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setAiSpeaking(false);
        if (agentAudioRef.current === audio) {
          agentAudioRef.current = null;
        }
        URL.revokeObjectURL(url);
        const errorCode = audio.error?.code || 0;
        const errorMsg = ['MEDIA_ERR_ABORTED', 'MEDIA_ERR_NETWORK', 'MEDIA_ERR_DECODE', 'MEDIA_ERR_SRC_NOT_SUPPORTED'][errorCode] || 'UNKNOWN';
        console.error(`Audio playback error [${errorMsg}]:`, audio.error);
        setSpeechError(`Audio playback error: ${errorMsg}`);
      };

      await audio.play();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.error("Speech synthesis timeout");
        setSpeechError("Speech synthesis timeout. Please try again.");
      } else {
        console.error("AI speech playback failed", error);
        setSpeechError("Unable to reach the speech service. Please try again.");
      }
      setAiSpeaking(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      agentAudioRef.current?.pause();
      agentAudioRef.current = null;
    };
  }, []);

  // Clear speech error after 5 seconds
  useEffect(() => {
    if (speechError) {
      const timer = setTimeout(() => setSpeechError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [speechError]);

  const calculateStats = useCallback((): TypingStats => {
    let correct = 0;
    const normalizedInput = input || "";

    for (let i = 0; i < normalizedInput.length; i++) {
      if (normalizedInput[i] === targetText[i]) correct++;
    }

    const incorrect = normalizedInput.length - correct;
    const accuracy =
      normalizedInput.length > 0 ? Math.round((correct / normalizedInput.length) * 100) : 100;
    const minutes = (timeLimit - timeLeft) / 60;
    const wpm = minutes > 0 ? Math.round(correct / 5 / minutes) : 0;

    return { correct, incorrect, accuracy, wpm };
  }, [input, targetText, timeLeft, timeLimit]);

  const typingStats = calculateStats();

  const stopRecognition = useCallback(() => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch {
      // ignore
    }
    recognitionRef.current = null;
  }, []);

  const stopFaceCheck = useCallback(() => {
    if (faceCheckIntervalRef.current) {
      window.clearInterval(faceCheckIntervalRef.current);
      faceCheckIntervalRef.current = null;
    }
  }, []);

  const createFrameData = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const context = canvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  const sendFaceCheck = useCallback(async () => {
    if (!started || !sessionReady) {
      return;
    }

    const imageDataUrl = createFrameData();
    if (!imageDataUrl) {
      return;
    }

    try {
      const response = await fetch("/api/interview/face-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          image_data: imageDataUrl,
          session_id: resolvedSessionId,
        }),
      });

      const json = await response.json();
      const data = unwrapResponse<Record<string, any>>(json);
      const visible =
        data?.visible === true ||
        String(data?.visible).toLowerCase() === "true";
      const message = String(data?.message ?? "Face check completed.");
      const warning = data?.warning ? String(data.warning) : null;

      setFaceCheckStatus(message);
      setFaceCheckWarning(warning);
      setFaceCheckLastSeen(new Date().toLocaleTimeString());

      if (!visible) {
        setCameraError(
          warning || "No face detected. Please reposition your camera so your face is fully visible."
        );
      } else {
        setCameraError(null);
      }
    } catch (err) {
      setFaceCheckStatus("Face check failed.");
      setFaceCheckWarning("Unable to verify face visibility.");
      setCameraError(
        "Unable to verify camera feed. Please ensure your camera is connected and allowed."
      );
    }
  }, [createFrameData, resolvedSessionId, sessionReady, started]);

  const stopCamera = useCallback(() => {
    stopFaceCheck();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopFaceCheck]);

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

      setProfileName(
        meData.fullName || meData.firstName || meData.name || "Candidate"
      );

      if (!isUserRole(meData.userRole ?? meData.role, meData.roles)) {
        router.replace("/admin");
        return false;
      }

      return true;
    } catch {
      clearStoredAuth();
      router.replace("/auth/login");
      return false;
    } finally {
      setAuthChecking(false);
    }
  }, [router, token]);

  const fetchSessionDetails = useCallback(async () => {
    if (!resolvedSessionId) {
      setQuestion(getFallbackQuestion(normalizedCategory));
      setPageLoading(false);
      return;
    }

    try {
      setError(null);

      const response = await fetch(API_ROUTES.getSessionById(resolvedSessionId), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load session. Status ${response.status}`);
      }

      const json = await response.json().catch(() => null);
      const data = unwrapResponse<InterviewSessionData>(
        json as ApiEnvelope<InterviewSessionData> | InterviewSessionData | null
      );

      if (data) {
        setResolvedSessionId(
          normalizeString(data.sessionId ?? data.id, resolvedSessionId)
        );
        setResolvedToken(
          normalizeString(
            data.interviewToken ?? data.token,
            resolvedToken || safeRandomToken()
          )
        );
        const loadedDomain = normalizeString(data.domain, resolvedDomain);
        const loadedCategory = normalizeString(data.category, resolvedCategory);
        const normalizedLoadedCategory = normalizeInterviewCategory(loadedCategory);

        setResolvedDomain(loadedDomain);
        setResolvedCategory(loadedCategory);

        const backendQuestion = normalizeString(
          typeof data.currentQuestion === "string"
            ? data.currentQuestion
            : data.currentQuestion?.question ?? data.question
        );
        setQuestion(
          backendQuestion ||
            getFallbackQuestion(normalizedLoadedCategory)
        );

        const backendTranscript = normalizeString(data.transcript);
        if (backendTranscript) {
          setTranscript(backendTranscript);
        }

        const rawMode = normalizeString(data.interviewMode || data.mode);
        setIsMockInterview(/mock/i.test(rawMode));

        setCompanySalaryMin(
          Number(String(data.salaryRangeMin ?? data.salary ?? "").replace(/[^0-9.]/g, "")) || null
        );
        setCompanySalaryMax(
          Number(String(data.salaryRangeMax ?? data.salary ?? "").replace(/[^0-9.]/g, "")) || null
        );
      }
    } catch {
      setQuestion(getFallbackQuestion(normalizedCategory));
      setInfoMessage(
        "Interview session loaded with fallback question flow because some backend interview details are not available yet."
      );
    } finally {
      setPageLoading(false);
    }
  }, [normalizedCategory, resolvedCategory, resolvedDomain, resolvedSessionId, resolvedToken, token]);

  const requestCameraAndMic = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera and microphone access is not available in this browser.");
      setSessionReady(false);
      return;
    }

    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => {
          /* ignore autoplay or playback restrictions */
        });
      }

      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      const canStart = hasVideo && hasAudio;

      setCameraEnabled(hasVideo);
      setMicEnabled(hasAudio);
      setSessionReady(canStart);

      if (!canStart) {
        setCameraError("Camera and microphone must both be enabled to start the interview.");
      } else {
        setCameraError(null);
      }
    } catch {
      setCameraError("Camera and microphone must both be enabled to start the interview.");
      setCameraEnabled(false);
      setMicEnabled(false);
      setSessionReady(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    const gradientOptions = [
      "linear-gradient(135deg, #0f172a, #4338ca)",
      "linear-gradient(135deg, #111827, #7c3aed)",
      "linear-gradient(135deg, #0f172a, #16a34a)",
      "linear-gradient(135deg, #111827, #0ea5e9)",
      "linear-gradient(135deg, #1f2937, #c084fc)",
    ];
    const index = Math.floor(Math.random() * gradientOptions.length);
    setAiBoxColor(gradientOptions[index]);
  }, []);

  useEffect(() => {
    if (!started) return;

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [started]);

  useEffect(() => {
    if (!started || !mediaStreamRef.current) return;

    mediaStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled;
    });
  }, [started, micEnabled]);

  useEffect(() => {
    if (!started || !micEnabled) return;

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const recognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!recognitionCtor) {
      setCameraError(
        "Speech recognition is not supported in this browser. Please use a supported browser."
      );
      setSessionReady(false);
      return;
    }

    const recognition = new recognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let appendedText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          appendedText += ` ${event.results[i][0].transcript}`;
        }
      }

      if (appendedText.trim()) {
        setTranscript((prev) => `${prev}${appendedText}`.trim());
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // ignore recognition start failure
    }

    return () => {
      stopRecognition();
    };
  }, [started, micEnabled, stopRecognition]);

  useEffect(() => {
    if (!started || !resolvedSessionId) return;
    if (!transcript.trim()) return;

    if (transcriptSyncTimeoutRef.current) {
      clearTimeout(transcriptSyncTimeoutRef.current);
    }

    transcriptSyncTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(API_ROUTES.updateTranscript(resolvedSessionId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            transcript: transcript.trim(),
            secondsElapsed: seconds,
            token: resolvedToken,
            sessionToken: resolvedToken,
          }),
        });
      } catch {
        // ignore transcript sync failure
      }
    }, 1200);

    return () => {
      if (transcriptSyncTimeoutRef.current) {
        clearTimeout(transcriptSyncTimeoutRef.current);
      }
    };
  }, [resolvedSessionId, seconds, started, token, transcript, resolvedToken]);

  useEffect(() => {
    if (
      started &&
      normalizedCategory === "document-verification" &&
      question.toLowerCase().includes("typing")
    ) {
      setShowTypingTest(true);
    }
  }, [question, normalizedCategory, started]);

  useEffect(() => {
    if (!isTyping) return;

    if (timeLeft === 0) {
      setIsTyping(false);
      setShowResult(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isTyping, timeLeft]);

  useEffect(() => {
    if (!isTyping) return;
    typingInputRef.current?.focus();
  }, [isTyping]);

  useEffect(() => {
    if (!started || !sessionReady) {
      return;
    }

    sendFaceCheck();
    faceCheckIntervalRef.current = window.setInterval(sendFaceCheck, 20000);

    return () => {
      stopFaceCheck();
    };
  }, [sendFaceCheck, sessionReady, started, stopFaceCheck]);

  useEffect(() => {
    return () => {
      stopFaceCheck();
    };
  }, [stopFaceCheck]);

  const handleStartInterview = async () => {
    setStartingSession(true);
    setError(null);

    if (!resolvedSessionId) {
      setError("Unable to start interview without a valid session ID.");
      setStartingSession(false);
      return;
    }

    if (!sessionReady) {
      setError("Please allow camera and microphone access before starting the interview.");
      setStartingSession(false);
      return;
    }

    try {
      await requestFullScreen();
      await interviewApi.startInterviewSession(resolvedSessionId, {
        token: resolvedToken,
        domain: normalizedDomain,
        category: normalizedCategory,
      });

      // Get the first LLM-generated question instead of static rounds
      const firstQuestion = await interviewApi.getInterviewNextQuestion(resolvedSessionId);
      setCurrentQuestion(firstQuestion);
      setQuestion(firstQuestion.question || "Welcome! Please introduce yourself and share your background.");
      setInterviewStage("INTRODUCTION");
      setAssistantMessage(
        `Good evening ${profileName}. Let's begin your interview with an introduction.`
      );
      setStarted(true);
      prepareForAnswer();
      await startInterviewRecording();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Unable to start interview session. Please try again or refresh the page.";
      setError(message);
    } finally {
      setStartingSession(false);
    }
  };

  const handleSaveTypingResult = async () => {
    if (!resolvedSessionId) {
      setShowTypingTest(false);
      setShowResult(false);
      return;
    }

    try {
      setSavingTypingResult(true);

      await fetch(API_ROUTES.saveTypingResult(resolvedSessionId), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          domain: normalizedDomain,
          category: normalizedCategory,
          difficulty,
          timeLimit,
          timeSpent: timeLimit - timeLeft,
          ...typingStats,
          token: resolvedToken,
          sessionToken: resolvedToken,
        }),
      });
    } catch {
      setInfoMessage(
        "Typing result was recorded locally, but backend typing result sync is not fully available yet."
      );
    } finally {
      setSavingTypingResult(false);
      setShowTypingTest(false);
      setShowResult(false);

      if (interviewStage === "TYPING") {
        advanceInterviewRound();
      }
    }
  };

  const buildInterviewRounds = useCallback(() => {
    const name = profileName || "Candidate";

    const nextRounds: Array<InterviewRound> = [
      {
        label: "Introduction",
        prompt: `Welcome ${name}. Please introduce yourself and share your background and strengths for this interview.`,
        stage: "WELCOME",
      },
      {
        label: "Screening",
        prompt: getScreeningPrompt(normalizedCategory),
        stage: "SCREENING",
      },
      {
        label: "Life Story",
        prompt:
          "HR round: Tell me about a time you adapted to a change in your personal or professional life and what you learned from it.",
        stage: "HR",
      },
      {
        label: "Reading",
        prompt:
          "Reading exercise: Please read the line shown in the popup clearly and confidently. When you're done, continue to the typing test.",
        stage: "READING",
      },
      {
        label: "Typing Test",
        prompt:
          "Typing test: Please open the typing exercise and type the sentence as accurately as possible. When you are finished, save your result to continue.",
        stage: "TYPING",
      },
      {
        label: "Salary",
        prompt:
          "Salary round: Tell me the salary you are aiming for, and we will negotiate the best fit for you and the company.",
        stage: "SALARY",
      },
    ];

    return nextRounds;
  }, [profileName, normalizedCategory]);

  const prepareForAnswer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    roundTranscriptStartRef.current = transcript.length;
    setAwaitingAnswer(true);
    setRecordedAnswer("");
    setAutoAdvanceStatus(
      "Answer recording is active. Please speak your response clearly."
    );
    setSpeechStatus(
      "Listening for your answer. The system will continue automatically after a short pause."
    );
    setAssistantMessage(
      "Please answer the question after the voice prompt. I will move to the next question automatically."
    );
  }, [transcript.length]);

  const stopInterviewRecording = useCallback(() => {
    if (interviewRecorderRef.current) {
      interviewRecorderRef.current.stop();
      interviewRecorderRef.current = null;
    }

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    setInterviewRecording(false);
  }, []);

  const advanceInterviewRound = useCallback(async () => {
    if (!resolvedSessionId) {
      setError("Session ID is required to continue the interview.");
      return;
    }

    try {
      // Handle special stages
      if (interviewStage === "READING") {
        setInterviewStage("TYPING");
        setQuestion(
          "Typing test: Please open the typing exercise and type the sentence as accurately as possible. When you are finished, save your result to continue."
        );
        setAssistantMessage("Now let's test your typing skills.");
        setRecordedAnswer("");
        setSpeechStatus(null);
        setRecordError(null);
        setAwaitingAnswer(false);
        setAutoAdvanceStatus(null);
        setShowTypingTest(true);
        return;
      }

      if (interviewStage === "TYPING") {
        setInterviewStage("SALARY");
        setQuestion(
          "Salary round: Tell me the salary you are aiming for, and we will negotiate the best fit for you and the company."
        );
        setAssistantMessage("Finally, let's discuss salary expectations.");
        setRecordedAnswer("");
        setSpeechStatus(null);
        setRecordError(null);
        setAwaitingAnswer(false);
        setAutoAdvanceStatus(null);
        return;
      }

      if (interviewStage === "SALARY") {
        setInterviewStage("COMPLETE");
        setAwaitingAnswer(false);
        setQuestion(
          "The interview is complete. Thank you for your time. We will save your responses and share the results shortly."
        );
        setAssistantMessage("Great work. This concludes the interview.");
        stopInterviewRecording();
        return;
      }

      if (currentQuestion?.finalQuestion) {
        setInterviewStage("READING");
        setQuestion(
          "Reading exercise: Please read the line shown in the popup clearly and confidently. When you're done, continue to the typing test."
        );
        setAssistantMessage("Now let's test your reading and typing skills.");
        setRecordedAnswer("");
        setSpeechStatus(null);
        setRecordError(null);
        setAwaitingAnswer(false);
        setAutoAdvanceStatus(null);
        setShowReadingPopup(true);
        return;
      }

      const nextQuestion = await interviewApi.getInterviewNextQuestion(resolvedSessionId);
      setCurrentQuestion(nextQuestion);

      let stage: InterviewStage = "TECHNICAL";
      if (nextQuestion.questionType?.toLowerCase().includes("hr")) {
        stage = "HR";
      } else if (nextQuestion.questionType?.toLowerCase().includes("behavioral")) {
        stage = "BEHAVIORAL";
      }

      setInterviewStage(stage);
      setQuestion(nextQuestion.question || "Please continue with your response.");
      setAssistantMessage(`Question ${nextQuestion.questionIndex || 'next'}: ${nextQuestion.category || 'Technical'} question.`);
      setRecordedAnswer("");
      setSpeechStatus(null);
      setRecordError(null);
      setAwaitingAnswer(true);
      setAutoAdvanceStatus("Answer recording is active. Please speak your response clearly.");

      prepareForAnswer();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Unable to get the next question. Please try again.";
      setError(message);
      setInterviewStage("COMPLETE");
      setAwaitingAnswer(false);
      setQuestion("The interview encountered an error. Please contact support.");
      setAssistantMessage("An error occurred during the interview.");
      stopInterviewRecording();
    }
  }, [resolvedSessionId, currentQuestion, interviewStage, prepareForAnswer, stopInterviewRecording]);

  const handleReadingContinue = useCallback(() => {
    setShowReadingPopup(false);
    advanceInterviewRound();
  }, [advanceInterviewRound]);

  const handleSubmitSalary = useCallback(() => {
    setSalaryFormError(null);

    if (!salaryExpectation.trim()) {
      setSalaryFormError("Please enter the salary you are aiming for.");
      return;
    }

    const formattedSalary = salaryExpectation.trim();
    const negotiationSummary = isMockInterview
      ? `This is a mock interview; salary negotiation is not required. Your requested salary is ${formattedSalary}.`
      : companySalaryMin
      ? `Thanks. We will negotiate starting from ${formatSalaryValue(companySalaryMin)} and your target of ${formattedSalary}.`
      : `Thanks. Your salary expectation of ${formattedSalary} is noted and we will negotiate the best fit.`;

    setSalaryNegotiationMessage(negotiationSummary);
    setAssistantMessage(negotiationSummary);
    advanceInterviewRound();
  }, [salaryExpectation, isMockInterview, companySalaryMin, advanceInterviewRound]);

  const startInterviewRecording = useCallback(async () => {
    if (interviewRecording || !mediaStreamRef.current) return;

    try {
      if (typeof MediaRecorder === "undefined") {
        throw new Error("Recording is not supported in this browser.");
      }

      const stream = mediaStreamRef.current;
      const audioStream = new MediaStream(stream.getAudioTracks());
      if (audioStream.getAudioTracks().length === 0) {
        throw new Error("Audio track unavailable for interview recording.");
      }

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/mpeg",
      ];
      const mimeType = supportedTypes.find((type) =>
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)
      ) || "";
      const recorder = mimeType
        ? new MediaRecorder(audioStream, { mimeType })
        : new MediaRecorder(audioStream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setInterviewRecordingUrl(url);
        setAutoAdvanceStatus(
          "The full interview audio was recorded and is ready for review."
        );
      };

      recorder.start();
      interviewRecorderRef.current = recorder;
      setInterviewRecording(true);
      setAutoAdvanceStatus("Recording the interview automatically.");
    } catch (error) {
      console.error("Failed to start full interview recording", error);
      setAutoAdvanceStatus(
        "Unable to start automatic interview recording. Please allow microphone access."
      );
    }
  }, [interviewRecording]);

  useEffect(() => {
    if (!started || !awaitingAnswer) return;

    const currentAnswer = transcript.slice(roundTranscriptStartRef.current).trim();
    if (!currentAnswer) return;

    setRecordedAnswer(currentAnswer);
    setAutoAdvanceStatus(
      "Captured your answer. Waiting for a brief pause to continue."
    );

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    silenceTimerRef.current = window.setTimeout(() => {
      if (!awaitingAnswer) return;
      if (!currentAnswer) return;
      setAwaitingAnswer(false);
      advanceInterviewRound();
    }, 2600);

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [advanceInterviewRound, awaitingAnswer, started, transcript]);

  const handleEndInterview = async () => {
    try {
      setEndingSession(true);
      stopRecognition();
      stopInterviewRecording();
      stopCamera();

      if (resolvedSessionId) {
        await interviewApi.endInterviewSession(resolvedSessionId, {
          transcript: transcript.trim(),
          secondsElapsed: seconds,
          domain: normalizedDomain,
          category: normalizedCategory,
          token: resolvedToken,
          sessionToken: resolvedToken,
        });
      }

      router.push("/user/dashboard");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Unable to end the interview session. Please try again or contact support.";
      setError(message);
    } finally {
      setEndingSession(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const allowed = await validateUserAccess();
      if (!allowed || cancelled) return;

      if (!tokenParam && !sessionIdParam) {
        router.replace("/user/dashboard");
        return;
      }

      await fetchSessionDetails();
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [fetchSessionDetails, router, sessionIdParam, tokenParam, validateUserAccess]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const defaultRight = window.innerWidth - 280;
    const defaultBottom = window.innerHeight - 220;
    setAiBoxPosition({
      x: Math.max(20, defaultRight),
      y: Math.max(20, defaultBottom),
    });
  }, []);

  const requestFullScreen = useCallback(async () => {
    if (typeof window === "undefined") return;

    const element = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    const fullscreenDoc = document as Document & {
      webkitFullscreenElement?: Element | null;
      mozFullScreenElement?: Element | null;
      msFullscreenElement?: Element | null;
    };

    if (
      document.fullscreenElement ||
      fullscreenDoc.webkitFullscreenElement ||
      fullscreenDoc.mozFullScreenElement ||
      fullscreenDoc.msFullscreenElement
    ) {
      return;
    }

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
    } catch {
      // ignore fullscreen failures
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenDoc = document as Document & {
        webkitFullscreenElement?: Element | null;
        mozFullScreenElement?: Element | null;
        msFullscreenElement?: Element | null;
      };
      const isFullscreenActive = Boolean(
        document.fullscreenElement ||
          fullscreenDoc.webkitFullscreenElement ||
          fullscreenDoc.mozFullScreenElement ||
          fullscreenDoc.msFullscreenElement
      );

      if (!isFullscreenActive && !endingSession) {
        void requestFullScreen();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !endingSession) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    void requestCameraAndMic();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [endingSession, requestCameraAndMic, requestFullScreen]);

  useEffect(() => {
    if (!question) {
      return;
    }

    void speakAgentText(question);
  }, [question, speakAgentText]);

  useEffect(() => {
    if (!assistantMessage) {
      return;
    }

    void speakAgentText(assistantMessage);
  }, [assistantMessage, speakAgentText]);

  useEffect(() => {
    setShowReadingPopup(interviewStage === "READING");
    setShowTypingTest(interviewStage === "TYPING");
  }, [interviewStage]);

  if (authChecking || pageLoading) {
    return (
      <div className="min-h-screen bg-(--background) text-(--foreground) flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-(--border) bg-(--card) p-8 text-center shadow-xl">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-(--primary)" />
          <h1 className="text-2xl font-bold text-(--foreground)">
            {authChecking ? "Verifying Access" : "Loading Interview"}
          </h1>
          <p className="mt-2 text-(--muted)">
            {authChecking
              ? "Please wait while your user session is validated."
              : "Fetching your interview session from the backend."}
          </p>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-(--background) text-(--foreground) flex items-center justify-center px-4">
        <div className="bg-(--card) border border-(--border) rounded-3xl p-12 text-center max-w-xl shadow-xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">
            <Brain className="h-4 w-4" />
            AI Interview Session
          </div>

          <h1 className="text-3xl font-bold mb-4 capitalize text-(--foreground)">
            {normalizedDomain} · {normalizedCategory || "General"}
          </h1>

          <p className="text-(--muted) mb-8">
            Your interview is connected to the backend AI engine and scoring system.
          </p>

          {cameraError ? (
            <div className="mb-6 rounded-2xl border border-rose-500/10 bg-rose-500/10 p-4 text-rose-500 text-sm">
              {cameraError}
            </div>
          ) : null}

          {infoMessage ? (
            <div className="mb-6 rounded-2xl border border-amber-500/10 bg-amber-500/10 p-4 text-amber-500 text-sm">
              {infoMessage}
            </div>
          ) : null}

          <div className="rounded-2xl border border-(--border) bg-(--muted-bg) p-5 mb-8 text-left">
            <p className="text-sm text-(--muted)">Session ID</p>
            <p className="mt-1 text-sm font-medium break-all text-(--foreground)">
              {resolvedSessionId || "Pending"}
            </p>

            <p className="mt-4 text-sm text-(--muted)">Initial Question</p>
            <p className="mt-1 text-sm text-(--foreground)/80">
              {question || getFallbackQuestion(normalizedCategory)}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={handleStartInterview}
              disabled={startingSession || !sessionReady}
              className="px-10 py-4 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 hover:scale-105 transition-all inline-flex items-center gap-2 disabled:opacity-60 text-white font-bold"
            >
              {startingSession ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Start Interview
                </>
              )}
            </button>
            <button
              onClick={() => void requestCameraAndMic()}
              className="px-10 py-4 rounded-xl border border-(--border) bg-(--muted-bg) text-(--foreground) hover:bg-(--accent) transition"
            >
              Retry Camera & Mic
            </button>
          </div>

          {!sessionReady ? (
            <p className="mt-6 text-sm text-(--muted)">
              Allow camera and microphone access to connect with the backend AI interviewer.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-(--background) text-(--foreground) flex flex-col">
      <div className="sticky top-0 z-20 border-b border-(--border) bg-(--card)/90 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-360 flex-col gap-2 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-500">
              {getInterviewTitle(resolvedCategory, resolvedDomain)}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-(--foreground)">
              {resolvedCategory || resolvedDomain || "Interview"}
            </h1>
          </div>
        </div>
        <div className="relative mx-auto max-w-360 px-6 pb-4">
          <div className="relative h-12">
            <div
              className="absolute top-1/2 inline-flex items-center justify-center rounded-full border border-(--border) bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-all duration-700 ease-out"
              style={{
                left: started ? "auto" : "50%",
                right: started ? "1rem" : "auto",
                transform: started ? "translateY(-50%)" : "translate(-50%, -50%)",
              }}
            >
              Interview timer: {formatTime(seconds)}
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {getStatusBadge("Camera", cameraEnabled, "On", "Off")}
            {getStatusBadge("Microphone", micEnabled, "On", "Off")}
            {getStatusBadge(
              "Face check",
              !faceCheckWarning && cameraEnabled && !cameraError,
              faceCheckWarning ? "Attention" : "Ready",
              "Not visible"
            )}
            {getStatusBadge("AI voice", aiSpeaking, "Speaking", "Idle")}
          </div>
        </div>
      </div>

      <main className="flex-1 min-h-0 flex items-center justify-center px-3 py-4 bg-(--background) overflow-hidden">
        <div className="flex w-full max-w-360 flex-col gap-4 overflow-hidden">
          {error ? ( 
            <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-500 text-sm">
              {error}
            </div>
          ) : null}

          {infoMessage ? (
            <div className="mb-6 rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4 text-amber-100 text-sm">
              {infoMessage}
            </div>
          ) : null}

          <div className="relative aspect-16/10 overflow-hidden rounded-4xl border border-(--border) bg-(--muted-bg) shadow-xl max-h-[52vh] sm:max-h-[58vh]">
            {cameraError ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-(--muted)">
                <div className="text-center px-6">
                  <MonitorSmartphone className="mx-auto mb-4 h-10 w-10" />
                  <p>{cameraError}</p>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            )}

            <div className="absolute left-4 top-4 z-20 rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 text-xs text-slate-100 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-indigo-300" />
                <span className="font-semibold text-white">Live camera feed</span>
              </div>
              <p className="mt-1 max-w-xs text-[11px] leading-4 text-slate-300">
                {faceCheckStatus}
              </p>
              {faceCheckWarning ? (
                <p className="mt-2 rounded-2xl bg-amber-500/15 px-2 py-1 text-amber-100">
                  {faceCheckWarning}
                </p>
              ) : null}
              {faceCheckLastSeen ? (
                <p className="mt-2 text-[10px] text-slate-400">
                  Last verified at {faceCheckLastSeen}
                </p>
              ) : null}
            </div>

            <div
              className={`fixed z-50 w-[min(92vw,18rem)] rounded-3xl border border-slate-200 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-2xl transition-all select-none cursor-grab ${
                aiSpeaking ? "ring-2 ring-cyan-400/70 shadow-cyan-500/30" : ""
              }`}
              style={{ left: aiBoxPosition.x, top: aiBoxPosition.y, background: aiBoxColor }}
              onPointerDown={(event) => {
                aiBoxDragging.current = true;
                const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                aiBoxDragOffset.current = {
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!aiBoxDragging.current) return;
                const nextX = event.clientX - aiBoxDragOffset.current.x;
                const nextY = event.clientY - aiBoxDragOffset.current.y;
                const maxX = window.innerWidth - 290;
                const maxY = window.innerHeight - 140;
                setAiBoxPosition({
                  x: Math.min(Math.max(16, nextX), maxX),
                  y: Math.min(Math.max(16, nextY), maxY),
                });
              }}
              onPointerUp={() => {
                aiBoxDragging.current = false;
              }}
              onPointerCancel={() => {
                aiBoxDragging.current = false;
              }}
              onPointerLeave={() => {
                aiBoxDragging.current = false;
              }}
            >
              {aiCardMinimized ? (
                <div className="flex h-16 items-center justify-between gap-3 rounded-3xl bg-slate-900/80 px-3 py-3 text-sm text-white">
                  <span className="font-semibold">SaaShaa AI</span>
                  <button
                    type="button"
                    onClick={() => setAiCardMinimized(false)}
                    className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15"
                  >
                    Open
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white font-semibold">
                        AI
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">SaaShaa AI</p>
                        <p className="text-xs text-slate-300">
                          Interview proctoring & coaching
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiCardMinimized(true)}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/90 hover:bg-white/15"
                    >
                      Minimize
                    </button>
                  </div>

                  <div className="rounded-3xl bg-white/5 px-3 py-3 text-sm text-slate-100">
                    {speechError ? (
                      <span className="text-amber-300">{speechError}</span>
                    ) : (
                      assistantMessage || "Monitoring interview flow, camera health, and face visibility."
                    )}
                  </div>

                  <div className="grid gap-2 text-xs text-slate-200">
                    <div className="rounded-2xl bg-white/5 px-3 py-2">
                      Answer state: {awaitingAnswer ? "Awaiting answer" : "Listening"}
                    </div>
                    <div className="rounded-2xl bg-white/5 px-3 py-2">
                      Face monitor: {faceCheckWarning ? "Attention needed" : "Stable"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleEndInterview}
              disabled={endingSession}
              className="inline-flex items-center justify-center rounded-full bg-rose-600 px-8 py-4 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {endingSession ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ending Interview...
                </>
              ) : (
                "End Interview"
              )}
            </button>
          </div>

          {interviewStage === "SALARY" ? (
            <div className="rounded-4xl border border-indigo-200 bg-white p-6 shadow-xl mt-6">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-indigo-600">
                    Salary discussion
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    What salary are you aiming for?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {isMockInterview
                      ? "This is a mock interview, so salary negotiation is optional and the goal is to practice your response."
                      : companySalaryMin
                      ? `The company can afford at least ${formatSalaryValue(companySalaryMin)}. Please enter your expected salary so we can find the best fit.`
                      : "Please enter your expected salary so we can negotiate the best fit for you and the role."}
                  </p>
                </div>

                <textarea
                  value={salaryExpectation}
                  onChange={(event) => setSalaryExpectation(event.target.value)}
                  placeholder="e.g. $55,000 per year"
                  className="min-h-30 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                {salaryFormError ? (
                  <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {salaryFormError}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleSubmitSalary}
                    className="inline-flex items-center justify-center rounded-3xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200/30 transition hover:bg-indigo-500"
                  >
                    Confirm salary expectation
                  </button>
                  <p className="text-sm text-slate-500">
                    {salaryNegotiationMessage || "Your answer will be recorded and used for salary negotiation."}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {showReadingPopup ? (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
              <div className="mx-auto max-w-5xl rounded-4xl border border-slate-200 bg-white p-8 shadow-2xl">
                <div className="space-y-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-indigo-600">
                      Reading exercise
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                      Read aloud the line below.
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Speak clearly and confidently. When you finish, click Continue to move to the typing test.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-950 text-lg leading-8">
                    {getReadingText(difficulty)}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleReadingContinue}
                      className="inline-flex items-center justify-center rounded-3xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                    >
                      Continue to typing test
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {normalizedCategory === "coding" ? (
            <div className="px-4 md:px-8 pb-4">
              <Editor
                height="240px"
                defaultLanguage="javascript"
                defaultValue="// Start coding here..."
                theme="vs-dark"
              />
            </div>
          ) : null}

          {showTypingTest ? (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
              <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-4xl border border-slate-200/80 bg-white p-6 shadow-2xl sm:p-8">
                {!showResult ? (
                  <>
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div className="space-y-3 text-left">
                        <p className="text-xs uppercase tracking-[0.3em] text-indigo-600">
                          Typing challenge
                        </p>
                        <h2 className="text-3xl font-semibold text-slate-950">
                          Improve your typing flow before the interview.
                        </h2>
                        <p className="max-w-2xl text-sm leading-6 text-slate-600">
                          Type the prompt as accurately as possible. The test is designed to fit on one screen and stay responsive across devices.
                        </p>
                      </div>

                      <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
                        <div className="rounded-3xl bg-slate-50 p-4 text-left">
                          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                            Time left
                          </p>
                          <p className="mt-2 text-3xl font-semibold text-slate-950">
                            {timeLeft}s
                          </p>
                        </div>
                        <div className="rounded-3xl bg-slate-50 p-4 text-left">
                          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500">
                            Difficulty
                          </p>
                          <p className="mt-2 text-3xl font-semibold text-slate-950 capitalize">
                            {difficulty}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                      <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 text-slate-950 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Prompt</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Keep your fingers moving and match the text below.
                            </p>
                          </div>
                          <div className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                            {difficulty}
                          </div>
                        </div>
                        <div className="space-y-2 text-base leading-7 text-slate-900">
                          {targetText.split(" ").map((word, index) => (
                            <span key={index} className="inline-block">
                              {word} 
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Your typing</p>
                            <p className="mt-1 text-xs text-slate-500">
                              The score updates as you type.
                            </p>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {isTyping ? "Active" : "Paused"}
                          </div>
                        </div>
                        <textarea
                          ref={typingInputRef}
                          value={input}
                          disabled={!isTyping}
                          onChange={(e) => setInput(e.target.value)}
                          rows={10}
                          placeholder="Start typing when you are ready..."
                          className="min-h-55 w-full resize-none rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div className="flex flex-wrap gap-3">
                        {(["easy", "medium", "hard"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              setDifficulty(mode);
                              setInput("");
                              setTimeLeft(timeLimit);
                              setShowResult(false);
                            }}
                            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                              difficulty === mode
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {!isTyping ? (
                          <button
                            onClick={() => {
                              setInput("");
                              setTimeLeft(timeLimit);
                              setIsTyping(true);
                              setShowResult(false);
                            }}
                            className="rounded-3xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200/30 transition hover:bg-indigo-500"
                          >
                            Start Test
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setIsTyping(false);
                              setShowResult(true);
                            }}
                            className="rounded-3xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200/30 transition hover:bg-rose-500"
                          >
                            End Test
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4 text-slate-800 md:grid-cols-4">
                      <div className="rounded-3xl bg-white p-4 text-center shadow-sm">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">WPM</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{typingStats.wpm}</p>
                      </div>
                      <div className="rounded-3xl bg-white p-4 text-center shadow-sm">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Accuracy</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{typingStats.accuracy}%</p>
                      </div>
                      <div className="rounded-3xl bg-white p-4 text-center shadow-sm">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Correct</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{typingStats.correct}</p>
                      </div>
                      <div className="rounded-3xl bg-white p-4 text-center shadow-sm">
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Incorrect</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{typingStats.incorrect}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-4xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
                    <p className="text-xs uppercase tracking-[0.3em] text-indigo-600">
                      Test complete
                    </p>
                    <h2 className="mt-4 text-4xl font-semibold text-slate-950">
                      Awesome work!
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Your typing result is ready. Save it and continue with the interview flow.
                    </p>

                    <div className="mt-8 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl bg-slate-50 p-6 text-left">
                        <p className="text-sm text-slate-500">Speed</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-950">{typingStats.wpm} WPM</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-6 text-left">
                        <p className="text-sm text-slate-500">Accuracy</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-950">{typingStats.accuracy}%</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-6 text-left">
                        <p className="text-sm text-slate-500">Correct keys</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-950">{typingStats.correct}</p>
                      </div>
                      <div className="rounded-3xl bg-slate-50 p-6 text-left">
                        <p className="text-sm text-slate-500">Errors</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-950">{typingStats.incorrect}</p>
                      </div>
                    </div>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                      <button
                        onClick={handleSaveTypingResult}
                        disabled={savingTypingResult}
                        className="inline-flex items-center justify-center rounded-3xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200/30 transition hover:bg-indigo-500 disabled:opacity-60"
                      >
                        {savingTypingResult ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save & Continue"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setShowResult(false);
                          setIsTyping(false);
                          setInput("");
                          setTimeLeft(timeLimit);
                        }}
                        className="rounded-3xl border border-slate-200 bg-white px-8 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
