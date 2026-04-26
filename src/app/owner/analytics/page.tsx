"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  TrendingUp,
  Users,
  Building2,
  Shield,
  BarChart3,
  LineChart,
  Loader2,
} from "lucide-react";
import { getStoredAccessToken } from "../../../types/auth";

type AnalyticsData = {
  totalUsers: number;
  totalCompanies: number;
  totalAdmins: number;
  userGrowth: number;
  companyGrowth: number;
  adminGrowth: number;
  activeUsers: number;
  inactiveUsers: number;
};

function formatGrowth(value: number) {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return "0%";
  }

  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function growthBadgeColor(value: number) {
  return value >= 0 ? "text-green-600" : "text-red-600";
}

export default function OwnerAnalyticsPage() {
  const backendBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      "http://localhost:8080"
    );
  }, []);

  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalUsers: 0,
    totalCompanies: 0,
    totalAdmins: 0,
    userGrowth: 0,
    companyGrowth: 0,
    adminGrowth: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      setError("Authentication token missing. Please log in again.");
      return;
    }

    async function loadAnalytics() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${backendBaseUrl}/api/owner/dashboard/analytics`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.message || "Failed to load analytics.");
        }

        const data = json?.data || {};
        setAnalytics({
          totalUsers: data.totalUsers || 0,
          totalCompanies: data.totalCompanies || 0,
          totalAdmins: data.totalAdmins || 0,
          userGrowth: data.userGrowth || 0,
          companyGrowth: data.companyGrowth || 0,
          adminGrowth: data.adminGrowth || 0,
          activeUsers: data.activeUsers || 0,
          inactiveUsers: data.inactiveUsers || 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load analytics.");
      } finally {
        setLoading(false);
      }
    }

    void loadAnalytics();
  }, [backendBaseUrl]);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-2 text-slate-600">
            Platform analytics and insights for better decision making.
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
        ) : (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-blue-50 text-blue-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Total Users</h3>
                    <p className="text-sm text-slate-500">Registered users</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{analytics.totalUsers.toLocaleString()}</div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className={`h-4 w-4 ${growthBadgeColor(analytics.userGrowth)}`} />
                  <span className={`${growthBadgeColor(analytics.userGrowth)} font-semibold`}>
                    {formatGrowth(analytics.userGrowth)}
                  </span>
                  <span className="text-slate-500">from last month</span>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-50 text-green-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Total Companies</h3>
                    <p className="text-sm text-slate-500">Registered companies</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{analytics.totalCompanies.toLocaleString()}</div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className={`h-4 w-4 ${growthBadgeColor(analytics.companyGrowth)}`} />
                  <span className={`${growthBadgeColor(analytics.companyGrowth)} font-semibold`}>
                    {formatGrowth(analytics.companyGrowth)}
                  </span>
                  <span className="text-slate-500">from last month</span>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-amber-50 text-amber-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Total Admins</h3>
                    <p className="text-sm text-slate-500">Admin accounts</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{analytics.totalAdmins.toLocaleString()}</div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className={`h-4 w-4 ${growthBadgeColor(analytics.adminGrowth)}`} />
                  <span className={`${growthBadgeColor(analytics.adminGrowth)} font-semibold`}>
                    {formatGrowth(analytics.adminGrowth)}
                  </span>
                  <span className="text-slate-500">from last month</span>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-purple-50 text-purple-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Active Users</h3>
                    <p className="text-sm text-slate-500">Currently active</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-2">{analytics.activeUsers.toLocaleString()}</div>
                <div className="text-sm text-slate-500">
                  {((analytics.activeUsers / analytics.totalUsers) * 100).toFixed(1)}% of total users
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-indigo-50 text-indigo-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">User Distribution</h3>
                    <p className="text-sm text-slate-500">Active vs Inactive users</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-sm text-slate-600">Active Users</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{analytics.activeUsers}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(analytics.activeUsers / analytics.totalUsers) * 100}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-sm text-slate-600">Inactive Users</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{analytics.inactiveUsers}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${(analytics.inactiveUsers / analytics.totalUsers) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Trends */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-orange-50 text-orange-600 rounded-2xl w-12 h-12 flex items-center justify-center">
                  <LineChart className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Growth Trends</h3>
                  <p className="text-sm text-slate-500">Monthly growth percentages</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">+{analytics.userGrowth}%</div>
                  <div className="text-sm text-slate-600">User Growth</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">+{analytics.companyGrowth}%</div>
                  <div className="text-sm text-slate-600">Company Growth</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600 mb-2">+{analytics.adminGrowth}%</div>
                  <div className="text-sm text-slate-600">Admin Growth</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}