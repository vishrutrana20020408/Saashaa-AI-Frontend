"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trophy,
  MessageSquareText,
  TrendingUp,
  TrendingDown,
  Target,
  BrainCircuit,
  BarChart3,
  FileText,
  Award,
  Zap,
  Check,
  ChevronRight,
} from "lucide-react";
import {
  buildInterviewEvaluationEndpoint,
  extractApiMessage,
  fetchInterviewJson,
  normalizeRole,
  resolveInterviewSessionId,
} from "../../config/interviewConfig";

/**
 * src/components/interview/InterviewFeedbackPanel.tsx
 *
 * Backend-integrated Interview Feedback Panel
 */

export type InterviewFeedbackEvaluation = {
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

type InterviewFeedbackPanelProps = {
  sessionId?: string | number;
  session?: {
    interviewSessionId?: number | string;
    sessionId?: number | string;
    id?: number | string;
    title?: string;
    name?: string;
  } | null;

  className?: string;
  title?: string;
  subtitle?: string;

  endpoint?: string;
  autoFetch?: boolean;
  compact?: boolean;
  disabled?: boolean;

  showHeader?: boolean;
  showSummary?: boolean;
  showDetailedFeedback?: boolean;
  showCategoryScores?: boolean;
  showStrengths?: boolean;
  showWeaknesses?: boolean;
  showRecommendations?: boolean;

  onLoaded?: (evaluation: InterviewFeedbackEvaluation | null, raw: unknown) => void;
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

function scoreColor(score: number) {
  if (score >= 85) return "text-green-300";
  if (score >= 70) return "text-yellow-200";
  return "text-red-300";
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function sanitizeEvaluation(
  input: InterviewFeedbackEvaluation | null | undefined
): InterviewFeedbackEvaluation | null {
  if (!input) return null;

  const categoryScores = Array.isArray(input.categoryScores)
    ? input.categoryScores
        .map((item) => ({
          name: typeof item?.name === "string" ? item.name.trim() : "",
          score: toSafeNumber(item?.score, 0),
          feedback: typeof item?.feedback === "string" ? item.feedback.trim() : "",
        }))
        .filter((item) => item.name)
    : [];

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
    categoryScores,
  };
}

export default function InterviewFeedbackPanel({
  sessionId,
  session,
  className = "",
  title = "Interview Feedback",
  subtitle = "Backend-generated evaluation and interview performance insights.",
  endpoint,
  autoFetch = true,
  compact = false,
  disabled = false,
  showHeader = true,
  showSummary = true,
  showDetailedFeedback = true,
  showCategoryScores = true,
  showStrengths = true,
  showWeaknesses = true,
  showRecommendations = true,
  onLoaded,
}: InterviewFeedbackPanelProps) {
  const [loading, setLoading] = useState(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<InterviewFeedbackEvaluation | null>(
    null
  );

  const resolvedSessionId = useMemo(() => {
    if (sessionId !== undefined && sessionId !== null) return sessionId;
    return resolveInterviewSessionId(session || undefined);
  }, [sessionId, session]);

  const resolvedEndpoint = useMemo(() => {
    if (!resolvedSessionId) return "";
    return endpoint || buildInterviewEvaluationEndpoint(resolvedSessionId);
  }, [endpoint, resolvedSessionId]);

  const role =
    typeof window !== "undefined"
      ? normalizeRole(localStorage.getItem("userRole") || localStorage.getItem("role"))
      : "UNKNOWN";

  const fetchFeedback = async (isRefresh = false) => {
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
        await fetchInterviewJson<InterviewFeedbackEvaluation>(resolvedEndpoint, {
          method: "GET",
        });

      const sanitized = sanitizeEvaluation(payload);
      setEvaluation(sanitized);
      setSuccessMessage(message || "Interview feedback loaded successfully.");
      onLoaded?.(sanitized, raw);
    } catch (error: any) {
      console.error("InterviewFeedbackPanel fetch error:", error);
      setEvaluation(null);
      setErrorMessage(
        error?.message || "Failed to load interview feedback from backend."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!autoFetch || !resolvedEndpoint) return;
    fetchFeedback();
  }, [autoFetch, resolvedEndpoint]);

  const overallScore = toSafeNumber(evaluation?.overallScore, 0);
  const technicalScore = toSafeNumber(evaluation?.technicalScore, 0);
  const communicationScore = toSafeNumber(evaluation?.communicationScore, 0);
  const confidenceScore = toSafeNumber(evaluation?.confidenceScore, 0);

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl",
        className
      )}
    >
      <div className={compact ? "p-4" : "p-6"}>
        {showHeader && (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Sparkles size={20} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">{title}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                    {role}
                  </span>
                </div>
                <p className="text-sm text-white/55">{subtitle}</p>

                {resolvedSessionId && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/75">
                      Session: {String(resolvedSessionId)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchFeedback(true)}
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
          </div>
        )}

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
          <div className="mt-5 flex flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-white/20 bg-white/5 py-20 text-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
              <div className="relative grid h-16 w-16 place-items-center rounded-full bg-white/10">
                <Loader2 className="animate-spin text-indigo-400" size={32} />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Analyzing your performance...</h3>
              <p className="mt-1 text-sm text-white/45 text-center max-w-xs mx-auto">
                Our AI is generating a detailed evaluation based on your interview answers.
              </p>
            </div>
          </div>
        ) : !evaluation ? (
          <div className="mt-5 rounded-3xl border border-dashed border-white/20 bg-black/20 p-20 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/5 text-white/20 mb-6">
              <MessageSquareText size={32} />
            </div>
            <h3 className="text-xl font-semibold text-white/80">No evaluation yet</h3>
            <p className="mt-2 text-sm text-white/45 max-w-xs mx-auto">
              Complete your interview session to receive a personalized performance analysis.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 space-y-8"
          >
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Overall Score", score: overallScore, icon: Trophy, color: "from-yellow-400 to-orange-500" },
                { label: "Technical", score: technicalScore, icon: BrainCircuit, color: "from-blue-400 to-indigo-500" },
                { label: "Communication", score: communicationScore, icon: MessageSquareText, color: "from-purple-400 to-pink-500" },
                { label: "Confidence", score: confidenceScore, icon: Target, color: "from-emerald-400 to-teal-500" },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative group overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10 hover:border-white/20 shadow-xl"
                >
                  <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                    <item.icon size={64} />
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-xl bg-linear-to-br ${item.color} bg-opacity-10 text-white shadow-lg shadow-black/20`}>
                      <item.icon size={18} />
                    </div>
                    <span className="text-xs font-bold tracking-widest text-white/40 uppercase">
                      {item.label}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-black tracking-tight ${scoreColor(item.score)}`}>
                      {item.score}
                    </span>
                    <span className="text-sm font-bold text-white/20">%</span>
                  </div>

                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score}%` }}
                      transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                      className={`h-full bg-linear-to-r ${item.color}`}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {showSummary && evaluation.summary && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-indigo-500/5 to-purple-500/5 p-8 backdrop-blur-md"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <FileText size={120} />
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 shadow-inner">
                    <Award size={24} />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">Executive Summary</h3>
                </div>
                <p className="relative z-10 text-lg leading-relaxed text-white/80 font-medium">
                  {evaluation.summary}
                </p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {showStrengths && evaluation.strengths && evaluation.strengths.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="rounded-3xl border border-emerald-500/10 bg-emerald-500/5 p-8 shadow-2xl"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                      <TrendingUp size={24} />
                    </div>
                    <h3 className="text-xl font-bold">Key Strengths</h3>
                  </div>
                  <ul className="space-y-4">
                    {evaluation.strengths.map((item, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + idx * 0.1 }}
                        className="flex items-start gap-3 group"
                      >
                        <div className="mt-1 p-1 rounded-full bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                          <Check size={12} strokeWidth={4} />
                        </div>
                        <span className="text-white/80 leading-relaxed font-medium">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {showWeaknesses && evaluation.weaknesses && evaluation.weaknesses.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="rounded-3xl border border-rose-500/10 bg-rose-500/5 p-8 shadow-2xl"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                      <TrendingDown size={24} />
                    </div>
                    <h3 className="text-xl font-bold">Areas for Growth</h3>
                  </div>
                  <ul className="space-y-4">
                    {evaluation.weaknesses.map((item, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 + idx * 0.1 }}
                        className="flex items-start gap-3 group"
                      >
                        <div className="mt-1.5 h-2 w-2 rounded-full bg-rose-500/40 group-hover:scale-125 transition-transform" />
                        <span className="text-white/80 leading-relaxed font-medium">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </div>

            {showRecommendations && evaluation.recommendations && evaluation.recommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="rounded-3xl border border-indigo-500/10 bg-indigo-500/5 p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400">
                    <Zap size={24} />
                  </div>
                  <h3 className="text-xl font-bold">Actionable Recommendations</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {evaluation.recommendations.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/20 transition-all group">
                      <div className="mt-1 text-indigo-400 group-hover:translate-x-1 transition-transform">
                        <ChevronRight size={18} />
                      </div>
                      <span className="text-white/70 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
