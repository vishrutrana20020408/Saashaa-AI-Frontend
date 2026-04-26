"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Users,
  Shield,
  Clock3,
  ArrowRight,
  X,
  Loader2,
  Mail,
  Phone,
} from "lucide-react";
import { getStoredAccessToken } from "../../../types/auth";

type CompanyDetail = {
  companyId: string;
  companyName: string;
  companyType: string;
  contactPersonName: string;
  email: string;
  mobileNumber: string;
  registeredAt: string;
  liveDays: number;
  status: string;
};

function formatFriendlyDate(dateString: string) {
  try {
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return dateString;
    return parsed.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

function formatTimeAgo(dateString: string) {
  try {
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return dateString;
    const now = new Date();
    const diffMs = now.getTime() - parsed.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  } catch {
    return dateString;
  }
}

function getToken() {
  if (typeof window === "undefined") return "";
  return getStoredAccessToken() || "";
}

export default function OwnerCompaniesPage() {
  const backendBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      "http://localhost:8080"
    );
  }, []);

  const [companies, setCompanies] = useState<CompanyDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Authentication token missing. Please log in again.");
      return;
    }

    async function loadCompanies() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${backendBaseUrl}/api/owner/dashboard/companies`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.message || "Failed to load companies.");
        }

        setCompanies((json?.data ?? []) as CompanyDetail[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load companies.");
      } finally {
        setLoading(false);
      }
    }

    void loadCompanies();
  }, [backendBaseUrl]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Companies</h1>
          <p className="mt-2 text-slate-600">
            Manage and view all registered companies on the platform.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-96 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
            No companies registered yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company, index) => (
              <div key={company.companyId} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-blue-50 text-blue-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{company.companyName}</h3>
                    <p className="text-sm text-slate-500">{company.companyType}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="h-4 w-4" />
                    <span>{company.contactPersonName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4" />
                    <span>{company.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4" />
                    <span>{company.mobileNumber}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="text-sm text-slate-500">
                    Registered {formatTimeAgo(company.registeredAt)}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    {company.liveDays} days live
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}