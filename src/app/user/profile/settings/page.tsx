"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
} from "lucide-react";

/**
 * src/app/user/profile/settings/page.tsx
 *
 * User Profile Settings (Onboarding Preferences Editor)
 *
 * Backend-integrated version:
 * - Validates user session using GET /api/auth/me
 * - Loads onboarding settings from GET /api/user/onboarding
 * - Saves onboarding settings to POST /api/user/onboarding
 * - Optionally resets onboarding using DELETE /api/user/onboarding
 *
 * Aligned with the latest frontend/backend project update.
 */

type DomainType = "Technical" | "Non-Technical";

type UserOnboardingResponse = {
  success?: boolean;
  message?: string;

  done?: boolean;
  domain?: DomainType;
  subDomainMode?: "single" | "any" | "multi";
  subDomainSingle?: string | null;
  subDomainMulti?: string[] | null;
  jobTitles?: string[] | null;

  resumeScanned?: boolean;
  resumeFileName?: string | null;
  resumeScore?: number | null;
};

type UserOnboardingPayload = {
  domain: DomainType;
  subDomainMode: "single" | "any" | "multi";
  subDomainSingle?: string | null;
  subDomainMulti?: string[] | null;
  jobTitles?: string[] | null;
};

type AuthMeData = {
  id?: number | string;
  name?: string;
  fullName?: string;
  firstName?: string;
  email?: string;
  role?: string;
  userRole?: string;
  roles?: string[];
  authenticated?: boolean;
  valid?: boolean;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  payload?: T;
  result?: T;
};

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null | undefined): T | null {
  if (!json || typeof json !== "object") return null;
  const envelope = json as ApiEnvelope<T> & T;
  return envelope.data ?? envelope.payload ?? envelope.result ?? (json as T);
}

function getToken(): string {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwtToken") ||
    ""
  );
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  [
    "accessToken",
    "token",
    "authToken",
    "jwtToken",
    "jwt",
    "userToken",
    "userRole",
    "role",
    "userEmail",
    "userName",
    "authId",
    "userOnboardingDone",
    "onboardingDone",
    "userDomain",
    "userSubDomainMode",
    "userSubDomainSingle",
    "userSubDomainMulti",
    "userJobTitles",
  ].forEach((key) => localStorage.removeItem(key));
}

function normalizeRole(value?: string): string {
  return (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
}

function isUserRole(role?: string, roles?: string[]) {
  const normalizedRole = normalizeRole(role);
  const normalizedRoles = Array.isArray(roles)
    ? roles.map((item) => normalizeRole(item))
    : [];

  return normalizedRole === "USER" || normalizedRoles.includes("USER");
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function UserProfileSettingsPage() {
  const backendBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
    "http://localhost:8080";

  const API_ROUTES = useMemo(
    () => ({
      me: `${backendBaseUrl}/api/auth/me`,
      onboarding: `${backendBaseUrl}/api/user/onboarding`,
    }),
    [backendBaseUrl]
  );

  const [authChecking, setAuthChecking] = useState(true);
  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const [resumeScanned, setResumeScanned] = useState(false);
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeScore, setResumeScore] = useState<number | null>(null);

  const [domain, setDomain] = useState<DomainType | "">("");
  const [subDomainMode, setSubDomainMode] = useState<"single" | "any" | "multi">(
    "single"
  );
  const [subDomainSingle, setSubDomainSingle] = useState("");
  const [subDomainMulti, setSubDomainMulti] = useState<string[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedToast, setSavedToast] = useState(false);

  const subDomains = useMemo(() => {
    return {
      Technical: [
        "Data Science & Analytics",
        "Software Development & Engineers",
        "Infrastructure & DevOps",
        "Cybersecurity & Safety",
        "Specialized Technical Roles",
        "Emerging Technical Domains",
      ],
      "Non-Technical": [
        "Sales and Business Development",
        "Marketing and Branding",
        "Human Resources (HR) and Talent Acquisition",
        "Operations and Administration",
        "Product Management and Support",
        "Finance and Legal",
        "Creative and Design",
        "Project Management",
      ],
    } as const;
  }, []);

  const jobTitleMap = useMemo(() => {
    return {
      Technical: {
        "Data Science & Analytics": [
          "Data Science/Machine Learning Engineering",
          "Data Engineering/ETL",
          "Database Administration (DBA)",
          "Business Intelligence (BI)",
        ],
        "Software Development & Engineers": [
          "Front-End Development",
          "Back-End Development",
          "Full-Stack Development",
          "Mobile App Development",
          "Game Development",
          "Embedded Systems/Firmware",
        ],
        "Infrastructure & DevOps": [
          "Cloud Computing/Architecture",
          "DevOps/Platform Engineering",
          "System Administration",
          "Network Engineering/Architecture",
        ],
        "Cybersecurity & Safety": [
          "Information Security Analysis",
          "Ethical Hacking/Penetration Testing",
          "Identity & Access Management (IAM)",
        ],
        "Specialized Technical Roles": [
          "QA/Automation Testing",
          "UI/UX Design",
          "Technical Writing",
          "Technical Product Management",
        ],
        "Emerging Technical Domains": [
          "Blockchain Engineering",
          "Robotic Process Automation (RPA)",
          "Generative AI/Prompt Engineering",
        ],
      },
      "Non-Technical": {
        "Sales and Business Development": [
          "Business Development Executive/Manager",
          "Sales Manager",
          "Account Executive",
        ],
        "Marketing and Branding": [
          "Digital Marketing Specialist/Manager",
          "Content Writer/Manager",
          "Social Media Specialist",
          "Market Research Analyst",
        ],
        "Human Resources (HR) and Talent Acquisition": [
          "HR Generalist/Manager",
          "Technical Recruiter/Talent Acquisition",
          "Onboarding/Employee Engagement Specialist",
        ],
        "Operations and Administration": [
          "Operations Manager",
          "Administrative Assistant/Office Manager",
          "Logistics/Supply Chain Manager",
        ],
        "Product Management and Support": [
          "Product Manager (Non-Tech)",
          "Customer Success Manager/Account Manager",
          "Customer Support Associate",
          "Document Verification",
        ],
        "Finance and Legal": [
          "Financial Analyst/Accountant",
          "Investment Banker",
          "Corporate Lawyer/Compliance Officer",
        ],
        "Creative and Design": ["UI/UX Designer", "Graphic Designer"],
        "Project Management": ["Project Manager", "Scrum Master"],
      },
    } as const;
  }, []);

  const showJobTitles = subDomainMode === "single";

  const availableJobTitles = useMemo(() => {
    if (!domain) return [];
    if (!showJobTitles || !subDomainSingle) return [];

    const mapForDomain = jobTitleMap[domain] as Record<string, readonly string[]>;
    return mapForDomain[subDomainSingle] || [];
  }, [domain, showJobTitles, subDomainSingle, jobTitleMap]);

  const validateUserAccess = useCallback(async (): Promise<boolean> => {
    const token = getToken();

    if (!token) {
      clearStoredAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      return false;
    }

    try {
      const res = await fetch(API_ROUTES.me, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        cache: "no-store",
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      const authData = unwrapResponse<AuthMeData>(json);

      if (!res.ok || !authData) {
        throw new Error("Unable to validate session.");
      }

      const authenticated = Boolean(
        authData.authenticated ?? authData.valid ?? res.ok
      );

      if (!authenticated) {
        throw new Error("Session is not valid.");
      }

      if (!isUserRole(authData.userRole ?? authData.role, authData.roles)) {
        if (typeof window !== "undefined") {
          window.location.href = "/admin";
        }
        return false;
      }

      return true;
    } catch {
      clearStoredAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      return false;
    } finally {
      setAuthChecking(false);
    }
  }, [API_ROUTES.me]);

  const loadSettings = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setBooting(true);
        }

        setError("");
        setInfoMessage("");

        const token = getToken();

        const res = await fetch(API_ROUTES.onboarding, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          cache: "no-store",
        });

        const text = await res.text();
        const json: UserOnboardingResponse | ApiEnvelope<UserOnboardingResponse> | null =
          text ? JSON.parse(text) : null;

        const data = unwrapResponse<UserOnboardingResponse>(json);

        if (!res.ok || !data) {
          throw new Error(
            (json as ApiEnvelope<UserOnboardingResponse>)?.message ||
              "Failed to load onboarding settings."
          );
        }

        setResumeScanned(Boolean(data.resumeScanned));
        setResumeFileName(data.resumeFileName || "");
        setResumeScore(
          typeof data.resumeScore === "number"
            ? data.resumeScore
            : normalizeNumber(data.resumeScore)
        );

        setDomain(data.domain || "");
        setSubDomainMode(data.subDomainMode || "single");
        setSubDomainSingle(data.subDomainSingle || "");
        setSubDomainMulti(Array.isArray(data.subDomainMulti) ? data.subDomainMulti : []);
        setJobTitles(Array.isArray(data.jobTitles) ? data.jobTitles : []);
      } catch (e: any) {
        setError(e?.message || "Failed to load settings.");
      } finally {
        setBooting(false);
        setRefreshing(false);
      }
    },
    [API_ROUTES.onboarding]
  );

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const allowed = await validateUserAccess();
      if (!allowed || cancelled) return;
      await loadSettings(false);
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [loadSettings, validateUserAccess]);

  const toggleMultiSubdomain = (subdomain: string) => {
    setSubDomainMulti((prev) =>
      prev.includes(subdomain)
        ? prev.filter((item) => item !== subdomain)
        : [...prev, subdomain]
    );
  };

  const toggleJobTitle = (title: string) => {
    setJobTitles((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const validateBeforeSave = () => {
    if (!domain) return "Please select a domain.";

    if (subDomainMode === "single" && !subDomainSingle) {
      return "Please select one sub-domain.";
    }

    if (subDomainMode === "multi" && subDomainMulti.length === 0) {
      return "Please select at least one sub-domain.";
    }

    return "";
  };

  const saveSettings = async () => {
    try {
      setSaveError("");
      setSavedToast(false);
      setInfoMessage("");

      const validationMessage = validateBeforeSave();
      if (validationMessage) {
        setSaveError(validationMessage);
        return;
      }

      const token = getToken();
      if (!token) throw new Error("No token found. Please login again.");

      const payload: UserOnboardingPayload = {
        domain: domain as DomainType,
        subDomainMode,
        subDomainSingle: subDomainMode === "single" ? subDomainSingle : null,
        subDomainMulti: subDomainMode === "multi" ? subDomainMulti : [],
        jobTitles: subDomainMode === "single" ? jobTitles : [],
      };

      setSaving(true);

      const res = await fetch(API_ROUTES.onboarding, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const json: UserOnboardingResponse | ApiEnvelope<UserOnboardingResponse> | null =
        text ? JSON.parse(text) : null;

      const data = unwrapResponse<UserOnboardingResponse>(json);

      if (!res.ok) {
        throw new Error(
          (json as ApiEnvelope<UserOnboardingResponse>)?.message ||
            "Failed to save settings."
        );
      }

      localStorage.setItem("userOnboardingDone", "true");
      localStorage.setItem("userDomain", payload.domain);
      localStorage.setItem("userSubDomainMode", payload.subDomainMode);
      localStorage.setItem("userSubDomainSingle", payload.subDomainSingle || "");
      localStorage.setItem(
        "userSubDomainMulti",
        JSON.stringify(payload.subDomainMulti || [])
      );
      localStorage.setItem("userJobTitles", JSON.stringify(payload.jobTitles || []));

      setSavedToast(true);
      setInfoMessage(
        (json as ApiEnvelope<UserOnboardingResponse>)?.message ||
          "Preferences saved successfully."
      );

      if (data) {
        setResumeScanned(Boolean(data.resumeScanned));
        setResumeFileName(data.resumeFileName || resumeFileName);
        setResumeScore(
          typeof data.resumeScore === "number"
            ? data.resumeScore
            : resumeScore
        );
      }

      window.setTimeout(() => setSavedToast(false), 1800);
    } catch (e: any) {
      setSaveError(e?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    try {
      setSaveError("");
      setSavedToast(false);
      setInfoMessage("");
      setResetting(true);

      const token = getToken();
      if (!token) throw new Error("No token found. Please login again.");

      const res = await fetch(API_ROUTES.onboarding, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Reset not supported by backend.");
      }

      localStorage.removeItem("userDomain");
      localStorage.removeItem("userSubDomainMode");
      localStorage.removeItem("userSubDomainSingle");
      localStorage.removeItem("userSubDomainMulti");
      localStorage.removeItem("userJobTitles");
      localStorage.removeItem("userOnboardingDone");

      window.location.href = "/user/setup";
    } catch (e: any) {
      setSaveError(e?.message || "Failed to reset settings.");
    } finally {
      setResetting(false);
    }
  };

  if (authChecking || booting) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-indigo-50 px-4 py-10">
        <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow">
            <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900">
              {authChecking ? "Verifying settings access…" : "Loading settings…"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {authChecking
                ? "Please wait while your session is validated with the backend."
                : "Please wait while your onboarding settings are being loaded."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-indigo-50 px-4 py-10">
        <div className="mx-auto grid min-h-[70vh] max-w-xl place-items-center">
          <div className="w-full rounded-3xl border border-red-200 bg-white p-8 shadow">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-red-700">
              <AlertCircle className="h-4 w-4" />
              Settings Error
            </div>

            <h1 className="text-lg font-semibold text-slate-900">
              Could not load preferences
            </h1>
            <p className="mt-2 text-sm text-red-600">{error}</p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/user/profile"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white px-6 py-3 font-semibold hover:bg-indigo-700 transition w-full sm:w-auto"
              >
                Back to Profile
              </Link>
              <Link
                href="/user"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition w-full sm:w-auto"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const resumeBadge = resumeScanned ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Resume Scanned
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
      Resume Not Scanned
    </span>
  );

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-indigo-50">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                <ShieldCheck className="h-4 w-4" />
                Profile Settings
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Preferences
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Update your onboarding selections anytime.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => loadSettings(true)}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition w-full sm:w-auto disabled:opacity-60"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </button>

              <Link
                href="/user/profile"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition w-full sm:w-auto"
              >
                Back to Profile
              </Link>

              <Link
                href="/user"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition w-full sm:w-auto"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        {savedToast ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm font-semibold">
            ✅ Preferences saved successfully.
          </div>
        ) : null}

        {infoMessage ? (
          <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-cyan-800 text-sm">
            {infoMessage}
          </div>
        ) : null}

        <div className="mt-6 rounded-3xl bg-white border shadow-sm p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Resume Status</h2>
              <p className="mt-1 text-sm text-slate-600">
                Resume scan is handled during setup. You can re-run setup if needed.
              </p>
            </div>
            <div>{resumeBadge}</div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">File</p>
              <p className="mt-1 font-semibold text-slate-900 break-all">
                {resumeFileName || "—"}
              </p>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">Score</p>
              <p className="mt-1 font-semibold text-slate-900">
                {typeof resumeScore === "number" ? resumeScore : "—"}
              </p>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">Re-run Setup</p>
              <Link
                href="/user/setup"
                className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-purple-600 text-white px-4 py-2 font-semibold hover:bg-purple-700 transition"
              >
                Open Setup Wizard
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-white border shadow-sm p-6 sm:p-7">
          <div className="mb-2 inline-flex items-center gap-2 text-slate-700">
            <Settings2 className="h-4 w-4" />
            <h2 className="text-lg font-bold text-slate-900">Interview Preferences</h2>
          </div>

          <p className="text-sm text-slate-600">
            Choose your domain, sub-domain options, and job titles.
          </p>

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-900">1) Choose domain</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(["Technical", "Non-Technical"] as DomainType[]).map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setDomain(item);
                    setSubDomainMode("single");
                    setSubDomainSingle("");
                    setSubDomainMulti([]);
                    setJobTitles([]);
                  }}
                  className={`rounded-2xl border px-5 py-4 text-left transition ${
                    domain === item
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{item}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item === "Technical"
                      ? "Engineering, analytics, security, infrastructure…"
                      : "Sales, marketing, HR, operations, finance…"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold text-slate-900">
              2) Choose sub-domain mode
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => {
                  setSubDomainMode("single");
                  setSubDomainMulti([]);
                  setJobTitles([]);
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  subDomainMode === "single"
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="font-semibold text-slate-900">Single option</p>
                <p className="mt-1 text-xs text-slate-600">
                  Choose exactly one sub-domain.
                </p>
              </button>

              <button
                onClick={() => {
                  setSubDomainMode("any");
                  setSubDomainSingle("");
                  setSubDomainMulti([]);
                  setJobTitles([]);
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  subDomainMode === "any"
                    ? "border-purple-300 bg-purple-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="font-semibold text-slate-900">Any</p>
                <p className="mt-1 text-xs text-slate-600">
                  Try all, auto-pick best. Skips job titles.
                </p>
              </button>

              <button
                onClick={() => {
                  setSubDomainMode("multi");
                  setSubDomainSingle("");
                  setJobTitles([]);
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  subDomainMode === "multi"
                    ? "border-purple-300 bg-purple-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="font-semibold text-slate-900">Choose multiple</p>
                <p className="mt-1 text-xs text-slate-600">
                  Select many sub-domains. Skips job titles.
                </p>
              </button>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold text-slate-900">
              3) Choose sub-domain(s)
            </p>

            {!domain ? (
              <p className="mt-2 text-sm text-slate-600">
                Select a domain first to see available sub-domains.
              </p>
            ) : (
              <div className="mt-3 grid gap-3">
                {subDomainMode === "single" &&
                  subDomains[domain].map((item) => (
                    <button
                      key={item}
                      onClick={() => {
                        setSubDomainSingle(item);
                        setJobTitles([]);
                      }}
                      className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                        subDomainSingle === item
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <p className="font-semibold text-slate-900">{item}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Used to tailor your interview and job recommendations.
                      </p>
                    </button>
                  ))}

                {subDomainMode === "multi" &&
                  subDomains[domain].map((item) => {
                    const checked = subDomainMulti.includes(item);

                    return (
                      <button
                        key={item}
                        onClick={() => toggleMultiSubdomain(item)}
                        className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                          checked
                            ? "border-purple-300 bg-purple-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">{item}</p>
                          <span className="shrink-0 text-xs text-slate-600">
                            {checked ? "Selected" : "Select"}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                {subDomainMode === "any" ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold text-slate-900">Any</p>
                    <p className="mt-1 text-sm text-slate-600">
                      The system will test across all sub-domains and choose the best fit.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="mt-8">
            <p className="text-sm font-semibold text-slate-900">
              4) Choose job titles
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Only available when sub-domain mode is <span className="font-semibold">Single</span>.
            </p>

            {!showJobTitles ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                Job titles are skipped for <span className="font-semibold">Any</span> or{" "}
                <span className="font-semibold">Multiple</span> sub-domain mode.
              </div>
            ) : !domain || !subDomainSingle ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                Select a domain and one sub-domain to see job titles.
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                {availableJobTitles.map((title) => {
                  const checked = jobTitles.includes(title);

                  return (
                    <button
                      key={title}
                      onClick={() => toggleJobTitle(title)}
                      className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                        checked
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{title}</p>
                        <span className="shrink-0 text-xs text-slate-600">
                          {checked ? "Selected" : "Select"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {saveError ? (
            <p className="mt-6 text-sm text-red-600">{saveError}</p>
          ) : null}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-6 py-3 font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Preferences
                </>
              )}
            </button>

            <Link
              href="/user/profile"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>

            <button
              onClick={resetSettings}
              disabled={resetting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-6 py-3 font-semibold text-red-700 hover:bg-red-50 transition disabled:opacity-60"
              title="Requires DELETE /api/user/onboarding"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Reset Setup
                </>
              )}
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Note: If you want to re-upload your resume, use the Setup Wizard.
          </p>
        </div>
      </div>
    </div>
  );
}