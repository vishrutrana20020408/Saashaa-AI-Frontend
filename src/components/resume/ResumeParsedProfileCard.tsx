"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Code2,
  FolderGit2,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  CalendarDays,
  Globe,
  BadgeCheck,
  ExternalLink,
} from "lucide-react";

type GenericObject = Record<string, unknown>;

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

type ParsedProfileData = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  versionCode?: string;
  versionName?: string;
  versionType?: string;
  fileUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
  atsScore?: number;

  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  summary?: string;

  currentRole?: string;
  currentCompany?: string;
  yearsOfExperience?: number;

  university?: string;
  degree?: string;
  specialization?: string;
  graduationYear?: string | number;

  skills?: string[] | string;
  technicalSkills?: string[] | string;
  softSkills?: string[] | string;
  toolsAndTechnologies?: string[] | string;
  certifications?: string[] | string;
  achievements?: string[] | string;
  domains?: string[] | string;

  experience?: unknown;
  experiences?: unknown;
  workExperiences?: unknown;
  education?: unknown;
  educationHistory?: unknown;
  projects?: unknown;

  rawText?: string;
  structuredContentJson?: string;
  parsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ExperienceItem = {
  title?: string;
  role?: string;
  company?: string;
  organization?: string;
  employmentType?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  currentlyWorking?: boolean;
  description?: string;
  technologies?: string[] | string;
};

type EducationItem = {
  institution?: string;
  university?: string;
  school?: string;
  degree?: string;
  specialization?: string;
  fieldOfStudy?: string;
  startYear?: string | number;
  endYear?: string | number;
  graduationYear?: string | number;
  cgpa?: string | number;
  percentage?: string | number;
  score?: string | number;
  description?: string;
};

type ProjectItem = {
  title?: string;
  name?: string;
  description?: string;
  technologies?: string[] | string;
  techStack?: string[] | string;
  url?: string;
  githubUrl?: string;
  liveUrl?: string;
};

type ResumeParsedProfileCardProps = {
  resumeId?: number | string;
  resumeVersionId?: number | string;
  title?: string;
  className?: string;
  showRefreshButton?: boolean;
  showRawTextPreview?: boolean;
  onLoaded?: (data: ParsedProfileData) => void;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

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

function readString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function unwrapPayload<T = unknown>(input: unknown): T | null {
  if (!input || typeof input !== "object") return null;

  const obj = input as ApiEnvelope<T> & GenericObject;

  if (obj.data !== undefined && obj.data !== null) return obj.data as T;
  if (obj.payload !== undefined && obj.payload !== null) return obj.payload as T;
  if (obj.result !== undefined && obj.result !== null) return obj.result as T;

  return input as T;
}

function readMessage(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as GenericObject;
  return readString(obj.message, obj.error, obj.detail);
}

function normalizeArray(value?: string[] | string): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index);
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

function safeParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeExperienceArray(value: unknown): ExperienceItem[] {
  const parsed = safeParseJson(value);
  if (!Array.isArray(parsed)) return [];

  return parsed.map((item) => {
    if (typeof item !== "object" || item === null) return {};
    return item as ExperienceItem;
  });
}

function normalizeEducationArray(value: unknown): EducationItem[] {
  const parsed = safeParseJson(value);
  if (!Array.isArray(parsed)) return [];

  return parsed.map((item) => {
    if (typeof item !== "object" || item === null) return {};
    return item as EducationItem;
  });
}

function normalizeProjectArray(value: unknown): ProjectItem[] {
  const parsed = safeParseJson(value);

  if (Array.isArray(parsed)) {
    return parsed.map((item) => {
      if (typeof item === "string") {
        return { title: item };
      }
      if (typeof item !== "object" || item === null) return {};
      return item as ProjectItem;
    });
  }

  if (typeof parsed === "string") {
    return parsed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({ title: item }));
  }

  return [];
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMonthYear(value?: string) {
  if (!value) return "Present";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function mapPayloadToParsedProfile(payload: unknown): ParsedProfileData | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as GenericObject;
  const unwrapped =
    unwrapPayload<GenericObject>(root) && typeof unwrapPayload<GenericObject>(root) === "object"
      ? (unwrapPayload<GenericObject>(root) as GenericObject)
      : root;

  const structuredContentJson = readString(
    unwrapped.structuredContentJson,
    unwrapped.structured_content_json,
    root.structuredContentJson,
    root.structured_content_json
  );

  const structuredContent =
    (safeParseJson(structuredContentJson) as Record<string, unknown> | undefined) ||
    undefined;

  const source =
    structuredContent && typeof structuredContent === "object"
      ? { ...unwrapped, ...structuredContent }
      : unwrapped;

  const mapped: ParsedProfileData = {
    resumeId: readNumber(source.resumeId, source.resume_id, unwrapped.resumeId),
    resumeVersionId: readNumber(
      source.resumeVersionId,
      source.resume_version_id,
      source.versionId,
      source.version_id,
      unwrapped.resumeVersionId
    ),
    versionId: readNumber(
      source.versionId,
      source.version_id,
      source.resumeVersionId,
      source.resume_version_id
    ),
    versionCode: readString(source.versionCode, source.version_code),
    versionName: readString(source.versionName, source.version_name),
    versionType: readString(source.versionType, source.version_type),
    fileUrl: readString(source.fileUrl, source.file_url),
    previewUrl: readString(source.previewUrl, source.preview_url, source.fileUrl, source.file_url),
    downloadUrl: readString(source.downloadUrl, source.download_url),
    atsScore: readNumber(source.atsScore, source.ats_score),

    fullName: readString(source.fullName, source.full_name, source.name),
    firstName: readString(source.firstName, source.first_name),
    lastName: readString(source.lastName, source.last_name),
    email: readString(source.email),
    phone: readString(source.phone, source.mobile, source.contactNumber, source.contact_number),
    location: readString(source.location, source.address),
    headline: readString(source.headline, source.title),
    summary: readString(
      source.summary,
      source.profileSummary,
      source.profile_summary,
      source.objective
    ),

    currentRole: readString(
      source.currentRole,
      source.current_role,
      source.currentPosition,
      source.current_position,
      source.role
    ),
    currentCompany: readString(
      source.currentCompany,
      source.current_company,
      source.currentOrganization,
      source.current_organization
    ),
    yearsOfExperience: readNumber(
      source.yearsOfExperience,
      source.years_of_experience,
      source.experienceYears,
      source.experience_years
    ),

    university: readString(source.university),
    degree: readString(source.degree),
    specialization: readString(
      source.specialization,
      source.fieldOfStudy,
      source.field_of_study
    ),
    graduationYear:
      readString(source.graduationYear, source.graduation_year) ??
      readNumber(source.graduationYear, source.graduation_year),

    skills: (source.skills as string[] | string) ?? undefined,
    technicalSkills:
      (source.technicalSkills as string[] | string) ??
      (source.technical_skills as string[] | string) ??
      undefined,
    softSkills:
      (source.softSkills as string[] | string) ??
      (source.soft_skills as string[] | string) ??
      undefined,
    toolsAndTechnologies:
      (source.toolsAndTechnologies as string[] | string) ??
      (source.tools_and_technologies as string[] | string) ??
      (source.tools as string[] | string) ??
      undefined,
    certifications: (source.certifications as string[] | string) ?? undefined,
    achievements: (source.achievements as string[] | string) ?? undefined,
    domains: (source.domains as string[] | string) ?? undefined,

    experience: source.experience,
    experiences: source.experiences,
    workExperiences: source.workExperiences ?? source.work_experiences,
    education: source.education,
    educationHistory: source.educationHistory ?? source.education_history,
    projects: source.projects,

    rawText: readString(source.rawText, source.raw_text),
    structuredContentJson,
    parsedAt: readString(source.parsedAt, source.parsed_at),
    createdAt: readString(source.createdAt, source.created_at),
    updatedAt: readString(source.updatedAt, source.updated_at),
  };

  if (!mapped.fullName) {
    mapped.fullName =
      [mapped.firstName, mapped.lastName].filter(Boolean).join(" ") || "Parsed Resume Profile";
  }

  const hasUsefulData =
    Boolean(mapped.fullName) ||
    Boolean(mapped.email) ||
    Boolean(mapped.summary) ||
    Boolean(mapped.structuredContentJson) ||
    Boolean(mapped.rawText) ||
    mapped.resumeId !== undefined ||
    mapped.resumeVersionId !== undefined;

  return hasUsefulData ? mapped : null;
}

function buildEndpointCandidates(params: {
  resumeId?: number | string;
  resumeVersionId?: number | string;
}) {
  const rid =
    params.resumeId !== undefined && params.resumeId !== null
      ? String(params.resumeId)
      : undefined;

  const rvid =
    params.resumeVersionId !== undefined && params.resumeVersionId !== null
      ? String(params.resumeVersionId)
      : undefined;

  const endpoints: string[] = [];

  if (rvid) {
    endpoints.push(
      `${API_BASE_URL}/api/user/resume/version/${rvid}`,
      `${API_BASE_URL}/api/user/resume/versions/${rvid}`,
      `${API_BASE_URL}/api/user/resume/version/${rvid}/parsed-profile`,
      `${API_BASE_URL}/api/user/resume/version/${rvid}/parsed`,
      `${API_BASE_URL}/api/admin/resume/version/${rvid}`,
      `${API_BASE_URL}/api/admin/resume/versions/${rvid}`,
      `${API_BASE_URL}/api/admin/resume/version/${rvid}/parsed-profile`,
      `${API_BASE_URL}/api/admin/resume/version/${rvid}/parsed`
    );
  }

  if (rid && rvid) {
    endpoints.push(
      `${API_BASE_URL}/api/user/resume/${rid}/versions/${rvid}`,
      `${API_BASE_URL}/api/user/resume/${rid}/versions/${rvid}/parsed-profile`,
      `${API_BASE_URL}/api/admin/resume/${rid}/versions/${rvid}`,
      `${API_BASE_URL}/api/admin/resume/${rid}/versions/${rvid}/parsed-profile`
    );
  }

  if (rid) {
    endpoints.push(
      `${API_BASE_URL}/api/user/resume/${rid}`,
      `${API_BASE_URL}/api/user/resume/${rid}/latest`,
      `${API_BASE_URL}/api/user/resume/${rid}/parsed-profile`,
      `${API_BASE_URL}/api/admin/resume/${rid}`,
      `${API_BASE_URL}/api/admin/resume/${rid}/latest`,
      `${API_BASE_URL}/api/admin/resume/${rid}/parsed-profile`
    );
  }

  endpoints.push(
    `${API_BASE_URL}/api/user/resume/current`,
    `${API_BASE_URL}/api/user/resume/latest`,
    `${API_BASE_URL}/api/user/resume/latest/parsed-profile`,
    `${API_BASE_URL}/api/admin/resume/current`,
    `${API_BASE_URL}/api/admin/resume/latest`,
    `${API_BASE_URL}/api/admin/resume/latest/parsed-profile`
  );

  return endpoints;
}

export default function ResumeParsedProfileCard({
  resumeId,
  resumeVersionId,
  title = "Parsed Resume Profile",
  className = "",
  showRefreshButton = true,
  showRawTextPreview = false,
  onLoaded,
}: ResumeParsedProfileCardProps) {
  const [parsedProfile, setParsedProfile] = useState<ParsedProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const authHeaders = useMemo<HeadersInit>(() => {
    const token = getStoredToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const endpointCandidates = useMemo(
    () => buildEndpointCandidates({ resumeId, resumeVersionId }),
    [resumeId, resumeVersionId]
  );

  const fetchParsedProfile = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");
        setSuccessMessage("");

        let resolved: ParsedProfileData | null = null;
        let responseMessage = "";

        for (const endpoint of endpointCandidates) {
          try {
            const response = await fetch(endpoint, {
              method: "GET",
              credentials: "include",
              headers: authHeaders,
              cache: "no-store",
            });

            if (!response.ok) {
              if ([401, 403, 404].includes(response.status)) continue;
              continue;
            }

            const contentType = response.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) continue;

            const payload = await response.json();
            const mapped = mapPayloadToParsedProfile(payload);

            if (!mapped) continue;

            resolved = mapped;
            responseMessage = readMessage(payload) || "";
            break;
          } catch {
            continue;
          }
        }

        if (!resolved) {
          throw new Error("Unable to fetch parsed resume profile from backend.");
        }

        setParsedProfile(resolved);
        onLoaded?.(resolved);

        if (showRefresh) {
          setSuccessMessage(responseMessage || "Parsed resume profile refreshed successfully.");
        }
      } catch (err) {
        console.error("Failed to load parsed resume profile:", err);
        setParsedProfile(null);
        setError("Unable to load parsed resume profile from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authHeaders, endpointCandidates, onLoaded]
  );

  useEffect(() => {
    fetchParsedProfile();
  }, [fetchParsedProfile]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const coreSkills = useMemo(() => normalizeArray(parsedProfile?.skills), [parsedProfile?.skills]);
  const technicalSkills = useMemo(
    () => normalizeArray(parsedProfile?.technicalSkills),
    [parsedProfile?.technicalSkills]
  );
  const softSkills = useMemo(
    () => normalizeArray(parsedProfile?.softSkills),
    [parsedProfile?.softSkills]
  );
  const toolsAndTechnologies = useMemo(
    () => normalizeArray(parsedProfile?.toolsAndTechnologies),
    [parsedProfile?.toolsAndTechnologies]
  );
  const certifications = useMemo(
    () => normalizeArray(parsedProfile?.certifications),
    [parsedProfile?.certifications]
  );
  const achievements = useMemo(
    () => normalizeArray(parsedProfile?.achievements),
    [parsedProfile?.achievements]
  );
  const domains = useMemo(() => normalizeArray(parsedProfile?.domains), [parsedProfile?.domains]);

  const experiences = useMemo(() => {
    return normalizeExperienceArray(
      parsedProfile?.workExperiences ??
        parsedProfile?.experiences ??
        parsedProfile?.experience
    );
  }, [parsedProfile?.experience, parsedProfile?.experiences, parsedProfile?.workExperiences]);

  const education = useMemo(() => {
    const items = normalizeEducationArray(
      parsedProfile?.educationHistory ?? parsedProfile?.education
    );

    if (items.length > 0) return items;

    if (
      parsedProfile?.university ||
      parsedProfile?.degree ||
      parsedProfile?.specialization ||
      parsedProfile?.graduationYear
    ) {
      return [
        {
          university: parsedProfile.university,
          degree: parsedProfile.degree,
          specialization: parsedProfile.specialization,
          graduationYear: parsedProfile.graduationYear,
        },
      ];
    }

    return [];
  }, [
    parsedProfile?.degree,
    parsedProfile?.education,
    parsedProfile?.educationHistory,
    parsedProfile?.graduationYear,
    parsedProfile?.specialization,
    parsedProfile?.university,
  ]);

  const projects = useMemo(() => {
    return normalizeProjectArray(parsedProfile?.projects);
  }, [parsedProfile?.projects]);

  const initials = useMemo(() => {
    const name = parsedProfile?.fullName?.trim() || "";
    const parts = name.split(/\s+/).filter(Boolean);

    if (parts.length === 0) return "RP";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [parsedProfile?.fullName]);

  const rawTextPreview = useMemo(() => {
    if (!parsedProfile?.rawText) return "";
    return parsedProfile.rawText.length > 800
      ? `${parsedProfile.rawText.slice(0, 800)}...`
      : parsedProfile.rawText;
  }, [parsedProfile?.rawText]);

  if (loading) {
    return (
      <section className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-5 w-32 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error && !parsedProfile) {
    return (
      <section className={`rounded-3xl border border-red-200 bg-white p-6 shadow-sm ${className}`}>
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold">Parsed profile load failed</h3>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={() => fetchParsedProfile(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="border-b border-slate-100 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 min-h-[64px] min-w-[64px] items-center justify-center rounded-3xl bg-indigo-600 text-lg font-bold text-white shadow-sm">
              {initials}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Parsed
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Backend-extracted structured resume profile mapped from parsed resume content.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <MetaChip
                  icon={<FileText className="h-3.5 w-3.5" />}
                  text={parsedProfile?.versionName || "Resume Version"}
                />
                {parsedProfile?.versionType && (
                  <MetaChip
                    icon={<BadgeCheck className="h-3.5 w-3.5" />}
                    text={parsedProfile.versionType}
                  />
                )}
                {parsedProfile?.resumeVersionId !== undefined && (
                  <MetaChip
                    icon={<FileText className="h-3.5 w-3.5" />}
                    text={`Version #${parsedProfile.resumeVersionId}`}
                  />
                )}
                {parsedProfile?.atsScore !== undefined && (
                  <MetaChip
                    icon={<Award className="h-3.5 w-3.5" />}
                    text={`ATS ${parsedProfile.atsScore}%`}
                  />
                )}
              </div>
            </div>
          </div>

          {showRefreshButton && (
            <button
              type="button"
              onClick={() => fetchParsedProfile(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TopStatCard
            icon={<User className="h-4 w-4" />}
            label="Candidate"
            value={parsedProfile?.fullName || "Not found"}
          />
          <TopStatCard
            icon={<Briefcase className="h-4 w-4" />}
            label="Current Role"
            value={parsedProfile?.currentRole || parsedProfile?.headline || "Not found"}
          />
          <TopStatCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Updated"
            value={formatDateTime(parsedProfile?.updatedAt)}
          />
          <TopStatCard
            icon={<Award className="h-4 w-4" />}
            label="Experience"
            value={
              parsedProfile?.yearsOfExperience !== undefined
                ? `${parsedProfile.yearsOfExperience} years`
                : `${experiences.length} entries`
            }
          />
        </div>

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {error && parsedProfile && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <SectionCard title="Basic Information" icon={<User className="h-5 w-5 text-indigo-600" />}>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem icon={<User className="h-4 w-4" />} label="Full Name" value={parsedProfile?.fullName} />
                <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={parsedProfile?.email} />
                <InfoItem icon={<Phone className="h-4 w-4" />} label="Phone" value={parsedProfile?.phone} />
                <InfoItem icon={<MapPin className="h-4 w-4" />} label="Location" value={parsedProfile?.location} />
                <InfoItem icon={<Briefcase className="h-4 w-4" />} label="Current Role" value={parsedProfile?.currentRole} />
                <InfoItem icon={<Briefcase className="h-4 w-4" />} label="Current Company" value={parsedProfile?.currentCompany} />
              </div>

              {parsedProfile?.summary && (
                <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Summary
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {parsedProfile.summary}
                  </p>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Experience"
              icon={<Briefcase className="h-5 w-5 text-indigo-600" />}
            >
              {experiences.length > 0 ? (
                <div className="space-y-4">
                  {experiences.map((item, index) => (
                    <ExperienceCard
                      key={`experience-${index}`}
                      item={item}
                      formatMonthYear={formatMonthYear}
                    />
                  ))}
                </div>
              ) : (
                <EmptyText text="No parsed experience entries found." />
              )}
            </SectionCard>

            <SectionCard
              title="Education"
              icon={<GraduationCap className="h-5 w-5 text-indigo-600" />}
            >
              {education.length > 0 ? (
                <div className="space-y-4">
                  {education.map((item, index) => (
                    <EducationCard key={`education-${index}`} item={item} />
                  ))}
                </div>
              ) : (
                <EmptyText text="No parsed education entries found." />
              )}
            </SectionCard>

            <SectionCard
              title="Projects"
              icon={<FolderGit2 className="h-5 w-5 text-indigo-600" />}
            >
              {projects.length > 0 ? (
                <div className="space-y-4">
                  {projects.map((project, index) => (
                    <ProjectCard key={`project-${index}`} item={project} />
                  ))}
                </div>
              ) : (
                <EmptyText text="No parsed project entries found." />
              )}
            </SectionCard>

            {showRawTextPreview && rawTextPreview && (
              <SectionCard
                title="Raw Text Preview"
                icon={<FileText className="h-5 w-5 text-indigo-600" />}
              >
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <pre className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-slate-700">
                    {rawTextPreview}
                  </pre>
                </div>
              </SectionCard>
            )}
          </div>

          <div className="space-y-6">
            <SectionCard
              title="Skills"
              icon={<Code2 className="h-5 w-5 text-indigo-600" />}
            >
              <TagGroup title="Core Skills" items={coreSkills} />
              <TagGroup title="Technical Skills" items={technicalSkills} />
              <TagGroup title="Soft Skills" items={softSkills} />
              <TagGroup title="Tools & Technologies" items={toolsAndTechnologies} />
            </SectionCard>

            <SectionCard
              title="Additional Parsed Data"
              icon={<Globe className="h-5 w-5 text-indigo-600" />}
            >
              <TagGroup title="Certifications" items={certifications} />
              <TagGroup title="Achievements" items={achievements} />
              <TagGroup title="Domains" items={domains} />
            </SectionCard>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">Parse Summary</h3>

              <div className="mt-4 space-y-3">
                <CompactInfoRow
                  label="Resume ID"
                  value={
                    parsedProfile?.resumeId !== undefined
                      ? String(parsedProfile.resumeId)
                      : "Not available"
                  }
                />
                <CompactInfoRow
                  label="Resume Version ID"
                  value={
                    parsedProfile?.resumeVersionId !== undefined
                      ? String(parsedProfile.resumeVersionId)
                      : "Not available"
                  }
                />
                <CompactInfoRow
                  label="Experience Entries"
                  value={String(experiences.length)}
                />
                <CompactInfoRow
                  label="Education Entries"
                  value={String(education.length)}
                />
                <CompactInfoRow
                  label="Project Entries"
                  value={String(projects.length)}
                />
                <CompactInfoRow
                  label="Last Updated"
                  value={formatDateTime(parsedProfile?.updatedAt)}
                />
              </div>

              {(parsedProfile?.previewUrl || parsedProfile?.fileUrl) && (
                <a
                  href={parsedProfile.previewUrl || parsedProfile.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Resume Preview
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetaChip({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {icon}
      {text}
    </span>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TopStatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {value?.trim() ? value : "Not found"}
      </p>
    </div>
  );
}

function ExperienceCard({
  item,
  formatMonthYear,
}: {
  item: ExperienceItem;
  formatMonthYear: (value?: string) => string;
}) {
  const title = item.title || item.role || "Role not specified";
  const company = item.company || item.organization || "Organization not specified";
  const technologies = Array.isArray(item.technologies)
    ? item.technologies.map(String).filter(Boolean)
    : typeof item.technologies === "string"
      ? item.technologies
          .split(",")
          .map((tech) => tech.trim())
          .filter(Boolean)
      : [];

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          <p className="mt-1 text-sm text-slate-600">{company}</p>
          <div className="mt-1 text-xs text-slate-500">
            {formatMonthYear(item.startDate)} -{" "}
            {item.currentlyWorking ? "Present" : formatMonthYear(item.endDate)}
          </div>
        </div>
        {item.employmentType && (
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
            {item.employmentType}
          </span>
        )}
      </div>

      {item.location && (
        <p className="mt-2 text-sm text-slate-600">{item.location}</p>
      )}

      {item.description && (
        <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>
      )}

      {technologies.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {technologies.map((tech, index) => (
            <span
              key={`${title}-${tech}-${index}`}
              className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EducationCard({ item }: { item: EducationItem }) {
  const institution =
    item.institution || item.university || item.school || "Institution not specified";
  const degree =
    item.degree || item.fieldOfStudy || item.specialization || "Qualification not specified";
  const meta: string[] = [];

  if (item.specialization) meta.push(item.specialization);
  if (item.cgpa !== undefined) meta.push(`CGPA: ${item.cgpa}`);
  if (item.percentage !== undefined) meta.push(`Percentage: ${item.percentage}`);
  if (item.score !== undefined && item.score !== item.percentage) meta.push(`Score: ${item.score}`);

  const yearText =
    item.graduationYear ||
    [item.startYear, item.endYear].filter(Boolean).join(" - ") ||
    "Year not specified";

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <h4 className="text-base font-semibold text-slate-900">{degree}</h4>
      <p className="mt-1 text-sm text-slate-600">{institution}</p>
      <p className="mt-1 text-xs text-slate-500">{String(yearText)}</p>
      {meta.length > 0 && (
        <p className="mt-2 text-sm text-slate-600">{meta.join(" • ")}</p>
      )}
      {item.description && (
        <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>
      )}
    </div>
  );
}

function ProjectCard({ item }: { item: ProjectItem }) {
  const title = item.title || item.name || "Project";
  const technologies = Array.isArray(item.technologies)
    ? item.technologies.map(String).filter(Boolean)
    : typeof item.technologies === "string"
      ? item.technologies
          .split(",")
          .map((tech) => tech.trim())
          .filter(Boolean)
      : Array.isArray(item.techStack)
        ? item.techStack.map(String).filter(Boolean)
        : typeof item.techStack === "string"
          ? item.techStack
              .split(",")
              .map((tech) => tech.trim())
              .filter(Boolean)
          : [];

  const projectUrl = item.liveUrl || item.githubUrl || item.url;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-base font-semibold text-slate-900">{title}</h4>
        {projectUrl && (
          <a
            href={projectUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Open
          </a>
        )}
      </div>

      {item.description && (
        <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>
      )}

      {technologies.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {technologies.map((tech, index) => (
            <span
              key={`${title}-${tech}-${index}`}
              className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TagGroup({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="mb-3 text-sm font-semibold text-slate-900">{title}</h4>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${title}-${item}-${index}`}
              className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <EmptyText text={`No ${title.toLowerCase()} found.`} />
      )}
    </div>
  );
}

function CompactInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}