"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Trophy,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  Tag,
  Layers3,
  User,
  Mail,
  Briefcase,
  CheckCircle2,
  FileCode2,
  Phone,
  Hash,
  FolderGit2,
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

interface ResumeVersionDetail {
  resumeVersionId: number;
  resumeId: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone?: string;
  headline?: string;
  versionName: string;
  versionCode?: string;
  versionType?: string;
  atsScore: number;
  isBaseVersion: boolean;
  parentVersionId?: number | null;
  parentVersionName?: string | null;
  fileName: string;
  fileUrl?: string;
  previewUrl?: string;
  jobApplicationCode?: string | null;
  rawText?: string | null;
  structuredContentJson?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

type ResumeVersionDetailResponse = ApiEnvelope<ResumeVersionDetail>;

type PageProps = {
  params: Promise<{
    versionId: string;
  }>;
};

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

function normalizeRole(value?: NullableString): string {
  return (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
}

function buildHeaders(includeJson = true): HeadersInit {
  const token = getAuthToken();

  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null | undefined): T | null {
  if (!json || typeof json !== "object") return null;
  const envelope = json as ApiEnvelope<T> & T;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function normalizeString(value: NullableString, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  if (typeof value === "number") return value === 1;
  return false;
}

function normalizeResumeVersionDetail(raw: any): ResumeVersionDetail {
  return {
    resumeVersionId: normalizeNumber(
      raw?.resumeVersionId ?? raw?.versionId ?? raw?.id
    ),
    resumeId: normalizeNumber(raw?.resumeId),
    userId: normalizeNumber(raw?.userId),
    userName: normalizeString(
      raw?.userName ?? raw?.name ?? raw?.fullName ?? raw?.candidateName,
      "Unknown User"
    ),
    userEmail: normalizeString(raw?.userEmail ?? raw?.email, "N/A"),
    userPhone: normalizeString(raw?.userPhone ?? raw?.phone ?? raw?.phoneNumber),
    headline: normalizeString(raw?.headline ?? raw?.title),
    versionName: normalizeString(
      raw?.versionName ?? raw?.name ?? raw?.fileName,
      "Untitled Version"
    ),
    versionCode: normalizeString(raw?.versionCode),
    versionType: normalizeString(raw?.versionType),
    atsScore: normalizeNumber(raw?.atsScore ?? raw?.score),
    isBaseVersion: normalizeBoolean(
      raw?.isBaseVersion ?? raw?.baseVersion ?? raw?.isBase
    ),
    parentVersionId:
      raw?.parentVersionId != null
        ? normalizeNumber(raw.parentVersionId)
        : null,
    parentVersionName: normalizeString(raw?.parentVersionName, ""),
    fileName: normalizeString(
      raw?.fileName ?? raw?.originalFileName ?? raw?.versionName,
      "Resume File"
    ),
    fileUrl: normalizeString(raw?.fileUrl ?? raw?.downloadUrl),
    previewUrl: normalizeString(raw?.previewUrl),
    jobApplicationCode: normalizeString(raw?.jobApplicationCode, ""),
    rawText: normalizeString(raw?.rawText, ""),
    structuredContentJson: normalizeString(
      raw?.structuredContentJson ?? raw?.structuredContent,
      ""
    ),
    createdAt: normalizeString(raw?.createdAt),
    updatedAt: normalizeString(raw?.updatedAt),
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

function getScoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 60) return "Average";
  return "Needs Improvement";
}

function getScoreColor(score: number) {
  if (score >= 85) return "bg-green-600";
  if (score >= 70) return "bg-yellow-500";
  return "bg-red-500";
}

function safePrettyJson(value?: string | null) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

function buildAuthenticatedFileUrl(url: string, token: string): string {
  if (!url) return "";
  if (!token) return url;

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

export default function AdminResumeVersionDetailPage({ params }: PageProps) {
  const { versionId } = use(params);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const API_ROUTES = useMemo(
    () => ({
      authMe: `${apiBaseUrl}/api/auth/me`,
      getResumeVersionDetail: (id: string) =>
        `${apiBaseUrl}/api/admin/resume/version/${id}`,
      downloadResumeVersion: (id: number | string) =>
        `${apiBaseUrl}/api/admin/resume/version/${id}/download`,
      previewResumeVersion: (id: number | string) =>
        `${apiBaseUrl}/api/admin/resume/version/${id}/preview`,
    }),
    [apiBaseUrl]
  );

  const [adminName, setAdminName] = useState("Admin");
  const [versionDetail, setVersionDetail] = useState<ResumeVersionDetail | null>(
    null
  );
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error("Unable to validate admin session.");
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

  const fetchVersionDetail = useCallback(
    async (refreshMode = false) => {
      if (refreshMode) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const response = await fetch(API_ROUTES.getResumeVersionDetail(versionId), {
          method: "GET",
          headers: buildHeaders(true),
          cache: "no-store",
        });

        const json: ResumeVersionDetailResponse | any = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            json?.message ||
              `Failed to fetch resume version detail. Status: ${response.status}`
          );
        }

        const rawData = json ? unwrapResponse<any>(json) : null;

        if (!rawData) {
          throw new Error(json?.message || "Resume version detail not found.");
        }

        setVersionDetail(normalizeResumeVersionDetail(rawData));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this resume version from backend."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [API_ROUTES, versionId]
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const allowed = await validateAdminAccess();
      if (!allowed || cancelled) return;
      await fetchVersionDetail(false);
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [fetchVersionDetail, validateAdminAccess]);

  const formattedStructuredJson = useMemo(() => {
    return safePrettyJson(versionDetail?.structuredContentJson);
  }, [versionDetail?.structuredContentJson]);

  const token = getAuthToken();

  const previewUrl =
    versionDetail?.previewUrl
      ? buildAuthenticatedFileUrl(versionDetail.previewUrl, token)
      : versionDetail
      ? buildAuthenticatedFileUrl(
          API_ROUTES.previewResumeVersion(versionDetail.resumeVersionId),
          token
        )
      : "";

  const downloadUrl =
    versionDetail?.fileUrl
      ? buildAuthenticatedFileUrl(versionDetail.fileUrl, token)
      : versionDetail
      ? buildAuthenticatedFileUrl(
          API_ROUTES.downloadResumeVersion(versionDetail.resumeVersionId),
          token
        )
      : "";

  if (isAuthChecking || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-10 shadow-xl flex items-center justify-center gap-3 text-gray-700">
          <Loader2 className="animate-spin" />
          {isAuthChecking
            ? "Checking admin access..."
            : "Loading resume version details..."}
        </div>
      </div>
    );
  }

  if (error || !versionDetail) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
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
              <h2 className="text-xl font-bold">
                Unable to open version detail page
              </h2>
            </div>

            <p className="mb-6 text-gray-700">
              {error || "Resume version detail not found."}
            </p>

            <button
              onClick={() => fetchVersionDetail(true)}
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
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                <ShieldCheck size={14} />
                Admin Resume Version Detail
              </div>

              <Link
                href={`/admin/resume/${versionDetail.userId}`}
                className="inline-flex items-center gap-2 font-medium text-cyan-300 hover:text-cyan-200"
              >
                <ArrowLeft size={18} />
                Back to User Resume Detail
              </Link>

              <div>
                <h1 className="text-3xl font-bold">Resume Version Detail</h1>
                <p className="mt-1 text-sm text-slate-300">
                  Logged in as {adminName}. Inspect this resume version, its ATS
                  score, metadata, and stored content from the backend.
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchVersionDetail(true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-300 px-4 py-2 text-slate-900 transition hover:bg-gray-50 disabled:opacity-60"
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

        <section className="grid gap-8 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl bg-white p-8 shadow-xl">
            <div className="mb-6 flex items-center gap-2">
              <Layers3 />
              <h2 className="text-2xl font-bold text-gray-900">
                Version Overview
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <InfoCard
                icon={<FileText size={18} />}
                label="Version Name"
                value={versionDetail.versionName}
              />
              <InfoCard
                icon={<Tag size={18} />}
                label="Version Code"
                value={versionDetail.versionCode || "N/A"}
              />
              <InfoCard
                icon={<Layers3 size={18} />}
                label="Version Type"
                value={versionDetail.versionType || "N/A"}
              />
              <InfoCard
                icon={<CalendarDays size={18} />}
                label="Last Updated"
                value={formatDateTime(
                  versionDetail.updatedAt || versionDetail.createdAt
                )}
              />
              <InfoCard
                icon={<FolderGit2 size={18} />}
                label="Resume ID"
                value={String(versionDetail.resumeId)}
              />
              <InfoCard
                icon={<Hash size={18} />}
                label="Resume Version ID"
                value={String(versionDetail.resumeVersionId)}
              />
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border bg-gray-50 p-5">
                <p className="mb-2 text-sm text-gray-500">Base Version</p>
                <div className="flex items-center gap-2">
                  {versionDetail.isBaseVersion ? (
                    <>
                      <CheckCircle2 className="text-green-600" size={18} />
                      <span className="font-semibold text-green-700">Yes</span>
                    </>
                  ) : (
                    <span className="font-semibold text-gray-900">No</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-gray-50 p-5">
                <p className="mb-2 text-sm text-gray-500">Parent Version</p>
                <p className="font-semibold text-gray-900">
                  {versionDetail.parentVersionId
                    ? `${versionDetail.parentVersionName || "Parent Version"} (#${versionDetail.parentVersionId})`
                    : "N/A"}
                </p>
              </div>

              <div className="md:col-span-2 rounded-xl border bg-gray-50 p-5">
                <p className="mb-2 text-sm text-gray-500">Job Application Code</p>
                <p className="break-all font-semibold text-gray-900">
                  {versionDetail.jobApplicationCode || "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-xl flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Trophy size={22} />
                <h2 className="text-xl font-bold">ATS Score</h2>
              </div>

              <div className="mb-3 text-5xl font-extrabold">
                {versionDetail.atsScore}
              </div>

              <p className="mb-4 text-sm text-white/90">
                {getScoreLabel(versionDetail.atsScore)}
              </p>

              <div className="w-full h-3 overflow-hidden rounded-full bg-white/20">
                <div
                  className={`h-3 rounded-full ${getScoreColor(versionDetail.atsScore)}`}
                  style={{
                    width: `${Math.max(0, Math.min(versionDetail.atsScore, 100))}%`,
                  }}
                />
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 font-semibold text-indigo-700 transition hover:bg-gray-100"
              >
                <Eye size={18} />
                Preview Version
              </a>

              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
              >
                <Download size={18} />
                Download Version
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex items-center gap-2">
            <User />
            <h2 className="text-2xl font-bold text-gray-900">
              Linked User Information
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
            <InfoCard
              icon={<User size={18} />}
              label="Name"
              value={versionDetail.userName}
            />
            <InfoCard
              icon={<Mail size={18} />}
              label="Email"
              value={versionDetail.userEmail}
              breakAll
            />
            <InfoCard
              icon={<Phone size={18} />}
              label="Phone"
              value={versionDetail.userPhone || "N/A"}
            />
            <InfoCard
              icon={<Briefcase size={18} />}
              label="Headline"
              value={versionDetail.headline || "N/A"}
            />
            <InfoCard
              icon={<Hash size={18} />}
              label="User ID"
              value={String(versionDetail.userId)}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex items-center gap-2">
            <FileText />
            <h2 className="text-2xl font-bold text-gray-900">File Details</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border bg-gray-50 p-5">
              <p className="mb-2 text-sm text-gray-500">File Name</p>
              <p className="break-all font-semibold text-gray-900">
                {versionDetail.fileName}
              </p>
            </div>

            <div className="rounded-xl border bg-gray-50 p-5">
              <p className="mb-2 text-sm text-gray-500">Created At</p>
              <p className="font-semibold text-gray-900">
                {formatDateTime(versionDetail.createdAt)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex items-center gap-2">
            <FileText />
            <h2 className="text-2xl font-bold text-gray-900">
              Extracted Raw Text
            </h2>
          </div>

          {versionDetail.rawText ? (
            <div className="max-h-125 overflow-auto whitespace-pre-wrap rounded-xl border bg-gray-50 p-5 text-sm leading-7 text-gray-700">
              {versionDetail.rawText}
            </div>
          ) : (
            <div className="rounded-xl border bg-gray-50 p-6 text-gray-500">
              No raw text available for this version.
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 flex items-center gap-2">
            <FileCode2 />
            <h2 className="text-2xl font-bold text-gray-900">
              Structured Content JSON
            </h2>
          </div>

          {formattedStructuredJson ? (
            <pre className="overflow-auto whitespace-pre-wrap wrap-break-word rounded-xl bg-gray-950 p-5 text-sm leading-7 text-gray-100">
              {formattedStructuredJson}
            </pre>
          ) : (
            <div className="rounded-xl border bg-gray-50 p-6 text-gray-500">
              No structured content JSON available for this version.
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
      <p className={`${breakAll ? "break-all" : ""} text-base font-semibold text-gray-900`}>
        {value}
      </p>
    </div>
  );
}