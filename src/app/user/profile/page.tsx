"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  User2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Github,
  Globe,
  Linkedin,
  RefreshCw,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Upload,
  FileText,
  Camera,
  Verified,
  Save,
  X,
} from "lucide-react";

type DomainType = "Technical" | "Non-Technical";

type UserOnboardingData = {
  done?: boolean;
  domain?: DomainType;
  subDomainMode?: "single" | "any" | "multi";
  subDomainSingle?: string | null;
  subDomainMulti?: string[] | null;
  jobTitles?: string[] | null;

  resumeScanned?: boolean;
  resumeFileName?: string | null;
  resumeScore?: number | null;
};

type UserProfileData = {
  id?: number | string;
  userId?: number | string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  headline?: string;
  summary?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  skills?: string[] | string | null;
  updatedAt?: string;

  // New fields
  class10MarksheetUrl?: string;
  class12MarksheetUrl?: string;
  graduationMarksheetUrl?: string;
  postGraduationMarksheetUrl?: string;
  experienceYears?: number;
  verified?: boolean;
  profilePictureUrl?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  payload?: T;
  result?: T;
};

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null): T | null {
  if (!json || typeof json !== "object") return null;
  const envelope = json as ApiEnvelope<T> & T;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("accessToken") || localStorage.getItem("token") || "";
}

export default function UserProfilePage() {
  const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [userIdInput, setUserIdInput] = useState("");
  const [savingUserId, setSavingUserId] = useState(false);
  const [onb, setOnb] = useState<UserOnboardingData | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDocType, setActiveDocType] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [profRes, onbRes] = await Promise.all([
        fetch(`${backendBaseUrl}/api/user/profile`, { headers }),
        fetch(`${backendBaseUrl}/api/user/onboarding`, { headers })
      ]);

      if (profRes.ok) {
        const loadedProfile = unwrapResponse(await profRes.json());
        if (loadedProfile) {
          setProfile(loadedProfile);
          setUserIdInput(
            String(loadedProfile.userId ?? loadedProfile.id ?? "")
          );
          if (typeof window !== "undefined" && loadedProfile.userId) {
            localStorage.setItem("userId", String(loadedProfile.userId));
          }
        }
      }

      if (onbRes.ok) setOnb(unwrapResponse(await onbRes.json()));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [backendBaseUrl]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDocType) return;

    try {
      setUploading(activeDocType);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", activeDocType);

      const res = await fetch(`${backendBaseUrl}/api/user/profile/upload-document`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed");
      await loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(null);
      setActiveDocType(null);
    }
  };

  const triggerUpload = (docType: string) => {
    setActiveDocType(docType);
    fileInputRef.current?.click();
  };

  const handleDelete = async (docType: string) => {
    if (!confirm(`Are you sure you want to delete your ${docType}?`)) return;

    try {
      setUploading(docType);
      const res = await fetch(`${backendBaseUrl}/api/user/profile/document/${docType}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (!res.ok) throw new Error("Delete failed");
      await loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(null);
    }
  };

  const saveUserId = async () => {
    if (!profile) return;

    const candidateId = userIdInput.trim();
    if (!candidateId) return;

    setSavingUserId(true);
    setError("");
    setInfoMessage("");

    try {
      const payload = {
        userId: /^\d+$/.test(candidateId)
          ? Number(candidateId)
          : candidateId,
      };

      const res = await fetch(`${backendBaseUrl}/api/user/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || "Unable to save user ID.");
      }

      const updatedProfile = unwrapResponse(await res.json());
      if (updatedProfile) {
        setProfile(updatedProfile);
        setUserIdInput(String(updatedProfile.userId ?? candidateId));
        if (typeof window !== "undefined") {
          localStorage.setItem("userId", String(updatedProfile.userId ?? candidateId));
        }
        setInfoMessage("User ID saved successfully.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to save user ID.");
    } finally {
      setSavingUserId(false);
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                {profile?.profilePictureUrl ? (
                  <img src={`${backendBaseUrl}/${profile.profilePictureUrl}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profile?.fullName?.charAt(0) || "U"
                )}
              </div>
              <button 
                onClick={() => triggerUpload("profilepicture")}
                className="absolute -bottom-2 -right-2 p-2 bg-white rounded-full shadow-md border hover:bg-slate-50"
              >
                <Camera size={16} className="text-slate-600" />
              </button>
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {profile?.fullName || "User"}
                {profile?.verified && <Verified className="text-emerald-500" size={20} />}
              </h1>
              <p className="text-slate-500">{profile?.email}</p>
              {profile?.verified && <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Verified Account</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadData()} className="p-3 border rounded-xl hover:bg-slate-50"><RefreshCw size={20} /></button>
            <Link href="/user/profile/settings" className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Settings</Link>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Unique User ID</h2>
              <p className="text-sm text-slate-500">This ID is editable and shown in your analytics preview.</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <input
                value={userIdInput}
                onChange={(event) => setUserIdInput(event.target.value)}
                className="w-full sm:w-64 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Enter User ID"
              />
              <button
                type="button"
                onClick={saveUserId}
                disabled={savingUserId || !userIdInput.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-white font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition-all"
              >
                <Save size={16} />
                {savingUserId ? "Saving..." : "Save ID"}
              </button>
            </div>
          </div>
          {infoMessage ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{infoMessage}</div> : null}
          {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
              <h2 className="text-xl font-bold">Experience</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border transition-hover hover:bg-slate-100/50">
                  <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Work Experience</p>
                    <p className="text-lg font-bold">{profile?.experienceYears || 0} Years</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border transition-hover hover:bg-slate-100/50">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                    <Verified size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</p>
                    <p className="text-lg font-bold">{profile?.verified ? "Verified" : "Pending"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border space-y-4">
              <h2 className="text-xl font-bold">Quick Stats</h2>
              <div className="space-y-1">
                <StatRow label="Resume Score" value={onb?.resumeScore ? `${onb.resumeScore}/100` : "N/A"} />
                <StatRow label="Track" value={onb?.domain || "N/A"} />
                <StatRow label="Job Titles" value={onb?.jobTitles?.length || 0} />
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-8 shadow-sm border space-y-6 text-center group">
              <div className="relative mx-auto w-16 h-16">
                <Sparkles className="text-indigo-600 w-full h-full animate-pulse" />
                <div className="absolute inset-0 bg-indigo-400/20 blur-2xl rounded-full group-hover:bg-indigo-400/30 transition-all"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Ready for Interview?</h3>
                <p className="text-sm text-slate-500">Test your skills with our AI-powered mock interviews.</p>
              </div>
              <Link 
                href="/user/interviewdashboard" 
                className="block w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all transform hover:-translate-y-1 active:scale-95 shadow-lg shadow-slate-200"
              >
                Start Mock Interview
              </Link>
            </div>
          </div>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleUpload}
        accept=".pdf,.jpg,.jpeg,.png"
      />
    </div>
  );
}

function StatRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center py-2 border-b last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
