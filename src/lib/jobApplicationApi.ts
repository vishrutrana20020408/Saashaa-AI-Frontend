// src/lib/jobApplicationApi.ts
//
// Central Job Application API client for frontend ↔ backend integration.
//
// Purpose:
// - Single reusable API layer for job application flows
// - Supports user and admin job-application related pages
// - Integrates with backend endpoints for:
//   - job application CRUD
//   - status updates
//   - resume linkage
//   - interview tracking
//   - notes / feedback / timeline
//   - latest backend-aligned resume tailoring flow fields
//
// Architecture alignment:
// - Works with Spring Boot backend
// - Supports cookie/session auth via credentials: "include"
// - Keeps bearer token fallback for older frontend auth flow
// - Supports wrapped response styles and pageable payloads
// - Supports endpoint fallback patterns for better backend compatibility
//
// Latest project update alignment:
// - Preserves backend-first frontend ideology
// - Supports Resume Tailoring module fields:
//   resumeVersionId, generateTailoredResume, generatePreview, toolAnswers
// - Supports ATS score before/after fields and tailored resume version linkage
//
// Recommended backend endpoints:
//   POST   /api/user/job-application
//   GET    /api/user/job-application
//   GET    /api/user/job-application/{jobApplicationId}
//
// Optional compatibility / fallback endpoints:
//   GET    /api/job-applications
//   POST   /api/job-applications
//   GET    /api/job-applications/{jobApplicationId}
//   PUT    /api/job-applications/{jobApplicationId}
//   DELETE /api/job-applications/{jobApplicationId}
//   PATCH  /api/job-applications/{jobApplicationId}/status
//   PATCH  /api/job-applications/{jobApplicationId}/resume
//   GET    /api/job-applications/{jobApplicationId}/timeline
//   GET    /api/admin/job-applications
//   GET    /api/admin/job-applications/{jobApplicationId}
//
// Supported response styles:
// - plain object / plain array
// - Spring pageable
// - wrapped { data | result | payload | content }
// - nested wrapped payloads

export const JOB_APPLICATION_API_PATHS = {
  USER_JOB_APPLICATIONS: "/api/user/job-application",
  USER_JOB_APPLICATIONS_LEGACY: "/api/job-applications",
  ADMIN_JOB_APPLICATIONS: "/api/admin/job-applications",
} as const;

/* =========================================================
   TYPES
========================================================= */

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  details?: unknown;
  status?: number;
  timestamp?: string;
  path?: string;
  data?: T | null;
  result?: T | null;
  payload?: T | null;
  content?: T | null;
};

export type PageableResponse<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
  items?: T[];
  rows?: T[];
  list?: T[];
};

export type ApiListResponse<T> = {
  items: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

export type SortDirection = "asc" | "desc";

export type JobApplicationStatus =
  | "DRAFT"
  | "SAVED"
  | "APPLIED"
  | "IN_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEWED"
  | "OFFERED"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN"
  | string;

export type WorkMode =
  | "ONSITE"
  | "REMOTE"
  | "HYBRID"
  | string;

export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "INTERNSHIP"
  | "FREELANCE"
  | "TEMPORARY"
  | string;

export type InterviewStage =
  | "SCREENING"
  | "TECHNICAL"
  | "MANAGERIAL"
  | "HR"
  | "FINAL"
  | "OTHER"
  | string;

export type JobApplicationTimelineEventType =
  | "CREATED"
  | "UPDATED"
  | "STATUS_CHANGED"
  | "RESUME_LINKED"
  | "INTERVIEW_ADDED"
  | "NOTE_ADDED"
  | "DEADLINE_UPDATED"
  | string;

export type ToolKnowledgeAnswer = {
  toolName?: string | null;
  answer?: string | null;
  known?: boolean | null;
  notes?: string | null;
};

export type JobApplicationInterview = {
  interviewId?: number;
  id?: number;
  stage?: InterviewStage | null;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  mode?: WorkMode | null;
  meetingLink?: string | null;
  location?: string | null;
  interviewerName?: string | null;
  interviewerEmail?: string | null;
  notes?: string | null;
  feedback?: string | null;
  result?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type JobApplicationTimelineEvent = {
  eventId?: number;
  id?: number;
  type?: JobApplicationTimelineEventType | null;
  title?: string | null;
  description?: string | null;
  createdAt?: string | null;
  createdBy?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type JobApplication = {
  jobApplicationId?: number;
  id?: number;
  applicationCode?: string | null;
  userId?: number | null;
  resumeId?: number | null;
  resumeVersionId?: number | null;

  tailoredResumeVersionId?: number | null;
  tailoredResumeVersionCode?: string | null;

  companyName?: string | null;
  companyWebsite?: string | null;
  companyLocation?: string | null;

  jobTitle?: string | null;
  jobRole?: string | null;
  department?: string | null;
  jobDescription?: string | null;
  requiredSkills?: string[] | null;
  preferredSkills?: string[] | null;

  source?: string | null;
  applicationSource?: string | null;
  applicationUrl?: string | null;
  referralName?: string | null;
  recruiterName?: string | null;
  recruiterEmail?: string | null;

  status?: JobApplicationStatus | null;
  workMode?: WorkMode | null;
  employmentType?: EmploymentType | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;

  appliedAt?: string | null;
  deadlineAt?: string | null;
  nextActionAt?: string | null;
  interviewDate?: string | null;

  notes?: string | null;
  additionalNotes?: string | null;
  feedback?: string | null;
  tags?: string[] | null;

  atsScoreBefore?: number | null;
  atsScoreAfter?: number | null;
  detectedTools?: string[] | null;
  detectedKeywords?: string[] | null;
  toolAnswers?: ToolKnowledgeAnswer[] | null;

  createdAt?: string | null;
  updatedAt?: string | null;

  interviews?: JobApplicationInterview[];
  timeline?: JobApplicationTimelineEvent[];
};

export type JobApplicationDetails = JobApplication;

export type JobApplicationListQueryParams = {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
  status?: string;
  companyName?: string;
  jobTitle?: string;
  workMode?: string;
  employmentType?: string;
  resumeId?: number | string;
  resumeVersionId?: number | string;
  userId?: number | string;
  fromDate?: string;
  toDate?: string;
  source?: string;
};

export type CreateJobApplicationPayload = {
  resumeId?: number | null;
  resumeVersionId?: number | null;

  companyName: string;
  companyWebsite?: string;
  companyLocation?: string;

  jobTitle: string;
  jobRole?: string;
  department?: string;
  jobDescription?: string;

  requiredSkills?: string[];
  preferredSkills?: string[];

  source?: string;
  applicationSource?: string;
  applicationUrl?: string;
  referralName?: string;
  recruiterName?: string;
  recruiterEmail?: string;

  status?: JobApplicationStatus;
  workMode?: WorkMode;
  employmentType?: EmploymentType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;

  appliedAt?: string | null;
  deadlineAt?: string | null;
  nextActionAt?: string | null;
  interviewDate?: string | null;

  notes?: string;
  additionalNotes?: string;
  feedback?: string;
  tags?: string[];

  generateTailoredResume?: boolean;
  generatePreview?: boolean;
  toolAnswers?: ToolKnowledgeAnswer[];
};

export type UpdateJobApplicationPayload = Partial<CreateJobApplicationPayload>;

export type UpdateJobApplicationStatusPayload = {
  status: JobApplicationStatus;
  notes?: string;
};

export type LinkResumePayload = {
  resumeId?: number | null;
  resumeVersionId?: number | null;
};

export type CreateInterviewPayload = {
  stage?: InterviewStage;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  mode?: WorkMode;
  meetingLink?: string;
  location?: string;
  interviewerName?: string;
  interviewerEmail?: string;
  notes?: string;
  feedback?: string;
  result?: string;
};

export type JobApplicationApiRequestOptions = {
  token?: string | null;
  apiBaseUrl?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  withCredentials?: RequestCredentials;
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function getApiBaseUrl(apiBaseUrl?: string): string {
  if (typeof apiBaseUrl === "string" && apiBaseUrl.trim()) {
    return apiBaseUrl.replace(/\/+$/, "");
  }

  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, "") ||
    "http://localhost:8080"
  );
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token") ||
    null
  );
}

function unwrapResponse<T>(value: unknown): T {
  if (value && typeof value === "object") {
    const level1 = value as ApiEnvelope<T>;
    const first =
      level1.data ?? level1.result ?? level1.payload ?? level1.content ?? value;

    if (first && typeof first === "object") {
      const level2 = first as ApiEnvelope<T>;
      return (level2.data ??
        level2.result ??
        level2.payload ??
        level2.content ??
        first) as T;
    }

    return first as T;
  }
  return value as T;
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeNullableNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : null;
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
      values
        .filter(
          (v): v is string => typeof v === "string" && v.trim().length > 0
        )
        .map((v) => v.trim())
    ),
  ];
}

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const top = payload as ApiEnvelope<unknown>;
  if (typeof top.message === "string" && top.message.trim()) {
    return top.message.trim();
  }

  const nested = unwrapResponse<any>(payload);
  if (nested && typeof nested === "object" && typeof nested.message === "string") {
    return nested.message.trim();
  }

  return null;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    return (
      safeString(record.message) ||
      safeString(record.error) ||
      safeString(record.details) ||
      `Request failed with status ${status}`
    );
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return `Request failed with status ${status}`;
}

function buildUrl(
  path: string,
  params?: Record<string, unknown>,
  apiBaseUrl?: string
): string {
  const base = getApiBaseUrl(apiBaseUrl);
  const url = new URL(
    `${base}${path}`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost"
  );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        !(typeof value === "string" && value.trim() === "")
      ) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return `${base}${path}${url.search}`;
}

function normalizePageableList<T>(
  raw: T[] | PageableResponse<T> | Record<string, unknown>,
  fallbackPage = 0,
  fallbackSize = 10
): ApiListResponse<T> {
  if (Array.isArray(raw)) {
    return {
      items: raw,
      totalElements: raw.length,
      totalPages: 1,
      page: 0,
      size: raw.length || fallbackSize,
    };
  }

  const maybePage = raw as PageableResponse<T>;
  const fallbackArray = maybePage.content || maybePage.items || maybePage.rows || maybePage.list || [];

  return {
    items: fallbackArray,
    totalElements: safeNumber(maybePage.totalElements, fallbackArray.length),
    totalPages: Math.max(1, safeNumber(maybePage.totalPages, fallbackArray.length > 0 ? 1 : 0)),
    page: safeNumber(maybePage.number, fallbackPage),
    size: safeNumber(maybePage.size, fallbackSize),
  };
}

export function getJobApplicationId(
  jobApplication: Partial<JobApplication> | null | undefined
): number | null {
  if (!jobApplication) return null;
  return safeNullableNumber(jobApplication.jobApplicationId ?? jobApplication.id);
}

export function getInterviewId(
  interview: Partial<JobApplicationInterview> | null | undefined
): number | null {
  if (!interview) return null;
  return safeNullableNumber(interview.interviewId ?? interview.id);
}

/* =========================================================
   HTTP CORE
========================================================= */

export class JobApplicationApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "JobApplicationApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  options: JobApplicationApiRequestOptions = {},
  body?: unknown,
  queryParams?: Record<string, unknown>
): Promise<T> {
  const token = options.token ?? getAccessToken();
  const url = buildUrl(path, queryParams, options.apiBaseUrl);

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: options.withCredentials ?? "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
    cache: "no-store",
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new JobApplicationApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return unwrapResponse<T>(payload as T);
}

async function requestWithFallback<T>(
  methods: string[],
  paths: string[],
  options: JobApplicationApiRequestOptions = {},
  body?: unknown,
  queryParams?: Record<string, unknown>
): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    for (const method of methods) {
      try {
        return await request<T>(method, path, options, body, queryParams);
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (lastError instanceof JobApplicationApiError) {
    throw lastError;
  }

  throw new JobApplicationApiError("Request failed.", 500, lastError);
}

async function get<T>(
  path: string,
  options?: JobApplicationApiRequestOptions,
  queryParams?: Record<string, unknown>
): Promise<T> {
  return request<T>("GET", path, options, undefined, queryParams);
}

async function del<T>(
  path: string,
  options?: JobApplicationApiRequestOptions,
  queryParams?: Record<string, unknown>
): Promise<T> {
  return request<T>("DELETE", path, options, undefined, queryParams);
}

/* =========================================================
   PATH HELPERS
========================================================= */

function userCollectionPaths() {
  return [
    JOB_APPLICATION_API_PATHS.USER_JOB_APPLICATIONS,
    JOB_APPLICATION_API_PATHS.USER_JOB_APPLICATIONS_LEGACY,
  ];
}

function userJobApplicationPaths(jobApplicationId: string | number) {
  return [
    `${JOB_APPLICATION_API_PATHS.USER_JOB_APPLICATIONS}/${jobApplicationId}`,
    `${JOB_APPLICATION_API_PATHS.USER_JOB_APPLICATIONS_LEGACY}/${jobApplicationId}`,
  ];
}

function adminJobApplicationPaths(jobApplicationId: string | number) {
  return [
    `${JOB_APPLICATION_API_PATHS.ADMIN_JOB_APPLICATIONS}/${jobApplicationId}`,
  ];
}

function statusPaths(jobApplicationId: string | number, isAdmin = false) {
  const bases = isAdmin
    ? [JOB_APPLICATION_API_PATHS.ADMIN_JOB_APPLICATIONS]
    : userCollectionPaths();

  return bases.map((base) => `${base}/${jobApplicationId}/status`);
}

function resumeLinkPaths(jobApplicationId: string | number, isAdmin = false) {
  const bases = isAdmin
    ? [JOB_APPLICATION_API_PATHS.ADMIN_JOB_APPLICATIONS]
    : userCollectionPaths();

  return bases.map((base) => `${base}/${jobApplicationId}/resume`);
}

function timelinePaths(jobApplicationId: string | number, isAdmin = false) {
  const bases = isAdmin
    ? [JOB_APPLICATION_API_PATHS.ADMIN_JOB_APPLICATIONS]
    : userCollectionPaths();

  return bases.map((base) => `${base}/${jobApplicationId}/timeline`);
}

function interviewCollectionPaths(jobApplicationId: string | number, isAdmin = false) {
  const bases = isAdmin
    ? [JOB_APPLICATION_API_PATHS.ADMIN_JOB_APPLICATIONS]
    : userCollectionPaths();

  return bases.map((base) => `${base}/${jobApplicationId}/interviews`);
}

function interviewItemPaths(
  jobApplicationId: string | number,
  interviewId: string | number,
  isAdmin = false
) {
  const bases = isAdmin
    ? [JOB_APPLICATION_API_PATHS.ADMIN_JOB_APPLICATIONS]
    : userCollectionPaths();

  return bases.map((base) => `${base}/${jobApplicationId}/interviews/${interviewId}`);
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeToolKnowledgeAnswer(
  answer: Partial<ToolKnowledgeAnswer> | null | undefined
): ToolKnowledgeAnswer | null {
  if (!answer) return null;

  const toolName = safeNullableString(answer.toolName);
  const response = safeNullableString(answer.answer);
  const known = safeBoolean(answer.known);
  const notes = safeNullableString(answer.notes);

  if (!toolName && !response && known === null && !notes) return null;

  return {
    toolName,
    answer: response,
    known,
    notes,
  };
}

export function normalizeJobApplicationInterview(
  interview: Partial<JobApplicationInterview>
): JobApplicationInterview {
  return {
    interviewId: safeNullableNumber(interview.interviewId ?? interview.id) ?? undefined,
    id: safeNullableNumber(interview.id ?? interview.interviewId) ?? undefined,
    stage: interview.stage ?? null,
    scheduledAt: safeNullableString(interview.scheduledAt),
    durationMinutes: safeNullableNumber(interview.durationMinutes),
    mode: interview.mode ?? null,
    meetingLink: safeNullableString(interview.meetingLink),
    location: safeNullableString(interview.location),
    interviewerName: safeNullableString(interview.interviewerName),
    interviewerEmail: safeNullableString(interview.interviewerEmail),
    notes: safeNullableString(interview.notes),
    feedback: safeNullableString(interview.feedback),
    result: safeNullableString(interview.result),
    createdAt: safeNullableString(interview.createdAt),
    updatedAt: safeNullableString(interview.updatedAt),
  };
}

export function normalizeJobApplicationTimelineEvent(
  event: Partial<JobApplicationTimelineEvent>
): JobApplicationTimelineEvent {
  return {
    eventId: safeNullableNumber(event.eventId ?? event.id) ?? undefined,
    id: safeNullableNumber(event.id ?? event.eventId) ?? undefined,
    type: event.type ?? null,
    title: safeNullableString(event.title),
    description: safeNullableString(event.description),
    createdAt: safeNullableString(event.createdAt),
    createdBy: safeNullableString(event.createdBy),
    metadata:
      event.metadata && typeof event.metadata === "object"
        ? (event.metadata as Record<string, unknown>)
        : null,
  };
}

export function normalizeJobApplication(
  jobApplication: Partial<JobApplication>
): JobApplication {
  return {
    jobApplicationId:
      safeNullableNumber(jobApplication.jobApplicationId ?? jobApplication.id) ?? undefined,
    id: safeNullableNumber(jobApplication.id ?? jobApplication.jobApplicationId) ?? undefined,
    applicationCode: safeNullableString(jobApplication.applicationCode),
    userId: safeNullableNumber(jobApplication.userId),
    resumeId: safeNullableNumber(jobApplication.resumeId),
    resumeVersionId: safeNullableNumber(jobApplication.resumeVersionId),

    tailoredResumeVersionId: safeNullableNumber(jobApplication.tailoredResumeVersionId),
    tailoredResumeVersionCode: safeNullableString(jobApplication.tailoredResumeVersionCode),

    companyName: safeNullableString(jobApplication.companyName),
    companyWebsite: safeNullableString(jobApplication.companyWebsite),
    companyLocation: safeNullableString(jobApplication.companyLocation),

    jobTitle: safeNullableString(jobApplication.jobTitle),
    jobRole: safeNullableString(jobApplication.jobRole),
    department: safeNullableString(jobApplication.department),
    jobDescription: safeNullableString(jobApplication.jobDescription),
    requiredSkills: uniqueStrings(jobApplication.requiredSkills),
    preferredSkills: uniqueStrings(jobApplication.preferredSkills),

    source: safeNullableString(jobApplication.source),
    applicationSource:
      safeNullableString(jobApplication.applicationSource) ||
      safeNullableString(jobApplication.source),
    applicationUrl: safeNullableString(jobApplication.applicationUrl),
    referralName: safeNullableString(jobApplication.referralName),
    recruiterName: safeNullableString(jobApplication.recruiterName),
    recruiterEmail: safeNullableString(jobApplication.recruiterEmail),

    status: jobApplication.status ?? null,
    workMode: jobApplication.workMode ?? null,
    employmentType: jobApplication.employmentType ?? null,
    salaryMin: safeNullableNumber(jobApplication.salaryMin),
    salaryMax: safeNullableNumber(jobApplication.salaryMax),
    currency: safeNullableString(jobApplication.currency),

    appliedAt: safeNullableString(jobApplication.appliedAt),
    deadlineAt: safeNullableString(jobApplication.deadlineAt),
    nextActionAt: safeNullableString(jobApplication.nextActionAt),
    interviewDate: safeNullableString(jobApplication.interviewDate),

    notes: safeNullableString(jobApplication.notes),
    additionalNotes: safeNullableString(jobApplication.additionalNotes),
    feedback: safeNullableString(jobApplication.feedback),
    tags: uniqueStrings(jobApplication.tags),

    atsScoreBefore: safeNullableNumber(jobApplication.atsScoreBefore),
    atsScoreAfter: safeNullableNumber(jobApplication.atsScoreAfter),
    detectedTools: uniqueStrings(jobApplication.detectedTools),
    detectedKeywords: uniqueStrings(jobApplication.detectedKeywords),
    toolAnswers: Array.isArray(jobApplication.toolAnswers)
      ? jobApplication.toolAnswers
          .map((item) => normalizeToolKnowledgeAnswer(item))
          .filter((item): item is ToolKnowledgeAnswer => Boolean(item))
      : [],

    createdAt: safeNullableString(jobApplication.createdAt),
    updatedAt: safeNullableString(jobApplication.updatedAt),

    interviews: Array.isArray(jobApplication.interviews)
      ? jobApplication.interviews.map(normalizeJobApplicationInterview)
      : [],
    timeline: Array.isArray(jobApplication.timeline)
      ? jobApplication.timeline.map(normalizeJobApplicationTimelineEvent)
      : [],
  };
}

/* =========================================================
   QUERY BUILDERS
========================================================= */

function buildJobApplicationListQuery(params: JobApplicationListQueryParams = {}) {
  return {
    page: params.page ?? 0,
    size: params.size ?? 10,
    search: params.search,
    sortBy: params.sortBy ?? "updatedAt",
    sortDir: params.sortDir ?? "desc",
    status: params.status,
    companyName: params.companyName,
    jobTitle: params.jobTitle,
    workMode: params.workMode,
    employmentType: params.employmentType,
    resumeId: params.resumeId,
    resumeVersionId: params.resumeVersionId,
    userId: params.userId,
    fromDate: params.fromDate,
    toDate: params.toDate,
    source: params.source,
  };
}

/* =========================================================
   USER JOB APPLICATIONS
========================================================= */

export async function getJobApplicationList(
  params: JobApplicationListQueryParams = {},
  options?: JobApplicationApiRequestOptions
): Promise<ApiListResponse<JobApplication>> {
  const raw = await requestWithFallback<
    JobApplication[] | PageableResponse<JobApplication> | Record<string, unknown>
  >(
    ["GET"],
    userCollectionPaths(),
    options,
    undefined,
    buildJobApplicationListQuery(params)
  );

  const normalized = normalizePageableList<JobApplication>(
    raw,
    params.page ?? 0,
    params.size ?? 10
  );

  return {
    ...normalized,
    items: normalized.items.map(normalizeJobApplication),
  };
}

export async function getJobApplicationById(
  jobApplicationId: string | number,
  options?: JobApplicationApiRequestOptions
): Promise<JobApplicationDetails> {
  const raw = await requestWithFallback<JobApplicationDetails>(
    ["GET"],
    userJobApplicationPaths(jobApplicationId),
    options
  );

  return normalizeJobApplication(raw);
}

export async function createJobApplication(
  payload: CreateJobApplicationPayload,
  options?: JobApplicationApiRequestOptions
): Promise<JobApplicationDetails> {
  const raw = await requestWithFallback<JobApplicationDetails>(
    ["POST"],
    userCollectionPaths(),
    options,
    buildCreateJobApplicationPayload(payload)
  );

  return normalizeJobApplication(raw);
}

export async function updateJobApplication(
  jobApplicationId: string | number,
  payload: UpdateJobApplicationPayload,
  options?: JobApplicationApiRequestOptions
): Promise<JobApplicationDetails> {
  const raw = await requestWithFallback<JobApplicationDetails>(
    ["PUT", "PATCH"],
    userJobApplicationPaths(jobApplicationId),
    options,
    buildUpdateJobApplicationPayload(payload)
  );

  return normalizeJobApplication(raw);
}

export async function deleteJobApplication(
  jobApplicationId: string | number,
  options?: JobApplicationApiRequestOptions
): Promise<{ success: boolean; message?: string }> {
  const raw = await requestWithFallback<{ success?: boolean; message?: string }>(
    ["DELETE"],
    userJobApplicationPaths(jobApplicationId),
    options
  );

  return {
    success: raw?.success ?? true,
    message: raw?.message || undefined,
  };
}

export async function updateJobApplicationStatus(
  jobApplicationId: string | number,
  payload: UpdateJobApplicationStatusPayload,
  options?: JobApplicationApiRequestOptions
): Promise<JobApplicationDetails> {
  const raw = await requestWithFallback<JobApplicationDetails>(
    ["PATCH", "PUT", "POST"],
    statusPaths(jobApplicationId),
    options,
    payload
  );

  return normalizeJobApplication(raw);
}

export async function linkResumeToJobApplication(
  jobApplicationId: string | number,
  payload: LinkResumePayload,
  options?: JobApplicationApiRequestOptions
): Promise<JobApplicationDetails> {
  const raw = await requestWithFallback<JobApplicationDetails>(
    ["PATCH", "PUT", "POST"],
    resumeLinkPaths(jobApplicationId),
    options,
    payload
  );

  return normalizeJobApplication(raw);
}

/* =========================================================
   INTERVIEWS
========================================================= */

export async function getJobApplicationInterviews(
  jobApplicationId: string | number,
  options?: JobApplicationApiRequestOptions
): Promise<JobApplicationInterview[]> {
  const raw = await requestWithFallback<JobApplicationInterview[] | Record<string, unknown>>(
    ["GET"],
    interviewCollectionPaths(jobApplicationId),
    options
  );

  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeJobApplicationInterview);
}

export async function createJobApplicationInterview(
  jobApplicationId: string | number,
  payload: CreateInterviewPayload,
  options?: JobApplicationApiRequestOptions
): Promise<JobApplicationInterview> {
  const raw = await requestWithFallback<JobApplicationInterview>(
    ["POST"],
    interviewCollectionPaths(jobApplicationId),
    options,
    payload
  );

  return normalizeJobApplicationInterview(raw);
}

export async function updateJobApplicationInterview(
  jobApplicationId: string | number,
  interviewId: string | number,
  payload: CreateInterviewPayload,
  options?: JobApplicationApiRequestOptions
): Promise<JobApplicationInterview> {
  const raw = await requestWithFallback<JobApplicationInterview>(
    ["PUT", "PATCH"],
    interviewItemPaths(jobApplicationId, interviewId),
    options,
    payload
  );

  return normalizeJobApplicationInterview(raw);
}

export async function deleteJobApplicationInterview(
  jobApplicationId: string | number,
  interviewId: string | number,
  options?: JobApplicationApiRequestOptions
): Promise<{ success: boolean; message?: string }> {
  const raw = await requestWithFallback<{ success?: boolean; message?: string }>(
    ["DELETE"],
    interviewItemPaths(jobApplicationId, interviewId),
    options
  );

  return {
    success: raw?.success ?? true,
    message: raw?.message || undefined,
  };
}

/* =========================================================
   TIMELINE
========================================================= */

export async function getJobApplicationTimeline(
  jobApplicationId: string | number,
  options?: JobApplicationApiRequestOptions
): Promise<JobApplicationTimelineEvent[]> {
  const raw = await requestWithFallback<JobApplicationTimelineEvent[] | Record<string, unknown>>(
    ["GET"],
    timelinePaths(jobApplicationId),
    options
  );

  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeJobApplicationTimelineEvent);
}

/* =========================================================
   ADMIN JOB APPLICATIONS
========================================================= */

export async function getAdminJobApplicationList(
  params: JobApplicationListQueryParams = {},
  options?: JobApplicationApiRequestOptions
): Promise<ApiListResponse<JobApplication>> {
  const raw = await get<
    JobApplication[] | PageableResponse<JobApplication> | Record<string, unknown>
  >(
    JOB_APPLICATION_API_PATHS.ADMIN_JOB_APPLICATIONS,
    options,
    buildJobApplicationListQuery(params)
  );

  const normalized = normalizePageableList<JobApplication>(
    raw,
    params.page ?? 0,
    params.size ?? 10
  );

  return {
    ...normalized,
    items: normalized.items.map(normalizeJobApplication),
  };
}

export async function getAdminJobApplicationById(
  jobApplicationId: string | number,
  options?: JobApplicationApiRequestOptions
): Promise<JobApplicationDetails> {
  const raw = await requestWithFallback<JobApplicationDetails>(
    ["GET"],
    adminJobApplicationPaths(jobApplicationId),
    options
  );

  return normalizeJobApplication(raw);
}

/* =========================================================
   HELPERS FOR UI / COMPONENTS
========================================================= */

export function getJobApplicationDisplayTitle(
  jobApplication: Partial<JobApplication> | null | undefined
): string {
  if (!jobApplication) return "Job Application";
  return (
    jobApplication.jobTitle ||
    jobApplication.jobRole ||
    jobApplication.companyName ||
    jobApplication.applicationCode ||
    "Job Application"
  );
}

export function getJobApplicationCompanyDisplay(
  jobApplication: Partial<JobApplication> | null | undefined
): string {
  if (!jobApplication) return "—";
  return jobApplication.companyName || "—";
}

export function getJobApplicationStatusBadgeClass(
  status?: string | null
): string {
  const normalized = (status || "").toUpperCase();

  if (["OFFERED", "HIRED"].includes(normalized)) {
    return "border-green-200 bg-green-100 text-green-700";
  }

  if (
    ["INTERVIEW_SCHEDULED", "INTERVIEWED", "SHORTLISTED", "IN_REVIEW"].includes(
      normalized
    )
  ) {
    return "border-blue-200 bg-blue-100 text-blue-700";
  }

  if (["REJECTED", "WITHDRAWN"].includes(normalized)) {
    return "border-red-200 bg-red-100 text-red-700";
  }

  if (["DRAFT", "SAVED", "APPLIED"].includes(normalized)) {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }

  return "border-yellow-200 bg-yellow-100 text-yellow-700";
}

export function sortJobApplicationInterviewsByDate(
  interviews: Partial<JobApplicationInterview>[] = []
): JobApplicationInterview[] {
  return interviews
    .map(normalizeJobApplicationInterview)
    .sort((a, b) => {
      const aTime = new Date(a.scheduledAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.scheduledAt || b.createdAt || 0).getTime();
      return aTime - bTime;
    });
}

export function getNextScheduledInterview(
  jobApplication: Partial<JobApplication> | null | undefined
): JobApplicationInterview | null {
  if (!jobApplication?.interviews?.length) return null;

  const now = Date.now();

  const upcoming = jobApplication.interviews
    .map(normalizeJobApplicationInterview)
    .filter((interview) => {
      const scheduledAt = interview.scheduledAt
        ? new Date(interview.scheduledAt).getTime()
        : 0;
      return scheduledAt > now;
    })
    .sort((a, b) => {
      const aTime = new Date(a.scheduledAt || 0).getTime();
      const bTime = new Date(b.scheduledAt || 0).getTime();
      return aTime - bTime;
    });

  return upcoming[0] || null;
}

export function getLatestTimelineEvent(
  jobApplication: Partial<JobApplication> | null | undefined
): JobApplicationTimelineEvent | null {
  if (!jobApplication?.timeline?.length) return null;

  return (
    [...jobApplication.timeline]
      .map(normalizeJobApplicationTimelineEvent)
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      })[0] || null
  );
}

/* =========================================================
   PAYLOAD BUILDERS
========================================================= */

export function buildCreateJobApplicationPayload(input: {
  resumeId?: number | null;
  resumeVersionId?: number | null;
  companyName?: string;
  companyWebsite?: string;
  companyLocation?: string;
  jobTitle?: string;
  jobRole?: string;
  department?: string;
  jobDescription?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  source?: string;
  applicationSource?: string;
  applicationUrl?: string;
  referralName?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  status?: JobApplicationStatus;
  workMode?: WorkMode;
  employmentType?: EmploymentType;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  appliedAt?: string | null;
  deadlineAt?: string | null;
  nextActionAt?: string | null;
  interviewDate?: string | null;
  notes?: string;
  additionalNotes?: string;
  feedback?: string;
  tags?: string[];
  generateTailoredResume?: boolean;
  generatePreview?: boolean;
  toolAnswers?: ToolKnowledgeAnswer[];
}): CreateJobApplicationPayload {
  return {
    resumeId: input.resumeId ?? null,
    resumeVersionId: input.resumeVersionId ?? null,
    companyName: safeString(input.companyName).trim(),
    companyWebsite: safeString(input.companyWebsite).trim() || undefined,
    companyLocation: safeString(input.companyLocation).trim() || undefined,
    jobTitle: safeString(input.jobTitle).trim(),
    jobRole: safeString(input.jobRole).trim() || undefined,
    department: safeString(input.department).trim() || undefined,
    jobDescription: safeString(input.jobDescription).trim() || undefined,
    requiredSkills: uniqueStrings(input.requiredSkills),
    preferredSkills: uniqueStrings(input.preferredSkills),
    source: safeString(input.source).trim() || undefined,
    applicationSource:
      safeString(input.applicationSource).trim() ||
      safeString(input.source).trim() ||
      undefined,
    applicationUrl: safeString(input.applicationUrl).trim() || undefined,
    referralName: safeString(input.referralName).trim() || undefined,
    recruiterName: safeString(input.recruiterName).trim() || undefined,
    recruiterEmail: safeString(input.recruiterEmail).trim() || undefined,
    status: input.status ?? "DRAFT",
    workMode: input.workMode,
    employmentType: input.employmentType,
    salaryMin: typeof input.salaryMin === "number" ? input.salaryMin : null,
    salaryMax: typeof input.salaryMax === "number" ? input.salaryMax : null,
    currency: safeString(input.currency).trim() || undefined,
    appliedAt: input.appliedAt ?? null,
    deadlineAt: input.deadlineAt ?? null,
    nextActionAt: input.nextActionAt ?? null,
    interviewDate: input.interviewDate ?? null,
    notes: safeString(input.notes).trim() || undefined,
    additionalNotes: safeString(input.additionalNotes).trim() || undefined,
    feedback: safeString(input.feedback).trim() || undefined,
    tags: uniqueStrings(input.tags),
    generateTailoredResume: safeBoolean(input.generateTailoredResume) ?? false,
    generatePreview: safeBoolean(input.generatePreview) ?? false,
    toolAnswers: Array.isArray(input.toolAnswers)
      ? input.toolAnswers
          .map((item) => normalizeToolKnowledgeAnswer(item))
          .filter((item): item is ToolKnowledgeAnswer => Boolean(item))
      : [],
  };
}

export function buildUpdateJobApplicationPayload(
  input: UpdateJobApplicationPayload
): UpdateJobApplicationPayload {
  return {
    ...input,
    companyName:
      typeof input.companyName === "string" ? input.companyName.trim() : input.companyName,
    companyWebsite:
      typeof input.companyWebsite === "string"
        ? input.companyWebsite.trim()
        : input.companyWebsite,
    companyLocation:
      typeof input.companyLocation === "string"
        ? input.companyLocation.trim()
        : input.companyLocation,
    jobTitle: typeof input.jobTitle === "string" ? input.jobTitle.trim() : input.jobTitle,
    jobRole: typeof input.jobRole === "string" ? input.jobRole.trim() : input.jobRole,
    department:
      typeof input.department === "string" ? input.department.trim() : input.department,
    jobDescription:
      typeof input.jobDescription === "string"
        ? input.jobDescription.trim()
        : input.jobDescription,
    source: typeof input.source === "string" ? input.source.trim() : input.source,
    applicationSource:
      typeof input.applicationSource === "string"
        ? input.applicationSource.trim()
        : input.applicationSource,
    applicationUrl:
      typeof input.applicationUrl === "string"
        ? input.applicationUrl.trim()
        : input.applicationUrl,
    referralName:
      typeof input.referralName === "string"
        ? input.referralName.trim()
        : input.referralName,
    recruiterName:
      typeof input.recruiterName === "string"
        ? input.recruiterName.trim()
        : input.recruiterName,
    recruiterEmail:
      typeof input.recruiterEmail === "string"
        ? input.recruiterEmail.trim()
        : input.recruiterEmail,
    currency: typeof input.currency === "string" ? input.currency.trim() : input.currency,
    notes: typeof input.notes === "string" ? input.notes.trim() : input.notes,
    additionalNotes:
      typeof input.additionalNotes === "string"
        ? input.additionalNotes.trim()
        : input.additionalNotes,
    feedback: typeof input.feedback === "string" ? input.feedback.trim() : input.feedback,
    requiredSkills: input.requiredSkills ? uniqueStrings(input.requiredSkills) : undefined,
    preferredSkills: input.preferredSkills ? uniqueStrings(input.preferredSkills) : undefined,
    tags: input.tags ? uniqueStrings(input.tags) : undefined,
    toolAnswers: Array.isArray(input.toolAnswers)
      ? input.toolAnswers
          .map((item) => normalizeToolKnowledgeAnswer(item))
          .filter((item): item is ToolKnowledgeAnswer => Boolean(item))
      : input.toolAnswers,
  };
}

/* =========================================================
   CONVENIENCE OBJECT EXPORT
========================================================= */

export const jobApplicationApi = {
  getJobApplicationList,
  getJobApplicationById,
  createJobApplication,
  updateJobApplication,
  deleteJobApplication,
  updateJobApplicationStatus,
  linkResumeToJobApplication,

  getJobApplicationInterviews,
  createJobApplicationInterview,
  updateJobApplicationInterview,
  deleteJobApplicationInterview,

  getJobApplicationTimeline,

  getAdminJobApplicationList,
  getAdminJobApplicationById,

  normalizeJobApplication,
  normalizeJobApplicationInterview,
  normalizeJobApplicationTimelineEvent,
  normalizeToolKnowledgeAnswer,

  getJobApplicationId,
  getInterviewId,
  getJobApplicationDisplayTitle,
  getJobApplicationCompanyDisplay,
  getJobApplicationStatusBadgeClass,
  sortJobApplicationInterviewsByDate,
  getNextScheduledInterview,
  getLatestTimelineEvent,

  buildCreateJobApplicationPayload,
  buildUpdateJobApplicationPayload,
  extractMessage,
};

/* =========================================================
   EXAMPLE USAGE

   import { jobApplicationApi } from "@/lib/jobApplicationApi";

   const applications = await jobApplicationApi.getJobApplicationList({
     page: 0,
     size: 10,
     status: "APPLIED",
     sortBy: "updatedAt",
     sortDir: "desc",
   });

   const details = await jobApplicationApi.getJobApplicationById(101);

   const created = await jobApplicationApi.createJobApplication({
     companyName: "OpenAI",
     jobTitle: "Frontend Engineer",
     resumeVersionId: 12,
     jobDescription: "Build product experiences...",
     generateTailoredResume: true,
     generatePreview: true,
     status: "APPLIED",
   });
========================================================= */