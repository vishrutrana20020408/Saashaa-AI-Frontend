"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Link as LinkIcon,
  Github,
  RotateCcw,
} from "lucide-react";

/**
 * ResumeProjectsEditor.tsx
 *
 * Backend Integrated Resume Projects Editor
 *
 * Supported flows:
 * - Current resume projects
 * - Resume projects by resumeId
 * - Resume version projects by resumeId + versionId
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

export type ResumeProjectItem = {
  id?: number | string;
  name: string;
  role?: string;
  organization?: string;
  startDate?: string;
  endDate?: string;
  currentlyWorking?: boolean;
  description?: string;
  technologies?: string[];
  achievements?: string[];
  projectUrl?: string;
  githubUrl?: string;
};

type ProjectsPayload = {
  projects?: unknown[];
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

type ResumeProjectsEditorProps = {
  resumeId?: string | number;
  versionId?: string | number;
  autoFetch?: boolean;
  title?: string;
  subtitle?: string;
  className?: string;
  disabled?: boolean;
  onLoaded?: (items: ResumeProjectItem[]) => void;
  onSaved?: (items: ResumeProjectItem[]) => void;
};

const emptyProjectItem = (): ResumeProjectItem => ({
  name: "",
  role: "",
  organization: "",
  startDate: "",
  endDate: "",
  currentlyWorking: false,
  description: "",
  technologies: [""],
  achievements: [""],
  projectUrl: "",
  githubUrl: "",
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
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

function normalizeProjectItem(item: unknown): ResumeProjectItem | null {
  if (!item || typeof item !== "object") return null;

  const source = item as GenericObject;

  const normalized: ResumeProjectItem = {
    id: readNumber(source.id, source.projectId, source.project_id),
    name:
      readString(source.name, source.projectName, source.project_name, source.title) ||
      "",
    role: readString(source.role, source.projectRole, source.project_role),
    organization: readString(
      source.organization,
      source.company,
      source.institution,
      source.client
    ),
    startDate: readString(source.startDate, source.start_date, source.fromDate, source.from_date),
    endDate: readString(source.endDate, source.end_date, source.toDate, source.to_date),
    currentlyWorking: normalizeBoolean(
      source.currentlyWorking ?? source.currently_working ?? source.present
    ),
    description: readString(source.description, source.summary, source.overview),
    technologies: normalizeStringArray(source.technologies ?? source.techStack ?? source.tech_stack),
    achievements: normalizeStringArray(source.achievements ?? source.highlights),
    projectUrl: readString(source.projectUrl, source.project_url, source.url, source.liveUrl, source.live_url),
    githubUrl: readString(source.githubUrl, source.github_url, source.repositoryUrl, source.repository_url, source.repoUrl, source.repo_url),
  };

  const hasAnyValue =
    normalized.name ||
    normalized.role ||
    normalized.organization ||
    normalized.startDate ||
    normalized.endDate ||
    normalized.description ||
    normalized.projectUrl ||
    normalized.githubUrl ||
    (normalized.technologies && normalized.technologies.length > 0) ||
    (normalized.achievements && normalized.achievements.length > 0);

  if (!hasAnyValue) return null;

  return {
    ...normalized,
    technologies:
      normalized.technologies && normalized.technologies.length > 0
        ? normalized.technologies
        : [""],
    achievements:
      normalized.achievements && normalized.achievements.length > 0
        ? normalized.achievements
        : [""],
  };
}

function extractProjectsPayload(input: unknown): {
  items: ResumeProjectItem[];
  updatedAt?: string;
} {
  const payload = unwrapPayload<ProjectsPayload | GenericObject>(input);
  const root = payload && typeof payload === "object" ? (payload as GenericObject) : {};

  const projectsRaw = Array.isArray(root.projects)
    ? root.projects
    : Array.isArray((root as GenericObject).items)
    ? ((root as GenericObject).items as unknown[])
    : Array.isArray((root as GenericObject).projectList)
    ? ((root as GenericObject).projectList as unknown[])
    : Array.isArray((root as GenericObject).entries)
    ? ((root as GenericObject).entries as unknown[])
    : [];

  const normalized = projectsRaw
    .map(normalizeProjectItem)
    .filter((item): item is ResumeProjectItem => Boolean(item));

  return {
    items: normalized.length > 0 ? normalized : [emptyProjectItem()],
    updatedAt: readString(root.updatedAt, root.updated_at),
  };
}

function normalizeForComparison(items: ResumeProjectItem[]): ResumeProjectItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name?.trim() || "",
    role: item.role?.trim() || "",
    organization: item.organization?.trim() || "",
    startDate: item.startDate?.trim() || "",
    endDate: item.endDate?.trim() || "",
    currentlyWorking: Boolean(item.currentlyWorking),
    description: item.description?.trim() || "",
    technologies:
      (item.technologies || []).map((entry) => entry.trim()).filter(Boolean).length > 0
        ? (item.technologies || []).map((entry) => entry.trim()).filter(Boolean)
        : [""],
    achievements:
      (item.achievements || []).map((entry) => entry.trim()).filter(Boolean).length > 0
        ? (item.achievements || []).map((entry) => entry.trim()).filter(Boolean)
        : [""],
    projectUrl: item.projectUrl?.trim() || "",
    githubUrl: item.githubUrl?.trim() || "",
  }));
}

function normalizeProject(item: ResumeProjectItem): ResumeProjectItem {
  return {
    ...item,
    technologies:
      item.technologies && item.technologies.length > 0 ? item.technologies : [""],
    achievements:
      item.achievements && item.achievements.length > 0 ? item.achievements : [""],
  };
}

function buildSavePayload(items: ResumeProjectItem[]) {
  return {
    projects: items,
    items,
    projectList: items,
    sectionType: "PROJECTS",
    regeneratePreview: true,
  };
}

export default function ResumeProjectsEditor({
  resumeId,
  versionId,
  autoFetch = true,
  title = "Projects Editor",
  subtitle = "Manage project entries for your resume using backend APIs.",
  className = "",
  disabled = false,
  onLoaded,
  onSaved,
}: ResumeProjectsEditorProps) {
  const [items, setItems] = useState<ResumeProjectItem[]>([emptyProjectItem()]);
  const [savedItems, setSavedItems] = useState<ResumeProjectItem[]>([emptyProjectItem()]);
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
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/projects`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/projects`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/projects`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/projects`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/projects`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/projects`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/projects`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/projects`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/projects`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/projects`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/projects`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/projects`
      );
    } else if (rid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/projects`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/projects`,
        `${API_BASE_URL}/api/admin/resume/${rid}/projects`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/projects`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/projects`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/projects`,
        `${API_BASE_URL}/api/admin/resume/${rid}/projects`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/projects`
      );
    } else {
      get.push(
        `${API_BASE_URL}/api/user/resume/current/projects`,
        `${API_BASE_URL}/api/user/resume/latest/projects`,
        `${API_BASE_URL}/api/admin/resume/current/projects`,
        `${API_BASE_URL}/api/admin/resume/latest/projects`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/current/projects`,
        `${API_BASE_URL}/api/user/resume/latest/projects`,
        `${API_BASE_URL}/api/admin/resume/current/projects`,
        `${API_BASE_URL}/api/admin/resume/latest/projects`
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
    (projectItems?: ResumeProjectItem[], updated?: string) => {
      const normalized =
        projectItems && projectItems.length > 0
          ? projectItems.map(normalizeProject)
          : [emptyProjectItem()];

      setItems(normalized);
      setSavedItems(normalized);
      setUpdatedAt(updated);
      onLoaded?.(normalized);
    },
    [onLoaded]
  );

  const fetchProjects = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let resolvedItems: ResumeProjectItem[] | null = null;
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
            const extracted = extractProjectsPayload(result);

            resolvedItems = extracted.items;
            resolvedUpdatedAt = extracted.updatedAt;
            break;
          } catch {
            continue;
          }
        }

        if (!resolvedItems) {
          throw new Error("Projects data not found.");
        }

        hydrateItems(resolvedItems, resolvedUpdatedAt);
      } catch (error) {
        console.error("ResumeProjectsEditor fetch error:", error);
        setErrorMessage("Unable to load project data from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders, endpointCandidates.get, hydrateItems]
  );

  useEffect(() => {
    if (!autoFetch) return;
    fetchProjects();
  }, [autoFetch, fetchProjects]);

  const updateItem = useCallback(
    (index: number, field: keyof ResumeProjectItem, value: string | boolean) => {
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

  const updateArrayField = useCallback(
    (
      itemIndex: number,
      field: "technologies" | "achievements",
      entryIndex: number,
      value: string
    ) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== itemIndex) return item;
          const list = [...(item[field] || [""])];
          list[entryIndex] = value;
          return { ...item, [field]: list };
        })
      );
    },
    []
  );

  const addArrayFieldEntry = useCallback(
    (itemIndex: number, field: "technologies" | "achievements") => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === itemIndex ? { ...item, [field]: [...(item[field] || []), ""] } : item
        )
      );
    },
    []
  );

  const removeArrayFieldEntry = useCallback(
    (
      itemIndex: number,
      field: "technologies" | "achievements",
      entryIndex: number
    ) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== itemIndex) return item;
          const list = [...(item[field] || [""])];
          if (list.length === 1) {
            return { ...item, [field]: [""] };
          }
          return { ...item, [field]: list.filter((_, idx) => idx !== entryIndex) };
        })
      );
    },
    []
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyProjectItem()]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => {
      if (prev.length === 1) return [emptyProjectItem()];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const resetChanges = useCallback(() => {
    setItems(savedItems.length > 0 ? savedItems : [emptyProjectItem()]);
    setErrorMessage(null);
    setSuccessMessage("Project entries reset to last saved state.");
  }, [savedItems]);

  const validateItems = useCallback(() => {
    for (const item of items) {
      const hasAnyValue =
        item.name?.trim() ||
        item.role?.trim() ||
        item.organization?.trim() ||
        item.startDate?.trim() ||
        item.endDate?.trim() ||
        item.description?.trim() ||
        item.projectUrl?.trim() ||
        item.githubUrl?.trim() ||
        (item.technologies || []).some((entry) => entry.trim()) ||
        (item.achievements || []).some((entry) => entry.trim());

      if (!hasAnyValue) continue;

      if (!item.name?.trim()) {
        setErrorMessage("Project name is required for each filled project entry.");
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
          name: item.name?.trim() || "",
          role: item.role?.trim() || "",
          organization: item.organization?.trim() || "",
          startDate: item.startDate?.trim() || "",
          endDate: item.currentlyWorking ? "" : item.endDate?.trim() || "",
          currentlyWorking: Boolean(item.currentlyWorking),
          description: item.description?.trim() || "",
          technologies: (item.technologies || []).map((entry) => entry.trim()).filter(Boolean),
          achievements: (item.achievements || []).map((entry) => entry.trim()).filter(Boolean),
          projectUrl: item.projectUrl?.trim() || "",
          githubUrl: item.githubUrl?.trim() || "",
        }))
        .filter((item) => {
          return (
            item.name ||
            item.role ||
            item.organization ||
            item.startDate ||
            item.endDate ||
            item.description ||
            item.projectUrl ||
            item.githubUrl ||
            item.technologies.length > 0 ||
            item.achievements.length > 0
          );
        });

      let saveSucceeded = false;
      let resolvedItems: ResumeProjectItem[] | null = null;
      let resolvedUpdatedAt: string | undefined;
      let responseMessage = "Project details saved successfully.";

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
              const extracted = extractProjectsPayload(result);
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
        throw new Error("Failed to save project data.");
      }

      const fallbackItems =
        filteredItems.length > 0
          ? filteredItems.map((item) => normalizeProject(item))
          : [emptyProjectItem()];

      const finalItems =
        resolvedItems && resolvedItems.length > 0 ? resolvedItems : fallbackItems;

      setItems(finalItems);
      setSavedItems(finalItems);
      setUpdatedAt(resolvedUpdatedAt);
      setSuccessMessage(responseMessage);

      onSaved?.(finalItems);
    } catch (error) {
      console.error("ResumeProjectsEditor save error:", error);
      setErrorMessage("Failed to save project data.");
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
              <FolderKanban size={20} />
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
              onClick={() => fetchProjects(true)}
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
            <p className="text-sm text-white/60">Loading project details...</p>
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
                        Project Entry {index + 1}
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
                        Project Name
                      </label>
                      <input
                        type="text"
                        value={item.name || ""}
                        onChange={(e) => updateItem(index, "name", e.target.value)}
                        disabled={disabled}
                        placeholder="e.g. Resume Management System"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Role
                      </label>
                      <input
                        type="text"
                        value={item.role || ""}
                        onChange={(e) => updateItem(index, "role", e.target.value)}
                        disabled={disabled}
                        placeholder="e.g. Full Stack Developer"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Organization
                      </label>
                      <input
                        type="text"
                        value={item.organization || ""}
                        onChange={(e) =>
                          updateItem(index, "organization", e.target.value)
                        }
                        disabled={disabled}
                        placeholder="e.g. Personal Project / Company / College"
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/70">
                        Project URL
                      </label>
                      <div className="relative">
                        <LinkIcon
                          size={16}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                        />
                        <input
                          type="text"
                          value={item.projectUrl || ""}
                          onChange={(e) =>
                            updateItem(index, "projectUrl", e.target.value)
                          }
                          disabled={disabled}
                          placeholder="https://example.com"
                          className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                        />
                      </div>
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

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm text-white/70">
                        GitHub URL
                      </label>
                      <div className="relative">
                        <Github
                          size={16}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                        />
                        <input
                          type="text"
                          value={item.githubUrl || ""}
                          onChange={(e) =>
                            updateItem(index, "githubUrl", e.target.value)
                          }
                          disabled={disabled}
                          placeholder="https://github.com/username/repository"
                          className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                        />
                      </div>
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
                      I am currently working on this project
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
                      placeholder="Describe the project, your contribution, and impact..."
                      className="min-h-[110px] w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm text-white/70">
                        Technologies
                      </label>

                      <button
                        type="button"
                        onClick={() => addArrayFieldEntry(index, "technologies")}
                        disabled={disabled}
                        className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/15 disabled:opacity-50"
                      >
                        <Plus size={14} />
                        Add Technology
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(item.technologies || [""]).map((tech, techIndex) => (
                        <div key={techIndex} className="flex gap-3">
                          <input
                            type="text"
                            value={tech}
                            onChange={(e) =>
                              updateArrayField(
                                index,
                                "technologies",
                                techIndex,
                                e.target.value
                              )
                            }
                            disabled={disabled}
                            placeholder={`Technology ${techIndex + 1}`}
                            className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              removeArrayFieldEntry(index, "technologies", techIndex)
                            }
                            disabled={disabled}
                            className="inline-flex items-center justify-center rounded-xl border border-red-400/20 bg-red-500/15 px-3 py-3 text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-sm text-white/70">
                        Key Achievements
                      </label>

                      <button
                        type="button"
                        onClick={() => addArrayFieldEntry(index, "achievements")}
                        disabled={disabled}
                        className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/15 disabled:opacity-50"
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
                              updateArrayField(
                                index,
                                "achievements",
                                achIndex,
                                e.target.value
                              )
                            }
                            disabled={disabled}
                            placeholder={`Achievement ${achIndex + 1}`}
                            className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              removeArrayFieldEntry(index, "achievements", achIndex)
                            }
                            disabled={disabled}
                            className="inline-flex items-center justify-center rounded-xl border border-red-400/20 bg-red-500/15 px-3 py-3 text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
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
                      Save Projects
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