"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";

/**
 * AtsScoreCard.tsx
 *
 * Backend Integrated ATS Score Card
 *
 * Supported usage:
 * <AtsScoreCard />
 * <AtsScoreCard resumeId="1" />
 * <AtsScoreCard resumeId="1" versionId="21" />
 *
 * Architecture aligned with latest project update:
 * - backend-first
 * - supports ApiResponse wrappers (data / payload / result)
 * - credentials: "include"
 * - bearer token fallback
 * - resilient endpoint fallback
 * - user/admin compatible ATS fetch strategy
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type GenericObject = Record<string, unknown>;

type AtsScoreCardProps = {
  resumeId?: string | number;
  versionId?: string | number;
  title?: string;
  showTips?: boolean;
  className?: string;
  autoFetch?: boolean;
};

type AtsPayload = {
  atsScore?: number;
  ats_score?: number;
  score?: number;
  resumeName?: string;
  resume_name?: string;
  versionName?: string;
  version_name?: string;
  tips?: string[];
  suggestions?: string[];
  recommendations?: string[];
  updatedAt?: string;
  updated_at?: string;
};

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token")
  );
}

function formatDateTime(value?: string) {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function readString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function readNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return undefined;
}

function readStringArray(...values: unknown[]): string[] | undefined {
  for (const value of values) {
    if (Array.isArray(value)) {
      const normalized = value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim());

      if (normalized.length > 0) return normalized;
    }
  }
  return undefined;
}

function unwrapPayload<T = unknown>(input: unknown): T | null {
  if (!input || typeof input !== "object") return null;

  const obj = input as ApiEnvelope<T> & GenericObject;

  if (obj.data && typeof obj.data === "object") return obj.data as T;
  if (obj.payload && typeof obj.payload === "object") return obj.payload as T;
  if (obj.result && typeof obj.result === "object") return obj.result as T;

  return input as T;
}

function extractAtsPayload(input: unknown): {
  score: number;
  resumeName: string | null;
  versionName: string | null;
  tips: string[];
  updatedAt: string | null;
} {
  const payload = unwrapPayload<AtsPayload | GenericObject>(input);
  const root = payload && typeof payload === "object" ? (payload as GenericObject) : {};

  return {
    score: readNumber(root.atsScore, root.ats_score, root.score) ?? 0,
    resumeName: readString(root.resumeName, root.resume_name) || null,
    versionName: readString(root.versionName, root.version_name) || null,
    tips:
      readStringArray(root.tips, root.suggestions, root.recommendations) || [],
    updatedAt: readString(root.updatedAt, root.updated_at) || null,
  };
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 60) return "Average";
  return "Needs Improvement";
}

function getScoreTextColor(score: number) {
  if (score >= 85) return "text-green-300";
  if (score >= 70) return "text-yellow-300";
  return "text-red-300";
}

export default function AtsScoreCard({
  resumeId,
  versionId,
  title = "ATS Score",
  showTips = true,
  className = "",
  autoFetch = true,
}: AtsScoreCardProps) {
  const [score, setScore] = useState(0);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [versionName, setVersionName] = useState<string | null>(null);
  const [tips, setTips] = useState<string[]>([
    "Add more measurable achievements and outcomes.",
    "Use keywords from relevant job descriptions.",
    "Keep formatting simple and ATS-friendly.",
  ]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useMemo<HeadersInit>(() => {
    const token = getStoredToken();

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const endpointCandidates = useMemo(() => {
    const rid =
      resumeId !== undefined && resumeId !== null ? String(resumeId) : undefined;
    const vid =
      versionId !== undefined && versionId !== null ? String(versionId) : undefined;

    const get: string[] = [];

    if (rid && vid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/ats-score`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/ats-score`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/ats-score`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/ats-score`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/ats-score`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/ats-score`
      );
    } else if (rid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/ats-score`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/ats-score`,
        `${API_BASE_URL}/api/admin/resume/${rid}/ats-score`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/ats-score`
      );
    } else {
      get.push(
        `${API_BASE_URL}/api/user/resume/current/ats-score`,
        `${API_BASE_URL}/api/user/resume/latest/ats-score`,
        `${API_BASE_URL}/api/admin/resume/current/ats-score`,
        `${API_BASE_URL}/api/admin/resume/latest/ats-score`
      );
    }

    return { get };
  }, [resumeId, versionId]);

  const safeScore = Math.max(0, Math.min(score, 100));
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  const fetchAtsScore = useCallback(
    async (isRefresh = false) => {
      try {
        setError(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let resolved:
          | {
              score: number;
              resumeName: string | null;
              versionName: string | null;
              tips: string[];
              updatedAt: string | null;
            }
          | null = null;

        for (const endpoint of endpointCandidates.get) {
          try {
            const response = await fetch(endpoint, {
              method: "GET",
              headers: authHeaders,
              credentials: "include",
              cache: "no-store",
            });

            if (!response.ok) {
              if ([401, 403, 404].includes(response.status)) continue;
              continue;
            }

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) continue;

            const result = await response.json();
            resolved = extractAtsPayload(result);
            break;
          } catch {
            continue;
          }
        }

        if (!resolved) {
          throw new Error("ATS score data not found.");
        }

        setScore(resolved.score);
        setResumeName(resolved.resumeName);
        setVersionName(resolved.versionName);
        setUpdatedAt(resolved.updatedAt);

        if (resolved.tips.length > 0) {
          setTips(resolved.tips);
        }
      } catch (err) {
        console.error("ATS score fetch error:", err);
        setError("Unable to load ATS score from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders, endpointCandidates.get]
  );

  useEffect(() => {
    if (!autoFetch) return;
    fetchAtsScore();
  }, [autoFetch, fetchAtsScore]);

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur-xl ${className}`}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Trophy className="text-yellow-300" size={22} />
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-xs text-white/50">Backend calculated</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchAtsScore(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/15 disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-indigo-300" size={28} />
          <p className="text-sm text-white/60">Loading ATS score...</p>
        </div>
      ) : error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <AlertCircle size={18} className="mt-0.5 text-red-300" />
          <p className="text-sm text-red-100">{error}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <svg width="170" height="170" className="h-40 w-40" aria-label="ATS score">
                <circle
                  cx="85"
                  cy="85"
                  r={radius}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="12"
                  fill="transparent"
                />
                <circle
                  cx="85"
                  cy="85"
                  r={radius}
                  stroke="url(#atsGradient)"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  transform="rotate(-90 85 85)"
                />
                <defs>
                  <linearGradient id="atsGradient">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className={`text-4xl font-extrabold ${getScoreTextColor(safeScore)}`}>
                    {safeScore}%
                  </div>
                  <div className="mt-1 text-xs text-white/55">ATS Score</div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-white">
                {getScoreLabel(safeScore)}
              </p>

              {resumeName && (
                <p className="mt-1 wrap-break-word text-sm text-white/60">
                  Resume: <span className="text-white/80">{resumeName}</span>
                </p>
              )}

              {versionName && (
                <p className="mt-1 wrap-break-word text-sm text-white/60">
                  Version: <span className="text-white/80">{versionName}</span>
                </p>
              )}

              {updatedAt && (
                <p className="mt-2 text-xs text-white/45">
                  Updated: {formatDateTime(updatedAt)}
                </p>
              )}
            </div>
          </div>

          {showTips && tips.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-300" />
                <h3 className="text-sm font-semibold text-white/90">
                  Improvement Tips
                </h3>
              </div>

              <div className="space-y-3">
                {tips.map((tip, index) => (
                  <div
                    key={`${tip}-${index}`}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-white/40" />
                    <p className="text-sm text-white/70">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}