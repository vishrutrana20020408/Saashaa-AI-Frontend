"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

/**
 * src/app/user/jobs/page.tsx
 *
 * Backend integrated Jobs Page
 *
 * Expected backend endpoints:
 * GET  /api/auth/me
 * GET  /api/user/jobs
 * GET  /api/user/resume/default
 * POST /api/user/jobs/{jobId}/apply
 *
 * This version is written to tolerate small backend response-shape differences
 * and stay aligned with the latest frontend/backend project update.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  me: `${API_BASE_URL}/api/auth/me`,
  getJobs: `${API_BASE_URL}/api/user/jobs`,
  getDefaultResume: `${API_BASE_URL}/api/user/resume/default`,
  applyJob: (jobId: number) => `${API_BASE_URL}/api/user/jobs/${jobId}/apply`,
};

const QUALIFICATIONS = [
  "Bachelor of Arts (BA)",
  "Bachelor of Science (BSc)",
  "Bachelor of Commerce (BCom)",
  "Bachelor of Technology (BTech)",
  "Bachelor of Engineering (BE)",
  "Bachelor of Business Administration (BBA)",
  "Master of Arts (MA)",
  "Master of Science (MSc)",
  "Master of Commerce (MCom)",
  "Master of Technology (MTech)",
  "Master of Business Administration (MBA)",
  "Master of Computer Applications (MCA)",
  "Doctor of Philosophy (PhD)",
];

const EXPERIENCE_OPTIONS = Array.from({ length: 13 }, (_, index) => String(index));

type NullableString = string | null | undefined;

type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  domain: string;
  type: string;
  jobRole?: string;
  description?: string;
  officeLocation?: string;
  salary?: string;
  salaryRange?: string;
  startDateType?: string;
  joinByDate?: string;
  lastDateToApply?: string;
  qualification?: string;
  whoCanApply?: string;
  isRecommended?: boolean;
  alreadyApplied?: boolean;
};

type ResumeInfo = {
  resumeId?: number;
  resumeName?: string;
  fileName?: string;
  fileUrl?: string;
};

type AuthMeData = {
  id?: number | string;
  name?: string;
  firstName?: string;
  fullName?: string;
  email?: string;
  emailAddress?: string;
  phone?: string;
  mobile?: string;
  mobileNumber?: string;
  role?: string;
  userRole?: string;
  roles?: string[];
  authenticated?: boolean;
  valid?: boolean;
};

type ApplyResponseData = {
  applicationId?: number;
  jobId?: number;
  interviewAvailable?: boolean;
  interviewToken?: string;
  token?: string;
  sessionId?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  payload?: T;
  result?: T;
};

type JobsPayload = {
  recommendedJobs?: Job[];
  regularJobs?: Job[];
  jobs?: Job[];
  recommended?: Job[];
  others?: Job[];
};

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null | undefined): T | null {
  if (!json || typeof json !== "object") return null;
  const envelope = json as ApiEnvelope<T> & T;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

const ROLE_TOKEN_KEYS: Record<string, string> = {
  USER: "userToken",
  ADMIN: "adminToken",
  COMPANY: "companyToken",
  OWNER: "ownerToken",
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const role = normalizeRole(
    localStorage.getItem("userRole") || localStorage.getItem("role") || null
  );

  const roleToken = role ? localStorage.getItem(ROLE_TOKEN_KEYS[role] || "") : null;
  if (roleToken) return roleToken;

  const possibleKeys = [
    "userToken",
    "adminToken",
    "companyToken",
    "ownerToken",
    "token",
    "authToken",
    "jwtToken",
    "jwt",
    "accessToken",
  ];

  for (const key of possibleKeys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  return null;
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  [
    "token",
    "authToken",
    "jwtToken",
    "jwt",
    "accessToken",
    "userToken",
    "adminToken",
    "companyToken",
    "ownerToken",
    "userRole",
    "role",
    "userEmail",
    "userName",
    "authId",
    "userOnboardingDone",
    "onboardingDone",
  ].forEach((key) => localStorage.removeItem(key));
}

function normalizeRole(value?: NullableString): string {
  return (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
}

function isUserRole(role?: string, roles?: string[]) {
  const normalizedRole = normalizeRole(role);
  const normalizedRoles = Array.isArray(roles)
    ? roles.map((item) => normalizeRole(item))
    : [];

  return normalizedRole === "USER" || normalizedRoles.includes("USER");
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeRandomToken() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}`;
}

function normalizeResume(raw: unknown): ResumeInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  return {
    resumeId:
      data["resumeId"] != null
        ? normalizeNumber(data["resumeId"])
        : data["id"] != null
        ? normalizeNumber(data["id"])
        : undefined,
    resumeName: normalizeString(data["resumeName"] ?? data["name"]),
    fileName: normalizeString(data["fileName"] ?? data["originalFileName"]),
    fileUrl: normalizeString(data["fileUrl"] ?? data["downloadUrl"]),
  };
}

function normalizeJob(raw: unknown): Job {
  const data = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {};
  const salaryRange =
    normalizeString(data["salaryRange"]) ||
    (data["salaryRangeMin"] || data["salaryRangeMax"]
      ? `${normalizeString(data["salaryRangeMin"])} - ${normalizeString(data["salaryRangeMax"])}`
      : "");

  return {
    id: normalizeNumber(data["id"] ?? data["jobId"]),
    title: normalizeString(data["title"] ?? data["jobTitle"] ?? data["position"], "Untitled Job"),
    company: normalizeString(data["company"] ?? data["companyName"], "Unknown Company"),
    location: normalizeString(data["location"] ?? data["officeLocation"], "Not specified"),
    domain: normalizeString(data["domain"] ?? data["jobDomain"] ?? data["jobCategory"], "General"),
    type: normalizeString(data["type"] ?? data["jobType"] ?? data["employmentType"], "Not specified"),
    description: normalizeString(data["description"] ?? data["jobDescription"]),
    officeLocation: normalizeString(data["officeLocation"]),
    salary: normalizeString(data["salary"]),
    salaryRange,
    startDateType: normalizeString(data["startDateType"]),
    joinByDate: normalizeString(data["joinByDate"] ?? data["specificStartDate"]),
    lastDateToApply: normalizeString(data["lastDateToApply"]),
    qualification: normalizeString(data["qualification"] ?? data["educationQualification"]),
    whoCanApply: normalizeString(data["whoCanApply"]),
    isRecommended: Boolean(data["isRecommended"] ?? data["recommended"]),
    alreadyApplied: Boolean(data["alreadyApplied"] ?? data["applied"]),
  };
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function UserJobsPage() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [regularJobs, setRegularJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);

  const [appliedJobs, setAppliedJobs] = useState<number[]>([]);
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [pageError, setPageError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    qualification: "",
    nationality: "Indian",
    address: "",
    currentLocation: "",
    experienceRequired: false,
    experienceYears: "0",
    previousCompany: "",
    leaveReason: "",
  });
  const [qualificationSearch, setQualificationSearch] = useState("");
  const [locationStatus, setLocationStatus] = useState("Current location not detected.");
  const [detectingLocation, setDetectingLocation] = useState(false);

  const [resumeOption, setResumeOption] = useState<"website" | "upload">("website");
  const [uploadedResume, setUploadedResume] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [websiteResume, setWebsiteResume] = useState<ResumeInfo | null>(null);

  const token = useMemo(() => getAuthToken(), []);

  const validateUserAccess = useCallback(async (): Promise<boolean> => {
    if (!token) {
      clearStoredAuth();
      router.replace("/auth/login");
      return false;
    }

    try {
      const response = await fetch(API_ROUTES.me, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
      });

      const authJson = await response.json().catch(() => null);
      const authData = unwrapResponse<AuthMeData>(authJson);

      if (!response.ok || !authData) {
        throw new Error("Unable to validate session.");
      }

      const authenticated = Boolean(
        authData.authenticated ?? authData.valid ?? response.ok
      );

      if (!authenticated) {
        throw new Error("Session is not valid.");
      }

      if (!isUserRole(authData.userRole ?? authData.role, authData.roles)) {
        router.replace("/admin");
        return false;
      }

      const backendName =
        normalizeString(authData.fullName) ||
        normalizeString(authData.name) ||
        normalizeString(authData.firstName);

      if (backendName) {
        localStorage.setItem("userName", backendName);
      }

      return true;
    } catch {
      clearStoredAuth();
      router.replace("/auth/login");
      return false;
    } finally {
      setAuthChecking(false);
    }
  }, [router, token]);

  const fetchJobsPageData = useCallback(
    async (isRefresh = false) => {
      try {
        setPageError(null);
        setInfoMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const [authRes, jobsRes, resumeRes] = await Promise.all([
          fetch(API_ROUTES.me, {
            method: "GET",
            headers,
            credentials: "include",
            cache: "no-store",
          }),
          fetch(API_ROUTES.getJobs, {
            method: "GET",
            headers,
            credentials: "include",
            cache: "no-store",
          }),
          fetch(API_ROUTES.getDefaultResume, {
            method: "GET",
            headers,
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        if (authRes.ok) {
          const authJson = await authRes.json().catch(() => null);
          const authData = unwrapResponse<AuthMeData>(authJson);

          const backendName =
            normalizeString(authData?.name) ||
            normalizeString(authData?.fullName) ||
            normalizeString(authData?.firstName);

          const backendEmail =
            normalizeString(authData?.email) ||
            normalizeString(authData?.emailAddress);

          const backendPhone =
            normalizeString(authData?.phone) ||
            normalizeString(authData?.mobile) ||
            normalizeString(authData?.mobileNumber);

          setForm((prev) => ({
            ...prev,
            name: prev.name || backendName,
            email: prev.email || backendEmail,
            mobile: prev.mobile || backendPhone,
          }));
        }

        if (!jobsRes.ok) {
          throw new Error(`Failed to fetch jobs. Status: ${jobsRes.status}`);
        }

        const jobsJson = await jobsRes.json().catch(() => null);
        const jobsData = unwrapResponse<JobsPayload>(jobsJson);

        const recommendedRaw = jobsData?.recommendedJobs || jobsData?.recommended || [];
        const regularRaw =
          jobsData?.regularJobs || jobsData?.others || jobsData?.jobs || [];

        let normalizedRecommended = Array.isArray(recommendedRaw)
          ? recommendedRaw.map(normalizeJob).filter((job) => job.id > 0)
          : [];

        let normalizedRegular = Array.isArray(regularRaw)
          ? regularRaw.map(normalizeJob).filter((job) => job.id > 0)
          : [];

        if (
          normalizedRecommended.length === 0 &&
          normalizedRegular.length > 0 &&
          normalizedRegular.some((job) => job.isRecommended)
        ) {
          normalizedRecommended = normalizedRegular.filter((job) => job.isRecommended);
          normalizedRegular = normalizedRegular.filter((job) => !job.isRecommended);
        }

        setRecommendedJobs(normalizedRecommended);
        setRegularJobs(normalizedRegular);

        const appliedIds = [...normalizedRecommended, ...normalizedRegular]
          .filter((job) => job.alreadyApplied)
          .map((job) => job.id);

        setAppliedJobs(appliedIds);
        if (typeof window !== "undefined") {
          localStorage.setItem("hasAppliedJob", String(appliedIds.length > 0));
        }

        if (resumeRes.ok) {
          const resumeJson = await resumeRes.json().catch(() => null);
          const resumeData = unwrapResponse<unknown>(resumeJson);
          setWebsiteResume(normalizeResume(resumeData));
        } else {
          setWebsiteResume(null);
          setInfoMessage(
            "No default resume could be loaded from the backend. You can still upload a resume while applying."
          );
        }
      } catch {
        setPageError("Unable to load jobs and resume data from backend.");
        setRecommendedJobs([]);
        setRegularJobs([]);
        setWebsiteResume(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const allowed = await validateUserAccess();
      if (!allowed || cancelled) return;
      await fetchJobsPageData(false);
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [fetchJobsPageData, validateUserAccess]);

  const validateForm = () => {
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

    if (form.experienceRequired && !EXPERIENCE_OPTIONS.includes(form.experienceYears)) {
      newErrors.experienceYears = "Select experience years";
    }

    if (resumeOption === "website" && !websiteResume) {
      newErrors.resume = "No website resume found. Please upload a resume.";
    }

    if (resumeOption === "upload" && !uploadedResume) {
      newErrors.resume = "Please upload your resume.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApply = async () => {
    if (!selectedJob) return;
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      setPageError(null);

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("email", form.email.trim());
      formData.append("mobile", form.mobile.trim());
      formData.append("qualification", form.qualification.trim());
      formData.append("nationality", form.nationality.trim());
      formData.append("experienceRequired", String(form.experienceRequired));
      formData.append("address", form.address.trim());
      formData.append("currentLocation", form.currentLocation.trim());
      if (form.experienceRequired) {
        formData.append("experienceYears", form.experienceYears);
        formData.append("previousCompany", form.previousCompany.trim());
        formData.append("leaveReason", form.leaveReason.trim());
      }
      formData.append("resumeOption", resumeOption);

      if (resumeOption === "website" && websiteResume?.resumeId) {
        formData.append("resumeId", String(websiteResume.resumeId));
      }

      if (resumeOption === "upload" && uploadedResume) {
        formData.append("resumeFile", uploadedResume);
      }

      const response = await fetch(API_ROUTES.applyJob(selectedJob.id), {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: formData,
      });

      const resultJson = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<unknown>)?.message ||
            `Job apply failed. Status: ${response.status}`
        );
      }

      const resultData = unwrapResponse<ApplyResponseData>(
        resultJson as ApiEnvelope<ApplyResponseData> | null
      );

      setAppliedJobs((prev) =>
        prev.includes(selectedJob.id) ? prev : [...prev, selectedJob.id]
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("hasAppliedJob", "true");
      }

      const currentJobId = selectedJob.id;

      setShowApplyForm(false);
      setUploadedResume(null);
      setSelectedJob(null);
      setErrors({});

      const interviewToken =
        normalizeString(resultData?.interviewToken) ||
        normalizeString(resultData?.token) ||
        safeRandomToken();

      const sessionId =
        resultData?.sessionId != null ? String(resultData.sessionId) : "";

      const message =
        (resultJson as ApiEnvelope<unknown>)?.message ||
        "Job application submitted successfully.";

      setInfoMessage(message);

      const searchParams = new URLSearchParams({
        job: String(currentJobId),
        token: interviewToken,
      });

      if (sessionId) {
        searchParams.set("sessionId", sessionId);
      }

      router.push(`/user/interview?${searchParams.toString()}`);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to submit job application."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecommended = useMemo(() => {
    return recommendedJobs.filter((job) =>
      `${job.title} ${job.company} ${job.jobRole || ""} ${job.location} ${job.domain} ${job.type}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [recommendedJobs, search]);

  const filteredRegular = useMemo(() => {
    return regularJobs.filter((job) =>
      `${job.title} ${job.company} ${job.jobRole || ""} ${job.location} ${job.domain} ${job.type}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [regularJobs, search]);

  const closeModal = useCallback(() => {
    if (submitting) return;
    setShowApplyForm(false);
    setShowJobDetails(false);
    setSelectedJob(null);
    setUploadedResume(null);
    setErrors({});
  }, [submitting]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (submitting) return;
      closeModal();
    };

    if (!showJobDetails && !showApplyForm) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeModal, showApplyForm, showJobDetails, submitting]);

  const openJobDetails = (job: Job) => {
    setSelectedJob(job);
    setShowJobDetails(true);
    setShowApplyForm(false);
    setErrors({});
  };

  const openApplyForm = () => {
    setShowApplyForm(true);
    setErrors({});
  };

  const JobCard = (job: Job, color: string, recommended = false) => (
    <motion.div
      key={job.id}
      role="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      layout
      onClick={() => openJobDetails(job)}
      className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 transition hover:border-slate-600 hover:bg-slate-900/95 cursor-pointer"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              {job.jobRole || "Role not set"}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-white">{job.title || "Untitled Job"}</h3>
          </div>

          {(recommended || job.isRecommended) && (
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/20 px-3 py-1 text-xs text-indigo-300">
              <Sparkles size={12} />
              Recommended
            </span>
          )}
        </div>

        <p className="text-sm text-white/60">Click to view full job details and apply.</p>
      </div>

      {appliedJobs.includes(job.id) ? (
        <button
          onClick={(event) => {
            event.stopPropagation();
            router.push(`/user/interview?job=${job.id}`);
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 transition hover:bg-green-700"
        >
          <CheckCircle2 size={16} />
          Start Interview
        </button>
      ) : (
        <button
          onClick={(event) => {
            event.stopPropagation();
            openJobDetails(job);
          }}
          className={`mt-5 rounded-lg px-4 py-2 transition hover:opacity-90 ${color}`}
        >
          Apply
        </button>
      )}
    </motion.div>
  );

  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-6 text-white md:p-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
            <Loader2 className="animate-spin" size={32} />
            <h2 className="text-2xl font-bold">
              {authChecking ? "Verifying User Access" : "Loading Jobs"}
            </h2>
            <p className="text-white/60">
              {authChecking
                ? "Please wait while your session is validated with the backend."
                : "Fetching jobs and resume data from backend."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
            <ShieldCheck className="h-4 w-4" />
            User Jobs
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="mb-3 text-3xl font-bold">Explore Jobs</h1>
              <p className="text-white/60">
                Browse recommended jobs, apply using your saved resume, and start
                interview preparation through backend-integrated workflows.
              </p>
            </div>

            <button
              onClick={() => fetchJobsPageData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 transition hover:bg-white/15 disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              Refresh
            </button>
          </div>
        </div>

        {pageError ? (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-100">
            <AlertCircle className="mt-0.5" size={18} />
            <span>{pageError}</span>
          </div>
        ) : null}

        {infoMessage ? (
          <div className="mb-8 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-amber-100">
            {infoMessage}
          </div>
        ) : null}

        <div className="relative mb-10">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            placeholder="Search jobs by title, company, location, or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 p-4 pl-12 outline-none focus:border-indigo-400"
          />
        </div>

        <h2 className="mb-6 text-xl font-semibold text-indigo-400">
          ⭐ Recommended For You
        </h2>

        <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filteredRecommended.length > 0 ? (
            <AnimatePresence>
              {filteredRecommended.map((job) => JobCard(job, "bg-indigo-600", true))}
            </AnimatePresence>
          ) : (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-8 text-white/60">
              No recommended jobs found.
            </div>
          )}
        </div>

        <h2 className="mb-6 text-xl font-semibold">💼 Other Opportunities</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filteredRegular.length > 0 ? (
            <AnimatePresence>
              {filteredRegular.map((job) => JobCard(job, "bg-purple-600"))}
            </AnimatePresence>
          ) : (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-8 text-white/60">
              No other jobs found.
            </div>
          )}
        </div>

        {showJobDetails && selectedJob ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xl p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-4xl border border-white/10 bg-slate-950/95 p-8 shadow-2xl shadow-black/40">
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close job details"
                className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-3 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>

              {selectedJob.jobRole ? (
                <p className="mb-2 text-xs uppercase tracking-[0.24em] text-cyan-300">
                  {selectedJob.jobRole}
                </p>
              ) : null}
              <h2 className="mb-2 text-2xl font-bold">{selectedJob.title}</h2>
              <p className="mb-4 text-sm text-white/60">
                {selectedJob.company} • {selectedJob.location}
              </p>

              <div className="grid gap-3 md:grid-cols-3 text-sm text-white/70">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[0.7rem] uppercase text-white/50">Job Type</p>
                  <p className="mt-2 font-semibold text-white">{selectedJob.type}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[0.7rem] uppercase text-white/50">Domain</p>
                  <p className="mt-2 font-semibold text-white">{selectedJob.domain}</p>
                </div>
                {selectedJob.salary ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[0.7rem] uppercase text-white/50">Salary</p>
                    <p className="mt-2 font-semibold text-white">
                      ₹{selectedJob.salary}
                      {selectedJob.salaryRange ? ` • ${selectedJob.salaryRange}` : ""}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 space-y-5 text-sm leading-7 text-white/70">
                {selectedJob.description ? (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-white">Job Description</h3>
                    <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                      {selectedJob.description}
                    </p>
                  </div>
                ) : null}

                {selectedJob.officeLocation ? (
                  <div>
                    <p className="text-white/50">Office Location</p>
                    <p className="font-medium text-white">{selectedJob.officeLocation}</p>
                  </div>
                ) : null}

                {selectedJob.startDateType ? (
                  <div>
                    <p className="text-white/50">Starting</p>
                    <p className="font-medium text-white">
                      {selectedJob.startDateType === "JOIN_BY" && selectedJob.joinByDate
                        ? `Join by ${formatDate(selectedJob.joinByDate)}`
                        : "Immediate"}
                    </p>
                  </div>
                ) : null}

                {selectedJob.lastDateToApply ? (
                  <div>
                    <p className="text-white/50">Last Date to Apply</p>
                    <p className="font-medium text-white">
                      {formatDate(selectedJob.lastDateToApply)}
                    </p>
                  </div>
                ) : null}

                {selectedJob.qualification ? (
                  <div>
                    <p className="text-white/50">Qualification Required</p>
                    <p className="font-medium text-white">{selectedJob.qualification}</p>
                  </div>
                ) : null}

                {selectedJob.whoCanApply ? (
                  <div>
                    <p className="text-white/50">Who Can Apply</p>
                    <p className="font-medium text-white">{selectedJob.whoCanApply}</p>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openApplyForm();
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3 text-white transition hover:bg-indigo-500"
                >
                  Apply Now
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showApplyForm && selectedJob ? (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-4xl border border-white/10 bg-slate-950/95 p-8 shadow-2xl shadow-black/40">
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close application form"
                className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-3 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>

              <h2 className="mb-2 text-2xl font-bold">Apply for {selectedJob.title || "this role"}</h2>
              <p className="mb-4 text-sm text-white/60">
                {(selectedJob.company || "Unknown Company") + " • " + (selectedJob.location || "Location not specified")}
              </p>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-white/80">
                    <span>Name</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-white outline-none"
                    />
                    {errors.name ? <p className="text-sm text-red-400">{errors.name}</p> : null}
                  </label>

                  <label className="space-y-2 text-sm text-white/80">
                    <span>Email</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-white outline-none"
                    />
                    {errors.email ? <p className="text-sm text-red-400">{errors.email}</p> : null}
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-white/80">
                    <span>Mobile Number</span>
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-white outline-none"
                      maxLength={10}
                    />
                    {errors.mobile ? <p className="text-sm text-red-400">{errors.mobile}</p> : null}
                  </label>

                  <label className="space-y-2 text-sm text-white/80">
                    <span>Qualification</span>
                    <input
                      list="qualification-options"
                      value={form.qualification}
                      onChange={(e) => {
                        setForm({ ...form, qualification: e.target.value });
                        setQualificationSearch(e.target.value);
                      }}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-white outline-none"
                      placeholder="Search or pick a qualification"
                    />
                    <datalist id="qualification-options">
                      {QUALIFICATIONS.filter((item) =>
                        item.toLowerCase().includes(qualificationSearch.toLowerCase())
                      ).map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                    {errors.qualification ? <p className="text-sm text-red-400">{errors.qualification}</p> : null}
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-white/80">
                    <span>Address</span>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-white outline-none"
                      placeholder="Enter your full address"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-white/80">
                    <span>Current Location</span>
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!navigator.geolocation) {
                            setLocationStatus("Geolocation is not available in your browser.");
                            return;
                          }

                          setDetectingLocation(true);
                          setLocationStatus("Detecting current location...");

                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              const location = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
                              setForm((prev) => ({ ...prev, currentLocation: location }));
                              setLocationStatus(`Detected current location: ${location}`);
                              setDetectingLocation(false);
                            },
                            (error) => {
                              setLocationStatus(`Unable to detect location: ${error.message}`);
                              setDetectingLocation(false);
                            },
                            { enableHighAccuracy: true, timeout: 10000 }
                          );
                        }}
                        disabled={detectingLocation}
                        className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:opacity-60"
                      >
                        {detectingLocation ? "Detecting..." : "Detect current location"}
                      </button>
                      <p className="text-sm text-white/60">{locationStatus}</p>
                    </div>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-3 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={form.experienceRequired}
                      onChange={(e) => {
                        setForm((prev) => ({
                          ...prev,
                          experienceRequired: e.target.checked,
                          experienceYears: e.target.checked ? prev.experienceYears : "0",
                        }));
                      }}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500"
                    />
                    Experience required
                  </label>

                  <label className="space-y-2 text-sm text-white/80">
                    <span>Nationality</span>
                    <select
                      value={form.nationality}
                      onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-white outline-none"
                    >
                      <option value="Indian">Indian</option>
                    </select>
                    {errors.nationality ? <p className="text-sm text-red-400">{errors.nationality}</p> : null}
                  </label>
                </div>

                {form.experienceRequired ? (
                  <>
                    <label className="space-y-2 text-sm text-white/80">
                      <span>Experience (years)</span>
                      <select
                        value={form.experienceYears}
                        onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-white outline-none"
                      >
                        {EXPERIENCE_OPTIONS.map((value) => (
                          <option key={value} value={value}>
                            {value} years
                          </option>
                        ))}
                      </select>
                      {errors.experienceYears ? (
                        <p className="text-sm text-red-400">{errors.experienceYears}</p>
                      ) : null}
                    </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm text-white/80">
                        <span>Company Name</span>
                        <input
                          type="text"
                          value={form.previousCompany}
                          onChange={(e) => setForm({ ...form, previousCompany: e.target.value })}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-white outline-none"
                        />
                      </label>

                      <label className="space-y-2 text-sm text-white/80">
                        <span>Reason for Leaving</span>
                        <input
                          type="text"
                          value={form.leaveReason}
                          onChange={(e) => setForm({ ...form, leaveReason: e.target.value })}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-white outline-none"
                        />
                      </label>
                    </div>
                  </>
                ) : null}

                <div className="mt-6">
                  <p className="mb-3 text-sm font-semibold text-white">Resume</p>
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row text-sm">
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

                  {resumeOption === "website" ? (
                    <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-4 text-sm text-white/80">
                      {websiteResume ? (
                        <div className="flex items-center gap-3">
                          <FileText size={18} className="text-indigo-300" />
                          <div>
                            <p className="font-medium text-white">
                              {websiteResume.fileName || websiteResume.resumeName || "Saved Resume"}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              Using resume from your resume management profile.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-white/60">
                          No saved resume found on the website.
                        </p>
                      )}
                    </div>
                  ) : null}

                  {resumeOption === "upload" ? (
                    <div className="space-y-3">
                      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-white/70 hover:bg-slate-900">
                        <Upload size={18} />
                        Upload or drop your resume file
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) =>
                            setUploadedResume(e.target.files?.[0] || null)
                          }
                          className="hidden"
                        />
                      </label>
                      {uploadedResume ? (
                        <p className="text-sm text-white/60">📄 {uploadedResume.name}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {errors.resume ? (
                    <p className="mt-2 text-sm text-red-400">{errors.resume}</p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-white transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>Submit Application</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}