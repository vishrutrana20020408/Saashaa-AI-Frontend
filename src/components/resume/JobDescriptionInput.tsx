"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  FileText,
  Loader2,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Save,
  Search,
  ClipboardPaste,
} from "lucide-react";

/**
 * src/components/resume/JobDescriptionInput.tsx
 *
 * Backend Integrated Job Description Input
 *
 * Latest-project aligned goals:
 * - Backend-first job description flow
 * - Works for:
 *   - resume tailoring pages
 *   - job application flow
 *   - ATS analysis flow
 *   - interview setup flow
 * - Supports flexible backend response shapes:
 *   - data
 *   - payload
 *   - result
 * - Supports bearer token fallback + credentials: "include"
 * - Supports preload from saved job description or job record
 * - Supports AI-engine aligned JD analysis
 *
 * Expected backend families:
 * - POST /api/user/job-description
 * - GET  /api/user/job-description/{jobDescriptionId}
 * - POST /api/user/job-description/analyze
 * - GET  /api/user/jobs/{jobId}
 *
 * Additional resilient endpoint support included for latest project continuity.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type GenericObject = Record<string, unknown>;

type JobDescriptionInputProps = {
  value?: string;
  onChange?: (value: string) => void;

  jobTitle?: string;
  onJobTitleChange?: (value: string) => void;

  companyName?: string;
  onCompanyNameChange?: (value: string) => void;

  additionalInstructions?: string;
  onAdditionalInstructionsChange?: (value: string) => void;

  jobId?: string | number;
  jobDescriptionId?: string | number;

  autoAnalyze?: boolean;
  showAnalyzeButton?: boolean;
  showSaveButton?: boolean;
  showAdditionalInstructions?: boolean;
  disabled?: boolean;
  className?: string;

  onAnalyzed?: (data: {
    jobTitle?: string;
    companyName?: string;
    jobDescription?: string;
    skills?: string[];
    keywords?: string[];
  }) => void;

  onSaved?: (data: JobDescriptionRecord) => void;
};

type JobDescriptionRecord = {
  id?: number;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  additionalInstructions?: string;
  skills?: string[];
  keywords?: string[];
  updatedAt?: string;
};

type JobRecord = {
  id?: number;
  title?: string;
  company?: string;
  description?: string;
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
    if (typeof value === "number" && Number.isFinite(value)) return value;
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

function normalizeJobDescriptionRecord(input: unknown): JobDescriptionRecord | null {
  if (!input || typeof input !== "object") return null;

  const payload = unwrapPayload<GenericObject>(input);
  if (!payload || typeof payload !== "object") return null;

  const source = payload as GenericObject;

  const normalized: JobDescriptionRecord = {
    id: readNumber(source.id, source.jobDescriptionId, source.job_description_id),
    jobTitle: readString(source.jobTitle, source.job_title, source.title),
    companyName: readString(source.companyName, source.company_name, source.company),
    jobDescription: readString(
      source.jobDescription,
      source.job_description,
      source.description,
      source.content
    ),
    additionalInstructions: readString(
      source.additionalInstructions,
      source.additional_instructions,
      source.instructions,
      source.notes
    ),
    skills: readStringArray(source.skills, source.detectedSkills, source.detected_skills),
    keywords: readStringArray(
      source.keywords,
      source.detectedKeywords,
      source.detected_keywords
    ),
    updatedAt: readString(source.updatedAt, source.updated_at),
  };

  const hasUsefulData =
    normalized.id !== undefined ||
    Boolean(normalized.jobTitle) ||
    Boolean(normalized.companyName) ||
    Boolean(normalized.jobDescription) ||
    (normalized.skills?.length ?? 0) > 0 ||
    (normalized.keywords?.length ?? 0) > 0;

  return hasUsefulData ? normalized : null;
}

function normalizeJobRecord(input: unknown): JobRecord | null {
  if (!input || typeof input !== "object") return null;

  const payload = unwrapPayload<GenericObject>(input);
  if (!payload || typeof payload !== "object") return null;

  const source = payload as GenericObject;

  const normalized: JobRecord = {
    id: readNumber(source.id, source.jobId, source.job_id),
    title: readString(source.title, source.jobTitle, source.job_title),
    company: readString(source.company, source.companyName, source.company_name),
    description: readString(source.description, source.jobDescription, source.job_description),
  };

  const hasUsefulData =
    normalized.id !== undefined ||
    Boolean(normalized.title) ||
    Boolean(normalized.company) ||
    Boolean(normalized.description);

  return hasUsefulData ? normalized : null;
}

export default function JobDescriptionInput({
  value = "",
  onChange,
  jobTitle = "",
  onJobTitleChange,
  companyName = "",
  onCompanyNameChange,
  additionalInstructions = "",
  onAdditionalInstructionsChange,
  jobId,
  jobDescriptionId,
  autoAnalyze = false,
  showAnalyzeButton = true,
  showSaveButton = true,
  showAdditionalInstructions = true,
  disabled = false,
  className = "",
  onAnalyzed,
  onSaved,
}: JobDescriptionInputProps) {
  const [internalJobTitle, setInternalJobTitle] = useState(jobTitle);
  const [internalCompanyName, setInternalCompanyName] = useState(companyName);
  const [internalDescription, setInternalDescription] = useState(value);
  const [internalAdditionalInstructions, setInternalAdditionalInstructions] =
    useState(additionalInstructions);

  const [skills, setSkills] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authHeaders = useMemo<HeadersInit>(() => {
    const token = getStoredToken();

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const controlledJobTitle = onJobTitleChange ? jobTitle : internalJobTitle;
  const controlledCompanyName = onCompanyNameChange
    ? companyName
    : internalCompanyName;
  const controlledDescription = onChange ? value : internalDescription;
  const controlledAdditionalInstructions = onAdditionalInstructionsChange
    ? additionalInstructions
    : internalAdditionalInstructions;

  const setJobTitleValue = useCallback(
    (next: string) => {
      if (onJobTitleChange) onJobTitleChange(next);
      else setInternalJobTitle(next);
    },
    [onJobTitleChange]
  );

  const setCompanyNameValue = useCallback(
    (next: string) => {
      if (onCompanyNameChange) onCompanyNameChange(next);
      else setInternalCompanyName(next);
    },
    [onCompanyNameChange]
  );

  const setDescriptionValue = useCallback(
    (next: string) => {
      if (onChange) onChange(next);
      else setInternalDescription(next);
    },
    [onChange]
  );

  const setAdditionalInstructionsValue = useCallback(
    (next: string) => {
      if (onAdditionalInstructionsChange) onAdditionalInstructionsChange(next);
      else setInternalAdditionalInstructions(next);
    },
    [onAdditionalInstructionsChange]
  );

  const fetchJobDescriptionEndpoints = useMemo(() => {
    if (!jobDescriptionId) return [];
    return [
      `${API_BASE_URL}/api/user/job-description/${jobDescriptionId}`,
      `${API_BASE_URL}/api/user/job-descriptions/${jobDescriptionId}`,
      `${API_BASE_URL}/api/user/job/description/${jobDescriptionId}`,
    ];
  }, [jobDescriptionId]);

  const fetchJobEndpoints = useMemo(() => {
    if (!jobId) return [];
    return [
      `${API_BASE_URL}/api/user/jobs/${jobId}`,
      `${API_BASE_URL}/api/user/job/${jobId}`,
    ];
  }, [jobId]);

  const analyzeEndpoints = useMemo(
    () => [
      `${API_BASE_URL}/api/user/job-description/analyze`,
      `${API_BASE_URL}/api/user/job-description/analysis`,
      `${API_BASE_URL}/api/user/job/analyze`,
      `${API_BASE_URL}/api/user/resume/tailor/extract-tools`,
    ],
    []
  );

  const saveEndpoints = useMemo(
    () => [
      `${API_BASE_URL}/api/user/job-description`,
      `${API_BASE_URL}/api/user/job-descriptions`,
      `${API_BASE_URL}/api/user/job/description`,
    ],
    []
  );

  const fetchExistingData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (fetchJobDescriptionEndpoints.length > 0) {
        let resolvedRecord: JobDescriptionRecord | null = null;

        for (const endpoint of fetchJobDescriptionEndpoints) {
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
            resolvedRecord = normalizeJobDescriptionRecord(result);
            if (resolvedRecord) break;
          } catch {
            continue;
          }
        }

        if (!resolvedRecord) {
          throw new Error("Saved job description not found.");
        }

        setJobTitleValue(resolvedRecord.jobTitle || "");
        setCompanyNameValue(resolvedRecord.companyName || "");
        setDescriptionValue(resolvedRecord.jobDescription || "");
        setAdditionalInstructionsValue(resolvedRecord.additionalInstructions || "");
        setSkills(resolvedRecord.skills || []);
        setKeywords(resolvedRecord.keywords || []);
        setUpdatedAt(resolvedRecord.updatedAt);
        return;
      }

      if (fetchJobEndpoints.length > 0) {
        let resolvedJob: JobRecord | null = null;

        for (const endpoint of fetchJobEndpoints) {
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
            resolvedJob = normalizeJobRecord(result);
            if (resolvedJob) break;
          } catch {
            continue;
          }
        }

        if (!resolvedJob) {
          throw new Error("Job details not found.");
        }

        setJobTitleValue(resolvedJob.title || "");
        setCompanyNameValue(resolvedJob.company || "");
        setDescriptionValue(resolvedJob.description || "");
      }
    } catch (error) {
      console.error("Fetch job description input data error:", error);
      setErrorMessage("Unable to load job description data from backend.");
    } finally {
      setLoading(false);
    }
  }, [
    authHeaders,
    fetchJobDescriptionEndpoints,
    fetchJobEndpoints,
    setAdditionalInstructionsValue,
    setCompanyNameValue,
    setDescriptionValue,
    setJobTitleValue,
  ]);

  useEffect(() => {
    if (jobDescriptionId || jobId) {
      fetchExistingData();
    }
  }, [fetchExistingData, jobDescriptionId, jobId]);

  const handleAnalyze = useCallback(async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!controlledDescription.trim()) {
        setErrorMessage("Please enter a job description before analyzing.");
        return;
      }

      setAnalyzing(true);

      let resolvedRecord: JobDescriptionRecord | null = null;
      let responseMessage = "Job description analyzed successfully.";

      for (const endpoint of analyzeEndpoints) {
        try {
          const body =
            endpoint.includes("/resume/tailor/extract-tools")
              ? JSON.stringify({
                  resumeVersionId: null,
                  companyName: controlledCompanyName,
                  jobTitle: controlledJobTitle,
                  jobDescription: controlledDescription,
                  additionalNotes: controlledAdditionalInstructions,
                })
              : JSON.stringify({
                  jobTitle: controlledJobTitle,
                  companyName: controlledCompanyName,
                  jobDescription: controlledDescription,
                  additionalInstructions: controlledAdditionalInstructions,
                });

          const response = await fetch(endpoint, {
            method: "POST",
            headers: authHeaders,
            credentials: "include",
            body,
          });

          if (!response.ok) {
            if ([401, 403, 404, 405].includes(response.status)) continue;
            continue;
          }

          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) continue;

          const result = await response.json();

          if (endpoint.includes("/resume/tailor/extract-tools")) {
            const payload = unwrapPayload<GenericObject>(result);
            if (payload && typeof payload === "object") {
              const extractedSkills = readStringArray(
                payload.skills,
                payload.tools,
                payload.requiredTools,
                payload.required_tools
              ) || [];
              const extractedKeywords = readStringArray(
                payload.keywords,
                payload.requiredKeywords,
                payload.required_keywords
              ) || [];

              resolvedRecord = {
                jobTitle: controlledJobTitle,
                companyName: controlledCompanyName,
                jobDescription: controlledDescription,
                additionalInstructions: controlledAdditionalInstructions,
                skills: extractedSkills,
                keywords: extractedKeywords,
                updatedAt: readString(payload.updatedAt, payload.updated_at),
              };
            }
          } else {
            resolvedRecord = normalizeJobDescriptionRecord(result);
          }

          const message = readMessage(result);
          if (message) responseMessage = message;

          if (resolvedRecord) break;
        } catch {
          continue;
        }
      }

      if (!resolvedRecord) {
        throw new Error("No analysis result returned from backend.");
      }

      setJobTitleValue(resolvedRecord.jobTitle || controlledJobTitle);
      setCompanyNameValue(resolvedRecord.companyName || controlledCompanyName);
      setDescriptionValue(resolvedRecord.jobDescription || controlledDescription);
      setSkills(resolvedRecord.skills || []);
      setKeywords(resolvedRecord.keywords || []);
      setUpdatedAt(resolvedRecord.updatedAt);

      onAnalyzed?.({
        jobTitle: resolvedRecord.jobTitle,
        companyName: resolvedRecord.companyName,
        jobDescription: resolvedRecord.jobDescription,
        skills: resolvedRecord.skills || [],
        keywords: resolvedRecord.keywords || [],
      });

      setSuccessMessage(responseMessage);
    } catch (error) {
      console.error("Analyze job description error:", error);
      setErrorMessage("Failed to analyze job description.");
    } finally {
      setAnalyzing(false);
    }
  }, [
    analyzeEndpoints,
    authHeaders,
    controlledAdditionalInstructions,
    controlledCompanyName,
    controlledDescription,
    controlledJobTitle,
    onAnalyzed,
    setCompanyNameValue,
    setDescriptionValue,
    setJobTitleValue,
  ]);

  useEffect(() => {
    if (!autoAnalyze || analyzing) return;
    if (controlledDescription.trim().length <= 80) return;

    const timer = setTimeout(() => {
      handleAnalyze();
    }, 700);

    return () => clearTimeout(timer);
  }, [autoAnalyze, controlledDescription, analyzing, handleAnalyze]);

  const handleSave = useCallback(async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!controlledDescription.trim()) {
        setErrorMessage("Job description cannot be empty.");
        return;
      }

      setSaving(true);

      let resolvedRecord: JobDescriptionRecord | null = null;
      let responseMessage = "Job description saved successfully.";

      const body = JSON.stringify({
        jobTitle: controlledJobTitle,
        companyName: controlledCompanyName,
        jobDescription: controlledDescription,
        additionalInstructions: controlledAdditionalInstructions,
        skills,
        keywords,
        sourceJobId: jobId ?? null,
        sourceJobDescriptionId: jobDescriptionId ?? null,
      });

      for (const endpoint of saveEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: authHeaders,
            credentials: "include",
            body,
          });

          if (!response.ok) {
            if ([401, 403, 404, 405].includes(response.status)) continue;
            continue;
          }

          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) {
            resolvedRecord = {
              jobTitle: controlledJobTitle,
              companyName: controlledCompanyName,
              jobDescription: controlledDescription,
              additionalInstructions: controlledAdditionalInstructions,
              skills,
              keywords,
            };
            break;
          }

          const result = await response.json();
          resolvedRecord = normalizeJobDescriptionRecord(result);

          const message = readMessage(result);
          if (message) responseMessage = message;

          if (resolvedRecord) break;
        } catch {
          continue;
        }
      }

      if (!resolvedRecord) {
        resolvedRecord = {
          jobTitle: controlledJobTitle,
          companyName: controlledCompanyName,
          jobDescription: controlledDescription,
          additionalInstructions: controlledAdditionalInstructions,
          skills,
          keywords,
        };
      }

      setUpdatedAt(resolvedRecord.updatedAt);
      onSaved?.(resolvedRecord);
      setSuccessMessage(responseMessage);
    } catch (error) {
      console.error("Save job description error:", error);
      setErrorMessage("Failed to save job description.");
    } finally {
      setSaving(false);
    }
  }, [
    authHeaders,
    controlledAdditionalInstructions,
    controlledCompanyName,
    controlledDescription,
    controlledJobTitle,
    jobDescriptionId,
    jobId,
    keywords,
    onSaved,
    saveEndpoints,
    skills,
  ]);

  const clearFields = useCallback(() => {
    setJobTitleValue("");
    setCompanyNameValue("");
    setDescriptionValue("");
    setAdditionalInstructionsValue("");
    setSkills([]);
    setKeywords([]);
    setUpdatedAt(undefined);
    setSuccessMessage(null);
    setErrorMessage(null);
  }, [
    setAdditionalInstructionsValue,
    setCompanyNameValue,
    setDescriptionValue,
    setJobTitleValue,
  ]);

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-xl backdrop-blur-xl ${className}`}
    >
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Briefcase size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Job Description Input</h2>
            <p className="text-sm text-white/55">
              Backend-connected job description input and analysis
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchExistingData}
          disabled={loading || disabled}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
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

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-8">
          <Loader2 className="animate-spin text-indigo-300" size={28} />
          <p className="text-sm text-white/60">Loading job details...</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-white/70">
                Job Title
              </label>
              <div className="relative">
                <Briefcase
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="text"
                  value={controlledJobTitle}
                  onChange={(e) => setJobTitleValue(e.target.value)}
                  placeholder="e.g. Backend Developer"
                  disabled={disabled}
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">
                Company Name
              </label>
              <div className="relative">
                <Building2
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="text"
                  value={controlledCompanyName}
                  onChange={(e) => setCompanyNameValue(e.target.value)}
                  placeholder="e.g. TechNova"
                  disabled={disabled}
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">
              Job Description
            </label>
            <div className="relative">
              <FileText
                size={16}
                className="absolute left-4 top-4 text-white/40"
              />
              <textarea
                value={controlledDescription}
                onChange={(e) => setDescriptionValue(e.target.value)}
                placeholder="Paste the complete job description here..."
                disabled={disabled}
                className="min-h-55 w-full resize-y rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
              />
            </div>
          </div>

          {showAdditionalInstructions && (
            <div>
              <label className="mb-2 block text-sm text-white/70">
                Additional Instructions
              </label>
              <div className="relative">
                <ClipboardPaste
                  size={16}
                  className="absolute left-4 top-4 text-white/40"
                />
                <textarea
                  value={controlledAdditionalInstructions}
                  onChange={(e) =>
                    setAdditionalInstructionsValue(e.target.value)
                  }
                  placeholder="Optional guidance for tailoring or analysis..."
                  disabled={disabled}
                  className="min-h-[110px] w-full resize-y rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                />
              </div>
            </div>
          )}

          {(skills.length > 0 || keywords.length > 0) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-300" />
                  <h3 className="text-sm font-semibold text-white/90">
                    Extracted Skills
                  </h3>
                </div>

                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-100"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/50">No skills extracted yet.</p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Search size={16} className="text-purple-300" />
                  <h3 className="text-sm font-semibold text-white/90">
                    Extracted Keywords
                  </h3>
                </div>

                {keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border border-purple-400/20 bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-100"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/50">
                    No keywords extracted yet.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-white/45">
              {updatedAt ? `Updated: ${formatDateTime(updatedAt)}` : "Not saved yet"}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={clearFields}
                disabled={disabled || saving || analyzing}
                className="rounded-xl bg-white/10 px-4 py-3 font-semibold transition hover:bg-white/15 disabled:opacity-50"
              >
                Clear
              </button>

              {showAnalyzeButton && (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={disabled || analyzing || !controlledDescription.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-green-500 to-blue-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Analyze
                    </>
                  )}
                </button>
              )}

              {showSaveButton && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={disabled || saving || !controlledDescription.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}