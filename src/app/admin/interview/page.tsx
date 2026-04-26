"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Timer } from "lucide-react";
import { authStorage } from "../../../lib/api";

type Primitive = string | number | boolean | null | undefined;

interface BackendEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
}

interface AuthMeLike {
  authenticated?: boolean;
  valid?: boolean;
  role?: string;
  userRole?: string;
  roles?: string[];
  name?: string;
  fullName?: string;
  data?: AuthMeLike | null;
  payload?: AuthMeLike | null;
  result?: AuthMeLike | null;
}

interface ResumeFileLike {
  id?: number | string;
  fileName?: string;
  name?: string;
  url?: string;
  downloadUrl?: string;
}

interface AspectRatingsLike {
  communication?: number;
  technical?: number;
  confidence?: number;
  problemSolving?: number;
  [key: string]: number | undefined;
}

interface EmotionSummaryLike {
  happy?: number;
  neutral?: number;
  nervous?: number;
  confident?: number;
  [key: string]: number | undefined;
}

interface AdminInterviewCandidate {
  id: number | string;
  userId?: number | string;
  sessionId?: number | string;
  name: string;
  role: string;
  overallRating: number | null;
  transcript: string;
  performance: string;
  domain: string;
  category: string;
  status: string;
  durationSeconds: number | null;
  startedAt?: string;
  aiSessionToken?: string;
  resumeFiles: ResumeFileLike[];
  aspectRatings: AspectRatingsLike;
  emotions: EmotionSummaryLike;
  feedback?: string;
  currentQuestion?: string;
}

interface InterviewMonitorSummary {
  totalCandidates?: number;
  activeSessions?: number;
  completedSessions?: number;
  aiEngineStatus?: string;
  liveQuestion?: string;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
}

function normalizeRole(value?: Primitive): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
}

function unwrapPayload<T extends object>(
  value: BackendEnvelope<T> | T | null | undefined
): T | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as BackendEnvelope<T> & T;
  return candidate.data ?? candidate.payload ?? candidate.result ?? (candidate as T);
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}


function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

const ALLOWED_HR_INTERVIEW_ROLES = [
  "HR Generalist",
  "HR Specialist",
  "HR Manager",
  "HR Director",
  "Chief People Officer (CPO)",
  "HR Business Partner (HRBP)",
  "Talent Acquisition Specialist / Recruiter",
  "Compensation and Benefits Manager",
  "Learning and Development (L&D) Manager",
  "Employee Relations Manager",
  "Payroll Specialist",
  "HRIS Analyst (Human Resources Information Systems)",
  "DEI Officer (Diversity, Equity, and Inclusion)",
  "Talent Management Specialist",
  "HR Compliance Officer",
  "Health and Safety Coordinator",
  "People Data Analyst",
  "HR Digital Transformation Manager",
  "Onboarding Coordinator",
  "Employer Branding Specialist",
];

function isAllowedHrInterviewRole(role?: string): boolean {
  if (!role) return false;
  return ALLOWED_HR_INTERVIEW_ROLES.some(
    (allowed) => allowed.toLowerCase() === role.trim().toLowerCase()
  );
}

function normalizeCandidate(raw: unknown): AdminInterviewCandidate {
  const candidate = (raw ?? {}) as Record<string, unknown>;
  const resumeFiles = toArray(candidate.resumeFiles as unknown[]).map((file) => {
    const item = (file ?? {}) as Record<string, unknown>;
    return {
      id: item.id as number | string | undefined,
      fileName: String(item.fileName ?? item.name ?? ""),
      name: String(item.name ?? item.fileName ?? ""),
      url: String(item.url ?? item.fileUrl ?? item.previewUrl ?? ""),
      downloadUrl: String(item.downloadUrl ?? item.fileUrl ?? ""),
    };
  });

  const aspectRatings = (candidate.aspectRatings ?? {}) as Record<string, unknown>;
  const emotions = (candidate.emotions ?? {}) as Record<string, unknown>;

  return {
    id: String(
      candidate.id ?? candidate.candidateId ?? candidate.sessionId ?? crypto.randomUUID()
    ),
    userId: String(candidate.userId ?? candidate.candidateUserId ?? ""),
    sessionId: String(candidate.sessionId ?? candidate.id ?? ""),
    name: String(candidate.name ?? candidate.candidateName ?? candidate.userName ?? "Unknown Candidate"),
    role: String(candidate.role ?? candidate.jobRole ?? candidate.targetRole ?? "Candidate"),
    overallRating:
      typeof candidate.overallRating === "number"
        ? (candidate.overallRating as number)
        : typeof candidate.score === "number"
        ? (candidate.score as number)
        : null,
    transcript: String(candidate.transcript ?? candidate.latestTranscript ?? ""),
    performance: String(candidate.performance ?? candidate.summary ?? candidate.evaluation ?? ""),
    domain: String(candidate.domain ?? candidate.interviewDomain ?? ""),
    category: String(candidate.category ?? candidate.interviewCategory ?? candidate.type ?? ""),
    status: String(candidate.status ?? candidate.sessionStatus ?? "UNKNOWN"),
    durationSeconds:
      typeof candidate.durationSeconds === "number"
        ? (candidate.durationSeconds as number)
        : typeof candidate.elapsedSeconds === "number"
        ? (candidate.elapsedSeconds as number)
        : null,
    startedAt: String(candidate.startedAt ?? candidate.createdAt ?? ""),
    aiSessionToken: String(candidate.aiSessionToken ?? candidate.token ?? candidate.sessionToken ?? ""),
    resumeFiles,
    aspectRatings: {
      communication:
        typeof aspectRatings.communication === "number"
          ? (aspectRatings.communication as number)
          : typeof candidate.communicationRating === "number"
          ? (candidate.communicationRating as number)
          : undefined,
      technical:
        typeof aspectRatings.technical === "number"
          ? (aspectRatings.technical as number)
          : typeof candidate.technicalRating === "number"
          ? (candidate.technicalRating as number)
          : undefined,
      confidence:
        typeof aspectRatings.confidence === "number"
          ? (aspectRatings.confidence as number)
          : typeof candidate.confidenceRating === "number"
          ? (candidate.confidenceRating as number)
          : undefined,
      problemSolving:
        typeof aspectRatings.problemSolving === "number"
          ? (aspectRatings.problemSolving as number)
          : typeof candidate.problemSolvingRating === "number"
          ? (candidate.problemSolvingRating as number)
          : undefined,
    },
    emotions: {
      happy:
        typeof emotions.happy === "number"
          ? (emotions.happy as number)
          : undefined,
      neutral:
        typeof emotions.neutral === "number"
          ? (emotions.neutral as number)
          : undefined,
      nervous:
        typeof emotions.nervous === "number"
          ? (emotions.nervous as number)
          : undefined,
      confident:
        typeof emotions.confident === "number"
          ? (emotions.confident as number)
          : undefined,
    },
    feedback: String(candidate.feedback ?? candidate.aiFeedback ?? ""),
    currentQuestion: String(candidate.currentQuestion ?? candidate.question ?? ""),
  };
}

async function fetchWithAuth<T>(
  url: string,
  token: string
): Promise<{ ok: boolean; status: number; parsed: T | null; raw: string }> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    cache: "no-store",
  });

  const raw = await response.text();
  const parsed = safeJsonParse<T>(raw);

  return {
    ok: response.ok,
    status: response.status,
    parsed,
    raw,
  };
}

export default function AdminInterviewPage() {
  const router = useRouter();
  const params = useSearchParams();

  const domain = params.get("domain")?.trim() || "";
  const category = params.get("category")?.trim() || "";
  const sessionToken = params.get("token")?.trim() || "";

  const backendBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      "http://localhost:8080"
    );
  }, []);

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [seconds, setSeconds] = useState(0);
  const [adminName, setAdminName] = useState("Admin");
  const [error, setError] = useState("");
  const [endingSession, setEndingSession] = useState(false);

  const [question, setQuestion] = useState("Loading admin interview focus...");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [adminSpeaking, setAdminSpeaking] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [aiBoxPosition, setAiBoxPosition] = useState({ x: 0, y: 0 });
  const [aiBoxColor, setAiBoxColor] = useState("#0f172a");
  const [showTypingTest, setShowTypingTest] = useState(false);
  const [typingInput, setTypingInput] = useState("");
  const [typingStarted, setTypingStarted] = useState(false);
  const [typingSeconds, setTypingSeconds] = useState(60);
  const [typingResult, setTypingResult] = useState<{
    wpm: number;
    accuracy: number;
    correct: number;
    incorrect: number;
  } | null>(null);
  const [typingSaving, setTypingSaving] = useState(false);
  const [typingMessage, setTypingMessage] = useState<string | null>(null);
  const [audioStreamReady, setAudioStreamReady] = useState(false);

  const [voiceRounds, setVoiceRounds] = useState<
    Array<{ label: string; prompt: string; stage: string }>
  >([]);
  const [voiceRoundIndex, setVoiceRoundIndex] = useState(0);
  const [voiceInterviewStarted, setVoiceInterviewStarted] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [recordedAnswer, setRecordedAnswer] = useState("");
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const agentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [resolvedSessionId] = useState(
    params.get("sessionId")?.trim() || sessionToken
  );
  const [resolvedCategory] = useState(category);
  const [resolvedDomain] = useState(domain);

  const normalizedCategory = useMemo(() => {
    const normalized = resolvedCategory
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
    const allowedCategories = [
      "document-verification",
      "sales",
      "call-center",
    ];
    return allowedCategories.includes(normalized)
      ? normalized
      : "document-verification";
  }, [resolvedCategory]);

  const normalizedDomain = useMemo(() => resolvedDomain.trim(), [resolvedDomain]);

  const getRoleRoundPrompt = useCallback((category: string) => {
    if (category === "document-verification") {
      return "Role round: Describe how you ensure documents are verified accurately and securely while processing a high volume of cases.";
    }
    if (category === "sales") {
      return "Role round: Describe your approach to qualifying potential customers and closing deals while building trust.";
    }
    if (category === "call-center") {
      return "Role round: Explain how you handle a difficult customer call, maintain calm, and follow company policy.";
    }
    return "Role round: Describe how you approach your responsibilities and maintain quality in your work.";
  }, []);

  const adminVideoRef = useRef<HTMLVideoElement>(null);
  const adminStreamRef = useRef<MediaStream | null>(null);
  const aiBoxRef = useRef<HTMLDivElement | null>(null);
  const aiBoxDragging = useRef(false);
  const aiBoxDragOffset = useRef({ x: 0, y: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLoopRef = useRef<number | null>(null);

  const typingText = useMemo(
    () =>
      "Type the interview passage accurately to measure your typing speed and attention to detail.",
    []
  );

  const speakAgentText = useCallback(async (text: string) => {
    if (!text.trim() || typeof window === "undefined") {
      return;
    }

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
        console.error(`Speech synthesis failed [${response.status}]:`, errorText);
        setAiSpeaking(false);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], {
        type: response.headers.get("Content-Type") || "audio/mpeg",
      });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

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
      };

      await audio.play();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.error("Speech synthesis timeout");
      } else {
        console.error("AI speech playback failed", error);
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

  const calculateTypingStats = useCallback(
    (input: string) => {
      const trimmed = input || "";
      let correct = 0;
      const compareLength = Math.min(trimmed.length, typingText.length);

      for (let i = 0; i < compareLength; i += 1) {
        if (trimmed[i] === typingText[i]) {
          correct += 1;
        }
      }

      const incorrect = Math.max(0, trimmed.length - correct);
      const accuracy = trimmed.length
        ? Math.round((correct / trimmed.length) * 100)
        : 100;

      return { correct, incorrect, accuracy };
    },
    [typingText]
  );

  const calculateTypingWpm = useCallback(
    (input: string, elapsedSeconds: number) => {
      const stats = calculateTypingStats(input);
      const minutes = Math.max(0.01, elapsedSeconds / 60);
      return Math.round((stats.correct / 5) / minutes);
    },
    [calculateTypingStats]
  );

  const typingStats = useMemo(
    () => calculateTypingStats(typingInput),
    [typingInput, calculateTypingStats]
  );

  const typingWpm = useMemo(
    () => calculateTypingWpm(typingInput, 60 - typingSeconds),
    [typingInput, typingSeconds, calculateTypingWpm]
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const requestCameraAndMic = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera and microphone access is not available in this browser.");
      setSessionReady(false);
      return;
    }

    if (adminStreamRef.current) {
      adminStreamRef.current.getTracks().forEach((track) => track.stop());
      adminStreamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      adminStreamRef.current = stream;
      if (adminVideoRef.current) {
        adminVideoRef.current.srcObject = stream;
      }

      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;
      const canStart = hasVideo && hasAudio;

      setMicEnabled(hasAudio);
      setAudioStreamReady(true);
      setSessionReady(canStart);

      if (!canStart) {
        setCameraError("Camera and microphone must both be enabled to start the interview.");
      } else {
        setCameraError(null);
      }
    } catch {
      setCameraError("Camera and microphone must both be enabled to start the interview.");
      setMicEnabled(false);
      setAudioStreamReady(false);
      setSessionReady(false);
    }
  }, []);

  useEffect(() => {
    const requestFullScreen = async () => {
      const element = document.documentElement as FullscreenElement;
      const fullscreenDoc = document as FullscreenDocument;

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
        // Fullscreen may be blocked by browser if not triggered by user gesture.
      }
    };

    const handleFullscreenChange = () => {
      const fullscreenDoc = document as FullscreenDocument;
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

    void requestFullScreen();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown, true);

    void requestCameraAndMic();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (adminStreamRef.current) {
        adminStreamRef.current.getTracks().forEach((track) => track.stop());
        adminStreamRef.current = null;
      }
    };
  }, [endingSession, requestCameraAndMic]);

  const isTypingQuestion = useMemo(() => {
    return /typing speed|typing.*speed|speed.*typing|typing test|typing challenge/i.test(
      question
    );
  }, [question]);

  useEffect(() => {
    if (isTypingQuestion && !showTypingTest && !typingResult) {
      setShowTypingTest(true);
      setTypingStarted(true);
    }
  }, [isTypingQuestion, showTypingTest, typingResult]);

  useEffect(() => {
    if (!question || isTypingQuestion) {
      setAiSpeaking(false);
      return;
    }

    setAiSpeaking(true);
    const timer = window.setTimeout(() => {
      setAiSpeaking(false);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [question, isTypingQuestion]);

  useEffect(() => {
    if (!showTypingTest || !typingStarted || typingResult) {
      return;
    }

    if (typingSeconds <= 0) {
      setTypingStarted(false);
      setTypingResult({
        ...typingStats,
        wpm: calculateTypingWpm(typingInput, 60),
      });
      return;
    }

    const timer = window.setTimeout(() => {
      setTypingSeconds((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [calculateTypingWpm, showTypingTest, typingInput, typingSeconds, typingStarted, typingResult, typingStats]);

  useEffect(() => {
    if (!audioStreamReady || !adminStreamRef.current) {
      return;
    }

    const windowAudio = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioCtx = windowAudio.AudioContext || windowAudio.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    const context = new AudioCtx();
    audioContextRef.current = context;
    const source = context.createMediaStreamSource(adminStreamRef.current);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      const average =
        dataArray.reduce((sum, value) => sum + value, 0) /
        dataArray.length;
      const level = average / 255;
      setAdminSpeaking(level > 0.12);
      audioLoopRef.current = window.requestAnimationFrame(updateVolume);
    };

    audioLoopRef.current = window.requestAnimationFrame(updateVolume);

    return () => {
      if (audioLoopRef.current) {
        window.cancelAnimationFrame(audioLoopRef.current);
      }
      source.disconnect();
      analyser.disconnect();
      context.close().catch(() => undefined);
    };
  }, [audioStreamReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const defaultRight = window.innerWidth - 280;
    const defaultBottom = window.innerHeight - 180;
    setAiBoxPosition({
      x: Math.max(20, defaultRight),
      y: Math.max(20, defaultBottom),
    });
  }, []);

  useEffect(() => {
    const requestFullScreen = async () => {
      const element = document.documentElement as FullscreenElement;
      const fullscreenDoc = document as FullscreenDocument;

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
        // Fullscreen may be blocked by browser if not triggered by user gesture.
      }
    };

    const handleFullscreenChange = () => {
      const fullscreenDoc = document as FullscreenDocument;
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

    void requestFullScreen();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [endingSession]);

  const validateAdminSession = useCallback(async (): Promise<string | null> => {
const token = authStorage.getAccessToken();

    if (!token) {
      authStorage.clear();
      router.replace("/auth/login");
      return null;
    }

    try {
      const authResponse = await fetchWithAuth<AuthMeLike | BackendEnvelope<AuthMeLike>>(
        `${backendBaseUrl}/api/auth/me`,
        token
      );

      if (!authResponse.ok || !authResponse.parsed) {
        authStorage.clear();
        router.replace("/auth/login");
        return null;
      }

      const authPayload = unwrapPayload<AuthMeLike>(authResponse.parsed);
      const role = normalizeRole(
        authPayload?.userRole ?? authPayload?.role ?? authPayload?.roles?.[0]
      );
      const authenticated = Boolean(
        authPayload?.authenticated ?? authPayload?.valid ?? authResponse.ok
      );

      if (!authenticated) {
        authStorage.clear();
        router.replace("/auth/login");
        return null;
      }

      if (role !== "ADMIN") {
        router.replace("/user");
        return null;
      }

      setAdminName(
        String(authPayload?.fullName ?? authPayload?.name ?? "Admin")
      );

      return token;
    } catch {
      authStorage.clear();
      router.replace("/auth/login");
      return null;
    } finally {
      setAuthChecking(false);
    }
  }, [backendBaseUrl, router]);

  const handleEndInterview = useCallback(async () => {
    if (!resolvedSessionId) {
      setError("Unable to end the interview because the session id is missing.");
      return;
    }

    setEndingSession(true);
    setError("");

    try {
      const token = authStorage.getAccessToken();
      const response = await fetch(
        `${backendBaseUrl}/api/user/interview/session/${resolvedSessionId}/end`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Unable to end the review session. Status ${response.status}`);
      }

      router.push("/admin");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to end the interview session."
      );
    } finally {
      setEndingSession(false);
    }
  }, [backendBaseUrl, resolvedSessionId, router]);

  const saveTypingResult = useCallback(
    async (stats: { wpm: number; accuracy: number; correct: number; incorrect: number }) => {
      if (!resolvedSessionId) {
        setTypingMessage("Typing result could not be saved because interview session is not available.");
        return;
      }

      setTypingSaving(true);
      setTypingMessage(null);

      try {
        const token = authStorage.getAccessToken();
        const response = await fetch(
          `${backendBaseUrl}/api/user/interview/session/${resolvedSessionId}/typing-result`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: "include",
            body: JSON.stringify({
              domain: resolvedDomain,
              category: resolvedCategory,
              wpm: stats.wpm,
              accuracy: stats.accuracy,
              correct: stats.correct,
              incorrect: stats.incorrect,
              timeSpent: 60 - typingSeconds,
            }),
          }
        );

        if (response.ok) {
          setTypingMessage("Typing speed results saved to backend successfully.");
        } else {
          setTypingMessage(
            `Typing result could not be saved. Backend status ${response.status}.`
          );
        }
      } catch {
        setTypingMessage(
          "Typing result could not be saved due to a network error."
        );
      } finally {
        setTypingSaving(false);
      }
    },
    [backendBaseUrl, resolvedCategory, resolvedDomain, resolvedSessionId, sessionToken, typingSeconds]
  );

  useEffect(() => {
    if (typingResult && !typingSaving) {
      void saveTypingResult(typingResult);
    }
  }, [typingResult, saveTypingResult, typingSaving]);

  const buildVoiceRounds = useCallback(() => {
    const baseRounds = [
      {
        label: "Welcome",
        prompt: `Good evening ${adminName}. We are starting the interview now. First there is a screening round, followed by a role-focused round, and then an HR round.`,
        stage: "WELCOME",
      },
      {
        label: "Screening",
        prompt:
          "Screening round: Describe a time when you had to stay organized and accurate while working under pressure.",
        stage: "SCREENING",
      },
      {
        label: "Role",
        prompt: getRoleRoundPrompt(normalizedCategory),
        stage: "ROLE",
      },
      {
        label: "HR",
        prompt:
          "HR round: Tell me about a time when you solved a difficult situation at work while maintaining professionalism.",
        stage: "HR",
      },
      {
        label: "HR",
        prompt:
          "HR round: How do you stay calm and communicate clearly when priorities change unexpectedly?",
        stage: "HR",
      },
    ];

    return baseRounds;
  }, [adminName, getRoleRoundPrompt, normalizedCategory]);

  const advanceVoiceRound = useCallback(() => {
    const nextIndex = voiceRoundIndex + 1;
    if (nextIndex < voiceRounds.length) {
      const round = voiceRounds[nextIndex];
      setVoiceRoundIndex(nextIndex);
      setQuestion(round.prompt);
      setAssistantMessage(`Now starting the ${round.stage.toLowerCase()} round.`);
      setRecordedAnswer("");
      setSpeechStatus(null);
      setRecordError(null);
      return;
    }

    setVoiceInterviewStarted(false);
    setAssistantMessage("The interview is complete. Thank you.");
    setQuestion(
      "The interview is complete. Save your notes and end the session when you are ready."
    );
  }, [voiceRoundIndex, voiceRounds]);

  const transcribeAudioBlob = useCallback(async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "admin-answer.wav");

    const response = await fetch("/api/speech/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Transcription failed.");
    }

    const payload = await response.json();
    return payload.transcript || "";
  }, []);

  const handleStartVoiceInterview = useCallback(() => {
    const rounds = buildVoiceRounds();
    setVoiceRounds(rounds);
    setVoiceRoundIndex(0);
    setVoiceInterviewStarted(true);
    setAssistantMessage(`Good evening ${adminName}. The voice interview is starting.`);
    setQuestion(rounds[0]?.prompt || "Starting the interview...");
    setRecordedAnswer("");
    setSpeechStatus(null);
    setRecordError(null);
  }, [adminName, buildVoiceRounds]);

  const handleStartRecording = useCallback(async () => {
    setRecordError(null);
    setRecordedAnswer("");
    setSpeechStatus("Preparing microphone...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });

        try {
          setSpeechStatus("Transcribing with AI Engine...");
          const transcriptText = await transcribeAudioBlob(blob);
          const answerText = transcriptText.trim() || "[No speech detected]";

          setRecordedAnswer(answerText);
          setQuestion((prev) =>
            `${voiceRounds[voiceRoundIndex]?.prompt || prev}\n\nAnswer: ${answerText}`
          );
          setSpeechStatus("Transcription complete.");
          setAssistantMessage("Your answer has been recorded. Press next to continue.");
        } catch (error: any) {
          setRecordError(error?.message || "Speech transcription failed.");
          setSpeechStatus(null);
        } finally {
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setSpeechStatus("Recording... speak now.");
    } catch (error: any) {
      setRecordError(
        error?.message || "Unable to access microphone. Please allow audio permissions."
      );
      setSpeechStatus(null);
    }
  }, [transcribeAudioBlob, voiceRoundIndex, voiceRounds]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  const handleNextVoiceRound = useCallback(() => {
    if (!recordedAnswer && voiceInterviewStarted) {
      setRecordError("Please record an answer before moving to the next question.");
      return;
    }

    advanceVoiceRound();
  }, [advanceVoiceRound, recordedAnswer, voiceInterviewStarted]);

  const loadInterviewMonitor = useCallback(
    async (token: string) => {
      setLoading(true);
      setError("");

      try {
        const query = new URLSearchParams();
        if (domain) query.set("domain", domain);
        if (category) query.set("category", category);
        if (sessionToken) query.set("token", sessionToken);

        /**
         * Preferred backend monitoring endpoint.
         * Example:
         * GET /api/admin/interview/monitor?domain=x&category=y&token=z
         *
         * Response can be flexible. This page normalizes:
         * - summary/liveQuestion
         * - candidate/session list
         */
        const monitorUrl = `${backendBaseUrl}/api/admin/interview/monitor${
          query.toString() ? `?${query.toString()}` : ""
        }`;

        const monitorResponse = await fetchWithAuth<Record<string, unknown>>(monitorUrl, token);

        if (!monitorResponse.ok || !monitorResponse.parsed) {
          throw new Error("Interview monitor data could not be loaded from backend.");
        }

        const payload = unwrapPayload<Record<string, unknown>>(monitorResponse.parsed) ?? {};

        const rawSummary =
          (payload.summary ?? payload.dashboardSummary ?? payload.monitorSummary ?? {}) as Record<string, unknown>;
        const rawCandidates =
          (payload.candidates ??
          payload.sessions ??
          payload.interviews ??
          payload.items ??
          []) as unknown[];

        const nextCandidates = toArray(rawCandidates).map(normalizeCandidate);
        const allowedCandidates = nextCandidates.filter((candidate) =>
          isAllowedHrInterviewRole(candidate.role)
        );

        const normalizedSummary: InterviewMonitorSummary = {
          totalCandidates: allowedCandidates.length,
          activeSessions: allowedCandidates.filter((item) =>
            ["LIVE", "ACTIVE", "IN_PROGRESS", "STARTED"].includes(
              item.status.toUpperCase()
            )
          ).length,
          completedSessions: allowedCandidates.filter((item) =>
            ["COMPLETED", "FINISHED", "ENDED"].includes(
              item.status.toUpperCase()
            )
          ).length,
          aiEngineStatus: String(
            rawSummary.aiEngineStatus ??
              payload.aiEngineStatus ??
              payload.engineStatus ??
              "UNKNOWN"
          ),
          liveQuestion: String(
            rawSummary.liveQuestion ??
              payload.liveQuestion ??
              allowedCandidates.find((item) => item.currentQuestion)?.currentQuestion ??
              ""
          ),
        };

        setQuestion(
          normalizedSummary.liveQuestion ||
            (category
              ? `Starting ${category} interview session...`
              : "Waiting for the next AI interview question.")
        );
      } catch (err) {
        setQuestion(
          category
            ? `Starting ${category} interview session...`
            : "Waiting for the next AI interview question."
        );
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load admin interview monitor."
        );
      } finally {
        setLoading(false);
      }
    },
    [backendBaseUrl, category, domain, sessionToken]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const defaultRight = window.innerWidth - 280;
    const defaultBottom = window.innerHeight - 180;
    setAiBoxPosition({
      x: Math.max(20, defaultRight),
      y: Math.max(20, defaultBottom),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const token = await validateAdminSession();
      if (!token || cancelled) return;
      await loadInterviewMonitor(token);
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [loadInterviewMonitor, validateAdminSession]);

  useEffect(() => {
    if (!question || isTypingQuestion || !voiceInterviewStarted) {
      return;
    }

    void speakAgentText(question);
  }, [question, isTypingQuestion, voiceInterviewStarted, speakAgentText]);

  useEffect(() => {
    if (!assistantMessage || !voiceInterviewStarted) {
      return;
    }

    void speakAgentText(assistantMessage);
  }, [assistantMessage, voiceInterviewStarted, speakAgentText]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-950">Checking admin access</h1>
          <p className="mt-2 text-slate-600">
            Verifying your backend session and permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-hidden bg-slate-50 text-slate-950">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-360 items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-600">
              Admin AI Interview
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">
              Live Call View
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {adminName} · {loading ? "Syncing live session…" : "Live call active"}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-emerald-600">
              Microphone: {micEnabled ? "On" : "Off"}
            </p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-900">
            <Timer className="h-4 w-4 text-indigo-500" />
            {formatTimer(seconds)}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-full -translate-x-1/2 mt-3"></div>
        </div>
        <div className="absolute left-1/2 top-5 -translate-x-1/2">
          <button
            type="button"
            onClick={handleEndInterview}
            disabled={endingSession}
            className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 shadow-xl shadow-rose-500/20"
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
      </div>

      <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-8 bg-slate-50">
        <div className="w-full max-w-360">
          {error ? (
            <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-red-100 text-sm">
              {error}
            </div>
          ) : null}

          <div className={`relative aspect-video overflow-hidden rounded-4xl border border-slate-200 bg-slate-100 shadow-xl ${adminSpeaking ? "admin-video-active" : ""}`}>
            {cameraError ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/60">
                {cameraError}
              </div>
            ) : (
              <video
                ref={adminVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            )}

            <div className="absolute left-6 top-6 max-w-lg rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-xl backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
                Current Question
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {question}
              </p>
            </div>

            <div className="absolute left-6 bottom-6 max-w-lg rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-xl backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
                Voice Assistant
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {assistantMessage ||
                  "Start the voice assistant to guide the screening, role-focused, and HR rounds."}
              </p>
              <div className="mt-4 rounded-3xl bg-slate-100 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">
                  Stage: {voiceInterviewStarted ? voiceRounds[voiceRoundIndex]?.stage || "Ready" : "Ready"}
                </p>
                <p className="mt-2 text-slate-600">
                  {voiceInterviewStarted
                    ? `${voiceRounds[voiceRoundIndex]?.label || "Awaiting"} round`
                    : "Press start to begin."}
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-3">
                {!voiceInterviewStarted ? (
                  <button
                    type="button"
                    onClick={handleStartVoiceInterview}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  >
                    Start Voice Interview
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={recording ? handleStopRecording : handleStartRecording}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                    >
                      {recording ? "Stop Recording" : "Record Answer"}
                    </button>
                    <button
                      type="button"
                      onClick={handleNextVoiceRound}
                      disabled={!recordedAnswer}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Next Question
                    </button>
                  </>
                )}
              </div>
              {speechStatus ? (
                <p className="mt-3 text-sm text-emerald-300">{speechStatus}</p>
              ) : null}
              {recordError ? (
                <p className="mt-3 text-sm text-rose-300">{recordError}</p>
              ) : null}
              {recordedAnswer ? (
                <div className="mt-4 rounded-3xl bg-slate-100 p-3 text-sm text-slate-900">
                  <p className="font-semibold">Recorded Answer</p>
                  <p className="mt-2 whitespace-pre-wrap">{recordedAnswer}</p>
                </div>
              ) : null}
            </div>

            <div
              ref={aiBoxRef}
              className={`admin-ai-box fixed z-50 w-72 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-xl backdrop-blur-xl transition-all ${
                aiSpeaking ? "admin-ai-active" : ""
              }`}
              style={{ left: aiBoxPosition.x, top: aiBoxPosition.y, background: aiBoxColor }}
              onPointerDown={(event) => {
                aiBoxDragging.current = true;
                const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                aiBoxDragOffset.current = {
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                };
                (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
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
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-slate-100 text-slate-950 font-semibold text-lg">
                    SA
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                      SaaShaa AI
                    </p>
                    <p className="text-lg font-semibold text-slate-950">
                      SaaShaa AI
                    </p>
                  </div>
                </div>
                <div
                  className={`h-3 w-3 rounded-full transition-colors duration-200 ${
                    aiSpeaking ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                  }`}
                />
              </div>

              <div className="mt-4 rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                <p className="text-slate-500">AI is presenting the next question.</p>
                <p className="mt-2 text-slate-600 text-[0.92rem]">
                  Drag this card anywhere to keep it in view.
                </p>
              </div>
              <div className="mt-4 rounded-3xl bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-950">
                SaaShaa AI
              </div>
            </div>
          </div>

        </div>
      </main>

      {!sessionReady ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-50/90 px-4 py-6">
          <div className="w-full max-w-2xl rounded-4xl border border-slate-200 bg-white/95 p-8 text-center text-slate-950 shadow-2xl backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">
              Interview setup required
            </p>
            <h2 className="mt-4 text-3xl font-semibold">Camera and microphone needed</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              This interview cannot begin until both camera and microphone access are enabled.
            </p>
            {cameraError ? (
              <div className="mt-4 rounded-3xl bg-rose-500/10 p-4 text-sm text-rose-200">
                {cameraError}
              </div>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => {
                  void requestCameraAndMic();
                }}
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Retry camera & mic
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Refresh page
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showTypingTest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/85 px-4 py-6">
          <div className="w-full max-w-4xl rounded-4xl bg-white/95 border border-slate-200 p-6 shadow-2xl backdrop-blur-xl text-slate-950">
            {!typingResult ? (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">Typing Speed Test</p>
                    <h2 className="mt-2 text-3xl font-semibold">Document Verification Challenge</h2>
                    <p className="mt-2 max-w-2xl text-slate-600">
                      Type the text below as accurately and quickly as possible. Your result will be saved to the backend.
                    </p>
                  </div>
                  <div className="rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                    <p className="uppercase tracking-[0.3em] text-slate-500">Time left</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{typingSeconds}s</p>
                  </div>
                </div>

                <div className="mb-5 rounded-3xl bg-slate-100 p-4 text-sm text-slate-700">
                  This typing challenge helps confirm your focus and transcription quality before the next question.
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-100 p-5 text-sm leading-7 text-slate-700">
                  {typingText}
                </div>

                <textarea
                  value={typingInput}
                  onChange={(event) => {
                    if (!typingStarted) {
                      setTypingStarted(true);
                    }
                    setTypingInput(event.target.value);
                  }}
                  placeholder="Start typing here..."
                  className="mt-6 min-h-56 w-full rounded-3xl border border-slate-200 bg-slate-100 p-5 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                />

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl bg-slate-100 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">WPM</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{typingWpm}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-100 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Accuracy</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{typingStats.accuracy}%</p>
                  </div>
                  <div className="rounded-3xl bg-slate-100 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Errors</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{typingStats.incorrect}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => {
                      setTypingResult({
                        ...typingStats,
                        wpm: calculateTypingWpm(typingInput, 60 - typingSeconds),
                      });
                      setTypingStarted(false);
                    }}
                    className="rounded-3xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition"
                  >
                    Finish Test
                  </button>
                  <button
                    onClick={() => {
                      setShowTypingTest(false);
                      setTypingStarted(false);
                      setTypingInput("");
                      setTypingSeconds(60);
                      setTypingMessage(null);
                    }}
                    className="rounded-3xl border border-slate-200 bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200 transition"
                  >
                    Close Test
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-semibold text-slate-950">Typing Speed Result</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-3xl bg-slate-100 p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">WPM</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{typingResult.wpm}</p>
                  </div>
                  <div className="rounded-3xl bg-slate-100 p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Accuracy</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{typingResult.accuracy}%</p>
                  </div>
                  <div className="rounded-3xl bg-slate-100 p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Errors</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{typingResult.incorrect}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600">
                  Results are being synced to the backend and evaluated by the AI engine.
                </p>
                {typingMessage ? (
                  <div className="rounded-3xl bg-slate-100 p-4 text-sm text-slate-700">
                    {typingMessage}
                  </div>
                ) : null}
                <button
                  onClick={() => {
                    setShowTypingTest(false);
                    setTypingResult(null);
                    setTypingStarted(false);
                    setTypingSeconds(60);
                    setTypingInput("");
                    setTypingMessage(null);
                  }}
                  className="rounded-3xl bg-indigo-600 px-6 py-4 text-sm font-semibold text-white hover:bg-indigo-500 transition"
                >
                  Close Results
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
