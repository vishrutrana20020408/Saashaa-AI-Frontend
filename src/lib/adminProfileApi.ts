// src/lib/adminProfileApi.ts
//
// Central Admin Profile API client for frontend ↔ backend integration.
//
// Purpose:
// - single reusable API layer for admin profile flows
// - aligned with the latest Interview System / Resume Management System architecture
// - supports:
//   - current admin profile fetch
//   - profile update
//   - resume-to-profile sync
//   - profile completion helpers
//   - normalization for backend response consistency
//
// Recommended backend endpoints:
//   GET    /api/admin/profile
//   PUT    /api/admin/profile
//   PATCH  /api/admin/profile
//   POST   /api/admin/profile/sync
//
// Optional endpoints supported by fallback logic:
//   GET    /api/admin/profile/me
//   PUT    /api/admin/profile/me
//   PATCH  /api/admin/profile/me
//   POST   /api/admin/profile/sync-from-resume
//   POST   /api/admin/profile/resume/sync
//
// Supported response styles:
// - plain object
// - wrapped { data | result | payload | content }
// - nested wrapped response objects
// - boolean/string-friendly backend values
//
// Notes:
// - uses cookie/session auth via credentials: "include"
// - keeps bearer token fallback for older frontend auth flow
// - stays aligned with backend-first frontend ideology

export const ADMIN_PROFILE_API_PATHS = {
  PROFILE: "/api/admin/profile",
} as const;

/* =========================================================
   TYPES
========================================================= */

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  details?: unknown;
  status?: number;
  timestamp?: string;
  path?: string;
  data?: T | null;
  result?: T | null;
  payload?: T | null;
  content?: T | null;
};

export type AdminProfileSkill = {
  id?: number | string;
  name?: string | null;
  category?: string | null;
  level?: string | null;
};

export type AdminProfileExperience = {
  id?: number | string;
  company?: string | null;
  role?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  currentlyWorking?: boolean | null;
  description?: string | null;
};

export type AdminProfileEducation = {
  id?: number | string;
  institution?: string | null;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  grade?: string | null;
  description?: string | null;
};

export type AdminProfileProject = {
  id?: number | string;
  name?: string | null;
  role?: string | null;
  description?: string | null;
  technologies?: string[];
  startDate?: string | null;
  endDate?: string | null;
  link?: string | null;
  github?: string | null;
};

export type AdminProfileLink = {
  id?: number | string;
  label?: string | null;
  url?: string | null;
};

export type AdminProfile = {
  profileId?: number;
  id?: number;
  adminId?: number | null;
  userId?: number | null;

  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  headline?: string | null;

  email?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;

  location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;

  summary?: string | null;
  currentRole?: string | null;
  designation?: string | null;
  department?: string | null;
  experienceLevel?: string | null;
  yearsOfExperience?: number | null;

  website?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;

  skills?: AdminProfileSkill[];
  experiences?: AdminProfileExperience[];
  education?: AdminProfileEducation[];
  projects?: AdminProfileProject[];
  links?: AdminProfileLink[];

  profileCompletionPercentage?: number | null;
  completionPercentage?: number | null;
  profileCompleted?: boolean | null;

  sourceResumeId?: number | null;
  sourceResumeVersionId?: number | null;
  lastSyncedAt?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type AdminProfileDetails = AdminProfile;

export type UpdateAdminProfilePayload = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  headline?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  summary?: string;
  currentRole?: string;
  designation?: string;
  department?: string;
  experienceLevel?: string;
  yearsOfExperience?: number | null;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  skills?: AdminProfileSkill[];
  experiences?: AdminProfileExperience[];
  education?: AdminProfileEducation[];
  projects?: AdminProfileProject[];
  links?: AdminProfileLink[];
};

export type SyncAdminProfilePayload = {
  resumeId?: number | null;
  resumeVersionId?: number | null;
  overwriteExisting?: boolean;
};

export type AdminProfileApiRequestOptions = {
  token?: string | null;
  apiBaseUrl?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  withCredentials?: RequestCredentials;
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function getApiBaseUrl(apiBaseUrl?: string): string {
  if (typeof apiBaseUrl === "string" && apiBaseUrl.trim()) {
    return apiBaseUrl.replace(/\/+$/, "");
  }

  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, "") ||
    "http://localhost:8080"
  );
}

function getAccessToken(): string | null {
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

function unwrapResponse<T>(value: unknown): T {
  if (value && typeof value === "object") {
    const level1 = value as ApiEnvelope<T>;
    const first =
      level1.data ?? level1.result ?? level1.payload ?? level1.content ?? value;

    if (first && typeof first === "object") {
      const level2 = first as ApiEnvelope<T>;
      return (level2.data ??
        level2.result ??
        level2.payload ??
        level2.content ??
        first) as T;
    }

    return first as T;
  }

  return value as T;
}

function extractMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const top = value as ApiEnvelope<unknown>;
  if (typeof top.message === "string" && top.message.trim()) {
    return top.message.trim();
  }

  const nested = unwrapResponse<any>(value);
  if (nested && typeof nested === "object" && typeof nested.message === "string") {
    return nested.message.trim();
  }

  return null;
}

function safeString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

function uniqueStrings(values?: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0
        )
        .map((item) => item.trim())
    ),
  ];
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    return (
      (typeof record.message === "string" && record.message) ||
      (typeof record.error === "string" && record.error) ||
      (typeof record.details === "string" && record.details) ||
      `Request failed with status ${status}`
    );
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return `Request failed with status ${status}`;
}

function buildUrl(
  path: string,
  params?: Record<string, unknown>,
  apiBaseUrl?: string
): string {
  const base = getApiBaseUrl(apiBaseUrl);
  const url = new URL(
    `${base}${path}`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost"
  );

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        !(typeof value === "string" && value.trim() === "")
      ) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return `${base}${path}${url.search}`;
}

/* =========================================================
   HTTP CORE
========================================================= */

export class AdminProfileApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "AdminProfileApiError";
    this.status = status;
    this.details = details;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

async function request<T>(
  method: string,
  path: string,
  options: AdminProfileApiRequestOptions = {},
  body?: unknown,
  queryParams?: Record<string, unknown>
): Promise<T> {
  const token = options.token ?? getAccessToken();
  const url = buildUrl(path, queryParams, options.apiBaseUrl);

  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: options.withCredentials ?? "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
    cache: "no-store",
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new AdminProfileApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return unwrapResponse<T>(payload as T);
}

async function requestWithFallback<T>(
  methods: string[],
  paths: string[],
  options: AdminProfileApiRequestOptions = {},
  body?: unknown,
  queryParams?: Record<string, unknown>
): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    for (const method of methods) {
      try {
        return await request<T>(method, path, options, body, queryParams);
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (lastError instanceof AdminProfileApiError) {
    throw lastError;
  }

  throw new AdminProfileApiError("Request failed.", 500, lastError);
}

/* =========================================================
   PATH HELPERS
========================================================= */

function profilePaths() {
  return [
    ADMIN_PROFILE_API_PATHS.PROFILE,
    `${ADMIN_PROFILE_API_PATHS.PROFILE}/me`,
  ];
}

function syncPaths() {
  return [
    `${ADMIN_PROFILE_API_PATHS.PROFILE}/sync`,
    `${ADMIN_PROFILE_API_PATHS.PROFILE}/sync-from-resume`,
    `${ADMIN_PROFILE_API_PATHS.PROFILE}/resume/sync`,
  ];
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeAdminProfileSkill(
  skill: Partial<AdminProfileSkill> | null | undefined
): AdminProfileSkill | null {
  if (!skill) return null;

  const name = safeString(skill.name);
  if (!name?.trim()) return null;

  return {
    id: skill.id,
    name: name.trim(),
    category: safeString(skill.category),
    level: safeString(skill.level),
  };
}

export function normalizeAdminProfileExperience(
  experience: Partial<AdminProfileExperience> | null | undefined
): AdminProfileExperience | null {
  if (!experience) return null;

  return {
    id: experience.id,
    company: safeString(experience.company),
    role: safeString(experience.role),
    location: safeString(experience.location),
    startDate: safeString(experience.startDate),
    endDate: safeString(experience.endDate),
    currentlyWorking: safeBoolean(experience.currentlyWorking),
    description: safeString(experience.description),
  };
}

export function normalizeAdminProfileEducation(
  education: Partial<AdminProfileEducation> | null | undefined
): AdminProfileEducation | null {
  if (!education) return null;

  return {
    id: education.id,
    institution: safeString(education.institution),
    degree: safeString(education.degree),
    fieldOfStudy: safeString(education.fieldOfStudy),
    startDate: safeString(education.startDate),
    endDate: safeString(education.endDate),
    grade: safeString(education.grade),
    description: safeString(education.description),
  };
}

export function normalizeAdminProfileProject(
  project: Partial<AdminProfileProject> | null | undefined
): AdminProfileProject | null {
  if (!project) return null;

  return {
    id: project.id,
    name: safeString(project.name),
    role: safeString(project.role),
    description: safeString(project.description),
    technologies: uniqueStrings(project.technologies),
    startDate: safeString(project.startDate),
    endDate: safeString(project.endDate),
    link: safeString(project.link),
    github: safeString(project.github),
  };
}

export function normalizeAdminProfileLink(
  link: Partial<AdminProfileLink> | null | undefined
): AdminProfileLink | null {
  if (!link) return null;

  const label = safeString(link.label);
  const url = safeString(link.url);

  if (!label?.trim() && !url?.trim()) return null;

  return {
    id: link.id,
    label,
    url,
  };
}

export function normalizeAdminProfile(
  profile: Partial<AdminProfile> | null | undefined
): AdminProfile | null {
  if (!profile) return null;

  return {
    profileId:
      typeof profile.profileId === "number"
        ? profile.profileId
        : typeof profile.id === "number"
          ? profile.id
          : undefined,
    id:
      typeof profile.id === "number"
        ? profile.id
        : typeof profile.profileId === "number"
          ? profile.profileId
          : undefined,
    adminId: safeNumber(profile.adminId),
    userId: safeNumber(profile.userId),

    firstName: safeString(profile.firstName),
    lastName: safeString(profile.lastName),
    fullName: safeString(profile.fullName),
    headline: safeString(profile.headline),

    email: safeString(profile.email),
    phone: safeString(profile.phone),
    alternatePhone: safeString(profile.alternatePhone),

    location: safeString(profile.location),
    city: safeString(profile.city),
    state: safeString(profile.state),
    country: safeString(profile.country),

    summary: safeString(profile.summary),
    currentRole: safeString(profile.currentRole),
    designation: safeString(profile.designation),
    department: safeString(profile.department),
    experienceLevel: safeString(profile.experienceLevel),
    yearsOfExperience: safeNumber(profile.yearsOfExperience),

    website: safeString(profile.website),
    linkedinUrl: safeString(profile.linkedinUrl),
    githubUrl: safeString(profile.githubUrl),
    portfolioUrl: safeString(profile.portfolioUrl),

    skills: Array.isArray(profile.skills)
      ? profile.skills
          .map((item) => normalizeAdminProfileSkill(item))
          .filter((item): item is AdminProfileSkill => Boolean(item))
      : [],
    experiences: Array.isArray(profile.experiences)
      ? profile.experiences
          .map((item) => normalizeAdminProfileExperience(item))
          .filter((item): item is AdminProfileExperience => Boolean(item))
      : [],
    education: Array.isArray(profile.education)
      ? profile.education
          .map((item) => normalizeAdminProfileEducation(item))
          .filter((item): item is AdminProfileEducation => Boolean(item))
      : [],
    projects: Array.isArray(profile.projects)
      ? profile.projects
          .map((item) => normalizeAdminProfileProject(item))
          .filter((item): item is AdminProfileProject => Boolean(item))
      : [],
    links: Array.isArray(profile.links)
      ? profile.links
          .map((item) => normalizeAdminProfileLink(item))
          .filter((item): item is AdminProfileLink => Boolean(item))
      : [],

    profileCompletionPercentage: safeNumber(profile.profileCompletionPercentage),
    completionPercentage: safeNumber(profile.completionPercentage),
    profileCompleted: safeBoolean(profile.profileCompleted),

    sourceResumeId: safeNumber(profile.sourceResumeId),
    sourceResumeVersionId: safeNumber(profile.sourceResumeVersionId),
    lastSyncedAt: safeString(profile.lastSyncedAt),

    createdAt: safeString(profile.createdAt),
    updatedAt: safeString(profile.updatedAt),
  };
}

/* =========================================================
   PAYLOAD BUILDERS
========================================================= */

export function buildUpdateAdminProfilePayload(
  input: UpdateAdminProfilePayload
): UpdateAdminProfilePayload {
  return {
    firstName: safeString(input.firstName)?.trim() || undefined,
    lastName: safeString(input.lastName)?.trim() || undefined,
    fullName: safeString(input.fullName)?.trim() || undefined,
    headline: safeString(input.headline)?.trim() || undefined,
    email: safeString(input.email)?.trim() || undefined,
    phone: safeString(input.phone)?.trim() || undefined,
    alternatePhone: safeString(input.alternatePhone)?.trim() || undefined,
    location: safeString(input.location)?.trim() || undefined,
    city: safeString(input.city)?.trim() || undefined,
    state: safeString(input.state)?.trim() || undefined,
    country: safeString(input.country)?.trim() || undefined,
    summary: safeString(input.summary)?.trim() || undefined,
    currentRole: safeString(input.currentRole)?.trim() || undefined,
    designation: safeString(input.designation)?.trim() || undefined,
    department: safeString(input.department)?.trim() || undefined,
    experienceLevel: safeString(input.experienceLevel)?.trim() || undefined,
    yearsOfExperience:
      typeof input.yearsOfExperience === "number"
        ? input.yearsOfExperience
        : null,
    website: safeString(input.website)?.trim() || undefined,
    linkedinUrl: safeString(input.linkedinUrl)?.trim() || undefined,
    githubUrl: safeString(input.githubUrl)?.trim() || undefined,
    portfolioUrl: safeString(input.portfolioUrl)?.trim() || undefined,
    skills: Array.isArray(input.skills)
      ? input.skills
          .map((item) => normalizeAdminProfileSkill(item))
          .filter((item): item is AdminProfileSkill => Boolean(item))
      : undefined,
    experiences: Array.isArray(input.experiences)
      ? input.experiences
          .map((item) => normalizeAdminProfileExperience(item))
          .filter((item): item is AdminProfileExperience => Boolean(item))
      : undefined,
    education: Array.isArray(input.education)
      ? input.education
          .map((item) => normalizeAdminProfileEducation(item))
          .filter((item): item is AdminProfileEducation => Boolean(item))
      : undefined,
    projects: Array.isArray(input.projects)
      ? input.projects
          .map((item) => normalizeAdminProfileProject(item))
          .filter((item): item is AdminProfileProject => Boolean(item))
      : undefined,
    links: Array.isArray(input.links)
      ? input.links
          .map((item) => normalizeAdminProfileLink(item))
          .filter((item): item is AdminProfileLink => Boolean(item))
      : undefined,
  };
}

export function buildSyncAdminProfilePayload(
  input?: SyncAdminProfilePayload
): SyncAdminProfilePayload {
  return {
    resumeId: typeof input?.resumeId === "number" ? input.resumeId : null,
    resumeVersionId:
      typeof input?.resumeVersionId === "number" ? input.resumeVersionId : null,
    overwriteExisting:
      typeof input?.overwriteExisting === "boolean"
        ? input.overwriteExisting
        : false,
  };
}

/* =========================================================
   API METHODS
========================================================= */

export async function getAdminProfile(
  options?: AdminProfileApiRequestOptions
): Promise<AdminProfileDetails> {
  const raw = await requestWithFallback<AdminProfileDetails>(
    ["GET"],
    profilePaths(),
    options
  );

  return normalizeAdminProfile(raw) || {};
}

export async function updateAdminProfile(
  payload: UpdateAdminProfilePayload,
  options?: AdminProfileApiRequestOptions
): Promise<AdminProfileDetails> {
  const raw = await requestWithFallback<AdminProfileDetails>(
    ["PUT", "PATCH"],
    profilePaths(),
    options,
    buildUpdateAdminProfilePayload(payload)
  );

  return normalizeAdminProfile(raw) || {};
}

export async function syncAdminProfileFromResume(
  payload?: SyncAdminProfilePayload,
  options?: AdminProfileApiRequestOptions
): Promise<AdminProfileDetails> {
  const raw = await requestWithFallback<AdminProfileDetails>(
    ["POST"],
    syncPaths(),
    options,
    buildSyncAdminProfilePayload(payload)
  );

  return normalizeAdminProfile(raw) || {};
}

/* =========================================================
   UI / DOMAIN HELPERS
========================================================= */

export function getAdminProfileId(
  profile: Partial<AdminProfile> | null | undefined
): number | null {
  if (!profile) return null;
  return safeNumber(profile.profileId ?? profile.id);
}

export function getAdminProfileDisplayName(
  profile: Partial<AdminProfile> | null | undefined
): string {
  if (!profile) return "Admin";
  return (
    profile.fullName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
    profile.email ||
    "Admin"
  );
}

export function getAdminProfileCompletion(
  profile: Partial<AdminProfile> | null | undefined
): number {
  if (!profile) return 0;

  const explicit =
    safeNumber(profile.profileCompletionPercentage) ??
    safeNumber(profile.completionPercentage);

  if (explicit !== null) {
    return Math.max(0, Math.min(100, explicit));
  }

  let score = 0;
  if (profile.fullName || profile.firstName) score += 15;
  if (profile.email) score += 10;
  if (profile.phone) score += 10;
  if (profile.location) score += 10;
  if (profile.summary) score += 15;
  if (profile.currentRole || profile.designation) score += 10;
  if (profile.skills?.length) score += 10;
  if (profile.experiences?.length) score += 10;
  if (profile.education?.length) score += 5;
  if (profile.projects?.length) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function isAdminProfileComplete(
  profile: Partial<AdminProfile> | null | undefined
): boolean {
  if (!profile) return false;

  if (typeof profile.profileCompleted === "boolean") {
    return profile.profileCompleted;
  }

  return getAdminProfileCompletion(profile) >= 70;
}

export function getAdminProfilePrimaryHeadline(
  profile: Partial<AdminProfile> | null | undefined
): string {
  if (!profile) return "";
  return (
    profile.headline ||
    profile.designation ||
    profile.currentRole ||
    profile.department ||
    ""
  );
}

export function getAdminProfilePrimaryLocation(
  profile: Partial<AdminProfile> | null | undefined
): string {
  if (!profile) return "";
  return (
    profile.location ||
    [profile.city, profile.state, profile.country].filter(Boolean).join(", ")
  );
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const adminProfileApi = {
  getAdminProfile,
  updateAdminProfile,
  syncAdminProfileFromResume,

  normalizeAdminProfile,
  normalizeAdminProfileSkill,
  normalizeAdminProfileExperience,
  normalizeAdminProfileEducation,
  normalizeAdminProfileProject,
  normalizeAdminProfileLink,

  buildUpdateAdminProfilePayload,
  buildSyncAdminProfilePayload,

  getAdminProfileId,
  getAdminProfileDisplayName,
  getAdminProfileCompletion,
  isAdminProfileComplete,
  getAdminProfilePrimaryHeadline,
  getAdminProfilePrimaryLocation,
  extractMessage,
};

/* =========================================================
   EXAMPLE USAGE

   import { adminProfileApi } from "@/lib/adminProfileApi";

   const profile = await adminProfileApi.getAdminProfile();

   const updated = await adminProfileApi.updateAdminProfile({
     firstName: "Vishrut",
     lastName: "Rana",
     designation: "System Admin",
     summary: "Managing backend-integrated resume workflows.",
   });

   const synced = await adminProfileApi.syncAdminProfileFromResume({
     resumeVersionId: 12,
     overwriteExisting: true,
   });
========================================================= */