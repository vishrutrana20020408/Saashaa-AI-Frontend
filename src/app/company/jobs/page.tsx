"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Search, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Clock, 
  Briefcase,
  ExternalLink,
  Loader2,
  Inbox
} from "lucide-react";
import Link from "next/link";

interface Job {
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
}

export default function CompanyJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
      const token = localStorage.getItem("accessToken");
      
      const response = await fetch(`${backendUrl}/api/jobs/company`, {
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

  const filteredJobs = jobs.filter(job => 
    job.hrType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (job.otherHrType && job.otherHrType.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900">Your Job Postings</h1>
            <p className="mt-2 text-slate-500">Manage and track your active recruitment</p>
          </div>

          <Link 
            href="/company/jobs/create" 
            className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Post New Job
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by role or title..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 py-4 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition"
          />
        </div>

        {loading ? (
          <div className="flex min-h-100 flex-col items-center justify-center rounded-3xl bg-white border border-slate-100 shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="mt-4 text-slate-500 font-medium">Loading your jobs...</p>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredJobs.map((job, index) => (
                <motion.div
                  key={job.jobId ?? index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative flex flex-col rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:border-indigo-100 transition-all duration-300"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                      <Briefcase className="h-6 w-6" />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                      job.status === 'OPEN' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {job.status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900">
                    {job.hrType === 'Others' ? job.otherHrType : job.hrType}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-indigo-600">{job.post}</p>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{job.workingType} • {job.officeLocation || 'Remote'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <DollarSign className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{job.salary}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span>Deadline: {new Date(job.lastDateToApply).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-8 flex items-center gap-3 pt-4 border-t border-slate-50">
                    <Link 
                      href={`/company/jobs/${job.jobId}`}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-3 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                    >
                      View Details
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex min-h-100 flex-col items-center justify-center rounded-3xl bg-white border border-slate-100 shadow-sm p-10 text-center">
            <div className="rounded-full bg-slate-50 p-6">
              <Inbox className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-900">No jobs found</h3>
            <p className="mt-2 max-w-xs text-slate-500">
              {searchTerm ? `No jobs matching "${searchTerm}"` : "You haven't posted any jobs yet. Start by creating your first job posting!"}
            </p>
            {!searchTerm && (
              <Link 
                href="/company/jobs/create" 
                className="mt-8 flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5" />
                Post First Job
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
