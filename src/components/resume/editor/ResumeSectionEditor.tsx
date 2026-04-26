"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  Sparkles,
  Eye,
  Edit3,
  RotateCcw,
} from "lucide-react";

/**
 * ResumeSectionEditor.tsx
 *
 * Backend Integrated Generic Resume Section Editor
 *
 * Purpose:
 * - Reusable editor for structured resume sections
 * - Works for summary, skills, certifications, languages, achievements,
 *   custom sections, or any repeatable resume block
 * - Supports current resume, resume by resumeId, and resume version by versionId
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

export type ResumeSectionItem = {
  id?: number | string;
  label?: string;
  value?: string;
  description?: string;
};

type ResumeSectionPayload = {
  sectionKey?: string;
  sectionTitle?: string;
  sectionType?: string;
  content?: ResumeSectionItem[] | string | null;
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

type ResumeSectionEditorProps = {
  sectionKey: string;
  sectionTitle?: string;
  sectionDescription?: string;
  resumeId?: string | number;
  versionId?: string | number;
  editorType?: "TEXT" | "LIST" | "TAGS";
  autoFetch?: boolean;
  disabled?: boolean;
  className?: string;
  itemLabelName?: string;
  itemValueName?: string;
  itemDescriptionName?: string;
  showValueField?: boolean;
  showDescriptionField?: boolean;
  onLoaded?: (data: string | ResumeSectionItem[]) => void;
  onSaved?: (data: string | ResumeSectionItem[]) => void;
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
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return undefined;
}

function createEmptyItem(): ResumeSectionItem {
  return {
    label: "",
    value: "",
    description: "",
  };
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

function normalizeSectionItem(item: unknown): ResumeSectionItem | null {
  if (!item || typeof item !== "object") return null;

  const source = item as GenericObject;

  const normalized: ResumeSectionItem = {
    id: readNumber(source.id, source.sectionItemId, source.section_item_id),
    label: readString(
      source.label,
      source.name,
      source.title,
      source.key,
      source.tag,
      source.heading
    ) || "",
    value: readString(
      source.value,
      source.level,
      source.data,
      source.contentValue,
      source.subtitle
    ) || "",
    description: readString(
      source.description,
      source.summary,
      source.details,
      source.note,
      source.content
    ) || "",
  };

  const hasAnyValue =
    normalized.label || normalized.value || normalized.description;

  return hasAnyValue ? normalized : null;
}

function extractSectionPayload(input: unknown): {
  sectionKey?: string;
  sectionTitle?: string;
  sectionType?: string;
  content?: string | ResumeSectionItem[];
  updatedAt?: string;
} {
  const payload = unwrapPayload<ResumeSectionPayload | GenericObject>(input);
  const root = payload && typeof payload === "object" ? (payload as GenericObject) : {};

  const rawContent =
    root.content ??
    root.sectionContent ??
    root.section_content ??
    root.value;

  let normalizedContent: string | ResumeSectionItem[] | undefined;

  if (typeof rawContent === "string") {
    normalizedContent = rawContent;
  } else if (Array.isArray(rawContent)) {
    const mapped = rawContent
      .map(normalizeSectionItem)
      .filter((item): item is ResumeSectionItem => Boolean(item));

    normalizedContent = mapped.length > 0 ? mapped : [createEmptyItem()];
  } else if (rawContent && typeof rawContent === "object") {
    const maybeText = readString(
      (rawContent as GenericObject).text,
      (rawContent as GenericObject).value,
      (rawContent as GenericObject).content,
      (rawContent as GenericObject).summary
    );

    if (maybeText !== undefined) {
      normalizedContent = maybeText;
    }
  }

  return {
    sectionKey: readString(root.sectionKey, root.section_key, root.key),
    sectionTitle: readString(
      root.sectionTitle,
      root.section_title,
      root.title,
      root.name
    ),
    sectionType: readString(root.sectionType, root.section_type, root.type),
    content: normalizedContent,
    updatedAt: readString(root.updatedAt, root.updated_at),
  };
}

function normalizeItemsForComparison(items: ResumeSectionItem[]): ResumeSectionItem[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label?.trim() || "",
    value: item.value?.trim() || "",
    description: item.description?.trim() || "",
  }));
}

function normalizeItemsForUi(items?: ResumeSectionItem[]): ResumeSectionItem[] {
  if (!items || items.length === 0) {
    return [createEmptyItem()];
  }

  return items.map((item) => ({
    id: item.id,
    label: item.label || "",
    value: item.value || "",
    description: item.description || "",
  }));
}

function buildSaveBody(params: {
  sectionKey: string;
  sectionTitle: string;
  editorType: "TEXT" | "LIST" | "TAGS";
  content: string | ResumeSectionItem[];
}) {
  return {
    sectionKey: params.sectionKey,
    sectionTitle: params.sectionTitle,
    sectionType: params.editorType,
    content: params.content,
    value: params.content,
    sectionContent: params.content,
    regeneratePreview: true,
  };
}

export default function ResumeSectionEditor({
  sectionKey,
  sectionTitle,
  sectionDescription = "Manage this resume section with backend integration.",
  resumeId,
  versionId,
  editorType = "LIST",
  autoFetch = true,
  disabled = false,
  className = "",
  itemLabelName = "Label",
  itemValueName = "Value",
  itemDescriptionName = "Description",
  showValueField = true,
  showDescriptionField = true,
  onLoaded,
  onSaved,
}: ResumeSectionEditorProps) {
  const [textContent, setTextContent] = useState("");
  const [savedTextContent, setSavedTextContent] = useState("");

  const [items, setItems] = useState<ResumeSectionItem[]>([createEmptyItem()]);
  const [savedItems, setSavedItems] = useState<ResumeSectionItem[]>([
    createEmptyItem(),
  ]);

  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
  const [backendSectionTitle, setBackendSectionTitle] = useState<string | undefined>(
    undefined
  );

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
    const key = encodeURIComponent(sectionKey);

    const get: string[] = [];
    const save: string[] = [];

    if (rid && vid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/sections/${key}`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/sections/${key}`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/sections/${key}`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/sections/${key}`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/sections/${key}`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/sections/${key}`
      );
    } else if (rid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/sections/${key}`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/sections/${key}`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/sections/${key}`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/sections/${key}`
      );
    } else {
      get.push(
        `${API_BASE_URL}/api/user/resume/current/sections/${key}`,
        `${API_BASE_URL}/api/user/resume/latest/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/current/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/latest/sections/${key}`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/current/sections/${key}`,
        `${API_BASE_URL}/api/user/resume/latest/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/current/sections/${key}`,
        `${API_BASE_URL}/api/admin/resume/latest/sections/${key}`
      );
    }

    return { get, save };
  }, [resumeId, versionId, sectionKey]);

  const hasUnsavedChanges = useMemo(() => {
    if (editorType === "TEXT") {
      return textContent !== savedTextContent;
    }

    return (
      JSON.stringify(normalizeItemsForComparison(items)) !==
      JSON.stringify(normalizeItemsForComparison(savedItems))
    );
  }, [editorType, textContent, savedTextContent, items, savedItems]);

  const normalizedTitle = sectionTitle || backendSectionTitle || "Resume Section";

  const fetchSection = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let resolved:
          | {
              sectionKey?: string;
              sectionTitle?: string;
              sectionType?: string;
              content?: string | ResumeSectionItem[];
              updatedAt?: string;
            }
          | null = null;

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
            const extracted = extractSectionPayload(result);

            resolved = extracted;
            break;
          } catch {
            continue;
          }
        }

        if (!resolved) {
          throw new Error("Section data not found.");
        }

        setBackendSectionTitle(resolved.sectionTitle);
        setUpdatedAt(resolved.updatedAt);

        if (editorType === "TEXT") {
          const nextText =
            typeof resolved.content === "string" ? resolved.content : "";
          setTextContent(nextText);
          setSavedTextContent(nextText);
          onLoaded?.(nextText);
        } else {
          const nextItems =
            Array.isArray(resolved.content) && resolved.content.length > 0
              ? normalizeItemsForUi(resolved.content)
              : [createEmptyItem()];

          setItems(nextItems);
          setSavedItems(nextItems);
          onLoaded?.(nextItems);
        }
      } catch (error) {
        console.error("ResumeSectionEditor fetch error:", error);
        setErrorMessage("Unable to load section data from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders, editorType, endpointCandidates.get, onLoaded]
  );

  useEffect(() => {
    if (!autoFetch) return;
    fetchSection();
  }, [autoFetch, fetchSection]);

  const resetChanges = useCallback(() => {
    if (editorType === "TEXT") {
      setTextContent(savedTextContent);
    } else {
      setItems(savedItems.length > 0 ? savedItems : [createEmptyItem()]);
    }

    setErrorMessage(null);
    setSuccessMessage("Section reset to last saved state.");
  }, [editorType, savedItems, savedTextContent]);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem()]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => {
      if (prev.length === 1) return [createEmptyItem()];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const updateItem = useCallback(
    (index: number, field: keyof ResumeSectionItem, value: string) => {
      setItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const validate = useCallback(() => {
    if (editorType === "TEXT") {
      return true;
    }

    for (const item of items) {
      const hasAnyValue =
        item.label?.trim() || item.value?.trim() || item.description?.trim();

      if (!hasAnyValue) continue;

      if (!item.label?.trim()) {
        setErrorMessage(`${itemLabelName} is required for each filled entry.`);
        return false;
      }
    }

    return true;
  }, [editorType, itemLabelName, items]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      let payloadContent: string | ResumeSectionItem[] = "";

      if (editorType === "TEXT") {
        payloadContent = textContent;
      } else if (editorType === "TAGS") {
        payloadContent = items
          .filter((item) => item.label?.trim())
          .map((item) => ({
            id: item.id,
            label: item.label?.trim() || "",
          }));
      } else {
        payloadContent = items
          .filter((item) => {
            return (
              item.label?.trim() ||
              item.value?.trim() ||
              item.description?.trim()
            );
          })
          .map((item) => ({
            id: item.id,
            label: item.label?.trim() || "",
            value: item.value?.trim() || "",
            description: item.description?.trim() || "",
          }));
      }

      let saveSucceeded = false;
      let resolved:
        | {
            sectionKey?: string;
            sectionTitle?: string;
            sectionType?: string;
            content?: string | ResumeSectionItem[];
            updatedAt?: string;
          }
        | null = null;
      let responseMessage = "Section saved successfully.";

      const body = buildSaveBody({
        sectionKey,
        sectionTitle: normalizedTitle,
        editorType,
        content: payloadContent,
      });

      for (const endpoint of endpointCandidates.save) {
        for (const method of ["PUT", "POST"] as const) {
          try {
            const response = await fetch(endpoint, {
              method,
              headers: authHeaders,
              credentials: "include",
              body: JSON.stringify(body),
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
              resolved = extractSectionPayload(result);

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
        throw new Error("Failed to save section.");
      }

      setUpdatedAt(resolved?.updatedAt);
      setBackendSectionTitle(resolved?.sectionTitle);

      if (editorType === "TEXT") {
        const nextText =
          resolved && typeof resolved.content === "string"
            ? resolved.content
            : textContent;

        setTextContent(nextText);
        setSavedTextContent(nextText);
        onSaved?.(nextText);
      } else {
        const nextItems =
          resolved && Array.isArray(resolved.content) && resolved.content.length > 0
            ? normalizeItemsForUi(resolved.content)
            : Array.isArray(payloadContent) && payloadContent.length > 0
              ? normalizeItemsForUi(payloadContent)
              : [createEmptyItem()];

        setItems(nextItems);
        setSavedItems(nextItems);
        onSaved?.(nextItems);
      }

      setSuccessMessage(responseMessage);
    } catch (error) {
      console.error("ResumeSectionEditor save error:", error);
      setErrorMessage("Failed to save section data.");
    } finally {
      setSaving(false);
    }
  }, [
    authHeaders,
    editorType,
    endpointCandidates.save,
    items,
    normalizedTitle,
    onSaved,
    sectionKey,
    textContent,
    validate,
  ]);

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl text-white ${className}`}
    >
      <div className="p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              {editorType === "TEXT" ? <Edit3 size={20} /> : <FileText size={20} />}
            </div>

            <div>
              <h2 className="text-xl font-semibold">{normalizedTitle}</h2>
              <p className="text-sm text-white/55">{sectionDescription}</p>
              <p className="mt-2 text-xs text-white/45">
                Last updated: {formatDateTime(updatedAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fetchSection(true)}
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

            {editorType !== "TEXT" && (
              <button
                type="button"
                onClick={addItem}
                disabled={disabled}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:opacity-50"
              >
                <Plus size={16} />
                Add Entry
              </button>
            )}
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
            <p className="text-sm text-white/60">Loading section details...</p>
          </div>
        ) : (
          <>
            {editorType === "TEXT" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
                    <Eye size={15} className="text-indigo-300" />
                    <span>Section Content</span>
                  </div>

                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    disabled={disabled}
                    placeholder={`Write your ${normalizedTitle.toLowerCase()} here...`}
                    className="w-full min-h-[260px] resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                  />
                </div>
              </div>
            ) : (
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
                          {normalizedTitle} Entry {index + 1}
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

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="mb-2 block text-sm text-white/70">
                          {itemLabelName}
                        </label>
                        <input
                          type="text"
                          value={item.label || ""}
                          onChange={(e) =>
                            updateItem(index, "label", e.target.value)
                          }
                          disabled={disabled}
                          placeholder={`Enter ${itemLabelName.toLowerCase()}`}
                          className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                        />
                      </div>

                      {editorType !== "TAGS" && showValueField && (
                        <div>
                          <label className="mb-2 block text-sm text-white/70">
                            {itemValueName}
                          </label>
                          <input
                            type="text"
                            value={item.value || ""}
                            onChange={(e) =>
                              updateItem(index, "value", e.target.value)
                            }
                            disabled={disabled}
                            placeholder={`Enter ${itemValueName.toLowerCase()}`}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                          />
                        </div>
                      )}

                      {editorType !== "TAGS" && showDescriptionField && (
                        <div>
                          <label className="mb-2 block text-sm text-white/70">
                            {itemDescriptionName}
                          </label>
                          <textarea
                            value={item.description || ""}
                            onChange={(e) =>
                              updateItem(index, "description", e.target.value)
                            }
                            disabled={disabled}
                            placeholder={`Enter ${itemDescriptionName.toLowerCase()}`}
                            className="w-full min-h-30 resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400 disabled:opacity-60"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                      Save Section
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
