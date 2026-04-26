"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  User,
} from "lucide-react";

type ProfileRole = "USER" | "ADMIN";

type SyncResponse = {
  success?: boolean;
  message?: string;
  data?: {
    synced?: boolean;
    profileUpdated?: boolean;
    resumeVersionId?: number;
    profileId?: number;
    role?: string;
    [key: string]: unknown;
  } | null;
  payload?: {
    synced?: boolean;
    profileUpdated?: boolean;
    resumeVersionId?: number;
    profileId?: number;
    role?: string;
    [key: string]: unknown;
  } | null;
  result?: {
    synced?: boolean;
    profileUpdated?: boolean;
    resumeVersionId?: number;
    profileId?: number;
    role?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

type ProfileSyncResumeButtonProps = {
  role?: ProfileRole;
  resumeVersionId?: number | string;
  resumeId?: number | string;
  label?: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
  autoDetectRole?: boolean;
  onSyncSuccess?: (response: SyncResponse) => void;
  onSyncError?: (errorMessage: string) => void;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

const API_ROUTES = {
  userProfileMe: `${API_BASE_URL}/api/user/profile/me`,
  adminProfileMe: `${API_BASE_URL}/api/admin/profile/me`,
  userHome: `${API_BASE_URL}/api/user/home`,
  adminHome: `${API_BASE_URL}/api/admin/home`,
};

function getStoredToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    null
  );
}

function normalizeRole(value?: string | null): ProfileRole | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase().replace(/^ROLE_/, "");
  if (upper === "ADMIN") return "ADMIN";
  if (upper === "USER") return "USER";
  return null;
}

function unwrapResponseData(
  payload: Record<string, unknown> | SyncResponse
): Record<string, unknown> | null {
  const asEnvelope = payload as SyncResponse;

  const unwrapped =
    (asEnvelope.data as Record<string, unknown> | undefined) ??
    (asEnvelope.payload as Record<string, unknown> | undefined) ??
    (asEnvelope.result as Record<string, unknown> | undefined);

  return unwrapped ?? (payload as Record<string, unknown>);
}

function parseMaybeNumber(value: number | string | undefined | null) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

export default function ProfileSyncResumeButton({
  role,
  resumeVersionId,
  resumeId,
  label = "Sync Resume to Profile",
  className = "",
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  autoDetectRole = true,
  onSyncSuccess,
  onSyncError,
}: ProfileSyncResumeButtonProps) {
  const [resolvedRole, setResolvedRole] = useState<ProfileRole | null>(
    role || null
  );
  const [syncing, setSyncing] = useState(false);
  const [loadingRole, setLoadingRole] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const readRoleFromPayload = useCallback(
    (payload: Record<string, unknown>): ProfileRole | null => {
      const raw = unwrapResponseData(payload);
      if (!raw) return null;

      const directRole =
        typeof raw.role === "string"
          ? raw.role
          : typeof payload.role === "string"
          ? String(payload.role)
          : undefined;

      const directUserRole =
        typeof raw.userRole === "string"
          ? raw.userRole
          : typeof payload.userRole === "string"
          ? String(payload.userRole)
          : undefined;

      return normalizeRole(directUserRole || directRole);
    },
    []
  );

  const detectRole = useCallback(async (): Promise<ProfileRole | null> => {
    if (role) {
      const normalized = normalizeRole(role);
      setResolvedRole(normalized);
      return normalized;
    }

    try {
      setLoadingRole(true);

      const token = getStoredToken();
      const headers: HeadersInit = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const endpoints: Array<{ url: string; role: ProfileRole }> = [
        { url: API_ROUTES.userProfileMe, role: "USER" },
        { url: API_ROUTES.adminProfileMe, role: "ADMIN" },
        { url: API_ROUTES.userHome, role: "USER" },
        { url: API_ROUTES.adminHome, role: "ADMIN" },
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, {
            method: "GET",
            credentials: "include",
            headers,
            cache: "no-store",
          });

          if (response.ok) {
            let detected: ProfileRole | null = endpoint.role;

            try {
              const payload = (await response.json()) as Record<string, unknown>;
              detected = readRoleFromPayload(payload) || endpoint.role;
            } catch {
              detected = endpoint.role;
            }

            setResolvedRole(detected);
            return detected;
          }

          if ([401, 403, 404].includes(response.status)) {
            continue;
          }
        } catch {
          continue;
        }
      }

      return null;
    } finally {
      setLoadingRole(false);
    }
  }, [readRoleFromPayload, role]);

  const endpointCandidates = useMemo(() => {
    const versionId =
      resumeVersionId !== undefined && resumeVersionId !== null
        ? String(resumeVersionId)
        : undefined;

    const base: Record<ProfileRole, string[]> = {
      USER: [],
      ADMIN: [],
    };

    if (versionId) {
      base.USER.push(
        `${API_BASE_URL}/api/user/profile/sync/resume-version/${versionId}`,
        `${API_BASE_URL}/api/user/profile/sync/${versionId}`,
        `${API_BASE_URL}/api/user/profile/sync-resume/${versionId}`,
        `${API_BASE_URL}/api/user/resume/sync-profile/${versionId}`,
        `${API_BASE_URL}/api/user/resume/profile-sync/${versionId}`
      );

      base.ADMIN.push(
        `${API_BASE_URL}/api/admin/profile/sync/resume-version/${versionId}`,
        `${API_BASE_URL}/api/admin/profile/sync/${versionId}`,
        `${API_BASE_URL}/api/admin/profile/sync-resume/${versionId}`,
        `${API_BASE_URL}/api/admin/resume/sync-profile/${versionId}`,
        `${API_BASE_URL}/api/admin/resume/profile-sync/${versionId}`
      );
    }

    base.USER.push(
      `${API_BASE_URL}/api/user/profile/sync-resume`,
      `${API_BASE_URL}/api/user/profile/sync`,
      `${API_BASE_URL}/api/user/resume/sync-profile`
    );

    base.ADMIN.push(
      `${API_BASE_URL}/api/admin/profile/sync-resume`,
      `${API_BASE_URL}/api/admin/profile/sync`,
      `${API_BASE_URL}/api/admin/resume/sync-profile`
    );

    return base;
  }, [resumeVersionId]);

  const requestBody = useMemo(() => {
    const body: Record<string, unknown> = {};

    const parsedResumeVersionId = parseMaybeNumber(resumeVersionId);
    const parsedResumeId = parseMaybeNumber(resumeId);

    if (parsedResumeVersionId !== undefined) {
      body.resumeVersionId = parsedResumeVersionId;
      body.versionId = parsedResumeVersionId;
    }

    if (parsedResumeId !== undefined) {
      body.resumeId = parsedResumeId;
    }

    return body;
  }, [resumeId, resumeVersionId]);

  const performSync = useCallback(async () => {
    setSuccessMessage("");
    setErrorMessage("");

    const activeRole =
      resolvedRole || (autoDetectRole ? await detectRole() : normalizeRole(role));

    if (!activeRole) {
      const message =
        "Unable to determine whether the current session is USER or ADMIN.";
      setErrorMessage(message);
      onSyncError?.(message);
      return;
    }

    const targets = endpointCandidates[activeRole];

    if (!targets.length) {
      const message = "No backend sync endpoint could be prepared.";
      setErrorMessage(message);
      onSyncError?.(message);
      return;
    }

    setSyncing(true);

    try {
      const token = getStoredToken();
      const baseHeaders: HeadersInit = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      let lastKnownError = "Resume to profile sync failed.";

      for (const endpoint of targets) {
        const methods: Array<"POST" | "PUT"> = ["POST", "PUT"];

        for (const method of methods) {
          try {
            const response = await fetch(endpoint, {
              method,
              credentials: "include",
              headers: baseHeaders,
              body:
                Object.keys(requestBody).length > 0
                  ? JSON.stringify(requestBody)
                  : undefined,
            });

            if (response.ok) {
              let payload: SyncResponse = {};

              try {
                payload = (await response.json()) as SyncResponse;
              } catch {
                payload = {
                  success: true,
                  message: "Resume synced to profile successfully.",
                };
              }

              const serverMessage =
                typeof payload.message === "string" && payload.message.trim()
                  ? payload.message.trim()
                  : "Resume synced to profile successfully.";

              setSuccessMessage(serverMessage);
              setErrorMessage("");

              const payloadRole =
                payload.data?.role || payload.payload?.role || payload.result?.role;
              const normalizedPayloadRole = normalizeRole(payloadRole);

              if (normalizedPayloadRole) {
                setResolvedRole(normalizedPayloadRole);
              }

              onSyncSuccess?.(payload);
              return;
            }

            if ([401, 403].includes(response.status)) {
              lastKnownError = "You are not authorized to sync this resume.";
              continue;
            }

            if (response.status === 404) {
              continue;
            }

            try {
              const payload = (await response.json()) as SyncResponse;
              if (typeof payload.message === "string" && payload.message.trim()) {
                lastKnownError = payload.message.trim();
              } else {
                lastKnownError = `Sync failed with status ${response.status}.`;
              }
            } catch {
              lastKnownError = `Sync failed with status ${response.status}.`;
            }
          } catch {
            lastKnownError = "Unable to connect to backend sync service.";
          }
        }
      }

      setErrorMessage(lastKnownError);
      onSyncError?.(lastKnownError);
    } finally {
      setSyncing(false);
    }
  }, [
    autoDetectRole,
    detectRole,
    endpointCandidates,
    onSyncError,
    onSyncSuccess,
    requestBody,
    resolvedRole,
    role,
  ]);

  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-70";

  const sizeClasses =
    size === "sm"
      ? "px-3 py-2 text-sm"
      : size === "lg"
      ? "px-5 py-3 text-base"
      : "px-4 py-2.5 text-sm";

  const variantClasses =
    variant === "secondary"
      ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      : variant === "ghost"
      ? "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100"
      : "bg-indigo-600 text-white hover:bg-indigo-700";

  const widthClass = fullWidth ? "w-full" : "";

  const icon =
    syncing || loadingRole ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <ArrowRightLeft className="h-4 w-4" />
    );

  const activeRoleLabel =
    (resolvedRole || normalizeRole(role)) === "ADMIN" ? "Admin" : "User";

  return (
    <div className={`flex flex-col gap-3 ${fullWidth ? "w-full" : "w-fit"}`}>
      <button
        type="button"
        onClick={performSync}
        disabled={disabled || syncing || loadingRole}
        className={`${baseClasses} ${sizeClasses} ${variantClasses} ${widthClass} ${className}`}
      >
        {icon}
        <span>
          {syncing
            ? "Syncing..."
            : loadingRole
            ? "Detecting role..."
            : label}
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
          {(resolvedRole || normalizeRole(role)) === "ADMIN" ? (
            <Shield className="h-3.5 w-3.5" />
          ) : (
            <User className="h-3.5 w-3.5" />
          )}
          {resolvedRole || role ? activeRoleLabel : "Auto role detect"}
        </span>

        {resumeVersionId !== undefined && resumeVersionId !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
            <FileText className="h-3.5 w-3.5" />
            Version #{String(resumeVersionId)}
          </span>
        )}

        {resumeId !== undefined && resumeId !== null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
            Resume #{String(resumeId)}
          </span>
        )}
      </div>

      {successMessage && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!successMessage && !errorMessage && (
        <p className="text-xs text-slate-500">
          Syncs parsed resume data into the current backend-backed profile.
        </p>
      )}
    </div>
  );
}