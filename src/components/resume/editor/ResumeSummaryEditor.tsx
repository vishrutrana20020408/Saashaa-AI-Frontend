"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlignLeft,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from "lucide-react";

/**
 * ResumeSummaryEditor.tsx
 *
 * Backend Integrated Resume Summary Editor
 *
 * Supported flows:
 * - Current resume summary
 * - Resume summary by resumeId
 * - Resume version summary by resumeId + versionId
 *
 * Architecture aligned with latest project update:
 * - backend-first
 * - supports ApiResponse wrappers (data / payload / result)
 * - credentials: "include"
 * - bearer token fallback
 * - resilient endpoint fallback
 * - user/admin compatible fetch/save strategy
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type GenericObject = Record<string, unknown>;

type SummaryPayload = {
  summary?: string;
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

type ResumeSummaryEditorProps = {
  resumeId?: string | number;
  versionId?: string | number;
  autoFetch?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  minHeightClassName?: string;
  onLoaded?: (summary: string) => void;
  onSaved?: (summary: string) => void;
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

function extractSummaryPayload(input: unknown): {
  summary: string;
  updatedAt?: string;
} {
  const payload = unwrapPayload<SummaryPayload | GenericObject>(input);
  const root = payload && typeof payload === "object" ? (payload as GenericObject) : {};

  return {
    summary: readString(root.summary, root.content, root.value, root.text) || "",
    updatedAt: readString(root.updatedAt, root.updated_at),
  };
}

export default function ResumeSummaryEditor({
  resumeId,
  versionId,
  autoFetch = true,
  title = "Summary Editor",
  subtitle = "Manage your resume summary with backend integration.",
  className = "",
  disabled = false,
  placeholder = "Write a strong professional summary for your resume...",
  minHeightClassName = "min-h-[240px]",
  onLoaded,
  onSaved,
}: ResumeSummaryEditorProps) {
  const [summary, setSummary] = useState("");
  const [savedSummary, setSavedSummary] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
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

  const endpointCandidates = useMemo(() => {
    const rid =
      resumeId !== undefined && resumeId !== null ? String(resumeId) : undefined;
    const vid =
      versionId !== undefined && versionId !== null ? String(versionId) : undefined;

    const get: string[] = [];
    const save: string[] = [];

    if (rid && vid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/summary`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/summary`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/summary`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/summary`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/summary`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/summary`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/summary`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/summary`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/summary`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/summary`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/summary`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/summary`
      );
    } else if (rid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/summary`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/summary`,
        `${API_BASE_URL}/api/admin/resume/${rid}/summary`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/summary`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/summary`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/summary`,
        `${API_BASE_URL}/api/admin/resume/${rid}/summary`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/summary`
      );
    } else {
      get.push(
        `${API_BASE_URL}/api/user/resume/current/summary`,
        `${API_BASE_URL}/api/user/resume/latest/summary`,
        `${API_BASE_URL}/api/admin/resume/current/summary`,
        `${API_BASE_URL}/api/admin/resume/latest/summary`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/current/summary`,
        `${API_BASE_URL}/api/user/resume/latest/summary`,
        `${API_BASE_URL}/api/admin/resume/current/summary`,
        `${API_BASE_URL}/api/admin/resume/latest/summary`
      );
    }

    return { get, save };
  }, [resumeId, versionId]);

  const hasUnsavedChanges = useMemo(() => {
    return summary !== savedSummary;
  }, [summary, savedSummary]);

  const wordCount = useMemo(() => {
    return summary.trim() ? summary.trim().split(/\s+/).length : 0;
  }, [summary]);

  const fetchSummary = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let resolvedSummary = "";
        let resolvedUpdatedAt: string | undefined;
        let found = false;

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
            const extracted = extractSummaryPayload(result);

            resolvedSummary = extracted.summary;
            resolvedUpdatedAt = extracted.updatedAt;
            found = true;
            break;
          } catch {
            continue;
          }
        }

        if (!found) {
          throw new Error("Summary data not found.");
        }

        setSummary(resolvedSummary);
        setSavedSummary(resolvedSummary);
        setUpdatedAt(resolvedUpdatedAt);
        onLoaded?.(resolvedSummary);
      } catch (error) {
        console.error("ResumeSummaryEditor fetch error:", error);
        setErrorMessage("Unable to load summary from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders, endpointCandidates.get, onLoaded]
  );

  useEffect(() => {
    if (!autoFetch) return;
    fetchSummary();
  }, [autoFetch, fetchSummary]);

  const handleReset = useCallback(() => {
    setSummary(savedSummary);
    setErrorMessage(null);
    setSuccessMessage("Summary reset to last saved state.");
  }, [savedSummary]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      let saveSucceeded = false;
      let resolvedSummary: string | undefined;
      let resolvedUpdatedAt: string | undefined;
      let responseMessage = "Summary saved successfully.";

      const body = JSON.stringify({
        summary,
        content: summary,
        text: summary,
        sectionType: "SUMMARY",
        regeneratePreview: true,
      });

      for (const endpoint of endpointCandidates.save) {
        for (const method of ["PUT", "POST"] as const) {
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
              const extracted = extractSummaryPayload(result);
              resolvedSummary = extracted.summary;
              resolvedUpdatedAt = extracted.updatedAt;

              const message = readMessage(result);
              if (message) {
                responseMessage = message;
              }
            }

            saveSucceeded = true;
            break;
          } catch {
            continue;
          }
        }

        if (saveSucceeded) break;
      }

      if (!saveSucceeded) {
        throw new Error("Failed to save summary.");
      }

      const nextSummary = resolvedSummary ?? summary;

      setSummary(nextSummary);
      setSavedSummary(nextSummary);
      setUpdatedAt(resolvedUpdatedAt);
      setSuccessMessage(responseMessage);
      onSaved?.(nextSummary);
    } catch (error) {
      console.error("ResumeSummaryEditor save error:", error);
      setErrorMessage("Failed to save summary.");
    } finally {
      setSaving(false);
    }
  }, [authHeaders, endpointCandidates.save, onSaved, summary]);

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl text-white ${className}`}
    >
      <div className="p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              <AlignLeft size={20} />
            </div>

            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-white/55">{subtitle}</p>
              <p className="mt-2 text-xs text-white/45">
                Last updated: {formatDateTime(updatedAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fetchSummary(true)}
              disabled={disabled || loading || refreshing}
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
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-10">
            <Loader2 className="animate-spin text-indigo-300" size={28} />
            <p className="text-sm text-white/60">Loading summary...</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Sparkles size={15} className="text-indigo-300" />
                  <span>Professional Summary</span>
                </div>

                <div className="text-xs text-white/45">
                  {wordCount} word{wordCount === 1 ? "" : "s"}
                </div>
              </div>

              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                disabled={disabled}
                placeholder={placeholder}
                className={`w-full ${minHeightClassName} resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60`}
              />
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
                  onClick={handleReset}
                  disabled={disabled || !hasUnsavedChanges}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={disabled || saving || !hasUnsavedChanges}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-4 py-2.5 font-semibold transition hover:opacity-95 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Summary
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