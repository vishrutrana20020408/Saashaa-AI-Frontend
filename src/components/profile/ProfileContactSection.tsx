"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Github,
  Briefcase,
  Building2,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Shield,
  ExternalLink,
} from "lucide-react";

type ProfileRole = "USER" | "ADMIN";

type GenericApiResponse = {
  success?: boolean;
  message?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

type ContactProfile = {
  id?: number;
  role: ProfileRole;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  headline?: string;
  currentRole?: string;
  designation?: string;
  currentCompany?: string;
  companyName?: string;
  organizationName?: string;
  website?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  updatedAt?: string;
};

type ProfileContactSectionProps = {
  title?: string;
  showHeader?: boolean;
  showRefreshButton?: boolean;
  className?: string;
  onRefresh?: (profile: ContactProfile) => void;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function ProfileContactSection({
  title = "Contact Information",
  showHeader = true,
  showRefreshButton = true,
  className = "",
  onRefresh,
}: ProfileContactSectionProps) {
  const [profile, setProfile] = useState<ContactProfile | null>(null);
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

  const normalizeUrl = (value?: string) => {
    if (!value) return undefined;
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value;
    }
    return `https://${value}`;
  };

  const buildProfile = useCallback(
    (payload: GenericApiResponse, fallbackRole: ProfileRole): ContactProfile => {
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
        phone: readString(data.phone, payload.phone),
        alternatePhone: readString(data.alternatePhone, payload.alternatePhone),
        location: readString(data.location, payload.location),
        city: readString(data.city, payload.city),
        state: readString(data.state, payload.state),
        country: readString(data.country, payload.country),
        headline: readString(data.headline, payload.headline),
        currentRole: readString(data.currentRole, payload.currentRole),
        designation: readString(data.designation, payload.designation),
        currentCompany: readString(data.currentCompany, payload.currentCompany),
        companyName: readString(data.companyName, payload.companyName),
        organizationName: readString(data.organizationName, payload.organizationName),
        website: readString(data.website, payload.website),
        portfolioUrl: readString(data.portfolioUrl, payload.portfolioUrl),
        linkedinUrl: readString(data.linkedinUrl, payload.linkedinUrl),
        githubUrl: readString(data.githubUrl, payload.githubUrl),
        updatedAt: readString(data.updatedAt, payload.updatedAt),
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
         * 1. User/Admin profile endpoints
         * 2. Fallback to protected home endpoints
         * 3. Supports shared profile section usage across user/admin modules
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
                setSuccessMessage("Contact information refreshed successfully.");
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

        throw new Error("No authenticated profile contact data found.");
      } catch (err) {
        console.error("Failed to load profile contact section:", err);
        setProfile(null);
        setError("Unable to load contact information from backend.");
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

  const positionText =
    profile?.designation ||
    profile?.currentRole ||
    profile?.headline ||
    "Not provided";

  const organizationText =
    profile?.organizationName ||
    profile?.companyName ||
    profile?.currentCompany ||
    "Not provided";

  const fullLocation = useMemo(() => {
    if (profile?.location) return profile.location;

    const parts = [profile?.city, profile?.state, profile?.country]
      .filter(Boolean)
      .map((part) => String(part).trim());

    return parts.length > 0 ? parts.join(", ") : "Not provided";
  }, [profile?.location, profile?.city, profile?.state, profile?.country]);

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

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="mt-3 h-5 w-40 animate-pulse rounded bg-slate-100" />
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
            <h3 className="font-semibold">Contact section load failed</h3>
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
                Backend-synced communication and professional contact details.
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
            <div className="grid gap-4 md:grid-cols-2">
              <ContactInfoCard
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={profile?.email}
                href={profile?.email ? `mailto:${profile.email}` : undefined}
                external={false}
              />

              <ContactInfoCard
                icon={<Phone className="h-4 w-4" />}
                label="Primary Phone"
                value={profile?.phone}
                href={profile?.phone ? `tel:${profile.phone}` : undefined}
                external={false}
              />

              <ContactInfoCard
                icon={<Phone className="h-4 w-4" />}
                label="Alternate Phone"
                value={profile?.alternatePhone}
                href={
                  profile?.alternatePhone ? `tel:${profile.alternatePhone}` : undefined
                }
                external={false}
              />

              <ContactInfoCard
                icon={<MapPin className="h-4 w-4" />}
                label="Location"
                value={fullLocation}
              />

              <ContactInfoCard
                icon={<Briefcase className="h-4 w-4" />}
                label="Current Role"
                value={positionText}
              />

              <ContactInfoCard
                icon={<Building2 className="h-4 w-4" />}
                label="Organization"
                value={organizationText}
              />
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">
                Contact Summary
              </h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SummaryItem
                  label="Profile Name"
                  value={profile?.fullName || "Not provided"}
                />
                <SummaryItem label="Profile Type" value={roleLabel} />
                <SummaryItem label="Professional Role" value={positionText} />
                <SummaryItem label="Company / Organization" value={organizationText} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">
                Professional Links
              </h3>

              <div className="mt-4 space-y-3">
                <ContactInfoCard
                  icon={<Globe className="h-4 w-4" />}
                  label="Website"
                  value={profile?.website}
                  href={normalizeUrl(profile?.website)}
                />

                <ContactInfoCard
                  icon={<Globe className="h-4 w-4" />}
                  label="Portfolio"
                  value={profile?.portfolioUrl}
                  href={normalizeUrl(profile?.portfolioUrl)}
                />

                <ContactInfoCard
                  icon={<Linkedin className="h-4 w-4" />}
                  label="LinkedIn"
                  value={profile?.linkedinUrl}
                  href={normalizeUrl(profile?.linkedinUrl)}
                />

                <ContactInfoCard
                  icon={<Github className="h-4 w-4" />}
                  label="GitHub"
                  value={profile?.githubUrl}
                  href={normalizeUrl(profile?.githubUrl)}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <h3 className="text-lg font-semibold text-slate-900">
                Sync Information
              </h3>

              <div className="mt-4 space-y-3">
                <CompactItem label="Source" value="Backend Profile Service" />
                <CompactItem label="Role Context" value={roleLabel} />
                <CompactItem
                  label="Last Updated"
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

function ContactInfoCard({
  icon,
  label,
  value,
  href,
  external = true,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  href?: string;
  external?: boolean;
}) {
  const hasValue = Boolean(value && value.trim());

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>

      {hasValue && href ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="mt-2 flex items-center gap-2 break-all text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 hover:underline"
        >
          <span>{value}</span>
          {external && <ExternalLink className="h-3.5 w-3.5 shrink-0" />}
        </a>
      ) : (
        <p className="mt-2 wrap-break-word text-sm font-semibold text-slate-900">
          {hasValue ? value : "Not provided"}
        </p>
      )}
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function CompactItem({
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