"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Users,
  Shield,
  Clock3,
  CalendarDays,
  ArrowRight,
  X,
  Loader2,
  Activity,
} from "lucide-react";
import { getStoredAccessToken } from "../../types/auth";

type OwnerSummary = {
  totalCompanies: number;
  totalAdmins: number;
  totalUsers: number;
  lastUpdated?: string;
};

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

type AdminDetail = {
  adminId: string;
  fullName: string;
  email: string;
  registeredAt: string;
  currentCompany: string;
  status: string;
};

type UserDetail = {
  userId: string;
  fullName: string;
  email: string;
  registeredAt: string;
  currentCompany: string;
  status: string;
};

type CardType = "companies" | "admins" | "users";

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

export default function OwnerPage() {
  const backendBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      "http://localhost:8080"
    );
  }, []);

  const [summary, setSummary] = useState<OwnerSummary>({
    totalCompanies: 0,
    totalAdmins: 0,
    totalUsers: 0,
  });
  const [companies, setCompanies] = useState<CompanyDetail[]>([]);
  const [admins, setAdmins] = useState<AdminDetail[]>([]);
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const stats = [
    {
      icon: <Users className="h-6 w-6" />,
      label: "Total Registrations",
      value: (summary.totalCompanies + summary.totalAdmins + summary.totalUsers).toString(),
      description: "Total registrations across all roles.",
      cardKey: null,
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: <Building2 className="h-6 w-6" />,
      label: "Registered Companies",
      value: summary.totalCompanies.toString(),
      description: "Companies registered on the platform.",
      cardKey: "companies" as CardType,
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      label: "Registered Admins",
      value: summary.totalAdmins.toString(),
      description: "Admin accounts with dashboard access.",
      cardKey: "admins" as CardType,
      color: "bg-amber-50 text-amber-600",
    },
    {
      icon: <Users className="h-6 w-6" />,
      label: "Registered Users",
      value: summary.totalUsers.toString(),
      description: "Active users on the platform.",
      cardKey: "users" as CardType,
      color: "bg-green-50 text-green-600",
    },
  ];

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Authentication token missing. Please log in again.");
      return;
    }

    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const [summaryResponse, companiesResponse, adminsResponse, usersResponse] = await Promise.all([
          fetch(`${backendBaseUrl}/api/owner/dashboard/summary`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
          fetch(`${backendBaseUrl}/api/owner/dashboard/companies`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
          fetch(`${backendBaseUrl}/api/owner/dashboard/admins`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
          fetch(`${backendBaseUrl}/api/owner/dashboard/users`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }),
        ]);

        const summaryJson = await summaryResponse.json();
        const companiesJson = await companiesResponse.json();
        const adminsJson = await adminsResponse.json();
        const usersJson = await usersResponse.json();

        if (!summaryResponse.ok) {
          throw new Error(summaryJson?.message || "Failed to load dashboard summary.");
        }
        if (!companiesResponse.ok) {
          throw new Error(companiesJson?.message || "Failed to load companies.");
        }
        if (!adminsResponse.ok) {
          throw new Error(adminsJson?.message || "Failed to load admins.");
        }
        if (!usersResponse.ok) {
          throw new Error(usersJson?.message || "Failed to load users.");
        }

        setSummary({
          totalCompanies: Number(summaryJson?.data?.totalCompanies ?? 0),
          totalAdmins: Number(summaryJson?.data?.totalAdmins ?? 0),
          totalUsers: Number(summaryJson?.data?.totalUsers ?? 0),
          lastUpdated: String(summaryJson?.data?.lastUpdated ?? ""),
        });
        setCompanies((companiesJson?.data ?? []) as CompanyDetail[]);
        setAdmins((adminsJson?.data ?? []) as AdminDetail[]);
        setUsers((usersJson?.data ?? []) as UserDetail[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load owner dashboard.");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [backendBaseUrl]);

  // Handle modal closing
  useEffect(() => {
    if (!showModal) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowModal(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const modal = document.querySelector('[data-modal="owner-details"]');
      if (modal && !modal.contains(event.target as Node)) {
        setShowModal(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModal]);

  const detailItems = selectedCard === "companies" ? companies : selectedCard === "admins" ? admins : users;
  const detailTitle =
    selectedCard === "companies"
      ? "Company details"
      : selectedCard === "admins"
      ? "Admin details"
      : "User details";

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Owner Dashboard</h1>
          <p className="mt-2 text-slate-600">
            See the latest counts and click a card to review registered companies, admins, or users.
          </p>
          {summary.lastUpdated ? (
            <p className="mt-1 text-sm text-slate-500">Last updated: {summary.lastUpdated}</p>
          ) : null}
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat) => (
            stat.cardKey ? (
              <button
                key={stat.label}
                type="button"
                onClick={() => {
                  setSelectedCard(stat.cardKey);
                  setShowModal(true);
                }}
                className="rounded-3xl bg-white p-4 md:p-6 text-left shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className={`${stat.color} rounded-2xl w-12 h-12 flex items-center justify-center mb-4`}>
                  {stat.icon}
                </div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl md:text-4xl font-bold text-slate-900 mt-3">{stat.value}</p>
                <p className="mt-4 text-sm text-slate-600">{stat.description}</p>
              </button>
            ) : (
              <div
                key={stat.label}
                className="rounded-3xl bg-white p-4 md:p-6 text-left shadow-sm border border-slate-100"
              >
                <div className={`${stat.color} rounded-2xl w-12 h-12 flex items-center justify-center mb-4`}>
                  {stat.icon}
                </div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl md:text-4xl font-bold text-slate-900 mt-3">{stat.value}</p>
                <p className="mt-4 text-sm text-slate-600">{stat.description}</p>
              </div>
            )
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Link
              href="/owner/companies"
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-blue-50 text-blue-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Companies</h3>
                  <p className="text-sm text-slate-500">Manage registered companies</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-900">{summary.totalCompanies}</span>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
            </Link>

            <Link
              href="/owner/users"
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-green-50 text-green-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Users</h3>
                  <p className="text-sm text-slate-500">View and manage users</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-900">{summary.totalUsers}</span>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
            </Link>

            <Link
              href="/owner/analytics"
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-purple-50 text-purple-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Analytics</h3>
                  <p className="text-sm text-slate-500">Platform analytics and insights</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-900">View</span>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
            </Link>

            <Link
              href="/owner/admin"
              className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-amber-50 text-amber-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Admin</h3>
                  <p className="text-sm text-slate-500">Manage admin accounts</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-900">{summary.totalAdmins}</span>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-4 md:p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 transition-colors">
                Open companies list
              </button>
              <button className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200 transition-colors">
                Review admins
              </button>
              <button className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200 transition-colors">
                View users
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && selectedCard ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div data-modal="owner-details" className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 md:px-6 py-4 md:py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{detailTitle}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Showing {selectedCard === "users" ? "all users" : selectedCard === "admins" ? "all admins" : "all companies"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close details modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-140 overflow-y-auto px-4 md:px-6 py-4 md:py-5">
              {detailsLoading ? (
                <div className="flex min-h-75 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
                </div>
              ) : detailItems.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                  No details available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {detailItems.map((item, index) => (
                    <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            {selectedCard === "companies"
                              ? (item as CompanyDetail).companyName
                              : (item as AdminDetail).fullName || (item as UserDetail).fullName}
                          </p>
                          <p className="text-sm text-slate-500">
                            {selectedCard === "companies"
                              ? (item as CompanyDetail).companyType
                              : selectedCard === "admins"
                              ? (item as AdminDetail).email
                              : (item as UserDetail).email}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          <Clock3 className="h-4 w-4" />
                          Registered {formatTimeAgo(item.registeredAt)}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {selectedCard === "companies" ? (
                          <>
                            <div className="rounded-2xl bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Live Days</p>
                              <p className="mt-2 text-2xl font-semibold text-slate-900">{(item as CompanyDetail).liveDays}</p>
                            </div>
                            <div className="rounded-2xl bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Contact Person</p>
                              <p className="mt-2 text-sm text-slate-700">{(item as CompanyDetail).contactPersonName}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="rounded-2xl bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Company</p>
                              <p className="mt-2 text-sm text-slate-700">
                                {selectedCard === "users"
                                  ? (item as UserDetail).currentCompany
                                  : (item as AdminDetail).currentCompany}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                              <p className="mt-2 text-sm text-slate-700">
                                {selectedCard === "users"
                                  ? (item as UserDetail).status
                                  : (item as AdminDetail).status}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      {selectedCard === "companies" ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Company Details</p>
                          <p className="mt-2 text-sm text-slate-600">Email: {(item as CompanyDetail).email}</p>
                          <p className="mt-1 text-sm text-slate-600">Phone: {(item as CompanyDetail).mobileNumber}</p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
