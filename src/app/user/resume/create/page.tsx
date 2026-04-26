"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Copy,
  Sparkles,
  Tag,
  Layers3,
  RefreshCw,
  GitBranch,
} from "lucide-react";

/**
 * src/app/(public)/user/resume/[resumeId]/create/page.tsx
 *
 * Backend-integrated Resume Version Create Page
 *
 * Latest project alignment:
 * - backend-first frontend structure
 * - resilient request / response normalization
 * - version-oriented resume architecture
 * - token + cookie aware requests
 *
 * Primary intention:
 * Create a new resume version / duplicate for an existing resume.
 *
 * Backend notes:
 * Different backend iterations may expose different creation endpoints.
 * This page supports multiple candidate endpoints and picks the first one
 * that succeeds, while keeping the request body consistent.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  getResumeById: (resumeId: string) =>
    `${API_BASE_URL}/api/user/resume/${resumeId}`,

  getVersions: (resumeId: string) =>
    `${API_BASE_URL}/api/user/resume/${resumeId}/versions`,

  createVersionCandidates: (resumeId: string) => [
    `${API_BASE_URL}/api/user/resume/${resumeId}/versions`,
    `${API_BASE_URL}/api/user/resume/${resumeId}/versions/create`,
    `${API_BASE_URL}/api/user/resume/${resumeId}/duplicate`,
    `${API_BASE_URL}/api/user/resume/${resumeId}/create-duplicate`,
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

type ResumeVersionDetail = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  versionName?: string;
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

type CreateVersionRequest = {
  versionName: string;
  versionType: string;
  rawText: string;
  parentVersionId?: number | null;
  baseVersion?: boolean;
  isBaseVersion?: boolean;
  resumeName?: string;
  sourceResumeId?: number | string;
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

function formatDateTime(value?: string): string {
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

function normalizeVersionDetail(raw: any): ResumeVersionDetail | null {
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

export default function UserResumeCreateVersionPage() {
  const router = useRouter();
  const params = useParams<{ resumeId: string }>();

  const resumeId = String(params?.resumeId || "");

  const [resume, setResume] = useState<ResumeDetail | null>(null);

  const [versionName, setVersionName] = useState("");
  const [versionType, setVersionType] = useState("DUPLICATE");
  const [resumeText, setResumeText] = useState("");
  const [useCurrentResumeText, setUseCurrentResumeText] = useState(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const commonHeaders = buildAuthHeaders(true);

  const canCreate = useMemo(() => {
    return (
      versionName.trim().length > 0 &&
      resumeText.trim().length > 0 &&
      versionType.trim().length > 0
    );
  }, [resumeText, versionName, versionType]);

  const hydrateResume = useCallback((data: ResumeDetail | null) => {
    if (!data) return;

    setResume(data);

    const baseText = data.rawText || "";
    if (useCurrentResumeText || !resumeText.trim()) {
      setResumeText(baseText);
    }

    if (!versionName.trim()) {
      const sourceName = data.resumeName || "Resume";
      setVersionName(`${sourceName} Copy`);
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
  }, [resumeText, useCurrentResumeText, versionName]);

  const fetchResume = useCallback(
    async (isRefresh = false) => {
      if (!resumeId) {
        setErrorMessage("Resume route is invalid.");
        setLoading(false);
        return;
      }

      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await fetch(API_ROUTES.getResumeById(resumeId), {
          method: "GET",
          headers: commonHeaders,
          credentials: "include",
          cache: "no-store",
        });

        const resultJson = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            (resultJson as ApiEnvelope<any>)?.message ||
              `Failed to fetch resume. Status: ${response.status}`
          );
        }

        const normalized = normalizeResumeDetail(unwrapResponse<any>(resultJson));

        if (!normalized) {
          throw new Error(
            (resultJson as ApiEnvelope<any>)?.message || "Resume not found."
          );
        }

        hydrateResume(normalized);
      } catch (error: any) {
        console.error("Fetch resume for version creation error:", error);
        setErrorMessage(
          error?.message || "Unable to load source resume from backend."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [commonHeaders, hydrateResume, resumeId]
  );

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  const createVersion = async () => {
    if (!canCreate) {
      setErrorMessage("Version name, version type, and resume content are required.");
      setSuccessMessage(null);
      return;
    }

    try {
      setCreating(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload: CreateVersionRequest = {
        versionName: versionName.trim(),
        versionType: versionType.trim().toUpperCase(),
        rawText: resumeText,
        parentVersionId:
          resume?.resumeVersionId ?? resume?.versionId ?? resume?.parentVersionId ?? null,
        baseVersion: false,
        isBaseVersion: false,
        resumeName: resume?.resumeName,
        sourceResumeId: resume?.resumeId ?? resumeId,
      };

      const candidateUrls = API_ROUTES.createVersionCandidates(resumeId);

      let lastErrorMessage = "Failed to create resume version.";
      let createdVersion: ResumeVersionDetail | null = null;
      let createdResponseMessage: string | null = null;

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
            lastErrorMessage =
              (resultJson as ApiEnvelope<any>)?.message ||
              `Failed at ${url} with status ${response.status}`;
            continue;
          }

          createdResponseMessage =
            (resultJson as ApiEnvelope<any>)?.message || null;

          createdVersion = normalizeVersionDetail(unwrapResponse<any>(resultJson));

          if (createdVersion) {
            break;
          }

          // Some backends may return a lightweight success response.
          if ((resultJson as ApiEnvelope<any>)?.success !== false) {
            createdVersion = {
              resumeId: resume?.resumeId ?? Number(resumeId),
              versionName: payload.versionName,
              versionType: payload.versionType,
              rawText: payload.rawText,
            };
            break;
          }
        } catch (innerError: any) {
          lastErrorMessage = innerError?.message || lastErrorMessage;
        }
      }

      if (!createdVersion) {
        throw new Error(lastErrorMessage);
      }

      setSuccessMessage(
        createdResponseMessage || "Resume version created successfully."
      );

      const nextResumeId = String(
        createdVersion.resumeId ?? resume?.resumeId ?? resumeId
      );
      const nextVersionId = String(
        createdVersion.resumeVersionId ?? createdVersion.versionId ?? ""
      );

      if (typeof window !== "undefined") {
        if (createdVersion.versionName) {
          localStorage.setItem("lastCreatedResumeVersionName", createdVersion.versionName);
        }
      }

      if (nextVersionId) {
        router.push(`/user/resume/${nextResumeId}/versions/${nextVersionId}`);
        return;
      }

      router.push(`/user/resume/${nextResumeId}`);
    } catch (error: any) {
      console.error("Create resume version error:", error);
      setErrorMessage(error?.message || "Failed to create resume version.");
    } finally {
      setCreating(false);
    }
  };

  const fillFromCurrentResume = () => {
    setResumeText(resume?.rawText || "");
    setUseCurrentResumeText(true);
    setErrorMessage(null);
    setSuccessMessage("Editor filled with current resume content.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-12">
            <Loader2 className="animate-spin" size={32} />
            <h2 className="text-2xl font-bold">Loading Resume</h2>
            <p className="text-white/60">
              Preparing source resume data for version creation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white">
        <div className="mx-auto max-w-6xl space-y-6">
          <button
            onClick={() => router.push("/user/resume")}
            className="inline-flex items-center gap-2 text-white/70 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Resume Page
          </button>

          <div className="flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-500/10 p-6">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <p className="text-red-100">Source resume not found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-950 via-slate-900 to-black px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              onClick={() => router.push(`/user/resume/${resumeId}`)}
              className="mb-4 inline-flex items-center gap-2 text-white/70 transition hover:text-white"
            >
              <ArrowLeft size={18} />
              Back to Resume Detail
            </button>

            <h1 className="bg-linear-to-r from-blue-400 to-purple-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
              Create Resume Version
            </h1>

            <p className="mt-2 max-w-3xl text-white/60">
              Create a new backend-linked resume version or duplicate using your
              latest project architecture and resume version flow.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => fetchResume(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:opacity-50"
            >
              {refreshing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              Refresh
            </button>

            <button
              onClick={createVersion}
              disabled={creating || !canCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Create Version
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
          <div className="space-y-6 xl:col-span-7">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-5 flex items-center gap-3">
                <FileText className="text-indigo-300" />
                <h2 className="text-xl font-semibold">Source Resume</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Resume Name</p>
                  <p className="text-sm font-semibold text-white/85">
                    {resume.resumeName || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">File Name</p>
                  <p className="break-all text-sm font-semibold text-white/85">
                    {resume.fileName || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Resume ID</p>
                  <p className="text-sm font-semibold text-white/85">
                    {resume.resumeId ?? "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Source Version ID</p>
                  <p className="text-sm font-semibold text-white/85">
                    {resume.resumeVersionId ?? resume.versionId ?? "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <Tag size={12} />
                    <span>Version Type</span>
                  </div>
                  <p className="text-sm font-semibold text-white/85">
                    {resume.versionType || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <Layers3 size={12} />
                    <span>Updated At</span>
                  </div>
                  <p className="text-sm font-semibold text-white/85">
                    {formatDateTime(resume.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-5 flex items-center gap-3">
                <Copy className="text-emerald-300" />
                <h2 className="text-xl font-semibold">New Version Details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Version Name
                  </label>
                  <input
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    placeholder="Enter new version name"
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Version Type
                  </label>
                  <select
                    value={versionType}
                    onChange={(e) => setVersionType(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="DUPLICATE">DUPLICATE</option>
                    <option value="TAILORED">TAILORED</option>
                    <option value="CUSTOM">CUSTOM</option>
                    <option value="DERIVED">DERIVED</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={fillFromCurrentResume}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15"
                  >
                    <Copy size={16} />
                    Use Current Resume Content
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUseCurrentResumeText(false);
                      setResumeText("");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/15"
                  >
                    <Sparkles size={16} />
                    Start Blank
                  </button>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Version Content
                  </label>
                  <textarea
                    value={resumeText}
                    onChange={(e) => {
                      setUseCurrentResumeText(false);
                      setResumeText(e.target.value);
                    }}
                    placeholder="Enter or edit content for the new resume version..."
                    className="min-h-[420px] w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-gray-200 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 xl:col-span-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <Tag className="text-blue-300" />
                <h2 className="text-xl font-semibold">Creation Summary</h2>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Parent Resume ID</p>
                  <p className="text-sm font-semibold text-white/85">
                    {resume.resumeId ?? resumeId}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                    <GitBranch size={12} />
                    <span>Parent Version ID</span>
                  </div>
                  <p className="text-sm font-semibold text-white/85">
                    {resume.resumeVersionId ?? resume.versionId ?? "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">New Version Name</p>
                  <p className="text-sm font-semibold text-white/85">
                    {versionName.trim() || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">New Version Type</p>
                  <p className="text-sm font-semibold text-white/85">
                    {versionType || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="mb-1 text-xs text-white/45">Content Length</p>
                  <p className="text-sm font-semibold text-white/85">
                    {resumeText.trim().length} characters
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="text-purple-300" />
                <h2 className="text-xl font-semibold">Quick Notes</h2>
              </div>

              <div className="space-y-3">
                {[
                  "This page creates a new version for the selected resume.",
                  "The page tries multiple backend creation endpoints for compatibility.",
                  "New versions are designed to stay aligned with your resume version architecture.",
                  "After creation, successful responses route to the new version detail page when possible.",
                ].map((note, index) => (
                  <div
                    key={`${note}-${index}`}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/25 p-4"
                  >
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-white/40" />
                    <p className="text-sm text-white/70">{note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
              <h2 className="mb-4 text-xl font-semibold">Actions</h2>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={createVersion}
                  disabled={creating || !canCreate}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Create Version
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.push(`/user/resume/${resumeId}`)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                >
                  <ArrowLeft size={18} />
                  Back to Resume
                </button>

                <button
                  onClick={() => router.push(`/user/resume/${resumeId}/versions`)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15"
                >
                  <Layers3 size={18} />
                  View Versions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}