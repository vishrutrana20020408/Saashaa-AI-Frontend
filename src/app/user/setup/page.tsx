"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Sparkles,
  FileUp,
  Briefcase,
  Layers3,
} from "lucide-react";

/**
 * src/app/(public)/user/setup/page.tsx
 *
 * Backend-integrated User Setup / Onboarding Page
 *
 * Latest project alignment:
 * - backend-first onboarding flow
 * - robust token/role lookup for protected requests
 * - resilient API response normalization
 * - onboarding status sync from backend
 * - resume scan required before onboarding completion
 *
 * Expected backend endpoints:
 * GET    /api/user/onboarding/status
 * POST   /api/user/resume/scan
 * POST   /api/user/onboarding
 *
 * Notes:
 * - Resume scan upload field: file
 * - Setup is considered complete when onboarding save succeeds
 * - Single sub-domain flow exposes job titles
 * - Any / Multi sub-domain flows skip job title selection
 */

type DomainType = "Technical" | "Non-Technical";
type Step = "resume" | "domain" | "subdomain" | "jobtitles" | "documents";

type ResumeScanData = {
  fileName?: string;
  parsedText?: string;
  score?: number;
  atsScore?: number;
  resumeId?: number;
  resumeVersionId?: number;
};

type OnboardingStatusData = {
  done?: boolean;
  resumeUploaded?: boolean;
  resumeScanned?: boolean;
  resumeFileName?: string | null;
  domain?: DomainType | null;
  subDomainMode?: "single" | "any" | "multi" | null;
  subDomainSingle?: string | null;
  subDomainMulti?: string[];
  jobTitles?: string[];
  class10MarksheetUrl?: string | null;
  class12MarksheetUrl?: string | null;
  graduationMarksheetUrl?: string | null;
  postGraduationMarksheetUrl?: string | null;
};

type OnboardingPayload = {
  domain: DomainType;
  subDomainMode: "single" | "any" | "multi";
  subDomainSingle?: string | null;
  subDomainMulti?: string[];
  jobTitles?: string[];
  class10MarksheetUrl?: string | null;
  class12MarksheetUrl?: string | null;
  graduationMarksheetUrl?: string | null;
  postGraduationMarksheetUrl?: string | null;
};

type OnboardingSaveData = {
  done?: boolean;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  payload?: T | null;
  result?: T | null;
  parsed?: T | null;
};

function unwrapResponse<T>(json: ApiEnvelope<T> | T | null): T | null {
  if (!json) return null;
  const envelope = json as ApiEnvelope<T>;
  return (
    envelope.data ?? envelope.payload ?? envelope.result ?? envelope.parsed ?? (json as T)
  );
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes";
  }
  return false;
}

function normalizeNumber(
  value: unknown,
  fallback?: number
): number | undefined {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeRole(value?: string | null): string {
  return (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    null
  );
}

function getStoredRole(): string {
  if (typeof window === "undefined") return "";
  return normalizeRole(
    localStorage.getItem("userRole") || localStorage.getItem("role") || ""
  );
}

function setOnboardingStored(done: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem("userOnboardingDone", String(done));
  localStorage.setItem("onboardingDone", String(done));
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  [
    "token",
    "authToken",
    "accessToken",
    "jwtToken",
    "userRole",
    "role",
    "userEmail",
    "userName",
    "authId",
    "userOnboardingDone",
    "onboardingDone",
  ].forEach((key) => localStorage.removeItem(key));
}

function normalizeResumeScanData(raw: any): ResumeScanData | null {
  if (!raw || typeof raw !== "object") return null;

  return {
    fileName: normalizeString(raw?.fileName ?? raw?.name),
    parsedText: normalizeString(raw?.parsedText ?? raw?.rawText ?? raw?.content),
    score:
      normalizeNumber(raw?.score) ??
      normalizeNumber(raw?.atsScore) ??
      undefined,
    atsScore:
      normalizeNumber(raw?.atsScore) ??
      normalizeNumber(raw?.score) ??
      undefined,
    resumeId: normalizeNumber(raw?.resumeId),
    resumeVersionId:
      normalizeNumber(raw?.resumeVersionId) ?? normalizeNumber(raw?.versionId),
  };
}

function normalizeOnboardingStatusData(raw: any): OnboardingStatusData | null {
  if (!raw || typeof raw !== "object") return null;

  const domainValue = normalizeString(raw?.domain);
  const normalizedDomain =
    domainValue === "Technical" || domainValue === "Non-Technical"
      ? (domainValue as DomainType)
      : null;

  const modeValue = normalizeString(raw?.subDomainMode);
  const normalizedMode =
    modeValue === "single" || modeValue === "any" || modeValue === "multi"
      ? modeValue
      : null;

  return {
    done: normalizeBoolean(raw?.done),
    resumeUploaded: normalizeBoolean(raw?.resumeUploaded ?? raw?.resumeScanned),
    resumeScanned: normalizeBoolean(raw?.resumeScanned ?? raw?.resumeUploaded),
    resumeFileName: normalizeString(raw?.resumeFileName) || null,
    domain: normalizedDomain,
    subDomainMode: normalizedMode,
    subDomainSingle: normalizeString(raw?.subDomainSingle) || null,
    subDomainMulti: normalizeStringArray(raw?.subDomainMulti),
    jobTitles: normalizeStringArray(raw?.jobTitles),
    class10MarksheetUrl: normalizeString(raw?.class10MarksheetUrl) || null,
    class12MarksheetUrl: normalizeString(raw?.class12MarksheetUrl) || null,
    graduationMarksheetUrl: normalizeString(raw?.graduationMarksheetUrl) || null,
    postGraduationMarksheetUrl: normalizeString(raw?.postGraduationMarksheetUrl) || null,
  };
}

const DocCard = ({
  title,
  subtitle,
  url,
  type,
  isUploading,
  onUpload,
  required = false
}: {
  title: string;
  subtitle: string;
  url: string | null;
  type: string;
  isUploading: boolean;
  onUpload: (type: string, file: File) => void;
  required?: boolean;
}) => (
  <div className={`group relative overflow-hidden rounded-2xl border ${url ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'} p-4 transition-all hover:border-white/20 sm:p-5`}>
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${url ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
          <FileText size={20} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white/90">
            {title} {required && <span className="text-rose-500">*</span>}
          </h3>
          <p className="text-xs text-white/50">{subtitle}</p>
        </div>
      </div>
      {url && <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />}
    </div>

    <div className="mt-4 flex items-center justify-between gap-4">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          View Document
        </a>
      ) : (
        <span className="text-xs text-white/30 italic">Not uploaded yet</span>
      )}

      <label className="cursor-pointer">
        <input
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(type, file);
          }}
          disabled={isUploading}
        />
        <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${isUploading ? 'bg-white/5 text-white/30' : 'bg-white/10 text-white hover:bg-white/20'}`}>
          {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {url ? 'Replace' : 'Upload'}
        </div>
      </label>
    </div>
  </div>
);

export default function UserSetupPage() {
  const router = useRouter();

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:8080";

  const API_ROUTES = useMemo(
    () => ({
      onboardingStatus: `${API_BASE_URL}/api/user/onboarding/status`,
      resumeUpload: `${API_BASE_URL}/api/user/resume/upload`,
      onboardingSave: `${API_BASE_URL}/api/user/onboarding`,
    }),
    [API_BASE_URL]
  );

  const [step, setStep] = useState<Step>("resume");
  const [booting, setBooting] = useState(true);

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [resumeScanned, setResumeScanned] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeParsedText, setResumeParsedText] = useState("");
  const [resumeScore, setResumeScore] = useState<number | null>(null);

  const [domain, setDomain] = useState<DomainType | "">("");

  const [anyEnabled, setAnyEnabled] = useState(false);
  const [multiEnabled, setMultiEnabled] = useState(false);

  const subDomainMode: "single" | "any" | "multi" = anyEnabled
    ? "any"
    : multiEnabled
    ? "multi"
    : "single";

  const [subDomainSingle, setSubDomainSingle] = useState("");
  const [subDomainMulti, setSubDomainMulti] = useState<string[]>([]);
  const [jobTitles, setJobTitles] = useState<string[]>([]);

  const [class10Url, setClass10Url] = useState<string | null>(null);
  const [class12Url, setClass12Url] = useState<string | null>(null);
  const [graduationUrl, setGraduationUrl] = useState<string | null>(null);
  const [postGraduationUrl, setPostGraduationUrl] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const [loadingStatus, setLoadingStatus] = useState(false);

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

  const stepsForProgress: Step[] = useMemo(() => {
    const base: Step[] = ["resume", "domain", "subdomain"];
    if (showJobTitles) base.push("jobtitles");
    base.push("documents");
    return base;
  }, [showJobTitles]);

  const stepIndex = useMemo(() => {
    const idx = stepsForProgress.indexOf(step);
    return idx < 0 ? 0 : idx;
  }, [step, stepsForProgress]);

  const progressPct = useMemo(() => {
    const max = Math.max(1, stepsForProgress.length - 1);
    return (stepIndex / max) * 100;
  }, [stepIndex, stepsForProgress.length]);

  const availableSubDomains = useMemo(() => {
    if (!domain) return [];
    return subDomains[domain as DomainType] as unknown as string[];
  }, [domain, subDomains]);

  const availableJobTitles = useMemo<string[]>(() => {
    if (!domain) return [];
    if (subDomainMode !== "single" || !subDomainSingle) return [];
    const mapForDomain = jobTitleMap[domain] as Record<string, readonly string[]>;
    return (mapForDomain[subDomainSingle] || []) as string[];
  }, [domain, subDomainMode, subDomainSingle, jobTitleMap]);

  const getAuthHeaders = (): HeadersInit => {
    const token = getStoredToken();
    return {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const redirectToLogin = () => {
    clearStoredAuth();
    router.replace("/auth/login");
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const role = getStoredRole();
        const token = getStoredToken();

        if (!token || role !== "USER") {
          redirectToLogin();
          return;
        }

        setLoadingStatus(true);

        const res = await fetch(API_ROUTES.onboardingStatus, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          cache: "no-store",
        });

        if (res.status === 401 || res.status === 403) {
          redirectToLogin();
          return;
        }

        if (!res.ok) {
          if (mounted) setBooting(false);
          return;
        }

        const json = await res.json().catch(() => null);
        const status = normalizeOnboardingStatusData(unwrapResponse<any>(json));

        if (!mounted) return;

        if (status?.done) {
          setOnboardingStored(true);
          router.replace("/user");
          return;
        }

        if (status) {
          const hasResume = !!status.resumeUploaded || !!status.resumeScanned;

          setResumeScanned(hasResume);
          setResumeFileName(status.resumeFileName || null);

          if (status.domain) {
            setDomain(status.domain);
          }

          if (status.subDomainMode === "any") {
            setAnyEnabled(true);
            setMultiEnabled(false);
          } else if (status.subDomainMode === "multi") {
            setAnyEnabled(false);
            setMultiEnabled(true);
          } else {
            setAnyEnabled(false);
            setMultiEnabled(false);
          }

          setSubDomainSingle(status.subDomainSingle || "");
          setSubDomainMulti(status.subDomainMulti || []);
          setJobTitles(status.jobTitles || []);

          setClass10Url(status.class10MarksheetUrl || null);
          setClass12Url(status.class12MarksheetUrl || null);
          setGraduationUrl(status.graduationMarksheetUrl || null);
          setPostGraduationUrl(status.postGraduationMarksheetUrl || null);

          if (hasResume && !status.domain) {
            setStep("domain");
          } else if (hasResume && status.domain && status.subDomainMode) {
            if (status.subDomainMode === "single") {
              setStep("jobtitles");
            } else {
              setStep("subdomain");
            }
          }
        }
      } catch {
        if (mounted) {
          setSaveError("Unable to load onboarding status.");
        }
      } finally {
        if (mounted) {
          setLoadingStatus(false);
          setBooting(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [API_ROUTES.onboardingStatus, router]);

  const resetLocalState = () => {
    setResumeFile(null);
    setResumeError("");
    setResumeUploading(false);
    setResumeScanned(false);
    setResumeFileName(null);
    setResumeParsedText("");
    setResumeScore(null);

    setDomain("");
    setAnyEnabled(false);
    setMultiEnabled(false);
    setSubDomainSingle("");
    setSubDomainMulti([]);
    setJobTitles([]);

    setSaveError("");
    setSaveSuccess("");
    setSaving(false);
    setStep("resume");
  };

  const handleResumeUpload = async () => {
    try {
      setResumeError("");
      setSaveError("");
      setSaveSuccess("");

      const token = getStoredToken();

      if (!token) {
        redirectToLogin();
        return;
      }

      if (!resumeFile) {
        throw new Error("Please select a resume file first.");
      }

      setResumeUploading(true);

      const form = new FormData();
      form.append("file", resumeFile);

      const res = await fetch(API_ROUTES.resumeUpload, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
        },
        body: form,
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
        return;
      }

      const data = normalizeResumeScanData(unwrapResponse<any>(json));

      if (!res.ok || !data) {
        throw new Error(
          (json as ApiEnvelope<any>)?.message || "Resume upload failed."
        );
      }

      setResumeScanned(true);
      setResumeFileName(data.fileName || resumeFile.name);
      setResumeParsedText(data.parsedText || "");
      setResumeScore(
        typeof data.score === "number"
          ? data.score
          : typeof data.atsScore === "number"
          ? data.atsScore
          : null
      );

      if (typeof window !== "undefined") {
        localStorage.setItem("userResumeName", data.fileName || resumeFile.name);

        if (data.resumeId != null) {
          localStorage.setItem("activeResumeId", String(data.resumeId));
        }

        if (data.resumeVersionId != null) {
          localStorage.setItem("activeResumeVersionId", String(data.resumeVersionId));
        }
      }

      setStep("domain");
    } catch (e: any) {
      setResumeError(e?.message || "Resume upload failed.");
      setResumeScanned(false);
    } finally {
      setResumeUploading(false);
    }
  };

  const goNextFromDomain = () => {
    if (!domain) return;

    setAnyEnabled(false);
    setMultiEnabled(false);
    setSubDomainSingle("");
    setSubDomainMulti([]);
    setJobTitles([]);
    setSaveError("");
    setSaveSuccess("");
    setStep("subdomain");
  };

  const toggleAny = () => {
    setAnyEnabled((prev) => {
      const next = !prev;
      if (next) {
        setMultiEnabled(false);
        setSubDomainSingle("");
        setSubDomainMulti([]);
        setJobTitles([]);
      }
      return next;
    });
  };

  const toggleMulti = () => {
    setMultiEnabled((prev) => {
      const next = !prev;
      if (next) {
        setAnyEnabled(false);
        setSubDomainSingle("");
        setJobTitles([]);
      } else {
        setSubDomainMulti([]);
      }
      return next;
    });
  };

  const toggleMultiSubdomain = (s: string) => {
    setSubDomainMulti((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const toggleJobTitle = (t: string) => {
    setJobTitles((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const canContinueSubdomain = () => {
    if (!domain) return false;
    if (subDomainMode === "any") return true;
    if (subDomainMode === "multi") return subDomainMulti.length > 0;
    return !!subDomainSingle;
  };

  const handleDocUpload = async (docType: string, file: File) => {
    try {
      setUploadingDoc(docType);
      setSaveError("");
      const form = new FormData();
      form.append("file", file);
      form.append("docType", docType);

      const token = getStoredToken();
      const res = await fetch(`${API_BASE_URL}/api/user/profile/upload-document`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const url = data.url || data.data?.url;

      if (docType === "class10") setClass10Url(url);
      else if (docType === "class12") setClass12Url(url);
      else if (docType === "graduation") setGraduationUrl(url);
      else if (docType === "postGraduation") setPostGraduationUrl(url);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setUploadingDoc(null);
    }
  };

  const saveOnboarding = async () => {
    try {
      setSaveError("");
      setSaveSuccess("");

      const token = getStoredToken();

      if (!token) {
        redirectToLogin();
        return;
      }

      if (!resumeScanned) {
        throw new Error("Please upload and scan your resume first.");
      }

      if (!domain) {
        throw new Error("Please select a domain.");
      }

      if (!canContinueSubdomain()) {
        throw new Error("Please select sub-domain(s).");
      }

      // Document Validation
      if (!class10Url) throw new Error("Class 10th result is compulsory.");
      if (!class12Url) throw new Error("Class 12th result is compulsory.");
      
      if (domain === "Technical") {
        if (!graduationUrl) throw new Error("Graduation marksheet is compulsory for Technical domain.");
        if (!postGraduationUrl) throw new Error("Post Graduation marksheet is compulsory for Technical domain.");
      }

      const payload: OnboardingPayload = {
        domain: domain as DomainType,
        subDomainMode,
        subDomainSingle: subDomainMode === "single" ? subDomainSingle : null,
        subDomainMulti: subDomainMode === "multi" ? subDomainMulti : [],
        jobTitles: subDomainMode === "single" ? jobTitles : [],
        class10MarksheetUrl: class10Url,
        class12MarksheetUrl: class12Url,
        graduationMarksheetUrl: graduationUrl,
        postGraduationMarksheetUrl: postGraduationUrl,
      };

      setSaving(true);

      const res = await fetch(API_ROUTES.onboardingSave, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
        return;
      }

      const data = unwrapResponse<OnboardingSaveData>(json);

      if (!res.ok) {
        throw new Error(
          (json as ApiEnvelope<any>)?.message || "Failed to save onboarding."
        );
      }

      // Mark onboarding as complete BEFORE redirect
      const isComplete = Boolean(data?.done ?? true);
      setOnboardingStored(isComplete);
      
      setSaveSuccess(
        (json as ApiEnvelope<any>)?.message || "Setup completed successfully. Redirecting..."
      );

      // Small delay to ensure localStorage is updated before navigation
      setTimeout(() => {
        router.replace("/user");
      }, 300);
    } catch (e: any) {
      setSaveError(e?.message || "Failed to save onboarding.");
    } finally {
      setSaving(false);
    }
  };

  const StepLabel: Record<Step, string> = {
    resume: "Resume",
    domain: "Domain",
    subdomain: "Sub-domain",
    jobtitles: "Job Titles",
    documents: "Documents",
  };

  const isStepDone = (s: Step) => {
    const idx = stepsForProgress.indexOf(s);
    return idx >= 0 && idx < stepIndex;
  };

  const isStepActive = (s: Step) => s === step;

  if (booting) {
    return (
      <div className="grid min-h-[70vh] place-items-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 font-bold text-white">
            S
          </div>
          <h1 className="text-lg font-semibold text-white">Preparing setup…</h1>
          <p className="mt-2 text-sm text-white/60">
            Please wait while your onboarding status is loaded.
          </p>
          <div className="mt-5 flex justify-center">
            <Loader2 className="animate-spin text-indigo-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-600/20">
              <span className="font-bold">S</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm text-white/60">SaaShaa AI</p>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                Getting Started
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={resetLocalState}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 sm:w-auto"
            >
              Reset
            </button>

            <button
              onClick={() => window.location.reload()}
              disabled={loadingStatus}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:opacity-50 sm:w-auto"
            >
              {loadingStatus ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <RefreshCw size={16} />
              )}
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:mt-8 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit lg:sticky lg:top-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white/90">Progress</p>
                <span className="text-xs text-white/50">
                  {Math.round(progressPct)}%
                </span>
              </div>

              <div className="relative mt-4">
                <div className="absolute bottom-2 left-2.75 top-2 w-0.5 rounded-full bg-white/10" />
                <div
                  className="absolute left-2.75 top-2 w-0.5 rounded-full bg-linear-to-b from-indigo-500 to-purple-600 transition-all"
                  style={{
                    height: `${Math.min(100, Math.max(0, progressPct))}%`,
                  }}
                />

                <div className="space-y-4">
                  {stepsForProgress.map((s) => {
                    const done = isStepDone(s);
                    const active = isStepActive(s);

                    return (
                      <div key={s} className="flex items-start gap-3">
                        <div
                          className={`mt-1 grid h-6 w-6 place-items-center rounded-full border text-xs font-semibold transition ${
                            done
                              ? "border-indigo-400/50 bg-indigo-500/20"
                              : active
                              ? "border-purple-400/60 bg-purple-500/20"
                              : "border-white/15 bg-white/5"
                          }`}
                        >
                          {done ? "✓" : active ? "•" : ""}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-semibold ${
                              active ? "text-white" : "text-white/80"
                            }`}
                          >
                            {StepLabel[s]}
                          </p>
                          <p className="text-xs text-white/50">
                            {s === "resume"
                              ? "Upload and scan"
                              : s === "domain"
                              ? "Pick one"
                              : s === "subdomain"
                              ? "Pick sub-domain(s)"
                              : s === "jobtitles"
                              ? "Pick job titles"
                              : "Verify documents"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {resumeScanned && (
                <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <p className="text-xs font-medium text-emerald-200">
                    Resume scanned successfully
                  </p>
                  {resumeFileName && (
                    <p className="mt-1 break-all text-xs text-white/65">
                      {resumeFileName}
                    </p>
                  )}
                  {typeof resumeScore === "number" && (
                    <p className="mt-1 text-xs text-white/65">
                      ATS-style score: {resumeScore}%
                    </p>
                  )}
                </div>
              )}
            </div>
          </aside>

          <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/40">
            <div className="flex min-h-[calc(100vh-250px)] flex-col sm:h-[calc(100vh-200px)]">
              <div className="border-b border-white/10 bg-white/5 p-5 sm:p-8">
                {step === "resume" && (
                  <>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      Upload your resume
                    </h2>
                    <p className="mt-2 text-sm text-white/60 sm:text-base">
                      Your resume is scanned by the backend before onboarding continues.
                    </p>
                  </>
                )}

                {step === "domain" && (
                  <>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      Choose domain
                    </h2>
                    <p className="mt-2 text-sm text-white/60 sm:text-base">
                      Select one main domain for your profile.
                    </p>
                  </>
                )}

                {step === "subdomain" && (
                  <>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      Choose sub-domain
                    </h2>
                    <p className="mt-2 text-sm text-white/60 sm:text-base">
                      Domain:{" "}
                      <span className="font-semibold text-white/85">{domain}</span>
                    </p>
                  </>
                )}

                {step === "jobtitles" && (
                  <>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      Choose job titles
                    </h2>
                    <p className="mt-2 text-sm text-white/60 sm:text-base">
                      Select one or more job titles for your chosen sub-domain.
                    </p>
                    <div className="mt-2 wrap-break-word text-sm text-white/70">
                      Domain:{" "}
                      <span className="font-semibold text-white/85">{domain}</span> •
                      Sub-domain:{" "}
                      <span className="font-semibold text-white/85">
                        {subDomainSingle}
                      </span>
                    </div>
                  </>
                )}

                {step === "documents" && (
                  <>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                      Verify your credentials
                    </h2>
                    <p className="mt-2 text-sm text-white/60 sm:text-base">
                      Please upload your marksheets to complete the verification.
                    </p>
                    <div className="mt-2 text-sm text-white/70">
                      Domain: <span className="font-semibold text-white/85">{domain}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-8">
                {saveSuccess && (
                  <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <CheckCircle2 size={18} className="mt-0.5 text-emerald-300" />
                    <p className="text-sm text-emerald-100">{saveSuccess}</p>
                  </div>
                )}

                {saveError && (
                  <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                    <AlertCircle size={18} className="mt-0.5 text-red-300" />
                    <p className="text-sm text-red-100">{saveError}</p>
                  </div>
                )}

                {step === "resume" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                      <label className="text-sm text-white/70">
                        Resume file (PDF/DOC/DOCX)
                      </label>

                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                        className="mt-3 block w-full text-sm text-white/80 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-slate-900 hover:file:bg-white/90"
                      />

                      {resumeFile && (
                        <p className="mt-3 break-all text-xs text-white/60">
                          Selected:{" "}
                          <span className="text-white/80">{resumeFile.name}</span>
                        </p>
                      )}

                      {resumeFileName && !resumeFile && (
                        <p className="mt-3 break-all text-xs text-emerald-300">
                          Existing resume on backend:{" "}
                          <span className="text-white/80">{resumeFileName}</span>
                        </p>
                      )}

                      {resumeError && (
                        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                          <AlertCircle size={16} className="mt-0.5 text-red-300" />
                          <p className="text-sm text-red-300">{resumeError}</p>
                        </div>
                      )}

                      <button
                        onClick={handleResumeUpload}
                        disabled={!resumeFile || resumeUploading}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {resumeUploading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Uploading Resume...
                          </>
                        ) : (
                          <>
                            <Upload size={18} />
                            Upload and Continue
                          </>
                        )}
                      </button>
                    </div>

                    {(resumeParsedText || typeof resumeScore === "number") && (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <FileUp size={18} className="text-indigo-300" />
                          <p className="text-sm font-semibold text-white/90">
                            Resume Scan Preview
                          </p>
                        </div>

                        {typeof resumeScore === "number" && (
                          <p className="mt-3 text-sm text-white/70">
                            ATS-style scan score:{" "}
                            <span className="font-semibold text-white">
                              {resumeScore}%
                            </span>
                          </p>
                        )}

                        {resumeParsedText && (
                          <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3">
                            <pre className="whitespace-pre-wrap wrap-break-word font-sans text-xs text-white/65">
                              {resumeParsedText}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {step === "domain" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["Technical", "Non-Technical"] as DomainType[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDomain(d)}
                        className={`rounded-2xl border px-5 py-4 text-left transition ${
                          domain === d
                            ? "border-indigo-400/40 bg-indigo-600/15"
                            : "border-white/10 bg-black/20 hover:bg-white/5"
                        }`}
                      >
                        <p className="font-semibold">{d}</p>
                        <p className="mt-1 text-sm text-white/60">
                          {d === "Technical"
                            ? "Engineering, analytics, security, infrastructure…"
                            : "Sales, marketing, HR, operations, finance…"}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {step === "subdomain" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                      <div className="flex items-center gap-2">
                        <Layers3 size={18} className="text-purple-300" />
                        <p className="text-sm font-semibold text-white/90">Mode</p>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                            anyEnabled
                              ? "border-purple-400/40 bg-purple-600/15"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={anyEnabled}
                            onChange={toggleAny}
                            className="mt-1 h-4 w-4 accent-purple-500"
                          />
                          <div>
                            <p className="font-semibold">Any</p>
                            <p className="mt-1 text-xs text-white/60">
                              Include all sub-domains automatically and skip job titles.
                            </p>
                          </div>
                        </label>

                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                            multiEnabled
                              ? "border-purple-400/40 bg-purple-600/15"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={multiEnabled}
                            onChange={toggleMulti}
                            className="mt-1 h-4 w-4 accent-purple-500"
                          />
                          <div>
                            <p className="font-semibold">Choose multiple</p>
                            <p className="mt-1 text-xs text-white/60">
                              Select multiple sub-domains and skip job titles.
                            </p>
                          </div>
                        </label>
                      </div>

                      <p className="mt-3 text-xs text-white/50">
                        If both are unchecked, setup stays in single sub-domain mode.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-white/90">
                          {subDomainMode === "any"
                            ? "Sub-domains (all included)"
                            : subDomainMode === "multi"
                            ? "Select one or more sub-domains"
                            : "Select exactly one sub-domain"}
                        </p>
                        <span className="text-xs text-white/50">
                          {subDomainMode === "any"
                            ? "Selection disabled"
                            : subDomainMode === "multi"
                            ? `${subDomainMulti.length} selected`
                            : subDomainSingle
                            ? "1 selected"
                            : "0 selected"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {availableSubDomains.map((s) => {
                          const checkedMulti = subDomainMulti.includes(s);
                          const checkedSingle = subDomainSingle === s;
                          const disabled = subDomainMode === "any";
                          const active =
                            subDomainMode === "multi" ? checkedMulti : checkedSingle;

                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                if (disabled) return;

                                if (subDomainMode === "multi") {
                                  toggleMultiSubdomain(s);
                                } else {
                                  setSubDomainSingle(s);
                                  setJobTitles([]);
                                }
                              }}
                              className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                                disabled
                                  ? "cursor-not-allowed border-white/10 bg-white/5 opacity-60"
                                  : active
                                  ? "border-indigo-400/40 bg-indigo-600/15"
                                  : "border-white/10 bg-black/20 hover:bg-white/5"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold">{s}</p>
                                  <p className="mt-1 text-sm text-white/60">
                                    {subDomainMode === "any"
                                      ? "Included automatically."
                                      : subDomainMode === "multi"
                                      ? "Click to select or unselect."
                                      : "Click to select this sub-domain."}
                                  </p>
                                </div>

                                <div
                                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs ${
                                    active
                                      ? "border-indigo-400/60 bg-indigo-500/20"
                                      : "border-white/20 bg-white/5"
                                  }`}
                                >
                                  {active ? "✓" : ""}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs text-white/60">
                          Current mode:{" "}
                          <span className="font-semibold text-white/80">
                            {subDomainMode === "single"
                              ? "Single"
                              : subDomainMode === "multi"
                              ? "Multiple"
                              : "Any"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {step === "jobtitles" && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                      <div className="flex items-center gap-2">
                        <Briefcase size={18} className="text-indigo-300" />
                        <p className="text-sm font-semibold text-white/90">
                          Available job titles
                        </p>
                      </div>

                      {availableJobTitles.length === 0 ? (
                        <p className="mt-3 text-sm text-white/60">
                          No job titles found for this sub-domain.
                        </p>
                      ) : (
                        <div className="mt-4 grid gap-3">
                          {availableJobTitles.map((t) => {
                            const checked = jobTitles.includes(t);

                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => toggleJobTitle(t)}
                                className={`w-full rounded-2xl border px-5 py-4 text-left transition ${
                                  checked
                                    ? "border-indigo-400/40 bg-indigo-600/15"
                                    : "border-white/10 bg-black/20 hover:bg-white/5"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-semibold">{t}</p>
                                    <p className="mt-1 text-sm text-white/60">
                                      Click to {checked ? "unselect" : "select"}.
                                    </p>
                                  </div>

                                  <div
                                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border text-xs ${
                                      checked
                                        ? "border-indigo-400/60 bg-indigo-500/20"
                                        : "border-white/20 bg-white/5"
                                    }`}
                                  >
                                    {checked ? "✓" : ""}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === "documents" && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DocCard
                        title="Class 10th Result"
                        subtitle="Compulsory for all domains"
                        url={class10Url}
                        type="class10"
                        isUploading={uploadingDoc === "class10"}
                        onUpload={handleDocUpload}
                        required
                      />
                      <DocCard
                        title="Class 12th Result"
                        subtitle="Compulsory for all domains"
                        url={class12Url}
                        type="class12"
                        isUploading={uploadingDoc === "class12"}
                        onUpload={handleDocUpload}
                        required
                      />
                      <DocCard
                        title="Graduation Marksheet"
                        subtitle={domain === "Technical" ? "Compulsory for Tech" : "Optional for Non-Tech"}
                        url={graduationUrl}
                        type="graduation"
                        isUploading={uploadingDoc === "graduation"}
                        onUpload={handleDocUpload}
                        required={domain === "Technical"}
                      />
                      <DocCard
                        title="Post Graduation"
                        subtitle={domain === "Technical" ? "Compulsory for Tech" : "Optional for Non-Tech"}
                        url={postGraduationUrl}
                        type="postgrad"
                        isUploading={uploadingDoc === "postgrad"}
                        onUpload={handleDocUpload}
                        required={domain === "Technical"}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 bg-slate-950/40 p-5 backdrop-blur sm:p-8">
                {step === "resume" && (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => router.replace("/auth/login")}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white/85 transition hover:bg-white/10 sm:flex-1"
                    >
                      Back to Login
                    </button>
                    <button
                      onClick={handleResumeUpload}
                      disabled={!resumeFile || resumeUploading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                    >
                      {resumeUploading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={18} />
                          Upload and Continue
                        </>
                      )}
                    </button>
                  </div>
                )}

                {step === "domain" && (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => setStep("resume")}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white/85 transition hover:bg-white/10 sm:flex-1"
                    >
                      <ChevronLeft size={18} />
                      Back
                    </button>
                    <button
                      onClick={goNextFromDomain}
                      disabled={!domain}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                    >
                      Continue
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}

                {step === "subdomain" && (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => setStep("domain")}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white/85 transition hover:bg-white/10 sm:flex-1"
                    >
                      <ChevronLeft size={18} />
                      Back
                    </button>

                    {showJobTitles ? (
                      <button
                        onClick={() => {
                          if (!canContinueSubdomain()) return;
                          setStep("jobtitles");
                        }}
                        disabled={!canContinueSubdomain()}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                      >
                        Continue
                        <ChevronRight size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!canContinueSubdomain()) return;
                          setStep("documents");
                        }}
                        disabled={!canContinueSubdomain()}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                      >
                        Continue
                        <ChevronRight size={18} />
                      </button>
                    )}
                  </div>
                )}

                {step === "jobtitles" && (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => setStep("subdomain")}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white/85 transition hover:bg-white/10 sm:flex-1"
                    >
                      <ChevronLeft size={18} />
                      Back
                    </button>
                    <button
                      onClick={() => setStep("documents")}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-95 sm:flex-1"
                    >
                      Continue
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}

                {step === "documents" && (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => {
                        if (showJobTitles) {
                          setStep("jobtitles");
                        } else {
                          setStep("subdomain");
                        }
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white/85 transition hover:bg-white/10 sm:flex-1"
                    >
                      <ChevronLeft size={18} />
                      Back
                    </button>
                    <button
                      onClick={saveOnboarding}
                      disabled={saving}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          Finish Setup
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <p className="mt-6 text-center text-xs text-white/45">
          Backend-integrated setup wizard • Resume scan required • Progress saved
          through onboarding API.
        </p>
      </div>
    </div>
  );
}