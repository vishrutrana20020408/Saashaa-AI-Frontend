"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Currency,
  Inbox,
  MapPin,
  Pencil,
  Loader2,
  X,
} from "lucide-react";

interface JobDetail {
  jobId: number;
  post: string;
  hrType: string;
  otherHrType?: string;
  workingType: string;
  officeLocation?: string;
  salary: string;
  lastDateToApply: string;
  status: string;
  createdAt: string;
  startDateType?: string;
  specificStartDate?: string;
  description?: string;
  skillsRequired?: string;
  whoCanApply?: string;
}

const parseSalary = (salary: string) => {
  const currencyMatch = salary.match(/₹\s*([\d,]+)/g);
  const rangeMatch = salary.match(/₹\s*([\d,]+)\s*-\s*₹\s*([\d,]+)/);
  const periodMatch = salary.match(/\/(month|year|day)/i);

  const period = periodMatch?.[1]?.toLowerCase() || "month";

  if (rangeMatch) {
    return {
      salaryMin: rangeMatch[1].replace(/,/g, ""),
      salaryMax: rangeMatch[2].replace(/,/g, ""),
      salaryPeriod: period,
    };
  }

  const minValue = currencyMatch?.[0]?.replace(/₹|,/g, "") || "";
  return {
    salaryMin: minValue,
    salaryMax: minValue,
    salaryPeriod: period,
  };
};

const formatSalaryValue = (min: string, max: string, period: string) => {
  const minVal = Number(min || "0");
  const maxVal = Number(max || "0");
  if (!minVal || !maxVal) return "";
  const formattedMin = minVal.toLocaleString("en-IN");
  const formattedMax = maxVal.toLocaleString("en-IN");
  return `₹${formattedMin} - ₹${formattedMax} /${period}`;
};

export default function CompanyJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    hrType: "",
    otherHrType: "",
    workingType: "",
    officeLocation: "",
    startDateType: "IMMEDIATE",
    specificStartDate: "",
    salaryMin: "",
    salaryMax: "",
    salaryPeriod: "month",
    lastDateToApply: "",
    description: "",
    skillsRequired: "",
    whoCanApply: "",
  });

  useEffect(() => {
    if (!jobId) return;
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    setLoading(true);
    setError("");
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${backendUrl}/api/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to fetch job details");
      }

      const jobData: JobDetail = data.data || data;
      setJob(jobData);
      const salaryParts = parseSalary(jobData.salary || "");
      setFormData({
        hrType: jobData.hrType,
        otherHrType: jobData.otherHrType || "",
        workingType: jobData.workingType,
        officeLocation: jobData.officeLocation || "",
        startDateType: jobData.startDateType || "IMMEDIATE",
        specificStartDate: jobData.specificStartDate || "",
        salaryMin: salaryParts.salaryMin,
        salaryMax: salaryParts.salaryMax,
        salaryPeriod: salaryParts.salaryPeriod,
        lastDateToApply: jobData.lastDateToApply,
        description: jobData.description || "",
        skillsRequired: jobData.skillsRequired || "",
        whoCanApply: jobData.whoCanApply || "",
      });
    } catch (err: any) {
      setError(err?.message || "Failed to load job details.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === "salaryMin" || name === "salaryMax") {
      nextValue = nextValue.replace(/\D/g, "");
    }
    setFormData(prev => ({ ...prev, [name]: nextValue }));
  };

  const handleSave = async () => {
    if (!job) return;
    setSaving(true);
    setError("");
    setMessage("");

    const salaryMin = formData.salaryMin.trim();
    const salaryMax = formData.salaryMax.trim();

    if (!salaryMin || !salaryMax) {
      setError("Please provide both minimum and maximum salary values.");
      setSaving(false);
      return;
    }

    try {
      const salary = formatSalaryValue(salaryMin, salaryMax, formData.salaryPeriod);
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${backendUrl}/api/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          salary,
          specificStartDate: formData.specificStartDate || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update job.");
      }
      setMessage("Job updated successfully.");
      setEditing(false);
      fetchJob();
    } catch (err: any) {
      setError(err?.message || "Failed to update job.");
    } finally {
      setSaving(false);
    }
  };

  const renderField = (label: string, value: string, name: string, disabled = true, type: string = "text", placeholder = "") => (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        disabled={!editing}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
      />
    </div>
  );

  const renderTextArea = (label: string, value: string, name: string, disabled = true, placeholder = "") => (
    <div className="md:col-span-2">
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={handleChange}
        disabled={!editing}
        rows={4}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
      />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex min-h-100 flex-col items-center justify-center rounded-3xl bg-white border border-slate-100 shadow-sm p-10">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="mt-4 text-slate-500">Loading job details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-white p-10 shadow-sm border border-slate-100 text-center">
            <p className="text-xl font-semibold text-slate-900">Job not found.</p>
            <p className="mt-3 text-slate-500">The job you are looking for does not exist or may have been removed.</p>
            <Link href="/company/jobs" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-indigo-700">
              <ArrowLeft className="h-4 w-4" /> Back to jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Job Details</h1>
            <p className="mt-2 text-slate-500">Review and update your posting.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/company/jobs"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back to jobs
            </Link>
            <Link
              href={`/company/jobs/${job.jobId}/applications`}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition"
            >
              <Inbox className="h-4 w-4" /> Applications
            </Link>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100"
        >
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            {renderField("Job Role", job.post, "post", true)}
            {renderField("Status", job.status, "status", true)}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {renderField("HR Type", job.hrType === "Others" ? job.otherHrType || "Others" : job.hrType, "hrType", true)}
            {renderField("Working Type", job.workingType, "workingType", editing)}
            {renderField("Office Location", job.officeLocation || "Remote", "officeLocation", editing)}
            {renderField("Deadline to Apply", formData.lastDateToApply, "lastDateToApply", editing, "date")}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Salary range (Rs)</label>
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px]">
                <div className="relative">
                  <Currency className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    name="salaryMin"
                    value={formData.salaryMin}
                    onChange={handleChange}
                    disabled={!editing}
                    min={0}
                    placeholder="Min"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                  />
                </div>
                <div className="relative">
                  <Currency className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    name="salaryMax"
                    value={formData.salaryMax}
                    onChange={handleChange}
                    disabled={!editing}
                    min={0}
                    placeholder="Max"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                  />
                </div>
                <div>
                  <label className="sr-only" htmlFor="salaryPeriod">Period</label>
                  <select
                    id="salaryPeriod"
                    name="salaryPeriod"
                    value={formData.salaryPeriod}
                    disabled={!editing}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                  >
                    <option value="month">/month</option>
                    <option value="year">/year</option>
                    <option value="day">/day</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {renderField("Start Date Type", job.startDateType || "IMMEDIATE", "startDateType", true)}
            {job.startDateType === "SPECIFIC_DATE" && renderField("Specific Start Date", formData.specificStartDate, "specificStartDate", editing, "date")}
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {renderField("Who Can Apply", formData.whoCanApply, "whoCanApply", editing)}
            {renderField("Skills Required", formData.skillsRequired, "skillsRequired", editing)}
          </div>

          <div className="mt-6">
            {renderTextArea("Job Description", formData.description, "description", editing)}
          </div>

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
          {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}

          <div className="mt-8 flex flex-wrap gap-3">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (job) {
                      const salaryParts = parseSalary(job.salary || "");
                      setFormData(prev => ({
                        ...prev,
                        hrType: job.hrType,
                        otherHrType: job.otherHrType || "",
                        workingType: job.workingType,
                        officeLocation: job.officeLocation || "",
                        startDateType: job.startDateType || "IMMEDIATE",
                        specificStartDate: job.specificStartDate || "",
                        salaryMin: salaryParts.salaryMin,
                        salaryMax: salaryParts.salaryMax,
                        salaryPeriod: salaryParts.salaryPeriod,
                        lastDateToApply: job.lastDateToApply,
                        description: job.description || "",
                        skillsRequired: job.skillsRequired || "",
                        whoCanApply: job.whoCanApply || "",
                      }));
                    }
                    setEditing(false);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                <Pencil className="h-4 w-4" /> Edit Job
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

