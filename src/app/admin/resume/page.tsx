"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  RefreshCw,
  Loader2,
  Download,
  Edit3,
  Save,
  AlertCircle,
  CheckCircle2,
  FileUp,
  Sparkles,
  X,
  Copy,
  Wand2,
  Eye,
  Plus,
  GitBranch,
  CalendarDays,
  Tag,
  User,
  Users,
  Search,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

/**
 * src/app/admin/resume/page.tsx
 *
 * Admin Resume Page - Mirrors User Resume Page + All User Resumes Section
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  // Admin's own resume (using user endpoints which allow ADMIN role)
  getCurrentResume: `${API_BASE_URL}/api/user/resume/current`,
  uploadResume: `${API_BASE_URL}/api/user/resume/upload`,
  updateResumeContent: `${API_BASE_URL}/api/user/resume/current/content`,
  calculateAts: `${API_BASE_URL}/api/user/resume/current/ats-score`,
  downloadResume: `${API_BASE_URL}/api/user/resume/current/download`,
  
  // Admin specific endpoints
  getAllUsers: `${API_BASE_URL}/api/admin/users`,
  getUserResumes: (userId: string) => `${API_BASE_URL}/api/admin/resume/user/${userId}`,
};

type ResumeData = {
  resumeId?: number;
  resumeVersionId?: number;
  versionId?: number;
  resumeName?: string;
  fileName?: string;
  atsScore?: number;
  rawText?: string;
  structuredContentJson?: string;
  fileUrl?: string;
  previewUrl?: string;
  versionCode?: string;
  versionType?: string;
  isBaseVersion?: boolean;
  parentVersionId?: number | null;
  updatedAt?: string;
  createdAt?: string;
};

type UserInfo = {
  id: number;
  userId: string;
  name: string;
  surname: string;
  email: string;
  role: string;
};

type UserResume = {
  resumeId: number;
  resumeCode: string;
  title: string;
  originalFileName: string;
  updatedAt: string;
  atsScore?: number;
};

type AtsPayload = {
  atsScore?: number;
  score?: number;
  tips?: string[];
  suggestions?: string[];
  recommendations?: string[];
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("accessToken")
  );
}

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null): T | null {
  if (!json) return null;
  const envelope = json as ApiEnvelope<T>;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(
  value: unknown,
  fallback?: number
): number | undefined {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    return lower === "true" || lower === "1" || lower === "yes";
  }
  return false;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeResumeData(raw: any): ResumeData | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    resumeId:
      normalizeNumber(raw.resumeId) ??
      normalizeNumber(raw.id) ??
      normalizeNumber(raw.resume?.resumeId) ??
      normalizeNumber(raw.resume?.id),

    resumeVersionId:
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.currentVersionId),

    versionId:
      normalizeNumber(raw.versionId) ??
      normalizeNumber(raw.resumeVersionId) ??
      normalizeNumber(raw.currentVersionId),

    resumeName:
      normalizeString(raw.resumeName) ||
      normalizeString(raw.name) ||
      normalizeString(raw.resumeTitle),

    fileName:
      normalizeString(raw.fileName) ||
      normalizeString(raw.originalFileName) ||
      normalizeString(raw.documentName),

    atsScore:
      normalizeNumber(raw.atsScore) ??
      normalizeNumber(raw.score) ??
      normalizeNumber(raw.ats) ??
      0,

    rawText:
      normalizeString(raw.rawText) ||
      normalizeString(raw.contentText) ||
      normalizeString(raw.textContent) ||
      normalizeString(raw.content),

    structuredContentJson:
      normalizeString(raw.structuredContentJson) ||
      normalizeString(raw.structuredContent) ||
      normalizeString(raw.structuredJson),

    fileUrl:
      normalizeString(raw.fileUrl) ||
      normalizeString(raw.downloadUrl) ||
      normalizeString(raw.filePath),

    previewUrl:
      normalizeString(raw.previewUrl) ||
      normalizeString(raw.previewFileUrl),

    versionCode: normalizeString(raw.versionCode),
    versionType: normalizeString(raw.versionType),

    isBaseVersion: normalizeBoolean(
      raw.isBaseVersion ?? raw.baseVersion ?? raw.isBase
    ),

    parentVersionId: normalizeNumber(raw.parentVersionId, null as never) ?? null,

    updatedAt:
      normalizeString(raw.updatedAt) ||
      normalizeString(raw.lastModifiedAt) ||
      normalizeString(raw.modifiedAt) ||
      normalizeString(raw.createdAt),

    createdAt:
      normalizeString(raw.createdAt) ||
      normalizeString(raw.uploadedAt) ||
      normalizeString(raw.generatedAt),
  };
}

function formatDateTime(value?: string | null): string {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function safePrettyJson(value?: string) {
  if (!value) return "";

  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

export default function AdminResumePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Admin's own resume state
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [savedResumeText, setSavedResumeText] = useState<string>("");

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [showEditor, setShowEditor] = useState<boolean>(false);

  const [tips, setTips] = useState<string[]>([
    "Add more measurable achievements such as metrics, impact, and scale.",
    "Use keywords that match the target job description.",
    "Keep formatting simple and ATS-friendly.",
    "Highlight relevant skills, projects, and experience clearly.",
  ]);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [scoring, setScoring] = useState<boolean>(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // All Users section state
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserInfo[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);
  const [userSearch, setUserSearch] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [selectedUserResumes, setSelectedUserResumes] = useState<UserResume[]>([]);
  const [resumesLoading, setResumesLoading] = useState<boolean>(false);

  const token = useMemo(() => getStoredToken(), []);

  const allowedTypes = useMemo(
    () => [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    []
  );

  const commonHeaders = useMemo<HeadersInit>(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const prettyStructuredJson = useMemo(
    () => safePrettyJson(resume?.structuredContentJson),
    [resume?.structuredContentJson]
  );

  const hydrateResumeState = useCallback((data?: ResumeData | null) => {
    if (!data) return;

    setResume(data);

    const nextText = data.rawText ?? "";
    setResumeText(nextText);
    setSavedResumeText(nextText);
  }, []);

  const clearResumeState = useCallback(() => {
    setResume(null);
    setResumeText("");
    setSavedResumeText("");
  }, []);

  const fetchCurrentResume = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        setSuccessMessage(null);

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await fetch(API_ROUTES.getCurrentResume, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...commonHeaders,
          },
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 404) {
          clearResumeState();
          return;
        }

        const resultJson = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            (resultJson as ApiEnvelope<any>)?.message ||
              `Failed to fetch resume. Status: ${response.status}`
          );
        }

        const resultData = normalizeResumeData(unwrapResponse<any>(resultJson));
        if (resultData) {
          hydrateResumeState(resultData);
        } else {
          clearResumeState();
        }
      } catch (error: any) {
        console.error("Fetch current resume error:", error);
        setErrorMessage(error?.message || "Unable to load resume data from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clearResumeState, commonHeaders, hydrateResumeState]
  );

  const fetchAllUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const response = await fetch(API_ROUTES.getAllUsers, {
        method: "GET",
        headers: commonHeaders,
        credentials: "include",
      });

      const resultJson = await response.json().catch(() => null);
      if (response.ok) {
        const allUsers = unwrapResponse<UserInfo[]>(resultJson) || [];
        // Filter only those with USER role
        const filtered = allUsers.filter(u => u.role === "USER");
        setUsers(filtered);
        setFilteredUsers(filtered);
      }
    } catch (error) {
      console.error("Fetch all users error:", error);
    } finally {
      setUsersLoading(false);
    }
  }, [commonHeaders]);

  useEffect(() => {
    fetchCurrentResume();
    fetchAllUsers();
  }, [fetchCurrentResume, fetchAllUsers]);

  // Handle user search
  useEffect(() => {
    if (!userSearch.trim()) {
      setFilteredUsers(users);
      return;
    }

    const lower = userSearch.toLowerCase();
    const filtered = users.filter(
      u => 
        u.name.toLowerCase().includes(lower) || 
        u.surname.toLowerCase().includes(lower) || 
        u.email.toLowerCase().includes(lower)
    );
    setFilteredUsers(filtered);
  }, [userSearch, users]);

  const fetchUserResumes = async (user: UserInfo) => {
    try {
      setSelectedUser(user);
      setResumesLoading(true);
      const response = await fetch(API_ROUTES.getUserResumes(user.userId), {
        method: "GET",
        headers: commonHeaders,
        credentials: "include",
      });

      const resultJson = await response.json().catch(() => null);
      if (response.ok) {
        const resumes = unwrapResponse<UserResume[]>(resultJson) || [];
        setSelectedUserResumes(resumes);
      }
    } catch (error) {
      console.error("Fetch user resumes error:", error);
    } finally {
      setResumesLoading(false);
    }
  };

  const validateUploadFile = useCallback(
    (file: File) => {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      const allowedExtensions = ["pdf", "txt", "doc", "docx"];

      if (
        !allowedTypes.includes(file.type) &&
        (!fileExtension || !allowedExtensions.includes(fileExtension))
      ) {
        setErrorMessage("Only .pdf, .txt, .doc, and .docx files are allowed.");
        return false;
      }

      const maxSizeMb = 10;
      const maxBytes = maxSizeMb * 1024 * 1024;

      if (file.size > maxBytes) {
        setErrorMessage(`File size must be under ${maxSizeMb} MB.`);
        return false;
      }

      return true;
    },
    [allowedTypes]
  );

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else setDragActive(false);
  };

  const uploadResumeToBackend = async (file: File) => {
    if (!validateUploadFile(file)) return;

    try {
      setUploading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(API_ROUTES.uploadResume, {
        method: "POST",
        headers: commonHeaders,
        credentials: "include",
        body: formData,
      });

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (resultJson as ApiEnvelope<any>)?.message ||
            `Resume upload failed. Status: ${response.status}`
        );
      }

      const resultData = normalizeResumeData(unwrapResponse<any>(resultJson));
      if (resultData) hydrateResumeState(resultData);

      setSuccessMessage("Resume uploaded successfully.");
    } catch (error: any) {
      setErrorMessage(error?.message || "Failed to upload and parse resume.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadResumeToBackend(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadResumeToBackend(e.target.files[0]);
    }
  };

  const calculateATS = async () => {
    if (!resumeText.trim()) return;
    try {
      setScoring(true);
      const response = await fetch(API_ROUTES.calculateAts, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...commonHeaders },
        credentials: "include",
        body: JSON.stringify({ 
          rawText: resumeText,
          jobDescription: "", // Placeholder for now
          skills: [] // Placeholder for now
        }),
      });
      const resultJson = await response.json().catch(() => null);
      if (response.ok) {
        const atsData = unwrapResponse<AtsPayload>(resultJson);
        const nextScore = normalizeNumber(atsData?.atsScore) ?? normalizeNumber(atsData?.score);
        if (typeof nextScore === "number") {
          setResume((prev) => (prev ? { ...prev, atsScore: nextScore } : prev));
        }
      }
    } catch (error) {
      console.error("ATS calculation error:", error);
    } finally {
      setScoring(false);
    }
  };

  const downloadResume = async () => {
    if (resume?.fileUrl) {
      window.open(resume.fileUrl, "_blank", "noopener,noreferrer");
      return;
    }
    // Fallback download logic...
  };

  const score = Math.max(0, Math.min(resume?.atsScore || 0, 100));
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-slate-950 via-slate-900 to-black px-4 py-10 text-white sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-12">
        {/* HEADER */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="bg-linear-to-r from-indigo-400 to-purple-500 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
                Admin Resume Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-400 sm:text-base">
                Manage your own resume and monitor all registered user resumes.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => fetchCurrentResume(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 px-5 py-3 font-semibold transition hover:bg-white/10 border border-white/10 disabled:opacity-50"
            >
              {refreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Refresh Data
            </button>
          </div>
        </div>

        {/* ADMIN OWN RESUME SECTION (MIRRORING USER PAGE) */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <User className="text-indigo-400" size={20} />
            <h2 className="text-xl font-bold">My Admin Resume</h2>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center rounded-3xl border border-white/5 bg-white/5">
              <Loader2 className="animate-spin text-indigo-400" size={32} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-6">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-xl">
                  <div
                    className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
                      dragActive ? "border-indigo-500 bg-indigo-500/10" : "border-white/15 bg-black/20"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <FileUp size={40} className="mx-auto mb-4 text-indigo-300" />
                    <p className="text-lg font-semibold text-white/90">Update Your Resume</p>
                    <p className="mt-1 text-sm text-white/50">Drag and drop or click to upload</p>
                    <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx" className="hidden" onChange={handleFileChange} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold transition hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                      Choose File
                    </button>
                  </div>

                  {resume && (
                    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl bg-black/30 p-4 border border-white/5">
                        <p className="text-xs text-white/40 uppercase tracking-wider">Filename</p>
                        <p className="mt-1 text-sm font-medium truncate">{resume.fileName}</p>
                      </div>
                      <div className="rounded-2xl bg-black/30 p-4 border border-white/5">
                        <p className="text-xs text-white/40 uppercase tracking-wider">ATS Score</p>
                        <p className="mt-1 text-sm font-medium">{resume.atsScore}%</p>
                      </div>
                      <div className="rounded-2xl bg-black/30 p-4 border border-white/5">
                        <p className="text-xs text-white/40 uppercase tracking-wider">Last Updated</p>
                        <p className="mt-1 text-sm font-medium">{formatDateTime(resume.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {resume?.rawText && (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                      <FileText size={20} className="text-indigo-400" />
                      Parsed Content Preview
                    </h3>
                    <div className="max-h-96 overflow-y-auto rounded-2xl bg-black/40 p-5 text-sm text-slate-300 leading-relaxed">
                      {resume.rawText}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 flex flex-col items-center text-center">
                  <h3 className="text-lg font-semibold mb-6">Your ATS Score</h3>
                  <div className="relative">
                    <svg width="160" height="160" className="rotate-[-90deg]">
                      <circle cx="80" cy="80" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
                      <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke="currentColor"
                        className="text-indigo-500"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold">{score}%</span>
                      <span className="text-xs text-slate-500">Optimized</span>
                    </div>
                  </div>
                  <button 
                    onClick={calculateATS}
                    disabled={scoring || !resume?.rawText}
                    className="mt-8 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold hover:opacity-90 transition disabled:opacity-50"
                  >
                    {scoring ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    Recalculate Score
                  </button>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h3 className="text-lg font-semibold mb-4">Optimization Tips</h3>
                  <div className="space-y-3">
                    {tips.map((tip, i) => (
                      <div key={i} className="flex gap-3 text-sm text-slate-400">
                        <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                        {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ALL USER RESUMES SECTION */}
        <div className="space-y-6 pt-6 border-t border-white/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="text-purple-400" size={24} />
              <h2 className="text-2xl font-bold">Registered User Resumes</h2>
            </div>
            
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* User List */}
            <div className="lg:col-span-4 space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {usersLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-white/5" />
                ))
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-10 text-slate-500">No users found.</div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.userId}
                    onClick={() => fetchUserResumes(u)}
                    className={`w-full text-left p-4 rounded-2xl border transition ${
                      selectedUser?.userId === u.userId 
                        ? "bg-purple-500/10 border-purple-500/50" 
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-semibold">{u.name} {u.surname}</div>
                    <div className="text-xs text-slate-500 truncate">{u.email}</div>
                  </button>
                ))
              )}
            </div>

            {/* Selected User Details & Resumes */}
            <div className="lg:col-span-8">
              {!selectedUser ? (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 text-slate-500">
                  <User size={48} className="mb-4 opacity-20" />
                  <p>Select a user to view their resumes</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold">{selectedUser.name} {selectedUser.surname}</h3>
                        <p className="text-sm text-slate-400">{selectedUser.email}</p>
                      </div>
                      <div className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-400 border border-purple-500/30">
                        {selectedUser.role}
                      </div>
                    </div>

                    <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Uploaded Resumes</h4>
                    
                    {resumesLoading ? (
                      <div className="flex py-10 justify-center">
                        <Loader2 className="animate-spin text-purple-400" />
                      </div>
                    ) : selectedUserResumes.length === 0 ? (
                      <p className="text-center py-10 text-slate-500 text-sm">This user hasn't uploaded any resumes yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedUserResumes.map((r) => (
                          <div key={r.resumeId} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 group hover:border-purple-500/30 transition">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                                <FileText size={20} />
                              </div>
                              <div>
                                <div className="font-medium text-sm">{r.originalFileName}</div>
                                <div className="text-xs text-slate-500">Updated {formatDateTime(r.updatedAt)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {r.atsScore !== undefined && (
                                <div className="text-sm font-bold text-emerald-400">{r.atsScore}%</div>
                              )}
                              <button 
                                onClick={() => router.push(`/admin/resume/version/${r.resumeId}`)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                              >
                                <ChevronRight size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* SUCCESS/ERROR TOASTS */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
        {successMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right">
            <CheckCircle2 className="text-emerald-400" size={20} />
            <p className="text-sm font-medium">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={16} /></button>
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 shadow-2xl backdrop-blur-xl animate-in slide-in-from-right">
            <AlertCircle className="text-red-400" size={20} />
            <p className="text-sm font-medium">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
