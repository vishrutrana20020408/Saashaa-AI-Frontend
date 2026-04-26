// src/types/api.ts
//
// Central API types for frontend ↔ backend integration.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - Shared response envelope support across auth, onboarding, resume,
//   resume versions, profile, tailoring, job application, GitHub analysis,
//   admin modules, and AI-engine integrations
// - Handles wrapped backend response styles:
//   { success, message, data | payload | result | content }
// - Supports pageable responses and flexible backend payload normalization
//
// Usage:
// - Import these shared types across lib/, hooks/, and app/ modules
// - Keep frontend contracts aligned with backend ApiResponse ideology

/* =========================================================
   BASE / COMMON
========================================================= */

export type Primitive = string | number | boolean | null;

export type Nullable<T> = T | null;

export type Maybe<T> = T | null | undefined;

export type Dictionary<T = unknown> = Record<string, T>;

export type IdLike = number | string;

export type TimestampLike = string | null | undefined;

export type SortDirection = "asc" | "desc";

/* =========================================================
   STANDARD API ENVELOPE
========================================================= */

export type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  error?: string;
  details?: unknown;
  status?: number;
  timestamp?: string;
  path?: string;

  data?: T;
  payload?: T;
  result?: T;
  content?: T;
};

export type ApiSuccessResponse<T = unknown> = ApiEnvelope<T> & {
  success?: true;
};

export type ApiErrorResponse = {
  success?: false;
  message?: string;
  error?: string;
  details?: unknown;
  status?: number;
  timestamp?: string;
  path?: string;
};

export type ApiResponse<T = unknown> = ApiEnvelope<T> | T;

/* =========================================================
   PAGINATION / LIST
========================================================= */

export type PageableResponse<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;

  items?: T[];
  rows?: T[];
  list?: T[];
};

export type ApiListResponse<T> = {
  items: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

export type PageQueryParams = {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
};

/* =========================================================
   AUTH / SESSION
========================================================= */

export type UserRole = "USER" | "ADMIN" | string;

export type AuthResponse = {
  token?: string | null;
  accessToken?: string | null;
  jwtToken?: string | null;

  role?: UserRole | null;
  roles?: UserRole[] | null;

  id?: number | string | null;
  userId?: number | string | null;
  adminId?: number | string | null;

  email?: string | null;
  name?: string | null;
};

export type AuthenticatedUser = {
  id?: number | null;
  userId?: number | null;
  email?: string | null;
  name?: string | null;
  fullName?: string | null;
  role?: UserRole | null;
  roles?: UserRole[];
};

/* =========================================================
   ONBOARDING
========================================================= */

export type DomainType = "Technical" | "Non-Technical";

export type SubDomainMode = "single" | "any" | "multi";

export type UserOnboarding = {
  done?: boolean;
  completed?: boolean;

  domain?: DomainType | null;
  subDomainMode?: SubDomainMode | null;
  subDomainSingle?: string | null;
  subDomainMulti?: string[] | null;
  jobTitles?: string[] | null;

  resumeUploaded?: boolean | null;
  resumeScanned?: boolean | null;
  resumeFileName?: string | null;
  resumeScore?: number | null;
};

export type UserOnboardingStatus = UserOnboarding;

/* =========================================================
   RESUME CORE
========================================================= */

export type ResumeStatus =
  | "ACTIVE"
  | "DRAFT"
  | "ARCHIVED"
  | "DELETED"
  | string;

export type ResumeVersionStatus =
  | "ACTIVE"
  | "DRAFT"
  | "PROCESSED"
  | "ARCHIVED"
  | string;

export type ResumeVersionType =
  | "BASE"
  | "TAILORED"
  | "DUPLICATE"
  | "JOB_TARGETED"
  | "CUSTOM"
  | string;

export type SectionType =
  | "SUMMARY"
  | "SKILLS"
  | "EXPERIENCE"
  | "EDUCATION"
  | "PROJECTS"
  | "CERTIFICATIONS"
  | "ACHIEVEMENTS"
  | "LINKS"
  | string;

/* =========================================================
   NOTIFICATIONS
========================================================= */

export type Notification = {
  id: number;
  title: string;
  subtitle: string;
  type: string;
  createdAt: string;
  isRead: boolean;
};

export type ResumeStructuredContent = Record<string, unknown> | null;

export type Resume = {
  resumeId?: number;
  id?: number;
  title?: string | null;
  description?: string | null;
  status?: ResumeStatus | null;
  isBaseResume?: boolean | null;

  currentVersionId?: number | null;
  currentResumeVersionId?: number | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ResumeVersion = {
  resumeVersionId?: number;
  id?: number;

  resumeId?: number | null;
  parentVersionId?: number | null;

  versionCode?: string | null;
  versionName?: string | null;
  versionType?: ResumeVersionType | null;
  status?: ResumeVersionStatus | null;

  atsScore?: number | null;
  isBaseVersion?: boolean | null;

  fileUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;

  rawText?: string | null;
  structuredContentJson?: ResumeStructuredContent;

  jobApplicationCode?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ResumeSection = {
  resumeSectionId?: number;
  id?: number;
  sectionType?: SectionType | null;
  sectionTitle?: string | null;
  sectionOrder?: number | null;
  plainText?: string | null;
  content?: Record<string, unknown> | null;
};

export type ResumePreviewResponse = {
  resumeId?: number | null;
  resumeVersionId?: number | null;
  versionCode?: string | null;
  versionName?: string | null;

  previewUrl?: string | null;
  downloadUrl?: string | null;
  fileUrl?: string | null;

  atsScore?: number | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ResumeScanResponse = {
  success?: boolean;
  message?: string;
  parsed?: Record<string, unknown> | null;
  rawText?: string | null;
  score?: number | null;
  atsScore?: number | null;
  fileName?: string | null;
};

export type ResumeContentUpdateRequest = {
  structuredContent?: Record<string, unknown> | null;
  rawText?: string | null;
  regeneratePreview?: boolean;
};

export type ResumeSectionUpdateRequest = {
  sectionType?: SectionType;
  sectionTitle?: string;
  sectionOrder?: number;
  plainText?: string;
  content?: Record<string, unknown> | null;
};

export type ResumeDuplicateCreateRequest = {
  sourceVersionId?: number;
  versionName?: string;
  reason?: string;
  companyName?: string;
  jobTitle?: string;
  copyStructuredContent?: boolean;
  copyRawText?: boolean;
  generatePreview?: boolean;
};

/* =========================================================
   RESUME TAILORING
========================================================= */

export type ResumeTailorRequest = {
  resumeVersionId?: number | null;
  companyName?: string | null;
  jobTitle?: string | null;
  jobDescription?: string | null;

  knownTools?: string[] | null;
  unknownTools?: string[] | null;

  additionalNotes?: string | null;
};

export type ToolKnowledgeAnswer = {
  toolName?: string | null;
  known?: boolean | null;
  notes?: string | null;
};

export type ToolKnowledgeAnswerRequest = {
  resumeVersionId?: number | null;
  companyName?: string | null;
  jobTitle?: string | null;
  jobDescription?: string | null;
  answers?: ToolKnowledgeAnswer[] | null;
};

export type ResumeTailorResponse = {
  success?: boolean;
  message?: string;

  resumeId?: number | null;
  resumeVersionId?: number | null;
  tailoredResumeVersionId?: number | null;

  versionCode?: string | null;
  versionName?: string | null;

  atsScore?: number | null;
  score?: number | null;

  detectedTools?: string[] | null;
  keywordsMatched?: string[] | null;
  keywordsMissing?: string[] | null;
  suggestions?: string[] | null;

  previewUrl?: string | null;
  downloadUrl?: string | null;
};

/* =========================================================
   JOB APPLICATION
========================================================= */

export type JobApplicationStatus =
  | "DRAFT"
  | "CREATED"
  | "SUBMITTED"
  | "REVIEWED"
  | "REJECTED"
  | string;

export type JobApplicationCreateRequest = {
  resumeVersionId?: number | null;
  companyName?: string | null;
  jobTitle?: string | null;
  jobDescription?: string | null;
  applicationSource?: string | null;
  additionalNotes?: string | null;

  generateTailoredResume?: boolean;
  generatePreview?: boolean;

  toolAnswers?: ToolKnowledgeAnswer[] | null;
};

export type JobApplicationResponse = {
  jobApplicationId?: number | null;
  id?: number | null;

  applicationCode?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  jobDescription?: string | null;
  applicationSource?: string | null;
  additionalNotes?: string | null;

  status?: JobApplicationStatus | null;

  resumeId?: number | null;
  resumeVersionId?: number | null;
  tailoredResumeVersionId?: number | null;

  atsScoreBefore?: number | null;
  atsScoreAfter?: number | null;

  detectedTools?: string[] | null;
  keywordsMatched?: string[] | null;
  keywordsMissing?: string[] | null;

  previewUrl?: string | null;
  downloadUrl?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

/* =========================================================
   PROFILE
========================================================= */

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

export type AdminProfile = UserProfile & {
  adminId?: number | null;
};

/* =========================================================
   GITHUB ANALYSIS / AI ENGINE
========================================================= */

export type AiHealthResponse = {
  success?: boolean;
  message?: string;
  status?: string | null;
  provider?: string | null;
};

/* =========================================================
   INTERVIEW DOMAIN
========================================================= */

export type InterviewMode = "PRACTICE" | "REALTIME" | string;

export type InterviewType =
  | "TECHNICAL"
  | "HR"
  | "BEHAVIORAL"
  | "SYSTEM_DESIGN"
  | string;

export type InterviewStatus =
  | "CREATED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | string;

export type InterviewSession = {
  interviewSessionId?: number | null;
  id?: number | null;

  title?: string | null;
  mode?: InterviewMode | null;
  type?: InterviewType | null;
  status?: InterviewStatus | null;

  resumeVersionId?: number | null;
  githubAnalysisId?: number | null;

  startedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

/* =========================================================
   UPLOAD
========================================================= */

export type UploadResponseLike = {
  success?: boolean;
  message?: string;

  id?: number | string | null;
  resumeId?: number | string | null;
  resumeVersionId?: number | string | null;
  versionId?: number | string | null;

  versionCode?: string | null;
  versionName?: string | null;

  fileName?: string | null;
  fileUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;

  status?: string | null;

  rawText?: string | null;
  structuredContentJson?: Record<string, unknown> | string | null;

  atsScore?: number | null;
  score?: number | null;
};

export type ResumeUploadResponse = {
  success: boolean;
  message?: string;

  resumeId?: number | null;
  resumeVersionId?: number | null;

  versionCode?: string | null;
  versionName?: string | null;

  fileName?: string | null;
  fileUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;

  status?: string | null;
  atsScore?: number | null;

  raw?: unknown;
};

/* =========================================================
   GENERIC REQUEST OPTIONS
========================================================= */

export type ApiRequestOptions = {
  token?: string | null;
  apiBaseUrl?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  withCredentials?: boolean;
};

/* =========================================================
   GENERIC HELPERS
========================================================= */

export type UnwrappedApiData<T> = T extends ApiEnvelope<infer U> ? U : T;

export type MaybeArray<T> = T | T[];

export type StatusMessage = {
  success?: boolean;
  message?: string;
};

export type IdResponse = {
  id?: number | null;
};

export type HealthResponse = {
  success?: boolean;
  message?: string;
  status?: string | null;
};

/* =========================================================
   OPTIONAL UI-FRIENDLY UNION TYPES
========================================================= */

export type AnyProfile = UserProfile | AdminProfile;

export type AnyResumeEntity = Resume | ResumeVersion | ResumeSection;

export type AnyApiEntity =
  | AuthResponse
  | UserOnboarding
  | Resume
  | ResumeVersion
  | ResumeSection
  | ResumePreviewResponse
  | ResumeTailorResponse
  | JobApplicationResponse
  | UserProfile
  | AdminProfile
  | InterviewSession;

/* =========================================================
   EXAMPLE IMPORTS

   import type {
     ApiEnvelope,
     ApiListResponse,
     PageableResponse,
     ResumeVersion,
     UserProfile,
     ResumeTailorResponse,
     JobApplicationResponse,
   } from "@/types/api";
========================================================= */