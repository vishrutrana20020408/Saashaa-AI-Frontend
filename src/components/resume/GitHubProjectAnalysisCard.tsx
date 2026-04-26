"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Github,
  Link as LinkIcon,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileCode2,
  BadgeCheck,
  Brain,
  Wrench,
  Target,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";

/**
 * src/components/resume/GitHubProjectAnalysisCard.tsx
 *
 * Backend Integrated GitHub Project Analysis Card
 *
 * Latest-project aligned goals:
 * - Backend-first GitHub analysis flow
 * - AI-engine compatible architecture
 * - Works with:
 *   - plain repository analysis
 *   - repository analysis against current resume
 *   - repository analysis against resumeId
 *   - repository analysis against resumeId + versionId
 * - Supports flexible backend response shapes:
 *   - data
 *   - payload
 *   - result
 * - Supports bearer token fallback + credentials: "include"
 *
 * Expected backend family (latest project-aligned):
 * - GET  /api/github/health
 * - POST /api/github/analyze
 * - POST /api/github/analyze/resume-project
 *
 * This component is resilient to small backend contract differences.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type GenericObject = Record<string, unknown>;

type GitHubProjectAnalysisResult = {
  repositoryUrl?: string;
  repositoryName?: string;
  owner?: string;
  branch?: string;
  primaryLanguage?: string;
  techStack?: string[];
  summary?: string;
  readmeSummary?: string;
  score?: number;
  relevanceScore?: number;
  atsImpactScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  matchedSkills?: string[];
  missingSkills?: string[];
  projectHighlights?: string[];
  raw?: GenericObject | null;
};

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

type GitHubProjectAnalysisCardProps = {
  resumeId?: string | number;
  versionId?: string | number;
  defaultRepoUrl?: string;
  autoAnalyze?: boolean;
  title?: string;
  subtitle?: string;
  analyzeLabel?: string;
  showHealth?: boolean;
  disabled?: boolean;
  className?: string;
  onAnalyzed?: (result: GitHubProjectAnalysisResult) => void;
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

function readMessage(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as GenericObject;
  return readString(obj.message, obj.error, obj.detail);
}

function normalizeAnalysisResult(input: unknown, repoUrl?: string): GitHubProjectAnalysisResult | null {
  if (!input || typeof input !== "object") return null;

  const payload = unwrapPayload<GenericObject>(input);
  if (!payload || typeof payload !== "object") return null;

  const source = payload as GenericObject;

  const result: GitHubProjectAnalysisResult = {
    repositoryUrl: readString(
      source.repositoryUrl,
      source.repository_url,
      source.repoUrl,
      source.repo_url,
      source.githubUrl,
      source.github_url,
      repoUrl
    ),
    repositoryName: readString(
      source.repositoryName,
      source.repository_name,
      source.repoName,
      source.repo_name,
      source.name
    ),
    owner: readString(source.owner, source.username, source.account),
    branch: readString(source.branch, source.defaultBranch, source.default_branch),
    primaryLanguage: readString(
      source.primaryLanguage,
      source.primary_language,
      source.language
    ),
    techStack: readStringArray(
      source.techStack,
      source.tech_stack,
      source.stack,
      source.technologies
    ),
    summary: readString(
      source.summary,
      source.analysis,
      source.aiSummary,
      source.ai_summary,
      source.projectAnalysis,
      source.project_analysis
    ),
    readmeSummary: readString(
      source.readmeSummary,
      source.readme_summary,
      source.readmeAnalysis,
      source.readme_analysis
    ),
    score: readNumber(source.score, source.analysisScore, source.analysis_score),
    relevanceScore: readNumber(
      source.relevanceScore,
      source.relevance_score,
      source.matchScore,
      source.match_score
    ),
    atsImpactScore: readNumber(
      source.atsImpactScore,
      source.atsImpact,
      source.ats_impact_score,
      source.ats_score_impact
    ),
    strengths: readStringArray(source.strengths, source.positives),
    weaknesses: readStringArray(source.weaknesses, source.gaps, source.concerns),
    recommendations: readStringArray(
      source.recommendations,
      source.suggestions,
      source.improvements
    ),
    matchedSkills: readStringArray(
      source.matchedSkills,
      source.matched_skills,
      source.detectedMatches,
      source.detected_matches
    ),
    missingSkills: readStringArray(
      source.missingSkills,
      source.missing_skills,
      source.missingKeywords,
      source.missing_keywords
    ),
    projectHighlights: readStringArray(
      source.projectHighlights,
      source.project_highlights,
      source.highlights
    ),
    raw: source,
  };

  const hasUsefulData =
    Boolean(result.repositoryUrl) ||
    Boolean(result.repositoryName) ||
    Boolean(result.summary) ||
    (result.techStack?.length ?? 0) > 0 ||
    (result.strengths?.length ?? 0) > 0 ||
    (result.recommendations?.length ?? 0) > 0;

  return hasUsefulData ? result : null;
}

function parseGitHubUrl(input: string) {
  try {
    const url = new URL(input.trim());
    const parts = url.pathname.split("/").filter(Boolean);
    return {
      owner: parts[0] || "",
      repo: parts[1] || "",
    };
  } catch {
    return { owner: "", repo: "" };
  }
}

function scoreColorClass(score?: number) {
  if (typeof score !== "number") return "text-white";
  if (score >= 85) return "text-green-300";
  if (score >= 70) return "text-yellow-300";
  return "text-red-300";
}

function buildAnalyzeBody(params: {
  repoUrl: string;
  resumeId?: string | number;
  versionId?: string | number;
}) {
  const { owner, repo } = parseGitHubUrl(params.repoUrl);

  return {
    repoUrl: params.repoUrl,
    repositoryUrl: params.repoUrl,
    githubUrl: params.repoUrl,
    owner,
    repo,
    repositoryName: repo || undefined,

    resumeId:
      params.resumeId !== undefined && params.resumeId !== null
        ? Number(params.resumeId)
        : undefined,
    sourceResumeId:
      params.resumeId !== undefined && params.resumeId !== null
        ? Number(params.resumeId)
        : undefined,

    resumeVersionId:
      params.versionId !== undefined && params.versionId !== null
        ? Number(params.versionId)
        : undefined,
    sourceResumeVersionId:
      params.versionId !== undefined && params.versionId !== null
        ? Number(params.versionId)
        : undefined,
    versionId:
      params.versionId !== undefined && params.versionId !== null
        ? Number(params.versionId)
        : undefined,

    includeAiSummary: true,
    includeReadmeAnalysis: true,
    includeSkillMatching: true,
  };
}

function InfoPill({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80">
      {label}: {value}
    </span>
  );
}

function SectionList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${title}-${index}-${item}`}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-white/40" />
            <p className="text-sm text-white/75">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GitHubProjectAnalysisCard({
  resumeId,
  versionId,
  defaultRepoUrl = "",
  autoAnalyze = false,
  title = "GitHub Project Analysis",
  subtitle = "Analyze a GitHub repository with backend + AI-engine integration.",
  analyzeLabel = "Analyze Repository",
  showHealth = true,
  disabled = false,
  className = "",
  onAnalyzed,
}: GitHubProjectAnalysisCardProps) {
  const [repoUrl, setRepoUrl] = useState(defaultRepoUrl);

  const [healthStatus, setHealthStatus] = useState<"unknown" | "healthy" | "unhealthy">(
    "unknown"
  );

  const [analysisResult, setAnalysisResult] =
    useState<GitHubProjectAnalysisResult | null>(null);

  const [loadingHealth, setLoadingHealth] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authHeaders = useMemo<HeadersInit>(() => {
    const token = getStoredToken();

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const healthEndpoints = useMemo(
    () => [
      `${API_BASE_URL}/api/github/health`,
      `${API_BASE_URL}/api/user/github/health`,
      `${API_BASE_URL}/api/admin/github/health`,
    ],
    []
  );

  const analyzeEndpoints = useMemo(() => {
    const endpoints: string[] = [];

    if (resumeId !== undefined || versionId !== undefined) {
      endpoints.push(
        `${API_BASE_URL}/api/github/analyze/resume-project`,
        `${API_BASE_URL}/api/github/analyze-resume-project`,
        `${API_BASE_URL}/api/user/github/analyze/resume-project`,
        `${API_BASE_URL}/api/user/github/analyze-resume-project`
      );
    }

    endpoints.push(
      `${API_BASE_URL}/api/github/analyze`,
      `${API_BASE_URL}/api/user/github/analyze`,
      `${API_BASE_URL}/api/admin/github/analyze`
    );

    return endpoints;
  }, [resumeId, versionId]);

  const fetchHealth = useCallback(async () => {
    if (!showHealth) return;

    try {
      setLoadingHealth(true);
      let healthy = false;

      for (const endpoint of healthEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: authHeaders,
            credentials: "include",
            cache: "no-store",
          });

          if (!response.ok) continue;

          const contentType = response.headers.get("content-type") || "";

          if (contentType.includes("application/json")) {
            const json = await response.json();
            const payload = unwrapPayload<GenericObject>(json);
            const status = readString(
              payload?.status,
              payload?.message,
              (json as GenericObject)?.status
            );

            if (
              status?.toLowerCase().includes("up") ||
              status?.toLowerCase().includes("healthy") ||
              status?.toLowerCase().includes("ok")
            ) {
              healthy = true;
              break;
            }

            healthy = true;
            break;
          }

          healthy = true;
          break;
        } catch {
          continue;
        }
      }

      setHealthStatus(healthy ? "healthy" : "unhealthy");
    } catch {
      setHealthStatus("unhealthy");
    } finally {
      setLoadingHealth(false);
    }
  }, [authHeaders, healthEndpoints, showHealth]);

  const handleAnalyze = useCallback(async () => {
    if (!repoUrl.trim()) {
      setErrorMessage("GitHub repository URL is required.");
      return;
    }

    try {
      setAnalyzing(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      let resolved: GitHubProjectAnalysisResult | null = null;
      let responseMessage = "Repository analyzed successfully.";

      const body = JSON.stringify(
        buildAnalyzeBody({
          repoUrl: repoUrl.trim(),
          resumeId,
          versionId,
        })
      );

      for (const endpoint of analyzeEndpoints) {
        for (const method of ["POST", "PUT"] as const) {
          try {
            const response = await fetch(endpoint, {
              method,
              headers: authHeaders,
              credentials: "include",
              body,
            });

            if (!response.ok) {
              if ([401, 403, 404, 405].includes(response.status)) continue;
              continue;
            }

            const contentType = response.headers.get("content-type") || "";
            let result: unknown = null;

            if (contentType.includes("application/json")) {
              try {
                result = await response.json();
              } catch {
                result = null;
              }
            }

            if (result) {
              resolved = normalizeAnalysisResult(result, repoUrl.trim());

              const message = readMessage(result);
              if (message) {
                responseMessage = message;
              }
            }

            if (resolved) break;
          } catch {
            continue;
          }
        }

        if (resolved) break;
      }

      if (!resolved) {
        throw new Error("No repository analysis was returned by backend.");
      }

      setAnalysisResult(resolved);
      setSuccessMessage(responseMessage);
      onAnalyzed?.(resolved);
    } catch (error) {
      console.error("GitHub project analysis error:", error);
      setErrorMessage("Failed to analyze GitHub repository from backend.");
    } finally {
      setAnalyzing(false);
    }
  }, [analyzeEndpoints, authHeaders, onAnalyzed, repoUrl, resumeId, versionId]);

  useEffect(() => {
    if (showHealth) {
      fetchHealth();
    }
  }, [fetchHealth, showHealth]);

  useEffect(() => {
    if (!autoAnalyze) return;
    if (!defaultRepoUrl.trim()) return;
    handleAnalyze();
  }, [autoAnalyze, defaultRepoUrl, handleAnalyze]);

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur-xl ${className}`}
    >
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-slate-700 to-indigo-600 shadow-lg">
            <Github size={20} />
          </div>

          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-white/55">{subtitle}</p>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {showHealth && (
                <span
                  className={`rounded-full border px-3 py-1 ${
                    healthStatus === "healthy"
                      ? "border-green-400/20 bg-green-500/15 text-green-100"
                      : healthStatus === "unhealthy"
                        ? "border-red-400/20 bg-red-500/15 text-red-100"
                        : "border-white/10 bg-white/10 text-white/75"
                  }`}
                >
                  {loadingHealth
                    ? "Checking backend..."
                    : healthStatus === "healthy"
                      ? "GitHub AI Healthy"
                      : healthStatus === "unhealthy"
                        ? "GitHub AI Unavailable"
                        : "Health Unknown"}
                </span>
              )}

              {resumeId !== undefined && resumeId !== null && (
                <InfoPill label="Resume" value={String(resumeId)} />
              )}

              {versionId !== undefined && versionId !== null && (
                <InfoPill label="Version" value={String(versionId)} />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {showHealth && (
            <button
              type="button"
              onClick={fetchHealth}
              disabled={loadingHealth}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              {loadingHealth ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Health
            </button>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={disabled || analyzing || !repoUrl.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-4 py-2.5 font-semibold transition hover:opacity-95 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                {analyzeLabel}
              </>
            )}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
          <CheckCircle2 size={18} className="mt-0.5 text-green-300" />
          <p className="text-sm text-green-100">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
          <AlertCircle size={18} className="mt-0.5 text-red-300" />
          <p className="text-sm text-red-100">{errorMessage}</p>
        </div>
      )}

      <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">
        <label className="mb-2 block text-sm text-white/70">
          GitHub Repository URL
        </label>

        <div className="relative">
          <LinkIcon
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={disabled || analyzing}
            placeholder="https://github.com/username/repository"
            className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
          />
        </div>
      </div>

      {!analysisResult ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
          <Brain size={28} className="mx-auto mb-3 text-indigo-300" />
          <p className="text-sm text-white/65">
            Enter a GitHub repository URL to analyze project quality, stack fit, and
            resume relevance through your backend AI flow.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <InfoPill
                label="Repository"
                value={analysisResult.repositoryName || analysisResult.repositoryUrl}
              />
              <InfoPill label="Owner" value={analysisResult.owner} />
              <InfoPill label="Branch" value={analysisResult.branch} />
              <InfoPill label="Language" value={analysisResult.primaryLanguage} />
              <InfoPill
                label="Score"
                value={
                  analysisResult.score !== undefined
                    ? `${analysisResult.score}`
                    : analysisResult.relevanceScore !== undefined
                      ? `${analysisResult.relevanceScore}`
                      : undefined
                }
              />
            </div>

            {(analysisResult.score !== undefined ||
              analysisResult.relevanceScore !== undefined ||
              analysisResult.atsImpactScore !== undefined) && (
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {analysisResult.score !== undefined && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-1 text-xs text-white/45">Analysis Score</p>
                    <p className={`text-xl font-bold ${scoreColorClass(analysisResult.score)}`}>
                      {analysisResult.score}
                    </p>
                  </div>
                )}

                {analysisResult.relevanceScore !== undefined && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-1 text-xs text-white/45">Relevance Score</p>
                    <p
                      className={`text-xl font-bold ${scoreColorClass(
                        analysisResult.relevanceScore
                      )}`}
                    >
                      {analysisResult.relevanceScore}
                    </p>
                  </div>
                )}

                {analysisResult.atsImpactScore !== undefined && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="mb-1 text-xs text-white/45">ATS Impact</p>
                    <p
                      className={`text-xl font-bold ${scoreColorClass(
                        analysisResult.atsImpactScore
                      )}`}
                    >
                      {analysisResult.atsImpactScore}
                    </p>
                  </div>
                )}
              </div>
            )}

            {analysisResult.techStack && analysisResult.techStack.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <Wrench size={16} className="text-indigo-300" />
                  <h3 className="text-sm font-semibold text-white/90">Detected Tech Stack</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {analysisResult.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.summary && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <FileCode2 size={16} className="text-indigo-300" />
                  <h3 className="text-sm font-semibold text-white/90">AI Analysis Summary</h3>
                </div>
                <p className="text-sm leading-6 text-white/75">{analysisResult.summary}</p>
              </div>
            )}

            {analysisResult.readmeSummary && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <BadgeCheck size={16} className="text-indigo-300" />
                  <h3 className="text-sm font-semibold text-white/90">README Summary</h3>
                </div>
                <p className="text-sm leading-6 text-white/75">
                  {analysisResult.readmeSummary}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionList
              title="Project Highlights"
              icon={<Sparkles size={16} className="text-indigo-300" />}
              items={analysisResult.projectHighlights}
            />

            <SectionList
              title="Strengths"
              icon={<ShieldCheck size={16} className="text-green-300" />}
              items={analysisResult.strengths}
            />

            <SectionList
              title="Weaknesses / Gaps"
              icon={<AlertCircle size={16} className="text-yellow-300" />}
              items={analysisResult.weaknesses}
            />

            <SectionList
              title="Recommendations"
              icon={<Lightbulb size={16} className="text-purple-300" />}
              items={analysisResult.recommendations}
            />

            <SectionList
              title="Matched Skills"
              icon={<BadgeCheck size={16} className="text-emerald-300" />}
              items={analysisResult.matchedSkills}
            />

            <SectionList
              title="Missing Skills"
              icon={<Target size={16} className="text-red-300" />}
              items={analysisResult.missingSkills}
            />
          </div>
        </div>
      )}
    </div>
  );
}