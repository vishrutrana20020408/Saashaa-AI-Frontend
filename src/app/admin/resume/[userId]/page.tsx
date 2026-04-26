"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Mail,
  User,
  Trophy,
  Save,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  RefreshCw,
  Edit3,
  CalendarDays,
  Briefcase,
  Phone,
  Hash,
  ShieldCheck,
} from "lucide-react";

type NullableString = string | null | undefined;

interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  payload?: T;
  result?: T;
}

interface AuthMeLike {
  authenticated?: boolean;
  valid?: boolean;
  role?: string;
  userRole?: string;
  roles?: string[];
  name?: string;
  fullName?: string;
  data?: AuthMeLike | null;
  payload?: AuthMeLike | null;
  result?: AuthMeLike | null;
}

interface ResumeVersion {
  id: number;
  versionName: string;
  versionCode?: string;
  versionType?: string;
  atsScore: number;
  fileName: string;
  fileUrl?: string;
  previewUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  isBaseVersion?: boolean;
}

interface UserResumeDetail {
  userId: number;
  resumeId: number;
  name: string;
  email: string;
  phone?: string;
  headline?: string;
  atsScore: number;
  fileName: string;
  fileUrl?: string;
  previewUrl?: string;
  notes?: string;
  rawText?: string;
  createdAt?: string;
  updatedAt?: string;
  versions?: ResumeVersion[];
}

type ResumeDetailResponse = ApiEnvelope<UserResumeDetail>;
type UpdateNotesResponse = ApiEnvelope<UserResumeDetail>;

type PageProps = {
  params: Promise<{
    userId: string;
  }>;
};

function normalizeRole(value?: NullableString): string {
  return (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
}

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null | undefined): T | null {
  if (!json || typeof json !== "object") return null;
  const envelope = json as ApiEnvelope<T> & T;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function normalizeString(value: NullableString, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:8080";

  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function getAuthToken(): string {
  if (typeof window === "undefined") return "";

  const possibleKeys = [
    "adminToken",
    "admin_token",
    "token",
    "authToken",
    "jwt",
    "accessToken",
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  return "";
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  [
    "adminToken",
    "admin_token",
    "token",
    "authToken",
    "jwt",
    "accessToken",
    "userRole",
    "role",
    "userEmail",
    "userName",
    "authId",
    "userOnboardingDone",
    "onboardingDone",
  ].forEach((key) => localStorage.removeItem(key));
}

function buildHeaders(includeJson = true): HeadersInit {
  const token = getAuthToken();

  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildAuthenticatedFileUrl(url: string, token: string): string {
  if (!url) return "";
  if (!token) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

function normalizeVersion(raw: any): ResumeVersion {
  return {
    id: Number(
      raw?.id ??
        raw?.versionId ??
        raw?.resumeVersionId ??
        raw?.resumeId ??
        0
    ),
    versionName: normalizeString(
      raw?.versionName ?? raw?.name ?? raw?.fileName,
      "Untitled Version"
    ),
    versionCode: normalizeString(raw?.versionCode),
    versionType: normalizeString(raw?.versionType),
    atsScore: Number(raw?.atsScore ?? raw?.score ?? 0),
    fileName: normalizeString(
      raw?.fileName ?? raw?.originalFileName ?? raw?.versionName,
      "Resume File"
    ),
    fileUrl: normalizeString(raw?.fileUrl ?? raw?.downloadUrl),
    previewUrl: normalizeString(raw?.previewUrl),
    createdAt: normalizeString(raw?.createdAt),
    updatedAt: normalizeString(raw?.updatedAt),
    isBaseVersion: Boolean(raw?.isBaseVersion ?? raw?.baseVersion),
  };
}

function normalizeResumeDetail(raw: any): UserResumeDetail {
  const versionsRaw = Array.isArray(raw?.versions)
    ? raw.versions
    : Array.isArray(raw?.resumeVersions)
    ? raw.resumeVersions
    : Array.isArray(raw?.versionList)
    ? raw.versionList
    : [];

  return {
    userId: Number(raw?.userId ?? raw?.id ?? 0),
    resumeId: Number(raw?.resumeId ?? raw?.id ?? 0),
    name: normalizeString(
      raw?.name ?? raw?.fullName ?? raw?.candidateName ?? raw?.userName,
      "Unknown User"
    ),
    email: normalizeString(raw?.email ?? raw?.userEmail, "N/A"),
    phone: normalizeString(raw?.phone ?? raw?.phoneNumber),
    headline: normalizeString(raw?.headline ?? raw?.title),
    atsScore: Number(raw?.atsScore ?? raw?.score ?? 0),
    fileName: normalizeString(
      raw?.fileName ?? raw?.originalFileName ?? raw?.resumeName,
      "Resume File"
    ),
    fileUrl: normalizeString(raw?.fileUrl ?? raw?.downloadUrl),
    previewUrl: normalizeString(raw?.previewUrl),
    notes: normalizeString(raw?.notes),
    rawText: normalizeString(raw?.rawText ?? raw?.contentText),
    createdAt: normalizeString(raw?.createdAt),
    updatedAt: normalizeString(raw?.updatedAt),
    versions: versionsRaw
      .map(normalizeVersion)
      .filter((item: ResumeVersion) => item.id > 0),
  };
}

function formatDateTime(dateString?: string) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function scoreBadgeClass(score: number) {
  if (score >= 85) return "bg-green-600 text-white";
  if (score >= 70) return "bg-yellow-500 text-white";
  return "bg-red-500 text-white";
}

export default function AdminUserResumeDetailPage({ params }: PageProps) {
  const { userId } = use(params);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const API_ROUTES = useMemo(
    () => ({
      getUserResumeDetails: (id: string) =>
        `${apiBaseUrl}/api/admin/resume/user/${id}`,
      updateAdminNotes: (id: string) =>
        `${apiBaseUrl}/api/admin/resume/user/${id}/notes`,
      downloadResume: (resumeId: number) =>
        `${apiBaseUrl}/api/admin/resume/${resumeId}/download`,
      previewResume: (resumeId: number) =>
        `${apiBaseUrl}/api/admin/resume/${resumeId}/preview`,
      authMe: `${apiBaseUrl}/api/auth/me`,
    }),
    [apiBaseUrl]
  );

  const [adminName, setAdminName] = useState("Admin");
  const [resumeDetail, setResumeDetail] = useState<UserResumeDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateAdminAccess = useCallback(async (): Promise<boolean> => {
    const token = getAuthToken();

    if (!token) {
      clearStoredAuth();
      window.location.href = "/auth/login";
      return false;
    }

    try {
      const response = await fetch(API_ROUTES.authMe, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const json = await response.json().catch(() => null);
      const authData = unwrapResponse<AuthMeLike>(json);

      if (!response.ok || !authData) {
        throw new Error("Unable to validate session.");
      }

      const role = normalizeRole(
        authData.userRole ?? authData.role ?? authData.roles?.[0]
      );

      const isAuthenticated = Boolean(
        authData.authenticated ?? authData.valid ?? response.ok
      );

      if (!isAuthenticated || role !== "ADMIN") {
        window.location.href = role === "ADMIN" ? "/auth/login" : "/user";
        return false;
      }

      setAdminName(
        normalizeString(authData.fullName ?? authData.name, "Admin")
      );

      return true;
    } catch {
      clearStoredAuth();
      window.location.href = "/auth/login";
      return false;
    } finally {
      setIsAuthChecking(false);
    }
  }, [API_ROUTES.authMe]);

  const fetchResumeDetail = useCallback(
    async (showRefreshLoader = false) => {
      if (showRefreshLoader) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(API_ROUTES.getUserResumeDetails(userId), {
          method: "GET",
          headers: buildHeaders(true),
          cache: "no-store",
        });

        const json: ResumeDetailResponse | any = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            json?.message ||
              `Failed to fetch resume detail. Status: ${response.status}`
          );
        }

        const rawData = json ? unwrapResponse<any>(json) : null;

        if (!rawData) {
          throw new Error(json?.message || "Resume detail not found.");
        }

        const normalized = normalizeResumeDetail(rawData);

        setResumeDetail(normalized);
        setNotes(normalized.notes || "");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this user's resume details from backend."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [API_ROUTES, userId]
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const allowed = await validateAdminAccess();
      if (!allowed || cancelled) return;
      await fetchResumeDetail(false);
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [fetchResumeDetail, validateAdminAccess]);

  const sortedVersions = useMemo(() => {
    if (!resumeDetail?.versions) return [];

    return [...resumeDetail.versions].sort((a, b) => {
      const aTime = a.updatedAt || a.createdAt || "";
      const bTime = b.updatedAt || b.createdAt || "";
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [resumeDetail]);

  const highestVersion = useMemo(() => {
    if (!sortedVersions.length) return null;

    return sortedVersions.reduce((prev, current) =>
      prev.atsScore > current.atsScore ? prev : current
    );
  }, [sortedVersions]);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(API_ROUTES.updateAdminNotes(userId), {
        method: "PUT",
        headers: buildHeaders(true),
        body: JSON.stringify({
          notes: notes.trim(),
        }),
      });

      const json: UpdateNotesResponse | any = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          json?.message || `Failed to save notes. Status: ${response.status}`
        );
      }

      const rawData = json ? unwrapResponse<any>(json) : null;

      if (rawData) {
        const normalized = normalizeResumeDetail(rawData);
        setResumeDetail(normalized);
        setNotes(normalized.notes || "");
      } else {
        setResumeDetail((prev) =>
          prev
            ? {
                ...prev,
                notes: notes.trim(),
                updatedAt: new Date().toISOString(),
              }
            : prev
        );
      }

      setSuccessMessage(json?.message || "Admin notes saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save admin notes."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const token = getAuthToken();

  const currentPreviewUrl =
    resumeDetail?.previewUrl
      ? buildAuthenticatedFileUrl(resumeDetail.previewUrl, token)
      : resumeDetail
      ? buildAuthenticatedFileUrl(
          API_ROUTES.previewResume(resumeDetail.resumeId),
          token
        )
      : "";

  const currentDownloadUrl =
    resumeDetail?.fileUrl
      ? buildAuthenticatedFileUrl(resumeDetail.fileUrl, token)
      : resumeDetail
      ? buildAuthenticatedFileUrl(
          API_ROUTES.downloadResume(resumeDetail.resumeId),
          token
        )
      : "";

  if (isAuthChecking || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-10 text-gray-700 shadow-xl">
            <Loader2 className="animate-spin" />
            {isAuthChecking ? "Checking admin access..." : "Loading resume details..."}
          </div>
        </div>
      </div>
    );
  }

  if (error || !resumeDetail) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Link
            href="/admin/resume"
            className="inline-flex items-center gap-2 font-medium text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft size={18} />
            Back to Resume Dashboard
          </Link>

          <div className="rounded-2xl bg-white p-8 shadow-xl">
            <div className="mb-4 flex items-center gap-3 text-red-600">
              <AlertCircle />
              <h2 className="text-xl font-bold">Unable to open resume page</h2>
            </div>

            <p className="mb-6 text-gray-700">
              {error || "Resume detail not found."}
            </p>

            <button
              onClick={() => fetchResumeDetail(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-white transition hover:bg-blue-700"
            >
              <RefreshCw size={18} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-2xl bg-linear-to-r from-slate-900 to-slate-800 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                <ShieldCheck size={14} />
                Admin Resume Detail
              </div>
              <h1 className="text-3xl font-bold">Resume Detail - {resumeDetail.name}</h1>
              <p className="mt-1 text-sm text-slate-300">
                Logged in as {adminName}. Review resume data, ATS results, notes,
                and version history from the backend-integrated admin module.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/resume"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-medium text-white transition hover:bg-white/15"
              >
                <ArrowLeft size={18} />
                Back
              </Link>

              <button
                onClick={() => fetchResumeDetail(true)}
                disabled={isRefreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-2 text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
              >
                {isRefreshing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            {successMessage}
          </div>
        ) : null}

        <section className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="grid gap-5 md:grid-cols-2 lg:col-span-2">
              <InfoCard icon={<User size={18} />} label="Student Name" value={resumeDetail.name} />
              <InfoCard icon={<Mail size={18} />} label="Email" value={resumeDetail.email} breakAll />
              <InfoCard icon={<Phone size={18} />} label="Phone" value={resumeDetail.phone || "N/A"} />
              <InfoCard icon={<Briefcase size={18} />} label="Headline" value={resumeDetail.headline || "N/A"} />
              <InfoCard icon={<Hash size={18} />} label="User ID" value={String(resumeDetail.userId)} />
              <InfoCard
                icon={<CalendarDays size={18} />}
                label="Last Updated"
                value={formatDateTime(resumeDetail.updatedAt || resumeDetail.createdAt)}
              />
            </div>

            <div className="flex flex-col justify-center rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 p-6 text-white shadow-lg">
              <div className="mb-3 flex items-center gap-2">
                <Trophy size={22} />
                <h2 className="text-xl font-bold">Current ATS Score</h2>
              </div>

              <div className="mb-3 text-5xl font-extrabold">
                {resumeDetail.atsScore}
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-3 rounded-full bg-white transition-all"
                  style={{
                    width: `${Math.max(0, Math.min(resumeDetail.atsScore, 100))}%`,
                  }}
                />
              </div>

              <p className="mt-4 text-sm text-white/90">
                This score reflects the currently active resume data available in
                the admin resume module.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-3">
          <section className="rounded-2xl bg-white p-8 shadow-xl xl:col-span-2">
            <div className="mb-6 flex items-center gap-2">
              <FileText />
              <h2 className="text-2xl font-bold text-gray-900">Current Resume</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border bg-gray-50 p-5">
                <p className="mb-2 text-sm text-gray-500">File Name</p>
                <p className="break-all font-semibold text-gray-900">
                  {resumeDetail.fileName}
                </p>
              </div>

              <div className="rounded-xl border bg-gray-50 p-5">
                <p className="mb-2 text-sm text-gray-500">Resume ID</p>
                <p className="font-semibold text-gray-900">{resumeDetail.resumeId}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href={currentPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-white transition hover:bg-blue-700"
              >
                <Eye size={18} />
                Preview Resume
              </a>

              <a
                href={currentDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-white transition hover:bg-green-700"
              >
                <Download size={18} />
                Download Resume
              </a>
            </div>

            {resumeDetail.rawText ? (
              <div className="mt-8">
                <h3 className="mb-3 text-lg font-bold text-gray-900">
                  Extracted Resume Text
                </h3>
                <div className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded-xl border bg-gray-50 p-5 text-sm leading-7 text-gray-700">
                  {resumeDetail.rawText}
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl bg-white p-8 shadow-xl">
            <div className="mb-6 flex items-center gap-2">
              <Edit3 size={20} />
              <h2 className="text-2xl font-bold text-gray-900">Admin Notes</h2>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={12}
              placeholder="Write admin feedback, resume improvement suggestions, ATS observations, or other internal notes..."
              className="w-full resize-none rounded-xl border p-4 outline-none focus:ring-2 focus:ring-blue-400"
            />

            <button
              onClick={handleSaveNotes}
              disabled={isSaving}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Notes
                </>
              )}
            </button>

            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm leading-6 text-blue-800">
                These notes are useful for tracking feedback, improvement areas,
                ATS observations, and internal resume review context.
              </p>
            </div>
          </section>
        </div>

        <section className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Resume Versions</h2>
              <p className="mt-1 text-gray-600">
                Version history aligned with the Resume Management System structure.
              </p>
            </div>

            <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
              Total Versions: {sortedVersions.length}
            </div>
          </div>

          {sortedVersions.length === 0 ? (
            <div className="rounded-xl border bg-gray-50 py-14 text-center text-gray-500">
              No resume versions available for this user.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {sortedVersions.map((version) => {
                const isHighest = highestVersion?.id === version.id;

                const versionPreviewUrl = buildAuthenticatedFileUrl(
                  version.previewUrl || API_ROUTES.previewResume(version.id),
                  token
                );

                const versionDownloadUrl = buildAuthenticatedFileUrl(
                  version.fileUrl || API_ROUTES.downloadResume(version.id),
                  token
                );

                return (
                  <div
                    key={version.id}
                    className={`rounded-2xl border bg-gray-50 p-6 shadow-sm ${
                      isHighest
                        ? "border-green-500 ring-2 ring-green-100"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {version.versionName}
                        </h3>
                        <p className="break-all text-sm text-gray-600">
                          {version.fileName}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${scoreBadgeClass(
                            version.atsScore
                          )}`}
                        >
                          ATS: {version.atsScore}
                        </span>

                        {version.isBaseVersion ? (
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                            Base Version
                          </span>
                        ) : null}

                        {isHighest ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Highest Score
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mb-5 grid gap-4 sm:grid-cols-2">
                      <MetaBlock label="Version Code" value={version.versionCode || "N/A"} />
                      <MetaBlock label="Version Type" value={version.versionType || "N/A"} />
                      <MetaBlock label="Created At" value={formatDateTime(version.createdAt)} />
                      <MetaBlock label="Updated At" value={formatDateTime(version.updatedAt)} />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <a
                        href={versionPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
                      >
                        <Eye size={16} />
                        Preview
                      </a>

                      <a
                        href={versionDownloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
                      >
                        <Download size={16} />
                        Download
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  breakAll = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  breakAll?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-gray-50 p-5">
      <div className="mb-2 flex items-center gap-2 text-gray-500">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className={`${breakAll ? "break-all" : ""} text-lg font-bold text-gray-900`}>
        {value}
      </p>
    </div>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  );
}