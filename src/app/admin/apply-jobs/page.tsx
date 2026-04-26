"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Clock, 
  Briefcase,
  Loader2,
  X,
  Building2,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from "lucide-react";

interface Job {
  jobId: number;
  post: string;
  hrType: string;
  otherHrType?: string;
  workingType: string;
  officeLocation?: string;
  salary: string;
  lastDateToApply: string;
  description: string;
  skillsRequired: string;
  whoCanApply: string;
  company: {
    companyName: string;
  };
}

export default function AdminApplyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applying, setApplying] = useState(false);
  const [resumeType, setResumeType] = useState<"WEBSITE" | "UPLOADED">("WEBSITE");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState("");

  useEffect(() => {
    fetchActiveJobs();
  }, []);

  const fetchActiveJobs = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
      const token = localStorage.getItem("accessToken");
      
      const response = await fetch(`${backendUrl}/api/jobs/admin`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedJob) return;
    setApplying(true);
    setApplyError("");

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
      const token = localStorage.getItem("accessToken");

      let resumeFileId = null;
      if (resumeType === "UPLOADED" && uploadFile) {
        // Here you would normally upload the file first to get an ID
        // For this implementation, let's assume a mock ID if a file is present
        // In a real scenario, you'd call an upload endpoint first
        resumeFileId = "mock-file-id"; 
      }

      const response = await fetch(`${backendUrl}/api/internal-job-applications/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId: selectedJob.jobId,
          resumeType,
          resumeFileId
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to apply");

      setApplySuccess(true);
      setTimeout(() => {
        setSelectedJob(null);
        setApplySuccess(false);
      }, 2000);
    } catch (err: any) {
      setApplyError(err.message);
    } finally {
      setApplying(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.hrType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900">Apply for Jobs</h1>
          <p className="mt-2 text-slate-500 text-lg">Browse HR opportunities from top companies</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-12 max-w-2xl">
          <Search className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by role or company..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-3xl border-none bg-white pl-14 pr-6 py-5 text-lg text-slate-900 shadow-xl shadow-slate-200/50 outline-none focus:ring-4 focus:ring-indigo-500/10 transition"
          />
        </div>

        {loading ? (
          <div className="flex min-h-100 flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <p className="mt-4 text-slate-500 font-medium">Fetching available jobs...</p>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <motion.div
                key={job.jobId}
                layoutId={`job-${job.jobId}`}
                onClick={() => setSelectedJob(job)}
                className="group cursor-pointer rounded-3xl bg-white p-7 shadow-sm border border-slate-100 hover:shadow-2xl hover:shadow-indigo-200/30 hover:border-indigo-100 transition-all duration-300"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div className="rounded-2xl bg-indigo-50 p-4 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {job.workingType}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {job.hrType === 'Others' ? job.otherHrType : job.hrType}
                </h3>
                <p className="mt-2 text-lg font-semibold text-slate-600">{job.company.companyName}</p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{job.officeLocation || 'Remote'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-bold text-slate-900">{job.salary}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span>Apply by {new Date(job.lastDateToApply).toLocaleDateString()}</span>
                  </div>
                  <div className="text-indigo-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    View & Apply
                    <ExternalLink className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-100 flex-col items-center justify-center text-center p-10">
            <h3 className="text-2xl font-bold text-slate-900">No active jobs found</h3>
            <p className="mt-2 text-slate-500 text-lg">Check back later for new HR opportunities.</p>
          </div>
        )}

        {/* Job Details & Apply Modal */}
        <AnimatePresence>
          {selectedJob && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !applying && setSelectedJob(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                layoutId={`job-${selectedJob.jobId}`}
                className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-8 md:p-12 shadow-2xl"
              >
                <button 
                  onClick={() => !applying && setSelectedJob(null)}
                  className="absolute right-6 top-6 rounded-full p-2 hover:bg-slate-100 transition"
                >
                  <X className="h-6 w-6 text-slate-400" />
                </button>

                <div className="mb-10">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="rounded-2xl bg-indigo-600 p-4 text-white">
                      <Building2 className="h-10 w-10" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-slate-900">
                        {selectedJob.hrType === 'Others' ? selectedJob.otherHrType : selectedJob.hrType}
                      </h2>
                      <p className="text-xl font-bold text-indigo-600">{selectedJob.company.companyName}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6 rounded-2xl bg-slate-50 p-6">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-indigo-500" />
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">Location</p>
                        <p className="text-slate-500">{selectedJob.workingType} • {selectedJob.officeLocation || 'Remote'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-indigo-500" />
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">Salary</p>
                        <p className="text-slate-500">{selectedJob.salary}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-indigo-500" />
                      <div className="text-sm">
                        <p className="font-bold text-slate-900">Apply By</p>
                        <p className="text-slate-500">{new Date(selectedJob.lastDateToApply).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                  <section>
                    <h4 className="mb-4 text-xl font-black text-slate-900 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-500" />
                      About the Job
                    </h4>
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-600 text-lg">{selectedJob.description}</p>
                  </section>

                  <section>
                    <h4 className="mb-4 text-xl font-black text-slate-900 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-500" />
                      Skills Required
                    </h4>
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-600 text-lg">{selectedJob.skillsRequired}</p>
                  </section>

                  <section>
                    <h4 className="mb-4 text-xl font-black text-slate-900 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-500" />
                      Who can apply
                    </h4>
                    <p className="whitespace-pre-wrap leading-relaxed text-slate-600 text-lg">{selectedJob.whoCanApply}</p>
                  </section>

                  <div className="rounded-3xl border-2 border-indigo-100 bg-indigo-50/30 p-8">
                    <h4 className="mb-6 text-xl font-black text-slate-900">Complete Application</h4>
                    
                    <div className="mb-8 grid gap-4 sm:grid-cols-2">
                      <button 
                        onClick={() => setResumeType("WEBSITE")}
                        className={`flex items-center gap-4 rounded-2xl border-2 p-5 transition-all ${
                          resumeType === "WEBSITE" 
                          ? "border-indigo-600 bg-white shadow-lg shadow-indigo-200/50" 
                          : "border-slate-100 bg-white hover:border-indigo-200"
                        }`}
                      >
                        <div className={`rounded-xl p-3 ${resumeType === "WEBSITE" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                          <FileText className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-900">Website Resume</p>
                          <p className="text-xs text-slate-500">Use your platform profile</p>
                        </div>
                      </button>

                      <button 
                        onClick={() => setResumeType("UPLOADED")}
                        className={`flex items-center gap-4 rounded-2xl border-2 p-5 transition-all ${
                          resumeType === "UPLOADED" 
                          ? "border-indigo-600 bg-white shadow-lg shadow-indigo-200/50" 
                          : "border-slate-100 bg-white hover:border-indigo-200"
                        }`}
                      >
                        <div className={`rounded-xl p-3 ${resumeType === "UPLOADED" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                          <Upload className="h-6 w-6" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-900">Upload Resume</p>
                          <p className="text-xs text-slate-500">Submit a PDF/Doc file</p>
                        </div>
                      </button>
                    </div>

                    {resumeType === "UPLOADED" && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mb-8"
                      >
                        <div className="relative flex min-h-30 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 transition hover:border-indigo-400">
                          <input 
                            type="file" 
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 cursor-pointer opacity-0"
                          />
                          <div className="text-center">
                            <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                            <p className="text-sm font-bold text-slate-600">
                              {uploadFile ? uploadFile.name : "Drop your resume here or click to browse"}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX up to 5MB</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {applyError && (
                      <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                        <AlertCircle className="h-4 w-4" />
                        {applyError}
                      </div>
                    )}

                    {applySuccess ? (
                      <div className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 p-5 text-white shadow-lg shadow-emerald-200">
                        <CheckCircle2 className="h-6 w-6" />
                        <span className="text-lg font-black tracking-tight">APPLICATION SUBMITTED!</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleApply}
                        disabled={applying || (resumeType === "UPLOADED" && !uploadFile)}
                        className="w-full rounded-2xl bg-indigo-600 py-5 text-xl font-black text-white shadow-xl shadow-indigo-200 transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {applying ? (
                          <div className="flex items-center justify-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            SUBMITTING...
                          </div>
                        ) : (
                          "APPLY NOW"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
