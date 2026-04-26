"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  BookOpen,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Target,
  Code2,
  BrainCircuit,
  BadgeCheck,
} from "lucide-react";

/**
 * src/components/resume/ToolKnowledgeForm.tsx
 *
 * Backend-integrated Tool Knowledge Form
 *
 * Latest project-aligned version:
 * - aligned with resume tailoring module and backend-integrated frontend ideology
 * - can be used for manual tool knowledge entry/editing
 * - can preload extracted tools from the tailoring flow
 * - supports resilient backend envelope parsing (data / payload / result)
 * - supports current-user and resume-scoped endpoints
 *
 * Supported backend patterns:
 *
 * A) Current user tool knowledge
 *    GET  /api/user/tool-knowledge
 *    POST /api/user/tool-knowledge
 *    PUT  /api/user/tool-knowledge
 *
 * B) Resume scoped tool knowledge (optional extension)
 *    GET  /api/user/resume/{resumeId}/tool-knowledge
 *    POST /api/user/resume/{resumeId}/tool-knowledge
 *    PUT  /api/user/resume/{resumeId}/tool-knowledge
 *
 * C) Tailoring flow integration
 *    POST /api/user/resume/tailor/extract-tools
 *    POST /api/user/resume/tailor/tool-answers
 *
 * Supported response envelopes:
 * {
 *   success: true,
 *   message: "...",
 *   data: { items: [...] }
 * }
 * or payload/result equivalents
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

export type ToolKnowledgeItem = {
  id?: number | string;
  toolName: string;
  category?: string;
  proficiency?: string;
  experienceLevel?: string;
  lastUsed?: string;
  notes?: string;
  isPrimary?: boolean;
  known?: boolean;
};

type ToolKnowledgeDataEnvelope = {
  items?: ToolKnowledgeItem[];
  updatedAt?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

type ExtractToolsPayload = {
  tools?: string[];
  detectedTools?: string[];
  requiredTools?: string[];
  missingTools?: string[];
  toolQuestions?: Array<{
    toolName?: string;
    question?: string;
  }>;
};

type ToolKnowledgeFormProps = {
  resumeId?: string | number;
  versionId?: string | number;

  title?: string;
  subtitle?: string;
  className?: string;
  disabled?: boolean;
  autoFetch?: boolean;
  searchable?: boolean;

  /**
   * Tailoring-related optional helpers
   */
  enableTailorToolImport?: boolean;
  defaultJobTitle?: string;
  defaultCompanyName?: string;
  defaultJobDescription?: string;

  onLoaded?: (items: ToolKnowledgeItem[]) => void;
  onSaved?: (items: ToolKnowledgeItem[]) => void;
  onSubmittedToTailorFlow?: (items: ToolKnowledgeItem[]) => void;
};

const PROFICIENCY_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
] as const;

const TOOL_CATEGORIES = [
  "Programming Language",
  "Framework",
  "Library",
  "Database",
  "Cloud",
  "DevOps",
  "Testing",
  "Design",
  "Analytics",
  "AI/ML",
  "IDE/Editor",
  "Version Control",
  "Other",
] as const;

const emptyToolItem = (): ToolKnowledgeItem => ({
  toolName: "",
  category: "",
  proficiency: "",
  experienceLevel: "",
  lastUsed: "",
  notes: "",
  isPrimary: false,
  known: true,
});

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

function formatDateTime(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

  if (response.status === 400) return "Invalid tool knowledge request.";
  if (response.status === 401) return "You are not authenticated. Please log in again.";
  if (response.status === 403) return "You do not have permission to access tool knowledge.";
  if (response.status === 404) return "Tool knowledge resource was not found.";
  return `Request failed with status ${response.status}.`;
}

export default function ToolKnowledgeForm({
  resumeId,
  versionId,
  title = "Tool Knowledge",
  subtitle = "Manage tools, technologies, and platforms you know using backend integration.",
  className = "",
  disabled = false,
  autoFetch = true,
  searchable = true,
  enableTailorToolImport = true,
  defaultJobTitle = "",
  defaultCompanyName = "",
  defaultJobDescription = "",
  onLoaded,
  onSaved,
  onSubmittedToTailorFlow,
}: ToolKnowledgeFormProps) {
  const [items, setItems] = useState<ToolKnowledgeItem[]>([emptyToolItem()]);
  const [savedItems, setSavedItems] = useState<ToolKnowledgeItem[]>([
    emptyToolItem(),
  ]);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extractingTools, setExtractingTools] = useState(false);
  const [submittingToolAnswers, setSubmittingToolAnswers] = useState(false);

  const [search, setSearch] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [jobTitle, setJobTitle] = useState(defaultJobTitle);
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [jobDescription, setJobDescription] = useState(defaultJobDescription);

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

  const endpoints = useMemo(() => {
    if (resumeId) {
      return {
        get: `${API_BASE_URL}/api/user/resume/${resumeId}/tool-knowledge`,
        save: `${API_BASE_URL}/api/user/resume/${resumeId}/tool-knowledge`,
      };
    }

    return {
      get: `${API_BASE_URL}/api/user/tool-knowledge`,
      save: `${API_BASE_URL}/api/user/tool-knowledge`,
    };
  }, [resumeId]);

  const tailorEndpoints = useMemo(
    () => ({
      extractTools: `${API_BASE_URL}/api/user/resume/tailor/extract-tools`,
      toolAnswers: `${API_BASE_URL}/api/user/resume/tailor/tool-answers`,
    }),
    []
  );

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(items) !== JSON.stringify(savedItems),
    [items, savedItems]
  );

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();

    return items.filter((item) =>
      [
        item.toolName,
        item.category,
        item.proficiency,
        item.experienceLevel,
        item.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const hydrateItems = (toolItems?: ToolKnowledgeItem[], updated?: string) => {
    const normalized =
      toolItems && toolItems.length > 0
        ? toolItems.map((item) => ({
            ...emptyToolItem(),
            ...item,
            known: item.known ?? true,
          }))
        : [emptyToolItem()];

    setItems(normalized);
    setSavedItems(normalized);
    setUpdatedAt(updated);
    onLoaded?.(normalized);
  };

  const fetchToolKnowledge = async (isRefresh = false) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(endpoints.get, {
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
      const data = extractPayload<ToolKnowledgeDataEnvelope>(json);

      hydrateItems(data?.items, data?.updatedAt);
    } catch (error: any) {
      console.error("ToolKnowledgeForm fetch error:", error);
      setErrorMessage(
        error?.message || "Unable to load tool knowledge from backend."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!autoFetch) return;
    fetchToolKnowledge();
  }, [autoFetch, endpoints.get]);

  const updateItem = (
    index: number,
    field: keyof ToolKnowledgeItem,
    value: string | boolean
  ) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyToolItem()]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => {
      if (prev.length === 1) return [emptyToolItem()];
      return prev.filter((_, i) => i !== index);
    });
  };

  const resetChanges = () => {
    const restored = savedItems.length > 0 ? savedItems : [emptyToolItem()];
    setItems(restored);
    setErrorMessage(null);
    setSuccessMessage("Tool knowledge reset to last saved state.");
  };

  const validateItems = () => {
    for (const item of items) {
      const hasAnyValue =
        item.toolName?.trim() ||
        item.category?.trim() ||
        item.proficiency?.trim() ||
        item.experienceLevel?.trim() ||
        item.lastUsed?.trim() ||
        item.notes?.trim();

      if (!hasAnyValue) continue;

      if (!item.toolName?.trim()) {
        setErrorMessage("Tool name is required for each filled entry.");
        return false;
      }
    }
    return true;
  };

  const buildPersistableItems = () => {
    return items
      .filter((item) => {
        return (
          item.toolName?.trim() ||
          item.category?.trim() ||
          item.proficiency?.trim() ||
          item.experienceLevel?.trim() ||
          item.lastUsed?.trim() ||
          item.notes?.trim()
        );
      })
      .map((item) => ({
        id: item.id,
        toolName: item.toolName?.trim() || "",
        category: item.category?.trim() || "",
        proficiency: item.proficiency?.trim() || "",
        experienceLevel: item.experienceLevel?.trim() || "",
        lastUsed: item.lastUsed?.trim() || "",
        notes: item.notes?.trim() || "",
        isPrimary: !!item.isPrimary,
        known: item.known ?? true,
      }));
  };

  const handleSave = async () => {
    if (!validateItems()) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (role && role !== "USER" && role !== "ROLE_USER") {
        throw new Error("Only user accounts can manage tool knowledge here.");
      }

      const payloadItems = buildPersistableItems();
      const method = savedItems.some((i) => i.id) ? "PUT" : "POST";

      const response = await fetch(endpoints.save, {
        method,
        headers: commonHeaders,
        credentials: "include",
        body: JSON.stringify({
          items: payloadItems,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const json = await response.json();
      const data = extractPayload<ToolKnowledgeDataEnvelope>(json);

      const saved =
        data?.items && data.items.length > 0
          ? data.items.map((item) => ({
              ...emptyToolItem(),
              ...item,
              known: item.known ?? true,
            }))
          : payloadItems.length > 0
            ? payloadItems
            : [emptyToolItem()];

      setItems(saved);
      setSavedItems(saved);
      setUpdatedAt(data?.updatedAt);
      setSuccessMessage(extractMessage(json) || "Tool knowledge saved successfully.");
      onSaved?.(saved);
    } catch (error: any) {
      console.error("ToolKnowledgeForm save error:", error);
      setErrorMessage(error?.message || "Failed to save tool knowledge.");
    } finally {
      setSaving(false);
    }
  };

  const handleExtractToolsFromJobDescription = async () => {
    try {
      setExtractingTools(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!jobTitle.trim()) {
        throw new Error("Job title is required to extract tools.");
      }

      if (!jobDescription.trim()) {
        throw new Error("Job description is required to extract tools.");
      }

      const response = await fetch(tailorEndpoints.extractTools, {
        method: "POST",
        headers: commonHeaders,
        credentials: "include",
        body: JSON.stringify({
          resumeVersionId: versionId ?? undefined,
          companyName: companyName.trim(),
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const json = await response.json();
      const data = extractPayload<ExtractToolsPayload>(json);

      const extractedTools = Array.from(
        new Set(
          (
            data?.tools ||
            data?.detectedTools ||
            data?.requiredTools ||
            data?.missingTools ||
            []
          )
            .map((tool) => String(tool || "").trim())
            .filter(Boolean)
        )
      );

      if (!extractedTools.length) {
        setSuccessMessage(
          extractMessage(json) || "No tools were detected from the job description."
        );
        return;
      }

      setItems((prev) => {
        const existingNames = new Set(
          prev.map((item) => item.toolName.trim().toLowerCase()).filter(Boolean)
        );

        const appended = extractedTools
          .filter((tool) => !existingNames.has(tool.toLowerCase()))
          .map((tool) => ({
            ...emptyToolItem(),
            toolName: tool,
            category: "Other",
            known: true,
          }));

        const base =
          prev.length === 1 && !prev[0].toolName.trim()
            ? []
            : prev;

        return [...base, ...appended].length > 0
          ? [...base, ...appended]
          : [emptyToolItem()];
      });

      setSuccessMessage(
        extractMessage(json) || "Tools imported successfully from job description."
      );
    } catch (error: any) {
      console.error("ToolKnowledgeForm extract tools error:", error);
      setErrorMessage(error?.message || "Failed to extract tools.");
    } finally {
      setExtractingTools(false);
    }
  };

  const handleSubmitToTailorFlow = async () => {
    try {
      setSubmittingToolAnswers(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (!jobTitle.trim()) {
        throw new Error("Job title is required.");
      }

      if (!jobDescription.trim()) {
        throw new Error("Job description is required.");
      }

      const usableItems = buildPersistableItems();

      if (!usableItems.length) {
        throw new Error("Add at least one tool entry before submitting.");
      }

      const toolAnswers = usableItems.map((item) => ({
        toolName: item.toolName,
        answer:
          item.notes?.trim() ||
          `${item.proficiency || "Known"}${item.experienceLevel ? ` • ${item.experienceLevel}` : ""}`,
        known: item.known ?? true,
      }));

      const response = await fetch(tailorEndpoints.toolAnswers, {
        method: "POST",
        headers: commonHeaders,
        credentials: "include",
        body: JSON.stringify({
          resumeVersionId: versionId ?? undefined,
          companyName: companyName.trim(),
          jobTitle: jobTitle.trim(),
          jobDescription: jobDescription.trim(),
          toolAnswers,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const json = await response.json();

      setSuccessMessage(
        extractMessage(json) || "Tool knowledge submitted to tailoring flow successfully."
      );
      onSubmittedToTailorFlow?.(usableItems);
    } catch (error: any) {
      console.error("ToolKnowledgeForm tool answers error:", error);
      setErrorMessage(
        error?.message || "Failed to submit tool knowledge to tailoring flow."
      );
    } finally {
      setSubmittingToolAnswers(false);
    }
  };

  const fillDemo = () => {
    setItems([
      {
        toolName: "Spring Boot",
        category: "Framework",
        proficiency: "Advanced",
        experienceLevel: "2 years",
        lastUsed: "2026-03",
        notes: "Built REST APIs, auth flow, resume module, and tailoring integration.",
        isPrimary: true,
        known: true,
      },
      {
        toolName: "MySQL",
        category: "Database",
        proficiency: "Advanced",
        experienceLevel: "2 years",
        lastUsed: "2026-03",
        notes: "Used with JPA/Hibernate and versioned resume storage.",
        isPrimary: true,
        known: true,
      },
      {
        toolName: "Docker",
        category: "DevOps",
        proficiency: "Intermediate",
        experienceLevel: "6 months",
        lastUsed: "2026-02",
        notes: "Basic containerization for backend services.",
        isPrimary: false,
        known: true,
      },
    ]);
  };

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
              <Wrench size={20} />
            </div>

            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-white/55">{subtitle}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <p className="text-xs text-white/45">
                  Last updated: {formatDateTime(updatedAt)}
                </p>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  <BadgeCheck size={12} />
                  Tailoring-ready
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fetchToolKnowledge(true)}
              disabled={disabled || loading || refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh
            </button>

            <button
              type="button"
              onClick={fillDemo}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              <Sparkles size={16} />
              Demo Fill
            </button>

            <button
              type="button"
              onClick={addItem}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              <Plus size={16} />
              Add Tool
            </button>
          </div>
        </div>

        {enableTailorToolImport && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="mb-4 flex items-center gap-2">
              <BrainCircuit size={18} className="text-indigo-300" />
              <h3 className="text-base font-semibold">Tailoring Integration</h3>
            </div>

            <p className="mb-4 text-sm text-white/60">
              Import tools from a job description and optionally submit your tool knowledge into the resume tailoring flow.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Job title"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400"
              />

              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company name"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleExtractToolsFromJobDescription}
                  disabled={extractingTools || disabled}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
                >
                  {extractingTools ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <BrainCircuit size={16} />
                      Extract Tools
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSubmitToTailorFlow}
                  disabled={submittingToolAnswers || disabled}
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-4 py-2.5 font-semibold transition hover:opacity-95 disabled:opacity-50"
                >
                  {submittingToolAnswers ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <BadgeCheck size={16} />
                      Submit to Tailor Flow
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste job description here for tool extraction..."
                className="min-h-30 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400"
              />
            </div>
          </div>
        )}

        {searchable && (
          <div className="mt-5">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tool knowledge..."
                className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
              />
            </div>
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
          <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
            <Loader2 className="animate-spin text-indigo-300" size={28} />
            <p className="text-sm text-white/60">Loading tool knowledge...</p>
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-5">
              {filteredItems.map((item, visibleIndex) => {
                const actualIndex = items.indexOf(item);

                return (
                  <div
                    key={item.id ?? `${item.toolName}-${visibleIndex}`}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-300" />
                        <h3 className="text-base font-semibold">
                          Tool Entry {visibleIndex + 1}
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(actualIndex)}
                        disabled={disabled}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/15 px-3 py-2 text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm text-white/70">
                          Tool Name
                        </label>
                        <div className="relative">
                          <Code2
                            size={16}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                          />
                          <input
                            type="text"
                            value={item.toolName || ""}
                            onChange={(e) =>
                              updateItem(actualIndex, "toolName", e.target.value)
                            }
                            disabled={disabled}
                            placeholder="e.g. Spring Boot"
                            className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/70">
                          Category
                        </label>
                        <div className="relative">
                          <BookOpen
                            size={16}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                          />
                          <input
                            list={`tool-categories-${actualIndex}`}
                            value={item.category || ""}
                            onChange={(e) =>
                              updateItem(actualIndex, "category", e.target.value)
                            }
                            disabled={disabled}
                            placeholder="e.g. Framework"
                            className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                          />
                          <datalist id={`tool-categories-${actualIndex}`}>
                            {TOOL_CATEGORIES.map((category) => (
                              <option key={category} value={category} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/70">
                          Proficiency
                        </label>
                        <select
                          value={item.proficiency || ""}
                          onChange={(e) =>
                            updateItem(actualIndex, "proficiency", e.target.value)
                          }
                          disabled={disabled}
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                        >
                          <option value="" className="bg-slate-900">
                            Select proficiency
                          </option>
                          {PROFICIENCY_LEVELS.map((level) => (
                            <option key={level} value={level} className="bg-slate-900">
                              {level}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/70">
                          Experience Level
                        </label>
                        <input
                          type="text"
                          value={item.experienceLevel || ""}
                          onChange={(e) =>
                            updateItem(actualIndex, "experienceLevel", e.target.value)
                          }
                          disabled={disabled}
                          placeholder="e.g. 2 years / 6 months"
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/70">
                          Last Used
                        </label>
                        <input
                          type="month"
                          value={item.lastUsed || ""}
                          onChange={(e) =>
                            updateItem(actualIndex, "lastUsed", e.target.value)
                          }
                          disabled={disabled}
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                        />
                      </div>

                      <div className="flex items-end gap-6">
                        <label className="inline-flex items-center gap-2 text-sm text-white/80">
                          <input
                            type="checkbox"
                            checked={!!item.isPrimary}
                            onChange={(e) =>
                              updateItem(actualIndex, "isPrimary", e.target.checked)
                            }
                            disabled={disabled}
                            className="accent-indigo-500"
                          />
                          Primary Tool
                        </label>

                        <label className="inline-flex items-center gap-2 text-sm text-white/80">
                          <input
                            type="checkbox"
                            checked={item.known ?? true}
                            onChange={(e) =>
                              updateItem(actualIndex, "known", e.target.checked)
                            }
                            disabled={disabled}
                            className="accent-indigo-500"
                          />
                          I know this tool
                        </label>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm text-white/70">
                        Notes
                      </label>
                      <div className="relative">
                        <Target
                          size={16}
                          className="absolute left-4 top-4 text-white/40"
                        />
                        <textarea
                          value={item.notes || ""}
                          onChange={(e) =>
                            updateItem(actualIndex, "notes", e.target.value)
                          }
                          disabled={disabled}
                          placeholder="Describe projects, strengths, use cases, or special knowledge..."
                          className="min-h-30 w-full resize-y rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-white/50">
                {hasUnsavedChanges
                  ? "You have unsaved changes."
                  : "All changes are saved."}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetChanges}
                  disabled={disabled || !hasUnsavedChanges}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={disabled || saving || !hasUnsavedChanges}
                  className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-4 py-2.5 font-semibold transition hover:opacity-95 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Tool Knowledge
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}