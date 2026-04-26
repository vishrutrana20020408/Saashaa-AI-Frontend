"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  BrainCircuit,
  MessageSquareText,
  Target,
  TrendingUp,
  Award,
  BarChart3,
} from "lucide-react";
import {
  buildInterviewEvaluationEndpoint,
  fetchInterviewJson,
  normalizeRole,
  resolveInterviewSessionId,
} from "../../config/interviewConfig";

/**
 * src/components/interview/InterviewScoreCard.tsx
 *
 * Backend-integrated Interview Score Card
 *
 * Purpose:
 * - show interview evaluation scores in a compact/reusable card
 * - fetch interview evaluation from backend when needed
 * - support user/admin interview result pages and dashboards
 * - stay aligned with latest backend-first Interview System architecture
 *
 * Supported backend endpoint:
 * - GET /api/interview/evaluation/{sessionId}
 *
 * Supported response styles:
 * - { success, data }
 * - { success, payload }
 * - { success, result }
 * - nested wrapped responses
 *
 * Notes:
 * - frontend reads evaluation only from backend
 * - AI-engine remains backend orchestrated
 */

export type InterviewScoreCardEvaluation = {
  sessionId?: number | string;
  interviewSessionId?: number | string;

  overallScore?: number | string;
  technicalScore?: number | string;
  communicationScore?: number | string;
  confidenceScore?: number | string;

  summary?: string | null;

  strengths?: string[] | null;
  weaknesses?: string[] | null;
  recommendations?: string[] | null;

  categoryScores?: Array<{
    name?: string;
    score?: number | string;
    feedback?: string;
  }> | null;
};

type InterviewScoreCardSessionLike = {
  interviewSessionId?: number | string;
  sessionId?: number | string;
  id?: number | string;
  title?: string;
  name?: string;
};

type InterviewScoreCardProps = {
  sessionId?: string | number;
  session?: InterviewScoreCardSessionLike | null;

  evaluation?: InterviewScoreCardEvaluation | null;
  endpoint?: string;

  className?: string;
  compact?: boolean;
  disabled?: boolean;
  autoFetch?: boolean;
  showRefresh?: boolean;

  title?: string;
  subtitle?: string;

  showSummary?: boolean;
  showCategoryScores?: boolean;
  showStrengthCount?: boolean;
  showRecommendationCount?: boolean;

  onLoaded?: (evaluation: InterviewScoreCardEvaluation | null, raw: unknown) => void;
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

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function sanitizeEvaluation(
  input: InterviewScoreCardEvaluation | null | undefined
): InterviewScoreCardEvaluation | null {
  if (!input) return null;

  return {
    ...input,
    overallScore: toSafeNumber(input.overallScore, 0),
    technicalScore: toSafeNumber(input.technicalScore, 0),
    communicationScore: toSafeNumber(input.communicationScore, 0),
    confidenceScore: toSafeNumber(input.confidenceScore, 0),
    summary: typeof input.summary === "string" ? input.summary.trim() : "",
    strengths: normalizeStringArray(input.strengths),
    weaknesses: normalizeStringArray(input.weaknesses),
    recommendations: normalizeStringArray(input.recommendations),
    categoryScores: Array.isArray(input.categoryScores)
      ? input.categoryScores
          .map((item) => ({
            name: typeof item?.name === "string" ? item.name.trim() : "",
            score: toSafeNumber(item?.score, 0),
            feedback: typeof item?.feedback === "string" ? item.feedback.trim() : "",
          }))
          .filter((item) => item.name)
      : [],
  };
}

function scoreBadgeClasses(score: number) {
  if (score >= 85) {
    return "border-green-400/20 bg-green-500/15 text-green-200";
  }
  if (score >= 70) {
    return "border-yellow-400/20 bg-yellow-500/15 text-yellow-100";
  }
  return "border-red-400/20 bg-red-500/15 text-red-200";
}

function scoreTextClasses(score: number) {
  if (score >= 85) return "text-green-300";
  if (score >= 70) return "text-yellow-200";
  return "text-red-300";
}

function getStrengthLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 60) return "Developing";
  return "Needs Improvement";
}

export default function InterviewScoreCard({
  sessionId,
  session,
  evaluation: evaluationProp,
  endpoint,
  className = "",
  compact = false,
  disabled = false,
  autoFetch = true,
  showRefresh = true,
  title = "Interview Score",
  subtitle = "Backend-generated performance score for this interview session.",
  showSummary = true,
  showCategoryScores = true,
  showStrengthCount = true,
  showRecommendationCount = true,
  onLoaded,
}: InterviewScoreCardProps) {
  const [loading, setLoading] = useState(autoFetch && !evaluationProp);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<InterviewScoreCardEvaluation | null>(
    sanitizeEvaluation(evaluationProp)
  );

  const role =
    typeof window !== "undefined"
      ? normalizeRole(localStorage.getItem("userRole") || localStorage.getItem("role"))
      : "UNKNOWN";

  const resolvedSessionId = useMemo(() => {
    if (sessionId !== undefined && sessionId !== null) return sessionId;
    return resolveInterviewSessionId(session || undefined);
  }, [sessionId, session]);

  const resolvedEndpoint = useMemo(() => {
    if (!resolvedSessionId) return "";
    return endpoint || buildInterviewEvaluationEndpoint(resolvedSessionId);
  }, [endpoint, resolvedSessionId]);

  const fetchEvaluation = async (isRefresh = false) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      if (!resolvedEndpoint) {
        throw new Error("Interview evaluation endpoint is not available.");
      }

      const { payload, raw, message } =
        await fetchInterviewJson<InterviewScoreCardEvaluation>(resolvedEndpoint, {
          method: "GET",
        });

      const normalized = sanitizeEvaluation(payload);
      setEvaluation(normalized);
      setSuccessMessage(message || "Interview score loaded successfully.");
      onLoaded?.(normalized, raw);
    } catch (error: any) {
      console.error("InterviewScoreCard fetch error:", error);
      setEvaluation(sanitizeEvaluation(evaluationProp));
      setErrorMessage(
        error?.message || "Failed to load interview score from backend."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (evaluationProp) {
      setEvaluation(sanitizeEvaluation(evaluationProp));
    }
  }, [evaluationProp]);

  useEffect(() => {
    if (!autoFetch || evaluationProp || !resolvedEndpoint) return;
    fetchEvaluation();
  }, [autoFetch, evaluationProp, resolvedEndpoint]);

  const overallScore = toSafeNumber(evaluation?.overallScore, 0);
  const technicalScore = toSafeNumber(evaluation?.technicalScore, 0);
  const communicationScore = toSafeNumber(evaluation?.communicationScore, 0);
  const confidenceScore = toSafeNumber(evaluation?.confidenceScore, 0);

  const strengthsCount = normalizeStringArray(evaluation?.strengths).length;
  const recommendationsCount = normalizeStringArray(evaluation?.recommendations).length;
  const categoryScores = Array.isArray(evaluation?.categoryScores)
    ? evaluation.categoryScores
    : [];

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl",
        className
      )}
    >
      <div className={compact ? "p-4" : "p-6"}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Trophy size={20} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{title}</h2>

                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                  {role}
                </span>

                {resolvedSessionId && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-100">
                    Session: {String(resolvedSessionId)}
                  </span>
                )}
              </div>

              <p className="text-sm text-white/55">{subtitle}</p>
            </div>
          </div>

          {showRefresh && (
            <button
              type="button"
              onClick={() => fetchEvaluation(true)}
              disabled={disabled || loading || refreshing || !resolvedEndpoint}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh
            </button>
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

        {loading ? (
          <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
            <Loader2 className="animate-spin text-indigo-300" size={28} />
            <p className="text-sm text-white/60">Loading interview score...</p>
          </div>
        ) : !evaluation ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-10 text-center">
            <Sparkles className="mx-auto text-white/35" size={28} />
            <p className="mt-3 font-medium text-white/70">
              No interview score available
            </p>
            <p className="mt-1 text-sm text-white/45">
              Score data will appear here when backend evaluation is available.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 xl:col-span-1">
                <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
                  <Award size={13} />
                  <span>Overall Score</span>
                </div>

                <div
                  className={cn(
                    "text-3xl font-bold",
                    scoreTextClasses(overallScore)
                  )}
                >
                  {overallScore}%
                </div>

                <div
                  className={cn(
                    "mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                    scoreBadgeClasses(overallScore)
                  )}
                >
                  {getStrengthLabel(overallScore)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
                  <BrainCircuit size={13} />
                  <span>Technical</span>
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    scoreTextClasses(technicalScore)
                  )}
                >
                  {technicalScore}%
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
                  <MessageSquareText size={13} />
                  <span>Communication</span>
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    scoreTextClasses(communicationScore)
                  )}
                >
                  {communicationScore}%
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
                  <Target size={13} />
                  <span>Confidence</span>
                </div>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    scoreTextClasses(confidenceScore)
                  )}
                >
                  {confidenceScore}%
                </div>
              </div>
            </div>

            {(showStrengthCount || showRecommendationCount) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {showStrengthCount && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
                      <TrendingUp size={13} />
                      <span>Strengths Identified</span>
                    </div>
                    <p className="text-2xl font-bold text-green-300">
                      {strengthsCount}
                    </p>
                  </div>
                )}

                {showRecommendationCount && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs text-white/45">
                      <Sparkles size={13} />
                      <span>Recommendations</span>
                    </div>
                    <p className="text-2xl font-bold text-indigo-300">
                      {recommendationsCount}
                    </p>
                  </div>
                )}
              </div>
            )}

            {showSummary && evaluation.summary && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquareText size={16} className="text-indigo-300" />
                  <h3 className="text-base font-semibold">Score Summary</h3>
                </div>
                <p className="whitespace-pre-wrap wrap-break-word text-sm text-white/75">
                  {evaluation.summary}
                </p>
              </div>
            )}

            {showCategoryScores && categoryScores.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 size={16} className="text-indigo-300" />
                  <h3 className="text-base font-semibold">Category Breakdown</h3>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {categoryScores.map((item, index) => {
                    const itemScore = toSafeNumber(item.score, 0);

                    return (
                      <div
                        key={`${item.name}-${index}`}
                        className="rounded-xl border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white/90">
                              {item.name}
                            </p>
                            {item.feedback && (
                              <p className="mt-1 text-sm text-white/60">
                                {item.feedback}
                              </p>
                            )}
                          </div>

                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-semibold",
                              scoreBadgeClasses(itemScore)
                            )}
                          >
                            {itemScore}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}