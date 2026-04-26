"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Save,
  Eye,
  Sparkles,
  Files,
  Tag,
  GitBranch,
  CalendarDays,
} from "lucide-react";

/**
 * src/app/(public)/user/resume/[resumeId]/create-duplicate/page.tsx
 *
 * Backend-integrated Resume Duplicate Creation Page
 *
 * Latest project alignment:
 * - route-aware duplicate creation from a specific resume
 * - backend-first frontend structure
 * - resilient request / response normalization
 * - token + cookie aware requests
 * - compatible with resume + resume version architecture
 *
 * Supported backend patterns:
 * GET  /api/user/resume/{resumeId}
 * GET  /api/user/resume/current                          (fallback)
 * POST /api/user/resume/{resumeId}/duplicate
 * POST /api/user/resume/duplicate
 * POST /api/user/resume/{resumeId}/create-duplicate
 * POST /api/user/resume/create-duplicate
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  getResumeById: (resumeId: string) =>
    `${API_BASE_URL}/api/user/resume/${resumeId}`,

  getCurrentResume: `${API_BASE_URL}/api/user/resume/current`,

  createDuplicateCandidates: (resumeId: string) => [
    `${API_BASE_URL}/api/user/resume/${resumeId}/duplicate`,
    `${API_BASE_URL}/api/user/resume/duplicate`,
    `${API_BASE_URL}/api/user/resume/${resumeId}/create-duplicate`,
    `${API_BASE_URL}/api/user/resume/create-duplicate`,
  ],
};

type ResumeDetail = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  structuredContentJson?: string;
  fileUrl?: string;
  previewUrl?: string;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  parentVersionId?: number | null;
  updatedAt?: string;
  createdAt?: string;
};

type DuplicateVersionDetail = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  versionName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  structuredContentJson?: string;
  fileUrl?: string;
  previewUrl?: string;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  parentVersionId?: number | null;
  jobApplicationCode?: string | null;
  updatedAt?: string;
  createdAt?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

type DuplicateRequestPayload = {
  sourceResumeId?: number | string;
  sourceResumeVersionId?: number | null;
  parentVersionId?: number | null;
  newVersionName: string;
  versionName?: string;
  duplicateReason?: string;
  duplicateNotes?: string;
  rawText?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  baseVersion?: boolean;
};

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("accessToken")
  );
}

function buildAuthHeaders(includeJson = true): HeadersInit {
  const token = getStoredToken();

  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null): T | null {
  if (!json) return null;
  const envelope = json as ApiEnvelope<T>;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(
  value: unknown,
  fallback?: number
): number | undefined {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    return lower === "true" || lower === "1" || lower === "yes";
  }
  return false;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeResumeDetail(raw: any): ResumeDetail | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    resumeId:
      normalizeNumber(raw.resumeId) ??
      normalizeNumber(raw.id) ??
      normalizeNumber(raw.resume?.resumeId) ??
      normalizeNumber(raw.resume?.id),

    resumeVersionId:
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.currentVersionId),

    versionId:
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.currentVersionId),

    resumeName:
      normalizeString(raw.resumeName) ||
      normalizeString(raw.name) ||
      normalizeString(raw.resumeTitle),

    fileName:
      normalizeString(raw.fileName) ||
      normalizeString(raw.originalFileName) ||
      normalizeString(raw.documentName),

    atsScore:
      normalizeNumber(raw.atsScore) ??
      normalizeNumber(raw.score) ??
      normalizeNumber(raw.ats) ??
      0,

    rawText:
      normalizeString(raw.rawText) ||
      normalizeString(raw.contentText) ||
      normalizeString(raw.textContent) ||
      normalizeString(raw.content),

    structuredContentJson:
      normalizeString(raw.structuredContentJson) ||
      normalizeString(raw.structuredContent) ||
      normalizeString(raw.structuredJson),

    fileUrl:
      normalizeString(raw.fileUrl) ||
      normalizeString(raw.downloadUrl) ||
      normalizeString(raw.filePath),

    previewUrl:
      normalizeString(raw.previewUrl) ||
      normalizeString(raw.previewFileUrl),

    versionCode: normalizeString(raw.versionCode),
    versionType: normalizeString(raw.versionType),

    isBaseVersion: normalizeBoolean(
      raw.isBaseVersion ?? raw.baseVersion ?? raw.isBase
    ),

    parentVersionId: normalizeNumber(raw.parentVersionId, null as never) ?? null,

    updatedAt:
      normalizeString(raw.updatedAt) ||
      normalizeString(raw.lastModifiedAt) ||
      normalizeString(raw.modifiedAt) ||
      normalizeString(raw.createdAt),

    createdAt:
      normalizeString(raw.createdAt) ||
      normalizeString(raw.uploadedAt) ||
      normalizeString(raw.generatedAt),
  };
}

function normalizeDuplicateVersion(raw: any): DuplicateVersionDetail | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    resumeId:
      normalizeNumber(raw.resumeId) ??
      normalizeNumber(raw.parentResumeId) ??
      normalizeNumber(raw.resume?.resumeId) ??
      normalizeNumber(raw.resume?.id),

    resumeVersionId:
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.id),

    versionId:
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.id),

    resumeName:
      normalizeString(raw.resumeName) ||
      normalizeString(raw.resumeTitle) ||
      normalizeString(raw.resume?.resumeName) ||
      normalizeString(raw.resume?.name),

    versionName:
      normalizeString(raw.versionName) ||
      normalizeString(raw.name) ||
      normalizeString(raw.title),

    fileName:
      normalizeString(raw.fileName) ||
      normalizeString(raw.originalFileName) ||
      normalizeString(raw.documentName),

    atsScore:
      normalizeNumber(raw.atsScore) ??
      normalizeNumber(raw.score) ??
      normalizeNumber(raw.ats) ??
      0,

    rawText:
      normalizeString(raw.rawText) ||
      normalizeString(raw.contentText) ||
      normalizeString(raw.textContent) ||
      normalizeString(raw.content),

    structuredContentJson:
      normalizeString(raw.structuredContentJson) ||
      normalizeString(raw.structuredContent) ||
      normalizeString(raw.structuredJson),

    fileUrl:
      normalizeString(raw.fileUrl) ||
      normalizeString(raw.downloadUrl) ||
      normalizeString(raw.filePath),

    previewUrl:
      normalizeString(raw.previewUrl) ||
      normalizeString(raw.previewFileUrl),

    versionCode: normalizeString(raw.versionCode),
    versionType: normalizeString(raw.versionType),

    isBaseVersion: normalizeBoolean(
      raw.isBaseVersion ?? raw.baseVersion ?? raw.isBase
    ),

    parentVersionId: normalizeNumber(raw.parentVersionId, null as never) ?? null,

    jobApplicationCode:
      normalizeString(raw.jobApplicationCode) ||
      normalizeString(raw.applicationCode) ||
      null,

    updatedAt:
      normalizeString(raw.updatedAt) ||
      normalizeString(raw.lastModifiedAt) ||
      normalizeString(raw.modifiedAt),

    createdAt:
      normalizeString(raw.createdAt) ||
      normalizeString(raw.uploadedAt) ||
      normalizeString(raw.generatedAt),
  };
}

export default function ResumeCreateDuplicatePage() {
  const router = useRouter();
  const params = useParams<{ resumeId: string }>();

  const resumeId = String(params?.resumeId || "");

  const [currentResume, setCurrentResume] = useState<ResumeDetail | null>(null);

  const [newVersionName, setNewVersionName] = useState("");
  const [duplicateReason, setDuplicateReason] = useState("");
  const [duplicateNotes, setDuplicateNotes] = useState("");

  const [duplicateResult, setDuplicateResult] =
    useState<DuplicateVersionDetail | null>(null);

  const [loadingCurrentResume, setLoadingCurrentResume] = useState(false);
  const [creatingDuplicate, setCreatingDuplicate] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const commonHeaders = buildAuthHeaders(true);

  const canCreateDuplicate = useMemo(() => {
    return !!currentResume?.resumeId && !!newVersionName.trim();
  }, [currentResume?.resumeId, newVersionName]);

  const hydrateCurrentResume = useCallback((data: ResumeDetail | null) => {
    if (!data) return;

    setCurrentResume(data);

    if (!newVersionName.trim()) {
      setNewVersionName(
        data.resumeName ? `${data.resumeName} Copy` : "Duplicated Resume Version"
      );
    }

    if (typeof window !== "undefined") {
      if (data.fileName) {
        localStorage.setItem("userResumeName", data.fileName);
      }
      if (data.resumeId != null) {
        localStorage.setItem("activeResumeId", String(data.resumeId));
      }
      if (data.resumeVersionId != null || data.versionId != null) {
        localStorage.setItem(
          "activeResumeVersionId",
          String(data.resumeVersionId ?? data.versionId)
        );
      }
    }
  }, [newVersionName]);

  const fetchCurrentResume = useCallback(async () => {
    try {
      setLoadingCurrentResume(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const candidateUrls = [
        resumeId ? API_ROUTES.getResumeById(resumeId) : "",
        API_ROUTES.getCurrentResume,
      ].filter(Boolean);

      let foundResume: ResumeDetail | null = null;
      let lastError = "Unable to load source resume from backend.";

      for (const url of candidateUrls) {
        try {
          const response = await fetch(url, {
            method: "GET",
            headers: commonHeaders,
            credentials: "include",
            cache: "no-store",
          });

          const resultJson = await response.json().catch(() => null);

          if (!response.ok) {
            lastError =
              (resultJson as ApiEnvelope<any>)?.message ||
              `Failed to fetch source resume. Status: ${response.status}`;
            continue;
          }

          const normalized = normalizeResumeDetail(unwrapResponse<any>(resultJson));

          if (normalized) {
            foundResume = normalized;
            break;
          }
        } catch (innerError: any) {
          lastError = innerError?.message || lastError;
        }
      }

      if (!foundResume) {
        throw new Error(lastError || "No current resume found.");
      }

      hydrateCurrentResume(foundResume);
      setSuccessMessage("Source resume loaded successfully.");
    } catch (error: any) {
      console.error("Fetch current resume error:", error);
      setErrorMessage(error?.message || "Unable to load current resume from backend.");
    } finally {
      setLoadingCurrentResume(false);
    }
  }, [commonHeaders, hydrateCurrentResume, resumeId]);

  useEffect(() => {
    fetchCurrentResume();
  }, [fetchCurrentResume]);

  const validateForm = () => {
    if (!currentResume?.resumeId) {
      setErrorMessage("No source resume is available to duplicate.");
      return false;
    }

    if (!newVersionName.trim()) {
      setErrorMessage("New version name is required.");
      return false;
    }

    return true;
  };

  const handleCreateDuplicate = async () => {
    if (!validateForm()) return;

    try {
      setCreatingDuplicate(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload: DuplicateRequestPayload = {
        sourceResumeId: currentResume?.resumeId ?? resumeId,
        sourceResumeVersionId:
          currentResume?.resumeVersionId ?? currentResume?.versionId ?? null,
        parentVersionId:
          currentResume?.resumeVersionId ?? currentResume?.versionId ?? null,
        newVersionName: newVersionName.trim(),
        versionName: newVersionName.trim(),
        duplicateReason: duplicateReason.trim(),
        duplicateNotes: duplicateNotes.trim(),
        rawText: currentResume?.rawText || "",
        versionType: "DUPLICATE",
        isBaseVersion: false,
        baseVersion: false,
      };

      const candidateUrls = API_ROUTES.createDuplicateCandidates(resumeId);

      let createdDuplicate: DuplicateVersionDetail | null = null;
      let createdMessage = "Resume duplicate created successfully.";
      let lastError = "Failed to create duplicate resume from backend.";

      for (const url of candidateUrls) {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: commonHeaders,
            credentials: "include",
            body: JSON.stringify(payload),
          });

          const resultJson = await response.json().catch(() => null);

          if (!response.ok) {
            lastError =
              (resultJson as ApiEnvelope<any>)?.message ||
              `Failed at ${url} with status ${response.status}`;
            continue;
          }

          createdMessage =
            (resultJson as ApiEnvelope<any>)?.message || createdMessage;

          createdDuplicate = normalizeDuplicateVersion(
            unwrapResponse<any>(resultJson)
          );

          if (createdDuplicate) {
            break;
          }

          if ((resultJson as ApiEnvelope<any>)?.success !== false) {
            createdDuplicate = {
              resumeId: currentResume?.resumeId ?? Number(resumeId),
              resumeVersionId:
                currentResume?.resumeVersionId ?? currentResume?.versionId,
              versionName: newVersionName.trim(),
              resumeName: newVersionName.trim(),
              rawText: currentResume?.rawText || "",
              versionType: "DUPLICATE",
              isBaseVersion: false,
            };
            break;
          }
        } catch (innerError: any) {
          lastError = innerError?.message || lastError;
        }
      }

      if (!createdDuplicate) {
        throw new Error(lastError);
      }

      setDuplicateResult(createdDuplicate);

      if (typeof window !== "undefined") {
        if (createdDuplicate.fileName) {
          localStorage.setItem("userResumeName", createdDuplicate.fileName);
        }
        if (createdDuplicate.resumeId != null) {
          localStorage.setItem("activeResumeId", String(createdDuplicate.resumeId));
        }
        if (
          createdDuplicate.resumeVersionId != null ||
          createdDuplicate.versionId != null
        ) {
          localStorage.setItem(
            "activeResumeVersionId",
            String(createdDuplicate.resumeVersionId ?? createdDuplicate.versionId)
          );
        }
      }

      setSuccessMessage(createdMessage);
    } catch (error: any) {
      console.error("Create duplicate error:", error);
      setErrorMessage(error?.message || "Failed to create duplicate resume.");
    } finally {
      setCreatingDuplicate(false);
    }
  };

  const goToResumePage = () => {
    router.push("/user/resume");
  };

  const openResumeManager = () => {
    if (
      duplicateResult?.resumeId != null &&
      (duplicateResult?.resumeVersionId != null || duplicateResult?.versionId != null)
    ) {
      const targetResumeId = String(duplicateResult.resumeId);
      const targetVersionId = String(
        duplicateResult.resumeVersionId ?? duplicateResult.versionId
      );
      router.push(`/user/resume/${targetResumeId}/versions/${targetVersionId}`);
      return;
    }

    if (resumeId) {
      router.push(`/user/resume/${resumeId}`);
      return;
    }

    router.push("/user/resume");
  };

  const openFullDuplicatePreview = () => {
    if (
      duplicateResult?.resumeId != null &&
      (duplicateResult?.resumeVersionId != null || duplicateResult?.versionId != null)
    ) {
      const targetResumeId = String(duplicateResult.resumeId);
      const targetVersionId = String(
        duplicateResult.resumeVersionId ?? duplicateResult.versionId
      );
      router.push(`/user/resume/${targetResumeId}/versions/${targetVersionId}/preview`);
      return;
    }

    openResumeManager();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={goToResumePage}
              className="mb-4 inline-flex items-center gap-2 text-white/70 transition hover:text-white"
            >
              <ArrowLeft size={18} />
              Back to Resume Page
            </button>

            <h1 className="bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Create Duplicate Resume
            </h1>

            <p className="mt-2 max-w-3xl text-white/60">
              Create a duplicate version of the selected resume for tailoring,
              role-specific edits, or safe experimentation inside your
              backend-integrated Resume Management System.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={fetchCurrentResume}
              disabled={loadingCurrentResume}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingCurrentResume ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Refresh Resume
                </>
              )}
            </button>

            <button
              onClick={handleCreateDuplicate}
              disabled={creatingDuplicate || !canCreateDuplicate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingDuplicate ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Create Duplicate
                </>
              )}
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
            <CheckCircle2 size={18} className="mt-0.5 text-green-300" />
            <p className="text-sm text-green-100">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <p className="text-sm text-red-100">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-5 flex items-center gap-3">
                <Files className="text-indigo-300" />
                <h2 className="text-xl font-semibold">Current Resume Version</h2>
              </div>

              {currentResume ? (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="mb-1 text-xs text-white/45">Resume Name</p>
                      <p className="text-sm font-semibold text-white/85">
                        {currentResume.resumeName || "N/A"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="mb-1 text-xs text-white/45">File Name</p>
                      <p className="break-all text-sm font-semibold text-white/85">
                        {currentResume.fileName || "N/A"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="mb-1 text-xs text-white/45">Resume ID</p>
                      <p className="text-sm font-semibold text-white/85">
                        {currentResume.resumeId ?? "N/A"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="mb-1 text-xs text-white/45">Version ID</p>
                      <p className="text-sm font-semibold text-white/85">
                        {currentResume.resumeVersionId ??
                          currentResume.versionId ??
                          "N/A"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <p className="mb-1 text-xs text-white/45">Version Code</p>
                      <p className="text-sm font-semibold text-white/85">
                        {currentResume.versionCode || "N/A"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                        <Tag size={12} />
                        <span>Version Type</span>
                      </div>
                      <p className="text-sm font-semibold text-white/85">
                        {currentResume.versionType || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Current ATS Score</p>
                    <p className="text-2xl font-bold text-emerald-300">
                      {currentResume.atsScore ?? 0}%
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                        <GitBranch size={12} />
                        <span>Parent Version ID</span>
                      </div>
                      <p className="text-sm font-semibold text-white/85">
                        {currentResume.parentVersionId ?? "N/A"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                        <CalendarDays size={12} />
                        <span>Updated At</span>
                      </div>
                      <p className="text-sm font-semibold text-white/85">
                        {formatDateTime(currentResume.updatedAt)}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-5 text-sm text-white/55">
                  No current resume found in backend.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-5 flex items-center gap-3">
                <Sparkles className="text-purple-300" />
                <h2 className="text-xl font-semibold">Duplicate Details</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    New Version Name
                  </label>
                  <input
                    type="text"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    placeholder="e.g. Backend Developer Resume Copy"
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none transition focus:border-indigo-400"
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
                    placeholder="e.g. Create a version for product-based companies"
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 outline-none transition focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Notes
                  </label>
                  <textarea
                    value={duplicateNotes}
                    onChange={(e) => setDuplicateNotes(e.target.value)}
                    placeholder="Optional notes about why this duplicate is being created..."
                    className="h-28 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 outline-none transition focus:border-indigo-400"
                  />
                </div>

                <button
                  onClick={handleCreateDuplicate}
                  disabled={creatingDuplicate || !canCreateDuplicate}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingDuplicate ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating Duplicate...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Duplicate Version
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-7">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Copy className="text-blue-300" />
                  <h2 className="text-xl font-semibold">Duplicated Resume Output</h2>
                </div>

                {duplicateResult &&
                  (duplicateResult.resumeVersionId != null ||
                    duplicateResult.versionId != null) && (
                    <span className="text-sm text-white/60">
                      Version ID:{" "}
                      <span className="font-semibold text-white/85">
                        {duplicateResult.resumeVersionId ??
                          duplicateResult.versionId}
                      </span>
                    </span>
                  )}
              </div>

              {duplicateResult ? (
                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Duplicate Name</p>
                    <p className="text-sm font-semibold text-white/85">
                      {duplicateResult.versionName ||
                        duplicateResult.resumeName ||
                        "N/A"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Duplicate File</p>
                    <p className="break-all text-sm font-semibold text-white/85">
                      {duplicateResult.fileName || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">ATS Score</p>
                    <p className="text-2xl font-bold text-purple-300">
                      {duplicateResult.atsScore ?? 0}%
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Updated At</p>
                    <p className="text-sm font-semibold text-white/85">
                      {formatDateTime(duplicateResult.updatedAt)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Version Code</p>
                    <p className="text-sm font-semibold text-white/85">
                      {duplicateResult.versionCode || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="mb-1 text-xs text-white/45">Version Type</p>
                    <p className="text-sm font-semibold text-white/85">
                      {duplicateResult.versionType || "DUPLICATE"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-5 text-sm text-white/55">
                  Your duplicated resume version details will appear here after
                  backend creation.
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="text-emerald-300" />
                  <h2 className="text-xl font-semibold">Duplicated Resume Preview</h2>
                </div>

                {(duplicateResult?.rawText || currentResume?.rawText) && (
                  <button
                    onClick={openFullDuplicatePreview}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15"
                  >
                    <Eye size={16} />
                    Open Preview
                  </button>
                )}
              </div>

              <div className="mt-4 min-h-[420px] max-h-[620px] overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-4">
                {duplicateResult?.rawText ? (
                  <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-white/75">
                    {duplicateResult.rawText}
                  </pre>
                ) : currentResume?.rawText ? (
                  <pre className="whitespace-pre-wrap wrap-break-word font-sans text-sm text-white/45">
                    {currentResume.rawText}
                  </pre>
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-white/45">
                    No resume preview available yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Next Actions</h2>
                  <p className="mt-1 text-sm text-white/55">
                    Continue editing and managing resume versions from your
                    resume dashboard and version detail pages.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleCreateDuplicate}
                    disabled={creatingDuplicate || !canCreateDuplicate}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingDuplicate ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Copy size={18} />
                        Duplicate Again
                      </>
                    )}
                  </button>

                  <button
                    onClick={openResumeManager}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                  >
                    <Eye size={18} />
                    Open Resume Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}