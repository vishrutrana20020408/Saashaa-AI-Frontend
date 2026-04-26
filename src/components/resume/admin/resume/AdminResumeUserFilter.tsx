"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Users,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Filter,
  X,
} from "lucide-react";

/**
 * AdminResumeUserFilter.tsx
 *
 * Purpose:
 * Filter resumes by user/candidate from admin side, integrated with backend.
 *
 * Expected backend endpoints:
 *
 * 1) GET /api/admin/users
 *    Optional query params:
 *    - page
 *    - size
 *    - search
 *    - sortBy
 *    - sortDir
 *
 * 2) GET /api/admin/resume
 *    Optional query params:
 *    - page
 *    - size
 *    - search
 *    - sortBy
 *    - sortDir
 *    - userId / candidateId / adminUserId   (component sends userId by default)
 *    - status                               (optional, only if selected)
 *
 * Supported response shapes:
 * - plain array
 * - spring pageable
 * - wrapped { data/result/payload/content: ... }
 *
 * This component:
 * - loads users from backend
 * - lets admin search/select one user
 * - fetches resumes for selected user
 * - returns selected user and resume list to parent
 */

type Nullable<T> = T | null | undefined;

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  result?: T;
  payload?: T;
  content?: T;
};

type PageResponse<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  items?: T[];
  rows?: T[];
  list?: T[];
};

type AdminUser = {
  userId?: number;
  id?: number;
  adminUserId?: number;
  candidateId?: number;
  userCode?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  location?: string | null;
  city?: string | null;
  currentRole?: string | null;
  designation?: string | null;
  totalResumes?: number | null;
  active?: boolean | null;
  enabled?: boolean | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ResumeVersionSummary = {
  resumeVersionId?: number;
  id?: number;
  versionCode?: string;
  versionName?: string;
  versionType?: string;
  atsScore?: number | null;
  isBaseVersion?: boolean;
  createdAt?: string;
  updatedAt?: string;
  fileUrl?: string | null;
  previewUrl?: string | null;
  jobApplicationCode?: string | null;
};

type ResumeItem = {
  resumeId?: number;
  id?: number;
  resumeCode?: string;
  userId?: number | null;
  candidateId?: number | null;
  title?: string | null;
  originalFileName?: string | null;
  fileName?: string | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  currentRole?: string | null;
  experienceLevel?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
  fileUrl?: string | null;
  previewUrl?: string | null;
  latestVersion?: ResumeVersionSummary | null;
  baseVersion?: ResumeVersionSummary | null;
  versions?: ResumeVersionSummary[];
  versionCount?: number | null;
};

type AdminResumeUserFilterProps = {
  apiBaseUrl?: string;
  pageSize?: number;
  resumePageSize?: number;
  userEndpoint?: string;
  resumeEndpoint?: string;
  userIdQueryParam?: string; // default: userId
  showResumeResults?: boolean;
  showSelectedUserCard?: boolean;
  className?: string;
  onUserSelect?: (user: AdminUser | null) => void;
  onResumesLoad?: (resumes: ResumeItem[]) => void;
};

function unwrapResponse<T>(value: T | ApiEnvelope<T>): T {
  if (value && typeof value === "object") {
    const obj = value as ApiEnvelope<T>;
    if (obj.data !== undefined) return obj.data;
    if (obj.result !== undefined) return obj.result;
    if (obj.payload !== undefined) return obj.payload;
    if (obj.content !== undefined) return obj.content;
  }
  return value as T;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    null
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      message = body?.message || body?.error || body?.details || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = await response.json();
  return unwrapResponse<T>(data);
}

function normalizePageResponse<T>(
  raw: T[] | PageResponse<T> | Record<string, unknown>,
  fallbackPage: number,
  fallbackSize: number
) {
  if (Array.isArray(raw)) {
    return {
      content: raw,
      totalElements: raw.length,
      totalPages: 1,
      number: 0,
      size: raw.length || fallbackSize,
    };
  }

  const maybePage = raw as PageResponse<T>;

  if (Array.isArray(maybePage.content)) {
    return {
      content: maybePage.content,
      totalElements: maybePage.totalElements ?? maybePage.content.length,
      totalPages: maybePage.totalPages ?? 1,
      number: maybePage.number ?? fallbackPage,
      size: maybePage.size ?? fallbackSize,
    };
  }

  const arr = maybePage.items || maybePage.rows || maybePage.list || [];

  return {
    content: arr,
    totalElements: maybePage.totalElements ?? arr.length,
    totalPages: maybePage.totalPages ?? 1,
    number: maybePage.number ?? fallbackPage,
    size: maybePage.size ?? fallbackSize,
  };
}

function safeText(value?: Nullable<string>, fallback = "—") {
  if (!value || !String(value).trim()) return fallback;
  return value;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function getUserId(user: AdminUser | null | undefined) {
  if (!user) return null;
  return user.userId ?? user.id ?? user.adminUserId ?? user.candidateId ?? null;
}

function getUserName(user: AdminUser | null | undefined) {
  if (!user) return "—";
  return (
    user.fullName ||
    user.name ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    "—"
  );
}

function getUserPhone(user: AdminUser | null | undefined) {
  if (!user) return "—";
  return user.phone || user.mobile || "—";
}

function getUserLocation(user: AdminUser | null | undefined) {
  if (!user) return "—";
  return user.location || user.city || "—";
}

function getUserRole(user: AdminUser | null | undefined) {
  if (!user) return "—";
  return user.currentRole || user.designation || "—";
}

function getUserStatus(user: AdminUser | null | undefined) {
  if (!user) return "UNKNOWN";
  if (user.status) return user.status;
  if (user.active === true || user.enabled === true) return "ACTIVE";
  if (user.active === false || user.enabled === false) return "INACTIVE";
  return "UNKNOWN";
}

function getResumeId(resume: ResumeItem) {
  return resume.resumeId ?? resume.id ?? null;
}

function getVersionCount(resume: ResumeItem) {
  if (resume.versionCount !== null && resume.versionCount !== undefined) {
    return resume.versionCount;
  }
  if (resume.versions) return resume.versions.length;
  let count = 0;
  if (resume.baseVersion) count += 1;
  if (resume.latestVersion) count += 1;
  return count || 1;
}

function getLatestVersion(resume: ResumeItem) {
  if (resume.latestVersion) return resume.latestVersion;
  if (resume.versions?.length) {
    return [...resume.versions].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    })[0];
  }
  return null;
}

function getAtsClass(score?: number | null) {
  if (score === null || score === undefined) {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }
  if (score >= 80) return "border-green-200 bg-green-100 text-green-700";
  if (score >= 60) return "border-yellow-200 bg-yellow-100 text-yellow-700";
  return "border-red-200 bg-red-100 text-red-700";
}

export default function AdminResumeUserFilter({
  apiBaseUrl = "",
  pageSize = 8,
  resumePageSize = 10,
  userEndpoint = "/api/admin/users",
  resumeEndpoint = "/api/admin/resume",
  userIdQueryParam = "userId",
  showResumeResults = true,
  showSelectedUserCard = true,
  className = "",
  onUserSelect,
  onResumesLoad,
}: AdminResumeUserFilterProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userSortBy, setUserSortBy] = useState("updatedAt");
  const [userSortDir, setUserSortDir] = useState("desc");
  const [userPage, setUserPage] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotalElements, setUserTotalElements] = useState(0);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [resumeStatus, setResumeStatus] = useState("ALL");
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [resumesError, setResumesError] = useState<string | null>(null);
  const [resumePage, setResumePage] = useState(0);
  const [resumeTotalPages, setResumeTotalPages] = useState(1);
  const [resumeTotalElements, setResumeTotalElements] = useState(0);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(userPage));
      params.set("size", String(pageSize));
      params.set("sortBy", userSortBy);
      params.set("sortDir", userSortDir);
      if (userSearch.trim()) params.set("search", userSearch.trim());

      const url = `${apiBaseUrl}${userEndpoint}?${params.toString()}`;

      const raw = await fetchJson<
        AdminUser[] | PageResponse<AdminUser> | Record<string, unknown>
      >(url);

      const normalized = normalizePageResponse<AdminUser>(
        raw,
        userPage,
        pageSize
      );

      setUsers(normalized.content || []);
      setUserTotalPages(Math.max(1, normalized.totalPages || 1));
      setUserTotalElements(normalized.totalElements || 0);
    } catch (err) {
      setUsers([]);
      setUserTotalPages(1);
      setUserTotalElements(0);
      setUsersError(
        err instanceof Error ? err.message : "Failed to load users."
      );
    } finally {
      setUsersLoading(false);
    }
  }, [apiBaseUrl, userEndpoint, userPage, pageSize, userSearch, userSortBy, userSortDir]);

  const loadUserResumes = useCallback(
    async (user: AdminUser | null, pageOverride?: number) => {
      if (!user) {
        setResumes([]);
        setResumeTotalPages(1);
        setResumeTotalElements(0);
        setResumesError(null);
        setResumesLoading(false);
        onResumesLoad?.([]);
        return;
      }

      const resolvedResumePage = pageOverride ?? resumePage;
      const selectedUserId = getUserId(user);

      if (selectedUserId === null || selectedUserId === undefined) {
        setResumes([]);
        setResumeTotalPages(1);
        setResumeTotalElements(0);
        setResumesError("Selected user does not have a valid user ID.");
        setResumesLoading(false);
        onResumesLoad?.([]);
        return;
      }

      setResumesLoading(true);
      setResumesError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(resolvedResumePage));
        params.set("size", String(resumePageSize));
        params.set("sortBy", "updatedAt");
        params.set("sortDir", "desc");
        params.set(userIdQueryParam, String(selectedUserId));

        if (resumeStatus !== "ALL") {
          params.set("status", resumeStatus);
        }

        const url = `${apiBaseUrl}${resumeEndpoint}?${params.toString()}`;

        const raw = await fetchJson<
          ResumeItem[] | PageResponse<ResumeItem> | Record<string, unknown>
        >(url);

        const normalized = normalizePageResponse<ResumeItem>(
          raw,
          resolvedResumePage,
          resumePageSize
        );

        const items = normalized.content || [];
        setResumes(items);
        setResumeTotalPages(Math.max(1, normalized.totalPages || 1));
        setResumeTotalElements(normalized.totalElements || 0);
        onResumesLoad?.(items);
      } catch (err) {
        setResumes([]);
        setResumeTotalPages(1);
        setResumeTotalElements(0);
        setResumesError(
          err instanceof Error ? err.message : "Failed to load resumes for user."
        );
        onResumesLoad?.([]);
      } finally {
        setResumesLoading(false);
      }
    },
    [
      apiBaseUrl,
      resumeEndpoint,
      resumePage,
      resumePageSize,
      resumeStatus,
      userIdQueryParam,
      onResumesLoad,
    ]
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    onUserSelect?.(selectedUser);
  }, [selectedUser, onUserSelect]);

  useEffect(() => {
    if (selectedUser) {
      void loadUserResumes(selectedUser);
    }
  }, [selectedUser, resumePage, resumeStatus, loadUserResumes]);

  const selectedUserStatus = useMemo(
    () => getUserStatus(selectedUser),
    [selectedUser]
  );

  const handleUserSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserPage(0);
    setUserSearch(userSearchInput);
  };

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
    setResumePage(0);
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setResumePage(0);
    setResumes([]);
    setResumeTotalPages(1);
    setResumeTotalElements(0);
    setResumesError(null);
    onUserSelect?.(null);
    onResumesLoad?.([]);
  };

  const resetAllFilters = () => {
    setUserSearchInput("");
    setUserSearch("");
    setUserSortBy("updatedAt");
    setUserSortDir("desc");
    setUserPage(0);
    setResumeStatus("ALL");
    clearSelectedUser();
  };

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Resume User Filter
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Search users, select a candidate, and fetch all resumes linked to
              that user from the backend.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void loadUsers()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${usersLoading ? "animate-spin" : ""}`}
              />
              Refresh Users
            </button>

            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              <X className="h-4 w-4" />
              Reset All
            </button>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">User Search</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <form onSubmit={handleUserSearchSubmit} className="xl:col-span-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search user
            </label>
            <div className="flex items-center rounded-xl border border-gray-200 bg-white px-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={userSearchInput}
                onChange={(e) => setUserSearchInput(e.target.value)}
                placeholder="Search by name, email, phone, role..."
                className="w-full rounded-xl bg-transparent px-3 py-3 text-sm outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Search
              </button>
            </div>
          </form>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Sort By
            </label>
            <select
              value={userSortBy}
              onChange={(e) => {
                setUserPage(0);
                setUserSortBy(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none"
            >
              <option value="updatedAt">Updated At</option>
              <option value="createdAt">Created At</option>
              <option value="fullName">Full Name</option>
              <option value="email">Email</option>
              <option value="firstName">First Name</option>
            </select>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Sort Direction
            </label>
            <select
              value={userSortDir}
              onChange={(e) => {
                setUserPage(0);
                setUserSortDir(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <div className="xl:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Resume Status
            </label>
            <select
              value={resumeStatus}
              onChange={(e) => {
                setResumePage(0);
                setResumeStatus(e.target.value);
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PROCESSED">PROCESSED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={<Users className="h-5 w-5 text-gray-700" />}
          label="Total Users"
          value={String(userTotalElements)}
        />
        <StatCard
          icon={<User className="h-5 w-5 text-gray-700" />}
          label="Selected User"
          value={selectedUser ? getUserName(selectedUser) : "None"}
        />
        <StatCard
          icon={<FileText className="h-5 w-5 text-gray-700" />}
          label="User Resumes"
          value={selectedUser ? String(resumeTotalElements) : "0"}
        />
      </div>

      {/* Users section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Users</h2>
          <p className="text-sm text-gray-600">
            Page {userTotalElements === 0 ? 0 : userPage + 1} of {userTotalPages}
          </p>
        </div>

        {usersLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-gray-100"
              />
            ))}
          </div>
        ) : usersError ? (
          <ErrorCard message={usersError} onRetry={() => void loadUsers()} />
        ) : users.length === 0 ? (
          <EmptyCard
            title="No users found"
            description="Try a different search keyword or sorting option."
          />
        ) : (
          <div className="space-y-4">
            {users.map((user) => {
              const userId = getUserId(user);
              const isSelected =
                selectedUser && String(getUserId(selectedUser)) === String(userId);

              return (
                <div
                  key={String(userId ?? Math.random())}
                  className={`rounded-2xl border p-5 transition ${
                    isSelected
                      ? "border-black bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getUserName(user)}
                        </h3>

                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          User ID: {userId ?? "—"}
                        </span>

                        {user.userCode && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            Code: {user.userCode}
                          </span>
                        )}

                        <UserStatusBadge status={getUserStatus(user)} />
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <DetailBox
                          icon={<Mail className="h-4 w-4" />}
                          label="Email"
                          value={safeText(user.email)}
                        />
                        <DetailBox
                          icon={<Phone className="h-4 w-4" />}
                          label="Phone"
                          value={safeText(getUserPhone(user))}
                        />
                        <DetailBox
                          icon={<MapPin className="h-4 w-4" />}
                          label="Location"
                          value={safeText(getUserLocation(user))}
                        />
                        <DetailBox
                          icon={<User className="h-4 w-4" />}
                          label="Current Role"
                          value={safeText(getUserRole(user))}
                        />
                        <DetailBox
                          icon={<FileText className="h-4 w-4" />}
                          label="Total Resumes"
                          value={String(user.totalResumes ?? 0)}
                        />
                        <DetailBox
                          icon={<RefreshCw className="h-4 w-4" />}
                          label="Updated At"
                          value={formatDate(user.updatedAt || user.createdAt)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 xl:w-auto xl:flex-col">
                      <button
                        onClick={() => handleSelectUser(user)}
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition ${
                          isSelected
                            ? "border border-black bg-black text-white"
                            : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <User className="h-4 w-4" />
                        {isSelected ? "Selected" : "Select User"}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setResumePage(0);
                          void loadUserResumes(user, 0);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                      >
                        <FileText className="h-4 w-4" />
                        Load Resumes
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-600">
            Total user records:{" "}
            <span className="font-semibold">{userTotalElements}</span>
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => userPage > 0 && setUserPage((prev) => prev - 1)}
              disabled={userPage <= 0 || usersLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <span className="text-sm font-medium text-gray-700">
              Page {userTotalElements === 0 ? 0 : userPage + 1} of {userTotalPages}
            </span>

            <button
              onClick={() =>
                userPage + 1 < userTotalPages && setUserPage((prev) => prev + 1)
              }
              disabled={userPage + 1 >= userTotalPages || usersLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected user */}
      {showSelectedUserCard && selectedUser && (
        <div className="rounded-2xl border border-black bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Selected User
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                The resumes below are filtered for this user only.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DetailBox
                  icon={<User className="h-4 w-4" />}
                  label="Name"
                  value={getUserName(selectedUser)}
                />
                <DetailBox
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={safeText(selectedUser.email)}
                />
                <DetailBox
                  icon={<Phone className="h-4 w-4" />}
                  label="Phone"
                  value={safeText(getUserPhone(selectedUser))}
                />
                <DetailBox
                  icon={<MapPin className="h-4 w-4" />}
                  label="Location"
                  value={safeText(getUserLocation(selectedUser))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <UserStatusBadge status={selectedUserStatus} />
              <button
                onClick={clearSelectedUser}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
              >
                <X className="h-4 w-4" />
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume results */}
      {showResumeResults && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Filtered User Resumes
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {selectedUser
                  ? `Showing resumes for ${getUserName(selectedUser)}`
                  : "Select a user to load resumes"}
              </p>
            </div>

            {selectedUser && (
              <button
                onClick={() => void loadUserResumes(selectedUser)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${resumesLoading ? "animate-spin" : ""}`}
                />
                Refresh Resumes
              </button>
            )}
          </div>

          {!selectedUser ? (
            <EmptyCard
              title="No user selected"
              description="Choose a user from the list above to fetch resumes from backend."
            />
          ) : resumesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-gray-100"
                />
              ))}
            </div>
          ) : resumesError ? (
            <ErrorCard
              message={resumesError}
              onRetry={() => void loadUserResumes(selectedUser)}
            />
          ) : resumes.length === 0 ? (
            <EmptyCard
              title="No resumes found"
              description="This user currently has no resumes for the selected filter."
            />
          ) : (
            <div className="space-y-4">
              {resumes.map((resume) => {
                const latestVersion = getLatestVersion(resume);
                return (
                  <div
                    key={String(getResumeId(resume) ?? Math.random())}
                    className="rounded-2xl border border-gray-200 p-5 transition hover:border-gray-300"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {safeText(
                              resume.title ||
                                resume.originalFileName ||
                                resume.fileName ||
                                resume.fullName ||
                                "Resume"
                            )}
                          </h3>

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            Resume ID: {getResumeId(resume) ?? "—"}
                          </span>

                          {resume.resumeCode && (
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                              Code: {resume.resumeCode}
                            </span>
                          )}

                          {resume.status && (
                            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                              Status: {resume.status}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <DetailBox
                            icon={<Mail className="h-4 w-4" />}
                            label="Email"
                            value={safeText(resume.email)}
                          />
                          <DetailBox
                            icon={<Phone className="h-4 w-4" />}
                            label="Phone"
                            value={safeText(resume.phone)}
                          />
                          <DetailBox
                            icon={<MapPin className="h-4 w-4" />}
                            label="Location"
                            value={safeText(resume.location)}
                          />
                          <DetailBox
                            icon={<User className="h-4 w-4" />}
                            label="Current Role"
                            value={safeText(resume.currentRole)}
                          />
                          <DetailBox
                            icon={<FileText className="h-4 w-4" />}
                            label="Version Count"
                            value={String(getVersionCount(resume))}
                          />
                          <DetailBox
                            icon={<RefreshCw className="h-4 w-4" />}
                            label="Updated At"
                            value={formatDate(
                              latestVersion?.updatedAt ||
                                resume.updatedAt ||
                                latestVersion?.createdAt ||
                                resume.createdAt
                            )}
                          />
                          <DetailBox
                            icon={<FileText className="h-4 w-4" />}
                            label="Latest Version"
                            value={safeText(
                              latestVersion?.versionName ||
                                latestVersion?.versionCode
                            )}
                          />
                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              ATS Score
                            </p>
                            <div
                              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getAtsClass(
                                latestVersion?.atsScore
                              )}`}
                            >
                              {latestVersion?.atsScore ?? "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedUser && (
            <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-gray-600">
                Total resume records:{" "}
                <span className="font-semibold">{resumeTotalElements}</span>
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    resumePage > 0 && setResumePage((prev) => prev - 1)
                  }
                  disabled={resumePage <= 0 || resumesLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <span className="text-sm font-medium text-gray-700">
                  Page {resumeTotalElements === 0 ? 0 : resumePage + 1} of{" "}
                  {resumeTotalPages}
                </span>

                <button
                  onClick={() =>
                    resumePage + 1 < resumeTotalPages &&
                    setResumePage((prev) => prev + 1)
                  }
                  disabled={resumePage + 1 >= resumeTotalPages || resumesLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gray-100 p-3">{icon}</div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {label}
          </p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DetailBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {icon}
        {label}
      </div>
      <div className="wrap-break-word text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function EmptyCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
      <Users className="mx-auto h-10 w-10 text-gray-400" />
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-700">Something went wrong</h3>
          <p className="mt-1 text-sm text-red-600">{message}</p>
          <button
            onClick={onRetry}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function UserStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();

  if (normalized === "ACTIVE" || normalized === "ENABLED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {status}
      </span>
    );
  }

  if (normalized === "INACTIVE" || normalized === "DISABLED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        <XCircle className="h-3.5 w-3.5" />
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
      <AlertCircle className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}