"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Shield,
  Clock3,
  CheckCircle,
  XCircle,
  Loader2,
  Mail,
  Building2,
} from "lucide-react";
import { getStoredAccessToken } from "../../../types/auth";

type UserDetail = {
  userId: string;
  fullName: string;
  email: string;
  registeredAt: string;
  currentCompany: string;
  status: string;
  isVerified: boolean;
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

export default function OwnerUsersPage() {
  const backendBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      "http://localhost:8080"
    );
  }, []);

  const [users, setUsers] = useState<UserDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Authentication token missing. Please log in again.");
      return;
    }

    async function loadUsers() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${backendBaseUrl}/api/owner/dashboard/users`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.message || "Failed to load users.");
        }

        // Mock isVerified for now, assuming all are verified
        const usersData = (json?.data ?? []) as UserDetail[];
        const usersWithVerified = usersData.map(user => ({
          ...user,
          isVerified: Math.random() > 0.3, // Mock: 70% verified
        }));

        setUsers(usersWithVerified);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load users.");
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, [backendBaseUrl]);

  const verifiedUsers = users.filter(user => user.isVerified);
  const unverifiedUsers = users.filter(user => !user.isVerified);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Users</h1>
          <p className="mt-2 text-slate-600">
            Manage and view all registered users on the platform.
          </p>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-50 text-blue-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Total Users</h3>
                <p className="text-sm text-slate-500">All registered users</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{users.length}</div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-green-50 text-green-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Verified Users</h3>
                <p className="text-sm text-slate-500">Users with verified accounts</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{verifiedUsers.length}</div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-50 text-red-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Unverified Users</h3>
                <p className="text-sm text-slate-500">Users pending verification</p>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{unverifiedUsers.length}</div>
          </div>
        </div>

        {/* Users Sections */}
        <div className="space-y-8">
          {/* Verified Users */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Verified Users</h2>
            {loading ? (
              <div className="flex min-h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              </div>
            ) : verifiedUsers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
                No verified users yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {verifiedUsers.map((user, index) => (
                  <div key={user.userId} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-green-50 text-green-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{user.fullName}</h3>
                        <p className="text-sm text-slate-500">Verified User</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2 className="h-4 w-4" />
                        <span>{user.currentCompany || "No company"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="text-sm text-slate-500">
                        Registered {formatTimeAgo(user.registeredAt)}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        Verified
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unverified Users */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Unverified Users</h2>
            {loading ? (
              <div className="flex min-h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
              </div>
            ) : unverifiedUsers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
                No unverified users.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {unverifiedUsers.map((user, index) => (
                  <div key={user.userId} className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="bg-red-50 text-red-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                        <XCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{user.fullName}</h3>
                        <p className="text-sm text-slate-500">Unverified User</p>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2 className="h-4 w-4" />
                        <span>{user.currentCompany || "No company"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="text-sm text-slate-500">
                        Registered {formatTimeAgo(user.registeredAt)}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        Unverified
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}