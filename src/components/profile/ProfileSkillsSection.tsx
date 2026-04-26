"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Brain,
  Briefcase,
  Shield,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Sparkles,
  Layers3,
  BadgeCheck,
} from "lucide-react";

type ProfileRole = "USER" | "ADMIN";

type GenericApiResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

type SkillsProfile = {
  id?: number;
  role: ProfileRole;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  currentRole?: string;
  designation?: string;
  profileSource?: string;
  updatedAt?: string;

  skills?: string[] | string;
  technicalSkills?: string[] | string;
  softSkills?: string[] | string;
  toolsAndTechnologies?: string[] | string;
  certifications?: string[] | string;
  domains?: string[] | string;
  responsibilities?: string[] | string;
  permissions?: string[] | string;
  preferredJobRoles?: string[] | string;
};

type ProfileSkillsSectionProps = {
  title?: string;
  showHeader?: boolean;
  showRefreshButton?: boolean;
  className?: string;
  onRefresh?: (profile: SkillsProfile) => void;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function ProfileSkillsSection({
  title = "Skills & Expertise",
  showHeader = true,
  showRefreshButton = true,
  className = "",
  onRefresh,
}: ProfileSkillsSectionProps) {
  const [profile, setProfile] = useState<SkillsProfile | null>(null);
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
      return value
        .map((item) => String(item).trim())
        .filter(Boolean)
        .filter((item, index, arr) => arr.indexOf(item) === index);
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index);
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
    (payload: GenericApiResponse, fallbackRole: ProfileRole): SkillsProfile => {
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
        headline: readString(data.headline, payload.headline),
        currentRole: readString(data.currentRole, payload.currentRole),
        designation: readString(data.designation, payload.designation),
        profileSource: readString(data.profileSource, payload.profileSource),
        updatedAt: readString(data.updatedAt, payload.updatedAt),

        skills: (data.skills as string[] | string) ?? (payload.skills as string[] | string),
        technicalSkills:
          (data.technicalSkills as string[] | string) ??
          (payload.technicalSkills as string[] | string),
        softSkills:
          (data.softSkills as string[] | string) ??
          (payload.softSkills as string[] | string),
        toolsAndTechnologies:
          (data.toolsAndTechnologies as string[] | string) ??
          (payload.toolsAndTechnologies as string[] | string),
        certifications:
          (data.certifications as string[] | string) ??
          (payload.certifications as string[] | string),
        domains:
          (data.domains as string[] | string) ?? (payload.domains as string[] | string),
        responsibilities:
          (data.responsibilities as string[] | string) ??
          (payload.responsibilities as string[] | string),
        permissions:
          (data.permissions as string[] | string) ??
          (payload.permissions as string[] | string),
        preferredJobRoles:
          (data.preferredJobRoles as string[] | string) ??
          (payload.preferredJobRoles as string[] | string),
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
         * 1. dedicated profile/me endpoints
         * 2. generic profile endpoints
         * 3. protected home endpoints fallback
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
                setSuccessMessage("Skills section refreshed successfully.");
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

        throw new Error("No authenticated skills profile found.");
      } catch (err) {
        console.error("Failed to load profile skills section:", err);
        setProfile(null);
        setError("Unable to load skills information from backend.");
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

  const roleLabel = profile?.role === "ADMIN" ? "Admin" : "User";

  const primaryRole =
    profile?.role === "ADMIN"
      ? profile?.designation || "Admin"
      : profile?.currentRole || "User";

  const allSkills = normalizeArray(profile?.skills);
  const technicalSkills = normalizeArray(profile?.technicalSkills);
  const softSkills = normalizeArray(profile?.softSkills);
  const toolsAndTechnologies = normalizeArray(profile?.toolsAndTechnologies);
  const certifications = normalizeArray(profile?.certifications);
  const domains = normalizeArray(profile?.domains);
  const responsibilities = normalizeArray(profile?.responsibilities);
  const permissions = normalizeArray(profile?.permissions);
  const preferredJobRoles = normalizeArray(profile?.preferredJobRoles);

  const totalSkillItems = useMemo(() => {
    return (
      allSkills.length +
      technicalSkills.length +
      softSkills.length +
      toolsAndTechnologies.length +
      certifications.length +
      domains.length
    );
  }, [
    allSkills.length,
    technicalSkills.length,
    softSkills.length,
    toolsAndTechnologies.length,
    certifications.length,
    domains.length,
  ]);

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

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
            >
              <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((__, chipIndex) => (
                  <div
                    key={chipIndex}
                    className="h-8 w-20 animate-pulse rounded-full bg-slate-100"
                  />
                ))}
              </div>
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
            <h3 className="font-semibold">Skills section load failed</h3>
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
                Backend-synced skills, tools, certifications, and expertise areas.
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

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TopStatCard
              icon={<Sparkles className="h-4 w-4" />}
              label="Profile"
              value={profile?.fullName || "Profile"}
            />
            <TopStatCard
              icon={<Briefcase className="h-4 w-4" />}
              label="Primary Role"
              value={primaryRole}
            />
            <TopStatCard
              icon={<Layers3 className="h-4 w-4" />}
              label="Skill Entries"
              value={String(totalSkillItems)}
            />
            <TopStatCard
              icon={<BadgeCheck className="h-4 w-4" />}
              label="Last Updated"
              value={formatDateTime(profile?.updatedAt)}
            />
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
            <SkillCategoryCard
              title="Core Skills"
              icon={<Award className="h-5 w-5 text-indigo-600" />}
              items={allSkills}
              emptyText="No core skills available."
            />

            <div className="grid gap-6 md:grid-cols-2">
              <SkillCategoryCard
                title="Technical Skills"
                icon={<Brain className="h-5 w-5 text-indigo-600" />}
                items={technicalSkills}
                emptyText="No technical skills available."
              />

              <SkillCategoryCard
                title="Soft Skills"
                icon={<Sparkles className="h-5 w-5 text-indigo-600" />}
                items={softSkills}
                emptyText="No soft skills available."
              />

              <SkillCategoryCard
                title="Tools & Technologies"
                icon={<Layers3 className="h-5 w-5 text-indigo-600" />}
                items={toolsAndTechnologies}
                emptyText="No tools or technologies available."
              />

              <SkillCategoryCard
                title="Domains"
                icon={<Briefcase className="h-5 w-5 text-indigo-600" />}
                items={domains}
                emptyText="No domains available."
              />
            </div>
          </div>

          <div className="space-y-6">
            <SkillCategoryCard
              title="Certifications"
              icon={<BadgeCheck className="h-5 w-5 text-indigo-600" />}
              items={certifications}
              emptyText="No certifications available."
            />

            {profile?.role === "USER" ? (
              <SkillCategoryCard
                title="Preferred Job Roles"
                icon={<Briefcase className="h-5 w-5 text-indigo-600" />}
                items={preferredJobRoles}
                emptyText="No preferred job roles available."
              />
            ) : (
              <>
                <SkillCategoryCard
                  title="Responsibilities"
                  icon={<Layers3 className="h-5 w-5 text-indigo-600" />}
                  items={responsibilities}
                  emptyText="No responsibilities available."
                />

                <SkillCategoryCard
                  title="Permissions"
                  icon={<Shield className="h-5 w-5 text-indigo-600" />}
                  items={permissions}
                  emptyText="No permissions available."
                />
              </>
            )}

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">
                Skills Summary
              </h3>

              <div className="mt-4 space-y-3">
                <CompactInfoRow label="Role Type" value={roleLabel} />
                <CompactInfoRow label="Source" value={profile?.profileSource || "Backend"} />
                <CompactInfoRow label="Primary Context" value={primaryRole} />
                <CompactInfoRow
                  label="Last Synced"
                  value={formatDateTime(profile?.updatedAt)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TopStatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
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

function SkillCategoryCard({
  title,
  icon,
  items,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
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
        <p className="text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function CompactInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}