"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Clock3,
  GraduationCap,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  User,
  Award,
  Target,
  Sparkles,
  FileText,
} from "lucide-react";

type ProfileRole = "USER" | "ADMIN";

type GenericApiResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

type ExperienceItem = {
  title?: string;
  role?: string;
  company?: string;
  organization?: string;
  employmentType?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  currentlyWorking?: boolean;
  description?: string;
  technologies?: string[] | string;
};

type EducationItem = {
  institution?: string;
  university?: string;
  degree?: string;
  specialization?: string;
  startYear?: string | number;
  endYear?: string | number;
  graduationYear?: string | number;
  cgpa?: string | number;
  percentage?: string | number;
  description?: string;
};

type ExperienceProfile = {
  id?: number;
  role: ProfileRole;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  currentRole?: string;
  currentCompany?: string;
  designation?: string;
  department?: string;
  companyName?: string;
  organizationName?: string;
  adminRole?: string;
  yearsOfExperience?: number;
  profileSource?: string;
  updatedAt?: string;

  university?: string;
  degree?: string;
  specialization?: string;
  graduationYear?: string | number;

  experiences?: ExperienceItem[] | string;
  workExperiences?: ExperienceItem[] | string;
  education?: EducationItem[] | string;
  educationHistory?: EducationItem[] | string;
  internships?: ExperienceItem[] | string;
  projects?: string[] | string;
  achievements?: string[] | string;
  responsibilities?: string[] | string;
};

type ProfileExperienceSectionProps = {
  title?: string;
  showHeader?: boolean;
  showRefreshButton?: boolean;
  className?: string;
  onRefresh?: (profile: ExperienceProfile) => void;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function ProfileExperienceSection({
  title = "Experience & Background",
  showHeader = true,
  showRefreshButton = true,
  className = "",
  onRefresh,
}: ProfileExperienceSectionProps) {
  const [profile, setProfile] = useState<ExperienceProfile | null>(null);
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

  const normalizeStringArray = (value?: string[] | string): string[] => {
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

  const parseExperienceArray = (value?: ExperienceItem[] | string): ExperienceItem[] => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value;
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const parseEducationArray = (value?: EducationItem[] | string): EducationItem[] => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value;
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
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

  const formatMonthYear = (value?: string) => {
    if (!value) return "Present";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };

  const buildProfile = useCallback(
    (payload: GenericApiResponse, fallbackRole: ProfileRole): ExperienceProfile => {
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
        currentCompany: readString(data.currentCompany, payload.currentCompany),
        designation: readString(data.designation, payload.designation),
        department: readString(data.department, payload.department),
        companyName: readString(data.companyName, payload.companyName),
        organizationName: readString(data.organizationName, payload.organizationName),
        adminRole: readString(data.adminRole, payload.adminRole),
        yearsOfExperience: readNumber(
          data.yearsOfExperience,
          payload.yearsOfExperience
        ),
        profileSource: readString(data.profileSource, payload.profileSource),
        updatedAt: readString(data.updatedAt, payload.updatedAt),

        university: readString(data.university, payload.university),
        degree: readString(data.degree, payload.degree),
        specialization: readString(data.specialization, payload.specialization),
        graduationYear:
          readString(data.graduationYear, payload.graduationYear) ??
          readNumber(data.graduationYear, payload.graduationYear),

        experiences:
          (data.experiences as ExperienceItem[] | string) ??
          (payload.experiences as ExperienceItem[] | string),
        workExperiences:
          (data.workExperiences as ExperienceItem[] | string) ??
          (payload.workExperiences as ExperienceItem[] | string),
        education:
          (data.education as EducationItem[] | string) ??
          (payload.education as EducationItem[] | string),
        educationHistory:
          (data.educationHistory as EducationItem[] | string) ??
          (payload.educationHistory as EducationItem[] | string),
        internships:
          (data.internships as ExperienceItem[] | string) ??
          (payload.internships as ExperienceItem[] | string),
        projects:
          (data.projects as string[] | string) ??
          (payload.projects as string[] | string),
        achievements:
          (data.achievements as string[] | string) ??
          (payload.achievements as string[] | string),
        responsibilities:
          (data.responsibilities as string[] | string) ??
          (payload.responsibilities as string[] | string),
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
                setSuccessMessage("Experience section refreshed successfully.");
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

        throw new Error("No authenticated experience profile found.");
      } catch (err) {
        console.error("Failed to load profile experience section:", err);
        setProfile(null);
        setError("Unable to load experience information from backend.");
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
      ? profile?.designation || profile?.adminRole || "Admin"
      : profile?.currentRole || "User";

  const organization =
    profile?.role === "ADMIN"
      ? profile?.organizationName || profile?.companyName || "Not provided"
      : profile?.currentCompany || "Not provided";

  const experiences = useMemo(() => {
    const primary = parseExperienceArray(profile?.workExperiences);
    const fallback = parseExperienceArray(profile?.experiences);
    return primary.length > 0 ? primary : fallback;
  }, [profile?.workExperiences, profile?.experiences]);

  const internships = useMemo(
    () => parseExperienceArray(profile?.internships),
    [profile?.internships]
  );

  const educationItems = useMemo(() => {
    const primary = parseEducationArray(profile?.educationHistory);
    const fallback = parseEducationArray(profile?.education);

    if (primary.length > 0) return primary;
    if (fallback.length > 0) return fallback;

    if (
      profile?.university ||
      profile?.degree ||
      profile?.specialization ||
      profile?.graduationYear
    ) {
      return [
        {
          university: profile.university,
          degree: profile.degree,
          specialization: profile.specialization,
          graduationYear: profile.graduationYear,
        },
      ];
    }

    return [];
  }, [
    profile?.educationHistory,
    profile?.education,
    profile?.university,
    profile?.degree,
    profile?.specialization,
    profile?.graduationYear,
  ]);

  const projects = normalizeStringArray(profile?.projects);
  const achievements = normalizeStringArray(profile?.achievements);
  const responsibilities = normalizeStringArray(profile?.responsibilities);

  const totalExperienceEntries = experiences.length + internships.length;
  const totalEducationEntries = educationItems.length;

  if (loading) {
    return (
      <section
        className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-5 w-28 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl border border-slate-100 bg-slate-50 p-5"
            >
              <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-4 w-64 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-[92%] animate-pulse rounded bg-slate-100" />
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
            <h3 className="font-semibold">Experience section load failed</h3>
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
                Backend-synced work history, education, projects, and professional background.
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
              icon={<Briefcase className="h-4 w-4" />}
              label="Primary Role"
              value={primaryRole}
            />
            <TopStatCard
              icon={<Building2 className="h-4 w-4" />}
              label="Organization"
              value={organization}
            />
            <TopStatCard
              icon={<Clock3 className="h-4 w-4" />}
              label="Experience"
              value={
                profile?.yearsOfExperience !== undefined
                  ? `${profile.yearsOfExperience} years`
                  : `${totalExperienceEntries} entries`
              }
            />
            <TopStatCard
              icon={<CalendarDays className="h-4 w-4" />}
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
            <SectionCard
              title="Work Experience"
              icon={<Briefcase className="h-5 w-5 text-indigo-600" />}
            >
              {experiences.length > 0 ? (
                <div className="space-y-4">
                  {experiences.map((item, index) => (
                    <ExperienceTimelineCard
                      key={`experience-${index}`}
                      item={item}
                      formatMonthYear={formatMonthYear}
                    />
                  ))}
                </div>
              ) : (
                <EmptyText text="No work experience available." />
              )}
            </SectionCard>

            <SectionCard
              title="Education"
              icon={<GraduationCap className="h-5 w-5 text-indigo-600" />}
            >
              {educationItems.length > 0 ? (
                <div className="space-y-4">
                  {educationItems.map((item, index) => (
                    <EducationCard key={`education-${index}`} item={item} />
                  ))}
                </div>
              ) : (
                <EmptyText text="No education history available." />
              )}
            </SectionCard>

            {internships.length > 0 && (
              <SectionCard
                title="Internships"
                icon={<Target className="h-5 w-5 text-indigo-600" />}
              >
                <div className="space-y-4">
                  {internships.map((item, index) => (
                    <ExperienceTimelineCard
                      key={`internship-${index}`}
                      item={item}
                      formatMonthYear={formatMonthYear}
                    />
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">
                Experience Summary
              </h3>

              <div className="mt-4 space-y-3">
                <CompactInfoRow label="Role Type" value={roleLabel} />
                <CompactInfoRow label="Primary Role" value={primaryRole} />
                <CompactInfoRow
                  label="Experience Entries"
                  value={String(totalExperienceEntries)}
                />
                <CompactInfoRow
                  label="Education Entries"
                  value={String(totalEducationEntries)}
                />
                <CompactInfoRow
                  label="Source"
                  value={profile?.profileSource || "Backend"}
                />
              </div>
            </div>

            <TagSection
              title="Projects"
              icon={<FileText className="h-5 w-5 text-indigo-600" />}
              items={projects}
              emptyText="No projects available."
            />

            <TagSection
              title="Achievements"
              icon={<Award className="h-5 w-5 text-indigo-600" />}
              items={achievements}
              emptyText="No achievements available."
            />

            {profile?.role === "ADMIN" && (
              <TagSection
                title="Responsibilities"
                icon={<Sparkles className="h-5 w-5 text-indigo-600" />}
                items={responsibilities}
                emptyText="No responsibilities available."
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ExperienceTimelineCard({
  item,
  formatMonthYear,
}: {
  item: ExperienceItem;
  formatMonthYear: (value?: string) => string;
}) {
  const title = item.title || item.role || "Role not specified";
  const company = item.company || item.organization || "Organization not specified";
  const duration = `${formatMonthYear(item.startDate)} - ${
    item.currentlyWorking ? "Present" : formatMonthYear(item.endDate)
  }`;

  const technologies =
    Array.isArray(item.technologies)
      ? item.technologies.map(String).filter(Boolean)
      : typeof item.technologies === "string"
      ? item.technologies
          .split(",")
          .map((tech) => tech.trim())
          .filter(Boolean)
      : [];

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {company}
            </span>
            {item.location && (
              <span className="inline-flex items-center gap-1">
                • {item.location}
              </span>
            )}
            {item.employmentType && (
              <span className="inline-flex items-center gap-1">
                • {item.employmentType}
              </span>
            )}
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
          <CalendarDays className="h-3.5 w-3.5" />
          {duration}
        </div>
      </div>

      {item.description && (
        <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>
      )}

      {technologies.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {technologies.map((tech, index) => (
            <span
              key={`${title}-${tech}-${index}`}
              className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EducationCard({ item }: { item: EducationItem }) {
  const institution = item.institution || item.university || "Institution not specified";
  const degree = item.degree || "Degree not specified";

  const yearText =
    item.graduationYear ||
    [item.startYear, item.endYear].filter(Boolean).join(" - ") ||
    "Year not specified";

  const meta: string[] = [];
  if (item.specialization) meta.push(item.specialization);
  if (item.cgpa !== undefined) meta.push(`CGPA: ${item.cgpa}`);
  if (item.percentage !== undefined) meta.push(`Percentage: ${item.percentage}`);

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900">{degree}</h4>
          <div className="mt-1 text-sm text-slate-600">{institution}</div>
          {meta.length > 0 && (
            <div className="mt-2 text-sm text-slate-600">{meta.join(" • ")}</div>
          )}
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
          <CalendarDays className="h-3.5 w-3.5" />
          {String(yearText)}
        </div>
      </div>

      {item.description && (
        <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>
      )}
    </div>
  );
}

function TagSection({
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
        <EmptyText text={emptyText} />
      )}
    </div>
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

function EmptyText({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}