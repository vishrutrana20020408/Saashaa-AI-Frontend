// src/types/ats.ts
//
// Central ATS-related types and helpers for frontend ↔ backend integration.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - Shared across:
//   - resumeApi
//   - resumeTailorApi
//   - resumeVersionApi
//   - jobApplicationApi
//   - ATS score widgets / dashboards / admin panels
// - Supports backend response wrappers:
//   { success, message, data | payload | result | content }
// - Supports ATS flows for:
//   - current/base resume scoring
//   - resume version scoring
//   - tailored resume scoring
//   - before/after comparison
//   - admin resume ATS inspection
//
// Recommended backend endpoints:
//   POST /api/user/resume/{resumeId}/ats-score
//   POST /api/user/resume/{resumeId}/versions/{resumeVersionId}/ats-score
//   POST /api/user/resume/{resumeId}/tailor/ats-score
//   POST /api/user/resume/current/ats-score
//   GET  /api/admin/resume/{resumeId}/ats
//
// Notes:
// - Designed to tolerate small backend response-shape differences
// - Includes normalizers for string/number/boolean-friendly backend values
// - Keeps frontend ATS rendering stable even when the backend evolves

/* =========================================================
   CORE ATS ENUM / UNION TYPES
========================================================= */

export type AtsScoreBand =
  | "EXCELLENT"
  | "GOOD"
  | "AVERAGE"
  | "LOW"
  | "UNKNOWN";

export type AtsSuggestionSeverity =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | string;

export type AtsKeywordCategory =
  | "REQUIRED"
  | "PREFERRED"
  | "TECHNICAL"
  | "SOFT_SKILL"
  | "DOMAIN"
  | "TOOL"
  | "CERTIFICATION"
  | "PROJECT"
  | "EXPERIENCE"
  | "OTHER"
  | string;

export type AtsOptimizationStatus =
  | "NOT_STARTED"
  | "ANALYZED"
  | "OPTIMIZED"
  | "FAILED"
  | string;

export type AtsScoreBreakdownKey =
  | "keywords"
  | "formatting"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "summary"
  | "readability"
  | "jobAlignment"
  | "structure"
  | "impact"
  | string;

/* =========================================================
   RESPONSE ENVELOPE
========================================================= */

export type AtsApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  details?: unknown;
  data?: T;
  result?: T;
  payload?: T;
  content?: T;
};

/* =========================================================
   CORE ATS DATA TYPES
========================================================= */

export type AtsKeywordMatch = {
  keyword: string;
  matched: boolean;
  count?: number | null;
  category?: AtsKeywordCategory | null;
  source?: string | null;
  weight?: number | null;
};

export type AtsScoreBreakdown = Record<AtsScoreBreakdownKey, number>;

export type AtsSuggestion = {
  id?: string;
  title: string;
  description?: string | null;
  severity?: AtsSuggestionSeverity | null;
  section?: string | null;
  action?: string | null;
  keywords?: string[];
};

export type AtsKeywordAnalysis = {
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestedKeywords: string[];
  keywordMatches?: AtsKeywordMatch[];
  scoreBreakdown?: AtsScoreBreakdown | null;
};

export type AtsScoreSummary = {
  score: number | null;
  band: AtsScoreBand;
  improvementPotential?: number | null;
  scoreBefore?: number | null;
  scoreAfter?: number | null;
};

export type AtsScanMetadata = {
  scannedAt?: string | null;
  source?: string | null;
  resumeId?: number | null;
  resumeVersionId?: number | null;
  jobApplicationId?: number | null;
  model?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  optimizationStatus?: AtsOptimizationStatus | null;
};

export type AtsAnalysisResult = {
  success?: boolean;
  message?: string;

  score?: number | null;
  atsScore?: number | null;
  band?: AtsScoreBand | null;

  suggestions?: AtsSuggestion[];
  keywordAnalysis?: AtsKeywordAnalysis | null;

  keywordsMatched?: string[];
  keywordsMissing?: string[];
  suggestedKeywords?: string[];

  scoreBreakdown?: AtsScoreBreakdown | null;

  metadata?: AtsScanMetadata | null;
};

export type AtsComparisonResult = {
  success?: boolean;
  message?: string;

  beforeScore?: number | null;
  afterScore?: number | null;
  improvement?: number | null;

  beforeBand?: AtsScoreBand | null;
  afterBand?: AtsScoreBand | null;

  addedKeywords?: string[];
  retainedKeywords?: string[];
  removedKeywords?: string[];

  suggestions?: AtsSuggestion[];
};

export type AtsHistoryItem = {
  historyId?: number;
  id?: number;

  resumeId?: number | null;
  resumeVersionId?: number | null;
  jobApplicationId?: number | null;

  score?: number | null;
  band?: AtsScoreBand | null;

  jobTitle?: string | null;
  companyName?: string | null;
  scannedAt?: string | null;

  keywordAnalysis?: AtsKeywordAnalysis | null;
  suggestions?: AtsSuggestion[];
};

export type AtsRequestPayload = {
  jobDescription?: string;
  resumeVersionId?: number | null;
  targetRole?: string;
  targetCompany?: string;
};

/* =========================================================
   UTILITY HELPERS
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

export function unwrapAtsResponse<T>(value: unknown): T {
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

/* =========================================================
   TYPE GUARDS
========================================================= */

export function isAtsScoreBand(value: unknown): value is AtsScoreBand {
  return (
    value === "EXCELLENT" ||
    value === "GOOD" ||
    value === "AVERAGE" ||
    value === "LOW" ||
    value === "UNKNOWN"
  );
}

/* =========================================================
   SCORE HELPERS
========================================================= */

export function normalizeAtsScore(score: unknown): number | null {
  const n = Number(score);
  if (!Number.isFinite(n)) return null;

  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

export function getAtsScoreBand(score: unknown): AtsScoreBand {
  const value = normalizeAtsScore(score);

  if (value === null) return "UNKNOWN";
  if (value >= 85) return "EXCELLENT";
  if (value >= 70) return "GOOD";
  if (value >= 50) return "AVERAGE";
  return "LOW";
}

export function getAtsScoreBadgeClass(score: unknown): string {
  const value = normalizeAtsScore(score);

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

export function getAtsSuggestionSeverityClass(
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
   NORMALIZERS
========================================================= */

export function normalizeAtsKeywordMatch(
  item:
    | Partial<AtsKeywordMatch>
    | Record<string, unknown>
    | null
    | undefined
): AtsKeywordMatch | null {
  if (!item) return null;

  const source = item as Record<string, unknown>;
  const keyword =
    safeString(source.keyword ?? source.name ?? source.term)?.trim() || null;

  if (!keyword) return null;

  return {
    keyword,
    matched:
      typeof source.matched === "boolean"
        ? source.matched
        : Boolean(source.matched),
    count: safeNumber(source.count),
    category:
      (safeString(source.category)?.trim() as AtsKeywordCategory | undefined) ||
      null,
    source: safeString(source.source)?.trim() || null,
    weight: safeNumber(source.weight),
  };
}

export function normalizeAtsSuggestion(
  item: Partial<AtsSuggestion> | Record<string, unknown> | null | undefined,
  index = 0
): AtsSuggestion | null {
  if (!item) return null;

  const source = item as Record<string, unknown>;
  const title =
    safeString(source.title ?? source.heading ?? source.name)?.trim() || null;

  if (!title) return null;

  return {
    id:
      safeTrimmedString(source.id) ||
      safeTrimmedString(source.code) ||
      `ats-suggestion-${index + 1}`,
    title,
    description:
      safeString(source.description ?? source.message)?.trim() || null,
    severity:
      (safeString(source.severity)?.trim() as AtsSuggestionSeverity | undefined) ||
      null,
    section: safeString(source.section)?.trim() || null,
    action: safeString(source.action)?.trim() || null,
    keywords: uniqueStrings(source.keywords),
  };
}

export function normalizeAtsKeywordAnalysis(
  analysis:
    | Partial<AtsKeywordAnalysis>
    | Record<string, unknown>
    | null
    | undefined
): AtsKeywordAnalysis | null {
  if (!analysis) return null;

  const source = analysis as Record<string, unknown>;

  const keywordMatches = Array.isArray(source.keywordMatches)
    ? source.keywordMatches
        .map((item) => normalizeAtsKeywordMatch(item))
        .filter((item): item is AtsKeywordMatch => Boolean(item))
    : [];

  const matchedKeywords = uniqueStrings(
    source.matchedKeywords ?? source.keywordsMatched ?? source.matched
  );

  const missingKeywords = uniqueStrings(
    source.missingKeywords ?? source.keywordsMissing ?? source.missing
  );

  const suggestedKeywords = uniqueStrings(
    source.suggestedKeywords ?? source.recommendedKeywords ?? source.suggested
  );

  const scoreBreakdown =
    source.scoreBreakdown && typeof source.scoreBreakdown === "object"
      ? (source.scoreBreakdown as AtsScoreBreakdown)
      : null;

  return {
    matchedKeywords,
    missingKeywords,
    suggestedKeywords,
    keywordMatches,
    scoreBreakdown,
  };
}

export function normalizeAtsScoreSummary(input: {
  score?: unknown;
  scoreBefore?: unknown;
  scoreAfter?: unknown;
}): AtsScoreSummary {
  const score = normalizeAtsScore(input.score);
  const scoreBefore = normalizeAtsScore(input.scoreBefore);
  const scoreAfter = normalizeAtsScore(input.scoreAfter);

  return {
    score,
    band: getAtsScoreBand(score),
    improvementPotential: score !== null ? Math.max(0, 100 - score) : null,
    scoreBefore,
    scoreAfter,
  };
}

export function normalizeAtsAnalysisResult(
  result:
    | Partial<AtsAnalysisResult>
    | Record<string, unknown>
    | null
    | undefined
): AtsAnalysisResult {
  const source =
    result && typeof result === "object"
      ? (result as Record<string, unknown>)
      : {};

  const score = normalizeAtsScore(source.atsScore ?? source.score);

  const suggestions = Array.isArray(source.suggestions)
    ? source.suggestions
        .map((item, index) => normalizeAtsSuggestion(item, index))
        .filter((item): item is AtsSuggestion => Boolean(item))
    : [];

  const keywordAnalysis =
    normalizeAtsKeywordAnalysis(
      source.keywordAnalysis as
        | Partial<AtsKeywordAnalysis>
        | Record<string, unknown>
        | null
        | undefined
    ) ||
    normalizeAtsKeywordAnalysis({
      matchedKeywords: source.keywordsMatched ?? source.matchedKeywords,
      missingKeywords: source.keywordsMissing ?? source.missingKeywords,
      suggestedKeywords: source.suggestedKeywords,
      scoreBreakdown: source.scoreBreakdown,
      keywordMatches: source.keywordMatches,
    });

  return {
    success:
      typeof source.success === "boolean" ? source.success : true,
    message: safeString(source.message)?.trim() || undefined,

    score,
    atsScore: score,

    band: isAtsScoreBand(source.band)
      ? source.band
      : getAtsScoreBand(score),

    suggestions,
    keywordAnalysis,

    keywordsMatched: keywordAnalysis?.matchedKeywords || [],
    keywordsMissing: keywordAnalysis?.missingKeywords || [],
    suggestedKeywords: keywordAnalysis?.suggestedKeywords || [],

    scoreBreakdown:
      source.scoreBreakdown && typeof source.scoreBreakdown === "object"
        ? (source.scoreBreakdown as AtsScoreBreakdown)
        : keywordAnalysis?.scoreBreakdown || null,

    metadata:
      source.metadata && typeof source.metadata === "object"
        ? {
            scannedAt:
              safeString((source.metadata as Record<string, unknown>).scannedAt) ||
              null,
            source:
              safeString((source.metadata as Record<string, unknown>).source) ||
              null,
            resumeId: safeNumber(
              (source.metadata as Record<string, unknown>).resumeId
            ),
            resumeVersionId: safeNumber(
              (source.metadata as Record<string, unknown>).resumeVersionId
            ),
            jobApplicationId: safeNumber(
              (source.metadata as Record<string, unknown>).jobApplicationId
            ),
            model:
              safeString((source.metadata as Record<string, unknown>).model) ||
              null,
            companyName:
              safeString(
                (source.metadata as Record<string, unknown>).companyName
              ) || null,
            jobTitle:
              safeString((source.metadata as Record<string, unknown>).jobTitle) ||
              null,
            optimizationStatus:
              (safeString(
                (source.metadata as Record<string, unknown>).optimizationStatus
              ) as AtsOptimizationStatus | null) || null,
          }
        : null,
  };
}

export function normalizeAtsComparisonResult(
  result:
    | Partial<AtsComparisonResult>
    | Record<string, unknown>
    | null
    | undefined
): AtsComparisonResult {
  const source =
    result && typeof result === "object"
      ? (result as Record<string, unknown>)
      : {};

  const beforeScore = normalizeAtsScore(
    source.beforeScore ?? source.scoreBefore ?? source.oldScore
  );
  const afterScore = normalizeAtsScore(
    source.afterScore ?? source.scoreAfter ?? source.newScore
  );

  return {
    success:
      typeof source.success === "boolean" ? source.success : true,
    message: safeString(source.message)?.trim() || undefined,
    beforeScore,
    afterScore,
    improvement:
      typeof source.improvement === "number"
        ? source.improvement
        : beforeScore !== null && afterScore !== null
          ? afterScore - beforeScore
          : null,
    beforeBand: isAtsScoreBand(source.beforeBand)
      ? source.beforeBand
      : getAtsScoreBand(beforeScore),
    afterBand: isAtsScoreBand(source.afterBand)
      ? source.afterBand
      : getAtsScoreBand(afterScore),
    addedKeywords: uniqueStrings(source.addedKeywords),
    retainedKeywords: uniqueStrings(source.retainedKeywords),
    removedKeywords: uniqueStrings(source.removedKeywords),
    suggestions: Array.isArray(source.suggestions)
      ? source.suggestions
          .map((item, index) => normalizeAtsSuggestion(item, index))
          .filter((item): item is AtsSuggestion => Boolean(item))
      : [],
  };
}

export function normalizeAtsHistoryItem(
  item: Partial<AtsHistoryItem> | Record<string, unknown> | null | undefined
): AtsHistoryItem | null {
  if (!item) return null;

  const source = item as Record<string, unknown>;

  return {
    historyId:
      safeNumber(source.historyId ?? source.id) ?? undefined,
    id:
      safeNumber(source.id ?? source.historyId) ?? undefined,
    resumeId: safeNumber(source.resumeId),
    resumeVersionId: safeNumber(source.resumeVersionId),
    jobApplicationId: safeNumber(source.jobApplicationId),
    score: normalizeAtsScore(source.score ?? source.atsScore),
    band: isAtsScoreBand(source.band)
      ? source.band
      : getAtsScoreBand(source.score ?? source.atsScore),
    jobTitle: safeString(source.jobTitle)?.trim() || null,
    companyName: safeString(source.companyName)?.trim() || null,
    scannedAt:
      safeString(source.scannedAt ?? source.createdAt)?.trim() || null,
    keywordAnalysis: normalizeAtsKeywordAnalysis(
      source.keywordAnalysis as
        | Partial<AtsKeywordAnalysis>
        | Record<string, unknown>
        | null
        | undefined
    ),
    suggestions: Array.isArray(source.suggestions)
      ? source.suggestions
          .map((entry, index) => normalizeAtsSuggestion(entry, index))
          .filter((entry): entry is AtsSuggestion => Boolean(entry))
      : [],
  };
}

/* =========================================================
   REQUEST HELPERS
========================================================= */

export function buildAtsRequestPayload(input: {
  jobDescription?: string;
  resumeVersionId?: number | null;
  targetRole?: string;
  targetCompany?: string;
}): AtsRequestPayload {
  return {
    jobDescription: safeTrimmedString(input.jobDescription),
    resumeVersionId:
      typeof input.resumeVersionId === "number" ? input.resumeVersionId : null,
    targetRole: safeTrimmedString(input.targetRole),
    targetCompany: safeTrimmedString(input.targetCompany),
  };
}

/* =========================================================
   CONVENIENCE HELPERS
========================================================= */

export function getAtsImprovement(
  beforeScore: unknown,
  afterScore: unknown
): number | null {
  const before = normalizeAtsScore(beforeScore);
  const after = normalizeAtsScore(afterScore);

  if (before === null || after === null) return null;
  return after - before;
}

export function hasStrongAtsScore(score: unknown): boolean {
  const value = normalizeAtsScore(score);
  return value !== null && value >= 70;
}

export function hasWeakAtsScore(score: unknown): boolean {
  const value = normalizeAtsScore(score);
  return value !== null && value < 50;
}

export function getTopAtsSuggestions(
  suggestions: Array<Partial<AtsSuggestion> | Record<string, unknown>> = [],
  limit = 3
): AtsSuggestion[] {
  const severityWeight = (severity?: string | null): number => {
    const normalized = (severity || "").toUpperCase();
    if (normalized === "HIGH") return 3;
    if (normalized === "MEDIUM") return 2;
    if (normalized === "LOW") return 1;
    return 0;
  };

  return suggestions
    .map((item, index) => normalizeAtsSuggestion(item, index))
    .filter((item): item is AtsSuggestion => Boolean(item))
    .sort(
      (a, b) => severityWeight(b.severity) - severityWeight(a.severity)
    )
    .slice(0, limit);
}

export function getAtsMatchedKeywordCount(
  analysis: Partial<AtsKeywordAnalysis> | null | undefined
): number {
  return uniqueStrings(analysis?.matchedKeywords).length;
}

export function getAtsMissingKeywordCount(
  analysis: Partial<AtsKeywordAnalysis> | null | undefined
): number {
  return uniqueStrings(analysis?.missingKeywords).length;
}

export function getAtsSuggestedKeywordCount(
  analysis: Partial<AtsKeywordAnalysis> | null | undefined
): number {
  return uniqueStrings(analysis?.suggestedKeywords).length;
}