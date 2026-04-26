"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Wrench,
  RotateCcw,
} from "lucide-react";

/**
 * ResumeSkillsEditor.tsx
 *
 * Backend Integrated Resume Skills Editor
 *
 * Supported flows:
 * - Current resume skills
 * - Resume skills by resumeId
 * - Resume version skills by resumeId + versionId
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

export type ResumeSkillItem = {
  id?: number | string;
  name: string;
  category?: string;
  level?: string;
  yearsOfExperience?: string;
  description?: string;
};

type SkillsPayload = {
  skills?: unknown[];
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

type ResumeSkillsEditorProps = {
  resumeId?: string | number;
  versionId?: string | number;
  autoFetch?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  disabled?: boolean;
  onLoaded?: (items: ResumeSkillItem[]) => void;
  onSaved?: (items: ResumeSkillItem[]) => void;
};

const SKILL_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
] as const;

const COMMON_CATEGORIES = [
  "Programming Languages",
  "Frameworks & Libraries",
  "Databases",
  "Cloud & DevOps",
  "Tools & Platforms",
  "Testing",
  "Data Science & Analytics",
  "Design",
  "Soft Skills",
  "Other",
] as const;

const emptySkillItem = (): ResumeSkillItem => ({
  name: "",
  category: "",
  level: "",
  yearsOfExperience: "",
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

function normalizeSkillItem(item: unknown): ResumeSkillItem | null {
  if (!item || typeof item !== "object") return null;

  const source = item as GenericObject;

  const normalized: ResumeSkillItem = {
    id: readNumber(source.id, source.skillId, source.skill_id),
    name: readString(source.name, source.skillName, source.skill_name, source.title) || "",
    category: readString(source.category, source.skillCategory, source.skill_category, source.group),
    level: readString(source.level, source.proficiency, source.proficiencyLevel, source.proficiency_level),
    yearsOfExperience: readString(
      source.yearsOfExperience,
      source.years_of_experience,
      source.experience,
      source.experienceYears,
      source.experience_years
    ),
    description: readString(source.description, source.notes, source.summary),
  };

  const hasAnyValue =
    normalized.name ||
    normalized.category ||
    normalized.level ||
    normalized.yearsOfExperience ||
    normalized.description;

  return hasAnyValue ? normalized : null;
}

function extractSkillsPayload(input: unknown): {
  items: ResumeSkillItem[];
  updatedAt?: string;
} {
  const payload = unwrapPayload<SkillsPayload | GenericObject>(input);
  const root = payload && typeof payload === "object" ? (payload as GenericObject) : {};

  const skillsRaw = Array.isArray(root.skills)
    ? root.skills
    : Array.isArray((root as GenericObject).items)
      ? ((root as GenericObject).items as unknown[])
      : Array.isArray((root as GenericObject).skillList)
        ? ((root as GenericObject).skillList as unknown[])
        : Array.isArray((root as GenericObject).entries)
          ? ((root as GenericObject).entries as unknown[])
          : [];

  const normalized = skillsRaw
    .map(normalizeSkillItem)
    .filter((item): item is ResumeSkillItem => Boolean(item));

  return {
    items: normalized.length > 0 ? normalized : [emptySkillItem()],
    updatedAt: readString(root.updatedAt, root.updated_at),
  };
}

function normalizeForComparison(items: ResumeSkillItem[]): ResumeSkillItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name?.trim() || "",
    category: item.category?.trim() || "",
    level: item.level?.trim() || "",
    yearsOfExperience: item.yearsOfExperience?.trim() || "",
    description: item.description?.trim() || "",
  }));
}

function buildSavePayload(items: ResumeSkillItem[]) {
  return {
    skills: items,
    items,
    skillList: items,
    sectionType: "SKILLS",
    regeneratePreview: true,
  };
}

export default function ResumeSkillsEditor({
  resumeId,
  versionId,
  autoFetch = true,
  title = "Skills Editor",
  subtitle = "Manage skill entries for your resume using backend APIs.",
  className = "",
  disabled = false,
  onLoaded,
  onSaved,
}: ResumeSkillsEditorProps) {
  const [items, setItems] = useState<ResumeSkillItem[]>([emptySkillItem()]);
  const [savedItems, setSavedItems] = useState<ResumeSkillItem[]>([emptySkillItem()]);
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
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/skills`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/skills`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/skills`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/skills`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/skills`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/skills`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/skills`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/skills`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/skills`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/skills`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/skills`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/skills`
      );
    } else if (rid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/skills`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/skills`,
        `${API_BASE_URL}/api/admin/resume/${rid}/skills`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/skills`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/skills`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/skills`,
        `${API_BASE_URL}/api/admin/resume/${rid}/skills`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/skills`
      );
    } else {
      get.push(
        `${API_BASE_URL}/api/user/resume/current/skills`,
        `${API_BASE_URL}/api/user/resume/latest/skills`,
        `${API_BASE_URL}/api/admin/resume/current/skills`,
        `${API_BASE_URL}/api/admin/resume/latest/skills`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/current/skills`,
        `${API_BASE_URL}/api/user/resume/latest/skills`,
        `${API_BASE_URL}/api/admin/resume/current/skills`,
        `${API_BASE_URL}/api/admin/resume/latest/skills`
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
    (skills?: ResumeSkillItem[], updated?: string) => {
      const normalized = skills && skills.length > 0 ? skills : [emptySkillItem()];

      setItems(normalized);
      setSavedItems(normalized);
      setUpdatedAt(updated);
      onLoaded?.(normalized);
    },
    [onLoaded]
  );

  const fetchSkills = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let resolvedItems: ResumeSkillItem[] | null = null;
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
            const extracted = extractSkillsPayload(result);

            resolvedItems = extracted.items;
            resolvedUpdatedAt = extracted.updatedAt;
            break;
          } catch {
            continue;
          }
        }

        if (!resolvedItems) {
          throw new Error("Skills data not found.");
        }

        hydrateItems(resolvedItems, resolvedUpdatedAt);
      } catch (error) {
        console.error("ResumeSkillsEditor fetch error:", error);
        setErrorMessage("Unable to load skills data from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders, endpointCandidates.get, hydrateItems]
  );

  useEffect(() => {
    if (!autoFetch) return;
    fetchSkills();
  }, [autoFetch, fetchSkills]);

  const updateItem = useCallback(
    (index: number, field: keyof ResumeSkillItem, value: string) => {
      setItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptySkillItem()]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => {
      if (prev.length === 1) return [emptySkillItem()];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const resetChanges = useCallback(() => {
    setItems(savedItems.length > 0 ? savedItems : [emptySkillItem()]);
    setErrorMessage(null);
    setSuccessMessage("Skill entries reset to last saved state.");
  }, [savedItems]);

  const validateItems = useCallback(() => {
    for (const item of items) {
      const hasAnyValue =
        item.name?.trim() ||
        item.category?.trim() ||
        item.level?.trim() ||
        item.yearsOfExperience?.trim() ||
        item.description?.trim();

      if (!hasAnyValue) continue;

      if (!item.name?.trim()) {
        setErrorMessage("Skill name is required for each filled skill entry.");
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
          id: item.id,
          name: item.name?.trim() || "",
          category: item.category?.trim() || "",
          level: item.level?.trim() || "",
          yearsOfExperience: item.yearsOfExperience?.trim() || "",
          description: item.description?.trim() || "",
        }))
        .filter((item) => {
          return (
            item.name ||
            item.category ||
            item.level ||
            item.yearsOfExperience ||
            item.description
          );
        });

      let saveSucceeded = false;
      let resolvedItems: ResumeSkillItem[] | null = null;
      let resolvedUpdatedAt: string | undefined;
      let responseMessage = "Skills saved successfully.";

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
              const extracted = extractSkillsPayload(result);
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
        throw new Error("Failed to save skills data.");
      }

      const fallbackItems =
        filteredItems.length > 0 ? filteredItems : [emptySkillItem()];

      const finalItems =
        resolvedItems && resolvedItems.length > 0 ? resolvedItems : fallbackItems;

      setItems(finalItems);
      setSavedItems(finalItems);
      setUpdatedAt(resolvedUpdatedAt);
      setSuccessMessage(responseMessage);

      onSaved?.(finalItems);
    } catch (error) {
      console.error("ResumeSkillsEditor save error:", error);
      setErrorMessage("Failed to save skills data.");
    } finally {
      setSaving(false);
    }
  }, [authHeaders, endpointCandidates.save, items, onSaved, validateItems]);

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl text-white ${className}`}
    >
      <div className="p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Brain size={20} />
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
              onClick={() => fetchSkills(true)}
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

            <button
              type="button"
              onClick={addItem}
              disabled={disabled}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              <Plus size={16} />
              Add Skill
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
            <p className="text-sm text-white/60">Loading skills...</p>
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
                        Skill Entry {index + 1}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={disabled}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/15 px-3 py-2 text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Skill Name
                      </label>
                      <input
                        type="text"
                        value={item.name || ""}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        disabled={disabled}
                        placeholder="e.g. Java, React, MySQL"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Category
                      </label>
                      <div className="relative">
                        <Wrench
                          size={16}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                        />
                        <input
                          list={`skill-categories-${index}`}
                          value={item.category || ""}
                          onChange={(e) => updateItem(index, "category", e.target.value)}
                          disabled={disabled}
                          placeholder="e.g. Programming Languages"
                          className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                        />
                        <datalist id={`skill-categories-${index}`}>
                          {COMMON_CATEGORIES.map((category) => (
                            <option key={category} value={category} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Level
                      </label>
                      <select
                        value={item.level || ""}
                        onChange={(e) => updateItem(index, "level", e.target.value)}
                        disabled={disabled}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      >
                        <option value="" className="bg-slate-900">
                          Select level
                        </option>
                        {SKILL_LEVELS.map((level) => (
                          <option key={level} value={level} className="bg-slate-900">
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Years of Experience
                      </label>
                      <input
                        type="text"
                        value={item.yearsOfExperience || ""}
                        onChange={(e) =>
                          updateItem(index, "yearsOfExperience", e.target.value)
                        }
                        disabled={disabled}
                        placeholder="e.g. 2, 3+, 6 months"
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
                      placeholder="Add details, related tools, frameworks, or context..."
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
                      Save Skills
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