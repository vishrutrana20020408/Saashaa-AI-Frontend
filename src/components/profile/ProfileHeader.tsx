"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Shield,
  Mail,
  MapPin,
  Briefcase,
  Building2,
  RefreshCw,
  Loader2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  CalendarDays,
  FileText,
} from "lucide-react";

type ProfileRole = "USER" | "ADMIN";

type GenericApiResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

type ResolvedProfile = {
  id?: number;
  role: ProfileRole;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  summary?: string;
  bio?: string;
  currentRole?: string;
  currentCompany?: string;
  designation?: string;
  department?: string;
  organizationName?: string;
  companyName?: string;
  employeeCode?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  profileCompletionPercentage?: number;
  completionPercentage?: number;
  updatedAt?: string;
  createdAt?: string;
  profileSource?: string;
};

type ProfileHeaderProps = {
  title?: string;
  subtitle?: string;
  showRefreshButton?: boolean;
  showEditButton?: boolean;
  showCompletion?: boolean;
  className?: string;
  onEdit?: () => void;
  onRefresh?: (profile: ResolvedProfile) => void;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function ProfileHeader({
  title,
  subtitle,
  showRefreshButton = true,
  showEditButton = true,
  showCompletion = true,
  className = "",
  onEdit,
  onRefresh,
}: ProfileHeaderProps) {
  const router = useRouter();

  const [profile, setProfile] = useState<ResolvedProfile | null>(null);
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
    (payload: GenericApiResponse, fallbackRole: ProfileRole): ResolvedProfile => {
      const data = (payload?.data || {}) as Record<string, unknown>;

      const firstName = readString(data.firstName, payload.firstName);
      const lastName = readString(data.lastName, payload.lastName);

      const fullName =
        readString(
          data.fullName,
          payload.fullName,
          [firstName, lastName].filter(Boolean).join(" ")
        ) || (fallbackRole === "ADMIN" ? "Admin Profile" : "User Profile");

      const roleText = readString(data.role, payload.role);
      const role: ProfileRole = roleText === "ADMIN" ? "ADMIN" : fallbackRole;

      return {
        id: readNumber(data.id, data.userId, data.adminId, payload.id),
        role,
        firstName,
        lastName,
        fullName,
        email: readString(data.email, payload.email),
        phone: readString(data.phone, payload.phone),
        location: readString(data.location, payload.location),
        headline: readString(data.headline, payload.headline),
        summary: readString(data.summary, payload.summary),
        bio: readString(data.bio, payload.bio),
        currentRole: readString(data.currentRole, payload.currentRole),
        currentCompany: readString(data.currentCompany, payload.currentCompany),
        designation: readString(data.designation, payload.designation),
        department: readString(data.department, payload.department),
        organizationName: readString(data.organizationName, payload.organizationName),
        companyName: readString(data.companyName, payload.companyName),
        employeeCode: readString(data.employeeCode, payload.employeeCode),
        website: readString(data.website, payload.website),
        linkedinUrl: readString(data.linkedinUrl, payload.linkedinUrl),
        githubUrl: readString(data.githubUrl, payload.githubUrl),
        portfolioUrl: readString(data.portfolioUrl, payload.portfolioUrl),
        profileCompletionPercentage: readNumber(
          data.profileCompletionPercentage,
          payload.profileCompletionPercentage
        ),
        completionPercentage: readNumber(
          data.completionPercentage,
          payload.completionPercentage
        ),
        updatedAt: readString(data.updatedAt, payload.updatedAt),
        createdAt: readString(data.createdAt, payload.createdAt),
        profileSource: readString(data.profileSource, payload.profileSource),
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
         * Backend-aware resolution for your Interview System architecture:
         * - Prefer dedicated profile endpoints
         * - Fall back to protected home endpoints
         * - Supports both user/admin profile flows
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
                setSuccessMessage("Profile refreshed successfully.");
              }

              if (onRefresh) {
                onRefresh(resolved);
              }

              return;
            }

            if ([401, 403, 404].includes(response.status)) {
              continue;
            }
          } catch {
            continue;
          }
        }

        throw new Error("No authenticated profile found.");
      } catch (err) {
        console.error("Failed to load profile header:", err);
        setProfile(null);
        setError("Unable to load profile information from backend.");
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

  const initials = useMemo(() => {
    const name = profile?.fullName?.trim() || "";
    if (!name) return "P";

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [profile?.fullName]);

  const effectiveTitle =
    title ||
    (profile?.role === "ADMIN" ? "Admin Profile" : "User Profile");

  const effectiveSubtitle =
    subtitle ||
    profile?.headline ||
    profile?.designation ||
    profile?.currentRole ||
    "Manage your profile information and backend-synced details.";

  const roleLabel = profile?.role === "ADMIN" ? "Admin" : "User";

  const organization =
    profile?.organizationName ||
    profile?.companyName ||
    profile?.currentCompany ||
    undefined;

  const roleOrDesignation =
    profile?.designation || profile?.currentRole || undefined;

  const completion =
    profile?.profileCompletionPercentage ?? profile?.completionPercentage ?? 0;

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
      return;
    }

    const fallbackPath =
      profile?.role === "ADMIN" ? "/admin/profile/edit" : "/user/profile/edit";

    router.push(fallbackPath);
  };

  if (loading) {
    return (
      <div
        className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}
      >
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100">
                <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
              </div>

              <div className="space-y-3">
                <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-72 animate-pulse rounded bg-slate-100" />
                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="h-8 w-32 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-8 w-36 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-8 w-28 animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-2.5 w-full animate-pulse rounded-full bg-slate-200" />
              <div className="mt-3 h-4 w-36 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div
        className={`overflow-hidden rounded-3xl border border-red-200 bg-white shadow-sm ${className}`}
      >
        <div className="p-6 md:p-8">
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold">Profile header load failed</h3>
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
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="bg-linear-to-r from-slate-900 via-slate-800 to-indigo-900 p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 min-h-[80px] min-w-[80px] items-center justify-center rounded-3xl bg-white/10 text-2xl font-bold text-white ring-1 ring-white/15 backdrop-blur-sm">
              {initials}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white md:text-3xl">
                  {profile?.fullName || effectiveTitle}
                </h1>

                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/10">
                  {profile?.role === "ADMIN" ? (
                    <Shield className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                  {roleLabel}
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
                {effectiveSubtitle}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {profile?.email && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/10">
                    <Mail className="h-3.5 w-3.5" />
                    {profile.email}
                  </span>
                )}

                {profile?.location && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/10">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.location}
                  </span>
                )}

                {roleOrDesignation && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/10">
                    <Briefcase className="h-3.5 w-3.5" />
                    {roleOrDesignation}
                  </span>
                )}

                {organization && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/10">
                    <Building2 className="h-3.5 w-3.5" />
                    {organization}
                  </span>
                )}

                {profile?.employeeCode && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/10">
                    <FileText className="h-3.5 w-3.5" />
                    {profile.employeeCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-3">
              {showRefreshButton && (
                <button
                  type="button"
                  onClick={() => fetchProfile(true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {refreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              )}

              {showEditButton && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </button>
              )}
            </div>

            {showCompletion && (
              <div className="w-full min-w-[260px] max-w-sm rounded-2xl bg-white/10 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/85">
                    Profile Completion
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {Math.min(Math.max(completion, 0), 100)}%
                  </span>
                </div>

                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-500"
                    style={{
                      width: `${Math.min(Math.max(completion, 0), 100)}%`,
                    }}
                  />
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Last updated: {formatDateTime(profile?.updatedAt)}
                </div>
              </div>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100 ring-1 ring-emerald-300/15">
            <CheckCircle2 className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {error && profile && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl bg-amber-500/15 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-300/15">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      <div className="grid gap-4 border-t border-slate-100 bg-slate-50 p-6 md:grid-cols-2 xl:grid-cols-4">
        <SummaryItem
          label="Profile Type"
          value={roleLabel}
          icon={profile?.role === "ADMIN" ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
        />

        <SummaryItem
          label="Primary Role"
          value={roleOrDesignation || "Not provided"}
          icon={<Briefcase className="h-4 w-4" />}
        />

        <SummaryItem
          label="Organization"
          value={organization || "Not provided"}
          icon={<Building2 className="h-4 w-4" />}
        />

        <SummaryItem
          label="Profile Source"
          value={profile?.profileSource || "Backend"}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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