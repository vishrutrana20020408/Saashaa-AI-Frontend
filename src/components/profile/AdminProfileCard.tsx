"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Shield,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Briefcase,
  Building2,
  FileText,
  Award,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Globe,
  Linkedin,
  Github,
  Users,
  UserCog,
  BadgeCheck,
  IdCard,
} from "lucide-react";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
};

type AdminProfileDto = {
  adminId?: number;
  id?: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  summary?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;

  role?: string;
  adminRole?: string;
  designation?: string;
  department?: string;
  employeeCode?: string;
  organizationName?: string;
  companyName?: string;
  yearsOfExperience?: number;
  specialization?: string;

  profileCompletionPercentage?: number;
  completionPercentage?: number;
  updatedAt?: string;
  createdAt?: string;

  skills?: string[] | string;
  certifications?: string[] | string;
  achievements?: string[] | string;
  domains?: string[] | string;
  responsibilities?: string[] | string;
  permissions?: string[] | string;

  resumeId?: number;
  activeResumeVersionId?: number;
  resumeTitle?: string;
  profileSource?: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

const API_ROUTES = {
  adminProfileMe: `${API_BASE_URL}/api/admin/profile/me`,
  adminProfile: `${API_BASE_URL}/api/admin/profile`,
  adminHome: `${API_BASE_URL}/api/admin/home`,
};

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null): T | null {
  if (!json) return null;
  const envelope = json as ApiEnvelope<T>;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function getStoredToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    null
  );
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeNumber(
  value: unknown,
  fallback?: number
): number | undefined {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeArray(value?: string[] | string): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeProfile(raw: any): AdminProfileDto | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    adminId: normalizeNumber(raw.adminId) ?? normalizeNumber(raw.id),
    id: normalizeNumber(raw.id) ?? normalizeNumber(raw.adminId),
    firstName: normalizeString(raw.firstName),
    lastName: normalizeString(raw.lastName),
    fullName: normalizeString(raw.fullName),
    email: normalizeString(raw.email),
    phone: normalizeString(raw.phone),
    location: normalizeString(raw.location),
    headline: normalizeString(raw.headline),
    summary: normalizeString(raw.summary),
    bio: normalizeString(raw.bio),
    dateOfBirth: normalizeString(raw.dateOfBirth),
    gender: normalizeString(raw.gender),
    website: normalizeString(raw.website),
    linkedinUrl: normalizeString(raw.linkedinUrl),
    githubUrl: normalizeString(raw.githubUrl),
    portfolioUrl: normalizeString(raw.portfolioUrl),

    role: normalizeString(raw.role),
    adminRole: normalizeString(raw.adminRole),
    designation: normalizeString(raw.designation),
    department: normalizeString(raw.department),
    employeeCode: normalizeString(raw.employeeCode),
    organizationName: normalizeString(raw.organizationName),
    companyName: normalizeString(raw.companyName),
    yearsOfExperience: normalizeNumber(raw.yearsOfExperience),
    specialization: normalizeString(raw.specialization),

    profileCompletionPercentage: normalizeNumber(raw.profileCompletionPercentage),
    completionPercentage: normalizeNumber(raw.completionPercentage),
    updatedAt: normalizeString(raw.updatedAt),
    createdAt: normalizeString(raw.createdAt),

    skills: raw.skills,
    certifications: raw.certifications,
    achievements: raw.achievements,
    domains: raw.domains,
    responsibilities: raw.responsibilities,
    permissions: raw.permissions,

    resumeId: normalizeNumber(raw.resumeId),
    activeResumeVersionId: normalizeNumber(raw.activeResumeVersionId),
    resumeTitle: normalizeString(raw.resumeTitle),
    profileSource: normalizeString(raw.profileSource),
  };
}

function formatDate(value?: string) {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminProfileCard() {
  const [profile, setProfile] = useState<AdminProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchAdminProfile = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setSuccessMessage("");

      const token = getStoredToken();

      const commonHeaders: HeadersInit = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const endpoints = [
        API_ROUTES.adminProfileMe,
        API_ROUTES.adminProfile,
        API_ROUTES.adminHome,
      ];

      let resolvedProfile: AdminProfileDto | null = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            credentials: "include",
            headers: commonHeaders,
            cache: "no-store",
          });

          if (!response.ok) {
            if ([401, 403, 404].includes(response.status)) {
              continue;
            }
            throw new Error(`Request failed with status ${response.status}`);
          }

          const json = await response.json().catch(() => null);
          const normalized = normalizeProfile(unwrapResponse<any>(json));

          if (normalized) {
            resolvedProfile = normalized;
            break;
          }
        } catch (fetchError) {
          console.warn(
            `Admin profile fetch failed for endpoint: ${endpoint}`,
            fetchError
          );
          continue;
        }
      }

      if (!resolvedProfile) {
        throw new Error("Unable to fetch admin profile from backend.");
      }

      setProfile(resolvedProfile);

      if (typeof window !== "undefined") {
        const fullName =
          resolvedProfile.fullName ||
          [resolvedProfile.firstName, resolvedProfile.lastName]
            .filter(Boolean)
            .join(" ");

        if (fullName) {
          localStorage.setItem("adminName", fullName);
        }

        if (resolvedProfile.email) {
          localStorage.setItem("adminEmail", resolvedProfile.email);
        }

        if (resolvedProfile.adminId != null || resolvedProfile.id != null) {
          localStorage.setItem(
            "adminId",
            String(resolvedProfile.adminId ?? resolvedProfile.id)
          );
        }
      }

      if (showRefresh) {
        setSuccessMessage("Admin profile refreshed successfully.");
      }
    } catch (err) {
      console.error("Failed to load admin profile:", err);
      setError("Unable to load admin profile from backend.");
      setProfile(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminProfile();
  }, [fetchAdminProfile]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const fullName = useMemo(() => {
    if (!profile) return "Admin Profile";

    return (
      profile.fullName ||
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      "Admin Profile"
    );
  }, [profile]);

  const initials = useMemo(() => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "A";
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [fullName]);

  const aboutText =
    profile?.summary ||
    profile?.bio ||
    profile?.headline ||
    "No admin profile summary available.";

  const skills = normalizeArray(profile?.skills);
  const certifications = normalizeArray(profile?.certifications);
  const achievements = normalizeArray(profile?.achievements);
  const domains = normalizeArray(profile?.domains);
  const responsibilities = normalizeArray(profile?.responsibilities);
  const permissions = normalizeArray(profile?.permissions);

  const completionPercentage =
    profile?.profileCompletionPercentage ?? profile?.completionPercentage ?? 0;

  const organization =
    profile?.organizationName || profile?.companyName || undefined;

  const effectiveRole =
    profile?.adminRole || profile?.designation || profile?.role || "ADMIN";

  if (loading) {
    return (
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-5 w-40 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="w-full rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold">Admin profile load failed</h3>
            <p className="mt-1 text-sm">{error}</p>

            <button
              type="button"
              onClick={() => fetchAdminProfile(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-18 w-18 min-h-[72px] min-w-[72px] items-center justify-center rounded-3xl bg-slate-900 text-xl font-bold text-white shadow-sm">
              {initials}
            </div>

            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-slate-900">{fullName}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {profile?.headline ||
                  profile?.designation ||
                  profile?.adminRole ||
                  "Admin Profile"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {profile?.email && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    <Mail className="h-3.5 w-3.5" />
                    {profile.email}
                  </span>
                )}

                {profile?.location && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.location}
                  </span>
                )}

                {organization && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    <Building2 className="h-3.5 w-3.5" />
                    {organization}
                  </span>
                )}

                {profile?.department && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    <Users className="h-3.5 w-3.5" />
                    {profile.department}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <button
              type="button"
              onClick={() => fetchAdminProfile(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <div className="w-full min-w-[220px] rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">
                  Profile Completion
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {completionPercentage}%
                </span>
              </div>

              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all duration-500"
                  style={{
                    width: `${Math.min(Math.max(completionPercentage, 0), 100)}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Last updated: {formatDateTime(profile?.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {error && profile && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-900" />
                <h3 className="text-lg font-semibold text-slate-900">About</h3>
              </div>
              <p className="text-sm leading-7 text-slate-700">{aboutText}</p>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-900" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Admin Information
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={profile?.email}
                />
                <InfoItem
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                  value={profile?.phone}
                />
                <InfoItem
                  icon={<MapPin className="h-4 w-4" />}
                  label="Location"
                  value={profile?.location}
                />
                <InfoItem
                  icon={<CalendarDays className="h-4 w-4" />}
                  label="Date of Birth"
                  value={profile?.dateOfBirth ? formatDate(profile.dateOfBirth) : undefined}
                />
                <InfoItem
                  icon={<UserCog className="h-4 w-4" />}
                  label="Admin Role"
                  value={effectiveRole}
                />
                <InfoItem
                  icon={<Building2 className="h-4 w-4" />}
                  label="Organization"
                  value={organization}
                />
                <InfoItem
                  icon={<Users className="h-4 w-4" />}
                  label="Department"
                  value={profile?.department}
                />
                <InfoItem
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Designation"
                  value={profile?.designation}
                />
                <InfoItem
                  icon={<IdCard className="h-4 w-4" />}
                  label="Employee Code"
                  value={profile?.employeeCode}
                />
                <InfoItem
                  icon={<Award className="h-4 w-4" />}
                  label="Experience"
                  value={
                    profile?.yearsOfExperience !== undefined
                      ? `${profile.yearsOfExperience} years`
                      : undefined
                  }
                />
                <InfoItem
                  icon={<BadgeCheck className="h-4 w-4" />}
                  label="Specialization"
                  value={profile?.specialization}
                />
                <InfoItem
                  icon={<FileText className="h-4 w-4" />}
                  label="Profile Source"
                  value={profile?.profileSource}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <UserCog className="h-5 w-5 text-slate-900" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Administrative Scope
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem
                  icon={<UserCog className="h-4 w-4" />}
                  label="Primary Role"
                  value={profile?.adminRole || profile?.role}
                />
                <InfoItem
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Headline"
                  value={profile?.headline}
                />
                <InfoItem
                  icon={<Building2 className="h-4 w-4" />}
                  label="Company Name"
                  value={profile?.companyName}
                />
                <InfoItem
                  icon={<Building2 className="h-4 w-4" />}
                  label="Organization Name"
                  value={profile?.organizationName}
                />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-100 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-slate-900" />
                <h3 className="text-lg font-semibold text-slate-900">Links</h3>
              </div>

              <div className="space-y-3">
                <LinkItem
                  label="Website"
                  value={profile?.website}
                  icon={<Globe className="h-4 w-4" />}
                />
                <LinkItem
                  label="Portfolio"
                  value={profile?.portfolioUrl}
                  icon={<Globe className="h-4 w-4" />}
                />
                <LinkItem
                  label="LinkedIn"
                  value={profile?.linkedinUrl}
                  icon={<Linkedin className="h-4 w-4" />}
                />
                <LinkItem
                  label="GitHub"
                  value={profile?.githubUrl}
                  icon={<Github className="h-4 w-4" />}
                />
              </div>
            </section>

            <TagSection
              title="Skills"
              icon={<Award className="h-5 w-5 text-slate-900" />}
              items={skills}
            />
            <TagSection
              title="Domains"
              icon={<FileText className="h-5 w-5 text-slate-900" />}
              items={domains}
            />
            <TagSection
              title="Responsibilities"
              icon={<Users className="h-5 w-5 text-slate-900" />}
              items={responsibilities}
            />
            <TagSection
              title="Permissions"
              icon={<BadgeCheck className="h-5 w-5 text-slate-900" />}
              items={permissions}
            />
            <TagSection
              title="Certifications"
              icon={<Award className="h-5 w-5 text-slate-900" />}
              items={certifications}
            />
            <TagSection
              title="Achievements"
              icon={<CheckCircle2 className="h-5 w-5 text-slate-900" />}
              items={achievements}
            />

            <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">
                Resume Integration
              </h3>
              <div className="mt-4 space-y-3">
                <InfoCompact
                  label="Resume ID"
                  value={profile?.resumeId ? String(profile.resumeId) : undefined}
                />
                <InfoCompact
                  label="Active Resume Version"
                  value={
                    profile?.activeResumeVersionId
                      ? String(profile.activeResumeVersionId)
                      : undefined
                  }
                />
                <InfoCompact
                  label="Resume Title"
                  value={profile?.resumeTitle}
                />
                <InfoCompact
                  label="Created At"
                  value={formatDateTime(profile?.createdAt)}
                />
                <InfoCompact
                  label="Updated At"
                  value={formatDateTime(profile?.updatedAt)}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-900">
        {value?.trim() ? value : "Not provided"}
      </p>
    </div>
  );
}

function InfoCompact({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">
        {value?.trim() ? value : "Not available"}
      </span>
    </div>
  );
}

function TagSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${title}-${item}-${index}`}
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          No {title.toLowerCase()} added yet.
        </p>
      )}
    </section>
  );
}

function LinkItem({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string;
  icon: React.ReactNode;
}) {
  const isValidLink = Boolean(value && value.trim());

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>

      {isValidLink ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all text-sm font-semibold text-slate-900 transition hover:text-slate-700 hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 text-sm font-semibold text-slate-900">
          Not provided
        </p>
      )}
    </div>
  );
}