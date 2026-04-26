"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Wand2,
  FileText,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Briefcase,
  Building2,
  Target,
  Download,
  Eye,
  Copy,
  BadgeCheck,
  HelpCircle,
  BrainCircuit,
} from "lucide-react";

/**
 * src/components/resume/TailorResumeForm.tsx
 *
 * Backend-integrated Tailor Resume Form
 *
 * Latest project-aligned implementation:
 * - aligned to the current resume tailoring module
 * - uses latest backend routes:
 *    POST /api/user/resume/tailor/extract-tools
 *    POST /api/user/resume/tailor/apply
 *    POST /api/user/resume/tailor/tool-answers
 *    GET  /api/user/resume/tailor/ping
 *
 * Optional preload:
 *    GET /api/user/resume/current
 *    GET /api/user/resume/{resumeId}
 *    GET /api/user/resume/{resumeId}/versions/{versionId}
 *
 * Supported request DTO alignment:
 * - ResumeTailorRequest
 * - ToolKnowledgeAnswerRequest
 * - ResumeTailorResponse
 * - ApiResponse wrapper
 *
 * Supported response envelopes:
 * - { success, message, data }
 * - { success, message, payload }
 * - { success, message, result }
 * - nested wrapper variations
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

export type TailorResumeResult = {
  resumeId?: number | string;
  id?: number | string;

  resumeVersionId?: number | string;
  versionId?: number | string;
  currentVersionId?: number | string;

  resumeName?: string;
  title?: string;
  versionName?: string;
  fileName?: string;
  originalFileName?: string;

  atsScore?: number | string;
  rawText?: string;
  versionCode?: string;
  versionType?: string;

  jobApplicationCode?: string | null;
  applicationCode?: string | null;

  previewUrl?: string;
  downloadUrl?: string;
  fileUrl?: string;

  updatedAt?: string;
  createdAt?: string;

  detectedTools?: string[] | null;
  requiredTools?: string[] | null;
  missingTools?: string[] | null;
  knownTools?: string[] | null;
  unknownTools?: string[] | null;
  toolQuestions?: Array<{
    toolName?: string;
    question?: string;
  }> | null;
};

type ResumeSourcePayload = {
  resumeId?: number | string;
  id?: number | string;
  resumeVersionId?: number | string;
  versionId?: number | string;
  currentVersionId?: number | string;
  resumeName?: string;
  title?: string;
  versionName?: string;
  fileName?: string;
  originalFileName?: string;
  rawText?: string;
  atsScore?: number | string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

type ExtractToolsResponse = {
  tools?: string[];
  detectedTools?: string[];
  requiredTools?: string[];
  missingTools?: string[];
  toolQuestions?: Array<{
    toolName?: string;
    question?: string;
  }>;
  needsToolAnswers?: boolean;
  requiresToolAnswers?: boolean;
};

type ToolAnswerItem = {
  toolName: string;
  answer: string;
  known?: boolean;
};

type TailorResumeFormProps = {
  resumeId?: string | number;
  versionId?: string | number;

  title?: string;
  subtitle?: string;
  className?: string;
  disabled?: boolean;

  autoLoadSource?: boolean;
  autoExtractToolsBeforeApply?: boolean;
  defaultCreateNewVersion?: boolean;
  defaultJobTitle?: string;
  defaultCompanyName?: string;
  defaultJobDescription?: string;
  defaultAdditionalInstructions?: string;
  defaultTargetVersionName?: string;

  showPreviewText?: boolean;
  showResultActions?: boolean;
  showToolStep?: boolean;

  onTailored?: (data: TailorResumeResult) => void;
  onDownload?: (data: TailorResumeResult) => void | Promise<void>;
  onPreview?: (data: TailorResumeResult) => void;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function normalizeRole(value?: string | null) {
  return (value || "").trim().toUpperCase();
}

function getStoredToken() {
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

function unwrapEnvelope<T>(input: unknown): T | null {
  if (!input || typeof input !== "object") return input as T | null;
  const obj = input as ApiEnvelope<T>;
  return (obj.data ?? obj.payload ?? obj.result ?? input) as T | null;
}

function extractMessage(input: unknown) {
  if (!input || typeof input !== "object") return null;

  const top = input as ApiEnvelope<unknown>;
  if (typeof top.message === "string" && top.message.trim()) {
    return top.message.trim();
  }

  const nested = unwrapEnvelope<any>(input);
  if (nested && typeof nested === "object") {
    if (typeof nested.message === "string" && nested.message.trim()) {
      return nested.message.trim();
    }
  }

  return null;
}

function extractPayload<T>(input: unknown): T | null {
  const first = unwrapEnvelope<T>(input);
  const second = unwrapEnvelope<T>(first);
  return second;
}

function toSafeNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
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

function resolveResumeId(
  data?: Partial<TailorResumeResult> | Partial<ResumeSourcePayload> | null
) {
  return data?.resumeId ?? data?.id;
}

function resolveVersionId(
  data?: Partial<TailorResumeResult> | Partial<ResumeSourcePayload> | null
) {
  return data?.resumeVersionId ?? data?.versionId ?? data?.currentVersionId;
}

function withAbsoluteUrl(url?: string) {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return `${API_BASE_URL}/${url}`;
}

function sanitizeTailorResult(data: TailorResumeResult): TailorResumeResult {
  const resumeId = resolveResumeId(data);
  const versionId = resolveVersionId(data);

  const previewUrl =
    data.previewUrl ||
    (resumeId && versionId
      ? `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/preview`
      : undefined);

  const downloadUrl =
    data.downloadUrl ||
    data.fileUrl ||
    (resumeId && versionId
      ? `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}/download`
      : undefined);

  return {
    ...data,
    atsScore: toSafeNumber(data.atsScore, 0),
    previewUrl: withAbsoluteUrl(previewUrl),
    downloadUrl: withAbsoluteUrl(downloadUrl),
  };
}

async function parseErrorMessage(response: Response) {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await response.json();
      const msg =
        extractMessage(json) ||
        (typeof (json as any)?.error === "string" ? (json as any).error : null) ||
        (typeof (json as any)?.details === "string"
          ? (json as any).details
          : null);

      if (msg) return msg;
    } else {
      const text = await response.text();
      if (text?.trim()) return text.trim();
    }
  } catch {
    // ignore
  }

  if (response.status === 400) return "Invalid tailoring request.";
  if (response.status === 401) return "You are not authenticated. Please log in again.";
  if (response.status === 403) return "You do not have permission to tailor this resume.";
  if (response.status === 404) return "The source resume/version was not found.";
  return `Request failed with status ${response.status}.`;
}

export default function TailorResumeForm({
  resumeId,
  versionId,
  title = "Tailor Resume",
  subtitle = "Create a tailored resume version based on a target job description.",
  className = "",
  disabled = false,
  autoLoadSource = true,
  autoExtractToolsBeforeApply = true,
  defaultCreateNewVersion = true,
  defaultJobTitle = "",
  defaultCompanyName = "",
  defaultJobDescription = "",
  defaultAdditionalInstructions = "",
  defaultTargetVersionName = "",
  showPreviewText = true,
  showResultActions = true,
  showToolStep = true,
  onTailored,
  onDownload,
  onPreview,
}: TailorResumeFormProps) {
  const [sourceName, setSourceName] = useState<string>("");
  const [sourceFileName, setSourceFileName] = useState<string>("");
  const [sourceLoading, setSourceLoading] = useState(autoLoadSource);

  const [jobTitle, setJobTitle] = useState(defaultJobTitle);
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [jobDescription, setJobDescription] = useState(defaultJobDescription);
  const [additionalInstructions, setAdditionalInstructions] = useState(
    defaultAdditionalInstructions
  );
  const [targetVersionName, setTargetVersionName] = useState(
    defaultTargetVersionName
  );
  const [createNewVersion, setCreateNewVersion] = useState(
    defaultCreateNewVersion
  );

  const [tailoring, setTailoring] = useState(false);
  const [extractingTools, setExtractingTools] = useState(false);
  const [submittingToolAnswers, setSubmittingToolAnswers] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [result, setResult] = useState<TailorResumeResult | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [detectedTools, setDetectedTools] = useState<string[]>([]);
  const [knownToolMap, setKnownToolMap] = useState<Record<string, boolean>>({});
  const [toolAnswerMap, setToolAnswerMap] = useState<Record<string, string>>({});
  const [toolStepReady, setToolStepReady] = useState(false);

  const token = getStoredToken();

  const role =
    typeof window !== "undefined"
      ? normalizeRole(localStorage.getItem("userRole"))
      : "";

  const commonHeaders = useMemo<HeadersInit>(
    () => ({
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const sourceGetEndpoint = useMemo(() => {
    if (resumeId && versionId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}/versions/${versionId}`;
    }

    if (resumeId) {
      return `${API_BASE_URL}/api/user/resume/${resumeId}`;
    }

    return `${API_BASE_URL}/api/user/resume/current`;
  }, [resumeId, versionId]);

  const pingEndpoint = `${API_BASE_URL}/api/user/resume/tailor/ping`;
  const extractToolsEndpoint = `${API_BASE_URL}/api/user/resume/tailor/extract-tools`;
  const applyTailorEndpoint = `${API_BASE_URL}/api/user/resume/tailor/apply`;
  const toolAnswersEndpoint = `${API_BASE_URL}/api/user/resume/tailor/tool-answers`;

  useEffect(() => {
    if (!autoLoadSource) return;

    const fetchSource = async () => {
      try {
        setSourceLoading(true);

        const response = await fetch(sourceGetEndpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await parseErrorMessage(response));
        }

        const json = await response.json();
        const data = extractPayload<ResumeSourcePayload>(json);

        if (data) {
          const sourceDisplayName =
            data.versionName || data.resumeName || data.title || "Current Resume";

          setSourceName(sourceDisplayName);
          setSourceFileName(data.fileName || data.originalFileName || "");

          if (!defaultTargetVersionName.trim()) {
            setTargetVersionName((current) => {
              if (current.trim()) return current;
              const titleSeed = defaultJobTitle || "Tailored";
              return `${sourceDisplayName} - ${titleSeed}`;
            });
          }
        }
      } catch (error) {
        console.error("TailorResumeForm source fetch error:", error);
      } finally {
        setSourceLoading(false);
      }
    };

    fetchSource();
  }, [
    autoLoadSource,
    sourceGetEndpoint,
    token,
    defaultJobTitle,
    defaultTargetVersionName,
  ]);

  const canSubmit = useMemo(() => {
    return (
      !disabled &&
      !tailoring &&
      !extractingTools &&
      jobDescription.trim().length > 0 &&
      jobTitle.trim().length > 0
    );
  }, [disabled, tailoring, extractingTools, jobDescription, jobTitle]);

  const buildBaseTailorPayload = () => {
    const resolvedVersionId = versionId ?? undefined;

    const knownTools = Object.entries(knownToolMap)
      .filter(([, isKnown]) => isKnown)
      .map(([tool]) => tool);

    const unknownTools = Object.entries(knownToolMap)
      .filter(([, isKnown]) => !isKnown)
      .map(([tool]) => tool);

    return {
      resumeVersionId: resolvedVersionId,
      companyName: companyName.trim(),
      jobTitle: jobTitle.trim(),
      jobDescription: jobDescription.trim(),
      additionalNotes: additionalInstructions.trim(),
      targetVersionName: targetVersionName.trim(),
      createNewVersion,
      knownTools,
      unknownTools,
    };
  };

  const persistResultHints = (data: TailorResumeResult) => {
    if (typeof window === "undefined") return;

    const resolvedResumeId = resolveResumeId(data);
    const resolvedVersionId = resolveVersionId(data);

    if (data.fileName || data.originalFileName) {
      localStorage.setItem(
        "userResumeName",
        data.fileName || data.originalFileName || ""
      );
    }

    if (resolvedResumeId !== undefined && resolvedResumeId !== null) {
      localStorage.setItem("currentResumeId", String(resolvedResumeId));
    }

    if (resolvedVersionId !== undefined && resolvedVersionId !== null) {
      localStorage.setItem("currentResumeVersionId", String(resolvedVersionId));
    }

    if (typeof data.atsScore !== "undefined") {
      localStorage.setItem(
        "currentResumeAtsScore",
        String(toSafeNumber(data.atsScore, 0))
      );
    }
  };

  const handleExtractTools = async () => {
    try {
      setExtractingTools(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!jobTitle.trim()) {
        throw new Error("Job title is required.");
      }

      if (!jobDescription.trim()) {
        throw new Error("Job description is required.");
      }

      const payload = buildBaseTailorPayload();

      const response = await fetch(extractToolsEndpoint, {
        method: "POST",
        headers: commonHeaders,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const json = await response.json();
      const extracted = extractPayload<ExtractToolsResponse>(json);

      const tools =
        extracted?.tools ||
        extracted?.detectedTools ||
        extracted?.requiredTools ||
        extracted?.missingTools ||
        [];

      const normalizedTools = Array.from(
        new Set(
          (Array.isArray(tools) ? tools : [])
            .map((tool) => String(tool || "").trim())
            .filter(Boolean)
        )
      );

      const nextKnownMap: Record<string, boolean> = {};
      const nextAnswerMap: Record<string, string> = {};

      normalizedTools.forEach((tool) => {
        nextKnownMap[tool] = true;
        nextAnswerMap[tool] = "";
      });

      setDetectedTools(normalizedTools);
      setKnownToolMap(nextKnownMap);
      setToolAnswerMap(nextAnswerMap);
      setToolStepReady(normalizedTools.length > 0);

      if (normalizedTools.length > 0) {
        setSuccessMessage(
          extractMessage(json) || "Required tools extracted successfully."
        );
      } else {
        setSuccessMessage(
          extractMessage(json) || "No specific tool questions were detected."
        );
      }
    } catch (error: any) {
      console.error("TailorResumeForm extract tools error:", error);
      setErrorMessage(error?.message || "Failed to extract tools.");
    } finally {
      setExtractingTools(false);
    }
  };

  const handleSubmitToolAnswers = async () => {
    if (!detectedTools.length) return;

    try {
      setSubmittingToolAnswers(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const toolAnswers: ToolAnswerItem[] = detectedTools.map((toolName) => ({
        toolName,
        answer: (toolAnswerMap[toolName] || "").trim(),
        known: Boolean(knownToolMap[toolName]),
      }));

      const payload = {
        resumeVersionId: versionId ?? undefined,
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        jobDescription: jobDescription.trim(),
        toolAnswers,
      };

      const response = await fetch(toolAnswersEndpoint, {
        method: "POST",
        headers: commonHeaders,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const json = await response.json();
      setSuccessMessage(
        extractMessage(json) || "Tool knowledge answers submitted successfully."
      );
    } catch (error: any) {
      console.error("TailorResumeForm tool answers error:", error);
      setErrorMessage(error?.message || "Failed to submit tool answers.");
    } finally {
      setSubmittingToolAnswers(false);
    }
  };

  const handleTailor = async () => {
    try {
      setTailoring(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (role && role !== "USER" && role !== "ROLE_USER") {
        throw new Error("Only user accounts can use resume tailoring.");
      }

      if (!jobTitle.trim()) {
        throw new Error("Job title is required.");
      }

      if (!jobDescription.trim()) {
        throw new Error("Job description is required.");
      }

      // ping endpoint first to align with tailoring module readiness
      try {
        await fetch(pingEndpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          cache: "no-store",
        });
      } catch {
        // non-blocking ping
      }

      if (showToolStep && autoExtractToolsBeforeApply && !toolStepReady) {
        await handleExtractTools();
      }

      const payload = buildBaseTailorPayload();

      const response = await fetch(applyTailorEndpoint, {
        method: "POST",
        headers: commonHeaders,
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const json = await response.json();
      const responseData = extractPayload<TailorResumeResult>(json);

      if (!responseData) {
        throw new Error(extractMessage(json) || "Failed to tailor resume.");
      }

      const sanitized = sanitizeTailorResult(responseData);

      setResult(sanitized);
      setSuccessMessage(extractMessage(json) || "Resume tailored successfully.");
      persistResultHints(sanitized);

      onTailored?.(sanitized);
    } catch (error: any) {
      console.error("TailorResumeForm tailor error:", error);
      setErrorMessage(error?.message || "Failed to tailor resume.");
    } finally {
      setTailoring(false);
    }
  };

  const handlePreview = () => {
    if (!result) return;

    if (onPreview) {
      onPreview(result);
      return;
    }

    if (result.previewUrl && typeof window !== "undefined") {
      window.open(result.previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = async () => {
    if (!result || downloading) return;

    if (onDownload) {
      await onDownload(result);
      return;
    }

    if (!result.downloadUrl) return;

    try {
      setDownloading(true);

      const response = await fetch(result.downloadUrl, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download =
        result.fileName || result.originalFileName || "tailored-resume.pdf";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("TailorResumeForm download error:", error);
      setErrorMessage(error?.message || "Failed to download tailored resume.");
    } finally {
      setDownloading(false);
    }
  };

  const handleUseSuggestedName = () => {
    const generated = `${jobTitle.trim() || "Tailored"}${
      companyName.trim() ? ` - ${companyName.trim()}` : ""
    } Resume`;
    setTargetVersionName(generated);
  };

  const handleFillDemo = () => {
    setJobTitle("Backend Developer");
    setCompanyName("TechNova");
    setJobDescription(
      "We are looking for a Backend Developer with strong experience in Java, Spring Boot, REST APIs, MySQL, JPA/Hibernate, microservices, and scalable backend architecture. The ideal candidate should collaborate with frontend teams, optimize API performance, and contribute to modular backend systems."
    );
    setAdditionalInstructions(
      "Focus on Spring Boot, REST API design, MySQL, layered backend architecture, resume versioning, and backend-integrated frontend collaboration."
    );
    setTargetVersionName("Backend Developer - TechNova Resume");
  };

  const handleReset = () => {
    setJobTitle("");
    setCompanyName("");
    setJobDescription("");
    setAdditionalInstructions("");
    setTargetVersionName("");
    setResult(null);
    setSuccessMessage(null);
    setErrorMessage(null);
    setDetectedTools([]);
    setKnownToolMap({});
    setToolAnswerMap({});
    setToolStepReady(false);
  };

  const resolvedOpenVersionResumeId = resolveResumeId(result);
  const resolvedOpenVersionId = resolveVersionId(result);

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl",
        className
      )}
    >
      <div className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Wand2 size={20} />
            </div>

            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-white/55">{subtitle}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {sourceLoading ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                    <Loader2 size={12} className="animate-spin" />
                    Loading source...
                  </span>
                ) : (
                  sourceName && (
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                      Source: {sourceName}
                    </span>
                  )
                )}

                {sourceFileName && (
                  <span className="rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-100">
                    {sourceFileName}
                  </span>
                )}

                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  <BadgeCheck size={12} />
                  Tailoring module aligned
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleFillDemo}
              disabled={disabled || tailoring || extractingTools}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              <Sparkles size={16} />
              Demo Fill
            </button>

            <button
              type="button"
              onClick={handleUseSuggestedName}
              disabled={disabled || tailoring || extractingTools}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              <Copy size={16} />
              Suggest Name
            </button>
          </div>
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

        <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-7">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
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
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      disabled={disabled || tailoring || extractingTools}
                      placeholder="e.g. Backend Developer"
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
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled={disabled || tailoring || extractingTools}
                      placeholder="e.g. TechNova"
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm text-white/70">
                  Target Version Name
                </label>
                <div className="relative">
                  <Target
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <input
                    type="text"
                    value={targetVersionName}
                    onChange={(e) => setTargetVersionName(e.target.value)}
                    disabled={disabled || tailoring || extractingTools}
                    placeholder="e.g. Backend Developer Tailored Resume"
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm text-white/70">
                  Job Description
                </label>
                <div className="relative">
                  <FileText
                    size={16}
                    className="absolute left-4 top-4 text-white/40"
                  />
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    disabled={disabled || tailoring || extractingTools}
                    placeholder="Paste the complete job description here..."
                    className="min-h-55 w-full resize-y rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm text-white/70">
                  Additional Instructions
                </label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  disabled={disabled || tailoring || extractingTools}
                  placeholder="Optional guidance. Example: emphasize Spring Boot, REST APIs, MySQL, resume management project, and backend architecture..."
                  className="min-h-30 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                />
              </div>

              <div className="mt-4">
                <label className="inline-flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={createNewVersion}
                    onChange={(e) => setCreateNewVersion(e.target.checked)}
                    disabled={disabled || tailoring || extractingTools}
                    className="accent-indigo-500"
                  />
                  Create a new tailored version
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {showToolStep && (
                  <button
                    type="button"
                    onClick={handleExtractTools}
                    disabled={!jobTitle.trim() || !jobDescription.trim() || disabled || tailoring || extractingTools}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:opacity-50"
                  >
                    {extractingTools ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Extracting Tools...
                      </>
                    ) : (
                      <>
                        <BrainCircuit size={18} />
                        Extract Tools
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleTailor}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-95 disabled:opacity-50"
                >
                  {tailoring ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Tailoring...
                    </>
                  ) : (
                    <>
                      <Wand2 size={18} />
                      Tailor Resume
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={disabled || tailoring || extractingTools}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:opacity-50"
                >
                  <RefreshCw size={18} />
                  Reset
                </button>
              </div>
            </div>

            {showToolStep && toolStepReady && detectedTools.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <HelpCircle size={18} className="text-indigo-300" />
                  <h3 className="text-base font-semibold">Tool Knowledge Step</h3>
                </div>

                <p className="mb-4 text-sm text-white/60">
                  Mark whether you know the extracted tools and optionally provide short context for your familiarity.
                </p>

                <div className="space-y-4">
                  {detectedTools.map((tool) => (
                    <div
                      key={tool}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-white/90">{tool}</p>
                          <p className="text-xs text-white/50">
                            Used by the tailoring flow for tool-aware optimization
                          </p>
                        </div>

                        <label className="inline-flex items-center gap-2 text-sm text-white/80">
                          <input
                            type="checkbox"
                            checked={Boolean(knownToolMap[tool])}
                            onChange={(e) =>
                              setKnownToolMap((prev) => ({
                                ...prev,
                                [tool]: e.target.checked,
                              }))
                            }
                            className="accent-indigo-500"
                          />
                          I know this tool
                        </label>
                      </div>

                      <textarea
                        value={toolAnswerMap[tool] || ""}
                        onChange={(e) =>
                          setToolAnswerMap((prev) => ({
                            ...prev,
                            [tool]: e.target.value,
                          }))
                        }
                        placeholder={`Optional note about your experience with ${tool}...`}
                        className="mt-3 min-h-[88px] w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleSubmitToolAnswers}
                    disabled={submittingToolAnswers}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
                  >
                    {submittingToolAnswers ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Submitting Answers...
                      </>
                    ) : (
                      <>
                        <BadgeCheck size={16} />
                        Submit Tool Answers
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5 xl:col-span-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <h3 className="mb-4 text-base font-semibold">Tailoring Result</h3>

              {!result ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                  <Wand2 className="mx-auto text-white/35" size={26} />
                  <p className="mt-3 font-medium text-white/70">
                    No tailored resume yet
                  </p>
                  <p className="mt-1 text-sm text-white/45">
                    Submit the form to generate a tailored version from backend.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-1 text-xs text-white/45">Version Name</p>
                      <p className="wrap-break-word text-sm font-semibold text-white/85">
                        {result.versionName || "N/A"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-1 text-xs text-white/45">ATS Score</p>
                      <p className="text-lg font-bold text-emerald-300">
                        {toSafeNumber(result.atsScore, 0)}%
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-1 text-xs text-white/45">Version Type</p>
                      <p className="text-sm font-semibold text-white/85">
                        {result.versionType || "N/A"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <p className="mb-1 text-xs text-white/45">Version Code</p>
                      <p className="text-sm font-semibold text-white/85">
                        {result.versionCode || "N/A"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                      <p className="mb-1 text-xs text-white/45">Updated At</p>
                      <p className="text-sm font-semibold text-white/85">
                        {formatDateTime(result.updatedAt || result.createdAt)}
                      </p>
                    </div>

                    {(result.jobApplicationCode || result.applicationCode) && (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
                        <p className="mb-1 text-xs text-white/45">
                          Job Application Code
                        </p>
                        <p className="wrap-break-word text-sm font-semibold text-white/85">
                          {result.jobApplicationCode || result.applicationCode}
                        </p>
                      </div>
                    )}
                  </div>

                  {showResultActions && (
                    <div className="flex flex-wrap gap-3">
                      {result.previewUrl && (
                        <button
                          type="button"
                          onClick={handlePreview}
                          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
                        >
                          <Eye size={16} />
                          Preview
                        </button>
                      )}

                      {result.downloadUrl && (
                        <button
                          type="button"
                          onClick={handleDownload}
                          disabled={downloading}
                          className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-4 py-2.5 font-semibold transition hover:opacity-95 disabled:opacity-50"
                        >
                          {downloading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download size={16} />
                              Download
                            </>
                          )}
                        </button>
                      )}

                      {resolvedOpenVersionResumeId && resolvedOpenVersionId && (
                        <Link
                          href={`/user/resume/${resolvedOpenVersionResumeId}/versions/${resolvedOpenVersionId}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15"
                        >
                          <BadgeCheck size={16} />
                          Open Version
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {showPreviewText && result?.rawText && (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <h3 className="mb-3 text-base font-semibold">Tailored Preview</h3>
                <div className="max-h-105 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-4">
                  <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-white/70">
                    {result.rawText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}