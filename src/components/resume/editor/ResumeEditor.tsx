"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Sparkles,
  RotateCcw,
  Eye,
  Download,
  Copy,
  Wand2,
} from "lucide-react";

/**
 * ResumeEditor.tsx
 *
 * Backend-integrated Resume Editor
 *
 * Supported flows:
 * - Current resume editing
 * - Resume editing by resumeId
 * - Resume version editing by resumeId + versionId
 * - Save latest content to backend
 * - ATS score recalculation from backend
 * - Refresh backend content
 * - Preview / download / duplicate / tailor callbacks
 *
 * Project-aligned design:
 * - Backend-first flow
 * - ApiResponse/data/payload/result unwrapping
 * - Cookie auth + bearer token fallback
 * - Role-safe user/admin endpoint fallback
 * - Resume-version aware architecture
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type Primitive = string | number | boolean | null | undefined;

type GenericObject = Record<string, unknown>;

type ResumeEditorFetchData = {
  resumeId?: number | string;
  resumeVersionId?: number | string;
  versionId?: number | string;
  resumeName?: string;
  versionName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  structuredContentJson?: string;
  structuredContent?: Record<string, unknown> | null;
  fileUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  updatedAt?: string;
  createdAt?: string;
};

type ResumeEditorSaveResult = {
  resumeId?: number | string;
  resumeVersionId?: number | string;
  versionId?: number | string;
  resumeName?: string;
  versionName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  structuredContentJson?: string;
  updatedAt?: string;
};

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

type AtsResponse = {
  success?: boolean;
  message?: string;
  data?: {
    atsScore?: number;
    ats_score?: number;
    score?: number;
    tips?: string[];
    suggestions?: string[];
    recommendations?: string[];
  } | null;
  payload?: {
    atsScore?: number;
    ats_score?: number;
    score?: number;
    tips?: string[];
    suggestions?: string[];
    recommendations?: string[];
  } | null;
  result?: {
    atsScore?: number;
    ats_score?: number;
    score?: number;
    tips?: string[];
    suggestions?: string[];
    recommendations?: string[];
  } | null;
};

type ResumeEditorProps = {
  resumeId?: string | number;
  versionId?: string | number;
  value?: string;
  onChange?: (value: string) => void;
  autoFetch?: boolean;
  title?: string;
  subtitle?: string;
  saveLabel?: string;
  initialText?: string;
  onLoaded?: (data: ResumeEditorFetchData) => void;
  onSaved?: (data: ResumeEditorSaveResult) => void;
  onPreview?: (data: ResumeEditorFetchData | null) => void;
  onDownload?: (data: ResumeEditorFetchData | null) => void | Promise<void>;
  onDuplicate?: (data: ResumeEditorFetchData | null) => void;
  onTailor?: (data: ResumeEditorFetchData | null) => void;
  showHeader?: boolean;
  showMeta?: boolean;
  showTips?: boolean;
  showAtsButton?: boolean;
  showPreviewButton?: boolean;
  showDownloadButton?: boolean;
  showDuplicateButton?: boolean;
  showTailorButton?: boolean;
  showResetButton?: boolean;
  disabled?: boolean;
  className?: string;
  minHeightClassName?: string;
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

function formatDateTime(value?: string): string {
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
    if (normalized === "true") return true;
    if (normalized === "false") return false;
    if (normalized === "1") return true;
    if (normalized === "0") return false;
  }

  return undefined;
}

function safeParseJson(value?: string): Record<string, unknown> | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function unwrapApiPayload<T = unknown>(input: unknown): T | null {
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

function readStringArray(...values: unknown[]): string[] | undefined {
  for (const value of values) {
    if (Array.isArray(value)) {
      const normalized = value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim());

      if (normalized.length > 0) return normalized;
    }
  }
  return undefined;
}

function mapResumePayloadToEditorData(payload: unknown): ResumeEditorFetchData | null {
  if (!payload || typeof payload !== "object") return null;

  const unwrapped = unwrapApiPayload<GenericObject>(payload);
  if (!unwrapped || typeof unwrapped !== "object") return null;

  const root = payload as GenericObject;
  const data = unwrapped as GenericObject;

  const structuredContentJson = readString(
    data.structuredContentJson,
    data.structured_content_json,
    root.structuredContentJson,
    root.structured_content_json
  );

  const parsedStructuredContent =
    safeParseJson(structuredContentJson) ||
    (typeof data.structuredContent === "object" && data.structuredContent !== null
      ? (data.structuredContent as Record<string, unknown>)
      : typeof data.structured_content === "object" && data.structured_content !== null
      ? (data.structured_content as Record<string, unknown>)
      : null);

  const source =
    parsedStructuredContent && typeof parsedStructuredContent === "object"
      ? { ...data, ...parsedStructuredContent }
      : data;

  const mapped: ResumeEditorFetchData = {
    resumeId: readNumber(source.resumeId, source.resume_id, source.id),
    resumeVersionId: readNumber(
      source.resumeVersionId,
      source.resume_version_id,
      source.versionId,
      source.version_id,
      typeof source.resumeVersion === "object" && source.resumeVersion !== null
        ? (source.resumeVersion as any).id
        : undefined
    ),
    versionId: readNumber(
      source.versionId,
      source.version_id,
      source.resumeVersionId,
      source.resume_version_id,
      source.id
    ),
    resumeName: readString(
      source.resumeName,
      source.resume_name,
      source.name,
      source.title
    ),
    versionName: readString(source.versionName, source.version_name),
    fileName: readString(
      source.fileName,
      source.file_name,
      source.originalFileName,
      source.original_file_name,
      source.resumeFileName,
      source.resume_file_name
    ),
    atsScore: readNumber(source.atsScore, source.ats_score, source.score),
    rawText: readString(source.rawText, source.raw_text, source.content),
    structuredContentJson:
      structuredContentJson ||
      (parsedStructuredContent ? JSON.stringify(parsedStructuredContent) : undefined),
    structuredContent: parsedStructuredContent,
    fileUrl: readString(source.fileUrl, source.file_url),
    previewUrl: readString(source.previewUrl, source.preview_url),
    downloadUrl: readString(source.downloadUrl, source.download_url),
    versionCode: readString(source.versionCode, source.version_code),
    versionType: readString(source.versionType, source.version_type),
    isBaseVersion: normalizeBoolean(source.isBaseVersion ?? source.is_base_version),
    updatedAt: readString(source.updatedAt, source.updated_at),
    createdAt: readString(source.createdAt, source.created_at),
  };

  if (!mapped.resumeName && mapped.fileName) {
    mapped.resumeName = mapped.fileName;
  }

  const hasUsefulData =
    mapped.resumeId !== undefined ||
    mapped.resumeVersionId !== undefined ||
    mapped.versionId !== undefined ||
    Boolean(mapped.rawText) ||
    Boolean(mapped.structuredContentJson) ||
    Boolean(mapped.fileName) ||
    Boolean(mapped.resumeName);

  return hasUsefulData ? mapped : null;
}

function buildSavePayload(text: string, existing?: ResumeEditorFetchData | null) {
  return {
    rawText: text,
    raw_text: text,
    content: text,
    structuredContent: existing?.structuredContent ?? null,
    structured_content: existing?.structuredContent ?? null,
    structuredContentJson:
      existing?.structuredContentJson ??
      (existing?.structuredContent ? JSON.stringify(existing.structuredContent) : null),
    structured_content_json:
      existing?.structuredContentJson ??
      (existing?.structuredContent ? JSON.stringify(existing.structuredContent) : null),
    regeneratePreview: true,
  };
}

export default function ResumeEditor({
  resumeId,
  versionId,
  value,
  onChange,
  autoFetch = true,
  title = "Resume Editor",
  subtitle = "Edit and save resume content with backend integration.",
  saveLabel = "Save Changes",
  initialText = "",
  onLoaded,
  onSaved,
  onPreview,
  onDownload,
  onDuplicate,
  onTailor,
  showHeader = true,
  showMeta = true,
  showTips = true,
  showAtsButton = true,
  showPreviewButton = true,
  showDownloadButton = true,
  showDuplicateButton = false,
  showTailorButton = false,
  showResetButton = true,
  disabled = false,
  className = "",
  minHeightClassName = "min-h-[420px]",
}: ResumeEditorProps) {
  const [resumeData, setResumeData] = useState<ResumeEditorFetchData | null>(null);

  const [internalText, setInternalText] = useState(initialText);
  const [savedText, setSavedText] = useState(initialText);

  const [tips, setTips] = useState<string[]>([
    "Add measurable achievements and outcomes.",
    "Use keywords from the target job description.",
    "Keep formatting simple and ATS-friendly.",
    "Highlight projects, skills, and impact clearly.",
  ]);

  const [loading, setLoading] = useState(autoFetch);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const controlled = typeof onChange === "function";
  const editorText = controlled ? value ?? "" : internalText;

  const setEditorText = useCallback(
    (next: string) => {
      if (controlled) {
        onChange?.(next);
      } else {
        setInternalText(next);
      }
    },
    [controlled, onChange]
  );

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
    const ats: string[] = [];
    const preview: string[] = [];
    const download: string[] = [];

    if (rid && vid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}`,
        `${API_BASE_URL}/api/user/resume/version/${vid}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/content`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/content`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/content`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/content`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/content`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/content`
      );

      ats.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/ats-score`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/ats-score`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/ats-score`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/ats-score`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/ats-score`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/ats-score`
      );

      preview.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/preview`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/preview`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/preview`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/preview`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/preview`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/preview`
      );

      download.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}/download`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}/download`,
        `${API_BASE_URL}/api/user/resume/version/${vid}/download`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}/download`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}/download`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}/download`
      );
    } else if (rid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest`,
        `${API_BASE_URL}/api/admin/resume/${rid}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/${rid}/content`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/content`,
        `${API_BASE_URL}/api/admin/resume/${rid}/content`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/content`
      );

      ats.push(
        `${API_BASE_URL}/api/user/resume/${rid}/ats-score`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/ats-score`,
        `${API_BASE_URL}/api/admin/resume/${rid}/ats-score`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/ats-score`
      );

      preview.push(
        `${API_BASE_URL}/api/user/resume/${rid}/preview`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/preview`,
        `${API_BASE_URL}/api/admin/resume/${rid}/preview`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/preview`
      );

      download.push(
        `${API_BASE_URL}/api/user/resume/${rid}/download`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest/download`,
        `${API_BASE_URL}/api/admin/resume/${rid}/download`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest/download`
      );
    } else {
      get.push(
        `${API_BASE_URL}/api/user/resume/current`,
        `${API_BASE_URL}/api/user/resume/current/details`,
        `${API_BASE_URL}/api/user/resume/latest`,
        `${API_BASE_URL}/api/admin/resume/current`,
        `${API_BASE_URL}/api/admin/resume/latest`
      );

      save.push(
        `${API_BASE_URL}/api/user/resume/current/content`,
        `${API_BASE_URL}/api/user/resume/latest/content`,
        `${API_BASE_URL}/api/admin/resume/current/content`,
        `${API_BASE_URL}/api/admin/resume/latest/content`
      );

      ats.push(
        `${API_BASE_URL}/api/user/resume/current/ats-score`,
        `${API_BASE_URL}/api/user/resume/latest/ats-score`,
        `${API_BASE_URL}/api/admin/resume/current/ats-score`,
        `${API_BASE_URL}/api/admin/resume/latest/ats-score`
      );

      preview.push(
        `${API_BASE_URL}/api/user/resume/current/preview`,
        `${API_BASE_URL}/api/user/resume/latest/preview`,
        `${API_BASE_URL}/api/admin/resume/current/preview`,
        `${API_BASE_URL}/api/admin/resume/latest/preview`
      );

      download.push(
        `${API_BASE_URL}/api/user/resume/current/download`,
        `${API_BASE_URL}/api/user/resume/latest/download`,
        `${API_BASE_URL}/api/admin/resume/current/download`,
        `${API_BASE_URL}/api/admin/resume/latest/download`
      );
    }

    return { get, save, ats, preview, download };
  }, [resumeId, versionId]);

  const hasUnsavedChanges = useMemo(() => editorText !== savedText, [editorText, savedText]);

  const hydrateData = useCallback(
    (nextData?: ResumeEditorFetchData | null) => {
      if (!nextData) return;

      const hydrated: ResumeEditorFetchData = {
        ...nextData,
        previewUrl: nextData.previewUrl || endpointCandidates.preview[0],
        downloadUrl:
          nextData.downloadUrl ||
          nextData.fileUrl ||
          endpointCandidates.download[0],
      };

      setResumeData(hydrated);

      const text = hydrated.rawText || "";
      setEditorText(text);
      setSavedText(text);

      if (typeof window !== "undefined" && hydrated.fileName) {
        localStorage.setItem("userResumeName", hydrated.fileName);
      }

      onLoaded?.(hydrated);
    },
    [endpointCandidates.download, endpointCandidates.preview, onLoaded, setEditorText]
  );

  const fetchResume = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        let resolved: ResumeEditorFetchData | null = null;

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
            const mapped = mapResumePayloadToEditorData(result);

            if (!mapped) continue;

            resolved = mapped;
            break;
          } catch {
            continue;
          }
        }

        if (!resolved) {
          throw new Error("Resume content not found.");
        }

        hydrateData(resolved);
      } catch (error) {
        console.error("ResumeEditor fetch error:", error);
        setErrorMessage("Unable to load resume data from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders, endpointCandidates.get, hydrateData]
  );

  useEffect(() => {
    if (!autoFetch) return;
    fetchResume();
  }, [autoFetch, fetchResume]);

  const handleSave = useCallback(async () => {
    if (!editorText.trim()) {
      setErrorMessage("Resume content cannot be empty.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      let saveSucceeded = false;
      let savedResult: ResumeEditorFetchData | null = null;
      let responseMessage = "Resume content saved successfully.";

      const payload = buildSavePayload(editorText, resumeData);

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
              const mapped = mapResumePayloadToEditorData(result);
              if (mapped) {
                savedResult = {
                  ...mapped,
                  rawText: mapped.rawText || editorText,
                };
              }

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
        throw new Error("Failed to save resume content.");
      }

      const finalData: ResumeEditorFetchData =
        savedResult ||
        ({
          ...resumeData,
          rawText: editorText,
        } as ResumeEditorFetchData);

      setResumeData(finalData);
      setSavedText(editorText);
      setSuccessMessage(responseMessage);

      onSaved?.({
        ...finalData,
        rawText: editorText,
      });
    } catch (error) {
      console.error("ResumeEditor save error:", error);
      setErrorMessage("Failed to save resume content.");
    } finally {
      setSaving(false);
    }
  }, [authHeaders, editorText, endpointCandidates.save, onSaved, resumeData]);

  const handleCalculateAts = useCallback(async () => {
    if (!editorText.trim()) {
      setErrorMessage("Resume content is empty.");
      return;
    }

    try {
      setScoring(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      let calculated = false;
      let nextScore: number | undefined;
      let nextTips: string[] | undefined;
      let responseMessage = "ATS score calculated successfully.";

      const body = JSON.stringify({
        rawText: editorText,
        raw_text: editorText,
        content: editorText,
      });

      for (const endpoint of endpointCandidates.ats) {
        for (const method of ["POST", "PUT"] as const) {
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
              const root = result as AtsResponse;
              const payload =
                root.data || root.payload || root.result || (result as GenericObject);

              const message = readMessage(result);
              if (message) {
                responseMessage = message;
              }

              if (payload && typeof payload === "object") {
                nextScore = readNumber(
                  payload.atsScore,
                  payload.ats_score,
                  payload.score
                );

                nextTips = readStringArray(
                  payload.tips,
                  payload.suggestions,
                  payload.recommendations
                );
              }
            }

            calculated = true;
            break;
          } catch {
            continue;
          }
        }

        if (calculated) break;
      }

      if (!calculated) {
        throw new Error("Failed to calculate ATS.");
      }

      if (typeof nextScore === "number") {
        setResumeData((prev) => ({
          ...(prev || {}),
          atsScore: nextScore,
        }));
      }

      if (nextTips && nextTips.length > 0) {
        setTips(nextTips);
      }

      setSuccessMessage(responseMessage);
    } catch (error) {
      console.error("ResumeEditor ATS error:", error);
      setErrorMessage("Failed to calculate ATS score.");
    } finally {
      setScoring(false);
    }
  }, [authHeaders, editorText, endpointCandidates.ats]);

  const handleDownload = useCallback(async () => {
    if (onDownload) {
      await onDownload(resumeData);
      return;
    }

    try {
      setDownloading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const targetUrl =
        resumeData?.downloadUrl ||
        resumeData?.fileUrl ||
        endpointCandidates.download[0];

      if (!targetUrl) {
        throw new Error("Download URL not available.");
      }

      const token = getStoredToken();

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to download resume. Status: ${response.status}`);
      }

      const blob = await response.blob();
      const fileExtension =
        blob.type === "application/pdf"
          ? "pdf"
          : blob.type.includes("word")
          ? "docx"
          : "txt";

      const fileName =
        resumeData?.fileName ||
        resumeData?.resumeName ||
        `resume.${fileExtension}`;

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage("Resume downloaded successfully.");
    } catch (error) {
      console.error("ResumeEditor download error:", error);
      setErrorMessage("Failed to download resume.");
    } finally {
      setDownloading(false);
    }
  }, [endpointCandidates.download, onDownload, resumeData]);

  const handlePreview = useCallback(() => {
    if (onPreview) {
      onPreview(resumeData);
      return;
    }

    const previewUrl =
      resumeData?.previewUrl || resumeData?.fileUrl || endpointCandidates.preview[0];

    if (!previewUrl) {
      setErrorMessage("Preview URL not available.");
      return;
    }

    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }, [endpointCandidates.preview, onPreview, resumeData]);

  const handleReset = useCallback(() => {
    setEditorText(savedText);
    setErrorMessage(null);
    setSuccessMessage("Editor reset to last saved content.");
  }, [savedText, setEditorText]);

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl backdrop-blur-xl ${className}`}
    >
      <div className="p-6">
        {showHeader && (
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
                <FileText size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-sm text-white/55">{subtitle}</p>

                {showMeta && resumeData && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {resumeData.resumeName && (
                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-white/80">
                        {resumeData.resumeName}
                      </span>
                    )}

                    {resumeData.versionName && (
                      <span className="rounded-full border border-indigo-400/20 bg-indigo-500/15 px-3 py-1 text-indigo-100">
                        {resumeData.versionName}
                      </span>
                    )}

                    {typeof resumeData.atsScore === "number" && (
                      <span className="rounded-full border border-green-400/20 bg-green-500/15 px-3 py-1 text-green-100">
                        ATS {resumeData.atsScore}%
                      </span>
                    )}

                    {resumeData.versionType && (
                      <span className="rounded-full border border-purple-400/20 bg-purple-500/15 px-3 py-1 text-purple-100">
                        {resumeData.versionType}
                      </span>
                    )}

                    {resumeData.isBaseVersion && (
                      <span className="rounded-full border border-blue-400/20 bg-blue-500/15 px-3 py-1 text-blue-100">
                        Base Version
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => fetchResume(true)}
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

              {showPreviewButton && (
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={disabled}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Eye size={16} />
                  Preview
                </button>
              )}

              {showDownloadButton && (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={disabled || downloading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {downloading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  Download
                </button>
              )}
            </div>
          </div>
        )}

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
            <p className="text-sm text-white/60">Loading resume content...</p>
          </div>
        ) : (
          <>
            {showMeta && resumeData && (
              <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">File Name</p>
                  <p className="break-all text-sm font-semibold text-white/85">
                    {resumeData.fileName || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">Updated At</p>
                  <p className="text-sm font-semibold text-white/85">
                    {formatDateTime(resumeData.updatedAt || resumeData.createdAt)}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-1 text-xs text-white/45">Unsaved Changes</p>
                  <p className="text-sm font-semibold text-white/85">
                    {hasUnsavedChanges ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            )}

            <textarea
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              disabled={disabled}
              className={`w-full resize-y rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60 ${minHeightClassName}`}
              placeholder="Edit your resume content here..."
            />

            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-white/50">
                  {hasUnsavedChanges
                    ? "You have unsaved changes."
                    : "All changes are saved."}
                </div>

                <div className="flex flex-wrap gap-3">
                  {showResetButton && (
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled={disabled || !hasUnsavedChanges}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      Reset
                    </button>
                  )}

                  {showAtsButton && (
                    <button
                      type="button"
                      onClick={handleCalculateAts}
                      disabled={disabled || scoring || !editorText.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-green-500 to-blue-600 px-4 py-2.5 font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {scoring ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Calculate ATS
                        </>
                      )}
                    </button>
                  )}

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
                        {saveLabel}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {(showDuplicateButton || showTailorButton) && (
                <div className="flex flex-wrap gap-3">
                  {showDuplicateButton && (
                    <button
                      type="button"
                      onClick={() => onDuplicate?.(resumeData)}
                      disabled={disabled}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Copy size={16} />
                      Duplicate
                    </button>
                  )}

                  {showTailorButton && (
                    <button
                      type="button"
                      onClick={() => onTailor?.(resumeData)}
                      disabled={disabled}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Wand2 size={16} />
                      Tailor
                    </button>
                  )}
                </div>
              )}

              {showTips && tips.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-300" />
                    <h3 className="text-sm font-semibold text-white/90">
                      Improvement Tips
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {tips.map((tip, index) => (
                      <div
                        key={`${tip}-${index}`}
                        className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                      >
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-white/40" />
                        <p className="text-sm text-white/70">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}