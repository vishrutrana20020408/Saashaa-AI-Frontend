"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  User2, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Globe, 
  Linkedin, 
  Github, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Upload, 
  Camera, 
  X,
  Building2,
  ShieldCheck,
  Save,
  Sparkles
} from "lucide-react";

/* ================= TYPES ================= */

type NullableString = string | null | undefined;

interface AdminProfileResponse {
  adminId?: number | string;
  profileId?: number;
  firstName?: NullableString;
  lastName?: NullableString;
  fullName?: NullableString;
  email?: NullableString;
  phone?: NullableString;
  companyName?: NullableString;
  designation?: NullableString;
  headline?: NullableString;
  summary?: NullableString;
  location?: NullableString;
  linkedinUrl?: NullableString;
  githubUrl?: NullableString;
  portfolioUrl?: NullableString;
  skills?: string[] | NullableString;
  sourceType?: NullableString;
  updatedAt?: NullableString;

  // New fields
  class10MarksheetUrl?: NullableString;
  class12MarksheetUrl?: NullableString;
  graduationMarksheetUrl?: NullableString;
  postGraduationMarksheetUrl?: NullableString;
  resumeUrl?: NullableString;
  verified?: boolean;
  profilePictureUrl?: NullableString;
}

interface ApiEnvelope<T> {
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

/* ================= HELPERS ================= */

function unwrap<T>(value: ApiEnvelope<T> | T | null): T | null {
  if (!value || typeof value !== "object") return null;
  const v = value as ApiEnvelope<T> & T;
  return v.data ?? v.payload ?? v.result ?? (v as T);
}

function normalizeRole(role?: string) {
  return (role || "").toUpperCase().replace("ROLE_", "");
}

function getToken(): string {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    ""
  );
}

function normalizeString(value: NullableString): string {
  return typeof value === "string" ? value : "";
}

/* ================= FORM ================= */

interface AdminProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  designation: string;
  headline: string;
  summary: string;
  location: string;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  skillsText: string;
}

const EMPTY_FORM: AdminProfileForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  companyName: "",
  designation: "",
  headline: "",
  summary: "",
  location: "",
  linkedinUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  skillsText: "",
};

function profileToForm(p: AdminProfileResponse | null): AdminProfileForm {
  if (!p) return EMPTY_FORM;

  const skills =
    Array.isArray(p.skills)
      ? p.skills
      : typeof p.skills === "string"
      ? p.skills.split(",").map((s) => s.trim())
      : [];

  return {
    firstName: normalizeString(p.firstName),
    lastName: normalizeString(p.lastName),
    email: normalizeString(p.email),
    phone: normalizeString(p.phone),
    companyName: normalizeString(p.companyName),
    designation: normalizeString(p.designation),
    headline: normalizeString(p.headline),
    summary: normalizeString(p.summary),
    location: normalizeString(p.location),
    linkedinUrl: normalizeString(p.linkedinUrl),
    githubUrl: normalizeString(p.githubUrl),
    portfolioUrl: normalizeString(p.portfolioUrl),
    skillsText: skills.join(", "),
  };
}

/* ================= PAGE ================= */

export default function AdminProfilePage() {
  const router = useRouter();

  const API_BASE = useMemo(
    () =>
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [profile, setProfile] = useState<AdminProfileResponse | null>(null);
  const [form, setForm] = useState<AdminProfileForm>(EMPTY_FORM);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resumeVersionId, setResumeVersionId] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeDocType, setActiveDocType] = useState<string | null>(null);

  /* ================= AUTH ================= */

  const validateAdmin = useCallback(async (): Promise<string | null> => {
    const token = getToken();
    if (!token) {
      router.replace("/auth/login");
      return null;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
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
      localStorage.clear();
      router.replace("/auth/login");
      return null;
    }
  }, [API_BASE, router]);

  /* ================= FETCH ================= */

  const fetchProfile = useCallback(async (token: string) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/admin/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message);

      const data = unwrap<AdminProfileResponse>(json);
      setProfile(data);
      setForm(profileToForm(data));
    } catch (err) {
      setError("Failed to load admin profile.");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    const init = async () => {
      const token = await validateAdmin();
      if (!token) return;
      await fetchProfile(token);
    };
    init();
  }, [validateAdmin, fetchProfile]);

  /* ================= UPLOAD ================= */

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDocType) return;

    try {
      setUploading(activeDocType);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", activeDocType);

      const res = await fetch(`${API_BASE}/api/admin/profile/upload-document`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed");
      
      const token = getToken();
      if (token) await fetchProfile(token);
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
      const res = await fetch(`${API_BASE}/api/admin/profile/document/${docType}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      if (!res.ok) throw new Error("Delete failed");
      
      const token = getToken();
      if (token) await fetchProfile(token);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(null);
    }
  };

  /* ================= SAVE ================= */

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        skills: form.skillsText.split(",").map((s) => s.trim()),
      };

      const res = await fetch(`${API_BASE}/api/admin/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message);

      const updated = unwrap<AdminProfileResponse>(json);
      setProfile(updated);
      setForm(profileToForm(updated));

      setMessage("Profile updated successfully.");
    } catch {
      setError("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  /* ================= SYNC ================= */

  const syncProfile = async () => {
    const token = getToken();
    setSyncing(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/profile/sync-from-resume`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            resumeVersionId: resumeVersionId
              ? Number(resumeVersionId)
              : undefined,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error();

      const data = unwrap<AdminProfileResponse>(json);
      setProfile(data);
      setForm(profileToForm(data));

      setMessage("Profile synced from resume.");
    } catch {
      setError("Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-10">

      <h1 className="text-3xl font-bold mb-6">Admin Profile</h1>

      {error && <div className="text-red-400 mb-4">{error}</div>}
      {message && <div className="text-green-400 mb-4">{message}</div>}

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 text-slate-900">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
              {profile?.profilePictureUrl ? (
                <img src={`${API_BASE}${profile.profilePictureUrl}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile?.firstName?.charAt(0) || "A"
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
              {profile?.fullName || `${profile?.firstName} ${profile?.lastName}`.trim() || "Admin"}
              {profile?.verified && <ShieldCheck className="text-emerald-500" size={20} />}
            </h1>
            <p className="text-slate-500">{profile?.email}</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Info & Form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl p-8 shadow-sm border text-slate-900">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <User2 className="text-indigo-600" />
                Profile Details
              </h2>
              <button 
                onClick={saveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">First Name</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="First Name" 
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Last Name</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="Last Name" 
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })} 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    placeholder="Email" 
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Professional Summary</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all min-h-32"
                  placeholder="Write a brief summary about your professional background..."
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })} 
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700">Skills (comma separated)</label>
                <input 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="React, Next.js, TypeScript, Node.js..."
                  value={form.skillsText}
                  onChange={(e) => setForm({ ...form, skillsText: e.target.value })} 
                />
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Sidebar & Actions */}
        <div className="space-y-8">
          {/* Sync Section */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border text-slate-900">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <RefreshCw className="text-emerald-600" size={20} />
              Resume Sync
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Update your profile information by syncing from a previously uploaded resume version.
            </p>
            <div className="space-y-4">
              <input
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="Resume Version ID"
                value={resumeVersionId}
                onChange={(e) => setResumeVersionId(e.target.value)}
              />
              <button
                onClick={syncProfile}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {syncing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {syncing ? "Syncing..." : "Sync from Resume"}
              </button>
            </div>
          </div>

          {/* Quick Stats/Info */}
          <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-lg shadow-indigo-200 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Building2 size={80} />
            </div>
            <h3 className="text-xl font-bold mb-2">Admin Panel</h3>
            <p className="text-indigo-100 text-sm mb-6">Manage users, interviews, and platform settings from your dashboard.</p>
            <button 
              onClick={() => router.push("/admin/dashboard")}
              className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}