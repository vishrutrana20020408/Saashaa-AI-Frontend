// src/lib/uploadApi.ts
//
// Central Upload API client for frontend ↔ backend integration.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - Cookie/session auth supported via credentials: "include"
// - Bearer token fallback retained for older auth flow
// - Supports multipart/form-data uploads for resume flows
// - Supports wrapped backend response styles:
//   { success, message, data | payload | result | content }
// - Aligned with current upload, resume scan, preview-generation,
//   and onboarding-integrated resume upload flows
//
// Recommended backend endpoints:
//   POST /api/user/resume/upload
//   POST /api/user/resume/scan
//   POST /api/user/resume/current/upload
//   POST /api/user/resume/{resumeId}/upload
//
// Common backend expectations:
// - multipart file field may be one of:
//   file | resume | resumeFile | document
// - optional metadata can be passed as multipart fields
// - backend may return plain object or wrapped envelope

export const UPLOAD_API_PATHS = {
  USER_RESUME: "/api/user/resume",
  USER_ONBOARDING: "/api/user/onboarding",
} as const;

/* =========================================================
   TYPES
========================================================= */

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  error?: string;
  details?: unknown;
  data?: T;
  result?: T;
  payload?: T;
  content?: T;
};

export type UploadApiRequestOptions = {
  token?: string | null;
  apiBaseUrl?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
  withCredentials?: boolean;
};

export type ResumeUploadPayload = {
  file: File | Blob;
  fileName?: string;
  title?: string;
  description?: string;
  baseResume?: boolean;
  generatePreview?: boolean;
  parseAfterUpload?: boolean;
  tags?: string[];
  additionalFields?: Record<string, string | number | boolean | null | undefined>;
};

export type ResumeScanPayload = {
  file: File | Blob;
  fileName?: string;
  parseOnly?: boolean;
  includeScore?: boolean;
  additionalFields?: Record<string, string | number | boolean | null | undefined>;
};

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

export type ResumeScanResponse = {
  success: boolean;
  message?: string;
  parsed?: Record<string, unknown> | null;
  score?: number | null;
  atsScore?: number | null;
  rawText?: string | null;
  fileName?: string | null;
  raw?: unknown;
};

export type UploadTarget =
  | "upload"
  | "scan"
  | "current-upload"
  | "resume-upload";

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

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
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

function extractEnvelopeMeta(payload: unknown): {
  success?: boolean;
  message?: string;
  error?: string;
  details?: unknown;
} {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const record = payload as Record<string, unknown>;

  return {
    success:
      typeof record.success === "boolean" ? record.success : undefined,
    message: safeString(record.message) || undefined,
    error: safeString(record.error) || undefined,
    details: record.details,
  };
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    return (
      safeString(record.message) ||
      safeString(record.error) ||
      safeString(record.details) ||
      `Request failed with status ${status}`
    );
  }

  return `Request failed with status ${status}`;
}

function buildUrl(
  path: string,
  apiBaseUrl?: string,
  params?: Record<string, unknown>
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

function appendDefinedField(formData: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null) return;

  if (typeof value === "boolean") {
    formData.append(key, value ? "true" : "false");
    return;
  }

  if (typeof value === "number") {
    formData.append(key, String(value));
    return;
  }

  if (typeof value === "string") {
    if (value.trim() === "") return;
    formData.append(key, value);
    return;
  }

  formData.append(key, String(value));
}

function safeParseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

/* =========================================================
   ERROR
========================================================= */

export class UploadApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "UploadApiError";
    this.status = status;
    this.details = details;
  }
}

/* =========================================================
   HTTP CORE
========================================================= */

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

function buildMultipartHeaders(
  token?: string | null,
  customHeaders?: HeadersInit
): Headers {
  const headers = new Headers(customHeaders || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function multipartRequest<T>(
  path: string,
  formData: FormData,
  options: UploadApiRequestOptions = {},
  method: "POST" | "PUT" | "PATCH" = "POST"
): Promise<{ meta: ReturnType<typeof extractEnvelopeMeta>; data: T; raw: unknown }> {
  const token = options.token ?? getAccessToken();
  const url = buildUrl(path, options.apiBaseUrl);
  const credentials: RequestCredentials =
    options.withCredentials === false ? "omit" : "include";

  const response = await fetch(url, {
    method,
    headers: buildMultipartHeaders(token, options.headers),
    body: formData,
    credentials,
    signal: options.signal,
    cache: "no-store",
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new UploadApiError(
      extractErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return {
    meta: extractEnvelopeMeta(payload),
    data: unwrapResponse<T>(payload),
    raw: payload,
  };
}

async function multipartRequestWithFallback<T>(
  paths: string[],
  formDataFactory: () => FormData,
  options: UploadApiRequestOptions = {},
  methods: Array<"POST" | "PUT" | "PATCH"> = ["POST"]
): Promise<{ meta: ReturnType<typeof extractEnvelopeMeta>; data: T; raw: unknown }> {
  let lastError: unknown = null;

  for (const path of paths) {
    for (const method of methods) {
      try {
        return await multipartRequest<T>(path, formDataFactory(), options, method);
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (lastError instanceof UploadApiError) {
    throw lastError;
  }

  throw new UploadApiError("Upload request failed.", 500, lastError);
}

/* =========================================================
   FORM BUILDERS
========================================================= */

function resolveUploadFileName(file: File | Blob, fileName?: string): string {
  if (typeof fileName === "string" && fileName.trim()) {
    return fileName.trim();
  }

  if (file instanceof File && typeof file.name === "string" && file.name.trim()) {
    return file.name;
  }

  return "upload-file";
}

function appendFileWithFieldFallbacks(
  formData: FormData,
  file: File | Blob,
  fileName?: string
): void {
  const resolvedName = resolveUploadFileName(file, fileName);

  formData.append("file", file, resolvedName);
  formData.append("resume", file, resolvedName);
  formData.append("resumeFile", file, resolvedName);
  formData.append("document", file, resolvedName);
}

function buildResumeUploadFormData(payload: ResumeUploadPayload): FormData {
  const formData = new FormData();

  appendFileWithFieldFallbacks(formData, payload.file, payload.fileName);

  appendDefinedField(formData, "title", payload.title);
  appendDefinedField(formData, "description", payload.description);
  appendDefinedField(formData, "baseResume", payload.baseResume);
  appendDefinedField(formData, "generatePreview", payload.generatePreview);
  appendDefinedField(formData, "parseAfterUpload", payload.parseAfterUpload);

  if (Array.isArray(payload.tags) && payload.tags.length > 0) {
    payload.tags
      .filter((tag) => typeof tag === "string" && tag.trim())
      .forEach((tag) => formData.append("tags", tag));
  }

  if (payload.additionalFields) {
    Object.entries(payload.additionalFields).forEach(([key, value]) => {
      appendDefinedField(formData, key, value);
    });
  }

  return formData;
}

function buildResumeScanFormData(payload: ResumeScanPayload): FormData {
  const formData = new FormData();

  appendFileWithFieldFallbacks(formData, payload.file, payload.fileName);

  appendDefinedField(formData, "parseOnly", payload.parseOnly);
  appendDefinedField(formData, "includeScore", payload.includeScore);

  if (payload.additionalFields) {
    Object.entries(payload.additionalFields).forEach(([key, value]) => {
      appendDefinedField(formData, key, value);
    });
  }

  return formData;
}

/* =========================================================
   PATH HELPERS
========================================================= */

function uploadPaths(): string[] {
  return [
    `${UPLOAD_API_PATHS.USER_RESUME}/upload`,
    `${UPLOAD_API_PATHS.USER_RESUME}`,
  ];
}

function scanPaths(): string[] {
  return [
    `${UPLOAD_API_PATHS.USER_RESUME}/scan`,
    `${UPLOAD_API_PATHS.USER_RESUME}/upload-and-scan`,
  ];
}

function currentUploadPaths(): string[] {
  return [
    `${UPLOAD_API_PATHS.USER_RESUME}/current/upload`,
    `${UPLOAD_API_PATHS.USER_RESUME}/current`,
    `${UPLOAD_API_PATHS.USER_RESUME}/upload`,
  ];
}

function resumeUploadPaths(resumeId: string | number): string[] {
  return [
    `${UPLOAD_API_PATHS.USER_RESUME}/${resumeId}/upload`,
    `${UPLOAD_API_PATHS.USER_RESUME}/${resumeId}`,
    `${UPLOAD_API_PATHS.USER_RESUME}/${resumeId}/file`,
  ];
}

/* =========================================================
   NORMALIZERS
========================================================= */

function normalizeResumeUploadResponse(
  rawData: unknown,
  meta?: ReturnType<typeof extractEnvelopeMeta>,
  rawPayload?: unknown
): ResumeUploadResponse {
  const record =
    rawData && typeof rawData === "object"
      ? (rawData as Record<string, unknown>)
      : {};

  return {
    success:
      typeof meta?.success === "boolean"
        ? meta.success
        : true,
    message:
      meta?.message ||
      safeString(record.message) ||
      undefined,
    resumeId: safeNumber(record.resumeId ?? record.id),
    resumeVersionId: safeNumber(record.resumeVersionId ?? record.versionId),
    versionCode: safeString(record.versionCode) || null,
    versionName: safeString(record.versionName) || null,
    fileName: safeString(record.fileName) || null,
    fileUrl: safeString(record.fileUrl) || null,
    previewUrl: safeString(record.previewUrl) || null,
    downloadUrl: safeString(record.downloadUrl) || null,
    status: safeString(record.status) || null,
    atsScore: safeNumber(record.atsScore ?? record.score),
    raw: rawPayload ?? rawData,
  };
}

function normalizeResumeScanResponse(
  rawData: unknown,
  meta?: ReturnType<typeof extractEnvelopeMeta>,
  rawPayload?: unknown
): ResumeScanResponse {
  const record =
    rawData && typeof rawData === "object"
      ? (rawData as Record<string, unknown>)
      : {};

  const parsed =
    safeParseJsonObject(record.parsed) ||
    safeParseJsonObject(record.structuredContentJson) ||
    safeParseJsonObject(record.structuredContent);

  return {
    success:
      typeof meta?.success === "boolean"
        ? meta.success
        : true,
    message:
      meta?.message ||
      safeString(record.message) ||
      undefined,
    parsed,
    score: safeNumber(record.score ?? record.atsScore),
    atsScore: safeNumber(record.atsScore ?? record.score),
    rawText: typeof record.rawText === "string" ? record.rawText : null,
    fileName: safeString(record.fileName) || null,
    raw: rawPayload ?? rawData,
  };
}

/* =========================================================
   PUBLIC API
========================================================= */

export async function uploadResume(
  payload: ResumeUploadPayload,
  options?: UploadApiRequestOptions
): Promise<ResumeUploadResponse> {
  const result = await multipartRequestWithFallback<UploadResponseLike>(
    uploadPaths(),
    () => buildResumeUploadFormData(payload),
    options,
    ["POST"]
  );

  return normalizeResumeUploadResponse(result.data, result.meta, result.raw);
}

export async function scanResume(
  payload: ResumeScanPayload,
  options?: UploadApiRequestOptions
): Promise<ResumeScanResponse> {
  const result = await multipartRequestWithFallback<Record<string, unknown>>(
    scanPaths(),
    () => buildResumeScanFormData(payload),
    options,
    ["POST"]
  );

  return normalizeResumeScanResponse(result.data, result.meta, result.raw);
}

export async function uploadCurrentResume(
  payload: ResumeUploadPayload,
  options?: UploadApiRequestOptions
): Promise<ResumeUploadResponse> {
  const result = await multipartRequestWithFallback<UploadResponseLike>(
    currentUploadPaths(),
    () => buildResumeUploadFormData(payload),
    options,
    ["POST", "PUT"]
  );

  return normalizeResumeUploadResponse(result.data, result.meta, result.raw);
}

export async function uploadResumeFileToResume(
  resumeId: string | number,
  payload: ResumeUploadPayload,
  options?: UploadApiRequestOptions
): Promise<ResumeUploadResponse> {
  const result = await multipartRequestWithFallback<UploadResponseLike>(
    resumeUploadPaths(resumeId),
    () => buildResumeUploadFormData(payload),
    options,
    ["POST", "PUT"]
  );

  return normalizeResumeUploadResponse(result.data, result.meta, result.raw);
}

/* =========================================================
   CONVENIENCE HELPERS
========================================================= */

export function isSupportedResumeFile(file: File | Blob | null | undefined): boolean {
  if (!file) return false;

  const typedFile = file as File;
  const name = typeof typedFile.name === "string" ? typedFile.name.toLowerCase() : "";
  const type = typeof typedFile.type === "string" ? typedFile.type.toLowerCase() : "";

  if (type.includes("pdf")) return true;
  if (type.includes("word")) return true;
  if (type.includes("officedocument.wordprocessingml.document")) return true;

  if (name.endsWith(".pdf")) return true;
  if (name.endsWith(".doc")) return true;
  if (name.endsWith(".docx")) return true;

  return false;
}

export function getUploadErrorMessage(error: unknown): string {
  if (error instanceof UploadApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while uploading the file.";
}

export function getResumePreviewUrlFromUpload(
  response: Partial<ResumeUploadResponse> | null | undefined
): string | null {
  if (!response) return null;

  if (typeof response.previewUrl === "string" && response.previewUrl.trim()) {
    return response.previewUrl;
  }

  if (typeof response.fileUrl === "string" && response.fileUrl.trim()) {
    return response.fileUrl;
  }

  return null;
}

export function getResumeDownloadUrlFromUpload(
  response: Partial<ResumeUploadResponse> | null | undefined
): string | null {
  if (!response) return null;

  if (typeof response.downloadUrl === "string" && response.downloadUrl.trim()) {
    return response.downloadUrl;
  }

  if (typeof response.fileUrl === "string" && response.fileUrl.trim()) {
    return response.fileUrl;
  }

  return null;
}

export function hasSuccessfulUpload(
  response: Partial<ResumeUploadResponse> | null | undefined
): boolean {
  if (!response) return false;
  return response.success === true || Boolean(response.resumeId || response.resumeVersionId);
}

export function hasSuccessfulScan(
  response: Partial<ResumeScanResponse> | null | undefined
): boolean {
  if (!response) return false;
  return response.success === true || Boolean(response.parsed || response.rawText);
}

/* =========================================================
   CONVENIENCE EXPORT
========================================================= */

export const uploadApi = {
  uploadResume,
  scanResume,
  uploadCurrentResume,
  uploadResumeFileToResume,

  isSupportedResumeFile,
  getUploadErrorMessage,
  getResumePreviewUrlFromUpload,
  getResumeDownloadUrlFromUpload,
  hasSuccessfulUpload,
  hasSuccessfulScan,
};

/* =========================================================
   EXAMPLE USAGE

   import { uploadApi } from "@/lib/uploadApi";

   const uploadResult = await uploadApi.uploadResume({
     file,
     title: "My Resume",
     description: "Base resume upload",
     baseResume: true,
     generatePreview: true,
   });

   const scanResult = await uploadApi.scanResume({
     file,
     includeScore: true,
   });

   const currentUpload = await uploadApi.uploadCurrentResume({
     file,
     generatePreview: true,
   });

   const resumeSpecificUpload = await uploadApi.uploadResumeFileToResume(12, {
     file,
     title: "Updated Resume File",
   });
========================================================= */