"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wand2,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Briefcase,
  Target,
  Save,
  Eye,
  RefreshCw,
  Wrench,
  Send,
  CheckSquare,
} from "lucide-react";

/**
 * src/app/(public)/user/resume/tailor/page.tsx
 *
 * Backend-integrated Resume Tailor Page
 *
 * Latest project alignment:
 * - Uses backend-tailoring flow under /api/user/resume/tailor/*
 * - Supports:
 *    GET  /api/user/resume/current
 *    GET  /api/user/resume/tailor/ping
 *    POST /api/user/resume/tailor/extract-tools
 *    POST /api/user/resume/tailor/tool-answers
 *    POST /api/user/resume/tailor/apply
 *
 * Frontend flow:
 * 1) Load current resume
 * 2) Enter job title / company / job description / optional instructions
 * 3) Extract tools from JD
 * 4) Fill tool knowledge answers (if backend requires them)
 * 5) Apply tailoring
 *
 * This implementation is resilient to small backend response-shape differences.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  getCurrentResume: `${API_BASE_URL}/api/user/resume/current`,
  tailorPing: `${API_BASE_URL}/api/user/resume/tailor/ping`,
  extractTools: `${API_BASE_URL}/api/user/resume/tailor/extract-tools`,
  submitToolAnswers: `${API_BASE_URL}/api/user/resume/tailor/tool-answers`,
  applyTailoring: `${API_BASE_URL}/api/user/resume/tailor/apply`,
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

type ResumeDetail = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  structuredContentJson?: string;
  fileUrl?: string;
  previewUrl?: string;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  parentVersionId?: number | null;
  updatedAt?: string;
  createdAt?: string;
};

type ExtractedToolItem = {
  toolName: string;
  required?: boolean;
  question?: string;
  description?: string;
};

type ToolAnswerItem = {
  toolName: string;
  answer: string;
};

type TailoredResumeDetail = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  versionName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  structuredContentJson?: string;
  fileUrl?: string;
  previewUrl?: string;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  parentVersionId?: number | null;
  jobApplicationCode?: string | null;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  updatedAt?: string;
  createdAt?: string;
};

type ResumeTailorRequestPayload = {
  resumeId?: number | string;
  resumeVersionId?: number | null;
  sourceResumeId?: number | string;
  sourceResumeVersionId?: number | null;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  additionalInstructions?: string;
  rawText?: string;
  toolAnswers?: ToolAnswerItem[];
  answers?: ToolAnswerItem[];
};

type ToolKnowledgeAnswerRequestPayload = {
  resumeId?: number | string;
  resumeVersionId?: number | null;
  sourceResumeId?: number | string;
  sourceResumeVersionId?: number | null;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  additionalInstructions?: string;
  answers: ToolAnswerItem[];
  toolAnswers?: ToolAnswerItem[];
};

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("accessToken")
  );
}

function buildAuthHeaders(includeJson = true): HeadersInit {
  const token = getStoredToken();

  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null): T | null {
  if (!json) return null;
  const envelope = json as ApiEnvelope<T>;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(
  value: unknown,
  fallback?: number
): number | undefined {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    return lower === "true" || lower === "1" || lower === "yes";
  }
  return false;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeResumeDetail(raw: any): ResumeDetail | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    resumeId:
      normalizeNumber(raw.resumeId) ??
      normalizeNumber(raw.id) ??
      normalizeNumber(raw.resume?.resumeId) ??
      normalizeNumber(raw.resume?.id),

    resumeVersionId:
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.currentVersionId),

    versionId:
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.currentVersionId),

    resumeName:
      normalizeString(raw.resumeName) ||
      normalizeString(raw.name) ||
      normalizeString(raw.resumeTitle),

    fileName:
      normalizeString(raw.fileName) ||
      normalizeString(raw.originalFileName) ||
      normalizeString(raw.documentName),

    atsScore:
      normalizeNumber(raw.atsScore) ??
      normalizeNumber(raw.score) ??
      normalizeNumber(raw.ats) ??
      0,

    rawText:
      normalizeString(raw.rawText) ||
      normalizeString(raw.contentText) ||
      normalizeString(raw.textContent) ||
      normalizeString(raw.content),

    structuredContentJson:
      normalizeString(raw.structuredContentJson) ||
      normalizeString(raw.structuredContent) ||
      normalizeString(raw.structuredJson),

    fileUrl:
      normalizeString(raw.fileUrl) ||
      normalizeString(raw.downloadUrl) ||
      normalizeString(raw.filePath),

    previewUrl:
      normalizeString(raw.previewUrl) ||
      normalizeString(raw.previewFileUrl),

    versionCode: normalizeString(raw.versionCode),
    versionType: normalizeString(raw.versionType),

    isBaseVersion: normalizeBoolean(
      raw.isBaseVersion ?? raw.baseVersion ?? raw.isBase
    ),

    parentVersionId: normalizeNumber(raw.parentVersionId, null as never) ?? null,

    updatedAt:
      normalizeString(raw.updatedAt) ||
      normalizeString(raw.lastModifiedAt) ||
      normalizeString(raw.modifiedAt) ||
      normalizeString(raw.createdAt),

    createdAt:
      normalizeString(raw.createdAt) ||
      normalizeString(raw.uploadedAt) ||
      normalizeString(raw.generatedAt),
  };
}

function normalizeTailoredResume(raw: any): TailoredResumeDetail | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    resumeId:
      normalizeNumber(raw.resumeId) ??
      normalizeNumber(raw.parentResumeId) ??
      normalizeNumber(raw.resume?.resumeId) ??
      normalizeNumber(raw.resume?.id),

    resumeVersionId:
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.id),

    versionId:
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.id),

    resumeName:
      normalizeString(raw.resumeName) ||
      normalizeString(raw.resumeTitle) ||
      normalizeString(raw.resume?.resumeName) ||
      normalizeString(raw.resume?.name),

    versionName:
      normalizeString(raw.versionName) ||
      normalizeString(raw.name) ||
      normalizeString(raw.title),

    fileName:
      normalizeString(raw.fileName) ||
      normalizeString(raw.originalFileName) ||
      normalizeString(raw.documentName),

    atsScore:
      normalizeNumber(raw.atsScore) ??
      normalizeNumber(raw.score) ??
      normalizeNumber(raw.ats) ??
      0,

    rawText:
      normalizeString(raw.rawText) ||
      normalizeString(raw.contentText) ||
      normalizeString(raw.textContent) ||
      normalizeString(raw.content),

    structuredContentJson:
      normalizeString(raw.structuredContentJson) ||
      normalizeString(raw.structuredContent) ||
      normalizeString(raw.structuredJson),

    fileUrl:
      normalizeString(raw.fileUrl) ||
      normalizeString(raw.downloadUrl) ||
      normalizeString(raw.filePath),

    previewUrl:
      normalizeString(raw.previewUrl) ||
      normalizeString(raw.previewFileUrl),

    versionCode: normalizeString(raw.versionCode),
    versionType: normalizeString(raw.versionType),

    isBaseVersion: normalizeBoolean(
      raw.isBaseVersion ?? raw.baseVersion ?? raw.isBase
    ),

    parentVersionId: normalizeNumber(raw.parentVersionId, null as never) ?? null,

    jobApplicationCode:
      normalizeString(raw.jobApplicationCode) ||
      normalizeString(raw.applicationCode) ||
      null,

    jobTitle: normalizeString(raw.jobTitle),
    companyName: normalizeString(raw.companyName),
    jobDescription: normalizeString(raw.jobDescription),

    updatedAt:
      normalizeString(raw.updatedAt) ||
      normalizeString(raw.lastModifiedAt) ||
      normalizeString(raw.modifiedAt),

    createdAt:
      normalizeString(raw.createdAt) ||
      normalizeString(raw.uploadedAt) ||
      normalizeString(raw.generatedAt),
  };
}

function normalizeExtractedTools(raw: any): ExtractedToolItem[] {
  const data = unwrapResponse<any>(raw);

  const candidateArrays = [
    data?.tools,
    data?.toolNames,
    data?.requiredTools,
    data?.extractedTools,
    data?.items,
    data,
  ];

  for (const candidate of candidateArrays) {
    if (!Array.isArray(candidate)) continue;

    const mapped = candidate
      .map((item: any) => {
        if (typeof item === "string") {
          return {
            toolName: item,
            required: true,
            question: `How comfortable are you with ${item}?`,
          } as ExtractedToolItem;
        }

        if (item && typeof item === "object") {
          const toolName =
            normalizeString(item.toolName) ||
            normalizeString(item.name) ||
            normalizeString(item.tool) ||
            normalizeString(item.label);

          if (!toolName) return null;

          return {
            toolName,
            required:
              typeof item.required === "boolean"
                ? item.required
                : typeof item.mandatory === "boolean"
                ? item.mandatory
                : true,
            question:
              normalizeString(item.question) ||
              normalizeString(item.prompt) ||
              `How comfortable are you with ${toolName}?`,
            description:
              normalizeString(item.description) ||
              normalizeString(item.notes) ||
              "",
          } as ExtractedToolItem;
        }

        return null;
      })
      .filter(Boolean) as ExtractedToolItem[];

    if (mapped.length > 0) {
      return mapped;
    }
  }

  return [];
}

export default function ResumeTailorPage() {
  const router = useRouter();

  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  const [currentResume, setCurrentResume] = useState<ResumeDetail | null>(null);

  const [extractedTools, setExtractedTools] = useState<ExtractedToolItem[]>([]);
  const [toolAnswers, setToolAnswers] = useState<Record<string, string>>({});

  const [tailoredResume, setTailoredResume] = useState<TailoredResumeDetail | null>(
    null
  );

  const [loadingCurrentResume, setLoadingCurrentResume] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(false);
  const [extractingTools, setExtractingTools] = useState(false);
  const [submittingAnswers, setSubmittingAnswers] = useState(false);
  const [tailoring, setTailoring] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const commonHeaders = buildAuthHeaders(true);

  const toolAnswerList = useMemo<ToolAnswerItem[]>(
    () =>
      extractedTools.map((tool) => ({
        toolName: tool.toolName,
        answer: toolAnswers[tool.toolName] || "",
      })),
    [extractedTools, toolAnswers]
  );

  const hasJobContext = useMemo(() => {
    return (
      jobTitle.trim().length > 0 &&
      companyName.trim().length > 0 &&
      jobDescription.trim().length > 0
    );
  }, [companyName, jobDescription, jobTitle]);

  const hasAllRequiredToolAnswers = useMemo(() => {
    if (extractedTools.length === 0) return true;

    return extractedTools.every((tool) => {
      if (tool.required === false) return true;
      return (toolAnswers[tool.toolName] || "").trim().length > 0;
    });
  }, [extractedTools, toolAnswers]);

  const getBaseTailorPayload = useCallback((): ResumeTailorRequestPayload => {
    return {
      resumeId: currentResume?.resumeId,
      resumeVersionId:
        currentResume?.resumeVersionId ?? currentResume?.versionId ?? null,
      sourceResumeId: currentResume?.resumeId,
      sourceResumeVersionId:
        currentResume?.resumeVersionId ?? currentResume?.versionId ?? null,
      jobTitle: jobTitle.trim(),
      companyName: companyName.trim(),
      jobDescription: jobDescription.trim(),
      additionalInstructions: additionalInstructions.trim(),
      rawText: currentResume?.rawText || "",
      toolAnswers: toolAnswerList,
      answers: toolAnswerList,
    };
  }, [
    additionalInstructions,
    companyName,
    currentResume?.rawText,
    currentResume?.resumeId,
    currentResume?.resumeVersionId,
    currentResume?.versionId,
    jobDescription,
    jobTitle,
    toolAnswerList,
  ]);

  const checkTailorBackend = useCallback(async () => {
    try {
      setCheckingBackend(true);

      const response = await fetch(API_ROUTES.tailorPing, {
        method: "GET",
        headers: commonHeaders,
        credentials: "include",
        cache: "no-store",
      });

      setBackendHealthy(response.ok);
    } catch (error) {
      console.error("Tailor ping error:", error);
      setBackendHealthy(false);
    } finally {
      setCheckingBackend(false);
    }
  }, [commonHeaders]);

  const fetchCurrentResume = useCallback(async () => {
    try {
      setLoadingCurrentResume(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(API_ROUTES.getCurrentResume, {
        method: "GET",
        headers: commonHeaders,
        credentials: "include",
        cache: "no-store",
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Failed to fetch current resume. Status: ${response.status}`
        );
      }

      const normalized = normalizeResumeDetail(unwrapResponse<any>(resultJson));

      if (!normalized) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message || "No current resume found."
        );
      }

      setCurrentResume(normalized);

      if (typeof window !== "undefined") {
        if (normalized.fileName) {
          localStorage.setItem("userResumeName", normalized.fileName);
        }
        if (normalized.resumeId != null) {
          localStorage.setItem("activeResumeId", String(normalized.resumeId));
        }
        if (normalized.resumeVersionId != null || normalized.versionId != null) {
          localStorage.setItem(
            "activeResumeVersionId",
            String(normalized.resumeVersionId ?? normalized.versionId)
          );
        }
      }

      setSuccessMessage(
        (resultJson as ApiEnvelope<any>)?.message ||
          "Current resume loaded successfully."
      );
    } catch (error: any) {
      console.error("Fetch current resume error:", error);
      setErrorMessage(error?.message || "Unable to load current resume from backend.");
    } finally {
      setLoadingCurrentResume(false);
    }
  }, [commonHeaders]);

  useEffect(() => {
    checkTailorBackend();
    fetchCurrentResume();
  }, [checkTailorBackend, fetchCurrentResume]);

  const validateJobContext = () => {
    if (!jobTitle.trim()) {
      setErrorMessage("Job title is required.");
      return false;
    }

    if (!companyName.trim()) {
      setErrorMessage("Company name is required.");
      return false;
    }

    if (!jobDescription.trim()) {
      setErrorMessage("Job description is required.");
      return false;
    }

    if (!currentResume?.resumeId) {
      setErrorMessage("Load your current resume before tailoring.");
      return false;
    }

    return true;
  };

  const handleExtractTools = async () => {
    if (!validateJobContext()) return;

    try {
      setExtractingTools(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setTailoredResume(null);

      const response = await fetch(API_ROUTES.extractTools, {
        method: "POST",
        headers: commonHeaders,
        credentials: "include",
        body: JSON.stringify(getBaseTailorPayload()),
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Failed to extract tools. Status: ${response.status}`
        );
      }

      const normalizedTools = normalizeExtractedTools(resultJson);
      setExtractedTools(normalizedTools);

      const nextAnswers: Record<string, string> = {};
      normalizedTools.forEach((tool) => {
        nextAnswers[tool.toolName] = toolAnswers[tool.toolName] || "";
      });
      setToolAnswers(nextAnswers);

      setSuccessMessage(
        (resultJson as ApiEnvelope<any>)?.message ||
          (normalizedTools.length > 0
            ? "Tools extracted successfully."
            : "No special tool questions were returned by backend.")
      );
    } catch (error: any) {
      console.error("Extract tools error:", error);
      setErrorMessage(error?.message || "Failed to extract tools from backend.");
    } finally {
      setExtractingTools(false);
    }
  };

  const handleSubmitToolAnswers = async () => {
    if (!validateJobContext()) return;

    if (!hasAllRequiredToolAnswers) {
      setErrorMessage("Please answer all required tool questions before submitting.");
      return;
    }

    try {
      setSubmittingAnswers(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload: ToolKnowledgeAnswerRequestPayload = {
        resumeId: currentResume?.resumeId,
        resumeVersionId:
          currentResume?.resumeVersionId ?? currentResume?.versionId ?? null,
        sourceResumeId: currentResume?.resumeId,
        sourceResumeVersionId:
          currentResume?.resumeVersionId ?? currentResume?.versionId ?? null,
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim(),
        jobDescription: jobDescription.trim(),
        additionalInstructions: additionalInstructions.trim(),
        answers: toolAnswerList,
        toolAnswers: toolAnswerList,
      };

      const response = await fetch(API_ROUTES.submitToolAnswers, {
        method: "POST",
        headers: commonHeaders,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Failed to submit tool answers. Status: ${response.status}`
        );
      }

      setSuccessMessage(
        (resultJson as ApiEnvelope<any>)?.message ||
          "Tool knowledge answers submitted successfully."
      );
    } catch (error: any) {
      console.error("Submit tool answers error:", error);
      setErrorMessage(
        error?.message || "Failed to submit tool answers to backend."
      );
    } finally {
      setSubmittingAnswers(false);
    }
  };

  const handleTailorResume = async () => {
    if (!validateJobContext()) return;

    if (extractedTools.length > 0 && !hasAllRequiredToolAnswers) {
      setErrorMessage("Please answer all required extracted tool questions first.");
      return;
    }

    try {
      setTailoring(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(API_ROUTES.applyTailoring, {
        method: "POST",
        headers: commonHeaders,
        credentials: "include",
        body: JSON.stringify(getBaseTailorPayload()),
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Failed to tailor resume. Status: ${response.status}`
        );
      }

      const normalized = normalizeTailoredResume(unwrapResponse<any>(resultJson));

      if (!normalized) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            "No tailored resume returned from backend."
        );
      }

      setTailoredResume(normalized);

      if (typeof window !== "undefined") {
        if (normalized.fileName) {
          localStorage.setItem("userResumeName", normalized.fileName);
        }
        if (normalized.resumeId != null) {
          localStorage.setItem("activeResumeId", String(normalized.resumeId));
        }
        if (normalized.resumeVersionId != null || normalized.versionId != null) {
          localStorage.setItem(
            "activeResumeVersionId",
            String(normalized.resumeVersionId ?? normalized.versionId)
          );
        }
      }

      setSuccessMessage(
        (resultJson as ApiEnvelope<any>)?.message ||
          "Resume tailored successfully."
      );
    } catch (error: any) {
      console.error("Tailor resume error:", error);
      setErrorMessage(error?.message || "Failed to tailor resume from backend.");
    } finally {
      setTailoring(false);
    }
  };

  const goToResumePage = () => {
    router.push("/user/resume");
  };

  const goToTailoredVersion = () => {
    if (
      tailoredResume?.resumeId != null &&
      (tailoredResume?.resumeVersionId != null || tailoredResume?.versionId != null)
    ) {
      const targetResumeId = String(tailoredResume.resumeId);
      const targetVersionId = String(
        tailoredResume.resumeVersionId ?? tailoredResume.versionId
      );
      router.push(`/user/resume/${targetResumeId}/versions/${targetVersionId}`);
      return;
    }

    router.push("/user/resume");
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={goToResumePage}
              className="mb-4 inline-flex items-center gap-2 text-white/70 transition hover:text-white"
            >
              <ArrowLeft size={18} />
              Back to Resume Page
            </button>

            <h1 className="bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Tailor Resume
            </h1>

            <p className="mt-2 max-w-3xl text-white/60">
              Generate a job-specific tailored resume using the latest
              backend-integrated tailoring flow, including tool extraction,
              tool-answer submission, and final tailored version creation.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={fetchCurrentResume}
              disabled={loadingCurrentResume}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingCurrentResume ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Loading Resume...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Refresh Resume
                </>
              )}
            </button>

            <button
              onClick={handleTailorResume}
              disabled={tailoring || !hasJobContext}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {tailoring ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Tailoring...
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  Apply Tailoring
                </>
              )}
            </button>
          </div>
        </div>

        {backendHealthy !== null && (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              backendHealthy
                ? "border-green-500/30 bg-green-500/10 text-green-100"
                : "border-yellow-500/30 bg-yellow-500/10 text-yellow-100"
            }`}
          >
            {checkingBackend
              ? "Checking tailoring backend status..."
              : backendHealthy
              ? "Tailoring backend is reachable."
              : "Tailoring backend ping did not confirm availability. You can still try the tailoring flow."}
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
            <CheckCircle2 size={18} className="mt-0.5 text-green-300" />
            <p className="text-sm text-green-100">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <p className="text-sm text-red-100">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-5 flex items-center gap-3">
                <Briefcase className="text-indigo-300" />
                <h2 className="text-xl font-semibold">Target Job Details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Backend Developer"
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none transition focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. TechNova"
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none transition focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Job Description
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the complete job description here..."
                    className="h-44 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 outline-none transition focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Additional Instructions
                  </label>
                  <textarea
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Optional: emphasize Java, Spring Boot, microservices, leadership, ATS keywords, etc."
                    className="h-28 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 outline-none transition focus:border-indigo-400"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    onClick={handleExtractTools}
                    disabled={extractingTools || !hasJobContext}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {extractingTools ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Wrench size={18} />
                        Extract Tools
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleTailorResume}
                    disabled={tailoring || !hasJobContext}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {tailoring ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Tailoring...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Tailor Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <Target className="text-emerald-300" />
                <h2 className="text-xl font-semibold">Current Resume</h2>
              </div>

              {currentResume ? (
                <>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Resume Name</p>
                    <p className="text-sm font-semibold text-white/85">
                      {currentResume.resumeName ||
                        currentResume.fileName ||
                        "Current Resume"}
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Current ATS Score</p>
                    <p className="text-2xl font-bold text-emerald-300">
                      {currentResume.atsScore ?? 0}%
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-2 text-xs text-white/45">Parsed Resume Text</p>
                    <div className="max-h-56 overflow-y-auto">
                      <p className="whitespace-pre-wrap wrap-break-word text-sm text-white/70">
                        {currentResume.rawText || "No parsed content available."}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-sm text-white/55">
                  Load your current resume from backend before tailoring.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <CheckSquare className="text-purple-300" />
                <h2 className="text-xl font-semibold">Tool Knowledge Answers</h2>
              </div>

              {extractedTools.length > 0 ? (
                <div className="space-y-4">
                  {extractedTools.map((tool) => (
                    <div
                      key={tool.toolName}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white/90">
                            {tool.toolName}
                          </p>
                          <p className="mt-1 text-xs text-white/55">
                            {tool.question || `Describe your knowledge of ${tool.toolName}.`}
                          </p>
                        </div>

                        <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/70">
                          {tool.required === false ? "Optional" : "Required"}
                        </span>
                      </div>

                      {!!tool.description && (
                        <p className="mb-3 text-xs text-white/50">
                          {tool.description}
                        </p>
                      )}

                      <textarea
                        value={toolAnswers[tool.toolName] || ""}
                        onChange={(e) =>
                          setToolAnswers((prev) => ({
                            ...prev,
                            [tool.toolName]: e.target.value,
                          }))
                        }
                        placeholder={`Write your experience with ${tool.toolName}...`}
                        className="h-28 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 outline-none transition focus:border-indigo-400"
                      />
                    </div>
                  ))}

                  <button
                    onClick={handleSubmitToolAnswers}
                    disabled={submittingAnswers || !hasAllRequiredToolAnswers}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingAnswers ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Submitting Answers...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Submit Tool Answers
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-sm text-white/55">
                  Extract tools from the job description first. If the backend
                  identifies required tools, answer them here before applying tailoring.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 xl:col-span-7">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-purple-300" />
                  <h2 className="text-xl font-semibold">Tailored Resume Output</h2>
                </div>

                {tailoredResume &&
                  (tailoredResume.resumeVersionId != null ||
                    tailoredResume.versionId != null) && (
                    <div className="text-sm text-white/65">
                      Version:{" "}
                      <span className="font-semibold text-white/85">
                        {tailoredResume.resumeVersionId ?? tailoredResume.versionId}
                      </span>
                    </div>
                  )}
              </div>

              {tailoredResume ? (
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Tailored Resume Name</p>
                    <p className="text-sm font-semibold text-white/85">
                      {tailoredResume.versionName ||
                        tailoredResume.resumeName ||
                        tailoredResume.fileName ||
                        "Tailored Resume"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Tailored ATS Score</p>
                    <p className="text-2xl font-bold text-purple-300">
                      {tailoredResume.atsScore ?? 0}%
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Job Title</p>
                    <p className="text-sm font-semibold text-white/85">
                      {tailoredResume.jobTitle || jobTitle || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Company Name</p>
                    <p className="text-sm font-semibold text-white/85">
                      {tailoredResume.companyName || companyName || "N/A"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-5 text-sm text-white/55">
                  Your tailored resume preview will appear here after backend processing.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">Tailored Resume Preview</h2>

                {tailoredResume?.rawText && (
                  <button
                    onClick={goToTailoredVersion}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15"
                  >
                    <Eye size={16} />
                    View Version
                  </button>
                )}
              </div>

              <div className="mt-4 min-h-[420px] max-h-[620px] overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-4">
                {tailoredResume?.rawText ? (
                  <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-white/75">
                    {tailoredResume.rawText}
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-white/45">
                    No tailored resume generated yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Next Actions</h2>
                  <p className="mt-1 text-sm text-white/55">
                    Continue the tailoring flow, regenerate, or open the saved
                    tailored version inside your Resume Management System.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleTailorResume}
                    disabled={tailoring || !hasJobContext}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {tailoring ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Wand2 size={18} />
                        Regenerate
                      </>
                    )}
                  </button>

                  <button
                    onClick={goToTailoredVersion}
                    disabled={!tailoredResume?.rawText}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={18} />
                    Open Tailored Version
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}