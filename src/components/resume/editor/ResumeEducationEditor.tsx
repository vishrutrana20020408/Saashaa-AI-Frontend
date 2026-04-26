"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RotateCcw,
} from "lucide-react";

/**
 * ResumeEducationEditor.tsx
 *
 * Backend Integrated Resume Education Editor
 *
 * Supported flows:
 * - Current resume education
 * - Resume education by resumeId
 * - Resume version education by resumeId + versionId
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

export type ResumeEducationItem = {
  id?: number | string;
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  description?: string;
};

type EducationPayload = {
  education?: unknown[];
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

type ResumeEducationEditorProps = {
  resumeId?: string | number;
  versionId?: string | number;
  autoFetch?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  disabled?: boolean;
  onLoaded?: (items: ResumeEducationItem[]) => void;
  onSaved?: (items: ResumeEducationItem[]) => void;
};

const emptyEducationItem = (): ResumeEducationItem => ({
  degree: "",
  institution: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  grade: "",
  description: "",
});

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

function normalizeEducationItem(item: unknown): ResumeEducationItem | null {
  if (!item || typeof item !== "object") return null;

  const source = item as GenericObject;

  const normalized: ResumeEducationItem = {
    id: readNumber(source.id, source.educationId, source.education_id),
    degree: readString(source.degree, source.title, source.qualification) || "",
    institution:
      readString(
        source.institution,
        source.school,
        source.college,
        source.university
      ) || "",
    fieldOfStudy: readString(
      source.fieldOfStudy,
      source.field_of_study,
      source.specialization,
      source.major
    ),
    startDate: readString(source.startDate, source.start_date, source.fromDate, source.from_date),
    endDate: readString(source.endDate, source.end_date, source.toDate, source.to_date),
    grade: readString(source.grade, source.cgpa, source.score, source.result),
    description: readString(source.description, source.notes, source.summary),
  };

  const hasAnyValue =
    normalized.degree ||
    normalized.institution ||
    normalized.fieldOfStudy ||
    normalized.startDate ||
    normalized.endDate ||
    normalized.grade ||
    normalized.description;

  return hasAnyValue ? normalized : null;
}

function extractEducationPayload(input: unknown): {
  items: ResumeEducationItem[];
  updatedAt?: string;
} {
  const payload = unwrapPayload<EducationPayload | GenericObject>(input);
  const root = payload && typeof payload === "object" ? (payload as GenericObject) : {};

  const educationRaw = Array.isArray(root.education)
    ? root.education
    : Array.isArray((root as GenericObject).items)
    ? ((root as GenericObject).items as unknown[])
    : Array.isArray((root as GenericObject).educationList)
    ? ((root as GenericObject).educationList as unknown[])
    : Array.isArray((root as GenericObject).entries)
    ? ((root as GenericObject).entries as unknown[])
    : [];

  const normalized = educationRaw
    .map(normalizeEducationItem)
    .filter((item): item is ResumeEducationItem => Boolean(item));

  return {
    items: normalized.length > 0 ? normalized : [emptyEducationItem()],
    updatedAt: readString(root.updatedAt, root.updated_at),
  };
}

function normalizeForComparison(items: ResumeEducationItem[]): ResumeEducationItem[] {
  return items.map((item) => ({
    id: item.id,
    degree: item.degree?.trim() || "",
    institution: item.institution?.trim() || "",
    fieldOfStudy: item.fieldOfStudy?.trim() || "",
    startDate: item.startDate?.trim() || "",
    endDate: item.endDate?.trim() || "",
    grade: item.grade?.trim() || "",
    description: item.description?.trim() || "",
  }));
}

function buildSavePayload(items: ResumeEducationItem[]) {
  return {
    education: items,
    items,
    educationList: items,
    sectionType: "EDUCATION",
    regeneratePreview: true,
  };
}

export default function ResumeEducationEditor({
  resumeId,
  versionId,
  autoFetch = true,
  title = "Education Editor",
  subtitle = "Manage education entries for your resume using backend APIs.",
  className = "",
  disabled = false,
  onLoaded,
  onSaved,
}: ResumeEducationEditorProps) {
  const [items, setItems] = useState<ResumeEducationItem[]>([emptyEducationItem()]);
  const [savedItems, setSavedItems] = useState<ResumeEducationItem[]>([emptyEducationItem()]);
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
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/education`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/education`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/education`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/education`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/education`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/education`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/education`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/education`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/education`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/education`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/education`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/education`
      );
    } else if (rid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/education`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/education`,
        `${API_BASE_URL}/api/admin/resume/${rid}/education`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/education`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/education`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/education`,
        `${API_BASE_URL}/api/admin/resume/${rid}/education`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/education`
      );
    } else {
      get.push(
        `${API_BASE_URL}/api/user/resume/current/education`,
        `${API_BASE_URL}/api/user/resume/latest/education`,
        `${API_BASE_URL}/api/admin/resume/current/education`,
        `${API_BASE_URL}/api/admin/resume/latest/education`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/current/education`,
        `${API_BASE_URL}/api/user/resume/latest/education`,
        `${API_BASE_URL}/api/admin/resume/current/education`,
        `${API_BASE_URL}/api/admin/resume/latest/education`
      );
    }

    return { get, save };
  }, [resumeId, versionId]);

  const hasUnsavedChanges = useMemo(() => {
    return (
      JSON.stringify(normalizeForComparison(items)) !==
      JSON.stringify(normalizeForComparison(savedItems))
    );
  }, [items, savedItems]);

  const hydrateItems = useCallback(
    (educationItems?: ResumeEducationItem[], updated?: string) => {
      const normalized =
        educationItems && educationItems.length > 0
          ? educationItems
          : [emptyEducationItem()];

      setItems(normalized);
      setSavedItems(normalized);
      setUpdatedAt(updated);
      onLoaded?.(normalized);
    },
    [onLoaded]
  );

  const fetchEducation = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let resolvedItems: ResumeEducationItem[] | null = null;
        let resolvedUpdatedAt: string | undefined;

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
            const extracted = extractEducationPayload(result);

            resolvedItems = extracted.items;
            resolvedUpdatedAt = extracted.updatedAt;
            break;
          } catch {
            continue;
          }
        }

        if (!resolvedItems) {
          throw new Error("Education data not found.");
        }

        hydrateItems(resolvedItems, resolvedUpdatedAt);
      } catch (error) {
        console.error("ResumeEducationEditor fetch error:", error);
        setErrorMessage("Unable to load education data from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders, endpointCandidates.get, hydrateItems]
  );

  useEffect(() => {
    if (!autoFetch) return;
    fetchEducation();
  }, [autoFetch, fetchEducation]);

  const updateItem = useCallback(
    (index: number, field: keyof ResumeEducationItem, value: string) => {
      setItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyEducationItem()]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => {
      if (prev.length === 1) return [emptyEducationItem()];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const resetChanges = useCallback(() => {
    setItems(savedItems.length > 0 ? savedItems : [emptyEducationItem()]);
    setErrorMessage(null);
    setSuccessMessage("Education entries reset to last saved state.");
  }, [savedItems]);

  const validateItems = useCallback(() => {
    for (const item of items) {
      const hasAnyValue =
        item.degree?.trim() ||
        item.institution?.trim() ||
        item.fieldOfStudy?.trim() ||
        item.startDate?.trim() ||
        item.endDate?.trim() ||
        item.grade?.trim() ||
        item.description?.trim();

      if (!hasAnyValue) continue;

      if (!item.degree?.trim()) {
        setErrorMessage("Degree is required for each filled education entry.");
        return false;
      }

      if (!item.institution?.trim()) {
        setErrorMessage("Institution is required for each filled education entry.");
        return false;
      }
    }

    return true;
  }, [items]);

  const handleSave = useCallback(async () => {
    if (!validateItems()) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const filteredItems = items
        .map((item) => ({
          ...item,
          degree: item.degree?.trim() || "",
          institution: item.institution?.trim() || "",
          fieldOfStudy: item.fieldOfStudy?.trim() || "",
          startDate: item.startDate?.trim() || "",
          endDate: item.endDate?.trim() || "",
          grade: item.grade?.trim() || "",
          description: item.description?.trim() || "",
        }))
        .filter((item) => {
          return (
            item.degree ||
            item.institution ||
            item.fieldOfStudy ||
            item.startDate ||
            item.endDate ||
            item.grade ||
            item.description
          );
        });

      let saveSucceeded = false;
      let resolvedItems: ResumeEducationItem[] | null = null;
      let resolvedUpdatedAt: string | undefined;
      let responseMessage = "Education details saved successfully.";

      const payload = buildSavePayload(filteredItems);

      for (const endpoint of endpointCandidates.save) {
        for (const method of ["PUT", "POST"] as const) {
          try {
            const response = await fetch(endpoint, {
              method,
              headers: authHeaders,
              credentials: "include",
              body: JSON.stringify(payload),
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
              const extracted = extractEducationPayload(result);
              resolvedItems = extracted.items;
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
        throw new Error("Failed to save education data.");
      }

      const fallbackItems =
        filteredItems.length > 0 ? filteredItems : [emptyEducationItem()];

      const finalItems =
        resolvedItems && resolvedItems.length > 0 ? resolvedItems : fallbackItems;

      setItems(finalItems);
      setSavedItems(finalItems);
      setUpdatedAt(resolvedUpdatedAt);
      setSuccessMessage(responseMessage);

      onSaved?.(finalItems);
    } catch (error) {
      console.error("ResumeEducationEditor save error:", error);
      setErrorMessage("Failed to save education data.");
    } finally {
      setSaving(false);
    }
  }, [authHeaders, endpointCandidates.save, items, onSaved, validateItems]);

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl ${className}`}
    >
      <div className="p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              <GraduationCap size={20} />
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
              onClick={() => fetchEducation(true)}
              disabled={disabled || loading || refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
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
              onClick={addItem}
              disabled={disabled}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              Add Entry
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
            <p className="text-sm text-white/60">Loading education details...</p>
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {items.map((item, index) => (
                <div
                  key={item.id ?? index}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-indigo-300" />
                      <h3 className="text-base font-semibold">
                        Education Entry {index + 1}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={disabled}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/15 px-3 py-2 text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Degree
                      </label>
                      <input
                        type="text"
                        value={item.degree || ""}
                        onChange={(e) => updateItem(index, "degree", e.target.value)}
                        disabled={disabled}
                        placeholder="e.g. B.Tech in Computer Science"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Institution
                      </label>
                      <input
                        type="text"
                        value={item.institution || ""}
                        onChange={(e) =>
                          updateItem(index, "institution", e.target.value)
                        }
                        disabled={disabled}
                        placeholder="e.g. ABC University"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Field of Study
                      </label>
                      <input
                        type="text"
                        value={item.fieldOfStudy || ""}
                        onChange={(e) =>
                          updateItem(index, "fieldOfStudy", e.target.value)
                        }
                        disabled={disabled}
                        placeholder="e.g. Computer Science"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Grade / CGPA
                      </label>
                      <input
                        type="text"
                        value={item.grade || ""}
                        onChange={(e) => updateItem(index, "grade", e.target.value)}
                        disabled={disabled}
                        placeholder="e.g. 8.7 CGPA"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Start Date
                      </label>
                      <input
                        type="month"
                        value={item.startDate || ""}
                        onChange={(e) => updateItem(index, "startDate", e.target.value)}
                        disabled={disabled}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        End Date
                      </label>
                      <input
                        type="month"
                        value={item.endDate || ""}
                        onChange={(e) => updateItem(index, "endDate", e.target.value)}
                        disabled={disabled}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm text-white/70">
                      Description
                    </label>
                    <textarea
                      value={item.description || ""}
                      onChange={(e) =>
                        updateItem(index, "description", e.target.value)
                      }
                      disabled={disabled}
                      placeholder="Relevant coursework, achievements, activities..."
                      className="min-h-[110px] w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                    />
                  </div>
                </div>
              ))}
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={disabled || saving || !hasUnsavedChanges}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-4 py-2.5 font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Education
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