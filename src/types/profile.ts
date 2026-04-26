// src/types/profile.ts
//
// Unified profile types for frontend ↔ backend integration.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - Merges both userProfile.ts and adminProfile.ts into one shared profile type module
// - Shared across:
//   - src/lib/userProfileApi.ts
//   - src/lib/adminProfileApi.ts
//   - src/lib/profileNavbarApi.ts
//   - src/components/profile/*
//   - user/admin profile screens
//   - resume-to-profile sync flows
//
// Backend integration goals:
// - supports Spring Boot wrapped responses
// - supports plain object responses
// - supports boolean/number/string-friendly backend values
// - supports profile data derived from resume parsing/sync
// - aligns with Interview System / Resume Management System architecture

/* =========================================================
   COMMON / API TYPES
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

export type ProfileRole = "USER" | "ADMIN";

/* =========================================================
   SHARED PROFILE DOMAIN TYPES
========================================================= */

export type ProfileSkill = {
  id?: number | string;
  name?: string | null;
  category?: string | null;
  level?: string | null;
};

export type ProfileExperience = {
  id?: number | string;
  company?: string | null;
  role?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  currentlyWorking?: boolean | null;
  description?: string | null;
};

export type ProfileEducation = {
  id?: number | string;
  institution?: string | null;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  grade?: string | null;
  description?: string | null;
};

export type ProfileProject = {
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

export type ProfileLink = {
  id?: number | string;
  label?: string | null;
  url?: string | null;
};

export type BaseProfile = {
  profileId?: number;
  id?: number;

  userId?: number | null;
  adminId?: number | null;

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

  skills?: ProfileSkill[];
  experiences?: ProfileExperience[];
  education?: ProfileEducation[];
  projects?: ProfileProject[];
  links?: ProfileLink[];

  profileCompletionPercentage?: number | null;
  completionPercentage?: number | null;
  profileCompleted?: boolean | null;

  sourceResumeId?: number | null;
  sourceResumeVersionId?: number | null;
  lastSyncedAt?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UserProfile = BaseProfile & {
  roleType?: "USER";
};

export type AdminProfile = BaseProfile & {
  roleType?: "ADMIN";
  designation?: string | null;
  department?: string | null;
};

export type Profile = UserProfile | AdminProfile;

export type UserProfileDetails = UserProfile;
export type AdminProfileDetails = AdminProfile;

/* =========================================================
   NAVBAR / LIGHTWEIGHT PROFILE TYPES
========================================================= */

export type BaseProfileNavbarData = {
  profileId?: number | null;
  id?: number | null;

  userId?: number | null;
  adminId?: number | null;

  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  headline?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  currentRole?: string | null;
  summary?: string | null;
  profileCompletionPercentage?: number | null;
  completionPercentage?: number | null;
  profileCompleted?: boolean | null;
  updatedAt?: string | null;
};

export type UserProfileNavbarData = BaseProfileNavbarData & {
  roleType?: "USER";
};

export type AdminProfileNavbarData = BaseProfileNavbarData & {
  roleType?: "ADMIN";
  designation?: string | null;
  department?: string | null;
};

export type ProfileNavbarData = UserProfileNavbarData | AdminProfileNavbarData;

/* =========================================================
   REQUEST / RESPONSE TYPES
========================================================= */

export type BaseUpdateProfilePayload = {
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
  skills?: ProfileSkill[];
  experiences?: ProfileExperience[];
  education?: ProfileEducation[];
  projects?: ProfileProject[];
  links?: ProfileLink[];
};

export type UpdateUserProfilePayload = BaseUpdateProfilePayload;

export type UpdateAdminProfilePayload = BaseUpdateProfilePayload & {
  designation?: string;
  department?: string;
};

export type UpdateProfilePayload =
  | UpdateUserProfilePayload
  | UpdateAdminProfilePayload;

export type BaseSyncProfilePayload = {
  resumeId?: number | null;
  resumeVersionId?: number | null;
  overwriteExisting?: boolean;
};

export type SyncUserProfilePayload = BaseSyncProfilePayload;
export type SyncAdminProfilePayload = BaseSyncProfilePayload;
export type SyncProfilePayload = BaseSyncProfilePayload;

export type UserProfileResponse = {
  success?: boolean;
  message?: string;
  profile?: UserProfile | null;
};

export type AdminProfileResponse = {
  success?: boolean;
  message?: string;
  profile?: AdminProfile | null;
};

export type UserProfileSyncResponse = {
  success?: boolean;
  message?: string;
  profile?: UserProfile | null;
};

export type AdminProfileSyncResponse = {
  success?: boolean;
  message?: string;
  profile?: AdminProfile | null;
};

export type ProfileResponse = {
  success?: boolean;
  message?: string;
  profile?: Profile | null;
};

export type ProfileSyncResponse = {
  success?: boolean;
  message?: string;
  profile?: Profile | null;
};

/* =========================================================
   TYPE GUARDS
========================================================= */

export function isProfile(value: unknown): value is Profile {
  return typeof value === "object" && value !== null;
}

export function isUserProfile(value: unknown): value is UserProfile {
  if (!isProfile(value)) return false;
  const record = value as Record<string, unknown>;
  return record.adminId === undefined || record.adminId === null;
}

export function isAdminProfile(value: unknown): value is AdminProfile {
  if (!isProfile(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    record.adminId !== undefined ||
    record.designation !== undefined ||
    record.department !== undefined
  );
}

/* =========================================================
   BASIC HELPERS
========================================================= */

export function safeProfileString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function safeProfileTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function safeProfileNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function safeProfileBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    return value === 1 ? true : value === 0 ? false : null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

export function uniqueProfileStrings(values?: unknown): string[] {
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

export function unwrapProfileResponse<T>(value: unknown): T {
  let current = value;
  let depth = 0;

  while (current && typeof current === "object" && depth < 6) {
    const obj = current as Record<string, unknown>;

    if (obj.data !== undefined) {
      current = obj.data;
      depth += 1;
      continue;
    }
    if (obj.result !== undefined) {
      current = obj.result;
      depth += 1;
      continue;
    }
    if (obj.payload !== undefined) {
      current = obj.payload;
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

/* =========================================================
   NORMALIZERS - SHARED CHILD TYPES
========================================================= */

export function normalizeProfileSkill(
  skill: Partial<ProfileSkill> | Record<string, unknown> | null | undefined
): ProfileSkill | null {
  if (!skill) return null;

  const source = skill as Record<string, unknown>;
  const name =
    safeProfileString(source.name ?? source.skillName ?? source.title)?.trim() ||
    null;

  if (!name) return null;

  return {
    id: source.id as number | string | undefined,
    name,
    category:
      safeProfileString(source.category ?? source.skillCategory)?.trim() || null,
    level:
      safeProfileString(source.level ?? source.proficiency)?.trim() || null,
  };
}

export function normalizeProfileExperience(
  experience:
    | Partial<ProfileExperience>
    | Record<string, unknown>
    | null
    | undefined
): ProfileExperience | null {
  if (!experience) return null;

  const source = experience as Record<string, unknown>;

  return {
    id: source.id as number | string | undefined,
    company:
      safeProfileString(source.company ?? source.companyName)?.trim() || null,
    role:
      safeProfileString(source.role ?? source.title ?? source.position)?.trim() ||
      null,
    location: safeProfileString(source.location)?.trim() || null,
    startDate:
      safeProfileString(source.startDate ?? source.fromDate ?? source.start)?.trim() ||
      null,
    endDate:
      safeProfileString(source.endDate ?? source.toDate ?? source.end)?.trim() ||
      null,
    currentlyWorking:
      safeProfileBoolean(
        source.currentlyWorking ?? source.isCurrent ?? source.present
      ) ?? null,
    description: safeProfileString(source.description)?.trim() || null,
  };
}

export function normalizeProfileEducation(
  education:
    | Partial<ProfileEducation>
    | Record<string, unknown>
    | null
    | undefined
): ProfileEducation | null {
  if (!education) return null;

  const source = education as Record<string, unknown>;

  return {
    id: source.id as number | string | undefined,
    institution:
      safeProfileString(source.institution ?? source.school ?? source.college)?.trim() ||
      null,
    degree: safeProfileString(source.degree)?.trim() || null,
    fieldOfStudy:
      safeProfileString(
        source.fieldOfStudy ?? source.field ?? source.specialization
      )?.trim() || null,
    startDate:
      safeProfileString(source.startDate ?? source.fromDate ?? source.start)?.trim() ||
      null,
    endDate:
      safeProfileString(source.endDate ?? source.toDate ?? source.end)?.trim() ||
      null,
    grade:
      safeProfileString(source.grade ?? source.cgpa ?? source.gpa)?.trim() || null,
    description: safeProfileString(source.description)?.trim() || null,
  };
}

export function normalizeProfileProject(
  project: Partial<ProfileProject> | Record<string, unknown> | null | undefined
): ProfileProject | null {
  if (!project) return null;

  const source = project as Record<string, unknown>;

  return {
    id: source.id as number | string | undefined,
    name: safeProfileString(source.name ?? source.projectName)?.trim() || null,
    role: safeProfileString(source.role)?.trim() || null,
    description: safeProfileString(source.description)?.trim() || null,
    technologies: uniqueProfileStrings(
      source.technologies ?? source.techStack ?? source.tools
    ),
    startDate:
      safeProfileString(source.startDate ?? source.fromDate ?? source.start)?.trim() ||
      null,
    endDate:
      safeProfileString(source.endDate ?? source.toDate ?? source.end)?.trim() ||
      null,
    link: safeProfileString(source.link ?? source.url)?.trim() || null,
    github: safeProfileString(source.github ?? source.githubUrl)?.trim() || null,
  };
}

export function normalizeProfileLink(
  link: Partial<ProfileLink> | Record<string, unknown> | null | undefined
): ProfileLink | null {
  if (!link) return null;

  const source = link as Record<string, unknown>;
  const label =
    safeProfileString(source.label ?? source.name ?? source.type)?.trim() || null;
  const url = safeProfileString(source.url ?? source.link)?.trim() || null;

  if (!label && !url) return null;

  return {
    id: source.id as number | string | undefined,
    label,
    url,
  };
}

/* =========================================================
   NORMALIZERS - MAIN PROFILES
========================================================= */

export function normalizeUserProfile(
  profile: Partial<UserProfile> | Record<string, unknown> | null | undefined
): UserProfile | null {
  if (!profile) return null;

  const source = profile as Record<string, unknown>;

  return {
    roleType: "USER",
    profileId:
      safeProfileNumber(source.profileId ?? source.id ?? source.userProfileId) ??
      undefined,
    id:
      safeProfileNumber(source.id ?? source.profileId ?? source.userProfileId) ??
      undefined,

    userId: safeProfileNumber(source.userId),
    adminId: null,

    firstName: safeProfileString(source.firstName)?.trim() || null,
    lastName: safeProfileString(source.lastName)?.trim() || null,
    fullName:
      safeProfileString(source.fullName ?? source.name)?.trim() ||
      [
        safeProfileString(source.firstName)?.trim(),
        safeProfileString(source.lastName)?.trim(),
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      null,
    headline: safeProfileString(source.headline)?.trim() || null,

    email: safeProfileString(source.email)?.trim() || null,
    phone: safeProfileString(source.phone)?.trim() || null,
    alternatePhone: safeProfileString(source.alternatePhone)?.trim() || null,

    location: safeProfileString(source.location)?.trim() || null,
    city: safeProfileString(source.city)?.trim() || null,
    state: safeProfileString(source.state)?.trim() || null,
    country: safeProfileString(source.country)?.trim() || null,

    summary: safeProfileString(source.summary)?.trim() || null,
    currentRole: safeProfileString(source.currentRole)?.trim() || null,
    experienceLevel: safeProfileString(source.experienceLevel)?.trim() || null,
    yearsOfExperience: safeProfileNumber(source.yearsOfExperience),

    website: safeProfileString(source.website)?.trim() || null,
    linkedinUrl: safeProfileString(source.linkedinUrl)?.trim() || null,
    githubUrl: safeProfileString(source.githubUrl)?.trim() || null,
    portfolioUrl: safeProfileString(source.portfolioUrl)?.trim() || null,

    skills: Array.isArray(source.skills)
      ? source.skills
          .map((item) => normalizeProfileSkill(item))
          .filter((item): item is ProfileSkill => Boolean(item))
      : [],
    experiences: Array.isArray(source.experiences)
      ? source.experiences
          .map((item) => normalizeProfileExperience(item))
          .filter((item): item is ProfileExperience => Boolean(item))
      : [],
    education: Array.isArray(source.education)
      ? source.education
          .map((item) => normalizeProfileEducation(item))
          .filter((item): item is ProfileEducation => Boolean(item))
      : [],
    projects: Array.isArray(source.projects)
      ? source.projects
          .map((item) => normalizeProfileProject(item))
          .filter((item): item is ProfileProject => Boolean(item))
      : [],
    links: Array.isArray(source.links)
      ? source.links
          .map((item) => normalizeProfileLink(item))
          .filter((item): item is ProfileLink => Boolean(item))
      : [],

    profileCompletionPercentage: safeProfileNumber(
      source.profileCompletionPercentage ?? source.completionPercentage
    ),
    completionPercentage: safeProfileNumber(
      source.completionPercentage ?? source.profileCompletionPercentage
    ),
    profileCompleted:
      safeProfileBoolean(source.profileCompleted ?? source.completed ?? source.isComplete) ??
      null,

    sourceResumeId: safeProfileNumber(source.sourceResumeId ?? source.resumeId),
    sourceResumeVersionId: safeProfileNumber(
      source.sourceResumeVersionId ?? source.resumeVersionId
    ),
    lastSyncedAt: safeProfileString(source.lastSyncedAt)?.trim() || null,

    createdAt: safeProfileString(source.createdAt)?.trim() || null,
    updatedAt: safeProfileString(source.updatedAt)?.trim() || null,
  };
}

export function normalizeAdminProfile(
  profile: Partial<AdminProfile> | Record<string, unknown> | null | undefined
): AdminProfile | null {
  if (!profile) return null;

  const source = profile as Record<string, unknown>;

  return {
    roleType: "ADMIN",
    profileId:
      safeProfileNumber(source.profileId ?? source.id ?? source.adminProfileId) ??
      undefined,
    id:
      safeProfileNumber(source.id ?? source.profileId ?? source.adminProfileId) ??
      undefined,

    adminId: safeProfileNumber(source.adminId),
    userId: safeProfileNumber(source.userId),

    firstName: safeProfileString(source.firstName)?.trim() || null,
    lastName: safeProfileString(source.lastName)?.trim() || null,
    fullName:
      safeProfileString(source.fullName ?? source.name)?.trim() ||
      [
        safeProfileString(source.firstName)?.trim(),
        safeProfileString(source.lastName)?.trim(),
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      null,
    headline: safeProfileString(source.headline)?.trim() || null,

    email: safeProfileString(source.email)?.trim() || null,
    phone: safeProfileString(source.phone)?.trim() || null,
    alternatePhone: safeProfileString(source.alternatePhone)?.trim() || null,

    location: safeProfileString(source.location)?.trim() || null,
    city: safeProfileString(source.city)?.trim() || null,
    state: safeProfileString(source.state)?.trim() || null,
    country: safeProfileString(source.country)?.trim() || null,

    summary: safeProfileString(source.summary)?.trim() || null,
    currentRole: safeProfileString(source.currentRole)?.trim() || null,
    designation: safeProfileString(source.designation)?.trim() || null,
    department: safeProfileString(source.department)?.trim() || null,
    experienceLevel: safeProfileString(source.experienceLevel)?.trim() || null,
    yearsOfExperience: safeProfileNumber(source.yearsOfExperience),

    website: safeProfileString(source.website)?.trim() || null,
    linkedinUrl: safeProfileString(source.linkedinUrl)?.trim() || null,
    githubUrl: safeProfileString(source.githubUrl)?.trim() || null,
    portfolioUrl: safeProfileString(source.portfolioUrl)?.trim() || null,

    skills: Array.isArray(source.skills)
      ? source.skills
          .map((item) => normalizeProfileSkill(item))
          .filter((item): item is ProfileSkill => Boolean(item))
      : [],
    experiences: Array.isArray(source.experiences)
      ? source.experiences
          .map((item) => normalizeProfileExperience(item))
          .filter((item): item is ProfileExperience => Boolean(item))
      : [],
    education: Array.isArray(source.education)
      ? source.education
          .map((item) => normalizeProfileEducation(item))
          .filter((item): item is ProfileEducation => Boolean(item))
      : [],
    projects: Array.isArray(source.projects)
      ? source.projects
          .map((item) => normalizeProfileProject(item))
          .filter((item): item is ProfileProject => Boolean(item))
      : [],
    links: Array.isArray(source.links)
      ? source.links
          .map((item) => normalizeProfileLink(item))
          .filter((item): item is ProfileLink => Boolean(item))
      : [],

    profileCompletionPercentage: safeProfileNumber(
      source.profileCompletionPercentage ?? source.completionPercentage
    ),
    completionPercentage: safeProfileNumber(
      source.completionPercentage ?? source.profileCompletionPercentage
    ),
    profileCompleted:
      safeProfileBoolean(source.profileCompleted ?? source.completed ?? source.isComplete) ??
      null,

    sourceResumeId: safeProfileNumber(source.sourceResumeId ?? source.resumeId),
    sourceResumeVersionId: safeProfileNumber(
      source.sourceResumeVersionId ?? source.resumeVersionId
    ),
    lastSyncedAt: safeProfileString(source.lastSyncedAt)?.trim() || null,

    createdAt: safeProfileString(source.createdAt)?.trim() || null,
    updatedAt: safeProfileString(source.updatedAt)?.trim() || null,
  };
}

export function normalizeProfile(
  profile: Partial<Profile> | Record<string, unknown> | null | undefined,
  role: ProfileRole = "USER"
): Profile | null {
  if (!profile) return null;
  return role === "ADMIN"
    ? normalizeAdminProfile(profile)
    : normalizeUserProfile(profile);
}

export function normalizeUserProfileNavbarData(
  value:
    | Partial<UserProfileNavbarData>
    | Record<string, unknown>
    | null
    | undefined
): UserProfileNavbarData | null {
  if (!value) return null;

  const source = value as Record<string, unknown>;

  return {
    roleType: "USER",
    profileId: safeProfileNumber(source.profileId ?? source.id),
    id: safeProfileNumber(source.id ?? source.profileId),
    userId: safeProfileNumber(source.userId),
    adminId: null,
    firstName: safeProfileString(source.firstName)?.trim() || null,
    lastName: safeProfileString(source.lastName)?.trim() || null,
    fullName: safeProfileString(source.fullName)?.trim() || null,
    headline: safeProfileString(source.headline)?.trim() || null,
    email: safeProfileString(source.email)?.trim() || null,
    phone: safeProfileString(source.phone)?.trim() || null,
    location: safeProfileString(source.location)?.trim() || null,
    currentRole: safeProfileString(source.currentRole)?.trim() || null,
    summary: safeProfileString(source.summary)?.trim() || null,
    profileCompletionPercentage: safeProfileNumber(
      source.profileCompletionPercentage
    ),
    completionPercentage: safeProfileNumber(source.completionPercentage),
    profileCompleted: safeProfileBoolean(source.profileCompleted),
    updatedAt: safeProfileString(source.updatedAt)?.trim() || null,
  };
}

export function normalizeAdminProfileNavbarData(
  value:
    | Partial<AdminProfileNavbarData>
    | Record<string, unknown>
    | null
    | undefined
): AdminProfileNavbarData | null {
  if (!value) return null;

  const source = value as Record<string, unknown>;

  return {
    roleType: "ADMIN",
    profileId: safeProfileNumber(source.profileId ?? source.id),
    id: safeProfileNumber(source.id ?? source.profileId),
    adminId: safeProfileNumber(source.adminId),
    userId: safeProfileNumber(source.userId),
    firstName: safeProfileString(source.firstName)?.trim() || null,
    lastName: safeProfileString(source.lastName)?.trim() || null,
    fullName: safeProfileString(source.fullName)?.trim() || null,
    headline: safeProfileString(source.headline)?.trim() || null,
    email: safeProfileString(source.email)?.trim() || null,
    phone: safeProfileString(source.phone)?.trim() || null,
    location: safeProfileString(source.location)?.trim() || null,
    currentRole: safeProfileString(source.currentRole)?.trim() || null,
    designation: safeProfileString(source.designation)?.trim() || null,
    department: safeProfileString(source.department)?.trim() || null,
    summary: safeProfileString(source.summary)?.trim() || null,
    profileCompletionPercentage: safeProfileNumber(
      source.profileCompletionPercentage
    ),
    completionPercentage: safeProfileNumber(source.completionPercentage),
    profileCompleted: safeProfileBoolean(source.profileCompleted),
    updatedAt: safeProfileString(source.updatedAt)?.trim() || null,
  };
}

export function normalizeProfileResponse(
  response: Partial<ProfileResponse> | Record<string, unknown> | null | undefined,
  role: ProfileRole = "USER"
): ProfileResponse {
  const source =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};

  const unwrapped = unwrapProfileResponse<Record<string, unknown> | Profile>(source);

  const normalizedProfile =
    source.profile !== undefined
      ? normalizeProfile(source.profile as Record<string, unknown>, role)
      : normalizeProfile(unwrapped, role);

  return {
    success:
      typeof source.success === "boolean" ? source.success : true,
    message: safeProfileString(source.message)?.trim() || undefined,
    profile: normalizedProfile,
  };
}

export function normalizeProfileSyncResponse(
  response:
    | Partial<ProfileSyncResponse>
    | Record<string, unknown>
    | null
    | undefined,
  role: ProfileRole = "USER"
): ProfileSyncResponse {
  return normalizeProfileResponse(response, role);
}

/* =========================================================
   UI HELPERS
========================================================= */

export function getProfileId(
  profile: Partial<Profile> | null | undefined
): number | null {
  if (!profile) return null;
  return safeProfileNumber(profile.profileId ?? profile.id);
}

export function getUserProfileId(
  profile: Partial<UserProfile> | null | undefined
): number | null {
  return getProfileId(profile);
}

export function getAdminProfileId(
  profile: Partial<AdminProfile> | null | undefined
): number | null {
  return getProfileId(profile);
}

export function getProfileDisplayName(
  profile: Partial<Profile> | null | undefined,
  fallback = "User"
): string {
  if (!profile) return fallback;
  return (
    profile.fullName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
    profile.email ||
    fallback
  );
}

export function getUserProfileDisplayName(
  profile: Partial<UserProfile> | null | undefined
): string {
  return getProfileDisplayName(profile, "User");
}

export function getAdminProfileDisplayName(
  profile: Partial<AdminProfile> | null | undefined
): string {
  return getProfileDisplayName(profile, "Admin");
}

export function getProfileInitials(
  profile: Partial<Profile> | null | undefined,
  fallback = "U"
): string {
  if (!profile) return fallback;

  const displayName = getProfileDisplayName(profile, fallback);
  const parts = displayName.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("");

  return initials || fallback;
}

export function getUserProfileInitials(
  profile: Partial<UserProfile> | null | undefined
): string {
  return getProfileInitials(profile, "U");
}

export function getAdminProfileInitials(
  profile: Partial<AdminProfile> | null | undefined
): string {
  return getProfileInitials(profile, "A");
}

export function getProfileCompletion(
  profile: Partial<Profile> | null | undefined
): number {
  if (!profile) return 0;

  const explicit =
    safeProfileNumber(profile.profileCompletionPercentage) ??
    safeProfileNumber(profile.completionPercentage);

  if (explicit !== null) {
    return Math.max(0, Math.min(100, explicit));
  }

  let score = 0;
  if (profile.fullName || profile.firstName) score += 15;
  if (profile.email) score += 10;
  if (profile.phone) score += 10;
  if (profile.location) score += 10;
  if (profile.summary) score += 15;
  if (profile.currentRole || (profile as AdminProfile).designation) score += 10;
  if (profile.skills?.length) score += 10;
  if (profile.experiences?.length) score += 10;
  if (profile.education?.length) score += 5;
  if (profile.projects?.length) score += 5;

  return Math.max(0, Math.min(100, score));
}

export function getUserProfileCompletion(
  profile: Partial<UserProfile> | null | undefined
): number {
  return getProfileCompletion(profile);
}

export function getAdminProfileCompletion(
  profile: Partial<AdminProfile> | null | undefined
): number {
  return getProfileCompletion(profile);
}

export function isProfileComplete(
  profile: Partial<Profile> | null | undefined
): boolean {
  if (!profile) return false;

  if (typeof profile.profileCompleted === "boolean") {
    return profile.profileCompleted;
  }

  return getProfileCompletion(profile) >= 70;
}

export function isUserProfileComplete(
  profile: Partial<UserProfile> | null | undefined
): boolean {
  return isProfileComplete(profile);
}

export function isAdminProfileComplete(
  profile: Partial<AdminProfile> | null | undefined
): boolean {
  return isProfileComplete(profile);
}

/* =========================================================
   PAYLOAD HELPERS
========================================================= */

export function buildUpdateUserProfilePayload(
  input: UpdateUserProfilePayload
): UpdateUserProfilePayload {
  return {
    firstName: safeProfileTrimmedString(input.firstName),
    lastName: safeProfileTrimmedString(input.lastName),
    fullName: safeProfileTrimmedString(input.fullName),
    headline: safeProfileTrimmedString(input.headline),
    email: safeProfileTrimmedString(input.email),
    phone: safeProfileTrimmedString(input.phone),
    alternatePhone: safeProfileTrimmedString(input.alternatePhone),
    location: safeProfileTrimmedString(input.location),
    city: safeProfileTrimmedString(input.city),
    state: safeProfileTrimmedString(input.state),
    country: safeProfileTrimmedString(input.country),
    summary: safeProfileTrimmedString(input.summary),
    currentRole: safeProfileTrimmedString(input.currentRole),
    experienceLevel: safeProfileTrimmedString(input.experienceLevel),
    yearsOfExperience:
      typeof input.yearsOfExperience === "number"
        ? input.yearsOfExperience
        : null,
    website: safeProfileTrimmedString(input.website),
    linkedinUrl: safeProfileTrimmedString(input.linkedinUrl),
    githubUrl: safeProfileTrimmedString(input.githubUrl),
    portfolioUrl: safeProfileTrimmedString(input.portfolioUrl),
    skills: Array.isArray(input.skills)
      ? input.skills
          .map((item) => normalizeProfileSkill(item))
          .filter((item): item is ProfileSkill => Boolean(item))
      : undefined,
    experiences: Array.isArray(input.experiences)
      ? input.experiences
          .map((item) => normalizeProfileExperience(item))
          .filter((item): item is ProfileExperience => Boolean(item))
      : undefined,
    education: Array.isArray(input.education)
      ? input.education
          .map((item) => normalizeProfileEducation(item))
          .filter((item): item is ProfileEducation => Boolean(item))
      : undefined,
    projects: Array.isArray(input.projects)
      ? input.projects
          .map((item) => normalizeProfileProject(item))
          .filter((item): item is ProfileProject => Boolean(item))
      : undefined,
    links: Array.isArray(input.links)
      ? input.links
          .map((item) => normalizeProfileLink(item))
          .filter((item): item is ProfileLink => Boolean(item))
      : undefined,
  };
}

export function buildUpdateAdminProfilePayload(
  input: UpdateAdminProfilePayload
): UpdateAdminProfilePayload {
  return {
    ...buildUpdateUserProfilePayload(input),
    designation: safeProfileTrimmedString(input.designation),
    department: safeProfileTrimmedString(input.department),
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
   BACKWARD-COMPATIBILITY TYPE ALIASES
========================================================= */

export type UserProfileSkill = ProfileSkill;
export type UserProfileExperience = ProfileExperience;
export type UserProfileEducation = ProfileEducation;
export type UserProfileProject = ProfileProject;
export type UserProfileLink = ProfileLink;

export type AdminProfileSkill = ProfileSkill;
export type AdminProfileExperience = ProfileExperience;
export type AdminProfileEducation = ProfileEducation;
export type AdminProfileProject = ProfileProject;
export type AdminProfileLink = ProfileLink;

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const profileTypeUtils = {
  isProfile,
  isUserProfile,
  isAdminProfile,

  safeProfileString,
  safeProfileTrimmedString,
  safeProfileNumber,
  safeProfileBoolean,
  uniqueProfileStrings,
  unwrapProfileResponse,

  normalizeProfileSkill,
  normalizeProfileExperience,
  normalizeProfileEducation,
  normalizeProfileProject,
  normalizeProfileLink,

  normalizeUserProfile,
  normalizeAdminProfile,
  normalizeProfile,

  normalizeUserProfileNavbarData,
  normalizeAdminProfileNavbarData,

  normalizeProfileResponse,
  normalizeProfileSyncResponse,

  getProfileId,
  getUserProfileId,
  getAdminProfileId,

  getProfileDisplayName,
  getUserProfileDisplayName,
  getAdminProfileDisplayName,

  getProfileInitials,
  getUserProfileInitials,
  getAdminProfileInitials,

  getProfileCompletion,
  getUserProfileCompletion,
  getAdminProfileCompletion,

  isProfileComplete,
  isUserProfileComplete,
  isAdminProfileComplete,

  buildUpdateUserProfilePayload,
  buildUpdateAdminProfilePayload,
  buildSyncUserProfilePayload,
  buildSyncAdminProfilePayload,
};

/* =========================================================
   EXAMPLE USAGE

   import type {
     UserProfile,
     AdminProfile,
     UpdateUserProfilePayload,
     UpdateAdminProfilePayload,
   } from "@/types/profile";

   import { profileTypeUtils } from "@/types/profile";

   const userProfile = profileTypeUtils.normalizeUserProfile(apiResponse);
   const adminProfile = profileTypeUtils.normalizeAdminProfile(apiResponse);

   const userPayload = profileTypeUtils.buildUpdateUserProfilePayload({
     firstName: "Vishrut",
     currentRole: "Frontend Developer",
   });

   const adminPayload = profileTypeUtils.buildUpdateAdminProfilePayload({
     firstName: "Admin",
     designation: "Platform Lead",
     department: "Engineering",
   });
========================================================= */