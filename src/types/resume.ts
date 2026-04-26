// src/types/resume.ts
//
// Central resume-related types and helpers for frontend ↔ backend integration.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - Unified source of truth for:
//   - base resume entity types
//   - resume versioning
//   - resume editor
//   - preview / download flows
//   - ATS-related resume metadata
//   - tailoring / duplicate / restore / set-base flows
//
// Shared across:
//   - src/lib/resumeApi.ts
//   - src/lib/resumeVersionApi.ts
//   - src/lib/resumeTailorApi.ts
//   - src/config/resumeEditorConfig.ts
//   - resume editor components
//   - resume preview components
//   - admin resume version screens
//   - user resume version list / compare / edit flows
//
// Supported backend patterns:
// - plain object response
// - wrapped response:
//   { success, message, data | payload | result | content }
// - pageable list responses
// - structured content returned as JSON object or JSON string
//
// Notes:
// - This file intentionally merges the older responsibilities of:
//   - src/types/resumeEditor.ts
//   - src/types/resumeVersion.ts
// - It also defines the base resume contracts imported by other modules

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

export type SortDirection = "asc" | "desc";

/* =========================================================
   CORE RESUME DOMAIN TYPES
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
  | "JOB_TARGETED"
  | "CUSTOM"
  | "DUPLICATE"
  | string;

export type ResumeVersionAction =
  | "create"
  | "update"
  | "duplicate"
  | "restore"
  | "set-base"
  | "archive"
  | "delete"
  | "preview"
  | "download";

export type SectionType =
  | "HEADER"
  | "SUMMARY"
  | "EXPERIENCE"
  | "EDUCATION"
  | "SKILLS"
  | "PROJECTS"
  | "CERTIFICATIONS"
  | "ACHIEVEMENTS"
  | "LANGUAGES"
  | "TOOLS"
  | "LINKS"
  | "CUSTOM"
  | string;

export type ResumeStructuredContent = Record<string, unknown> | null;

/* =========================================================
   CORE RESUME ENTITY TYPES
========================================================= */

export type Resume = {
  resumeId?: number;
  id?: number;

  userId?: number | null;
  title?: string | null;
  description?: string | null;

  status?: ResumeStatus | null;
  isBaseResume?: boolean | null;

  currentVersionId?: number | null;
  currentResumeVersionId?: number | null;

  fileUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;

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

  jobApplicationCode?: string | null;

  fileUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;

  rawText?: string | null;
  structuredContentJson?: ResumeStructuredContent;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ResumeVersionDetails = ResumeVersion;

export type ResumeVersionSummary = {
  resumeVersionId?: number;
  id?: number;

  versionCode?: string | null;
  versionName?: string | null;
  versionType?: ResumeVersionType | null;
  atsScore?: number | null;
  isBaseVersion?: boolean | null;
  status?: ResumeVersionStatus | null;

  createdAt?: string | null;
  updatedAt?: string | null;

  fileUrl?: string | null;
  previewUrl?: string | null;
  downloadUrl?: string | null;

  jobApplicationCode?: string | null;
};

export type ResumeVersionComparisonItem = {
  sectionKey: string;
  before?: unknown;
  after?: unknown;
  changed: boolean;
};

export type ResumeVersionComparisonResult = {
  leftVersionId?: number | null;
  rightVersionId?: number | null;
  leftVersionName?: string | null;
  rightVersionName?: string | null;
  differences: ResumeVersionComparisonItem[];
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

/* =========================================================
   CORE REQUEST / RESPONSE TYPES
========================================================= */

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

export type ResumeVersionListQueryParams = {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
  versionType?: string;
  status?: string;
  jobApplicationCode?: string;
};

export type CreateResumeVersionPayload = {
  versionName?: string;
  versionType?: ResumeVersionType;
  parentVersionId?: number | null;
  jobApplicationCode?: string | null;
  rawText?: string | null;
  structuredContentJson?: ResumeStructuredContent;
  fileUrl?: string | null;
  previewUrl?: string | null;
  atsScore?: number | null;
  status?: ResumeVersionStatus;
};

export type UpdateResumeVersionPayload = {
  versionName?: string;
  versionType?: ResumeVersionType;
  jobApplicationCode?: string | null;
  rawText?: string | null;
  structuredContentJson?: ResumeStructuredContent;
  fileUrl?: string | null;
  previewUrl?: string | null;
  atsScore?: number | null;
  status?: ResumeVersionStatus;
};

export type UpdateResumeVersionStatusPayload = {
  status: ResumeVersionStatus;
};

export type DuplicateResumeVersionPayload = {
  versionName?: string;
  reason?: string;
  companyName?: string;
  jobTitle?: string;
  copyStructuredContent?: boolean;
  copyRawText?: boolean;
  generatePreview?: boolean;
};

export type RestoreResumeVersionPayload = {
  restoreAsBase?: boolean;
  versionName?: string;
};

export type ResumeVersionAtsScoreRequestPayload = {
  jobDescription?: string;
  rawText?: string | null;
};

export type ResumeVersionAtsScoreResponse = {
  success?: boolean;
  message?: string;
  atsScore?: number | null;
  score?: number | null;
  suggestions?: string[] | null;
  keywordsMatched?: string[] | null;
  keywordsMissing?: string[] | null;
};

export type ResumeVersionResponse = {
  success?: boolean;
  message?: string;
  version?: ResumeVersion | null;
};

export type ResumeVersionDeleteResponse = {
  success?: boolean;
  message?: string;
};

/* =========================================================
   RESUME EDITOR TYPES
========================================================= */

export type ResumeEditorSaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error";

export type ResumeEditorMode =
  | "create"
  | "edit"
  | "tailor"
  | "duplicate"
  | "admin-edit";

export type ResumeEditorViewMode =
  | "edit"
  | "preview"
  | "split";

export type ResumeTemplateCode = string;

export type ResumeEditorSectionKey =
  | "header"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "achievements"
  | "languages"
  | "tools"
  | "links"
  | "custom"
  | string;

export type ResumeEditorSectionConfig = {
  key: ResumeEditorSectionKey;
  label: string;
  enabled: boolean;
  required: boolean;
  visibleInPreview: boolean;
  allowMultiple?: boolean;
  maxItems?: number | null;
  placeholder?: string;
  description?: string;
};

export type ResumeEditorFeatures = {
  autoSave: boolean;
  livePreview: boolean;
  dragAndDropSections: boolean;
  versioning: boolean;
  tailoring: boolean;
  atsScoring: boolean;
  aiSuggestions: boolean;
  markdownSummary: boolean;
  richTextSummary: boolean;
  uploadReplaceBaseResume: boolean;
  duplicateSectionEntries: boolean;
};

export type ResumeEditorLimits = {
  maxSummaryLength: number;
  maxSkillItems: number;
  maxProjectItems: number;
  maxExperienceItems: number;
  maxEducationItems: number;
  maxCertificationItems: number;
  maxAchievementItems: number;
  maxLanguageItems: number;
  maxToolItems: number;
  maxCustomSections: number;
  maxLinks: number;
};

export type ResumeTemplateOption = {
  code: ResumeTemplateCode;
  name: string;
  description?: string;
  enabled: boolean;
  isDefault?: boolean;
};

export type ResumeEditorDefaults = {
  defaultTemplateCode: ResumeTemplateCode;
  defaultSectionOrder: string[];
  defaultResumeTitle: string;
  defaultVersionNamePrefix: string;
  defaultCustomSectionTitle: string;
};

export type ResumeEditorConfig = {
  sections: ResumeEditorSectionConfig[];
  sectionLabels: Record<string, string>;
  sectionOrder: string[];
  features: ResumeEditorFeatures;
  limits: ResumeEditorLimits;
  templates: ResumeTemplateOption[];
  defaults: ResumeEditorDefaults;
};

export type BackendResumeEditorConfig = Partial<{
  sections: Partial<ResumeEditorSectionConfig>[];
  sectionLabels: Record<string, string>;
  sectionOrder: string[];
  features: Partial<ResumeEditorFeatures>;
  limits: Partial<ResumeEditorLimits>;
  templates: Partial<ResumeTemplateOption>[];
  defaults: Partial<ResumeEditorDefaults>;
}>;

export type ResumeEditorSectionValue =
  | string
  | string[]
  | Record<string, unknown>
  | Record<string, unknown>[]
  | null;

export type ResumeEditorSectionsState = Record<
  ResumeEditorSectionKey,
  ResumeEditorSectionValue
>;

export type ResumeEditorDocumentMeta = {
  resumeId?: number | null;
  resumeVersionId?: number | null;
  parentVersionId?: number | null;
  versionCode?: string | null;
  versionName?: string | null;
  versionType?: ResumeVersionType | null;
  status?: ResumeStatus | null;
  title?: string | null;
  templateCode?: ResumeTemplateCode | null;
};

export type ResumeEditorState = {
  title: string;
  templateCode: ResumeTemplateCode;
  sectionOrder: string[];
  sections: ResumeEditorSectionsState;
};

export type ResumeEditorDraft = ResumeEditorState & {
  meta?: ResumeEditorDocumentMeta;
  updatedAt?: string | null;
};

export type ResumeEditorSavePayload = {
  title: string;
  templateCode: ResumeTemplateCode;
  sectionOrder: string[];
  sections: Record<string, unknown>;
};

export type ResumeEditorAutosavePayload = ResumeEditorSavePayload & {
  resumeId?: number | null;
  resumeVersionId?: number | null;
};

export type ResumeEditorVersionCreatePayload = {
  versionName?: string;
  versionType?: ResumeVersionType;
  parentVersionId?: number | null;
  templateCode?: ResumeTemplateCode;
  sectionOrder?: string[];
  sections?: Record<string, unknown>;
  structuredContentJson?: ResumeStructuredContent;
};

export type ResumeEditorLoadResponse = {
  success?: boolean;
  message?: string;
  resumeId?: number | null;
  resumeVersionId?: number | null;
  title?: string | null;
  templateCode?: ResumeTemplateCode | null;
  sectionOrder?: string[];
  sections?: Record<string, unknown>;
  structuredContentJson?: ResumeStructuredContent;
  versionName?: string | null;
  versionType?: ResumeVersionType | null;
  status?: ResumeStatus | null;
};

export type ResumeEditorSaveResponse = {
  success?: boolean;
  message?: string;
  resumeId?: number | null;
  resumeVersionId?: number | null;
  title?: string | null;
  templateCode?: ResumeTemplateCode | null;
  versionName?: string | null;
  versionType?: ResumeVersionType | null;
  status?: ResumeStatus | null;
  updatedAt?: string | null;
};

export type ResumeEditorPreviewState = {
  enabled: boolean;
  viewMode: ResumeEditorViewMode;
  zoom?: number;
  showAtsHints?: boolean;
  showSectionBorders?: boolean;
};

export type ResumeEditorToolbarAction =
  | "save"
  | "autosave"
  | "preview"
  | "download"
  | "duplicate"
  | "create-version"
  | "tailor"
  | "publish"
  | "archive"
  | "delete";

export type ResumeEditorToolbarState = {
  canSave: boolean;
  canPreview: boolean;
  canDownload: boolean;
  canDuplicate: boolean;
  canCreateVersion: boolean;
  canTailor: boolean;
  canArchive: boolean;
  canDelete: boolean;
};

export type ResumeEditorSectionValidationError = {
  sectionKey: ResumeEditorSectionKey;
  message: string;
  field?: string | null;
};

export type ResumeEditorValidationResult = {
  valid: boolean;
  errors: ResumeEditorSectionValidationError[];
};

export type ResumeEditorAutosaveState = {
  enabled: boolean;
  status: ResumeEditorSaveStatus;
  lastSavedAt?: string | null;
  errorMessage?: string | null;
};

export type ResumeEditorDirtyState = {
  isDirty: boolean;
  changedSections: string[];
};

/* =========================================================
   TYPE GUARDS
========================================================= */

export function isResumeVersionStatus(
  value: unknown
): value is ResumeVersionStatus {
  return typeof value === "string" && value.trim().length > 0;
}

export function isResumeVersionType(
  value: unknown
): value is ResumeVersionType {
  return typeof value === "string" && value.trim().length > 0;
}

export function isResumeEditorViewMode(
  value: unknown
): value is ResumeEditorViewMode {
  return value === "edit" || value === "preview" || value === "split";
}

export function isResumeEditorMode(value: unknown): value is ResumeEditorMode {
  return (
    value === "create" ||
    value === "edit" ||
    value === "tailor" ||
    value === "duplicate" ||
    value === "admin-edit"
  );
}

export function isResumeEditorSaveStatus(
  value: unknown
): value is ResumeEditorSaveStatus {
  return (
    value === "idle" ||
    value === "saving" ||
    value === "saved" ||
    value === "error"
  );
}

/* =========================================================
   BASIC HELPERS
========================================================= */

export function safeResumeString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function safeResumeTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function safeResumeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function safeResumeBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1 ? true : value === 0 ? false : null;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

export function uniqueResumeStrings(values?: unknown): string[] {
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

export function unwrapResumeResponse<T>(value: unknown): T {
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

export function parseResumeStructuredContent(
  value: unknown
): ResumeStructuredContent {
  if (!value) return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as ResumeStructuredContent;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as ResumeStructuredContent)
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

/* =========================================================
   CORE RESUME NORMALIZERS
========================================================= */

export function normalizeResume(
  resume: Partial<Resume> | Record<string, unknown> | null | undefined
): Resume | null {
  if (!resume) return null;

  const source = resume as Record<string, unknown>;

  return {
    resumeId: safeResumeNumber(source.resumeId ?? source.id) ?? undefined,
    id: safeResumeNumber(source.id ?? source.resumeId) ?? undefined,

    userId: safeResumeNumber(source.userId),
    title: safeResumeString(source.title)?.trim() || null,
    description: safeResumeString(source.description)?.trim() || null,

    status:
      (safeResumeString(source.status)?.trim() as ResumeStatus | undefined) || null,
    isBaseResume:
      safeResumeBoolean(source.isBaseResume ?? source.baseResume) ?? null,

    currentVersionId: safeResumeNumber(
      source.currentVersionId ?? source.currentResumeVersionId
    ),
    currentResumeVersionId: safeResumeNumber(
      source.currentResumeVersionId ?? source.currentVersionId
    ),

    fileUrl: safeResumeString(source.fileUrl)?.trim() || null,
    previewUrl: safeResumeString(source.previewUrl)?.trim() || null,
    downloadUrl: safeResumeString(source.downloadUrl)?.trim() || null,

    createdAt: safeResumeString(source.createdAt)?.trim() || null,
    updatedAt: safeResumeString(source.updatedAt)?.trim() || null,
  };
}

export function normalizeResumeSection(
  section: Partial<ResumeSection> | Record<string, unknown> | null | undefined
): ResumeSection | null {
  if (!section) return null;

  const source = section as Record<string, unknown>;

  return {
    resumeSectionId: safeResumeNumber(source.resumeSectionId ?? source.id) ?? undefined,
    id: safeResumeNumber(source.id ?? source.resumeSectionId) ?? undefined,
    sectionType:
      (safeResumeString(source.sectionType)?.trim() as SectionType | undefined) ||
      null,
    sectionTitle: safeResumeString(source.sectionTitle)?.trim() || null,
    sectionOrder: safeResumeNumber(source.sectionOrder),
    plainText: safeResumeString(source.plainText)?.trim() || null,
    content:
      source.content && typeof source.content === "object"
        ? (source.content as Record<string, unknown>)
        : null,
  };
}

export function normalizeResumePreviewResponse(
  response:
    | Partial<ResumePreviewResponse>
    | Record<string, unknown>
    | null
    | undefined
): ResumePreviewResponse {
  const source =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};

  return {
    resumeId: safeResumeNumber(source.resumeId),
    resumeVersionId: safeResumeNumber(source.resumeVersionId),
    versionCode: safeResumeString(source.versionCode)?.trim() || null,
    versionName: safeResumeString(source.versionName)?.trim() || null,
    previewUrl: safeResumeString(source.previewUrl)?.trim() || null,
    downloadUrl: safeResumeString(source.downloadUrl)?.trim() || null,
    fileUrl: safeResumeString(source.fileUrl)?.trim() || null,
    atsScore: safeResumeNumber(source.atsScore),
    createdAt: safeResumeString(source.createdAt)?.trim() || null,
    updatedAt: safeResumeString(source.updatedAt)?.trim() || null,
  };
}

export function normalizeResumeScanResponse(
  response: Partial<ResumeScanResponse> | Record<string, unknown> | null | undefined
): ResumeScanResponse {
  const source =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};

  return {
    success:
      typeof source.success === "boolean" ? source.success : true,
    message: safeResumeString(source.message)?.trim() || undefined,
    parsed:
      source.parsed && typeof source.parsed === "object"
        ? (source.parsed as Record<string, unknown>)
        : null,
    rawText: safeResumeString(source.rawText)?.trim() || null,
    score: safeResumeNumber(source.score ?? source.atsScore),
    atsScore: safeResumeNumber(source.atsScore ?? source.score),
    fileName: safeResumeString(source.fileName)?.trim() || null,
  };
}

/* =========================================================
   RESUME VERSION NORMALIZERS
========================================================= */

export function normalizeResumeVersion(
  version: Partial<ResumeVersion> | Record<string, unknown> | null | undefined
): ResumeVersion | null {
  if (!version) return null;

  const source = version as Record<string, unknown>;

  return {
    resumeVersionId: safeResumeNumber(source.resumeVersionId ?? source.id) ?? undefined,
    id: safeResumeNumber(source.id ?? source.resumeVersionId) ?? undefined,

    resumeId: safeResumeNumber(source.resumeId),
    parentVersionId: safeResumeNumber(source.parentVersionId),

    versionCode: safeResumeString(source.versionCode)?.trim() || null,
    versionName: safeResumeString(source.versionName)?.trim() || null,
    versionType:
      (safeResumeString(source.versionType)?.trim() as ResumeVersionType | undefined) ||
      null,
    status:
      (safeResumeString(source.status)?.trim() as ResumeVersionStatus | undefined) ||
      null,

    atsScore: safeResumeNumber(source.atsScore),
    isBaseVersion: safeResumeBoolean(source.isBaseVersion),

    jobApplicationCode: safeResumeString(source.jobApplicationCode)?.trim() || null,

    fileUrl: safeResumeString(source.fileUrl)?.trim() || null,
    previewUrl: safeResumeString(source.previewUrl)?.trim() || null,
    downloadUrl: safeResumeString(source.downloadUrl)?.trim() || null,

    rawText: safeResumeString(source.rawText) ?? null,
    structuredContentJson: parseResumeStructuredContent(
      source.structuredContentJson ?? source.structuredContent
    ),

    createdAt: safeResumeString(source.createdAt)?.trim() || null,
    updatedAt: safeResumeString(source.updatedAt)?.trim() || null,
  };
}

export function normalizeResumeVersionSummary(
  version:
    | Partial<ResumeVersionSummary>
    | Partial<ResumeVersion>
    | Record<string, unknown>
    | null
    | undefined
): ResumeVersionSummary | null {
  if (!version) return null;

  const source = version as Record<string, unknown>;

  return {
    resumeVersionId: safeResumeNumber(source.resumeVersionId ?? source.id) ?? undefined,
    id: safeResumeNumber(source.id ?? source.resumeVersionId) ?? undefined,
    versionCode: safeResumeString(source.versionCode)?.trim() || null,
    versionName: safeResumeString(source.versionName)?.trim() || null,
    versionType:
      (safeResumeString(source.versionType)?.trim() as ResumeVersionType | undefined) ||
      null,
    atsScore: safeResumeNumber(source.atsScore),
    isBaseVersion: safeResumeBoolean(source.isBaseVersion),
    status:
      (safeResumeString(source.status)?.trim() as ResumeVersionStatus | undefined) ||
      null,
    createdAt: safeResumeString(source.createdAt)?.trim() || null,
    updatedAt: safeResumeString(source.updatedAt)?.trim() || null,
    fileUrl: safeResumeString(source.fileUrl)?.trim() || null,
    previewUrl: safeResumeString(source.previewUrl)?.trim() || null,
    downloadUrl: safeResumeString(source.downloadUrl)?.trim() || null,
    jobApplicationCode: safeResumeString(source.jobApplicationCode)?.trim() || null,
  };
}

export function normalizeResumeVersionDetails(
  version: Partial<ResumeVersionDetails> | Record<string, unknown> | null | undefined
): ResumeVersionDetails | null {
  return normalizeResumeVersion(version);
}

export function normalizeResumeVersionResponse(
  response: Partial<ResumeVersionResponse> | Record<string, unknown> | null | undefined
): ResumeVersionResponse {
  const source =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};

  return {
    success:
      typeof source.success === "boolean" ? source.success : true,
    message: safeResumeString(source.message)?.trim() || undefined,
    version: normalizeResumeVersion(
      source.version !== undefined ? source.version : source
    ),
  };
}

/* =========================================================
   RESUME EDITOR CONFIG NORMALIZERS
========================================================= */

export function normalizeResumeEditorSectionConfig(
  section: Partial<ResumeEditorSectionConfig> | null | undefined
): ResumeEditorSectionConfig | null {
  if (!section || typeof section.key !== "string" || !section.key.trim()) {
    return null;
  }

  return {
    key: section.key.trim(),
    label:
      typeof section.label === "string" && section.label.trim()
        ? section.label.trim()
        : section.key.trim(),
    enabled: typeof section.enabled === "boolean" ? section.enabled : true,
    required: Boolean(section.required),
    visibleInPreview:
      typeof section.visibleInPreview === "boolean"
        ? section.visibleInPreview
        : true,
    allowMultiple:
      typeof section.allowMultiple === "boolean" ? section.allowMultiple : true,
    maxItems:
      typeof section.maxItems === "number" && Number.isFinite(section.maxItems)
        ? section.maxItems
        : section.maxItems === null
          ? null
          : undefined,
    placeholder:
      typeof section.placeholder === "string" ? section.placeholder : undefined,
    description:
      typeof section.description === "string" ? section.description : undefined,
  };
}

export function normalizeResumeTemplateOption(
  template: Partial<ResumeTemplateOption> | null | undefined,
  index = 0
): ResumeTemplateOption | null {
  if (!template || typeof template.code !== "string" || !template.code.trim()) {
    return null;
  }

  return {
    code: template.code.trim(),
    name:
      typeof template.name === "string" && template.name.trim()
        ? template.name.trim()
        : `Template ${index + 1}`,
    description:
      typeof template.description === "string" ? template.description : undefined,
    enabled: typeof template.enabled === "boolean" ? template.enabled : true,
    isDefault: typeof template.isDefault === "boolean" ? template.isDefault : false,
  };
}

export function normalizeResumeEditorConfig(
  config: Partial<ResumeEditorConfig> | null | undefined
): ResumeEditorConfig | null {
  if (!config) return null;

  const sections = Array.isArray(config.sections)
    ? config.sections
        .map((section) => normalizeResumeEditorSectionConfig(section))
        .filter((section): section is ResumeEditorSectionConfig => Boolean(section))
    : [];

  const templates = Array.isArray(config.templates)
    ? config.templates
        .map((template, index) => normalizeResumeTemplateOption(template, index))
        .filter((template): template is ResumeTemplateOption => Boolean(template))
    : [];

  return {
    sections,
    sectionLabels:
      config.sectionLabels && typeof config.sectionLabels === "object"
        ? (config.sectionLabels as Record<string, string>)
        : {},
    sectionOrder: uniqueResumeStrings(config.sectionOrder),
    features: {
      autoSave: Boolean(config.features?.autoSave),
      livePreview: Boolean(config.features?.livePreview),
      dragAndDropSections: Boolean(config.features?.dragAndDropSections),
      versioning: Boolean(config.features?.versioning),
      tailoring: Boolean(config.features?.tailoring),
      atsScoring: Boolean(config.features?.atsScoring),
      aiSuggestions: Boolean(config.features?.aiSuggestions),
      markdownSummary: Boolean(config.features?.markdownSummary),
      richTextSummary: Boolean(config.features?.richTextSummary),
      uploadReplaceBaseResume: Boolean(config.features?.uploadReplaceBaseResume),
      duplicateSectionEntries: Boolean(config.features?.duplicateSectionEntries),
    },
    limits: {
      maxSummaryLength: safeResumeNumber(config.limits?.maxSummaryLength) ?? 0,
      maxSkillItems: safeResumeNumber(config.limits?.maxSkillItems) ?? 0,
      maxProjectItems: safeResumeNumber(config.limits?.maxProjectItems) ?? 0,
      maxExperienceItems: safeResumeNumber(config.limits?.maxExperienceItems) ?? 0,
      maxEducationItems: safeResumeNumber(config.limits?.maxEducationItems) ?? 0,
      maxCertificationItems:
        safeResumeNumber(config.limits?.maxCertificationItems) ?? 0,
      maxAchievementItems:
        safeResumeNumber(config.limits?.maxAchievementItems) ?? 0,
      maxLanguageItems: safeResumeNumber(config.limits?.maxLanguageItems) ?? 0,
      maxToolItems: safeResumeNumber(config.limits?.maxToolItems) ?? 0,
      maxCustomSections: safeResumeNumber(config.limits?.maxCustomSections) ?? 0,
      maxLinks: safeResumeNumber(config.limits?.maxLinks) ?? 0,
    },
    templates,
    defaults: {
      defaultTemplateCode:
        typeof config.defaults?.defaultTemplateCode === "string"
          ? config.defaults.defaultTemplateCode
          : "",
      defaultSectionOrder: uniqueResumeStrings(
        config.defaults?.defaultSectionOrder
      ),
      defaultResumeTitle:
        typeof config.defaults?.defaultResumeTitle === "string"
          ? config.defaults.defaultResumeTitle
          : "",
      defaultVersionNamePrefix:
        typeof config.defaults?.defaultVersionNamePrefix === "string"
          ? config.defaults.defaultVersionNamePrefix
          : "",
      defaultCustomSectionTitle:
        typeof config.defaults?.defaultCustomSectionTitle === "string"
          ? config.defaults.defaultCustomSectionTitle
          : "",
    },
  };
}

/* =========================================================
   RESUME EDITOR STATE NORMALIZERS
========================================================= */

export function normalizeResumeEditorState(
  state: Partial<ResumeEditorState> | null | undefined
): ResumeEditorState {
  return {
    title: typeof state?.title === "string" ? state.title : "",
    templateCode: typeof state?.templateCode === "string" ? state.templateCode : "",
    sectionOrder: uniqueResumeStrings(state?.sectionOrder),
    sections:
      state?.sections && typeof state.sections === "object"
        ? (state.sections as ResumeEditorSectionsState)
        : {},
  };
}

export function normalizeResumeEditorLoadResponse(
  response: Partial<ResumeEditorLoadResponse> | Record<string, unknown> | null | undefined
): ResumeEditorLoadResponse {
  const source =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};

  return {
    success:
      typeof source.success === "boolean" ? source.success : true,
    message: safeResumeString(source.message)?.trim() || undefined,
    resumeId: safeResumeNumber(source.resumeId),
    resumeVersionId: safeResumeNumber(source.resumeVersionId),
    title: safeResumeString(source.title)?.trim() || null,
    templateCode: safeResumeString(source.templateCode)?.trim() || null,
    sectionOrder: uniqueResumeStrings(source.sectionOrder),
    sections:
      source.sections && typeof source.sections === "object"
        ? (source.sections as Record<string, unknown>)
        : {},
    structuredContentJson: parseResumeStructuredContent(source.structuredContentJson),
    versionName: safeResumeString(source.versionName)?.trim() || null,
    versionType:
      (safeResumeString(source.versionType)?.trim() as ResumeVersionType | undefined) ||
      null,
    status:
      (safeResumeString(source.status)?.trim() as ResumeStatus | undefined) || null,
  };
}

export function normalizeResumeEditorSaveResponse(
  response: Partial<ResumeEditorSaveResponse> | Record<string, unknown> | null | undefined
): ResumeEditorSaveResponse {
  const source =
    response && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};

  return {
    success:
      typeof source.success === "boolean" ? source.success : true,
    message: safeResumeString(source.message)?.trim() || undefined,
    resumeId: safeResumeNumber(source.resumeId),
    resumeVersionId: safeResumeNumber(source.resumeVersionId),
    title: safeResumeString(source.title)?.trim() || null,
    templateCode: safeResumeString(source.templateCode)?.trim() || null,
    versionName: safeResumeString(source.versionName)?.trim() || null,
    versionType:
      (safeResumeString(source.versionType)?.trim() as ResumeVersionType | undefined) ||
      null,
    status:
      (safeResumeString(source.status)?.trim() as ResumeStatus | undefined) || null,
    updatedAt: safeResumeString(source.updatedAt)?.trim() || null,
  };
}

/* =========================================================
   UI HELPERS - CORE RESUME / VERSION
========================================================= */

export function getResumeId(
  resume: Partial<Resume> | null | undefined
): number | null {
  if (!resume) return null;
  return safeResumeNumber(resume.resumeId ?? resume.id);
}

export function getResumeVersionId(
  version: Partial<ResumeVersion> | null | undefined
): number | null {
  if (!version) return null;
  return safeResumeNumber(version.resumeVersionId ?? version.id);
}

export function getResumeVersionDisplayTitle(
  version: Partial<ResumeVersion> | null | undefined
): string {
  if (!version) return "Resume Version";

  return (
    version.versionName ||
    version.versionCode ||
    version.jobApplicationCode ||
    "Resume Version"
  );
}

export function getResumeVersionStatusBadgeClass(
  status?: string | null
): string {
  const normalized = (status || "").toUpperCase();

  if (["ACTIVE", "PROCESSED"].includes(normalized)) {
    return "border-green-200 bg-green-100 text-green-700";
  }

  if (["DRAFT"].includes(normalized)) {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }

  if (["ARCHIVED"].includes(normalized)) {
    return "border-red-200 bg-red-100 text-red-700";
  }

  return "border-yellow-200 bg-yellow-100 text-yellow-700";
}

export function getResumeVersionTypeBadgeClass(type?: string | null): string {
  const normalized = (type || "").toUpperCase();

  if (normalized.includes("BASE")) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (normalized.includes("TAILOR")) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (normalized.includes("JOB")) {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  if (normalized.includes("DUPLICATE")) {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }

  return "border-gray-200 bg-gray-100 text-gray-700";
}

export function getResumeVersionAtsBadgeClass(score?: number | null): string {
  if (score === null || score === undefined) {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }
  if (score >= 80) {
    return "border-green-200 bg-green-100 text-green-700";
  }
  if (score >= 60) {
    return "border-yellow-200 bg-yellow-100 text-yellow-700";
  }
  return "border-red-200 bg-red-100 text-red-700";
}

export function dedupeResumeVersions(
  versions: Partial<ResumeVersion>[] = []
): ResumeVersion[] {
  const map = new Map<string | number, ResumeVersion>();

  for (const item of versions) {
    const version = normalizeResumeVersion(item);
    if (!version) continue;

    const key =
      version.resumeVersionId ??
      version.id ??
      version.versionCode ??
      `${version.versionName}-${version.createdAt}`;

    if (!map.has(key)) {
      map.set(key, version);
    }
  }

  return [...map.values()].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export function getLatestResumeVersion(
  versions: Partial<ResumeVersion>[] = []
): ResumeVersion | null {
  return dedupeResumeVersions(versions)[0] || null;
}

export function getBaseResumeVersion(
  versions: Partial<ResumeVersion>[] = []
): ResumeVersion | null {
  return (
    dedupeResumeVersions(versions).find((version) => version.isBaseVersion) ||
    null
  );
}

/* =========================================================
   UI HELPERS - RESUME EDITOR
========================================================= */

export function getResumeEditorSectionLabel(
  key: string,
  config?: Partial<ResumeEditorConfig> | null
): string {
  if (config?.sectionLabels?.[key]) {
    return config.sectionLabels[key];
  }

  const section = config?.sections?.find((item) => item.key === key);
  if (section?.label) return section.label;

  return key;
}

export function getEnabledResumeEditorSections(
  config?: Partial<ResumeEditorConfig> | null
): ResumeEditorSectionConfig[] {
  if (!config?.sections?.length) return [];

  return config.sections
    .map((section) => normalizeResumeEditorSectionConfig(section))
    .filter(
      (section): section is ResumeEditorSectionConfig =>
        section !== null && section.enabled
    );
}

export function getRequiredResumeEditorSections(
  config?: Partial<ResumeEditorConfig> | null
): ResumeEditorSectionConfig[] {
  return getEnabledResumeEditorSections(config).filter(
    (section) => section.required
  );
}

export function canAddMoreResumeEditorItems(
  section: Partial<ResumeEditorSectionConfig> | null | undefined,
  currentCount: number
): boolean {
  if (!section?.enabled) return false;
  if (section.maxItems === null || section.maxItems === undefined) return true;
  return currentCount < section.maxItems;
}

export function getDefaultResumeTemplate(
  config?: Partial<ResumeEditorConfig> | null
): ResumeTemplateOption | null {
  if (!config?.templates?.length) return null;

  const templates = config.templates
    .map((template, index) => normalizeResumeTemplateOption(template, index))
    .filter((template): template is ResumeTemplateOption => Boolean(template));

  return (
    templates.find((template) => template.isDefault) ||
    templates.find((template) => template.enabled) ||
    templates[0] ||
    null
  );
}

export function getResumeEditorSaveStatusLabel(
  status: ResumeEditorSaveStatus
): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "saving":
      return "Saving...";
    case "saved":
      return "Saved";
    case "error":
      return "Save failed";
    default:
      return "Idle";
  }
}

/* =========================================================
   VALIDATION HELPERS
========================================================= */

export function validateResumeEditorState(input: {
  state: ResumeEditorState;
  config?: Partial<ResumeEditorConfig> | null;
}): ResumeEditorValidationResult {
  const errors: ResumeEditorSectionValidationError[] = [];
  const requiredSections = getRequiredResumeEditorSections(input.config);

  if (!input.state.title.trim()) {
    errors.push({
      sectionKey: "header",
      field: "title",
      message: "Resume title is required.",
    });
  }

  for (const section of requiredSections) {
    const value = input.state.sections?.[section.key];

    const isEmpty =
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === "object" &&
        !Array.isArray(value) &&
        Object.keys(value || {}).length === 0);

    if (isEmpty) {
      errors.push({
        sectionKey: section.key,
        message: `${section.label} is required.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/* =========================================================
   PAYLOAD HELPERS - CORE RESUME / VERSION
========================================================= */

export function buildCreateResumeVersionPayload(
  input: CreateResumeVersionPayload
): CreateResumeVersionPayload {
  return {
    versionName: safeResumeString(input.versionName)?.trim() || undefined,
    versionType: input.versionType,
    parentVersionId:
      typeof input.parentVersionId === "number" ? input.parentVersionId : null,
    jobApplicationCode: safeResumeString(input.jobApplicationCode)?.trim() || null,
    rawText: typeof input.rawText === "string" ? input.rawText : null,
    structuredContentJson:
      input.structuredContentJson && typeof input.structuredContentJson === "object"
        ? input.structuredContentJson
        : input.structuredContentJson ?? null,
    fileUrl: safeResumeString(input.fileUrl)?.trim() || null,
    previewUrl: safeResumeString(input.previewUrl)?.trim() || null,
    atsScore: typeof input.atsScore === "number" ? input.atsScore : null,
    status: input.status,
  };
}

export function buildUpdateResumeVersionPayload(
  input: UpdateResumeVersionPayload
): UpdateResumeVersionPayload {
  return {
    versionName: safeResumeString(input.versionName)?.trim() || undefined,
    versionType: input.versionType,
    jobApplicationCode: safeResumeString(input.jobApplicationCode)?.trim() || null,
    rawText: typeof input.rawText === "string" ? input.rawText : null,
    structuredContentJson:
      input.structuredContentJson && typeof input.structuredContentJson === "object"
        ? input.structuredContentJson
        : input.structuredContentJson ?? null,
    fileUrl: safeResumeString(input.fileUrl)?.trim() || null,
    previewUrl: safeResumeString(input.previewUrl)?.trim() || null,
    atsScore: typeof input.atsScore === "number" ? input.atsScore : null,
    status: input.status,
  };
}

export function buildDuplicateResumeVersionPayload(
  input?: DuplicateResumeVersionPayload
): DuplicateResumeVersionPayload | undefined {
  if (!input) return undefined;

  return {
    versionName: safeResumeString(input.versionName)?.trim() || undefined,
    reason: safeResumeString(input.reason)?.trim() || undefined,
    companyName: safeResumeString(input.companyName)?.trim() || undefined,
    jobTitle: safeResumeString(input.jobTitle)?.trim() || undefined,
    copyStructuredContent:
      typeof input.copyStructuredContent === "boolean"
        ? input.copyStructuredContent
        : undefined,
    copyRawText:
      typeof input.copyRawText === "boolean" ? input.copyRawText : undefined,
    generatePreview:
      typeof input.generatePreview === "boolean" ? input.generatePreview : undefined,
  };
}

export function buildRestoreResumeVersionPayload(
  input?: RestoreResumeVersionPayload
): RestoreResumeVersionPayload | undefined {
  if (!input) return undefined;

  return {
    restoreAsBase:
      typeof input.restoreAsBase === "boolean" ? input.restoreAsBase : undefined,
    versionName: safeResumeString(input.versionName)?.trim() || undefined,
  };
}

/* =========================================================
   PAYLOAD HELPERS - RESUME EDITOR
========================================================= */

export function buildResumeEditorSavePayload(input: {
  title?: string;
  templateCode?: string;
  sectionOrder?: string[];
  sections?: Record<string, unknown>;
}): ResumeEditorSavePayload {
  return {
    title:
      typeof input.title === "string" && input.title.trim()
        ? input.title.trim()
        : "",
    templateCode:
      typeof input.templateCode === "string" ? input.templateCode : "",
    sectionOrder: uniqueResumeStrings(input.sectionOrder),
    sections:
      input.sections && typeof input.sections === "object"
        ? input.sections
        : {},
  };
}

export function buildResumeEditorAutosavePayload(input: {
  resumeId?: number | null;
  resumeVersionId?: number | null;
  title?: string;
  templateCode?: string;
  sectionOrder?: string[];
  sections?: Record<string, unknown>;
}): ResumeEditorAutosavePayload {
  return {
    resumeId: typeof input.resumeId === "number" ? input.resumeId : null,
    resumeVersionId:
      typeof input.resumeVersionId === "number" ? input.resumeVersionId : null,
    ...buildResumeEditorSavePayload(input),
  };
}

export function buildResumeEditorVersionCreatePayload(input: {
  versionName?: string;
  versionType?: ResumeVersionType;
  parentVersionId?: number | null;
  templateCode?: string;
  sectionOrder?: string[];
  sections?: Record<string, unknown>;
  structuredContentJson?: ResumeStructuredContent;
}): ResumeEditorVersionCreatePayload {
  return {
    versionName:
      typeof input.versionName === "string" && input.versionName.trim()
        ? input.versionName.trim()
        : undefined,
    versionType: input.versionType,
    parentVersionId:
      typeof input.parentVersionId === "number" ? input.parentVersionId : null,
    templateCode:
      typeof input.templateCode === "string" ? input.templateCode : undefined,
    sectionOrder: uniqueResumeStrings(input.sectionOrder),
    sections:
      input.sections && typeof input.sections === "object"
        ? input.sections
        : {},
    structuredContentJson: input.structuredContentJson ?? null,
  };
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const resumeTypeUtils = {
  unwrapResumeResponse,

  normalizeResume,
  normalizeResumeSection,
  normalizeResumePreviewResponse,
  normalizeResumeScanResponse,

  normalizeResumeVersion,
  normalizeResumeVersionSummary,
  normalizeResumeVersionDetails,
  normalizeResumeVersionResponse,

  normalizeResumeEditorSectionConfig,
  normalizeResumeTemplateOption,
  normalizeResumeEditorConfig,
  normalizeResumeEditorState,
  normalizeResumeEditorLoadResponse,
  normalizeResumeEditorSaveResponse,

  getResumeId,
  getResumeVersionId,
  getResumeVersionDisplayTitle,
  getResumeVersionStatusBadgeClass,
  getResumeVersionTypeBadgeClass,
  getResumeVersionAtsBadgeClass,
  dedupeResumeVersions,
  getLatestResumeVersion,
  getBaseResumeVersion,

  getResumeEditorSectionLabel,
  getEnabledResumeEditorSections,
  getRequiredResumeEditorSections,
  canAddMoreResumeEditorItems,
  getDefaultResumeTemplate,
  getResumeEditorSaveStatusLabel,
  validateResumeEditorState,

  buildCreateResumeVersionPayload,
  buildUpdateResumeVersionPayload,
  buildDuplicateResumeVersionPayload,
  buildRestoreResumeVersionPayload,
  buildResumeEditorSavePayload,
  buildResumeEditorAutosavePayload,
  buildResumeEditorVersionCreatePayload,
};