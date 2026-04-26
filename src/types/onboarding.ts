// src/types/onboarding.ts
//
// Central onboarding types and helpers for frontend ↔ backend integration.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - Shared across:
//   - src/lib/onboardingApi.ts
//   - src/config/onboardingOptions.ts
//   - onboarding/setup pages
//   - dashboard/profile completion checks
//   - resume upload + resume scan + onboarding preference flows
//
// Supported backend patterns:
// - plain object response
// - wrapped response:
//   { success, message, data | payload | result | content }
// - boolean / number / string-friendly backend values
//
// Recommended backend endpoints aligned with project update:
//   GET    /api/user/onboarding
//   POST   /api/user/onboarding
//   GET    /api/user/onboarding/status
//   DELETE /api/user/onboarding/reset
//   POST   /api/user/resume/scan
//
// Notes:
// - Designed to keep frontend stable even if backend response shape evolves
// - Preserves onboarding ideology used in your current setup flow:
//   resume scan -> domain -> subdomain mode -> subdomain -> job titles

/* =========================================================
   CORE ENUM / UNION TYPES
========================================================= */

export type DomainType = "Technical" | "Non-Technical";

export type SubDomainMode = "single" | "any" | "multi";

// Optional frontend-only marker if you want to persist "Any" explicitly.
export const SUBDOMAIN_ANY_MARKER = "__ANY__" as const;

/* =========================================================
   API ENVELOPE
========================================================= */

export type OnboardingApiEnvelope<T> = {
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

/* =========================================================
   CORE FRONTEND-NORMALIZED STATE
========================================================= */

export type OnboardingState = {
  done: boolean;

  // Resume
  resumeScanned: boolean;
  resumeFileName: string | null;
  resumeScore: number | null;

  // Preferences
  domain: DomainType | null;

  subDomainMode: SubDomainMode;
  subDomainSingle: string | null;
  subDomainMulti: string[];

  // Only relevant when subDomainMode === "single"
  jobTitles: string[];
};

/* =========================================================
   BACKEND RESPONSE / REQUEST TYPES
========================================================= */

export type ResumeScanResponse = {
  success?: boolean;
  message?: string;

  score?: number | null;
  atsScore?: number | null;

  parsed?: Record<string, unknown> | null;
  rawText?: string | null;
  fileName?: string | null;
};

export type UserOnboardingResponse = {
  success?: boolean;
  message?: string;

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

  sourceResumeId?: number | null;
  sourceResumeVersionId?: number | null;
};

export type UserOnboardingStatusResponse = UserOnboardingResponse;

export type UserOnboardingSaveRequest = {
  domain: DomainType;
  subDomainMode: SubDomainMode;

  subDomainSingle?: string | null;
  subDomainMulti?: string[] | null;
  jobTitles?: string[] | null;
};

/* =========================================================
   LOCAL STORAGE KEYS
========================================================= */

export const ONBOARDING_STORAGE_KEYS = {
  DONE: "userOnboardingDone",
  DOMAIN: "userDomain",
  SUB_MODE: "userSubDomainMode",
  SUB_SINGLE: "userSubDomainSingle",
  SUB_MULTI: "userSubDomainMulti",
  JOB_TITLES: "userJobTitles",
  RESUME_SCANNED: "userResumeScanned",
  RESUME_FILE_NAME: "userResumeFileName",
  RESUME_SCORE: "userResumeScore",
} as const;

export type OnboardingStorageKey =
  (typeof ONBOARDING_STORAGE_KEYS)[keyof typeof ONBOARDING_STORAGE_KEYS];

/* =========================================================
   BASIC HELPERS
========================================================= */

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

/* =========================================================
   TYPE GUARDS
========================================================= */

export function isDomainType(value: unknown): value is DomainType {
  return value === "Technical" || value === "Non-Technical";
}

export function isSubDomainMode(value: unknown): value is SubDomainMode {
  return value === "single" || value === "any" || value === "multi";
}

/* =========================================================
   RESPONSE UNWRAP HELPERS
========================================================= */

export function unwrapOnboardingResponse<T>(value: unknown): T {
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

export function extractOnboardingMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const record = payload as Record<string, unknown>;

  return (
    safeTrimmedString(record.message) ||
    safeTrimmedString(record.error) ||
    safeTrimmedString(record.details)
  );
}

/* =========================================================
   NORMALIZERS
========================================================= */

export function normalizeResumeScanResponse(
  input: Partial<ResumeScanResponse> | Record<string, unknown> | null | undefined
): ResumeScanResponse {
  const source =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  return {
    success:
      typeof source.success === "boolean" ? source.success : true,
    message: safeString(source.message)?.trim() || undefined,
    score: safeNumber(source.score ?? source.atsScore),
    atsScore: safeNumber(source.atsScore ?? source.score),
    parsed:
      source.parsed && typeof source.parsed === "object"
        ? (source.parsed as Record<string, unknown>)
        : null,
    rawText: safeString(source.rawText)?.trim() || null,
    fileName: safeString(source.fileName)?.trim() || null,
  };
}

export function normalizeUserOnboardingResponse(
  input:
    | Partial<UserOnboardingResponse>
    | Record<string, unknown>
    | null
    | undefined
): UserOnboardingResponse {
  const source =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};

  return {
    success:
      typeof source.success === "boolean" ? source.success : true,
    message: safeString(source.message)?.trim() || undefined,

    done:
      safeBoolean(source.done ?? source.completed) ??
      false,
    completed:
      safeBoolean(source.completed ?? source.done) ??
      false,

    domain: isDomainType(source.domain) ? source.domain : null,
    subDomainMode: isSubDomainMode(source.subDomainMode)
      ? source.subDomainMode
      : null,
    subDomainSingle:
      safeString(source.subDomainSingle)?.trim() || null,
    subDomainMulti: uniqueStrings(source.subDomainMulti),
    jobTitles: uniqueStrings(source.jobTitles),

    resumeUploaded: safeBoolean(source.resumeUploaded),
    resumeScanned: safeBoolean(source.resumeScanned),
    resumeFileName: safeString(source.resumeFileName)?.trim() || null,
    resumeScore: safeNumber(source.resumeScore),

    sourceResumeId: safeNumber(source.sourceResumeId),
    sourceResumeVersionId: safeNumber(source.sourceResumeVersionId),
  };
}

export function normalizeOnboardingState(
  input:
    | Partial<OnboardingState>
    | Partial<UserOnboardingResponse>
    | Record<string, unknown>
    | null
    | undefined
): OnboardingState {
  const normalized = normalizeUserOnboardingResponse(input);

  const subMode: SubDomainMode = isSubDomainMode(normalized.subDomainMode)
    ? normalized.subDomainMode
    : "single";

  const subSingle =
    subMode === "single"
      ? normalized.subDomainSingle || null
      : null;

  const subMulti =
    subMode === "multi"
      ? uniqueStrings(normalized.subDomainMulti)
      : [];

  const jobTitles =
    subMode === "single"
      ? uniqueStrings(normalized.jobTitles)
      : [];

  return {
    done: Boolean(normalized.done ?? normalized.completed),
    resumeScanned: Boolean(normalized.resumeScanned),
    resumeFileName: normalized.resumeFileName || null,
    resumeScore: safeNumber(normalized.resumeScore),

    domain: normalized.domain ?? null,

    subDomainMode: subMode,
    subDomainSingle: subSingle,
    subDomainMulti: subMulti,

    jobTitles,
  };
}

/* =========================================================
   DEFAULT STATE
========================================================= */

export function createDefaultOnboardingState(): OnboardingState {
  return {
    done: false,

    resumeScanned: false,
    resumeFileName: null,
    resumeScore: null,

    domain: null,

    subDomainMode: "single",
    subDomainSingle: null,
    subDomainMulti: [],

    jobTitles: [],
  };
}

/* =========================================================
   REQUEST BUILDERS
========================================================= */

export function buildUserOnboardingSaveRequest(
  input: Partial<UserOnboardingSaveRequest> | Partial<OnboardingState>
): UserOnboardingSaveRequest {
  const domain = isDomainType(input.domain) ? input.domain : "Technical";
  const subDomainMode = isSubDomainMode(input.subDomainMode)
    ? input.subDomainMode
    : "single";

  return {
    domain,
    subDomainMode,
    subDomainSingle:
      subDomainMode === "single"
        ? safeTrimmedString(input.subDomainSingle) || null
        : null,
    subDomainMulti:
      subDomainMode === "multi"
        ? uniqueStrings(input.subDomainMulti)
        : null,
    jobTitles:
      subDomainMode === "single"
        ? uniqueStrings(input.jobTitles)
        : null,
  };
}

/* =========================================================
   STATE / UI HELPERS
========================================================= */

export function isOnboardingComplete(
  state: Partial<OnboardingState> | null | undefined
): boolean {
  if (!state) return false;
  return Boolean(state.done);
}

export function hasScannedResume(
  state: Partial<OnboardingState> | null | undefined
): boolean {
  if (!state) return false;
  return Boolean(state.resumeScanned);
}

export function shouldAskForJobTitles(
  state: Partial<OnboardingState> | null | undefined
): boolean {
  if (!state) return false;
  return state.subDomainMode === "single";
}

export function getOnboardingProgressStep(
  state: Partial<OnboardingState> | null | undefined
): number {
  if (!state) return 1;

  if (state.done) return 4;
  if (state.domain && state.subDomainMode === "single" && state.subDomainSingle) {
    return 4;
  }
  if (state.domain) return 3;
  if (state.resumeScanned) return 2;
  return 1;
}

export function getOnboardingCompletionPercentage(
  state: Partial<OnboardingState> | null | undefined
): number {
  if (!state) return 0;

  let score = 0;

  if (state.resumeScanned) score += 25;
  if (state.domain) score += 25;

  if (state.subDomainMode === "single" && state.subDomainSingle) {
    score += 25;
  } else if (state.subDomainMode === "multi" && state.subDomainMulti?.length) {
    score += 25;
  } else if (state.subDomainMode === "any") {
    score += 25;
  }

  if (state.subDomainMode === "single") {
    if (state.jobTitles?.length) {
      score += 25;
    }
  } else {
    score += 25;
  }

  if (state.done) return 100;

  return Math.max(0, Math.min(100, score));
}

/* =========================================================
   STORAGE HELPERS
========================================================= */

export function serializeOnboardingStateForStorage(
  state: Partial<OnboardingState> | null | undefined
): Record<OnboardingStorageKey, string> {
  const normalized = normalizeOnboardingState(state);

  return {
    [ONBOARDING_STORAGE_KEYS.DONE]: normalized.done ? "true" : "false",
    [ONBOARDING_STORAGE_KEYS.DOMAIN]: normalized.domain || "",
    [ONBOARDING_STORAGE_KEYS.SUB_MODE]: normalized.subDomainMode,
    [ONBOARDING_STORAGE_KEYS.SUB_SINGLE]: normalized.subDomainSingle || "",
    [ONBOARDING_STORAGE_KEYS.SUB_MULTI]: JSON.stringify(
      normalized.subDomainMulti || []
    ),
    [ONBOARDING_STORAGE_KEYS.JOB_TITLES]: JSON.stringify(
      normalized.jobTitles || []
    ),
    [ONBOARDING_STORAGE_KEYS.RESUME_SCANNED]: normalized.resumeScanned
      ? "true"
      : "false",
    [ONBOARDING_STORAGE_KEYS.RESUME_FILE_NAME]: normalized.resumeFileName || "",
    [ONBOARDING_STORAGE_KEYS.RESUME_SCORE]:
      normalized.resumeScore !== null && normalized.resumeScore !== undefined
        ? String(normalized.resumeScore)
        : "",
  };
}

export function hydrateOnboardingStateFromStorage(
  storage: Partial<Record<OnboardingStorageKey, string | null | undefined>>
): OnboardingState {
  const done =
    safeBoolean(storage[ONBOARDING_STORAGE_KEYS.DONE]) ?? false;

  const domainValue = storage[ONBOARDING_STORAGE_KEYS.DOMAIN];
  const domain = isDomainType(domainValue) ? domainValue : null;

  const subModeValue = storage[ONBOARDING_STORAGE_KEYS.SUB_MODE];
  const subDomainMode: SubDomainMode = isSubDomainMode(subModeValue)
    ? subModeValue
    : "single";

  let subDomainMulti: string[] = [];
  let jobTitles: string[] = [];

  try {
    const parsed = JSON.parse(storage[ONBOARDING_STORAGE_KEYS.SUB_MULTI] || "[]");
    subDomainMulti = uniqueStrings(parsed);
  } catch {
    subDomainMulti = [];
  }

  try {
    const parsed = JSON.parse(storage[ONBOARDING_STORAGE_KEYS.JOB_TITLES] || "[]");
    jobTitles = uniqueStrings(parsed);
  } catch {
    jobTitles = [];
  }

  return {
    done,
    resumeScanned:
      safeBoolean(storage[ONBOARDING_STORAGE_KEYS.RESUME_SCANNED]) ?? false,
    resumeFileName:
      safeString(storage[ONBOARDING_STORAGE_KEYS.RESUME_FILE_NAME]) || null,
    resumeScore: safeNumber(storage[ONBOARDING_STORAGE_KEYS.RESUME_SCORE]),

    domain,

    subDomainMode,
    subDomainSingle:
      subDomainMode === "single"
        ? safeString(storage[ONBOARDING_STORAGE_KEYS.SUB_SINGLE]) || null
        : null,
    subDomainMulti: subDomainMode === "multi" ? subDomainMulti : [],

    jobTitles: subDomainMode === "single" ? jobTitles : [],
  };
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const onboardingTypeUtils = {
  unwrapOnboardingResponse,
  extractOnboardingMessage,

  isDomainType,
  isSubDomainMode,

  normalizeResumeScanResponse,
  normalizeUserOnboardingResponse,
  normalizeOnboardingState,
  createDefaultOnboardingState,

  buildUserOnboardingSaveRequest,

  isOnboardingComplete,
  hasScannedResume,
  shouldAskForJobTitles,
  getOnboardingProgressStep,
  getOnboardingCompletionPercentage,

  serializeOnboardingStateForStorage,
  hydrateOnboardingStateFromStorage,
};