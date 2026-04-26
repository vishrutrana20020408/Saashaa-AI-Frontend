"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Sparkles,
} from "lucide-react";

/**
 * DuplicateResumeModal.tsx
 *
 * Backend Integrated Duplicate Resume Modal
 *
 * Purpose:
 * - Open as a modal from resume pages
 * - Fetch source resume/version info if needed
 * - Create a duplicate resume version from backend
 *
 * Architecture aligned with latest project update:
 * - backend-first
 * - supports ApiResponse wrappers (data / payload / result)
 * - credentials: "include"
 * - bearer token fallback
 * - resilient endpoint fallback
 * - user/admin compatible fetch/create strategy
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type GenericObject = Record<string, unknown>;

type ResumeSourceData = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  versionName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  versionCode?: string;
  versionType?: string;
  updatedAt?: string;
};

type DuplicateResumeResponseData = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  versionName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  updatedAt?: string;
};

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

export type DuplicateResumeModalResult = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  versionName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  updatedAt?: string;
};

type DuplicateResumeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: DuplicateResumeModalResult) => void;
  resumeId?: string | number;
  versionId?: string | number;
  title?: string;
  submitLabel?: string;
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

function normalizeResumeSourceData(input: unknown): ResumeSourceData | null {
  if (!input || typeof input !== "object") return null;

  const payload = unwrapPayload<GenericObject>(input);
  if (!payload || typeof payload !== "object") return null;

  const source = payload as GenericObject;

  const normalized: ResumeSourceData = {
    resumeId: readNumber(source.resumeId, source.resume_id, source.id),
    resumeVersionId: readNumber(
      source.resumeVersionId,
      source.resume_version_id,
      source.versionId,
      source.version_id
    ),
    versionId: readNumber(
      source.versionId,
      source.version_id,
      source.resumeVersionId,
      source.resume_version_id
    ),
    resumeName: readString(source.resumeName, source.resume_name, source.name, source.title),
    versionName: readString(source.versionName, source.version_name),
    fileName: readString(
      source.fileName,
      source.file_name,
      source.originalFileName,
      source.original_file_name
    ),
    atsScore: readNumber(source.atsScore, source.ats_score, source.score),
    rawText: readString(source.rawText, source.raw_text, source.content),
    versionCode: readString(source.versionCode, source.version_code),
    versionType: readString(source.versionType, source.version_type),
    updatedAt: readString(source.updatedAt, source.updated_at),
  };

  const hasUsefulData =
    normalized.resumeId !== undefined ||
    normalized.resumeVersionId !== undefined ||
    normalized.versionId !== undefined ||
    Boolean(normalized.resumeName) ||
    Boolean(normalized.versionName) ||
    Boolean(normalized.fileName) ||
    Boolean(normalized.rawText);

  return hasUsefulData ? normalized : null;
}

function normalizeDuplicateResult(input: unknown): DuplicateResumeModalResult | null {
  if (!input || typeof input !== "object") return null;

  const payload = unwrapPayload<GenericObject>(input);
  if (!payload || typeof payload !== "object") return null;

  const source = payload as GenericObject;

  const normalized: DuplicateResumeModalResult = {
    resumeId: readNumber(source.resumeId, source.resume_id, source.id),
    resumeVersionId: readNumber(
      source.resumeVersionId,
      source.resume_version_id,
      source.versionId,
      source.version_id
    ),
    versionId: readNumber(
      source.versionId,
      source.version_id,
      source.resumeVersionId,
      source.resume_version_id
    ),
    resumeName: readString(source.resumeName, source.resume_name, source.name, source.title),
    versionName: readString(source.versionName, source.version_name),
    fileName: readString(
      source.fileName,
      source.file_name,
      source.originalFileName,
      source.original_file_name
    ),
    atsScore: readNumber(source.atsScore, source.ats_score, source.score),
    rawText: readString(source.rawText, source.raw_text, source.content),
    versionCode: readString(source.versionCode, source.version_code),
    versionType: readString(source.versionType, source.version_type),
    isBaseVersion: normalizeBoolean(source.isBaseVersion ?? source.is_base_version),
    updatedAt: readString(source.updatedAt, source.updated_at),
  };

  const hasUsefulData =
    normalized.resumeId !== undefined ||
    normalized.resumeVersionId !== undefined ||
    Boolean(normalized.resumeName) ||
    Boolean(normalized.fileName) ||
    Boolean(normalized.versionCode);

  return hasUsefulData ? normalized : null;
}

function buildDuplicatePayload(params: {
  sourceData: ResumeSourceData;
  newVersionName: string;
  duplicateReason: string;
  duplicateNotes: string;
}) {
  const sourceResumeId = params.sourceData.resumeId ?? null;
  const sourceResumeVersionId =
    params.sourceData.resumeVersionId ?? params.sourceData.versionId ?? null;

  return {
    sourceResumeId,
    sourceResumeVersionId,
    resumeId: sourceResumeId,
    resumeVersionId: sourceResumeVersionId,
    sourceVersionId: sourceResumeVersionId,
    newVersionName: params.newVersionName.trim(),
    versionName: params.newVersionName.trim(),
    duplicateReason: params.duplicateReason.trim(),
    reason: params.duplicateReason.trim(),
    duplicateNotes: params.duplicateNotes.trim(),
    notes: params.duplicateNotes.trim(),
    versionType: "DUPLICATE",
    generatePreview: true,
    copyStructuredContent: true,
    copyRawText: true,
  };
}

export default function DuplicateResumeModal({
  isOpen,
  onClose,
  onSuccess,
  resumeId,
  versionId,
  title = "Create Duplicate Resume",
  submitLabel = "Create Duplicate",
}: DuplicateResumeModalProps) {
  const [sourceData, setSourceData] = useState<ResumeSourceData | null>(null);

  const [newVersionName, setNewVersionName] = useState("");
  const [duplicateReason, setDuplicateReason] = useState("");
  const [duplicateNotes, setDuplicateNotes] = useState("");

  const [loadingSource, setLoadingSource] = useState(false);
  const [creatingDuplicate, setCreatingDuplicate] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authHeaders = useMemo<HeadersInit>(() => {
    const token = getStoredToken();

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const sourceEndpointCandidates = useMemo(() => {
    const rid =
      resumeId !== undefined && resumeId !== null ? String(resumeId) : undefined;
    const vid =
      versionId !== undefined && versionId !== null ? String(versionId) : undefined;

    const get: string[] = [];

    if (rid && vid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}/versions/${vid}`,
        `${API_BASE_URL}/api/user/resume/${rid}/version/${vid}`,
        `${API_BASE_URL}/api/user/resume/version/${vid}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/versions/${vid}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/version/${vid}`,
        `${API_BASE_URL}/api/admin/resume/version/${vid}`
      );
    } else if (rid) {
      get.push(
        `${API_BASE_URL}/api/user/resume/${rid}`,
        `${API_BASE_URL}/api/user/resume/${rid}/latest`,
        `${API_BASE_URL}/api/admin/resume/${rid}`,
        `${API_BASE_URL}/api/admin/resume/${rid}/latest`
      );
    } else {
      get.push(
        `${API_BASE_URL}/api/user/resume/current`,
        `${API_BASE_URL}/api/user/resume/latest`,
        `${API_BASE_URL}/api/admin/resume/current`,
        `${API_BASE_URL}/api/admin/resume/latest`
      );
    }

    return get;
  }, [resumeId, versionId]);

  const duplicateEndpointCandidates = useMemo(
    () => [
      `${API_BASE_URL}/api/user/resume/duplicate`,
      `${API_BASE_URL}/api/user/resume/version/duplicate`,
      `${API_BASE_URL}/api/user/resume/versions/duplicate`,
      `${API_BASE_URL}/api/admin/resume/duplicate`,
      `${API_BASE_URL}/api/admin/resume/version/duplicate`,
    ],
    []
  );

  useEffect(() => {
    if (!isOpen) return;

    const fetchSourceResume = async () => {
      try {
        setLoadingSource(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        let resolvedSource: ResumeSourceData | null = null;

        for (const endpoint of sourceEndpointCandidates) {
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
            const mapped = normalizeResumeSourceData(result);

            if (!mapped) continue;
            resolvedSource = mapped;
            break;
          } catch {
            continue;
          }
        }

        if (!resolvedSource) {
          throw new Error("Source resume not found.");
        }

        setSourceData(resolvedSource);

        const autoName =
          resolvedSource.versionName ||
          resolvedSource.resumeName ||
          resolvedSource.fileName ||
          "Resume";

        setNewVersionName(`${autoName} Copy`);
      } catch (error) {
        console.error("Fetch duplicate source error:", error);
        setErrorMessage("Unable to load source resume from backend.");
        setSourceData(null);
      } finally {
        setLoadingSource(false);
      }
    };

    fetchSourceResume();
  }, [isOpen, sourceEndpointCandidates, authHeaders]);

  useEffect(() => {
    if (!isOpen) {
      setSourceData(null);
      setNewVersionName("");
      setDuplicateReason("");
      setDuplicateNotes("");
      setLoadingSource(false);
      setCreatingDuplicate(false);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (creatingDuplicate) return;
    onClose();
  }, [creatingDuplicate, onClose]);

  const validateForm = useCallback(() => {
    if (!sourceData?.resumeId) {
      setErrorMessage("No source resume available for duplication.");
      return false;
    }

    if (!newVersionName.trim()) {
      setErrorMessage("New version name is required.");
      return false;
    }

    return true;
  }, [newVersionName, sourceData]);

  const handleCreateDuplicate = useCallback(async () => {
    if (!validateForm() || !sourceData) return;

    try {
      setCreatingDuplicate(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload = buildDuplicatePayload({
        sourceData,
        newVersionName,
        duplicateReason,
        duplicateNotes,
      });

      let createSucceeded = false;
      let resolvedResult: DuplicateResumeModalResult | null = null;
      let responseMessage = "Resume duplicate created successfully.";

      for (const endpoint of duplicateEndpointCandidates) {
        for (const method of ["POST", "PUT"] as const) {
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
              resolvedResult = normalizeDuplicateResult(result);

              const message = readMessage(result);
              if (message) {
                responseMessage = message;
              }
            }

            createSucceeded = true;
            break;
          } catch {
            continue;
          }
        }

        if (createSucceeded) break;
      }

      if (!createSucceeded) {
        throw new Error("Failed to create duplicate.");
      }

      if (!resolvedResult) {
        resolvedResult = {
          resumeId: sourceData.resumeId,
          resumeVersionId: sourceData.resumeVersionId ?? sourceData.versionId,
          versionId: sourceData.resumeVersionId ?? sourceData.versionId,
          resumeName: newVersionName.trim(),
          fileName: sourceData.fileName,
          atsScore: sourceData.atsScore,
          rawText: sourceData.rawText,
          versionType: "DUPLICATE",
          updatedAt: new Date().toISOString(),
        };
      }

      if (resolvedResult.fileName && typeof window !== "undefined") {
        localStorage.setItem("userResumeName", resolvedResult.fileName);
      }

      setSuccessMessage(responseMessage);
      onSuccess?.(resolvedResult);
    } catch (error) {
      console.error("Create duplicate error:", error);
      setErrorMessage("Failed to create duplicate resume from backend.");
    } finally {
      setCreatingDuplicate(false);
    }
  }, [
    authHeaders,
    duplicateEndpointCandidates,
    duplicateNotes,
    duplicateReason,
    newVersionName,
    onSuccess,
    sourceData,
    validateForm,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0f172a] text-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-blue-500 to-purple-600 shadow-lg">
              <Copy size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="text-sm text-white/55">
                Create a new duplicate resume version from backend data
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={creatingDuplicate}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
          {successMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
              <CheckCircle2 size={18} className="mt-0.5 text-green-300" />
              <p className="text-sm text-green-100">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <AlertCircle size={18} className="mt-0.5 text-red-300" />
              <p className="text-sm text-red-100">{errorMessage}</p>
            </div>
          )}

          {loadingSource ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-8">
              <Loader2 className="animate-spin text-indigo-300" size={28} />
              <p className="text-sm text-white/60">Loading source resume...</p>
            </div>
          ) : sourceData ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-indigo-300" />
                  <h3 className="text-base font-semibold">Source Resume</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="mb-1 text-xs text-white/45">Resume Name</p>
                    <p className="wrap-break-word text-sm font-semibold text-white/85">
                      {sourceData.resumeName || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="mb-1 text-xs text-white/45">Version Name</p>
                    <p className="wrap-break-word text-sm font-semibold text-white/85">
                      {sourceData.versionName || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="mb-1 text-xs text-white/45">File Name</p>
                    <p className="break-all text-sm font-semibold text-white/85">
                      {sourceData.fileName || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="mb-1 text-xs text-white/45">ATS Score</p>
                    <p className="text-lg font-bold text-emerald-300">
                      {sourceData.atsScore ?? 0}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="mb-1 text-xs text-white/45">Version Code</p>
                    <p className="text-sm font-semibold text-white/85">
                      {sourceData.versionCode || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <p className="mb-1 text-xs text-white/45">Version Type</p>
                    <p className="text-sm font-semibold text-white/85">
                      {sourceData.versionType || "N/A"}
                    </p>
                  </div>
                </div>

                {sourceData.updatedAt && (
                  <p className="mt-4 text-xs text-white/45">
                    Last updated: {formatDateTime(sourceData.updatedAt)}
                  </p>
                )}
              </div>

              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-300" />
                  <h3 className="text-base font-semibold">Duplicate Details</h3>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    New Version Name
                  </label>
                  <input
                    type="text"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    placeholder="e.g. Backend Developer Copy"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Duplicate Reason
                  </label>
                  <input
                    type="text"
                    value={duplicateReason}
                    onChange={(e) => setDuplicateReason(e.target.value)}
                    placeholder="Why are you creating this duplicate?"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Notes
                  </label>
                  <textarea
                    value={duplicateNotes}
                    onChange={(e) => setDuplicateNotes(e.target.value)}
                    placeholder="Optional notes for this duplicate version..."
                    className="min-h-30 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {sourceData.rawText && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h3 className="mb-3 text-base font-semibold">Source Text Preview</h3>
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-4">
                    <pre className="whitespace-pre-wrap wrap-break-word font-sans text-xs text-white/65">
                      {sourceData.rawText}
                    </pre>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className="flex flex-col justify-end gap-3 border-t border-white/10 bg-white/5 p-6 sm:flex-row">
          <button
            type="button"
            onClick={handleClose}
            disabled={creatingDuplicate}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-50 sm:w-auto"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleCreateDuplicate}
            disabled={loadingSource || creatingDuplicate || !sourceData}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {creatingDuplicate ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Copy size={18} />
                {submitLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}