"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { jsPDF } from "jspdf";
import {
  ArrowLeft,
  BarChart3,
  Download,
  Loader2,
  Sparkles,
  Award,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { getStoredToken, unwrapApiPayload } from "../../../../config/interviewConfig";

interface InterviewScoreResponse {
  sessionId?: number | string;
  interviewMode?: string;
  interviewType?: string;
  status?: string;
  overallScore?: number | null;
  confidenceScore?: number | null;
  knowledgeScore?: number | null;
  communicationScore?: number | null;
  clarityScore?: number | null;
  relevanceScore?: number | null;
  emotionalComposureScore?: number | null;
  technicalDepthScore?: number | null;
  problemSolvingScore?: number | null;
  professionalismScore?: number | null;
  totalQuestions?: number | null;
  answeredQuestions?: number | null;
  skippedQuestions?: number | null;
  hintsUsed?: number | null;
  durationSeconds?: number | null;
  averageAnswerDurationSeconds?: number | null;
  grade?: string | null;
  recommendation?: string | null;
  overallSummary?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  improvementSuggestions?: string[];
  focusAreas?: string[];
  message?: string | null;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const getAuthHeaders = () => {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function percent(value?: number | null): string {
  return value != null ? `${Math.round(Math.max(0, Math.min(100, value)))}%` : "N/A";
}

function buildLearningTips(score?: number | null): string[] {
  const tips: string[] = [];
  if (score == null) return ["Complete an interview session to see personalized recommendations."];
  if (score >= 85) {
    tips.push("You are performing strongly. Keep practicing to maintain momentum.");
  } else {
    if (score < 70) tips.push("Schedule a focused mock interview to sharpen your weak areas.");
    if (score < 55) tips.push("Review your answer structure and practice clear communication.");
    if (score < 40) tips.push("Break your preparation into short daily skills sessions and repeat them.");
  }
  return tips;
}

export default function InterviewResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InterviewScoreResponse | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError("Interview session ID is required.");
      return;
    }

    const fetchScore = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE_URL}/api/user/interview/session/${encodeURIComponent(
          sessionId
        )}/score`, {
          method: "GET",
          headers: getAuthHeaders(),
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Failed to fetch result (status ${res.status})`);
        }

        const json = await res.json();
        const payload = unwrapApiPayload<InterviewScoreResponse>(json);
        if (!payload) {
          throw new Error("Result payload is missing.");
        }
        setData(payload);
      } catch (err: any) {
        setError(err?.message || "Unable to load interview result.");
      } finally {
        setLoading(false);
      }
    };

    void fetchScore();
  }, [sessionId]);

  const progressPercent = useMemo(() => {
    if (!data || !data.totalQuestions) return 0;
    return Math.round(((data.answeredQuestions ?? 0) / data.totalQuestions) * 100);
  }, [data]);

  const learningTips = useMemo(() => buildLearningTips(data?.overallScore ?? null), [data]);

  const downloadPdf = async () => {
    if (!data) return;
    setPdfBusy(true);

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFontSize(18);
      doc.text("Interview Result Summary", 40, 50);

      const rows = [
        ["Session", String(sessionId ?? "-")],
        ["Status", data.status ?? "Unknown"],
        ["Mode", data.interviewMode ?? "Unknown"],
        ["Type", data.interviewType ?? "Unknown"],
        ["Overall Score", percent(data.overallScore)],
        ["Grade", data.grade ?? "N/A"],
        ["Recommendation", data.recommendation ?? "N/A"],
        ["Answered", `${data.answeredQuestions ?? 0}/${data.totalQuestions ?? 0}`],
        ["Duration", formatDuration(data.durationSeconds)],
      ];

      doc.setFontSize(11);
      let y = 80;
      rows.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, 40, y);
        y += 18;
      });

      y += 10;
      doc.setFontSize(13);
      doc.text("Strengths", 40, y);
      y += 18;
      doc.setFontSize(11);
      (data.strengths || ["No strengths available."]).forEach((item) => {
        doc.text(`• ${item}`, 50, y);
        y += 16;
      });

      y += 10;
      doc.setFontSize(13);
      doc.text("Improvement Suggestions", 40, y);
      y += 18;
      doc.setFontSize(11);
      (data.improvementSuggestions || ["No improvement suggestions available."]).forEach((item) => {
        doc.text(`• ${item}`, 50, y);
        y += 16;
      });

      doc.save(`interview-result-${sessionId}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-600/15 px-4 py-2 text-sm font-semibold text-indigo-100">
              <BarChart3 className="h-4 w-4" />
              Interview Result
            </div>
            <h1 className="mt-4 text-4xl font-bold">Detailed performance summary</h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Review your score breakdown, improvement tips, progress metrics, and download your interview summary as a PDF.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-white/15"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={!data || loading || pdfBusy}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              <Download size={16} />
              {pdfBusy ? "Preparing PDF..." : "Download as PDF"}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-100">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin" />
            Loading interview result...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8 text-rose-100">
            <p className="font-semibold">Could not load result</p>
            <p className="mt-2 text-sm text-rose-100/80">{error}</p>
          </div>
        ) : data ? (
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <ResultCard label="Overall Score" value={percent(data.overallScore)} highlight />
                <ResultCard label="Progress" value={`${progressPercent}%`} />
                <ResultCard label="Grade" value={data.grade ?? "N/A"} />
                <ResultCard label="Recommendation" value={data.recommendation ?? "N/A"} />
              </div>

              <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                <div className="flex items-center gap-3 text-white/80">
                  <Sparkles className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-lg font-semibold">Interview strengths</h2>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {(data.strengths?.length ? data.strengths : ["No strengths were identified."]).map((strength, index) => (
                    <li key={index} className="rounded-2xl bg-slate-900/70 p-3">{strength}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                <div className="flex items-center gap-3 text-white/80">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-lg font-semibold">Improvement tips</h2>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  {((data.improvementSuggestions?.length ? data.improvementSuggestions : learningTips) || ["Continue practicing."]).map((tip, index) => (
                    <li key={index} className="rounded-2xl bg-slate-900/70 p-3">{tip}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
                <h2 className="mb-4 text-lg font-semibold text-white/90">Skill Learning Module</h2>
                <LearningModule score={data.overallScore} />
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                <h2 className="text-lg font-semibold text-white/90">Session details</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <SessionDetail label="Session ID" value={String(sessionId ?? "-")} />
                  <SessionDetail label="Status" value={data.status ?? "Unknown"} />
                  <SessionDetail label="Mode" value={data.interviewMode ?? "Unknown"} />
                  <SessionDetail label="Type" value={data.interviewType ?? "Unknown"} />
                  <SessionDetail label="Answered" value={`${data.answeredQuestions ?? 0}/${data.totalQuestions ?? 0}`} />
                  <SessionDetail label="Skipped" value={data.skippedQuestions ?? 0} />
                  <SessionDetail label="Hints Used" value={data.hintsUsed ?? 0} />
                  <SessionDetail label="Duration" value={formatDuration(data.durationSeconds)} />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                <h2 className="text-lg font-semibold text-white/90">Score breakdown</h2>
                <div className="mt-4 space-y-3">
                  <BreakdownRow label="Confidence" value={percent(data.confidenceScore)} />
                  <BreakdownRow label="Knowledge" value={percent(data.knowledgeScore)} />
                  <BreakdownRow label="Communication" value={percent(data.communicationScore)} />
                  <BreakdownRow label="Clarity" value={percent(data.clarityScore)} />
                  <BreakdownRow label="Relevance" value={percent(data.relevanceScore)} />
                  <BreakdownRow label="Technical Depth" value={percent(data.technicalDepthScore)} />
                  <BreakdownRow label="Problem Solving" value={percent(data.problemSolvingScore)} />
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResultCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 ${highlight ? "border-indigo-500/20 bg-indigo-500/10" : "border-white/10 bg-white/5"}`}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SessionDetail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-950/80 px-3 py-3 text-sm text-slate-300">
      <span>{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/80 px-4 py-3 text-sm text-slate-300">
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-linear-to-r from-indigo-500 via-purple-500 to-cyan-400" style={{ width: value === "N/A" ? "5%" : value }} />
      </div>
    </div>
  );
}

function LearningModule({ score }: { score?: number | null }) {
  const isStrong = score != null && score >= 75;
  const focus = score == null ? "Complete an interview session to unlock personalized learning." : score >= 85 ? "Refine your strong performance with advanced mock interviews." : "Build stronger foundations with targeted practice.";

  return (
    <div className="space-y-4 text-sm text-slate-300">
      <p>{focus}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <BookOpen className="h-4 w-4 text-indigo-400" /> Technical Practice
          </div>
          <p className="mt-2">{isStrong ? "Try deeper system design and coding scenarios." : "Work on clear algorithm explanations and problem solving."}</p>
        </div>
        <div className="rounded-2xl bg-slate-950/80 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-emerald-400" /> Communication Skills
          </div>
          <p className="mt-2">{isStrong ? "Practice storytelling for concise answers." : "Focus on structure, clarity, and confidence in your responses."}</p>
        </div>
      </div>
    </div>
  );
}
