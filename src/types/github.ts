// src/types/github.ts
//
// Central GitHub analysis types and helpers for frontend ↔ backend integration.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - Backend-mediated GitHub analysis flow aligned with AI-engine integration
// - Reusable across:
//   - githubAnalysisApi
//   - resume tailoring / resume project analysis
//   - interview preparation modules
//   - admin review dashboards
//   - AI-engine project evaluation flows
//
// Supported backend patterns:
// - plain object response
// - wrapped response:
//   { success, message, data | payload | result | content }
// - resilient to small backend response-shape differences
//
// Recommended backend endpoints:
//   POST /api/github/analyze
//   POST /api/github/analyze/resume-project
//   GET  /api/github/health
//
// Notes:
// - Designed around your existing project ideology:
//   frontend -> backend -> AI-engine
// - Keeps frontend contracts stable while backend and AI-engine evolve

/* =========================================================
   API ENVELOPE
========================================================= */

export type GitHubApiEnvelope<T> = {
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

export type GitHubAnalysisStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | string;

export type GitHubProjectRelevance =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "UNKNOWN"
  | string;

export type GitHubInsightSeverity =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | string;

export type GitHubRepositoryVisibility =
  | "PUBLIC"
  | "PRIVATE"
  | "UNKNOWN"
  | string;

/* =========================================================
   REQUEST TYPES
========================================================= */

export type GitHubAnalysisRequest = {
  githubUrl?: string | null;
  repositoryUrl?: string | null;
  owner?: string | null;
  repo?: string | null;

  resumeVersionId?: number | null;
  projectName?: string | null;
  description?: string | null;

  targetRole?: string | null;
  targetCompany?: string | null;
  jobDescription?: string | null;
};

export type GitHubResumeProjectAnalysisRequest = {
  githubUrl?: string | null;
  repositoryUrl?: string | null;
  resumeVersionId?: number | null;
  projectName?: string | null;
  projectDescription?: string | null;
};

/* =========================================================
   REPOSITORY / STACK TYPES
========================================================= */

export type GitHubRepositoryOwner = {
  login?: string | null;
  id?: number | null;
  avatarUrl?: string | null;
  profileUrl?: string | null;
  type?: string | null;
};

export type GitHubRepositorySummary = {
  name?: string | null;
  fullName?: string | null;
  owner?: GitHubRepositoryOwner | null;

  repositoryUrl?: string | null;
  homepageUrl?: string | null;
  description?: string | null;

  defaultBranch?: string | null;
  visibility?: GitHubRepositoryVisibility | null;

  stars?: number | null;
  forks?: number | null;
  watchers?: number | null;
  openIssues?: number | null;

  primaryLanguage?: string | null;
  languages?: string[];

  topics?: string[];

  createdAt?: string | null;
  updatedAt?: string | null;
  pushedAt?: string | null;
};

export type GitHubTechnologyItem = {
  name: string;
  category?: string | null;
  confidence?: number | null;
};

export type GitHubProjectInsight = {
  id?: string;
  title: string;
  description?: string | null;
  severity?: GitHubInsightSeverity | null;
  category?: string | null;
  recommendation?: string | null;
};

export type GitHubProjectStrength = {
  title: string;
  description?: string | null;
};

export type GitHubProjectWeakness = {
  title: string;
  description?: string | null;
};

export type GitHubProjectRecommendation = {
  title: string;
  description?: string | null;
  priority?: GitHubInsightSeverity | null;
};

/* =========================================================
   ANALYSIS RESPONSE TYPES
========================================================= */

export type GitHubAnalysisMetadata = {
  analyzedAt?: string | null;
  model?: string | null;
  source?: string | null;
  resumeVersionId?: number | null;
  status?: GitHubAnalysisStatus | null;
};

export type GitHubAnalysisResponse = {
  success?: boolean;
  message?: string;

  analysisId?: number | null;
  id?: number | null;

  repositoryName?: string | null;
  repositoryUrl?: string | null;

  summary?: string | null;
  score?: number | null;
  relevance?: GitHubProjectRelevance | null;

  technologies?: string[] | GitHubTechnologyItem[] | null;
  strengths?: string[] | GitHubProjectStrength[] | null;
  weaknesses?: string[] | GitHubProjectWeakness[] | null;
  recommendations?: string[] | GitHubProjectRecommendation[] | null;
  insights?: GitHubProjectInsight[] | null;

  repository?: GitHubRepositorySummary | null;
  metadata?: GitHubAnalysisMetadata | null;
};

export type GitHubResumeProjectAnalysisResponse = GitHubAnalysisResponse & {
  resumeProjectFit?: number | null;
  interviewRelevance?: number | null;
};

export type GitHubHealthResponse = {
  success?: boolean;
  message?: string;
  status?: string | null;
  provider?: string | null;
  model?: string | null;
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

export function unwrapGitHubResponse<T>(value: unknown): T {
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

export function extractGitHubMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const record = payload as Record<string, unknown>;

  return (
    safeTrimmedString(record.message) ||
    safeTrimmedString(record.error) ||
    safeTrimmedString(record.details)
  );
}

/* =========================================================
   REQUEST BUILDERS
========================================================= */

export function buildGitHubAnalysisRequest(
  input: GitHubAnalysisRequest
): GitHubAnalysisRequest {
  return {
    githubUrl: safeTrimmedString(input.githubUrl) || null,
    repositoryUrl: safeTrimmedString(input.repositoryUrl) || null,
    owner: safeTrimmedString(input.owner) || null,
    repo: safeTrimmedString(input.repo) || null,

    resumeVersionId:
      typeof input.resumeVersionId === "number" ? input.resumeVersionId : null,
    projectName: safeTrimmedString(input.projectName) || null,
    description: safeTrimmedString(input.description) || null,

    targetRole: safeTrimmedString(input.targetRole) || null,
    targetCompany: safeTrimmedString(input.targetCompany) || null,
    jobDescription: safeTrimmedString(input.jobDescription) || null,
  };
}

export function buildGitHubResumeProjectAnalysisRequest(
  input: GitHubResumeProjectAnalysisRequest
): GitHubResumeProjectAnalysisRequest {
  return {
    githubUrl: safeTrimmedString(input.githubUrl) || null,
    repositoryUrl: safeTrimmedString(input.repositoryUrl) || null,
    resumeVersionId:
      typeof input.resumeVersionId === "number" ? input.resumeVersionId : null,
    projectName: safeTrimmedString(input.projectName) || null,
    projectDescription: safeTrimmedString(input.projectDescription) || null,
  };
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeGitHubRepositoryOwner(
  input: Partial<GitHubRepositoryOwner> | Record<string, unknown> | null | undefined
): GitHubRepositoryOwner | null {
  if (!input) return null;

  const source = input as Record<string, unknown>;

  return {
    login: safeString(source.login)?.trim() || null,
    id: safeNumber(source.id),
    avatarUrl:
      safeString(source.avatarUrl ?? source.avatar_url)?.trim() || null,
    profileUrl:
      safeString(source.profileUrl ?? source.html_url ?? source.url)?.trim() || null,
    type: safeString(source.type)?.trim() || null,
  };
}

export function normalizeGitHubRepositorySummary(
  input:
    | Partial<GitHubRepositorySummary>
    | Record<string, unknown>
    | null
    | undefined
): GitHubRepositorySummary | null {
  if (!input) return null;

  const source = input as Record<string, unknown>;

  return {
    name: safeString(source.name)?.trim() || null,
    fullName: safeString(source.fullName ?? source.full_name)?.trim() || null,
    owner: normalizeGitHubRepositoryOwner(
      source.owner as
        | Partial<GitHubRepositoryOwner>
        | Record<string, unknown>
        | null
        | undefined
    ),
    repositoryUrl:
      safeString(source.repositoryUrl ?? source.html_url ?? source.url)?.trim() ||
      null,
    homepageUrl:
      safeString(source.homepageUrl ?? source.homepage)?.trim() || null,
    description: safeString(source.description)?.trim() || null,
    defaultBranch:
      safeString(source.defaultBranch ?? source.default_branch)?.trim() || null,
    visibility:
      (safeString(source.visibility)?.trim() as GitHubRepositoryVisibility) ||
      null,
    stars: safeNumber(source.stars ?? source.stargazers_count),
    forks: safeNumber(source.forks ?? source.forks_count),
    watchers: safeNumber(source.watchers ?? source.watchers_count),
    openIssues: safeNumber(source.openIssues ?? source.open_issues_count),
    primaryLanguage:
      safeString(source.primaryLanguage ?? source.language)?.trim() || null,
    languages: uniqueStrings(source.languages),
    topics: uniqueStrings(source.topics),
    createdAt:
      safeString(source.createdAt ?? source.created_at)?.trim() || null,
    updatedAt:
      safeString(source.updatedAt ?? source.updated_at)?.trim() || null,
    pushedAt:
      safeString(source.pushedAt ?? source.pushed_at)?.trim() || null,
  };
}

export function normalizeGitHubTechnologyItem(
  input: Partial<GitHubTechnologyItem> | Record<string, unknown> | string | null | undefined
): GitHubTechnologyItem | null {
  if (!input) return null;

  if (typeof input === "string") {
    const name = input.trim();
    if (!name) return null;

    return {
      name,
      category: null,
      confidence: null,
    };
  }

  const source = input as Record<string, unknown>;
  const name = safeString(source.name)?.trim() || null;

  if (!name) return null;

  return {
    name,
    category: safeString(source.category)?.trim() || null,
    confidence: safeNumber(source.confidence),
  };
}

export function normalizeGitHubProjectInsight(
  input:
    | Partial<GitHubProjectInsight>
    | Record<string, unknown>
    | null
    | undefined,
  index = 0
): GitHubProjectInsight | null {
  if (!input) return null;

  const source = input as Record<string, unknown>;
  const title =
    safeString(source.title ?? source.name ?? source.heading)?.trim() || null;

  if (!title) return null;

  return {
    id:
      safeTrimmedString(source.id) ||
      safeTrimmedString(source.code) ||
      `github-insight-${index + 1}`,
    title,
    description:
      safeString(source.description ?? source.message)?.trim() || null,
    severity:
      (safeString(source.severity)?.trim() as GitHubInsightSeverity) || null,
    category: safeString(source.category)?.trim() || null,
    recommendation:
      safeString(source.recommendation ?? source.action)?.trim() || null,
  };
}

export function normalizeGitHubProjectStrength(
  input:
    | Partial<GitHubProjectStrength>
    | Record<string, unknown>
    | string
    | null
    | undefined
): GitHubProjectStrength | null {
  if (!input) return null;

  if (typeof input === "string") {
    const title = input.trim();
    if (!title) return null;

    return {
      title,
      description: null,
    };
  }

  const source = input as Record<string, unknown>;
  const title =
    safeString(source.title ?? source.name ?? source.heading)?.trim() || null;

  if (!title) return null;

  return {
    title,
    description: safeString(source.description)?.trim() || null,
  };
}

export function normalizeGitHubProjectWeakness(
  input:
    | Partial<GitHubProjectWeakness>
    | Record<string, unknown>
    | string
    | null
    | undefined
): GitHubProjectWeakness | null {
  if (!input) return null;

  if (typeof input === "string") {
    const title = input.trim();
    if (!title) return null;

    return {
      title,
      description: null,
    };
  }

  const source = input as Record<string, unknown>;
  const title =
    safeString(source.title ?? source.name ?? source.heading)?.trim() || null;

  if (!title) return null;

  return {
    title,
    description: safeString(source.description)?.trim() || null,
  };
}

export function normalizeGitHubProjectRecommendation(
  input:
    | Partial<GitHubProjectRecommendation>
    | Record<string, unknown>
    | string
    | null
    | undefined
): GitHubProjectRecommendation | null {
  if (!input) return null;

  if (typeof input === "string") {
    const title = input.trim();
    if (!title) return null;

    return {
      title,
      description: null,
      priority: null,
    };
  }

  const source = input as Record<string, unknown>;
  const title =
    safeString(source.title ?? source.name ?? source.heading)?.trim() || null;

  if (!title) return null;

  return {
    title,
    description: safeString(source.description)?.trim() || null,
    priority:
      (safeString(source.priority ?? source.severity)?.trim() as GitHubInsightSeverity) ||
      null,
  };
}

export function normalizeGitHubAnalysisMetadata(
  input:
    | Partial<GitHubAnalysisMetadata>
    | Record<string, unknown>
    | null
    | undefined
): GitHubAnalysisMetadata | null {
  if (!input) return null;

  const source = input as Record<string, unknown>;

  return {
    analyzedAt:
      safeString(source.analyzedAt ?? source.scannedAt ?? source.createdAt)?.trim() ||
      null,
    model: safeString(source.model)?.trim() || null,
    source: safeString(source.source)?.trim() || null,
    resumeVersionId: safeNumber(source.resumeVersionId),
    status:
      (safeString(source.status)?.trim() as GitHubAnalysisStatus) || null,
  };
}

export function normalizeGitHubAnalysisResponse(
  input:
    | Partial<GitHubAnalysisResponse>
    | Record<string, unknown>
    | null
    | undefined
): GitHubAnalysisResponse {
  const source =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  const technologiesFromObjects = Array.isArray(source.technologies)
    ? source.technologies
        .map((item) => normalizeGitHubTechnologyItem(item))
        .filter((item): item is GitHubTechnologyItem => Boolean(item))
    : [];

  const strengths = Array.isArray(source.strengths)
    ? source.strengths
        .map((item) => normalizeGitHubProjectStrength(item))
        .filter((item): item is GitHubProjectStrength => Boolean(item))
    : [];

  const weaknesses = Array.isArray(source.weaknesses)
    ? source.weaknesses
        .map((item) => normalizeGitHubProjectWeakness(item))
        .filter((item): item is GitHubProjectWeakness => Boolean(item))
    : [];

  const recommendations = Array.isArray(source.recommendations)
    ? source.recommendations
        .map((item) => normalizeGitHubProjectRecommendation(item))
        .filter((item): item is GitHubProjectRecommendation => Boolean(item))
    : [];

  const insights = Array.isArray(source.insights)
    ? source.insights
        .map((item, index) => normalizeGitHubProjectInsight(item, index))
        .filter((item): item is GitHubProjectInsight => Boolean(item))
    : [];

  return {
    success:
      typeof source.success === "boolean" ? source.success : true,
    message: safeString(source.message)?.trim() || undefined,

    analysisId: safeNumber(source.analysisId ?? source.id),
    id: safeNumber(source.id ?? source.analysisId),

    repositoryName:
      safeString(source.repositoryName ?? source.repoName ?? source.name)?.trim() ||
      null,
    repositoryUrl:
      safeString(source.repositoryUrl ?? source.githubUrl ?? source.url)?.trim() ||
      null,

    summary: safeString(source.summary)?.trim() || null,
    score: safeNumber(source.score),
    relevance:
      (safeString(source.relevance)?.trim() as GitHubProjectRelevance) || null,

    technologies: technologiesFromObjects.length
      ? technologiesFromObjects
      : uniqueStrings(source.technologies),
    strengths,
    weaknesses,
    recommendations,
    insights,

    repository: normalizeGitHubRepositorySummary(
      source.repository ?? {
        name: source.repositoryName ?? source.repoName ?? source.name,
        repositoryUrl: source.repositoryUrl ?? source.githubUrl ?? source.url,
        description: source.summary,
        primaryLanguage: source.primaryLanguage ?? source.language,
        languages: source.languages,
        topics: source.topics,
        stars: source.stars,
        forks: source.forks,
        watchers: source.watchers,
        openIssues: source.openIssues,
        updatedAt: source.updatedAt,
      }
    ),
    metadata: normalizeGitHubAnalysisMetadata(
      source.metadata as
        | Partial<GitHubAnalysisMetadata>
        | Record<string, unknown>
        | null
        | undefined
    ),
  };
}

export function normalizeGitHubResumeProjectAnalysisResponse(
  input:
    | Partial<GitHubResumeProjectAnalysisResponse>
    | Record<string, unknown>
    | null
    | undefined
): GitHubResumeProjectAnalysisResponse {
  const base = normalizeGitHubAnalysisResponse(input);
  const source =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  return {
    ...base,
    resumeProjectFit: safeNumber(source.resumeProjectFit),
    interviewRelevance: safeNumber(source.interviewRelevance),
  };
}

export function normalizeGitHubHealthResponse(
  input: Partial<GitHubHealthResponse> | Record<string, unknown> | null | undefined
): GitHubHealthResponse {
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
   TYPE / DOMAIN HELPERS
========================================================= */

export function isStrongGitHubAnalysisScore(score: unknown): boolean {
  const value = safeNumber(score);
  return value !== null && value >= 70;
}

export function isWeakGitHubAnalysisScore(score: unknown): boolean {
  const value = safeNumber(score);
  return value !== null && value < 50;
}

export function getGitHubAnalysisScoreBadgeClass(score: unknown): string {
  const value = safeNumber(score);

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

export function getGitHubAnalysisStatusBadgeClass(status?: string | null): string {
  const normalized = (status || "").trim().toUpperCase();

  if (normalized === "COMPLETED") {
    return "border-green-200 bg-green-100 text-green-700";
  }
  if (normalized === "PROCESSING" || normalized === "PENDING") {
    return "border-yellow-200 bg-yellow-100 text-yellow-700";
  }
  if (normalized === "FAILED") {
    return "border-red-200 bg-red-100 text-red-700";
  }

  return "border-gray-200 bg-gray-100 text-gray-700";
}

export function getGitHubRelevanceBadgeClass(relevance?: string | null): string {
  const normalized = (relevance || "").trim().toUpperCase();

  if (normalized === "HIGH") {
    return "border-green-200 bg-green-100 text-green-700";
  }
  if (normalized === "MEDIUM") {
    return "border-yellow-200 bg-yellow-100 text-yellow-700";
  }
  if (normalized === "LOW") {
    return "border-red-200 bg-red-100 text-red-700";
  }

  return "border-gray-200 bg-gray-100 text-gray-700";
}

export function getGitHubInsightSeverityClass(
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

export function getGitHubRepositoryDisplayName(
  analysis:
    | Partial<GitHubAnalysisResponse>
    | Partial<GitHubRepositorySummary>
    | null
    | undefined
): string {
  if (!analysis) return "GitHub Repository";

  return (
    safeString((analysis as any).repositoryName) ||
    safeString((analysis as any).fullName) ||
    safeString((analysis as any).name) ||
    "GitHub Repository"
  );
}

export function getGitHubRepositoryPrimaryUrl(
  analysis:
    | Partial<GitHubAnalysisResponse>
    | Partial<GitHubRepositorySummary>
    | null
    | undefined
): string | null {
  if (!analysis) return null;

  return (
    safeString((analysis as any).repositoryUrl) ||
    safeString((analysis as any).homepageUrl) ||
    null
  );
}

export function getTopGitHubRecommendations(
  recommendations: Array<
    Partial<GitHubProjectRecommendation> | Record<string, unknown> | string
  > = [],
  limit = 3
): GitHubProjectRecommendation[] {
  const priorityWeight = (priority?: string | null): number => {
    const normalized = (priority || "").toUpperCase();
    if (normalized === "HIGH") return 3;
    if (normalized === "MEDIUM") return 2;
    if (normalized === "LOW") return 1;
    return 0;
  };

  return recommendations
    .map((item) => normalizeGitHubProjectRecommendation(item))
    .filter((item): item is GitHubProjectRecommendation => Boolean(item))
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
    .slice(0, limit);
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const githubTypeUtils = {
  unwrapGitHubResponse,
  extractGitHubMessage,

  buildGitHubAnalysisRequest,
  buildGitHubResumeProjectAnalysisRequest,

  normalizeGitHubRepositoryOwner,
  normalizeGitHubRepositorySummary,
  normalizeGitHubTechnologyItem,
  normalizeGitHubProjectInsight,
  normalizeGitHubProjectStrength,
  normalizeGitHubProjectWeakness,
  normalizeGitHubProjectRecommendation,
  normalizeGitHubAnalysisMetadata,
  normalizeGitHubAnalysisResponse,
  normalizeGitHubResumeProjectAnalysisResponse,
  normalizeGitHubHealthResponse,

  isStrongGitHubAnalysisScore,
  isWeakGitHubAnalysisScore,
  getGitHubAnalysisScoreBadgeClass,
  getGitHubAnalysisStatusBadgeClass,
  getGitHubRelevanceBadgeClass,
  getGitHubInsightSeverityClass,
  getGitHubRepositoryDisplayName,
  getGitHubRepositoryPrimaryUrl,
  getTopGitHubRecommendations,
};

/* =========================================================
   EXAMPLE USAGE

   import type {
     GitHubAnalysisRequest,
     GitHubAnalysisResponse,
     GitHubHealthResponse,
   } from "@/types/github";

   import { githubTypeUtils } from "@/types/github";

   const payload = githubTypeUtils.buildGitHubAnalysisRequest({
     repositoryUrl: "https://github.com/example/repo",
     resumeVersionId: 12,
     targetRole: "Frontend Developer",
   });

   const normalized = githubTypeUtils.normalizeGitHubAnalysisResponse(apiResponse);
========================================================= */