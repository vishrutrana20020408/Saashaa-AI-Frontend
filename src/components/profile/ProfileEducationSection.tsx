"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  School,
  CalendarDays,
  Award,
  BookOpen,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  User,
  Briefcase,
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

type EducationItem = {
  institution?: string;
  university?: string;
  school?: string;
  board?: string;
  degree?: string;
  specialization?: string;
  fieldOfStudy?: string;
  startYear?: string | number;
  endYear?: string | number;
  graduationYear?: string | number;
  cgpa?: string | number;
  percentage?: string | number;
  score?: string | number;
  location?: string;
  description?: string;
};

type EducationProfile = {
  id?: number;
  role: ProfileRole;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  currentRole?: string;
  designation?: string;
  currentCompany?: string;
  companyName?: string;
  organizationName?: string;
  adminRole?: string;
  yearsOfExperience?: number;
  profileSource?: string;
  updatedAt?: string;

  university?: string;
  school?: string;
  board?: string;
  degree?: string;
  specialization?: string;
  fieldOfStudy?: string;
  graduationYear?: string | number;
  cgpa?: string | number;
  percentage?: string | number;
  score?: string | number;

  education?: EducationItem[] | string;
  educationHistory?: EducationItem[] | string;
  certifications?: string[] | string;
  achievements?: string[] | string;
  domains?: string[] | string;
};

type ProfileEducationSectionProps = {
  title?: string;
  showHeader?: boolean;
  showRefreshButton?: boolean;
  className?: string;
  onRefresh?: (profile: EducationProfile) => void;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function ProfileEducationSection({
  title = "Education & Academic Background",
  showHeader = true,
  showRefreshButton = true,
  className = "",
  onRefresh,
}: ProfileEducationSectionProps) {
  const [profile, setProfile] = useState<EducationProfile | null>(null);
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

  const buildProfile = useCallback(
    (payload: GenericApiResponse, fallbackRole: ProfileRole): EducationProfile => {
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
        currentCompany: readString(data.currentCompany, payload.currentCompany),
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
        school: readString(data.school, payload.school),
        board: readString(data.board, payload.board),
        degree: readString(data.degree, payload.degree),
        specialization: readString(data.specialization, payload.specialization),
        fieldOfStudy: readString(data.fieldOfStudy, payload.fieldOfStudy),
        graduationYear:
          readString(data.graduationYear, payload.graduationYear) ??
          readNumber(data.graduationYear, payload.graduationYear),
        cgpa: readString(data.cgpa, payload.cgpa) ?? readNumber(data.cgpa, payload.cgpa),
        percentage:
          readString(data.percentage, payload.percentage) ??
          readNumber(data.percentage, payload.percentage),
        score: readString(data.score, payload.score) ?? readNumber(data.score, payload.score),

        education:
          (data.education as EducationItem[] | string) ??
          (payload.education as EducationItem[] | string),
        educationHistory:
          (data.educationHistory as EducationItem[] | string) ??
          (payload.educationHistory as EducationItem[] | string),
        certifications:
          (data.certifications as string[] | string) ??
          (payload.certifications as string[] | string),
        achievements:
          (data.achievements as string[] | string) ??
          (payload.achievements as string[] | string),
        domains:
          (data.domains as string[] | string) ?? (payload.domains as string[] | string),
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
                setSuccessMessage("Education section refreshed successfully.");
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

        throw new Error("No authenticated education profile found.");
      } catch (err) {
        console.error("Failed to load profile education section:", err);
        setProfile(null);
        setError("Unable to load education information from backend.");
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

  const educationItems = useMemo(() => {
    const primary = parseEducationArray(profile?.educationHistory);
    const fallback = parseEducationArray(profile?.education);

    if (primary.length > 0) return primary;
    if (fallback.length > 0) return fallback;

    if (
      profile?.university ||
      profile?.school ||
      profile?.board ||
      profile?.degree ||
      profile?.specialization ||
      profile?.fieldOfStudy ||
      profile?.graduationYear ||
      profile?.cgpa ||
      profile?.percentage ||
      profile?.score
    ) {
      return [
        {
          university: profile.university,
          school: profile.school,
          board: profile.board,
          degree: profile.degree,
          specialization: profile.specialization,
          fieldOfStudy: profile.fieldOfStudy,
          graduationYear: profile.graduationYear,
          cgpa: profile.cgpa,
          percentage: profile.percentage,
          score: profile.score,
        },
      ];
    }

    return [];
  }, [
    profile?.educationHistory,
    profile?.education,
    profile?.university,
    profile?.school,
    profile?.board,
    profile?.degree,
    profile?.specialization,
    profile?.fieldOfStudy,
    profile?.graduationYear,
    profile?.cgpa,
    profile?.percentage,
    profile?.score,
  ]);

  const certifications = normalizeStringArray(profile?.certifications);
  const achievements = normalizeStringArray(profile?.achievements);
  const domains = normalizeStringArray(profile?.domains);

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
              <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-4 w-60 animate-pulse rounded bg-slate-100" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-[90%] animate-pulse rounded bg-slate-100" />
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
            <h3 className="font-semibold">Education section load failed</h3>
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
                Backend-synced academic history, qualifications, and educational achievements.
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
              icon={<GraduationCap className="h-4 w-4" />}
              label="Education Entries"
              value={String(totalEducationEntries)}
            />
            <TopStatCard
              icon={<Sparkles className="h-4 w-4" />}
              label="Profile"
              value={profile?.fullName || "Profile"}
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
              title="Academic History"
              icon={<GraduationCap className="h-5 w-5 text-indigo-600" />}
            >
              {educationItems.length > 0 ? (
                <div className="space-y-4">
                  {educationItems.map((item, index) => (
                    <EducationCard key={`education-${index}`} item={item} />
                  ))}
                </div>
              ) : (
                <EmptyText text="No academic history available." />
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">
                Education Summary
              </h3>

              <div className="mt-4 space-y-3">
                <CompactInfoRow label="Role Type" value={roleLabel} />
                <CompactInfoRow label="Primary Role" value={primaryRole} />
                <CompactInfoRow
                  label="Academic Records"
                  value={String(totalEducationEntries)}
                />
                <CompactInfoRow
                  label="Source"
                  value={profile?.profileSource || "Backend"}
                />
              </div>
            </div>

            <TagSection
              title="Certifications"
              icon={<Award className="h-5 w-5 text-indigo-600" />}
              items={certifications}
              emptyText="No certifications available."
            />

            <TagSection
              title="Academic Achievements"
              icon={<Sparkles className="h-5 w-5 text-indigo-600" />}
              items={achievements}
              emptyText="No academic achievements available."
            />

            <TagSection
              title="Domains / Areas of Study"
              icon={<BookOpen className="h-5 w-5 text-indigo-600" />}
              items={domains}
              emptyText="No education domains available."
            />
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

function EducationCard({ item }: { item: EducationItem }) {
  const institution =
    item.institution || item.university || item.school || "Institution not specified";

  const degree =
    item.degree || item.fieldOfStudy || item.specialization || "Qualification not specified";

  const yearText =
    item.graduationYear ||
    [item.startYear, item.endYear].filter(Boolean).join(" - ") ||
    "Year not specified";

  const meta: string[] = [];
  if (item.specialization) meta.push(item.specialization);
  if (item.fieldOfStudy && item.fieldOfStudy !== item.specialization) {
    meta.push(item.fieldOfStudy);
  }
  if (item.board) meta.push(`Board: ${item.board}`);
  if (item.cgpa !== undefined) meta.push(`CGPA: ${item.cgpa}`);
  if (item.percentage !== undefined) meta.push(`Percentage: ${item.percentage}`);
  if (item.score !== undefined && item.score !== item.percentage) {
    meta.push(`Score: ${item.score}`);
  }
  if (item.location) meta.push(item.location);

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900">{degree}</h4>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <School className="h-4 w-4" />
            <span>{institution}</span>
          </div>
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