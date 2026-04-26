// src/lib/userProfileApi.ts
//
// Central User Profile API client for frontend ↔ backend integration.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - Cookie/session auth supported via credentials: "include"
// - Bearer token fallback retained for older auth flow
// - Supports wrapped backend response styles:
//   { success, message, data | payload | result | content }
// - Supports profile fetch, update, and resume-to-profile sync flows
// - Aligned with the broader Interview System / Resume Management System
//   architecture and profile/resume integration ideology
//
// Recommended backend endpoints:
//   GET    /api/user/profile
//   PUT    /api/user/profile
//   PATCH  /api/user/profile
//   POST   /api/user/profile/sync
//
// Optional fallback endpoints:
//   GET    /api/user/profile/me
//   PUT    /api/user/profile/me
//   PATCH  /api/user/profile/me
//   POST   /api/user/profile/sync-from-resume
//   POST   /api/user/profile/resume/sync
//   POST   /api/user/profile/sync-from-resume/{resumeVersionId}
//
// Notes:
// - Uses cookie/session auth via credentials: "include"
// - Keeps bearer token fallback for older frontend auth flow
// - Handles boolean/string/number-friendly backend values
// - Supports profile objects returned directly or inside response wrappers

export const USER_PROFILE_API_PATHS = {
  PROFILE: "/api/user/profile",
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
  data?: T;
  result?: T;
  payload?: T;
  content?: T;
};

export type UserProfileSkill = {
  id?: number | string;
  name?: string | null;
  category?: string | null;
  level?: string | null;
};

export type UserProfileExperience = {
  id?: number | string;
  company?: string | null;
  role?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  currentlyWorking?: boolean | null;
  description?: string | null;
};

export type UserProfileEducation = {
  id?: number | string;
  institution?: string | null;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  grade?: string | null;
  description?: string | null;
};

export type UserProfileProject = {
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

export type UserProfileLink = {
  id?: number | string;
  label?: string | null;
  url?: string | null;
};

export type UserProfile = {
  profileId?: number;
  id?: number;
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
  experienceLevel?: string | null;
  yearsOfExperience?: number | null;

  website?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;

  skills?: UserProfileSkill[];
  experiences?: UserProfileExperience[];
  education?: UserProfileEducation[];
  projects?: UserProfileProject[];
  links?: UserProfileLink[];

  profileCompletionPercentage?: number | null;
  completionPercentage?: number | null;
  profileCompleted?: boolean | null;

  sourceResumeId?: number | null;
  sourceResumeVersionId?: number | null;
  lastSyncedAt?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UserProfileDetails = UserProfile;

export type UpdateUserProfilePayload = {
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
  experienceLevel?: string;
  yearsOfExperience?: number | null;

  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;

  skills?: UserProfileSkill[];
  experiences?: UserProfileExperience[];
  education?: UserProfileEducation[];
  projects?: UserProfileProject[];
  links?: UserProfileLink[];
};

export type SyncUserProfilePayload = {
  resumeId?: number | null;
  resumeVersionId?: number | null;
  overwriteExisting?: boolean;
};

export type UserProfileApiRequestOptions = {
  token?: string | null;
  apiBaseUrl?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  withCredentials?: boolean;
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function getApiBaseUrl(apiBaseUrl?: string): string {
  if (typeof apiBaseUrl === "string" && apiBaseUrl.trim()) {
    return apiBaseUrl.trim().replace(/\/+$/, "");
  }

  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, "") ||
    ""
  );
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token") ||
    null
  );
}

function safeString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

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
      values.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    ),
  ];
}

function unwrapResponse<T>(value: unknown): T {
  let current = value;
  let depth = 0;

  while (current && typeof current === "object" && depth < 6) {
    const obj = current as Record<string, unknown>;

    if (obj.data !== undefined) {
      current = obj.data;
      depth += 1;
      continue;
    }

    if (obj.payload !== undefined) {
      current = obj.payload;
      depth += 1;
      continue;
    }

    if (obj.result !== undefined) {
      current = obj.result;
      depth += 1;
      continue;
    }

    if (obj.content !== undefined) {
      current = obj.content;
      depth += 1;
      continue;
    }

    break;
  }

  return current as T;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    return (
      safeTrimmedString(record.message) ||
      safeTrimmedString(record.error) ||
      safeTrimmedString(record.details) ||
      `Request failed with status ${status}`
    );
  }

  return `Request failed with status ${status}`;
}

function buildUrl(
  path: string,
  params?: Record<string, unknown>,
  apiBaseUrl?: string
): string {
  const base = getApiBaseUrl(apiBaseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const tempBase =
    base ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000");

  const url = new URL(`${tempBase}${normalizedPath}`);

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

  if (!base) {
    return `${normalizedPath}${url.search}`;
  }

  return `${base}${normalizedPath}${url.search}`;
}

/* =========================================================
   HTTP CORE
========================================================= */

export class UserProfileApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "UserProfileApiError";
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

function buildRequestHeaders(
  token?: string | null,
  customHeaders?: HeadersInit,
  hasJsonBody = false
): Headers {
  const headers = new Headers(customHeaders || {});

  if (hasJsonBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function request<T>(
  method: string,
  path: string,
  options: UserProfileApiRequestOptions = {},
  body?: unknown,
  queryParams?: Record<string, unknown>
): Promise<T> {
  const token = options.token ?? getAccessToken();
  const url = buildUrl(path, queryParams, options.apiBaseUrl);
  const hasBody = body !== undefined;
  const credentials: RequestCredentials =
    options.withCredentials === false ? "omit" : "include";

  const response = await fetch(url, {
    method,
    headers: buildRequestHeaders(token, options.headers, hasBody),
    credentials,
    body: hasBody ? JSON.stringify(body) : undefined,
    signal: options.signal,
    cache: "no-store",
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new UserProfileApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return unwrapResponse<T>(payload);
}

async function requestWithFallback<T>(
  methods: string[],
  paths: string[],
  options: UserProfileApiRequestOptions = {},
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

  if (lastError instanceof UserProfileApiError) {
    throw lastError;
  }

  throw new UserProfileApiError("Request failed.", 500, lastError);
}

/* =========================================================
   PATH HELPERS
========================================================= */

function profilePaths(): string[] {
  return [
    USER_PROFILE_API_PATHS.PROFILE,
    `${USER_PROFILE_API_PATHS.PROFILE}/me`,
  ];
}

function syncPaths(payload?: SyncUserProfilePayload): string[] {
  const versionId =
    typeof payload?.resumeVersionId === "number" ? payload.resumeVersionId : null;

  return [
    `${USER_PROFILE_API_PATHS.PROFILE}/sync`,
    `${USER_PROFILE_API_PATHS.PROFILE}/sync-from-resume`,
    `${USER_PROFILE_API_PATHS.PROFILE}/resume/sync`,
    ...(versionId !== null
      ? [`${USER_PROFILE_API_PATHS.PROFILE}/sync-from-resume/${versionId}`]
      : []),
  ];
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeUserProfileSkill(
  skill: Partial<UserProfileSkill> | Record<string, unknown> | null | undefined
): UserProfileSkill | null {
  if (!skill) return null;

  const source = skill as Record<string, unknown>;
  const name =
    safeString(source.name ?? source.skillName ?? source.title)?.trim() || null;

  if (!name) return null;

  return {
    id: source.id as string | number | undefined,
    name,
    category:
      safeString(source.category ?? source.skillCategory)?.trim() || null,
    level: safeString(source.level ?? source.proficiency)?.trim() || null,
  };
}

export function normalizeUserProfileExperience(
  experience:
    | Partial<UserProfileExperience>
    | Record<string, unknown>
    | null
    | undefined
): UserProfileExperience | null {
  if (!experience) return null;

  const source = experience as Record<string, unknown>;

  return {
    id: source.id as string | number | undefined,
    company: safeString(source.company ?? source.companyName)?.trim() || null,
    role: safeString(source.role ?? source.title ?? source.position)?.trim() || null,
    location: safeString(source.location)?.trim() || null,
    startDate:
      safeString(source.startDate ?? source.fromDate ?? source.start)?.trim() || null,
    endDate:
      safeString(source.endDate ?? source.toDate ?? source.end)?.trim() || null,
    currentlyWorking:
      safeBoolean(
        source.currentlyWorking ?? source.isCurrent ?? source.present
      ) ?? null,
    description: safeString(source.description)?.trim() || null,
  };
}

export function normalizeUserProfileEducation(
  education:
    | Partial<UserProfileEducation>
    | Record<string, unknown>
    | null
    | undefined
): UserProfileEducation | null {
  if (!education) return null;

  const source = education as Record<string, unknown>;

  return {
    id: source.id as string | number | undefined,
    institution:
      safeString(source.institution ?? source.school ?? source.college)?.trim() ||
      null,
    degree: safeString(source.degree)?.trim() || null,
    fieldOfStudy:
      safeString(source.fieldOfStudy ?? source.field ?? source.specialization)?.trim() ||
      null,
    startDate:
      safeString(source.startDate ?? source.fromDate ?? source.start)?.trim() || null,
    endDate:
      safeString(source.endDate ?? source.toDate ?? source.end)?.trim() || null,
    grade: safeString(source.grade ?? source.cgpa ?? source.gpa)?.trim() || null,
    description: safeString(source.description)?.trim() || null,
  };
}

export function normalizeUserProfileProject(
  project: Partial<UserProfileProject> | Record<string, unknown> | null | undefined
): UserProfileProject | null {
  if (!project) return null;

  const source = project as Record<string, unknown>;

  return {
    id: source.id as string | number | undefined,
    name: safeString(source.name ?? source.projectName)?.trim() || null,
    role: safeString(source.role)?.trim() || null,
    description: safeString(source.description)?.trim() || null,
    technologies: uniqueStrings(source.technologies ?? source.techStack ?? source.tools),
    startDate:
      safeString(source.startDate ?? source.fromDate ?? source.start)?.trim() || null,
    endDate:
      safeString(source.endDate ?? source.toDate ?? source.end)?.trim() || null,
    link: safeString(source.link ?? source.url)?.trim() || null,
    github: safeString(source.github ?? source.githubUrl)?.trim() || null,
  };
}

export function normalizeUserProfileLink(
  link: Partial<UserProfileLink> | Record<string, unknown> | null | undefined
): UserProfileLink | null {
  if (!link) return null;

  const source = link as Record<string, unknown>;
  const label = safeString(source.label ?? source.name ?? source.type)?.trim() || null;
  const url = safeString(source.url ?? source.link)?.trim() || null;

  if (!label && !url) return null;

  return {
    id: source.id as string | number | undefined,
    label,
    url,
  };
}

export function normalizeUserProfile(
  profile: Partial<UserProfile> | Record<string, unknown> | null | undefined
): UserProfile | null {
  if (!profile) return null;

  const source = profile as Record<string, unknown>;

  return {
    profileId:
      safeNumber(source.profileId ?? source.id ?? source.userProfileId) ?? undefined,
    id: safeNumber(source.id ?? source.profileId ?? source.userProfileId) ?? undefined,
    userId: safeNumber(source.userId),

    firstName: safeString(source.firstName)?.trim() || null,
    lastName: safeString(source.lastName)?.trim() || null,
    fullName:
      safeString(source.fullName ?? source.name)?.trim() ||
      [
        safeString(source.firstName)?.trim(),
        safeString(source.lastName)?.trim(),
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      null,
    headline: safeString(source.headline)?.trim() || null,

    email: safeString(source.email)?.trim() || null,
    phone: safeString(source.phone)?.trim() || null,
    alternatePhone: safeString(source.alternatePhone)?.trim() || null,

    location: safeString(source.location)?.trim() || null,
    city: safeString(source.city)?.trim() || null,
    state: safeString(source.state)?.trim() || null,
    country: safeString(source.country)?.trim() || null,

    summary: safeString(source.summary)?.trim() || null,
    currentRole: safeString(source.currentRole)?.trim() || null,
    experienceLevel: safeString(source.experienceLevel)?.trim() || null,
    yearsOfExperience: safeNumber(source.yearsOfExperience),

    website: safeString(source.website)?.trim() || null,
    linkedinUrl: safeString(source.linkedinUrl)?.trim() || null,
    githubUrl: safeString(source.githubUrl)?.trim() || null,
    portfolioUrl: safeString(source.portfolioUrl)?.trim() || null,

    skills: Array.isArray(source.skills)
      ? source.skills
          .map((item) => normalizeUserProfileSkill(item))
          .filter((item): item is UserProfileSkill => Boolean(item))
      : [],
    experiences: Array.isArray(source.experiences)
      ? source.experiences
          .map((item) => normalizeUserProfileExperience(item))
          .filter((item): item is UserProfileExperience => Boolean(item))
      : [],
    education: Array.isArray(source.education)
      ? source.education
          .map((item) => normalizeUserProfileEducation(item))
          .filter((item): item is UserProfileEducation => Boolean(item))
      : [],
    projects: Array.isArray(source.projects)
      ? source.projects
          .map((item) => normalizeUserProfileProject(item))
          .filter((item): item is UserProfileProject => Boolean(item))
      : [],
    links: Array.isArray(source.links)
      ? source.links
          .map((item) => normalizeUserProfileLink(item))
          .filter((item): item is UserProfileLink => Boolean(item))
      : [],

    profileCompletionPercentage: safeNumber(
      source.profileCompletionPercentage ?? source.completionPercentage
    ),
    completionPercentage: safeNumber(
      source.completionPercentage ?? source.profileCompletionPercentage
    ),
    profileCompleted:
      safeBoolean(source.profileCompleted ?? source.completed ?? source.isComplete) ??
      null,

    sourceResumeId: safeNumber(source.sourceResumeId ?? source.resumeId),
    sourceResumeVersionId: safeNumber(
      source.sourceResumeVersionId ?? source.resumeVersionId
    ),
    lastSyncedAt: safeString(source.lastSyncedAt)?.trim() || null,

    createdAt:
      safeString(source.createdAt ?? source.createdDate)?.trim() || null,
    updatedAt:
      safeString(source.updatedAt ?? source.updatedDate)?.trim() || null,
  };
}

/* =========================================================
   PAYLOAD BUILDERS
========================================================= */

export function buildUpdateUserProfilePayload(
  input: UpdateUserProfilePayload
): UpdateUserProfilePayload {
  return {
    firstName: safeTrimmedString(input.firstName),
    lastName: safeTrimmedString(input.lastName),
    fullName: safeTrimmedString(input.fullName),
    headline: safeTrimmedString(input.headline),

    email: safeTrimmedString(input.email),
    phone: safeTrimmedString(input.phone),
    alternatePhone: safeTrimmedString(input.alternatePhone),

    location: safeTrimmedString(input.location),
    city: safeTrimmedString(input.city),
    state: safeTrimmedString(input.state),
    country: safeTrimmedString(input.country),

    summary: safeTrimmedString(input.summary),
    currentRole: safeTrimmedString(input.currentRole),
    experienceLevel: safeTrimmedString(input.experienceLevel),
    yearsOfExperience:
      typeof input.yearsOfExperience === "number"
        ? input.yearsOfExperience
        : null,

    website: safeTrimmedString(input.website),
    linkedinUrl: safeTrimmedString(input.linkedinUrl),
    githubUrl: safeTrimmedString(input.githubUrl),
    portfolioUrl: safeTrimmedString(input.portfolioUrl),

    skills: Array.isArray(input.skills)
      ? input.skills
          .map((item) => normalizeUserProfileSkill(item))
          .filter((item): item is UserProfileSkill => Boolean(item))
      : undefined,

    experiences: Array.isArray(input.experiences)
      ? input.experiences
          .map((item) => normalizeUserProfileExperience(item))
          .filter((item): item is UserProfileExperience => Boolean(item))
      : undefined,

    education: Array.isArray(input.education)
      ? input.education
          .map((item) => normalizeUserProfileEducation(item))
          .filter((item): item is UserProfileEducation => Boolean(item))
      : undefined,

    projects: Array.isArray(input.projects)
      ? input.projects
          .map((item) => normalizeUserProfileProject(item))
          .filter((item): item is UserProfileProject => Boolean(item))
      : undefined,

    links: Array.isArray(input.links)
      ? input.links
          .map((item) => normalizeUserProfileLink(item))
          .filter((item): item is UserProfileLink => Boolean(item))
      : undefined,
  };
}

export function buildSyncUserProfilePayload(
  input?: SyncUserProfilePayload
): SyncUserProfilePayload {
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

export async function getUserProfile(
  options?: UserProfileApiRequestOptions
): Promise<UserProfileDetails> {
  const raw = await requestWithFallback<UserProfileDetails>(
    ["GET"],
    profilePaths(),
    options
  );

  return normalizeUserProfile(raw) || {};
}

export async function updateUserProfile(
  payload: UpdateUserProfilePayload,
  options?: UserProfileApiRequestOptions
): Promise<UserProfileDetails> {
  const raw = await requestWithFallback<UserProfileDetails>(
    ["PUT", "PATCH"],
    profilePaths(),
    options,
    buildUpdateUserProfilePayload(payload)
  );

  return normalizeUserProfile(raw) || {};
}

export async function syncUserProfileFromResume(
  payload?: SyncUserProfilePayload,
  options?: UserProfileApiRequestOptions
): Promise<UserProfileDetails> {
  const builtPayload = buildSyncUserProfilePayload(payload);

  const raw = await requestWithFallback<UserProfileDetails>(
    ["POST"],
    syncPaths(builtPayload),
    options,
    builtPayload
  );

  return normalizeUserProfile(raw) || {};
}

/* =========================================================
   UI / DOMAIN HELPERS
========================================================= */

export function getUserProfileId(
  profile: Partial<UserProfile> | null | undefined
): number | null {
  if (!profile) return null;
  return safeNumber(profile.profileId ?? profile.id);
}

export function getUserProfileDisplayName(
  profile: Partial<UserProfile> | null | undefined
): string {
  if (!profile) return "User";

  return (
    profile.fullName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
    profile.email ||
    "User"
  );
}

export function getUserProfileCompletion(
  profile: Partial<UserProfile> | null | undefined
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
  if (profile.currentRole) score += 10;
  if (profile.skills?.length) score += 10;
  if (profile.experiences?.length) score += 10;
  if (profile.education?.length) score += 5;
  if (profile.projects?.length) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function isUserProfileComplete(
  profile: Partial<UserProfile> | null | undefined
): boolean {
  if (!profile) return false;

  if (typeof profile.profileCompleted === "boolean") {
    return profile.profileCompleted;
  }

  return getUserProfileCompletion(profile) >= 70;
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const userProfileApi = {
  getUserProfile,
  updateUserProfile,
  syncUserProfileFromResume,

  normalizeUserProfile,
  normalizeUserProfileSkill,
  normalizeUserProfileExperience,
  normalizeUserProfileEducation,
  normalizeUserProfileProject,
  normalizeUserProfileLink,

  buildUpdateUserProfilePayload,
  buildSyncUserProfilePayload,

  getUserProfileId,
  getUserProfileDisplayName,
  getUserProfileCompletion,
  isUserProfileComplete,
};

/* =========================================================
   EXAMPLE USAGE

   import { userProfileApi } from "@/lib/userProfileApi";

   const profile = await userProfileApi.getUserProfile();

   const updated = await userProfileApi.updateUserProfile({
     firstName: "Vishrut",
     lastName: "Rana",
     currentRole: "Frontend Developer",
     summary: "Building backend-integrated resume workflows.",
   });

   const synced = await userProfileApi.syncUserProfileFromResume({
     resumeVersionId: 12,
     overwriteExisting: true,
   });
========================================================= */