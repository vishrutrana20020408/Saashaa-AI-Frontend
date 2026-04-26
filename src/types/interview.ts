// src/types/interview.ts
//
// Central interview-related types and helpers for frontend ↔ backend integration.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - Backend-mediated interview workflow aligned with AI-engine integration
// - Reusable across:
//   - interview session pages
//   - realtime interview modules
//   - interview history / dashboards
//   - interview evaluation and feedback views
//   - admin interview review panels
//
// Supported backend patterns:
// - plain object response
// - wrapped response:
//   { success, message, data | payload | result | content }
// - resilient to small backend response-shape differences
//
// Recommended backend endpoints:
//   GET    /api/interview/sessions
//   POST   /api/interview/sessions
//   GET    /api/interview/sessions/{sessionId}
//   PATCH  /api/interview/sessions/{sessionId}/status
//   POST   /api/interview/sessions/{sessionId}/start
//   POST   /api/interview/sessions/{sessionId}/end
//   POST   /api/interview/sessions/{sessionId}/answer
//   GET    /api/interview/sessions/{sessionId}/evaluation
//   GET    /api/interview/health
//
// Notes:
// - Designed around your project ideology:
//   frontend -> backend -> AI-engine
// - Keeps frontend contracts stable while backend and AI-engine evolve

/* =========================================================
   API ENVELOPE
========================================================= */

export type InterviewApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  details?: unknown;
  status?: number;
  timestamp?: string;
  path?: string;
  data?: T;
  payload?: T;
  result?: T;
  content?: T;
};

/* =========================================================
   CORE ENUM / UNION TYPES
========================================================= */

export type InterviewMode =
  | "PRACTICE"
  | "REALTIME"
  | "MOCK"
  | "GUIDED"
  | string;

export type InterviewType =
  | "TECHNICAL"
  | "HR"
  | "BEHAVIORAL"
  | "SYSTEM_DESIGN"
  | "RESUME_BASED"
  | "GITHUB_BASED"
  | string;

export type InterviewStatus =
  | "CREATED"
  | "SCHEDULED"
  | "READY"
  | "IN_PROGRESS"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED"
  | string;

export type InterviewQuestionType =
  | "TEXT"
  | "MCQ"
  | "CODING"
  | "FOLLOW_UP"
  | "VOICE"
  | string;

export type InterviewAnswerStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "EVALUATED"
  | string;

export type InterviewDifficulty =
  | "BEGINNER"
  | "EASY"
  | "INTERMEDIATE"
  | "MEDIUM"
  | "ADVANCED"
  | "HARD"
  | string;

export type InterviewEvaluationBand =
  | "EXCELLENT"
  | "GOOD"
  | "AVERAGE"
  | "LOW"
  | "UNKNOWN";

export type InterviewFeedbackSeverity =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | string;

/* =========================================================
   REQUEST TYPES
========================================================= */

export type InterviewSessionCreateRequest = {
  title?: string | null;
  mode?: InterviewMode | null;
  type?: InterviewType | null;
  difficulty?: InterviewDifficulty | null;

  resumeVersionId?: number | null;
  githubAnalysisId?: number | null;
  jobApplicationId?: number | null;

  jobTitle?: string | null;
  companyName?: string | null;
  jobDescription?: string | null;

  totalQuestions?: number | null;
  durationMinutes?: number | null;

  includeResumeContext?: boolean;
  includeGitHubContext?: boolean;
  includeJobDescriptionContext?: boolean;

  additionalInstructions?: string | null;
};

export type InterviewSessionStatusUpdateRequest = {
  status: InterviewStatus;
};

export type InterviewAnswerSubmitRequest = {
  questionId?: number | null;
  answerText?: string | null;
  codeAnswer?: string | null;
  timeSpentSeconds?: number | null;
  skipped?: boolean;
};

export type InterviewRealtimeEventRequest = {
  sessionId?: number | null;
  eventType?: string | null;
  payload?: Record<string, unknown> | null;
};

/* =========================================================
   CORE ENTITY TYPES
========================================================= */

export type InterviewQuestionOption = {
  id?: number | string;
  label?: string | null;
  value?: string | null;
  correct?: boolean | null;
};

export type InterviewQuestion = {
  questionId?: number;
  id?: number;

  sessionId?: number | null;

  order?: number | null;
  type?: InterviewQuestionType | null;
  difficulty?: InterviewDifficulty | null;

  title?: string | null;
  questionText?: string | null;
  expectedAnswer?: string | null;
  hints?: string[];

  options?: InterviewQuestionOption[];

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type InterviewAnswer = {
  answerId?: number;
  id?: number;

  questionId?: number | null;
  sessionId?: number | null;

  answerText?: string | null;
  codeAnswer?: string | null;

  score?: number | null;
  status?: InterviewAnswerStatus | null;

  timeSpentSeconds?: number | null;
  skipped?: boolean | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type InterviewFeedbackItem = {
  id?: string;
  title: string;
  description?: string | null;
  severity?: InterviewFeedbackSeverity | null;
  category?: string | null;
  recommendation?: string | null;
};

export type InterviewEvaluationBreakdown = Record<string, number>;

export type InterviewEvaluation = {
  evaluationId?: number;
  id?: number;

  sessionId?: number | null;

  score?: number | null;
  band?: InterviewEvaluationBand | null;

  communicationScore?: number | null;
  technicalScore?: number | null;
  confidenceScore?: number | null;
  problemSolvingScore?: number | null;

  summary?: string | null;

  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];

  feedbackItems?: InterviewFeedbackItem[];
  breakdown?: InterviewEvaluationBreakdown | null;

  evaluatedAt?: string | null;
};

export type InterviewSession = {
  interviewSessionId?: number;
  id?: number;

  title?: string | null;
  mode?: InterviewMode | null;
  type?: InterviewType | null;
  difficulty?: InterviewDifficulty | null;
  status?: InterviewStatus | null;

  resumeVersionId?: number | null;
  githubAnalysisId?: number | null;
  jobApplicationId?: number | null;

  jobTitle?: string | null;
  companyName?: string | null;

  totalQuestions?: number | null;
  answeredQuestions?: number | null;
  durationMinutes?: number | null;

  currentQuestionIndex?: number | null;

  questions?: InterviewQuestion[];
  answers?: InterviewAnswer[];
  evaluation?: InterviewEvaluation | null;

  startedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type InterviewHealthResponse = {
  success?: boolean;
  message?: string;
  status?: string | null;
  provider?: string | null;
  model?: string | null;
};

/* =========================================================
   LIST / SUMMARY TYPES
========================================================= */

export type InterviewSessionSummary = {
  interviewSessionId?: number;
  id?: number;

  title?: string | null;
  mode?: InterviewMode | null;
  type?: InterviewType | null;
  difficulty?: InterviewDifficulty | null;
  status?: InterviewStatus | null;

  score?: number | null;
  band?: InterviewEvaluationBand | null;

  jobTitle?: string | null;
  companyName?: string | null;

  startedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string | null;
};

export type InterviewSessionListResponse = {
  items: InterviewSessionSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function safeString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }

  return null;
}

function uniqueStrings(values?: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    ),
  ];
}

/* =========================================================
   ENVELOPE / UNWRAP HELPERS
========================================================= */

export function unwrapInterviewResponse<T>(value: unknown): T {
  let current = value;
  let depth = 0;

  while (current && typeof current === "object" && depth < 6) {
    const obj = current as Record<string, unknown>;

    if (obj.data !== undefined) {
      current = obj.data;
      depth += 1;
      continue;
    }

    if (obj.payload !== undefined) {
      current = obj.payload;
      depth += 1;
      continue;
    }

    if (obj.result !== undefined) {
      current = obj.result;
      depth += 1;
      continue;
    }

    if (obj.content !== undefined) {
      current = obj.content;
      depth += 1;
      continue;
    }

    break;
  }

  return current as T;
}

export function extractInterviewMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const record = payload as Record<string, unknown>;

  return (
    safeTrimmedString(record.message) ||
    safeTrimmedString(record.error) ||
    safeTrimmedString(record.details)
  );
}

/* =========================================================
   TYPE GUARDS / SCORE HELPERS
========================================================= */

export function isInterviewEvaluationBand(
  value: unknown
): value is InterviewEvaluationBand {
  return (
    value === "EXCELLENT" ||
    value === "GOOD" ||
    value === "AVERAGE" ||
    value === "LOW" ||
    value === "UNKNOWN"
  );
}

export function normalizeInterviewScore(score: unknown): number | null {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;

  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

export function getInterviewEvaluationBand(
  score: unknown
): InterviewEvaluationBand {
  const value = normalizeInterviewScore(score);

  if (value === null) return "UNKNOWN";
  if (value >= 85) return "EXCELLENT";
  if (value >= 70) return "GOOD";
  if (value >= 50) return "AVERAGE";
  return "LOW";
}

export function getInterviewScoreBadgeClass(score: unknown): string {
  const value = normalizeInterviewScore(score);

  if (value === null) {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }
  if (value >= 85) {
    return "border-green-200 bg-green-100 text-green-700";
  }
  if (value >= 70) {
    return "border-blue-200 bg-blue-100 text-blue-700";
  }
  if (value >= 50) {
    return "border-yellow-200 bg-yellow-100 text-yellow-700";
  }
  return "border-red-200 bg-red-100 text-red-700";
}

export function getInterviewStatusBadgeClass(status?: string | null): string {
  const normalized = (status || "").trim().toUpperCase();

  if (normalized === "COMPLETED") {
    return "border-green-200 bg-green-100 text-green-700";
  }
  if (
    normalized === "IN_PROGRESS" ||
    normalized === "READY" ||
    normalized === "SCHEDULED"
  ) {
    return "border-blue-200 bg-blue-100 text-blue-700";
  }
  if (normalized === "PAUSED") {
    return "border-yellow-200 bg-yellow-100 text-yellow-700";
  }
  if (normalized === "FAILED" || normalized === "CANCELLED") {
    return "border-red-200 bg-red-100 text-red-700";
  }

  return "border-gray-200 bg-gray-100 text-gray-700";
}

export function getInterviewFeedbackSeverityClass(
  severity?: string | null
): string {
  const normalized = (severity || "").trim().toUpperCase();

  if (normalized === "HIGH") {
    return "border-red-200 bg-red-100 text-red-700";
  }
  if (normalized === "MEDIUM") {
    return "border-yellow-200 bg-yellow-100 text-yellow-700";
  }
  if (normalized === "LOW") {
    return "border-blue-200 bg-blue-100 text-blue-700";
  }

  return "border-gray-200 bg-gray-100 text-gray-700";
}

/* =========================================================
   REQUEST BUILDERS
========================================================= */

export function buildInterviewSessionCreateRequest(
  input: InterviewSessionCreateRequest
): InterviewSessionCreateRequest {
  return {
    title: safeTrimmedString(input.title) || null,
    mode: (safeTrimmedString(input.mode) as InterviewMode | undefined) || null,
    type: (safeTrimmedString(input.type) as InterviewType | undefined) || null,
    difficulty:
      (safeTrimmedString(input.difficulty) as InterviewDifficulty | undefined) ||
      null,

    resumeVersionId:
      typeof input.resumeVersionId === "number" ? input.resumeVersionId : null,
    githubAnalysisId:
      typeof input.githubAnalysisId === "number" ? input.githubAnalysisId : null,
    jobApplicationId:
      typeof input.jobApplicationId === "number" ? input.jobApplicationId : null,

    jobTitle: safeTrimmedString(input.jobTitle) || null,
    companyName: safeTrimmedString(input.companyName) || null,
    jobDescription: safeTrimmedString(input.jobDescription) || null,

    totalQuestions:
      typeof input.totalQuestions === "number" ? input.totalQuestions : null,
    durationMinutes:
      typeof input.durationMinutes === "number" ? input.durationMinutes : null,

    includeResumeContext:
      typeof input.includeResumeContext === "boolean"
        ? input.includeResumeContext
        : undefined,
    includeGitHubContext:
      typeof input.includeGitHubContext === "boolean"
        ? input.includeGitHubContext
        : undefined,
    includeJobDescriptionContext:
      typeof input.includeJobDescriptionContext === "boolean"
        ? input.includeJobDescriptionContext
        : undefined,

    additionalInstructions:
      safeTrimmedString(input.additionalInstructions) || null,
  };
}

export function buildInterviewSessionStatusUpdateRequest(
  input: InterviewSessionStatusUpdateRequest
): InterviewSessionStatusUpdateRequest {
  return {
    status: (safeTrimmedString(input.status) as InterviewStatus | undefined) || "",
  };
}

export function buildInterviewAnswerSubmitRequest(
  input: InterviewAnswerSubmitRequest
): InterviewAnswerSubmitRequest {
  return {
    questionId: typeof input.questionId === "number" ? input.questionId : null,
    answerText: safeTrimmedString(input.answerText) || null,
    codeAnswer: typeof input.codeAnswer === "string" ? input.codeAnswer : null,
    timeSpentSeconds:
      typeof input.timeSpentSeconds === "number" ? input.timeSpentSeconds : null,
    skipped: typeof input.skipped === "boolean" ? input.skipped : undefined,
  };
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeInterviewQuestionOption(
  input:
    | Partial<InterviewQuestionOption>
    | Record<string, unknown>
    | null
    | undefined
): InterviewQuestionOption | null {
  if (!input) return null;

  const source = input as Record<string, unknown>;
  const label = safeString(source.label ?? source.text ?? source.name)?.trim() || null;
  const value = safeString(source.value)?.trim() || null;

  if (!label && !value) return null;

  return {
    id: (source.id as number | string | undefined) ?? undefined,
    label,
    value,
    correct: safeBoolean(source.correct ?? source.isCorrect),
  };
}

export function normalizeInterviewQuestion(
  input: Partial<InterviewQuestion> | Record<string, unknown> | null | undefined
): InterviewQuestion | null {
  if (!input) return null;

  const source = input as Record<string, unknown>;

  return {
    questionId: safeNumber(source.questionId ?? source.id) ?? undefined,
    id: safeNumber(source.id ?? source.questionId) ?? undefined,

    sessionId: safeNumber(source.sessionId),

    order: safeNumber(source.order ?? source.questionOrder),
    type:
      (safeString(source.type ?? source.questionType)?.trim() as
        | InterviewQuestionType
        | undefined) || null,
    difficulty:
      (safeString(source.difficulty)?.trim() as InterviewDifficulty | undefined) ||
      null,

    title: safeString(source.title)?.trim() || null,
    questionText:
      safeString(source.questionText ?? source.text ?? source.question)?.trim() ||
      null,
    expectedAnswer:
      safeString(source.expectedAnswer ?? source.sampleAnswer)?.trim() || null,
    hints: uniqueStrings(source.hints),

    options: Array.isArray(source.options)
      ? source.options
          .map((item) => normalizeInterviewQuestionOption(item))
          .filter((item): item is InterviewQuestionOption => Boolean(item))
      : [],

    createdAt:
      safeString(source.createdAt ?? source.createdDate)?.trim() || null,
    updatedAt:
      safeString(source.updatedAt ?? source.updatedDate)?.trim() || null,
  };
}

export function normalizeInterviewAnswer(
  input: Partial<InterviewAnswer> | Record<string, unknown> | null | undefined
): InterviewAnswer | null {
  if (!input) return null;

  const source = input as Record<string, unknown>;

  return {
    answerId: safeNumber(source.answerId ?? source.id) ?? undefined,
    id: safeNumber(source.id ?? source.answerId) ?? undefined,

    questionId: safeNumber(source.questionId),
    sessionId: safeNumber(source.sessionId),

    answerText:
      safeString(source.answerText ?? source.text ?? source.answer)?.trim() || null,
    codeAnswer: typeof source.codeAnswer === "string" ? source.codeAnswer : null,

    score: normalizeInterviewScore(source.score),
    status:
      (safeString(source.status)?.trim() as InterviewAnswerStatus | undefined) ||
      null,

    timeSpentSeconds: safeNumber(source.timeSpentSeconds ?? source.durationSeconds),
    skipped: safeBoolean(source.skipped),

    createdAt:
      safeString(source.createdAt ?? source.createdDate)?.trim() || null,
    updatedAt:
      safeString(source.updatedAt ?? source.updatedDate)?.trim() || null,
  };
}

export function normalizeInterviewFeedbackItem(
  input:
    | Partial<InterviewFeedbackItem>
    | Record<string, unknown>
    | string
    | null
    | undefined,
  index = 0
): InterviewFeedbackItem | null {
  if (!input) return null;

  if (typeof input === "string") {
    const title = input.trim();
    if (!title) return null;

    return {
      id: `interview-feedback-${index + 1}`,
      title,
      description: null,
      severity: null,
      category: null,
      recommendation: null,
    };
  }

  const source = input as Record<string, unknown>;
  const title =
    safeString(source.title ?? source.name ?? source.heading)?.trim() || null;

  if (!title) return null;

  return {
    id:
      safeTrimmedString(source.id) ||
      safeTrimmedString(source.code) ||
      `interview-feedback-${index + 1}`,
    title,
    description:
      safeString(source.description ?? source.message)?.trim() || null,
    severity:
      (safeString(source.severity)?.trim() as InterviewFeedbackSeverity) || null,
    category: safeString(source.category)?.trim() || null,
    recommendation:
      safeString(source.recommendation ?? source.action)?.trim() || null,
  };
}

export function normalizeInterviewEvaluation(
  input:
    | Partial<InterviewEvaluation>
    | Record<string, unknown>
    | null
    | undefined
): InterviewEvaluation | null {
  if (!input) return null;

  const source = input as Record<string, unknown>;
  const score = normalizeInterviewScore(source.score);

  return {
    evaluationId: safeNumber(source.evaluationId ?? source.id) ?? undefined,
    id: safeNumber(source.id ?? source.evaluationId) ?? undefined,

    sessionId: safeNumber(source.sessionId),

    score,
    band: isInterviewEvaluationBand(source.band)
      ? source.band
      : getInterviewEvaluationBand(score),

    communicationScore: normalizeInterviewScore(source.communicationScore),
    technicalScore: normalizeInterviewScore(source.technicalScore),
    confidenceScore: normalizeInterviewScore(source.confidenceScore),
    problemSolvingScore: normalizeInterviewScore(source.problemSolvingScore),

    summary: safeString(source.summary)?.trim() || null,

    strengths: uniqueStrings(source.strengths),
    weaknesses: uniqueStrings(source.weaknesses),
    recommendations: uniqueStrings(source.recommendations),

    feedbackItems: Array.isArray(source.feedbackItems ?? source.feedback)
      ? ((source.feedbackItems ?? source.feedback) as unknown[])
          .map((item: unknown, index: number) =>
            normalizeInterviewFeedbackItem(
              item as string | Record<string, unknown> | Partial<InterviewFeedbackItem> | null | undefined,
              index
            )
          )
          .filter((item: InterviewFeedbackItem | null): item is InterviewFeedbackItem =>
            Boolean(item)
          )
      : [],

    breakdown:
      source.breakdown && typeof source.breakdown === "object"
        ? (source.breakdown as InterviewEvaluationBreakdown)
        : null,

    evaluatedAt:
      safeString(source.evaluatedAt ?? source.createdAt)?.trim() || null,
  };
}

export function normalizeInterviewSession(
  input: Partial<InterviewSession> | Record<string, unknown> | null | undefined
): InterviewSession | null {
  if (!input) return null;

  const source = input as Record<string, unknown>;

  return {
    interviewSessionId:
      safeNumber(source.interviewSessionId ?? source.id) ?? undefined,
    id: safeNumber(source.id ?? source.interviewSessionId) ?? undefined,

    title: safeString(source.title)?.trim() || null,
    mode:
      (safeString(source.mode)?.trim() as InterviewMode | undefined) || null,
    type:
      (safeString(source.type ?? source.interviewType)?.trim() as
        | InterviewType
        | undefined) || null,
    difficulty:
      (safeString(source.difficulty)?.trim() as InterviewDifficulty | undefined) ||
      null,
    status:
      (safeString(source.status)?.trim() as InterviewStatus | undefined) || null,

    resumeVersionId: safeNumber(source.resumeVersionId),
    githubAnalysisId: safeNumber(source.githubAnalysisId),
    jobApplicationId: safeNumber(source.jobApplicationId),

    jobTitle: safeString(source.jobTitle)?.trim() || null,
    companyName: safeString(source.companyName)?.trim() || null,

    totalQuestions: safeNumber(source.totalQuestions),
    answeredQuestions: safeNumber(source.answeredQuestions),
    durationMinutes: safeNumber(source.durationMinutes),

    currentQuestionIndex: safeNumber(
      source.currentQuestionIndex ?? source.currentIndex
    ),

    questions: Array.isArray(source.questions)
      ? source.questions
          .map((item) => normalizeInterviewQuestion(item))
          .filter((item): item is InterviewQuestion => Boolean(item))
      : [],

    answers: Array.isArray(source.answers)
      ? source.answers
          .map((item) => normalizeInterviewAnswer(item))
          .filter((item): item is InterviewAnswer => Boolean(item))
      : [],

    evaluation: normalizeInterviewEvaluation(
      source.evaluation as
        | Record<string, unknown>
        | Partial<InterviewEvaluation>
        | null
        | undefined
    ),

    startedAt:
      safeString(source.startedAt ?? source.startTime)?.trim() || null,
    endedAt: safeString(source.endedAt ?? source.endTime)?.trim() || null,
    createdAt:
      safeString(source.createdAt ?? source.createdDate)?.trim() || null,
    updatedAt:
      safeString(source.updatedAt ?? source.updatedDate)?.trim() || null,
  };
}

export function normalizeInterviewSessionSummary(
  input:
    | Partial<InterviewSessionSummary>
    | Record<string, unknown>
    | null
    | undefined
): InterviewSessionSummary | null {
  if (!input) return null;

  const source = input as Record<string, unknown>;
  const score = normalizeInterviewScore(
    source.score ?? source.evaluationScore ?? source.finalScore
  );

  return {
    interviewSessionId:
      safeNumber(source.interviewSessionId ?? source.id) ?? undefined,
    id: safeNumber(source.id ?? source.interviewSessionId) ?? undefined,

    title: safeString(source.title)?.trim() || null,
    mode:
      (safeString(source.mode)?.trim() as InterviewMode | undefined) || null,
    type:
      (safeString(source.type ?? source.interviewType)?.trim() as
        | InterviewType
        | undefined) || null,
    difficulty:
      (safeString(source.difficulty)?.trim() as InterviewDifficulty | undefined) ||
      null,
    status:
      (safeString(source.status)?.trim() as InterviewStatus | undefined) || null,

    score,
    band: isInterviewEvaluationBand(source.band)
      ? source.band
      : getInterviewEvaluationBand(score),

    jobTitle: safeString(source.jobTitle)?.trim() || null,
    companyName: safeString(source.companyName)?.trim() || null,

    startedAt:
      safeString(source.startedAt ?? source.startTime)?.trim() || null,
    endedAt: safeString(source.endedAt ?? source.endTime)?.trim() || null,
    createdAt:
      safeString(source.createdAt ?? source.createdDate)?.trim() || null,
  };
}

export function normalizeInterviewSessionListResponse(
  input: unknown,
  fallbackPage = 0,
  fallbackSize = 10
): InterviewSessionListResponse {
  const unwrapped = unwrapInterviewResponse<unknown>(input);

  if (Array.isArray(unwrapped)) {
    const items = unwrapped
      .map((item) => normalizeInterviewSessionSummary(item))
      .filter((item): item is InterviewSessionSummary => Boolean(item));

    return {
      items,
      totalElements: items.length,
      totalPages: 1,
      page: 0,
      size: items.length || fallbackSize,
    };
  }

  const source =
    unwrapped && typeof unwrapped === "object"
      ? (unwrapped as Record<string, unknown>)
      : {};

  const rawItems = Array.isArray(source.content)
    ? source.content
    : Array.isArray(source.items)
      ? source.items
      : Array.isArray(source.rows)
        ? source.rows
        : Array.isArray(source.list)
          ? source.list
          : [];

  const items = rawItems
    .map((item) => normalizeInterviewSessionSummary(item))
    .filter((item): item is InterviewSessionSummary => Boolean(item));

  return {
    items,
    totalElements: safeNumber(source.totalElements) ?? items.length,
    totalPages: Math.max(1, safeNumber(source.totalPages) ?? 1),
    page: safeNumber(source.number) ?? fallbackPage,
    size: safeNumber(source.size) ?? fallbackSize,
  };
}

export function normalizeInterviewHealthResponse(
  input: Partial<InterviewHealthResponse> | Record<string, unknown> | null | undefined
): InterviewHealthResponse {
  const source =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  return {
    success:
      typeof source.success === "boolean" ? source.success : true,
    message: safeString(source.message)?.trim() || undefined,
    status: safeString(source.status)?.trim() || null,
    provider: safeString(source.provider)?.trim() || null,
    model: safeString(source.model)?.trim() || null,
  };
}

/* =========================================================
   DOMAIN HELPERS
========================================================= */

export function getInterviewSessionId(
  session: Partial<InterviewSession> | null | undefined
): number | null {
  if (!session) return null;
  return safeNumber(session.interviewSessionId ?? session.id);
}

export function getInterviewSessionDisplayTitle(
  session: Partial<InterviewSession> | Partial<InterviewSessionSummary> | null | undefined
): string {
  if (!session) return "Interview Session";

  return (
    session.title ||
    [session.jobTitle, session.companyName].filter(Boolean).join(" - ").trim() ||
    "Interview Session"
  );
}

export function getInterviewProgressPercentage(
  session: Partial<InterviewSession> | null | undefined
): number {
  if (!session) return 0;

  const total = safeNumber(session.totalQuestions);
  const answered = safeNumber(session.answeredQuestions);

  if (total && total > 0 && answered !== null) {
    return Math.max(0, Math.min(100, Math.round((answered / total) * 100)));
  }

  if (Array.isArray(session.questions) && session.questions.length > 0) {
    const submittedCount = Array.isArray(session.answers)
      ? session.answers.filter(
          (answer) =>
            !!(
              answer.answerText ||
              answer.codeAnswer ||
              answer.status === "SUBMITTED" ||
              answer.status === "EVALUATED"
            )
        ).length
      : 0;

    return Math.max(
      0,
      Math.min(100, Math.round((submittedCount / session.questions.length) * 100))
    );
  }

  return 0;
}

export function hasCompletedInterview(
  session: Partial<InterviewSession> | Partial<InterviewSessionSummary> | null | undefined
): boolean {
  return (session?.status || "").toUpperCase() === "COMPLETED";
}

export function getTopInterviewFeedback(
  feedback: Array<
    Partial<InterviewFeedbackItem> | Record<string, unknown> | string
  > = [],
  limit = 3
): InterviewFeedbackItem[] {
  const severityWeight = (severity?: string | null): number => {
    const normalized = (severity || "").toUpperCase();
    if (normalized === "HIGH") return 3;
    if (normalized === "MEDIUM") return 2;
    if (normalized === "LOW") return 1;
    return 0;
  };

  return feedback
    .map((item, index) => normalizeInterviewFeedbackItem(item, index))
    .filter((item): item is InterviewFeedbackItem => Boolean(item))
    .sort(
      (a, b) => severityWeight(b.severity) - severityWeight(a.severity)
    )
    .slice(0, limit);
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const interviewTypeUtils = {
  unwrapInterviewResponse,
  extractInterviewMessage,

  normalizeInterviewScore,
  getInterviewEvaluationBand,
  getInterviewScoreBadgeClass,
  getInterviewStatusBadgeClass,
  getInterviewFeedbackSeverityClass,

  buildInterviewSessionCreateRequest,
  buildInterviewSessionStatusUpdateRequest,
  buildInterviewAnswerSubmitRequest,

  normalizeInterviewQuestionOption,
  normalizeInterviewQuestion,
  normalizeInterviewAnswer,
  normalizeInterviewFeedbackItem,
  normalizeInterviewEvaluation,
  normalizeInterviewSession,
  normalizeInterviewSessionSummary,
  normalizeInterviewSessionListResponse,
  normalizeInterviewHealthResponse,

  getInterviewSessionId,
  getInterviewSessionDisplayTitle,
  getInterviewProgressPercentage,
  hasCompletedInterview,
  getTopInterviewFeedback,
};

/* =========================================================
   EXAMPLE USAGE

   import type {
     InterviewSession,
     InterviewSessionCreateRequest,
     InterviewEvaluation,
   } from "@/types/interview";

   import { interviewTypeUtils } from "@/types/interview";

   const payload = interviewTypeUtils.buildInterviewSessionCreateRequest({
     title: "Frontend Mock Interview",
     mode: "PRACTICE",
     type: "TECHNICAL",
     resumeVersionId: 12,
     totalQuestions: 10,
   });

   const normalized = interviewTypeUtils.normalizeInterviewSession(apiResponse);
========================================================= */