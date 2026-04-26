// src/lib/githubAnalysisApi.ts
//
// Central GitHub Analysis API client for frontend ↔ backend integration.
//
// Purpose:
// - Single reusable API layer for GitHub analysis flows
// - Aligned with the latest Interview System / Resume Management System architecture
// - Supports:
//   - general GitHub repository analysis
//   - resume-project aligned GitHub analysis
//   - health checks
//   - backend response normalization
//   - safe frontend consumption of backend AI-orchestrated GitHub analysis flows
//
// Backend alignment:
// - Spring Boot backend is the only service called by frontend
// - AI-engine remains backend orchestrated
// - Cookie/session auth via credentials: "include"
// - Bearer token fallback for legacy/localStorage auth flow
// - Compatible with wrapped responses:
//   { data | result | payload | content }
//
// Recommended backend endpoints:
//   GET  /api/github/health
//   POST /api/github/analyze
//   POST /api/github/analyze/resume-project
//
// Supported response styles:
// - plain object
// - wrapped object
// - nested wrapped object
//
// Notes:
// - This file is client-safe.
// - It can also be used in server-side contexts if token/cookies are passed explicitly.

export const GITHUB_ANALYSIS_API_PATHS = {
  BASE: "/api/github",
  HEALTH: "/api/github/health",
  ANALYZE: "/api/github/analyze",
  ANALYZE_RESUME_PROJECT: "/api/github/analyze/resume-project",
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

export type GitHubRepoOwner = {
  login?: string | null;
  id?: number | string | null;
  avatarUrl?: string | null;
  url?: string | null;
  htmlUrl?: string | null;
};

export type GitHubRepository = {
  repoUrl?: string | null;
  repositoryUrl?: string | null;
  htmlUrl?: string | null;
  owner?: string | null;
  name?: string | null;
  fullName?: string | null;
  branch?: string | null;
  description?: string | null;
  language?: string | null;
  languages?: string[];
  topics?: string[];
  stars?: number | null;
  forks?: number | null;
  watchers?: number | null;
  openIssues?: number | null;
  defaultBranch?: string | null;
};

export type GitHubProjectInsight = {
  title?: string | null;
  summary?: string | null;
  impact?: string | null;
  technologies?: string[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  interviewRelevance?: string | null;
  atsRelevance?: string | null;
};

export type GitHubAnalysisResult = {
  analysisId?: number | string | null;
  repository?: GitHubRepository | null;
  repoUrl?: string | null;

  overallScore?: number | null;
  confidenceScore?: number | null;
  resumeFitScore?: number | null;
  interviewFitScore?: number | null;

  summary?: string | null;
  detailedAnalysis?: string | null;
  extractedReadmeSummary?: string | null;

  detectedTechnologies?: string[];
  suggestedResumeBullets?: string[];
  suggestedInterviewQuestions?: string[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];

  projectInsights?: GitHubProjectInsight[];
  rawResponse?: unknown;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type GitHubHealthResponse = {
  status?: string | null;
  service?: string | null;
  message?: string | null;
  timestamp?: string | null;
};

export type AnalyzeGitHubRepositoryPayload = {
  repoUrl: string;
  branch?: string;
  additionalNotes?: string;
  includeReadme?: boolean;
  includeTopics?: boolean;
  includeLanguages?: boolean;
  includeInterviewQuestions?: boolean;
  includeResumeBullets?: boolean;
};

export type AnalyzeResumeProjectPayload = {
  repoUrl: string;
  resumeVersionId?: number | string | null;
  branch?: string;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  additionalNotes?: string;
  includeReadme?: boolean;
  includeTopics?: boolean;
  includeLanguages?: boolean;
  includeInterviewQuestions?: boolean;
  includeResumeBullets?: boolean;
};

export type GitHubAnalysisApiRequestOptions = {
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

function safeString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
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

function extractMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const top = value as ApiEnvelope<unknown>;
  if (typeof top.message === "string" && top.message.trim()) {
    return top.message.trim();
  }

  const nested = unwrapResponse<any>(value);
  if (nested && typeof nested === "object" && typeof nested.message === "string") {
    return nested.message.trim();
  }

  return null;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    return (
      (typeof record.message === "string" && record.message) ||
      (typeof record.error === "string" && record.error) ||
      (typeof record.details === "string" && record.details) ||
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

/* =========================================================
   HTTP CORE
========================================================= */

export class GitHubAnalysisApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "GitHubAnalysisApiError";
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
  options: GitHubAnalysisApiRequestOptions = {},
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
    throw new GitHubAnalysisApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return unwrapResponse<T>(payload as T);
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeGitHubRepository(
  repo: Partial<GitHubRepository> | null | undefined
): GitHubRepository | null {
  if (!repo) return null;

  return {
    repoUrl: safeString(repo.repoUrl),
    repositoryUrl: safeString(repo.repositoryUrl),
    htmlUrl: safeString(repo.htmlUrl),
    owner: safeString(repo.owner),
    name: safeString(repo.name),
    fullName: safeString(repo.fullName),
    branch: safeString(repo.branch),
    description: safeString(repo.description),
    language: safeString(repo.language),
    languages: normalizeStringArray(repo.languages),
    topics: normalizeStringArray(repo.topics),
    stars: safeNumber(repo.stars),
    forks: safeNumber(repo.forks),
    watchers: safeNumber(repo.watchers),
    openIssues: safeNumber(repo.openIssues),
    defaultBranch: safeString(repo.defaultBranch),
  };
}

export function normalizeGitHubProjectInsight(
  insight: Partial<GitHubProjectInsight> | null | undefined
): GitHubProjectInsight | null {
  if (!insight) return null;

  const title = safeString(insight.title);
  const summary = safeString(insight.summary);

  if (!title && !summary) return null;

  return {
    title,
    summary,
    impact: safeString(insight.impact),
    technologies: normalizeStringArray(insight.technologies),
    strengths: normalizeStringArray(insight.strengths),
    weaknesses: normalizeStringArray(insight.weaknesses),
    recommendations: normalizeStringArray(insight.recommendations),
    interviewRelevance: safeString(insight.interviewRelevance),
    atsRelevance: safeString(insight.atsRelevance),
  };
}

export function normalizeGitHubAnalysisResult(
  input: Partial<GitHubAnalysisResult> | null | undefined
): GitHubAnalysisResult | null {
  if (!input) return null;

  const repository =
    normalizeGitHubRepository(input.repository || null) ||
    normalizeGitHubRepository({
      repoUrl: input.repoUrl || null,
    });

  return {
    analysisId: input.analysisId ?? null,
    repository,
    repoUrl: safeString(input.repoUrl) || repository?.repoUrl || null,

    overallScore: safeNumber(input.overallScore),
    confidenceScore: safeNumber(input.confidenceScore),
    resumeFitScore: safeNumber(input.resumeFitScore),
    interviewFitScore: safeNumber(input.interviewFitScore),

    summary: safeString(input.summary),
    detailedAnalysis: safeString(input.detailedAnalysis),
    extractedReadmeSummary: safeString(input.extractedReadmeSummary),

    detectedTechnologies: normalizeStringArray(input.detectedTechnologies),
    suggestedResumeBullets: normalizeStringArray(input.suggestedResumeBullets),
    suggestedInterviewQuestions: normalizeStringArray(input.suggestedInterviewQuestions),
    strengths: normalizeStringArray(input.strengths),
    weaknesses: normalizeStringArray(input.weaknesses),
    recommendations: normalizeStringArray(input.recommendations),

    projectInsights: Array.isArray(input.projectInsights)
      ? input.projectInsights
          .map((item) => normalizeGitHubProjectInsight(item))
          .filter((item): item is GitHubProjectInsight => Boolean(item))
      : [],

    rawResponse: input.rawResponse,
    createdAt: safeString(input.createdAt),
    updatedAt: safeString(input.updatedAt),
  };
}

export function normalizeGitHubHealthResponse(
  input: Partial<GitHubHealthResponse> | null | undefined
): GitHubHealthResponse | null {
  if (!input) return null;

  return {
    status: safeString(input.status),
    service: safeString(input.service),
    message: safeString(input.message),
    timestamp: safeString(input.timestamp),
  };
}

/* =========================================================
   PAYLOAD BUILDERS
========================================================= */

export function buildAnalyzeGitHubRepositoryPayload(
  input: AnalyzeGitHubRepositoryPayload
): AnalyzeGitHubRepositoryPayload {
  return {
    repoUrl: safeString(input.repoUrl)?.trim() || "",
    branch: safeString(input.branch)?.trim() || undefined,
    additionalNotes: safeString(input.additionalNotes)?.trim() || undefined,
    includeReadme: safeBoolean(input.includeReadme) ?? true,
    includeTopics: safeBoolean(input.includeTopics) ?? true,
    includeLanguages: safeBoolean(input.includeLanguages) ?? true,
    includeInterviewQuestions: safeBoolean(input.includeInterviewQuestions) ?? true,
    includeResumeBullets: safeBoolean(input.includeResumeBullets) ?? true,
  };
}

export function buildAnalyzeResumeProjectPayload(
  input: AnalyzeResumeProjectPayload
): AnalyzeResumeProjectPayload {
  return {
    repoUrl: safeString(input.repoUrl)?.trim() || "",
    resumeVersionId: input.resumeVersionId ?? undefined,
    branch: safeString(input.branch)?.trim() || undefined,
    jobTitle: safeString(input.jobTitle)?.trim() || undefined,
    companyName: safeString(input.companyName)?.trim() || undefined,
    jobDescription: safeString(input.jobDescription)?.trim() || undefined,
    additionalNotes: safeString(input.additionalNotes)?.trim() || undefined,
    includeReadme: safeBoolean(input.includeReadme) ?? true,
    includeTopics: safeBoolean(input.includeTopics) ?? true,
    includeLanguages: safeBoolean(input.includeLanguages) ?? true,
    includeInterviewQuestions: safeBoolean(input.includeInterviewQuestions) ?? true,
    includeResumeBullets: safeBoolean(input.includeResumeBullets) ?? true,
  };
}

/* =========================================================
   API METHODS
========================================================= */

export async function getGitHubAnalysisHealth(
  options?: GitHubAnalysisApiRequestOptions
): Promise<GitHubHealthResponse> {
  const raw = await request<GitHubHealthResponse>(
    "GET",
    GITHUB_ANALYSIS_API_PATHS.HEALTH,
    options
  );

  return normalizeGitHubHealthResponse(raw) || {};
}

export async function analyzeGitHubRepository(
  payload: AnalyzeGitHubRepositoryPayload,
  options?: GitHubAnalysisApiRequestOptions
): Promise<GitHubAnalysisResult> {
  const raw = await request<GitHubAnalysisResult>(
    "POST",
    GITHUB_ANALYSIS_API_PATHS.ANALYZE,
    options,
    buildAnalyzeGitHubRepositoryPayload(payload)
  );

  return normalizeGitHubAnalysisResult(raw) || {};
}

export async function analyzeResumeProjectGitHub(
  payload: AnalyzeResumeProjectPayload,
  options?: GitHubAnalysisApiRequestOptions
): Promise<GitHubAnalysisResult> {
  const raw = await request<GitHubAnalysisResult>(
    "POST",
    GITHUB_ANALYSIS_API_PATHS.ANALYZE_RESUME_PROJECT,
    options,
    buildAnalyzeResumeProjectPayload(payload)
  );

  return normalizeGitHubAnalysisResult(raw) || {};
}

/* =========================================================
   DOMAIN HELPERS
========================================================= */

export function getGitHubAnalysisPrimaryScore(
  result: Partial<GitHubAnalysisResult> | null | undefined
): number {
  if (!result) return 0;

  return (
    safeNumber(result.overallScore) ??
    safeNumber(result.resumeFitScore) ??
    safeNumber(result.interviewFitScore) ??
    0
  );
}

export function getGitHubRepositoryDisplayName(
  result: Partial<GitHubAnalysisResult> | null | undefined
): string {
  if (!result) return "Repository";

  const repo = result.repository;
  return (
    repo?.fullName ||
    repo?.name ||
    safeString(result.repoUrl) ||
    "Repository"
  );
}

export function hasGitHubAnalysisInsights(
  result: Partial<GitHubAnalysisResult> | null | undefined
): boolean {
  if (!result) return false;

  return Boolean(
    safeString(result.summary) ||
      normalizeStringArray(result.detectedTechnologies).length ||
      normalizeStringArray(result.strengths).length ||
      normalizeStringArray(result.recommendations).length ||
      (Array.isArray(result.projectInsights) && result.projectInsights.length > 0)
  );
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const githubAnalysisApi = {
  getGitHubAnalysisHealth,
  analyzeGitHubRepository,
  analyzeResumeProjectGitHub,

  normalizeGitHubRepository,
  normalizeGitHubProjectInsight,
  normalizeGitHubAnalysisResult,
  normalizeGitHubHealthResponse,

  buildAnalyzeGitHubRepositoryPayload,
  buildAnalyzeResumeProjectPayload,

  getGitHubAnalysisPrimaryScore,
  getGitHubRepositoryDisplayName,
  hasGitHubAnalysisInsights,

  extractMessage,
};

/* =========================================================
   EXAMPLE USAGE

   import { githubAnalysisApi } from "@/lib/githubAnalysisApi";

   const health = await githubAnalysisApi.getGitHubAnalysisHealth();

   const analysis = await githubAnalysisApi.analyzeGitHubRepository({
     repoUrl: "https://github.com/user/project",
     includeInterviewQuestions: true,
     includeResumeBullets: true,
   });

   const resumeProject = await githubAnalysisApi.analyzeResumeProjectGitHub({
     repoUrl: "https://github.com/user/project",
     resumeVersionId: 12,
     jobTitle: "Backend Developer",
     companyName: "TechNova",
   });
========================================================= */