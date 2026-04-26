"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  User,
  Shield,
  Briefcase,
  Building2,
  GraduationCap,
  Award,
  Target,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Sparkles,
} from "lucide-react";

type ProfileRole = "USER" | "ADMIN";

type GenericApiResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

type SummaryProfile = {
  id?: number;
  role: ProfileRole;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  headline?: string;
  summary?: string;
  bio?: string;

  currentRole?: string;
  currentCompany?: string;
  yearsOfExperience?: number;

  designation?: string;
  department?: string;
  organizationName?: string;
  companyName?: string;
  adminRole?: string;

  university?: string;
  degree?: string;
  specialization?: string;
  graduationYear?: string | number;

  profileCompletionPercentage?: number;
  completionPercentage?: number;
  profileSource?: string;
  updatedAt?: string;

  skills?: string[] | string;
  certifications?: string[] | string;
  achievements?: string[] | string;
  preferredJobRoles?: string[] | string;
  domains?: string[] | string;
  responsibilities?: string[] | string;
  permissions?: string[] | string;
};

type ProfileSummarySectionProps = {
  title?: string;
  showHeader?: boolean;
  showRefreshButton?: boolean;
  className?: string;
  onRefresh?: (profile: SummaryProfile) => void;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function ProfileSummarySection({
  title = "Profile Summary",
  showHeader = true,
  showRefreshButton = true,
  className = "",
  onRefresh,
}: ProfileSummarySectionProps) {
  const [profile, setProfile] = useState<SummaryProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const readString = (...values: unknown[]): string | undefined => {
    for (const value of values) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  };

  const readNumber = (...values: unknown[]): number | undefined => {
    for (const value of values) {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
        return Number(value);
      }
    }
    return undefined;
  };

  const normalizeArray = (value?: string[] | string): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const formatDateTime = (value?: string) => {
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
  };

  const buildProfile = useCallback(
    (payload: GenericApiResponse, fallbackRole: ProfileRole): SummaryProfile => {
      const data = (payload?.data || {}) as Record<string, unknown>;

      const firstName = readString(data.firstName, payload.firstName);
      const lastName = readString(data.lastName, payload.lastName);
      const fullName =
        readString(
          data.fullName,
          payload.fullName,
          [firstName, lastName].filter(Boolean).join(" ")
        ) || (fallbackRole === "ADMIN" ? "Admin" : "User");

      return {
        id: readNumber(data.id, data.userId, data.adminId, payload.id),
        role: readString(data.role, payload.role) === "ADMIN" ? "ADMIN" : fallbackRole,
        fullName,
        firstName,
        lastName,
        email: readString(data.email, payload.email),
        headline: readString(data.headline, payload.headline),
        summary: readString(data.summary, payload.summary),
        bio: readString(data.bio, payload.bio),

        currentRole: readString(data.currentRole, payload.currentRole),
        currentCompany: readString(data.currentCompany, payload.currentCompany),
        yearsOfExperience: readNumber(
          data.yearsOfExperience,
          payload.yearsOfExperience
        ),

        designation: readString(data.designation, payload.designation),
        department: readString(data.department, payload.department),
        organizationName: readString(data.organizationName, payload.organizationName),
        companyName: readString(data.companyName, payload.companyName),
        adminRole: readString(data.adminRole, payload.adminRole),

        university: readString(data.university, payload.university),
        degree: readString(data.degree, payload.degree),
        specialization: readString(data.specialization, payload.specialization),
        graduationYear:
          readString(data.graduationYear, payload.graduationYear) ??
          readNumber(data.graduationYear, payload.graduationYear),

        profileCompletionPercentage: readNumber(
          data.profileCompletionPercentage,
          payload.profileCompletionPercentage
        ),
        completionPercentage: readNumber(
          data.completionPercentage,
          payload.completionPercentage
        ),
        profileSource: readString(data.profileSource, payload.profileSource),
        updatedAt: readString(data.updatedAt, payload.updatedAt),

        skills: (data.skills as string[] | string) ?? (payload.skills as string[] | string),
        certifications:
          (data.certifications as string[] | string) ??
          (payload.certifications as string[] | string),
        achievements:
          (data.achievements as string[] | string) ??
          (payload.achievements as string[] | string),
        preferredJobRoles:
          (data.preferredJobRoles as string[] | string) ??
          (payload.preferredJobRoles as string[] | string),
        domains:
          (data.domains as string[] | string) ?? (payload.domains as string[] | string),
        responsibilities:
          (data.responsibilities as string[] | string) ??
          (payload.responsibilities as string[] | string),
        permissions:
          (data.permissions as string[] | string) ??
          (payload.permissions as string[] | string),
      };
    },
    []
  );

  const fetchProfile = useCallback(
    async (showRefreshLoader = false) => {
      try {
        if (showRefreshLoader) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");
        setSuccessMessage("");

        /*
         * Backend-aware flow aligned with your Interview System architecture:
         * - dedicated profile endpoints first
         * - profile endpoints second
         * - protected home endpoints as fallback
         */
        const endpoints: Array<{ url: string; role: ProfileRole }> = [
          { url: `${API_BASE_URL}/api/user/profile/me`, role: "USER" },
          { url: `${API_BASE_URL}/api/admin/profile/me`, role: "ADMIN" },
          { url: `${API_BASE_URL}/api/user/profile`, role: "USER" },
          { url: `${API_BASE_URL}/api/admin/profile`, role: "ADMIN" },
          { url: `${API_BASE_URL}/api/user/home`, role: "USER" },
          { url: `${API_BASE_URL}/api/admin/home`, role: "ADMIN" },
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint.url, {
              method: "GET",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              cache: "no-store",
            });

            if (response.ok) {
              const payload: GenericApiResponse = await response.json();
              const resolved = buildProfile(payload, endpoint.role);

              setProfile(resolved);

              if (showRefreshLoader) {
                setSuccessMessage("Profile summary refreshed successfully.");
              }

              onRefresh?.(resolved);
              return;
            }

            if ([401, 403, 404].includes(response.status)) {
              continue;
            }
          } catch {
            continue;
          }
        }

        throw new Error("No authenticated profile summary found.");
      } catch (err) {
        console.error("Failed to load profile summary section:", err);
        setProfile(null);
        setError("Unable to load profile summary from backend.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildProfile, onRefresh]
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(""), 2500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const summaryText =
    profile?.summary ||
    profile?.bio ||
    profile?.headline ||
    "No profile summary available yet.";

  const roleLabel = profile?.role === "ADMIN" ? "Admin" : "User";

  const primaryRole =
    profile?.role === "ADMIN"
      ? profile?.designation || profile?.adminRole || "Not provided"
      : profile?.currentRole || "Not provided";

  const organization =
    profile?.role === "ADMIN"
      ? profile?.organizationName || profile?.companyName || "Not provided"
      : profile?.currentCompany || "Not provided";

  const educationText = useMemo(() => {
    const parts = [
      profile?.degree,
      profile?.specialization,
      profile?.university,
      profile?.graduationYear ? String(profile.graduationYear) : undefined,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(" • ") : "Not provided";
  }, [
    profile?.degree,
    profile?.specialization,
    profile?.university,
    profile?.graduationYear,
  ]);

  const completion =
    profile?.profileCompletionPercentage ?? profile?.completionPercentage ?? 0;

  const skills = normalizeArray(profile?.skills);
  const certifications = normalizeArray(profile?.certifications);
  const achievements = normalizeArray(profile?.achievements);
  const preferredJobRoles = normalizeArray(profile?.preferredJobRoles);
  const domains = normalizeArray(profile?.domains);
  const responsibilities = normalizeArray(profile?.responsibilities);
  const permissions = normalizeArray(profile?.permissions);

  if (loading) {
    return (
      <section
        className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="h-6 w-52 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-5">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-[92%] animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-[85%] animate-pulse rounded bg-slate-100" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-100 bg-white p-4"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-5 w-32 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error && !profile) {
    return (
      <section
        className={`rounded-3xl border border-red-200 bg-white p-6 shadow-sm ${className}`}
      >
        <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold">Profile summary load failed</h3>
            <p className="mt-1 text-sm">{error}</p>

            <button
              type="button"
              onClick={() => fetchProfile(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {showHeader && (
        <div className="border-b border-slate-100 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {profile?.role === "ADMIN" ? (
                    <Shield className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                  {roleLabel}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Backend-synced overview of summary, role, education, and profile highlights.
              </p>
            </div>

            {showRefreshButton && (
              <button
                type="button"
                onClick={() => fetchProfile(true)}
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
            )}
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
      )}

      <div className="p-6">
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">
                  Professional Summary
                </h3>
              </div>

              <p className="text-sm leading-7 text-slate-700">{summaryText}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryStatCard
                icon={<Sparkles className="h-4 w-4" />}
                label="Profile Completion"
                value={`${Math.min(Math.max(completion, 0), 100)}%`}
              />

              <SummaryStatCard
                icon={<Briefcase className="h-4 w-4" />}
                label="Primary Role"
                value={primaryRole}
              />

              <SummaryStatCard
                icon={<Building2 className="h-4 w-4" />}
                label="Organization"
                value={organization}
              />

              <SummaryStatCard
                icon={<CalendarDays className="h-4 w-4" />}
                label="Last Updated"
                value={formatDateTime(profile?.updatedAt)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DetailCard
                icon={<GraduationCap className="h-5 w-5 text-indigo-600" />}
                title="Education Summary"
                value={educationText}
              />

              <DetailCard
                icon={<Target className="h-5 w-5 text-indigo-600" />}
                title="Profile Source"
                value={profile?.profileSource || "Backend Profile Service"}
              />

              <DetailCard
                icon={<Award className="h-5 w-5 text-indigo-600" />}
                title="Experience"
                value={
                  profile?.yearsOfExperience !== undefined
                    ? `${profile.yearsOfExperience} years`
                    : "Not provided"
                }
              />

              <DetailCard
                icon={<User className="h-5 w-5 text-indigo-600" />}
                title="Department / Context"
                value={
                  profile?.role === "ADMIN"
                    ? profile?.department || "Not provided"
                    : normalizeArray(profile?.preferredJobRoles).join(", ") ||
                      "Not provided"
                }
              />
            </div>
          </div>

          <div className="space-y-6">
            <TagSection
              title="Skills"
              icon={<Award className="h-5 w-5 text-indigo-600" />}
              items={skills}
            />

            {profile?.role === "USER" ? (
              <>
                <TagSection
                  title="Preferred Job Roles"
                  icon={<Target className="h-5 w-5 text-indigo-600" />}
                  items={preferredJobRoles}
                />
                <TagSection
                  title="Domains"
                  icon={<Briefcase className="h-5 w-5 text-indigo-600" />}
                  items={domains}
                />
              </>
            ) : (
              <>
                <TagSection
                  title="Responsibilities"
                  icon={<Target className="h-5 w-5 text-indigo-600" />}
                  items={responsibilities}
                />
                <TagSection
                  title="Permissions"
                  icon={<Shield className="h-5 w-5 text-indigo-600" />}
                  items={permissions}
                />
              </>
            )}

            <TagSection
              title="Certifications"
              icon={<CheckCircle2 className="h-5 w-5 text-indigo-600" />}
              items={certifications}
            />

            <TagSection
              title="Achievements"
              icon={<Sparkles className="h-5 w-5 text-indigo-600" />}
              items={achievements}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryStatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function DetailCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-slate-700">{value}</p>
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
    <div className="rounded-3xl border border-slate-100 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${title}-${item}-${index}`}
              className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No {title.toLowerCase()} available.</p>
      )}
    </div>
  );
}