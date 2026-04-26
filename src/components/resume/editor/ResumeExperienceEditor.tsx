"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
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
 * ResumeExperienceEditor.tsx
 *
 * Backend Integrated Resume Experience Editor
 *
 * Supported flows:
 * - Current resume experience
 * - Resume experience by resumeId
 * - Resume version experience by resumeId + versionId
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

export type ResumeExperienceItem = {
  id?: number | string;
  jobTitle: string;
  company: string;
  employmentType?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  currentlyWorking?: boolean;
  description?: string;
  achievements?: string[];
};

type ExperiencePayload = {
  experience?: unknown[];
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

type ResumeExperienceEditorProps = {
  resumeId?: string | number;
  versionId?: string | number;
  autoFetch?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  disabled?: boolean;
  onLoaded?: (items: ResumeExperienceItem[]) => void;
  onSaved?: (items: ResumeExperienceItem[]) => void;
};

const emptyExperienceItem = (): ResumeExperienceItem => ({
  jobTitle: "",
  company: "",
  employmentType: "",
  location: "",
  startDate: "",
  endDate: "",
  currentlyWorking: false,
  description: "",
  achievements: [""],
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

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeExperienceItem(item: unknown): ResumeExperienceItem | null {
  if (!item || typeof item !== "object") return null;

  const source = item as GenericObject;

  const normalized: ResumeExperienceItem = {
    id: readNumber(source.id, source.experienceId, source.experience_id),
    jobTitle:
      readString(
        source.jobTitle,
        source.job_title,
        source.title,
        source.role,
        source.position
      ) || "",
    company:
      readString(
        source.company,
        source.companyName,
        source.company_name,
        source.organization,
        source.employer
      ) || "",
    employmentType: readString(
      source.employmentType,
      source.employment_type,
      source.type
    ),
    location: readString(source.location, source.workLocation, source.work_location),
    startDate: readString(source.startDate, source.start_date, source.fromDate, source.from_date),
    endDate: readString(source.endDate, source.end_date, source.toDate, source.to_date),
    currentlyWorking: normalizeBoolean(
      source.currentlyWorking ?? source.currently_working ?? source.present
    ),
    description: readString(source.description, source.summary, source.responsibilities),
    achievements: normalizeStringArray(source.achievements),
  };

  const hasAnyValue =
    normalized.jobTitle ||
    normalized.company ||
    normalized.employmentType ||
    normalized.location ||
    normalized.startDate ||
    normalized.endDate ||
    normalized.description ||
    (normalized.achievements && normalized.achievements.length > 0);

  if (!hasAnyValue) return null;

  return {
    ...normalized,
    achievements:
      normalized.achievements && normalized.achievements.length > 0
        ? normalized.achievements
        : [""],
  };
}

function extractExperiencePayload(input: unknown): {
  items: ResumeExperienceItem[];
  updatedAt?: string;
} {
  const payload = unwrapPayload<ExperiencePayload | GenericObject>(input);
  const root = payload && typeof payload === "object" ? (payload as GenericObject) : {};

  const experienceRaw = Array.isArray(root.experience)
    ? root.experience
    : Array.isArray((root as GenericObject).items)
    ? ((root as GenericObject).items as unknown[])
    : Array.isArray((root as GenericObject).experienceList)
    ? ((root as GenericObject).experienceList as unknown[])
    : Array.isArray((root as GenericObject).entries)
    ? ((root as GenericObject).entries as unknown[])
    : [];

  const normalized = experienceRaw
    .map(normalizeExperienceItem)
    .filter((item): item is ResumeExperienceItem => Boolean(item));

  return {
    items: normalized.length > 0 ? normalized : [emptyExperienceItem()],
    updatedAt: readString(root.updatedAt, root.updated_at),
  };
}

function normalizeForComparison(items: ResumeExperienceItem[]): ResumeExperienceItem[] {
  return items.map((item) => ({
    id: item.id,
    jobTitle: item.jobTitle?.trim() || "",
    company: item.company?.trim() || "",
    employmentType: item.employmentType?.trim() || "",
    location: item.location?.trim() || "",
    startDate: item.startDate?.trim() || "",
    endDate: item.endDate?.trim() || "",
    currentlyWorking: Boolean(item.currentlyWorking),
    description: item.description?.trim() || "",
    achievements:
      (item.achievements || [])
        .map((achievement) => achievement.trim())
        .filter(Boolean)
        .length > 0
        ? (item.achievements || []).map((achievement) => achievement.trim()).filter(Boolean)
        : [""],
  }));
}

function buildSavePayload(items: ResumeExperienceItem[]) {
  return {
    experience: items,
    items,
    experienceList: items,
    sectionType: "EXPERIENCE",
    regeneratePreview: true,
  };
}

export default function ResumeExperienceEditor({
  resumeId,
  versionId,
  autoFetch = true,
  title = "Experience Editor",
  subtitle = "Manage work experience entries for your resume using backend APIs.",
  className = "",
  disabled = false,
  onLoaded,
  onSaved,
}: ResumeExperienceEditorProps) {
  const [items, setItems] = useState<ResumeExperienceItem[]>([
    emptyExperienceItem(),
  ]);
  const [savedItems, setSavedItems] = useState<ResumeExperienceItem[]>([
    emptyExperienceItem(),
  ]);
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
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/experience`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/experience`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/experience`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/experience`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/experience`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/experience`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/experience`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/experience`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/experience`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/experience`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/experience`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/experience`
      );
    } else if (rid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/experience`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/experience`,
        `${API_BASE_URL}/api/admin/resume/${rid}/experience`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/experience`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/experience`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/experience`,
        `${API_BASE_URL}/api/admin/resume/${rid}/experience`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/experience`
      );
    } else {
      get.push(
        `${API_BASE_URL}/api/user/resume/current/experience`,
        `${API_BASE_URL}/api/user/resume/latest/experience`,
        `${API_BASE_URL}/api/admin/resume/current/experience`,
        `${API_BASE_URL}/api/admin/resume/latest/experience`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/current/experience`,
        `${API_BASE_URL}/api/user/resume/latest/experience`,
        `${API_BASE_URL}/api/admin/resume/current/experience`,
        `${API_BASE_URL}/api/admin/resume/latest/experience`
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
    (experienceItems?: ResumeExperienceItem[], updated?: string) => {
      const normalized =
        experienceItems && experienceItems.length > 0
          ? experienceItems.map((item) => ({
              ...item,
              achievements:
                item.achievements && item.achievements.length > 0
                  ? item.achievements
                  : [""],
            }))
          : [emptyExperienceItem()];

      setItems(normalized);
      setSavedItems(normalized);
      setUpdatedAt(updated);
      onLoaded?.(normalized);
    },
    [onLoaded]
  );

  const fetchExperience = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let resolvedItems: ResumeExperienceItem[] | null = null;
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
            const extracted = extractExperiencePayload(result);

            resolvedItems = extracted.items;
            resolvedUpdatedAt = extracted.updatedAt;
            break;
          } catch {
            continue;
          }
        }

        if (!resolvedItems) {
          throw new Error("Experience data not found.");
        }

        hydrateItems(resolvedItems, resolvedUpdatedAt);
      } catch (error) {
        console.error("ResumeExperienceEditor fetch error:", error);
        setErrorMessage("Unable to load experience data from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders, endpointCandidates.get, hydrateItems]
  );

  useEffect(() => {
    if (!autoFetch) return;
    fetchExperience();
  }, [autoFetch, fetchExperience]);

  const updateItem = useCallback(
    (
      index: number,
      field: keyof ResumeExperienceItem,
      value: string | boolean
    ) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item;

          const nextItem = { ...item, [field]: value };

          if (field === "currentlyWorking" && value === true) {
            nextItem.endDate = "";
          }

          return nextItem;
        })
      );
    },
    []
  );

  const updateAchievement = useCallback(
    (itemIndex: number, achievementIndex: number, value: string) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== itemIndex) return item;

          const achievements = [...(item.achievements || [""])];
          achievements[achievementIndex] = value;
          return { ...item, achievements };
        })
      );
    },
    []
  );

  const addAchievement = useCallback((itemIndex: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? { ...item, achievements: [...(item.achievements || []), ""] }
          : item
      )
    );
  }, []);

  const removeAchievement = useCallback(
    (itemIndex: number, achievementIndex: number) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== itemIndex) return item;

          const achievements = [...(item.achievements || [""])];
          if (achievements.length === 1) {
            return { ...item, achievements: [""] };
          }

          return {
            ...item,
            achievements: achievements.filter((_, idx) => idx !== achievementIndex),
          };
        })
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyExperienceItem()]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => {
      if (prev.length === 1) return [emptyExperienceItem()];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const resetChanges = useCallback(() => {
    setItems(savedItems.length > 0 ? savedItems : [emptyExperienceItem()]);
    setErrorMessage(null);
    setSuccessMessage("Experience entries reset to last saved state.");
  }, [savedItems]);

  const validateItems = useCallback(() => {
    for (const item of items) {
      const hasAnyValue =
        item.jobTitle?.trim() ||
        item.company?.trim() ||
        item.employmentType?.trim() ||
        item.location?.trim() ||
        item.startDate?.trim() ||
        item.endDate?.trim() ||
        item.description?.trim() ||
        (item.achievements || []).some((achievement) => achievement.trim());

      if (!hasAnyValue) continue;

      if (!item.jobTitle?.trim()) {
        setErrorMessage("Job title is required for each filled experience entry.");
        return false;
      }

      if (!item.company?.trim()) {
        setErrorMessage("Company is required for each filled experience entry.");
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
          jobTitle: item.jobTitle?.trim() || "",
          company: item.company?.trim() || "",
          employmentType: item.employmentType?.trim() || "",
          location: item.location?.trim() || "",
          startDate: item.startDate?.trim() || "",
          endDate: item.currentlyWorking ? "" : item.endDate?.trim() || "",
          currentlyWorking: Boolean(item.currentlyWorking),
          description: item.description?.trim() || "",
          achievements: (item.achievements || [])
            .map((achievement) => achievement.trim())
            .filter(Boolean),
        }))
        .filter((item) => {
          return (
            item.jobTitle ||
            item.company ||
            item.employmentType ||
            item.location ||
            item.startDate ||
            item.endDate ||
            item.description ||
            item.achievements.length > 0
          );
        });

      let saveSucceeded = false;
      let resolvedItems: ResumeExperienceItem[] | null = null;
      let resolvedUpdatedAt: string | undefined;
      let responseMessage = "Experience details saved successfully.";

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
              const extracted = extractExperiencePayload(result);
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
        throw new Error("Failed to save experience data.");
      }

      const fallbackItems =
        filteredItems.length > 0
          ? filteredItems.map((item) => ({
              ...item,
              achievements:
                item.achievements && item.achievements.length > 0
                  ? item.achievements
                  : [""],
            }))
          : [emptyExperienceItem()];

      const finalItems =
        resolvedItems && resolvedItems.length > 0 ? resolvedItems : fallbackItems;

      setItems(finalItems);
      setSavedItems(finalItems);
      setUpdatedAt(resolvedUpdatedAt);
      setSuccessMessage(responseMessage);

      onSaved?.(finalItems);
    } catch (error) {
      console.error("ResumeExperienceEditor save error:", error);
      setErrorMessage("Failed to save experience data.");
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
              <Briefcase size={20} />
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
              onClick={() => fetchExperience(true)}
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
            <p className="text-sm text-white/60">Loading experience details...</p>
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
                        Experience Entry {index + 1}
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
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={item.jobTitle || ""}
                        onChange={(e) =>
                          updateItem(index, "jobTitle", e.target.value)
                        }
                        disabled={disabled}
                        placeholder="e.g. Backend Developer Intern"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Company
                      </label>
                      <input
                        type="text"
                        value={item.company || ""}
                        onChange={(e) =>
                          updateItem(index, "company", e.target.value)
                        }
                        disabled={disabled}
                        placeholder="e.g. TechNova"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Employment Type
                      </label>
                      <input
                        type="text"
                        value={item.employmentType || ""}
                        onChange={(e) =>
                          updateItem(index, "employmentType", e.target.value)
                        }
                        disabled={disabled}
                        placeholder="e.g. Full-time / Internship"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Location
                      </label>
                      <input
                        type="text"
                        value={item.location || ""}
                        onChange={(e) =>
                          updateItem(index, "location", e.target.value)
                        }
                        disabled={disabled}
                        placeholder="e.g. Noida, India"
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
                        onChange={(e) =>
                          updateItem(index, "startDate", e.target.value)
                        }
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
                        onChange={(e) =>
                          updateItem(index, "endDate", e.target.value)
                        }
                        disabled={disabled || item.currentlyWorking}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="inline-flex items-center gap-2 text-sm text-white/80">
                      <input
                        type="checkbox"
                        checked={!!item.currentlyWorking}
                        onChange={(e) =>
                          updateItem(index, "currentlyWorking", e.target.checked)
                        }
                        disabled={disabled}
                        className="accent-indigo-500"
                      />
                      I currently work here
                    </label>
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
                      placeholder="Describe your responsibilities and work impact..."
                      className="min-h-[110px] w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm text-white/70">
                        Key Achievements
                      </label>

                      <button
                        type="button"
                        onClick={() => addAchievement(index)}
                        disabled={disabled}
                        className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus size={14} />
                        Add Achievement
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(item.achievements || [""]).map((achievement, achIndex) => (
                        <div key={achIndex} className="flex gap-3">
                          <input
                            type="text"
                            value={achievement}
                            onChange={(e) =>
                              updateAchievement(index, achIndex, e.target.value)
                            }
                            disabled={disabled}
                            placeholder={`Achievement ${achIndex + 1}`}
                            className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                          />
                          <button
                            type="button"
                            onClick={() => removeAchievement(index, achIndex)}
                            disabled={disabled}
                            className="inline-flex items-center justify-center rounded-xl border border-red-400/20 bg-red-500/15 px-3 py-3 text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
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
                      Save Experience
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