"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  AlertCircle,
  Briefcase,
  Plus,
  RefreshCw,
  Globe2,
  X,
} from "lucide-react";

const JOB_ROLES = ["HR", "Document Verification"];
const JOB_TYPES = ["Work from home", "Work from office", "Hybrid"];
const COMPANY_TYPES = [
  "Startup",
  "SME",
  "Enterprise",
  "Government",
  "Educational",
  "Non-profit",
  "Consulting",
];
const SUGGESTED_SKILLS = [
  "Recruitment",
  "Employee Engagement",
  "Performance Management",
  "Talent Acquisition",
  "Payroll Processing",
  "Training & Development",
  "HRIS",
  "Labor Laws",
  "Conflict Resolution",
  "Onboarding",
  "Compensation & Benefits",
  "Workforce Planning",
  "Organizational Development",
  "Data Analysis",
  "Project Management",
  "Leadership",
  "Communication",
];

/* ================= TYPES ================= */

interface BackendEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
  payload?: T;
  result?: T;
}

interface AuthMeLike {
  role?: string;
  userRole?: string;
  roles?: string[];
  name?: string;
}

interface Job {
  id: number | string;
  title: string;
  jobRole?: string;
  company?: string;
  companyName?: string;
  companyType?: string;
  domain?: string;
  type?: string;
  location: string;
  description: string;
  salary?: string;
  salaryRangeMin?: string;
  salaryRangeMax?: string;
  officeLocation?: string;
  startDateType?: string;
  joinByDate?: string;
  educationQualification?: string;
  skillsRequired?: string;
  whoCanApply?: string;
  status: string;
  lastDateToApply?: string;
  createdAt?: string;
}

/* ================= HELPERS ================= */

const ROLE_TOKEN_KEYS: Record<string, string> = {
  USER: "userToken",
  ADMIN: "adminToken",
  COMPANY: "companyToken",
  OWNER: "ownerToken",
};

function unwrap<T>(value: BackendEnvelope<T> | T | null | undefined): T | null {
  if (!value || typeof value !== "object") return null;
  const v = value as BackendEnvelope<T> & T;
  return v.data ?? v.payload ?? v.result ?? (v as T);
}

function getToken() {
  if (typeof window === "undefined") return "";

  const role = (localStorage.getItem("userRole") || localStorage.getItem("role") || "")
    .toUpperCase()
    .replace("ROLE_", "");

  const roleToken = role ? localStorage.getItem(ROLE_TOKEN_KEYS[role] || "") : null;

  return (
    roleToken ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("userToken") ||
    localStorage.getItem("companyToken") ||
    localStorage.getItem("ownerToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwtToken") ||
    ""
  );
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  [
    "token",
    "authToken",
    "accessToken",
    "jwtToken",
    "adminToken",
    "userToken",
    "companyToken",
    "ownerToken",
    "role",
    "userRole",
    "userId",
    "adminId",
    "id",
    "authId",
    "email",
    "name",
    "fullName",
  ].forEach((key) => localStorage.removeItem(key));
}

function normalizeRole(role?: string) {
  return (role || "").toUpperCase().replace("ROLE_", "");
}

/* ================= PAGE ================= */

export default function AdminJobsPage() {
  const router = useRouter();

  const backendBaseUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
  }, []);

  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [editingJob, setEditingJob] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [geoMessage, setGeoMessage] = useState<string>("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const [form, setForm] = useState({
    jobRole: "HR",
    title: "",
    companyName: "",
    location: "",
    companyType: "Startup",
    jobType: "Work from home",
    salary: "",
    salaryRangeEnabled: false,
    salaryRangeMin: "",
    salaryRangeMax: "",
    officeLocation: "",
    startDateType: "IMMEDIATE",
    joinByDate: "",
    lastDateToApply: "",
    educationQualification: "",
    skillsRequired: "",
    whoCanApply: "",
    description: "",
  });

  const resetForm = useCallback(() => {
    setForm({
      jobRole: "HR",
      title: "",
      companyName: "",
      location: "",
      companyType: "Startup",
      jobType: "Work from home",
      salary: "",
      salaryRangeEnabled: false,
      salaryRangeMin: "",
      salaryRangeMax: "",
      officeLocation: "",
      startDateType: "IMMEDIATE",
      joinByDate: "",
      lastDateToApply: "",
      educationQualification: "",
      skillsRequired: "",
      whoCanApply: "",
      description: "",
    });
    setSelectedSkills([]);
    setSkillInput("");
  }, []);

  const closeCreateModal = useCallback(() => {
    setShowCreate(false);
    setEditingJob(false);
    resetForm();
    setGeoMessage("");
    setIsDetectingLocation(false);
  }, [resetForm]);

  const closeJobDetailsModal = useCallback(() => {
    setShowJobDetails(false);
    setSelectedJob(null);
  }, []);

  const detectCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      setGeoMessage("Geolocation is not supported by this browser.");
      return;
    }

    setIsDetectingLocation(true);
    setGeoMessage("Detecting current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGeoMessage("Location detected.");
        setForm((prev) => ({
          ...prev,
          officeLocation: `Current location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
        }));
        setIsDetectingLocation(false);
      },
      () => {
        setGeoMessage("Unable to detect location. Please allow location access.");
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (!showCreate && !showJobDetails) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showCreate) {
          closeCreateModal();
        } else if (showJobDetails) {
          closeJobDetailsModal();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCreate, showJobDetails, closeCreateModal, closeJobDetailsModal]);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;

    setSelectedSkills((current) => {
      if (current.includes(trimmed)) return current;
      const next = [...current, trimmed];
      setForm((prev) => ({ ...prev, skillsRequired: next.join(", ") }));
      return next;
    });
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills((current) => {
      const next = current.filter((item) => item !== skill);
      setForm((prev) => ({ ...prev, skillsRequired: next.join(", ") }));
      return next;
    });
  };

  const handleSkillKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSkill(skillInput);
    }
  };

  const filteredSuggestions = SUGGESTED_SKILLS.filter(
    (skill) => !selectedSkills.includes(skill)
  );

  /* ================= AUTH ================= */

  const validateAdmin = useCallback(async () => {
    const token = getToken();

    if (!token) {
      router.replace("/auth/login");
      return null;
    }

    try {
      const res = await fetch(`${backendBaseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = unwrap<AuthMeLike>(await res.json());

      if (!res.ok || !data) throw new Error();

      const role = normalizeRole(
        data.userRole ?? data.role ?? data.roles?.[0]
      );

      if (role !== "ADMIN") {
        router.replace("/user");
        return null;
      }

      return token;
    } catch {
      clearStoredAuth();
      router.replace("/auth/login");
      return null;
    } finally {
      setAuthChecking(false);
    }
  }, [backendBaseUrl, router]);

  /* ================= FETCH JOBS ================= */

  const loadJobs = useCallback(async (token: string) => {
    setLoading(true);
    setError("");

    try {
      /**
       * Expected endpoint:
       * GET /api/admin/jobs
       */
      const res = await fetch(`${backendBaseUrl}/api/admin/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error();

      const payload = unwrap<Job[]>(await res.json());

      setJobs(payload || []);
    } catch {
      setJobs([]);
      setError("Failed to load jobs from backend.");
    } finally {
      setLoading(false);
    }
  }, [backendBaseUrl]);

  /* ================= CREATE JOB ================= */

  const createJob = async () => {
    const token = getToken();

    try {
      const endpoint = editingJob && selectedJob
        ? `${backendBaseUrl}/api/admin/jobs/${selectedJob.id}`
        : `${backendBaseUrl}/api/admin/jobs`;
      const method = editingJob ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      setShowCreate(false);
      setEditingJob(false);
      resetForm();
      setGeoMessage("");
      setIsDetectingLocation(false);
      setSelectedJob(null);

      await loadJobs(token);
    } catch {
      setError(editingJob ? "Failed to update job." : "Failed to create job.");
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const token = await validateAdmin();
      if (!token || cancelled) return;

      await loadJobs(token);
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [validateAdmin, loadJobs]);

  const deleteJob = async (jobId: number | string) => {
    const token = getToken();
    if (!token) return;

    if (!window.confirm("Delete this job post? This cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`${backendBaseUrl}/api/admin/jobs/${jobId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error();
      closeJobDetailsModal();
      await loadJobs(token);
    } catch {
      setError("Failed to delete job.");
    }
  };

  const handleRefresh = async () => {
    const token = getToken();
    if (!token) return;
    await loadJobs(token);
  };

  const openJobDetails = (job: Job) => {
    setSelectedJob(job);
    setShowJobDetails(true);
  };

  const openEditJob = (job: Job) => {
    setEditingJob(true);
    setShowCreate(true);
    setShowJobDetails(false);
    setSelectedJob(job);
    setForm({
      jobRole: job.jobRole || "HR",
      title: job.title || "",
      companyName: job.company || job.companyName || "",
      location: job.location || "",
      companyType: job.companyType || "Startup",
      jobType: job.type || "Work from home",
      salary: job.salary || "",
      salaryRangeEnabled: Boolean(job.salaryRangeMin || job.salaryRangeMax),
      salaryRangeMin: job.salaryRangeMin || "",
      salaryRangeMax: job.salaryRangeMax || "",
      officeLocation: job.officeLocation || "",
      startDateType: job.startDateType || "IMMEDIATE",
      joinByDate: job.joinByDate || "",
      lastDateToApply: job.lastDateToApply || "",
      educationQualification: job.educationQualification || "",
      skillsRequired: job.skillsRequired || "",
      whoCanApply: job.whoCanApply || "",
      description: job.description || "",
    });
    setSelectedSkills(
      (job.skillsRequired || "")
        .split(",")
        .map((segment) => segment.trim())
        .filter(Boolean)
    );
  };

  const visibleJobs = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return jobs.filter((job) => {
      if (!job.lastDateToApply) return true;
      const deadline = new Date(job.lastDateToApply);
      deadline.setHours(0, 0, 0, 0);
      return deadline >= now;
    });
  }, [jobs]);

  /* ================= LOADING ================= */

  if (authChecking || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold">Jobs Management</h1>
          <p className="text-white/60 mt-2">
            Manage job postings and backend-driven hiring workflows.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-white/10 rounded-xl flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-indigo-600 rounded-xl flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Job
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 text-red-400 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* JOB LIST */}
      {visibleJobs.length === 0 ? (
        <div className="text-center text-white/60 mt-20">
          No active jobs available.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {visibleJobs.map((job) => (
            <button
              key={job.id}
              type="button"
              onClick={() => openJobDetails(job)}
              className="text-left p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-sm transition hover:border-slate-600 hover:bg-slate-900/95"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  <Briefcase className="h-3.5 w-3.5" />
                  {job.jobRole || "Role not set"}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{job.title || "Untitled Job"}</h2>
                  <p className="mt-1 text-sm text-white/60">
                    {job.company || job.companyName || "Unknown company"}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                Click to view full details
              </div>
            </button>
          ))}
        </div>
      )}

      {showJobDetails && selectedJob ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xl p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeJobDetailsModal();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden overflow-y-auto rounded-4xl border border-white/10 bg-slate-950/95 p-8 shadow-2xl shadow-black/40">
            <button
              type="button"
              onClick={closeJobDetailsModal}
              aria-label="Close job details"
              className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-3 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>

            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-cyan-300">
              {selectedJob.jobRole || "Role not set"}
            </p>
            <h2 className="mb-2 text-3xl font-bold text-white">{selectedJob.title || "Untitled Job"}</h2>
            <p className="mb-4 text-sm text-white/60">
              {selectedJob.company || selectedJob.companyName || "Unknown company"}
            </p>

            <div className="grid gap-3 md:grid-cols-3 text-sm text-white/70">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[0.7rem] uppercase text-white/50">Location</p>
                <p className="mt-2 font-semibold text-white">{selectedJob.location || "Not specified"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[0.7rem] uppercase text-white/50">Type</p>
                <p className="mt-2 font-semibold text-white">{selectedJob.type || "Not specified"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[0.7rem] uppercase text-white/50">Status</p>
                <p className="mt-2 font-semibold text-white">{selectedJob.status || "Open"}</p>
              </div>
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

              {selectedJob.companyType ? (
                <div>
                  <p className="text-white/50">Company Type</p>
                  <p className="font-medium text-white">{selectedJob.companyType}</p>
                </div>
              ) : null}

              {selectedJob.domain ? (
                <div>
                  <p className="text-white/50">Domain</p>
                  <p className="font-medium text-white">{selectedJob.domain}</p>
                </div>
              ) : null}

              {selectedJob.lastDateToApply ? (
                <div>
                  <p className="text-white/50">Last Date to Apply</p>
                  <p className="font-medium text-white">{selectedJob.lastDateToApply}</p>
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => selectedJob && openEditJob(selectedJob)}
                className="inline-flex items-center justify-center rounded-2xl border border-indigo-300 bg-indigo-600 px-6 py-3 text-white transition hover:bg-indigo-500"
              >
                Edit Job
              </button>
              <button
                type="button"
                onClick={() => selectedJob && deleteJob(selectedJob.id)}
                className="inline-flex items-center justify-center rounded-2xl border border-rose-500 bg-rose-600 px-6 py-3 text-white transition hover:bg-rose-500"
              >
                Delete Job
              </button>
              <button
                type="button"
                onClick={closeJobDetailsModal}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-white transition hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* CREATE JOB MODAL */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xl px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateModal();
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-3xl max-h-[calc(100vh-4rem)] overflow-hidden overflow-y-auto rounded-4xl border border-slate-200/10 bg-slate-950/95 p-8 shadow-2xl shadow-slate-950/40">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  {editingJob ? "Edit Job" : "Create New Job"}
                </p>
                <h2 className="mt-3 text-3xl font-bold text-white">
                  {editingJob ? "Edit Job" : "Create Job"}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {editingJob
                    ? "Update the selected job posting details."
                    : "Add a new job posting with a clean and professional form."}
                </p>
              </div>
              <button
                onClick={closeCreateModal}
                aria-label="Close create job modal"
                className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-200">
                  <span>Job Role</span>
                  <select
                    value={form.jobRole}
                    onChange={(e) => setForm({ ...form, jobRole: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                  >
                    {JOB_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-slate-200">
                  <span>Type of Job</span>
                  <select
                    value={form.jobType}
                    onChange={(e) => setForm({ ...form, jobType: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                  >
                    {JOB_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-2 text-sm text-slate-200">
                <span>Job Description</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                  placeholder="Describe the hiring requirements, responsibilities, and skills."
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-200">
                  <span>Office Location</span>
                  <input
                    value={form.officeLocation}
                    onChange={(e) => setForm({ ...form, officeLocation: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                    placeholder="City, State"
                  />
                  <button
                    type="button"
                    onClick={detectCurrentLocation}
                    disabled={isDetectingLocation}
                    className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Globe2 className="h-4 w-4" />
                    {isDetectingLocation ? "Detecting current location" : "Use current location"}
                  </button>
                  {geoMessage ? (
                    <p className="mt-2 text-xs text-slate-400">{geoMessage}</p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Open location access to prefill the office location.
                    </p>
                  )}
                </label>

                <label className="space-y-2 text-sm text-slate-200">
                  <span>Salary</span>
                  <input
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                    placeholder="e.g. 15000"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.salaryRangeEnabled}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      salaryRangeEnabled: e.target.checked,
                      salaryRangeMin: e.target.checked ? prev.salaryRangeMin : "",
                      salaryRangeMax: e.target.checked ? prev.salaryRangeMax : "",
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-indigo-500"
                />
                Select Salary range
              </label>

              {form.salaryRangeEnabled ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-200">
                    <span>Minimum Salary</span>
                    <input
                      type="number"
                      min={1000}
                      max={50000}
                      value={form.salaryRangeMin}
                      onChange={(e) =>
                        setForm({ ...form, salaryRangeMin: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-200">
                    <span>Maximum Salary</span>
                    <input
                      type="number"
                      min={1000}
                      max={50000}
                      value={form.salaryRangeMax}
                      onChange={(e) =>
                        setForm({ ...form, salaryRangeMax: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                    />
                  </label>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-200">
                  <span>Company Type</span>
                  <select
                    value={form.companyType}
                    onChange={(e) => setForm({ ...form, companyType: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                  >
                    {COMPANY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm text-slate-200">
                  <span>Starting Date</span>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          startDateType: "IMMEDIATE",
                          joinByDate: "",
                        }))
                      }
                      className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                        form.startDateType === "IMMEDIATE"
                          ? "border-indigo-500 bg-indigo-500/20 text-white"
                          : "border-slate-700 bg-slate-900 text-slate-300"
                      }`}
                    >
                      Immediate
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, startDateType: "JOIN_BY" }))}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm ${
                        form.startDateType === "JOIN_BY"
                          ? "border-indigo-500 bg-indigo-500/20 text-white"
                          : "border-slate-700 bg-slate-900 text-slate-300"
                      }`}
                    >
                      Join By
                    </button>
                  </div>
                </label>

                {form.startDateType === "JOIN_BY" ? (
                  <label className="space-y-2 text-sm text-slate-200">
                    <span>Join By Date</span>
                    <input
                      type="date"
                      value={form.joinByDate}
                      min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                      onChange={(e) => setForm({ ...form, joinByDate: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                    />
                  </label>
                ) : null}
              </div>

              <label className="space-y-2 text-sm text-slate-200">
                <span>Last Date to Apply</span>
                <input
                  type="date"
                  value={form.lastDateToApply}
                  onChange={(e) => setForm({ ...form, lastDateToApply: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                />
              </label>

              <label className="space-y-2 text-sm text-slate-200">
                <span>Education Qualification</span>
                <input
                  type="text"
                  value={form.educationQualification}
                  onChange={(e) =>
                    setForm({ ...form, educationQualification: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                  placeholder="e.g. Bachelors, Masters, MBA"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-200">
                <span>Skills Required</span>
                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-white/5 px-3 py-1 text-xs text-white"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleSkillKeyDown}
                      placeholder="Add a skill and press Enter"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => addSkill(skillInput)}
                      className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
                    >
                      Add Skill
                    </button>
                  </div>
                  {filteredSuggestions.length > 0 ? (
                    <div className="mt-3 grid gap-2 text-xs text-slate-300">
                      <div className="font-semibold text-slate-100">Suggested skills</div>
                      <div className="flex flex-wrap gap-2">
                        {filteredSuggestions.slice(0, 8).map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => addSkill(skill)}
                            className="rounded-full border border-slate-700 bg-white/5 px-3 py-1 text-slate-200 hover:bg-white/10"
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </label>

              <label className="space-y-2 text-sm text-slate-200">
                <span>Who can Apply</span>
                <input
                  type="text"
                  value={form.whoCanApply}
                  onChange={(e) => setForm({ ...form, whoCanApply: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
                  placeholder="e.g. Fresher with Bachelors, Masters"
                />
              </label>
            </div>

            <button
              onClick={createJob}
              className="mt-6 w-full py-3 bg-indigo-600 rounded-xl"
            >
              {editingJob ? "Save Changes" : "Create Job"}
            </button>

          </div>
        </div>
      )}
    </div>
  );
}