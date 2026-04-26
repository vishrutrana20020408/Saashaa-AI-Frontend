"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildResumeEditorSavePayload,
  fetchResumeEditorConfig,
  findResumeEditorSection,
  getDefaultResumeTemplate,
  type ResumeEditorConfig,
  type ResumeEditorSavePayload,
} from "../config/resumeEditorConfig";

/**
 * src/components/interview/useResumeEditor.ts
 *
 * Backend-integrated resume editor hook
 * aligned with the latest project update.
 *
 * Purpose:
 * - provide reusable editor state for resume pages, tailoring flows, and interview-linked resume usage
 * - load backend-driven resume editor config
 * - load resume version content from backend
 * - save resume version content back to backend
 * - support current project ideology:
 *   frontend -> backend -> AI-engine/services
 *
 * Backend-aligned patterns supported:
 * - GET /api/user/resume/{resumeId}/versions/{versionId}
 * - PUT /api/user/resume/{resumeId}/versions/{versionId}/content
 * - POST /api/user/resume/{resumeId}/versions/{versionId}/ats-score
 *
 * Supported backend response wrappers:
 * - { success, data }
 * - { success, payload }
 * - { success, result }
 * - nested wrapped payloads
 */

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
  content?: T | null;
};

export type ResumeEditorSectionState = Record<string, unknown>;

export type ResumeEditorVersionData = {
  resumeId?: number | string;
  resumeVersionId?: number | string;
  versionId?: number | string;
  currentVersionId?: number | string;

  resumeName?: string;
  title?: string;
  versionName?: string;
  versionCode?: string;
  versionType?: string;

  atsScore?: number | string;
  rawText?: string;
  structuredContentJson?: unknown;
  sectionOrder?: string[];

  previewUrl?: string;
  downloadUrl?: string;
  fileUrl?: string;

  createdAt?: string;
  updatedAt?: string;
};

export type UseResumeEditorOptions = {
  resumeId?: string | number;
  versionId?: string | number;

  autoLoad?: boolean;
  autoLoadConfig?: boolean;
  autoLoadVersion?: boolean;

  configEndpoint?: string;
  detailEndpoint?: string;
  saveEndpoint?: string;
  atsEndpoint?: string;

  initialTitle?: string;
  initialTemplateCode?: string;
  initialSectionOrder?: string[];
  initialSections?: Record<string, unknown>;

  onConfigLoaded?: (config: ResumeEditorConfig | null) => void;
  onVersionLoaded?: (version: ResumeEditorVersionData | null, raw: unknown) => void;
  onSaved?: (version: ResumeEditorVersionData | null, raw: unknown) => void;
};

export type UseResumeEditorResult = {
  config: ResumeEditorConfig | null;
  version: ResumeEditorVersionData | null;

  loading: boolean;
  loadingConfig: boolean;
  loadingVersion: boolean;
  saving: boolean;
  calculatingAts: boolean;

  error: string | null;
  successMessage: string | null;

  title: string;
  templateCode: string;
  sectionOrder: string[];
  sections: ResumeEditorSectionState;
  rawText: string;
  atsScore: number | null;

  hasUnsavedChanges: boolean;

  setTitle: (value: string) => void;
  setTemplateCode: (value: string) => void;
  setSectionOrder: (value: string[]) => void;
  setSections: (value: ResumeEditorSectionState) => void;
  setRawText: (value: string) => void;
  setAtsScore: (value: number | null) => void;

  updateSection: (sectionKey: string, value: unknown) => void;
  resetToLoadedState: () => void;
  buildSavePayload: () => ResumeEditorSavePayload;

  reloadConfig: () => Promise<ResumeEditorConfig | null>;
  reloadVersion: () => Promise<ResumeEditorVersionData | null>;
  saveVersion: (options?: {
    regeneratePreview?: boolean;
  }) => Promise<ResumeEditorVersionData | null>;
  calculateAtsScore: () => Promise<number | null>;

  clearMessages: () => void;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:8080";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token") ||
    null
  );
}

function unwrapPayload<T>(input: unknown): T | null {
  if (!input || typeof input !== "object") return input as T | null;

  const level1 = input as ApiEnvelope<T>;
  const first =
    level1.data ?? level1.payload ?? level1.result ?? level1.content ?? input;

  if (!first || typeof first !== "object") return first as T | null;

  const level2 = first as ApiEnvelope<T>;
  return (level2.data ??
    level2.payload ??
    level2.result ??
    level2.content ??
    first) as T | null;
}

function extractMessage(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;

  const top = input as ApiEnvelope<unknown>;
  if (typeof top.message === "string" && top.message.trim()) {
    return top.message.trim();
  }

  const nested = unwrapPayload<any>(input);
  if (nested && typeof nested === "object" && typeof nested.message === "string") {
    return nested.message.trim();
  }

  return null;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await response.json();
      const message =
        extractMessage(json) ||
        (typeof (json as any)?.error === "string" ? (json as any).error : null) ||
        (typeof (json as any)?.details === "string"
          ? (json as any).details
          : null);

      if (message) return message;
    } else {
      const text = await response.text();
      if (text.trim()) return text.trim();
    }
  } catch {
    // ignore
  }

  if (response.status === 400) return "Invalid resume editor request.";
  if (response.status === 401) return "You are not authenticated. Please log in again.";
  if (response.status === 403) return "You do not have permission to access this resume version.";
  if (response.status === 404) return "Resume version not found.";
  return `Request failed with status ${response.status}.`;
}

function toSafeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function resolveVersionId(data?: ResumeEditorVersionData | null) {
  return data?.resumeVersionId ?? data?.versionId ?? data?.currentVersionId;
}

function normalizeStructuredContent(
  input: unknown
): Record<string, unknown> {
  if (!input) return {};

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  if (typeof input === "object") {
    return input as Record<string, unknown>;
  }

  return {};
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export default function useResumeEditor(
  options: UseResumeEditorOptions = {}
): UseResumeEditorResult {
  const {
    resumeId,
    versionId,

    autoLoad = true,
    autoLoadConfig = true,
    autoLoadVersion = true,

    configEndpoint,
    detailEndpoint,
    saveEndpoint,
    atsEndpoint,

    initialTitle = "",
    initialTemplateCode = "",
    initialSectionOrder = [],
    initialSections = {},

    onConfigLoaded,
    onVersionLoaded,
    onSaved,
  } = options;

  const resolvedResumeId = resumeId;
  const resolvedVersionId = versionId;

  const resolvedDetailEndpoint = useMemo(() => {
    if (detailEndpoint) return detailEndpoint;
    if (!resolvedResumeId || !resolvedVersionId) return "";
    return `${trimTrailingSlash(API_BASE_URL)}/api/user/resume/${resolvedResumeId}/versions/${resolvedVersionId}`;
  }, [detailEndpoint, resolvedResumeId, resolvedVersionId]);

  const resolvedSaveEndpoint = useMemo(() => {
    if (saveEndpoint) return saveEndpoint;
    if (!resolvedResumeId || !resolvedVersionId) return "";
    return `${trimTrailingSlash(API_BASE_URL)}/api/user/resume/${resolvedResumeId}/versions/${resolvedVersionId}/content`;
  }, [saveEndpoint, resolvedResumeId, resolvedVersionId]);

  const resolvedAtsEndpoint = useMemo(() => {
    if (atsEndpoint) return atsEndpoint;
    if (!resolvedResumeId || !resolvedVersionId) return "";
    return `${trimTrailingSlash(API_BASE_URL)}/api/user/resume/${resolvedResumeId}/versions/${resolvedVersionId}/ats-score`;
  }, [atsEndpoint, resolvedResumeId, resolvedVersionId]);

  const [config, setConfig] = useState<ResumeEditorConfig | null>(null);
  const [version, setVersion] = useState<ResumeEditorVersionData | null>(null);

  const [loading, setLoading] = useState(autoLoad);
  const [loadingConfig, setLoadingConfig] = useState(autoLoad && autoLoadConfig);
  const [loadingVersion, setLoadingVersion] = useState(autoLoad && autoLoadVersion);
  const [saving, setSaving] = useState(false);
  const [calculatingAts, setCalculatingAts] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [title, setTitle] = useState(initialTitle);
  const [templateCode, setTemplateCode] = useState(initialTemplateCode);
  const [sectionOrder, setSectionOrder] = useState<string[]>(initialSectionOrder);
  const [sections, setSections] = useState<ResumeEditorSectionState>(initialSections);
  const [rawText, setRawText] = useState("");
  const [atsScore, setAtsScore] = useState<number | null>(null);

  const [loadedSnapshot, setLoadedSnapshot] = useState<{
    title: string;
    templateCode: string;
    sectionOrder: string[];
    sections: ResumeEditorSectionState;
    rawText: string;
    atsScore: number | null;
  }>({
    title: initialTitle,
    templateCode: initialTemplateCode,
    sectionOrder: initialSectionOrder,
    sections: initialSections,
    rawText: "",
    atsScore: null,
  });

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const reloadConfig = useCallback(async (): Promise<ResumeEditorConfig | null> => {
    try {
      setLoadingConfig(true);
      clearMessages();

      const cfg = configEndpoint
        ? await (async () => {
            const token = getStoredToken();
            const response = await fetch(configEndpoint, {
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

            const raw = await response.json();
            const payload = unwrapPayload<ResumeEditorConfig>(raw);
            return payload;
          })()
        : await fetchResumeEditorConfig();

      if (!cfg) {
        throw new Error("Resume editor config is unavailable.");
      }

      setConfig(cfg);
      onConfigLoaded?.(cfg);

      setTemplateCode((prev) => {
        if (prev.trim()) return prev;
        return getDefaultResumeTemplate(cfg)?.code || "";
      });

      setSectionOrder((prev) => {
        if (Array.isArray(prev) && prev.length > 0) return prev;
        return [...cfg.defaults.defaultSectionOrder];
      });

      return cfg;
    } catch (err: any) {
      setError(err?.message || "Failed to load resume editor config.");
      return null;
    } finally {
      setLoadingConfig(false);
    }
  }, [clearMessages, configEndpoint, onConfigLoaded]);

  const reloadVersion = useCallback(async (): Promise<ResumeEditorVersionData | null> => {
    try {
      setLoadingVersion(true);
      clearMessages();

      if (!resolvedDetailEndpoint) {
        throw new Error("Resume version detail endpoint is not available.");
      }

      const token = getStoredToken();
      const response = await fetch(resolvedDetailEndpoint, {
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

      const raw = await response.json();
      const payload = unwrapPayload<ResumeEditorVersionData>(raw);

      if (!payload) {
        throw new Error("Resume version payload is empty.");
      }

      const normalizedSections = normalizeStructuredContent(
        payload.structuredContentJson
      );

      const nextTitle =
        payload.resumeName || payload.title || initialTitle || "My Resume";

      const nextTemplateCode =
        (normalizedSections.templateCode as string) ||
        templateCode ||
        config?.defaults.defaultTemplateCode ||
        "";

      const nextSectionOrder =
        (Array.isArray(payload.sectionOrder) && payload.sectionOrder.length > 0
          ? payload.sectionOrder
          : config?.defaults.defaultSectionOrder || initialSectionOrder) ?? [];

      const nextRawText = payload.rawText || "";
      const nextAtsScore = toSafeNumber(payload.atsScore);

      setVersion(payload);
      setTitle(nextTitle);
      setTemplateCode(nextTemplateCode);
      setSectionOrder([...nextSectionOrder]);
      setSections(normalizedSections);
      setRawText(nextRawText);
      setAtsScore(nextAtsScore);

      const snapshot = {
        title: nextTitle,
        templateCode: nextTemplateCode,
        sectionOrder: [...nextSectionOrder],
        sections: deepClone(normalizedSections),
        rawText: nextRawText,
        atsScore: nextAtsScore,
      };

      setLoadedSnapshot(snapshot);
      onVersionLoaded?.(payload, raw);

      const message = extractMessage(raw);
      if (message) setSuccessMessage(message);

      return payload;
    } catch (err: any) {
      setError(err?.message || "Failed to load resume version.");
      return null;
    } finally {
      setLoadingVersion(false);
    }
  }, [
    clearMessages,
    resolvedDetailEndpoint,
    initialTitle,
    templateCode,
    config,
    initialSectionOrder,
    onVersionLoaded,
  ]);

  const updateSection = useCallback((sectionKey: string, value: unknown) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: value,
    }));
  }, []);

  const buildSavePayload = useCallback((): ResumeEditorSavePayload => {
    const structured = {
      ...sections,
      templateCode,
    };

    return buildResumeEditorSavePayload({
      title,
      templateCode,
      sectionOrder,
      sections: structured,
    });
  }, [sections, templateCode, title, sectionOrder]);

  const saveVersion = useCallback(
    async (saveOptions?: {
      regeneratePreview?: boolean;
    }): Promise<ResumeEditorVersionData | null> => {
      try {
        setSaving(true);
        clearMessages();

        if (!resolvedSaveEndpoint) {
          throw new Error("Resume save endpoint is not available.");
        }

        const payload = buildSavePayload();

        const requestBody = {
          structuredContent: payload.sections,
          rawText,
          regeneratePreview: Boolean(saveOptions?.regeneratePreview ?? true),
        };

        const token = getStoredToken();
        const response = await fetch(resolvedSaveEndpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(await parseErrorMessage(response));
        }

        const raw = await response.json();
        const saved = unwrapPayload<ResumeEditorVersionData>(raw);

        if (!saved) {
          throw new Error("Saved resume version payload is empty.");
        }

        setVersion(saved);

        const snapshot = {
          title,
          templateCode,
          sectionOrder: [...sectionOrder],
          sections: deepClone(sections),
          rawText,
          atsScore,
        };

        setLoadedSnapshot(snapshot);

        const message = extractMessage(raw) || "Resume version saved successfully.";
        setSuccessMessage(message);
        onSaved?.(saved, raw);

        return saved;
      } catch (err: any) {
        setError(err?.message || "Failed to save resume version.");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [
      clearMessages,
      resolvedSaveEndpoint,
      buildSavePayload,
      rawText,
      title,
      templateCode,
      sectionOrder,
      sections,
      atsScore,
      onSaved,
    ]
  );

  const calculateAtsScore = useCallback(async (): Promise<number | null> => {
    try {
      setCalculatingAts(true);
      clearMessages();

      if (!resolvedAtsEndpoint) {
        throw new Error("ATS score endpoint is not available.");
      }

      const token = getStoredToken();
      const response = await fetch(resolvedAtsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          structuredContent: {
            ...sections,
            templateCode,
          },
          rawText,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const raw = await response.json();
      const payload = unwrapPayload<any>(raw);

      const nextScore =
        toSafeNumber(payload?.atsScore) ??
        toSafeNumber(payload?.score) ??
        toSafeNumber(payload);

      setAtsScore(nextScore);
      setSuccessMessage(extractMessage(raw) || "ATS score calculated successfully.");

      return nextScore;
    } catch (err: any) {
      setError(err?.message || "Failed to calculate ATS score.");
      return null;
    } finally {
      setCalculatingAts(false);
    }
  }, [clearMessages, resolvedAtsEndpoint, sections, templateCode, rawText]);

  const resetToLoadedState = useCallback(() => {
    setTitle(loadedSnapshot.title);
    setTemplateCode(loadedSnapshot.templateCode);
    setSectionOrder([...loadedSnapshot.sectionOrder]);
    setSections(deepClone(loadedSnapshot.sections));
    setRawText(loadedSnapshot.rawText);
    setAtsScore(loadedSnapshot.atsScore);
    clearMessages();
  }, [loadedSnapshot, clearMessages]);

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        if (autoLoadConfig) {
          await reloadConfig();
        }

        if (autoLoadVersion && resolvedDetailEndpoint) {
          await reloadVersion();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    autoLoad,
    autoLoadConfig,
    autoLoadVersion,
    reloadConfig,
    reloadVersion,
    resolvedDetailEndpoint,
  ]);

  useEffect(() => {
    if (!config) return;

    setSections((prev) => {
      const next = { ...prev };

      config.sections.forEach((section) => {
        if (!(section.key in next)) {
          next[section.key] = section.allowMultiple ? [] : "";
        }
      });

      return next;
    });

    setSectionOrder((prev) => {
      if (prev.length > 0) return prev;
      return [...config.defaults.defaultSectionOrder];
    });

    setTemplateCode((prev) => {
      if (prev.trim()) return prev;
      return getDefaultResumeTemplate(config)?.code || config.defaults.defaultTemplateCode;
    });
  }, [config]);

  const hasUnsavedChanges = useMemo(() => {
    const current = JSON.stringify({
      title,
      templateCode,
      sectionOrder,
      sections,
      rawText,
      atsScore,
    });

    const loaded = JSON.stringify(loadedSnapshot);
    return current !== loaded;
  }, [title, templateCode, sectionOrder, sections, rawText, atsScore, loadedSnapshot]);

  return {
    config,
    version,

    loading,
    loadingConfig,
    loadingVersion,
    saving,
    calculatingAts,

    error,
    successMessage,

    title,
    templateCode,
    sectionOrder,
    sections,
    rawText,
    atsScore,

    hasUnsavedChanges,

    setTitle,
    setTemplateCode,
    setSectionOrder,
    setSections,
    setRawText,
    setAtsScore,

    updateSection,
    resetToLoadedState,
    buildSavePayload,

    reloadConfig,
    reloadVersion,
    saveVersion,
    calculateAtsScore,

    clearMessages,
  };
}