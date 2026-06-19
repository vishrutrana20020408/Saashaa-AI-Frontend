"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, Check, X, RefreshCw } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

function normalizeRole(role?: string) {
  return (role || "").toUpperCase().replace("ROLE_", "");
}

function unwrap<T>(value: any): T | null {
  if (!value || typeof value !== "object") return null;
  return value.data ?? value.payload ?? value.result ?? value;
}

function getToken(): string {
  if (typeof window === "undefined") return "";

  const role = (localStorage.getItem("userRole") || localStorage.getItem("role") || "")
    .toUpperCase()
    .replace("ROLE_", "");

  const roleToken = role
    ? localStorage.getItem({ USER: "userToken", ADMIN: "adminToken", COMPANY: "companyToken", OWNER: "ownerToken" }[role] || "")
    : null;

  return (
    roleToken ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("userToken") ||
    localStorage.getItem("companyToken") ||
    localStorage.getItem("ownerToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwtToken") ||
    ""
  );
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  [
    "token",
    "authToken",
    "accessToken",
    "jwtToken",
    "adminToken",
    "userToken",
    "companyToken",
    "ownerToken",
    "role",
    "userRole",
    "userId",
    "adminId",
    "id",
    "authId",
    "email",
    "name",
    "fullName",
  ].forEach((key) => localStorage.removeItem(key));
}

type NotificationItem = {
  id?: number;
  title: string;
  subtitle: string;
  type?: string;
  createdAt?: string;
  isRead?: boolean;
};

type AuthMeResponse = {
  id?: string | number;
  adminId?: string | number;
  userRole?: string;
  role?: string;
  roles?: string[];
};

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [adminName, setAdminName] = useState("Admin");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsRefreshing(true);
    setError("");

    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load notifications.");
      }
      const payload = await response.json();
      const list = unwrap<NotificationItem[]>(payload) || [];
      setNotifications(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notifications.");
      setNotifications([]);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, []);

  const validateAdmin = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = unwrap<AuthMeResponse>(await response.json());
      if (!response.ok || !data) {
        throw new Error("Admin validation failed.");
      }
      const role = normalizeRole(data.userRole ?? data.role ?? data.roles?.[0]);
      if (role !== "ADMIN") {
        router.replace("/user");
        return;
      }
      setAdminName(String(data.adminId ?? data.id ?? "Admin"));
    } catch {
      clearStoredAuth();
      router.replace("/auth/login");
    }
  }, [router]);

  useEffect(() => {
    validateAdmin();
    fetchNotifications();
  }, [fetchNotifications, validateAdmin]);

  const markAllRead = async () => {
    try {
      const token = getToken();
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      await fetchNotifications();
    } catch {
      setError("Failed to update notification status.");
    }
  };

  const markAsRead = async (id?: number) => {
    if (!id) return;
    try {
      const token = getToken();
      await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      await fetchNotifications();
    } catch {
      setError("Failed to mark notification as read.");
    }
  };

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Notifications</h1>
              <p className="text-white/60 mt-2">
                Review job application alerts and track applicant details.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={fetchNotifications}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm text-white transition hover:bg-indigo-500"
              >
                <Check className="h-4 w-4" />
                Mark all as read
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {notifications.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
              No notifications yet.
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id ?? notification.title}
                className="rounded-3xl border border-white/10 bg-slate-900/80 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">{notification.type || "Notification"}</p>
                    <h2 className="mt-3 text-xl font-semibold text-white">{notification.title}</h2>
                  </div>
                  <div className="text-right text-sm text-white/60">
                    <p>{notification.createdAt ? new Date(notification.createdAt).toLocaleString() : "Just now"}</p>
                    <p className="mt-2 font-semibold text-white">
                      {notification.isRead ? "Read" : "Unread"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-white/70">{notification.subtitle}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {!notification.isRead ? (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
                    >
                      <Check className="h-4 w-4" />
                      Mark read
                    </button>
                  ) : null}
                  <button
                    onClick={() => router.push("/admin/jobs")}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                  >
                    <Bell className="h-4 w-4" />
                    View jobs
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
