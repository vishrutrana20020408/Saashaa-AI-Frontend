// src/lib/onboardingApi.ts
//
// Central onboarding API layer for frontend ↔ backend integration.
//
// Purpose:
// - Typed onboarding API wrapper
// - Handles resume scan + onboarding save/load/reset
// - Keeps localStorage + cookie mirror in sync for middleware gating
// - Supports wrapped backend responses and safe frontend fallbacks
// - Aligns with backend-first Interview System / Resume Management System architecture
//
// Recommended backend endpoints:
//   GET    /api/user/onboarding
//   POST   /api/user/onboarding
//   PUT    /api/user/onboarding                (optional)
//   DELETE /api/user/onboarding                (optional)
//   GET    /api/user/onboarding/status         (optional / commonly used)
//   POST   /api/user/resume/scan               (multipart, file key: "file")
//   GET    /api/user/onboarding/options        (optional)
//
// Latest project update alignment:
// - supports backend-first onboarding flow
// - supports resume scan state + score persistence
// - keeps cookie mirror for middleware/layout protection
// - preserves resilient envelope handling for Spring Boot backend
//
// Notes:
// - middleware cannot read localStorage, so onboardingDone is mirrored into cookies
// - this file is designed to work with your Next.js frontend + Spring Boot backend
// - this version supports credentials: "include" through the shared api client

import { api, cookie, ApiError, type Primitive } from "./api";

export type DomainType = "Technical" | "Non-Technical";
export type SubDomainMode = "single" | "any" | "multi";

export type UserOnboarding = {
  done: boolean;

  domain: DomainType | null;

  subDomainMode: SubDomainMode;
  subDomainSingle: string | null;
  subDomainMulti: string[];

  jobTitles: string[];

  resumeScanned: boolean;
  resumeUploaded: boolean;
  resumeFileName: string | null;
  resumeScore: number | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UserOnboardingResponse = {
  success?: boolean;
  message?: string;

  done?: boolean;
  completed?: boolean;
  onboardingDone?: boolean;

  domain?: DomainType | null;

  subDomainMode?: SubDomainMode | null;
  subDomainSingle?: string | null;
  subDomainMulti?: string[] | null;

  jobTitles?: string[] | null;

  resumeScanned?: boolean;
  resumeUploaded?: boolean;
  resumeFileName?: string | null;
  resumeScore?: number | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UserOnboardingSaveRequest = {
  domain: DomainType;
  subDomainMode: SubDomainMode;

  subDomainSingle?: string | null;
  subDomainMulti?: string[] | null;
  jobTitles?: string[] | null;
};

export type ResumeScanResponse = {
  success?: boolean;
  message?: string;
  score?: number | null;
  parsed?: unknown;
  fileName?: string | null;
  extractedText?: string | null;
  atsScore?: number | null;
  resumeScanned?: boolean;
  resumeUploaded?: boolean;
};

export type OnboardingOptionsResponse = {
  success?: boolean;
  message?: string;
  data?: unknown;
  result?: unknown;
  payload?: unknown;
  content?: unknown;
};

const STORAGE_KEYS = {
  DONE: "userOnboardingDone",
  DOMAIN: "userDomain",
  SUBDOMAIN_MODE: "userSubDomainMode",
  SUBDOMAIN_SINGLE: "userSubDomainSingle",
  SUBDOMAIN_MULTI: "userSubDomainMulti",
  JOB_TITLES: "userJobTitles",
  RESUME_SCANNED: "userResumeScanned",
  RESUME_UPLOADED: "userResumeUploaded",
  RESUME_FILE_NAME: "userResumeFileName",
  RESUME_SCORE: "userResumeScore",
} as const;

/* =========================================================
   BACKEND PATHS
========================================================= */
const onboardingPaths = {
  onboarding: ["/api/user/onboarding"],
  onboardingStatus: ["/api/user/onboarding/status"],
  onboardingOptions: ["/api/user/onboarding/options"],
  resumeScan: ["/api/user/resume/scan"],
} as const;

/* =========================================================
   TYPE GUARDS / NORMALIZERS
========================================================= */
function isDomainType(value: unknown): value is DomainType {
  return value === "Technical" || value === "Non-Technical";
}

function isSubDomainMode(value: unknown): value is SubDomainMode {
  return value === "single" || value === "any" || value === "multi";
}

function uniqueStrings(values: unknown): string[] {
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

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

function unwrapPossibleEnvelope<T>(value: unknown): T | null {
  if (!value || typeof value !== "object") return value as T | null;

  const obj = value as Record<string, unknown>;
  const first =
    ("data" in obj && typeof obj.data !== "undefined"
      ? obj.data
      : "result" in obj && typeof obj.result !== "undefined"
        ? obj.result
        : "payload" in obj && typeof obj.payload !== "undefined"
          ? obj.payload
          : "content" in obj && typeof obj.content !== "undefined"
            ? obj.content
            : value) as unknown;

  if (first && typeof first === "object") {
    const nested = first as Record<string, unknown>;
    if ("data" in nested && typeof nested.data !== "undefined") return nested.data as T;
    if ("result" in nested && typeof nested.result !== "undefined") return nested.result as T;
    if ("payload" in nested && typeof nested.payload !== "undefined") return nested.payload as T;
    if ("content" in nested && typeof nested.content !== "undefined") return nested.content as T;
  }

  return first as T;
}

function normalizeOnboarding(
  data: UserOnboardingResponse | null | undefined
): UserOnboarding {
  const mode = isSubDomainMode(data?.subDomainMode)
    ? data.subDomainMode
    : "single";

  const done =
    safeBoolean(data?.done) ??
    safeBoolean(data?.completed) ??
    safeBoolean(data?.onboardingDone) ??
    false;

  const resumeScanned =
    safeBoolean(data?.resumeScanned) ??
    safeBoolean(data?.resumeUploaded) ??
    false;

  const resumeUploaded =
    safeBoolean(data?.resumeUploaded) ??
    safeBoolean(data?.resumeScanned) ??
    false;

  return {
    done,

    domain: isDomainType(data?.domain) ? data.domain : null,

    subDomainMode: mode,
    subDomainSingle:
      typeof data?.subDomainSingle === "string" && data.subDomainSingle.trim()
        ? data.subDomainSingle.trim()
        : null,
    subDomainMulti: uniqueStrings(data?.subDomainMulti),
    jobTitles: uniqueStrings(data?.jobTitles),

    resumeScanned,
    resumeUploaded,
    resumeFileName: safeString(data?.resumeFileName),
    resumeScore: safeNumber(data?.resumeScore),

    createdAt: safeString(data?.createdAt),
    updatedAt: safeString(data?.updatedAt),
  };
}

function normalizeResumeScanResponse(
  data: ResumeScanResponse | null | undefined
): ResumeScanResponse {
  const success = safeBoolean(data?.success) ?? false;

  return {
    success,
    message: typeof data?.message === "string" ? data.message : undefined,
    score: safeNumber(data?.score),
    parsed: data?.parsed,
    fileName: safeString(data?.fileName),
    extractedText: safeString(data?.extractedText),
    atsScore: safeNumber(data?.atsScore),
    resumeScanned: safeBoolean(data?.resumeScanned) ?? success,
    resumeUploaded: safeBoolean(data?.resumeUploaded) ?? success,
  };
}

function buildNormalizedSavePayload(
  payload: UserOnboardingSaveRequest
): UserOnboardingSaveRequest {
  if (!isDomainType(payload?.domain)) {
    throw new Error("Valid domain is required.");
  }

  if (!isSubDomainMode(payload?.subDomainMode)) {
    throw new Error("Valid sub-domain mode is required.");
  }

  const mode = payload.subDomainMode;

  const single =
    mode === "single" && typeof payload.subDomainSingle === "string"
      ? payload.subDomainSingle.trim()
      : "";

  const multi = mode === "multi" ? uniqueStrings(payload.subDomainMulti) : [];

  const jobTitles = mode === "single" ? uniqueStrings(payload.jobTitles) : [];

  return {
    domain: payload.domain,
    subDomainMode: mode,
    subDomainSingle: mode === "single" ? single || null : null,
    subDomainMulti: mode === "multi" ? multi : [],
    jobTitles,
  };
}

/* =========================================================
   LOCAL MIRROR HELPERS
========================================================= */
function setLocalMirror(onb: UserOnboarding) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEYS.DONE, String(onb.done));
  localStorage.setItem(STORAGE_KEYS.DOMAIN, onb.domain || "");
  localStorage.setItem(STORAGE_KEYS.SUBDOMAIN_MODE, onb.subDomainMode);
  localStorage.setItem(STORAGE_KEYS.SUBDOMAIN_SINGLE, onb.subDomainSingle || "");
  localStorage.setItem(
    STORAGE_KEYS.SUBDOMAIN_MULTI,
    JSON.stringify(onb.subDomainMulti || [])
  );
  localStorage.setItem(
    STORAGE_KEYS.JOB_TITLES,
    JSON.stringify(onb.jobTitles || [])
  );
  localStorage.setItem(STORAGE_KEYS.RESUME_SCANNED, String(onb.resumeScanned));
  localStorage.setItem(STORAGE_KEYS.RESUME_UPLOADED, String(onb.resumeUploaded));
  localStorage.setItem(STORAGE_KEYS.RESUME_FILE_NAME, onb.resumeFileName || "");
  localStorage.setItem(
    STORAGE_KEYS.RESUME_SCORE,
    onb.resumeScore !== null && onb.resumeScore !== undefined
      ? String(onb.resumeScore)
      : ""
  );

  cookie.set("userOnboardingDone", String(onb.done));
  cookie.set("onboardingDone", String(onb.done));
  cookie.set("userSubDomainMode", onb.subDomainMode);
  cookie.set("userResumeScanned", String(onb.resumeScanned));
  cookie.set("userResumeUploaded", String(onb.resumeUploaded));

  if (onb.domain) {
    cookie.set("userDomain", onb.domain);
  } else {
    cookie.remove("userDomain");
  }

  if (onb.subDomainSingle) {
    cookie.set("userSubDomainSingle", onb.subDomainSingle);
  } else {
    cookie.remove("userSubDomainSingle");
  }
}

function clearLocalMirror() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEYS.DONE);
  localStorage.removeItem(STORAGE_KEYS.DOMAIN);
  localStorage.removeItem(STORAGE_KEYS.SUBDOMAIN_MODE);
  localStorage.removeItem(STORAGE_KEYS.SUBDOMAIN_SINGLE);
  localStorage.removeItem(STORAGE_KEYS.SUBDOMAIN_MULTI);
  localStorage.removeItem(STORAGE_KEYS.JOB_TITLES);
  localStorage.removeItem(STORAGE_KEYS.RESUME_SCANNED);
  localStorage.removeItem(STORAGE_KEYS.RESUME_UPLOADED);
  localStorage.removeItem(STORAGE_KEYS.RESUME_FILE_NAME);
  localStorage.removeItem(STORAGE_KEYS.RESUME_SCORE);

  cookie.remove("userOnboardingDone");
  cookie.remove("onboardingDone");
  cookie.remove("userDomain");
  cookie.remove("userSubDomainMode");
  cookie.remove("userSubDomainSingle");
  cookie.remove("userResumeScanned");
  cookie.remove("userResumeUploaded");
}

function mergeResumeScanIntoMirror(scan: ResumeScanResponse) {
  if (typeof window === "undefined") return;

  const existing = onboardingApi.mirrorFromLocalStorage();

  const next: UserOnboarding = {
    done: existing?.done ?? false,
    domain: existing?.domain ?? null,
    subDomainMode: existing?.subDomainMode ?? "single",
    subDomainSingle: existing?.subDomainSingle ?? null,
    subDomainMulti: existing?.subDomainMulti ?? [],
    jobTitles: existing?.jobTitles ?? [],
    resumeScanned:
      safeBoolean(scan.resumeScanned) ??
      safeBoolean(scan.success) ??
      true,
    resumeUploaded:
      safeBoolean(scan.resumeUploaded) ??
      safeBoolean(scan.success) ??
      true,
    resumeFileName: scan.fileName ?? existing?.resumeFileName ?? null,
    resumeScore:
      scan.score ??
      scan.atsScore ??
      existing?.resumeScore ??
      null,
    createdAt: existing?.createdAt ?? null,
    updatedAt: existing?.updatedAt ?? null,
  };

  setLocalMirror(next);
}

function ensureSuccess<T extends { success?: boolean; message?: string }>(
  data: T | null | undefined,
  fallbackMessage: string
): T {
  if (safeBoolean(data?.success) === false) {
    throw new ApiError(data?.message || fallbackMessage, 400, data ?? undefined);
  }
  return data as T;
}

/* =========================================================
   LOW-LEVEL BACKEND CALL HELPERS
========================================================= */
async function tryGet<T>(paths: readonly string[]): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await api.get<T>(path, { unwrapResponse: false });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("GET request failed.");
}

async function tryDelete<T>(paths: readonly string[]): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await api.delete<T>(path, { unwrapResponse: false });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("DELETE request failed.");
}

async function tryPost<T>(
  paths: readonly string[],
  payload?: unknown
): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await api.post<T>(path, payload, { unwrapResponse: false });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("POST request failed.");
}

async function tryPut<T>(
  paths: readonly string[],
  payload?: unknown
): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await api.put<T>(path, payload, { unwrapResponse: false });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("PUT request failed.");
}

async function tryUpload<T>(
  paths: readonly string[],
  file: File,
  extraFields?: Record<string, Primitive>
): Promise<T> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await api.upload<T>(path, { file }, extraFields, {
        unwrapResponse: false,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Upload request failed.");
}

/* =========================================================
   MAIN ONBOARDING API
========================================================= */
export const onboardingApi = {
  async scanResume(file: File): Promise<ResumeScanResponse> {
    if (!(file instanceof File)) {
      throw new Error("Resume file is required.");
    }

    const raw = await tryUpload<ResumeScanResponse | Record<string, unknown>>(
      onboardingPaths.resumeScan,
      file
    );

    const data = unwrapPossibleEnvelope<ResumeScanResponse>(raw) || raw;
    const normalized = normalizeResumeScanResponse(data as ResumeScanResponse);

    if (!normalized.success) {
      throw new ApiError(
        normalized.message || "Failed to scan resume.",
        400,
        normalized
      );
    }

    mergeResumeScanIntoMirror(normalized);
    return normalized;
  },

  async get(): Promise<UserOnboarding> {
    const raw = await tryGet<UserOnboardingResponse | Record<string, unknown>>(
      onboardingPaths.onboarding
    );

    const data =
      unwrapPossibleEnvelope<UserOnboardingResponse>(raw) ||
      (raw as UserOnboardingResponse);

    ensureSuccess(data, "Failed to load onboarding.");

    const onboarding = normalizeOnboarding(data);
    setLocalMirror(onboarding);
    return onboarding;
  },

  async getStatus(): Promise<UserOnboarding> {
    try {
      const raw = await tryGet<UserOnboardingResponse | Record<string, unknown>>(
        onboardingPaths.onboardingStatus
      );

      const data =
        unwrapPossibleEnvelope<UserOnboardingResponse>(raw) ||
        (raw as UserOnboardingResponse);

      ensureSuccess(data, "Failed to load onboarding status.");

      const onboarding = normalizeOnboarding(data);
      setLocalMirror(onboarding);
      return onboarding;
    } catch {
      return this.get();
    }
  },

  async save(payload: UserOnboardingSaveRequest): Promise<UserOnboarding> {
    const body = buildNormalizedSavePayload(payload);

    let raw: UserOnboardingResponse | Record<string, unknown>;
    try {
      raw = await tryPost<UserOnboardingResponse | Record<string, unknown>>(
        onboardingPaths.onboarding,
        body
      );
    } catch {
      raw = await tryPut<UserOnboardingResponse | Record<string, unknown>>(
        onboardingPaths.onboarding,
        body
      );
    }

    const data =
      unwrapPossibleEnvelope<UserOnboardingResponse>(raw) ||
      (raw as UserOnboardingResponse);

    ensureSuccess(data, "Failed to save onboarding.");

    const onboarding = normalizeOnboarding(data);
    setLocalMirror(onboarding);
    return onboarding;
  },

  async reset(): Promise<void> {
    try {
      await tryDelete<unknown>(onboardingPaths.onboarding);
    } finally {
      clearLocalMirror();
    }
  },

  async getOptions<T = unknown>(): Promise<T | null> {
    const raw = await tryGet<OnboardingOptionsResponse | Record<string, unknown>>(
      onboardingPaths.onboardingOptions
    );

    const envelope = raw as OnboardingOptionsResponse;
    const unwrapped = unwrapPossibleEnvelope<T>(raw);

    if (
      typeof envelope === "object" &&
      envelope !== null &&
      "success" in envelope &&
      safeBoolean(envelope.success) === false
    ) {
      throw new ApiError(
        envelope.message || "Failed to load onboarding options.",
        400,
        envelope
      );
    }

    return (unwrapped as T) ?? null;
  },

  mirrorFromLocalStorage(): UserOnboarding | null {
    if (typeof window === "undefined") return null;

    try {
      const done = localStorage.getItem(STORAGE_KEYS.DONE) === "true";

      const domainRaw = localStorage.getItem(STORAGE_KEYS.DOMAIN);
      const domain = isDomainType(domainRaw) ? domainRaw : null;

      const modeRaw = localStorage.getItem(STORAGE_KEYS.SUBDOMAIN_MODE);
      const subDomainMode = isSubDomainMode(modeRaw) ? modeRaw : "single";

      const subDomainSingleRaw = localStorage.getItem(
        STORAGE_KEYS.SUBDOMAIN_SINGLE
      );
      const subDomainSingle =
        typeof subDomainSingleRaw === "string" && subDomainSingleRaw.trim()
          ? subDomainSingleRaw
          : null;

      const subDomainMulti = uniqueStrings(
        JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBDOMAIN_MULTI) || "[]")
      );

      const jobTitles = uniqueStrings(
        JSON.parse(localStorage.getItem(STORAGE_KEYS.JOB_TITLES) || "[]")
      );

      const resumeScanned =
        localStorage.getItem(STORAGE_KEYS.RESUME_SCANNED) === "true";

      const resumeUploaded =
        localStorage.getItem(STORAGE_KEYS.RESUME_UPLOADED) === "true";

      const resumeFileNameRaw = localStorage.getItem(
        STORAGE_KEYS.RESUME_FILE_NAME
      );
      const resumeFileName =
        typeof resumeFileNameRaw === "string" && resumeFileNameRaw.trim()
          ? resumeFileNameRaw
          : null;

      const resumeScoreRaw = localStorage.getItem(STORAGE_KEYS.RESUME_SCORE);
      const parsedScore =
        resumeScoreRaw !== null && resumeScoreRaw !== ""
          ? Number(resumeScoreRaw)
          : null;

      return {
        done,
        domain,
        subDomainMode,
        subDomainSingle,
        subDomainMulti,
        jobTitles,
        resumeScanned,
        resumeUploaded,
        resumeFileName,
        resumeScore:
          parsedScore !== null && Number.isFinite(parsedScore)
            ? parsedScore
            : null,
        createdAt: null,
        updatedAt: null,
      };
    } catch {
      return null;
    }
  },

  applyMirror(onboarding: UserOnboarding) {
    setLocalMirror(onboarding);
  },

  clearMirror() {
    clearLocalMirror();
  },

  isComplete(onboarding: UserOnboarding | null | undefined): boolean {
    if (!onboarding) return false;
    if (!onboarding.done) return false;
    if (!onboarding.domain) return false;
    if (!isSubDomainMode(onboarding.subDomainMode)) return false;

    if (onboarding.subDomainMode === "single") {
      return Boolean(onboarding.subDomainSingle);
    }

    if (onboarding.subDomainMode === "multi") {
      return onboarding.subDomainMulti.length > 0;
    }

    return true;
  },

  buildSavePayload(input: {
    domain?: DomainType | null;
    subDomainMode?: SubDomainMode | null;
    subDomainSingle?: string | null;
    subDomainMulti?: string[] | null;
    jobTitles?: string[] | null;
  }): UserOnboardingSaveRequest {
    if (!isDomainType(input.domain)) {
      throw new Error("Domain is required.");
    }

    if (!isSubDomainMode(input.subDomainMode)) {
      throw new Error("Sub-domain mode is required.");
    }

    return buildNormalizedSavePayload({
      domain: input.domain,
      subDomainMode: input.subDomainMode,
      subDomainSingle: input.subDomainSingle ?? null,
      subDomainMulti: input.subDomainMulti ?? [],
      jobTitles: input.jobTitles ?? [],
    });
  },
};