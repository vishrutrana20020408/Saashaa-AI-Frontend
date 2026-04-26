"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  Briefcase,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Upload,
  User,
  Mail,
  Phone,
  GraduationCap,
  Flag,
} from "lucide-react";

/**
 * src/components/resume/ResumeApplyDialog.tsx
 *
 * Backend Integrated Resume Apply Dialog
 *
 * Latest-project aligned goals:
 * - Backend-first job application submission flow
 * - Fetch authenticated user profile from backend
 * - Fetch default/current website resume from backend
 * - Support website resume or uploaded resume submission
 * - Support flexible backend response shapes:
 *   - data
 *   - payload
 *   - result
 * - Support bearer token fallback + credentials: "include"
 * - Resilient endpoint fallback strategy for evolving backend APIs
 *
 * Typical backend families:
 * - GET  /api/auth/me
 * - GET  /api/user/resume/default
 * - GET  /api/user/resume/current
 * - POST /api/user/jobs/{jobId}/apply
 *
 * This component is aligned with the Interview / Resume Management System
 * architecture and broader backend-integrated frontend ideology.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

type GenericObject = Record<string, unknown>;

type JobInfo = {
  id: number;
  title: string;
  company: string;
  location?: string;
  domain?: string;
  type?: string;
};

type ResumeInfo = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  versionName?: string;
  fileName?: string;
  fileUrl?: string;
};

type AuthUser = {
  id?: number;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
};

type ApplySuccessData = {
  applicationId?: number;
  jobId?: number;
  interviewAvailable?: boolean;
  interviewToken?: string;
};

type ApiEnvelope<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

export type ResumeApplyDialogSuccess = {
  applicationId?: number;
  jobId?: number;
  interviewAvailable?: boolean;
  interviewToken?: string;
};

type ResumeApplyDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  job: JobInfo | null;
  onSuccess?: (data: ResumeApplyDialogSuccess) => void;
};

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
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
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

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  }

  return undefined;
}

function unwrapPayload<T = unknown>(input: unknown): T | null {
  if (!input || typeof input !== "object") return null;

  const obj = input as ApiEnvelope<T> & GenericObject;

  if (obj.data && typeof obj.data === "object") return obj.data as T;
  if (obj.payload && typeof obj.payload === "object") return obj.payload as T;
  if (obj.result && typeof obj.result === "object") return obj.result as T;

  return input as T;
}

function readMessage(input: unknown): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const obj = input as GenericObject;
  return readString(obj.message, obj.error, obj.detail);
}

function normalizeAuthUser(input: unknown): AuthUser | null {
  if (!input || typeof input !== "object") return null;

  const payload = unwrapPayload<GenericObject>(input);
  const source = payload && typeof payload === "object" ? payload : (input as GenericObject);

  const user: AuthUser = {
    id: readNumber(source.id, source.userId, source.user_id),
    name: readString(source.name, source.fullName, source.full_name),
    email: readString(source.email),
    phone: readString(source.phone, source.mobile, source.mobileNumber, source.mobile_number),
    mobile: readString(source.mobile, source.phone, source.mobileNumber, source.mobile_number),
  };

  const hasUsefulData =
    user.id !== undefined || Boolean(user.name) || Boolean(user.email) || Boolean(user.phone);

  return hasUsefulData ? user : null;
}

function normalizeResumeInfo(input: unknown): ResumeInfo | null {
  if (!input || typeof input !== "object") return null;

  const payload = unwrapPayload<GenericObject>(input);
  const source = payload && typeof payload === "object" ? payload : (input as GenericObject);

  const resume: ResumeInfo = {
    resumeId: readNumber(source.resumeId, source.resume_id, source.id),
    resumeVersionId: readNumber(
      source.resumeVersionId,
      source.resume_version_id,
      source.versionId,
      source.version_id
    ),
    versionId: readNumber(
      source.versionId,
      source.version_id,
      source.resumeVersionId,
      source.resume_version_id
    ),
    resumeName: readString(source.resumeName, source.resume_name, source.name, source.title),
    versionName: readString(source.versionName, source.version_name),
    fileName: readString(
      source.fileName,
      source.file_name,
      source.originalFileName,
      source.original_file_name
    ),
    fileUrl: readString(source.fileUrl, source.file_url, source.previewUrl, source.preview_url),
  };

  const hasUsefulData =
    resume.resumeId !== undefined ||
    resume.resumeVersionId !== undefined ||
    Boolean(resume.resumeName) ||
    Boolean(resume.fileName);

  return hasUsefulData ? resume : null;
}

function normalizeApplySuccess(input: unknown): ResumeApplyDialogSuccess | null {
  if (!input || typeof input !== "object") return null;

  const payload = unwrapPayload<GenericObject>(input);
  const source = payload && typeof payload === "object" ? payload : (input as GenericObject);

  const result: ResumeApplyDialogSuccess = {
    applicationId: readNumber(source.applicationId, source.application_id, source.id),
    jobId: readNumber(source.jobId, source.job_id),
    interviewAvailable: normalizeBoolean(
      source.interviewAvailable ?? source.interview_available
    ),
    interviewToken: readString(source.interviewToken, source.interview_token),
  };

  const hasUsefulData =
    result.applicationId !== undefined ||
    result.jobId !== undefined ||
    result.interviewAvailable !== undefined ||
    Boolean(result.interviewToken);

  return hasUsefulData ? result : null;
}

export default function ResumeApplyDialog({
  isOpen,
  onClose,
  job,
  onSuccess,
}: ResumeApplyDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [websiteResume, setWebsiteResume] = useState<ResumeInfo | null>(null);
  const [resumeOption, setResumeOption] = useState<"website" | "upload">("website");
  const [uploadedResume, setUploadedResume] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    qualification: "",
    nationality: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authHeaders = useMemo<HeadersInit>(() => {
    const token = getStoredToken();

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const authMeEndpoints = useMemo(
    () => [
      `${API_BASE_URL}/api/auth/me`,
      `${API_BASE_URL}/api/user/me`,
      `${API_BASE_URL}/api/auth/user/me`,
    ],
    []
  );

  const defaultResumeEndpoints = useMemo(
    () => [
      `${API_BASE_URL}/api/user/resume/default`,
      `${API_BASE_URL}/api/user/resume/current`,
      `${API_BASE_URL}/api/user/resume/latest`,
    ],
    []
  );

  const applyEndpoints = useMemo(() => {
    if (!job?.id) return [];
    return [
      `${API_BASE_URL}/api/user/jobs/${job.id}/apply`,
      `${API_BASE_URL}/api/user/job/${job.id}/apply`,
      `${API_BASE_URL}/api/user/job-application/apply/${job.id}`,
      `${API_BASE_URL}/api/user/job-application/jobs/${job.id}/apply`,
    ];
  }, [job?.id]);

  const fetchInitialData = useCallback(async () => {
    if (!job) return;

    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setErrors({});

      let resolvedUser: AuthUser | null = null;
      let resolvedResume: ResumeInfo | null = null;

      for (const endpoint of authMeEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: authHeaders,
            credentials: "include",
            cache: "no-store",
          });

          if (!response.ok) {
            if ([401, 403, 404].includes(response.status)) continue;
            continue;
          }

          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) continue;

          const result = await response.json();
          const mapped = normalizeAuthUser(result);
          if (mapped) {
            resolvedUser = mapped;
            break;
          }
        } catch {
          continue;
        }
      }

      for (const endpoint of defaultResumeEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: authHeaders,
            credentials: "include",
            cache: "no-store",
          });

          if (!response.ok) {
            if ([401, 403, 404].includes(response.status)) continue;
            continue;
          }

          const contentType = response.headers.get("content-type") || "";
          if (!contentType.includes("application/json")) continue;

          const result = await response.json();
          const mapped = normalizeResumeInfo(result);
          if (mapped) {
            resolvedResume = mapped;
            break;
          }
        } catch {
          continue;
        }
      }

      if (resolvedUser) {
        setForm((prev) => ({
          ...prev,
          name: resolvedUser.name || prev.name,
          email: resolvedUser.email || prev.email,
          mobile: resolvedUser.phone || resolvedUser.mobile || prev.mobile,
        }));
      }

      setWebsiteResume(resolvedResume);

      if (!resolvedResume) {
        setResumeOption("upload");
      }
    } catch (error) {
      console.error("ResumeApplyDialog init error:", error);
      setErrorMessage("Unable to load profile and resume data from backend.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, authMeEndpoints, defaultResumeEndpoints, job]);

  useEffect(() => {
    if (!isOpen || !job) return;
    fetchInitialData();
  }, [fetchInitialData, isOpen, job]);

  useEffect(() => {
    if (!isOpen) {
      setUploadedResume(null);
      setErrors({});
      setSuccessMessage(null);
      setErrorMessage(null);
      setResumeOption("website");
    }
  }, [isOpen]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) newErrors.name = "Name is required";

    if (
      !form.email.trim() ||
      !form.email.includes("@") ||
      !form.email.includes(".") ||
      form.email.includes(" ")
    ) {
      newErrors.email = "Enter a valid email address";
    }

    if (!/^\d{10}$/.test(form.mobile.trim())) {
      newErrors.mobile = "Mobile number must be exactly 10 digits";
    }

    if (!form.qualification.trim()) {
      newErrors.qualification = "Qualification is required";
    }

    if (!form.nationality.trim()) {
      newErrors.nationality = "Nationality is required";
    }

    if (resumeOption === "website" && !websiteResume?.resumeId) {
      newErrors.resume = "No website resume found. Please upload a resume.";
    }

    if (resumeOption === "upload" && !uploadedResume) {
      newErrors.resume = "Please upload your resume";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form, resumeOption, uploadedResume, websiteResume]);

  const handleSubmit = useCallback(async () => {
    if (!job) return;
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("email", form.email.trim());
      formData.append("mobile", form.mobile.trim());
      formData.append("qualification", form.qualification.trim());
      formData.append("nationality", form.nationality.trim());
      formData.append("resumeOption", resumeOption);

      if (resumeOption === "website" && websiteResume?.resumeId) {
        formData.append("resumeId", String(websiteResume.resumeId));

        if (websiteResume.resumeVersionId ?? websiteResume.versionId) {
          formData.append(
            "resumeVersionId",
            String(websiteResume.resumeVersionId ?? websiteResume.versionId)
          );
        }
      }

      if (resumeOption === "upload" && uploadedResume) {
        formData.append("resumeFile", uploadedResume);
      }

      let resolvedSuccess: ResumeApplyDialogSuccess | null = null;
      let responseMessage = "Application submitted successfully.";
      let submitted = false;

      const token = getStoredToken();

      for (const endpoint of applyEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: "include",
            body: formData,
          });

          if (!response.ok) {
            if ([401, 403, 404, 405].includes(response.status)) continue;
            continue;
          }

          const contentType = response.headers.get("content-type") || "";
          let result: unknown = null;

          if (contentType.includes("application/json")) {
            try {
              result = await response.json();
            } catch {
              result = null;
            }
          }

          if (result) {
            resolvedSuccess = normalizeApplySuccess(result);
            const message = readMessage(result);
            if (message) responseMessage = message;
          }

          submitted = true;
          break;
        } catch {
          continue;
        }
      }

      if (!submitted) {
        throw new Error("Failed to apply for this job.");
      }

      setSuccessMessage(responseMessage);

      if (onSuccess && resolvedSuccess) {
        onSuccess(resolvedSuccess);
      }
    } catch (error) {
      console.error("ResumeApplyDialog submit error:", error);
      setErrorMessage("Failed to submit job application.");
    } finally {
      setSubmitting(false);
    }
  }, [applyEndpoints, form, job, onSuccess, resumeOption, uploadedResume, validateForm, websiteResume]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [onClose, submitting]);

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0f172a] text-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Briefcase size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Apply for {job.title}</h2>
              <p className="text-sm text-white/55">
                {job.company}
                {job.location ? ` • ${job.location}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/15 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6">
          {successMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
              <CheckCircle2 size={18} className="mt-0.5 text-green-300" />
              <p className="text-sm text-green-100">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <AlertCircle size={18} className="mt-0.5 text-red-300" />
              <p className="text-sm text-red-100">{errorMessage}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-8">
              <Loader2 className="animate-spin text-indigo-300" size={28} />
              <p className="text-sm text-white/60">
                Loading profile and resume data...
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Full Name
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                      placeholder="Enter full name"
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-300">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                      type="text"
                      value={form.email}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                      placeholder="Enter email"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-300">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                      type="text"
                      value={form.mobile}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, mobile: e.target.value }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                      placeholder="Enter 10-digit mobile"
                    />
                  </div>
                  {errors.mobile && (
                    <p className="mt-2 text-sm text-red-300">{errors.mobile}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Qualification
                  </label>
                  <div className="relative">
                    <GraduationCap
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                    />
                    <input
                      type="text"
                      value={form.qualification}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          qualification: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                      placeholder="Enter qualification"
                    />
                  </div>
                  {errors.qualification && (
                    <p className="mt-2 text-sm text-red-300">
                      {errors.qualification}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Nationality
                </label>
                <div className="relative">
                  <Flag
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                  />
                  <input
                    type="text"
                    value={form.nationality}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        nationality: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-white outline-none focus:border-indigo-400"
                    placeholder="Enter nationality"
                  />
                </div>
                {errors.nationality && (
                  <p className="mt-2 text-sm text-red-300">
                    {errors.nationality}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-3 text-base font-semibold">Resume Selection</h3>

                <div className="mb-4 flex flex-col gap-4 text-sm sm:flex-row">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={resumeOption === "website"}
                      onChange={() => setResumeOption("website")}
                    />
                    Use Website Resume
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={resumeOption === "upload"}
                      onChange={() => setResumeOption("upload")}
                    />
                    Upload Resume
                  </label>
                </div>

                {resumeOption === "website" && (
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    {websiteResume ? (
                      <div className="flex items-start gap-3">
                        <FileText size={18} className="mt-0.5 text-indigo-300" />
                        <div>
                          <p className="font-medium text-white/90">
                            {websiteResume.fileName ||
                              websiteResume.versionName ||
                              websiteResume.resumeName ||
                              "Saved Resume"}
                          </p>
                          <p className="mt-1 text-sm text-white/55">
                            Using resume stored in your backend Resume Management
                            System
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-white/55">
                        No website resume found.
                      </p>
                    )}
                  </div>
                )}

                {resumeOption === "upload" && (
                  <div className="space-y-3">
                    <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-black/20 p-4 transition hover:bg-white/5">
                      <Upload size={18} />
                      Choose Resume File
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) =>
                          setUploadedResume(e.target.files?.[0] || null)
                        }
                        className="hidden"
                      />
                    </label>

                    {uploadedResume && (
                      <p className="text-sm text-white/75">📄 {uploadedResume.name}</p>
                    )}
                  </div>
                )}

                {errors.resume && (
                  <p className="mt-3 text-sm text-red-300">{errors.resume}</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col justify-end gap-3 border-t border-white/10 bg-white/5 p-6 sm:flex-row">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-50 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-green-500 to-blue-600 px-5 py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Briefcase size={18} />
                Submit Application
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}