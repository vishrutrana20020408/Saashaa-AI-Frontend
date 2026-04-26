/**
 * src/components/config/onboardingOptions.ts
 *
 * Backend-integrated onboarding option configuration
 * aligned with the latest project update.
 *
 * Purpose:
 * - centralizes frontend fallback/default onboarding options
 * - supports backend-driven onboarding configuration
 * - provides typed helpers for /user/setup, /user/page, /user/profile/settings
 * - supports cookie/session auth and legacy bearer-token frontend flow
 * - stays aligned with the backend-first Interview System / Resume Management System architecture
 *
 * Recommended backend endpoint:
 * GET /api/user/onboarding/options
 *
 * Supported backend response shapes:
 * 1) Plain object
 * 2) Wrapped object with data / result / payload / content
 * 3) Nested wrapped object
 *
 * Notes:
 * - If backend is unavailable, frontend falls back to DEFAULT_* values.
 * - This file is safe to import in client components.
 * - This file does not use React hooks.
 * - This version is aligned with the current onboarding + auth + resume-integrated project flow.
 */

export type DomainType = "Technical" | "Non-Technical";

export const SUBDOMAIN_MODE = {
  SINGLE: "single",
  ANY: "any",
  MULTI: "multi",
} as const;

export type SubDomainMode =
  (typeof SUBDOMAIN_MODE)[keyof typeof SUBDOMAIN_MODE];

export type SubDomainsMap = Record<DomainType, readonly string[]>;
export type JobTitlesMap = Record<DomainType, Record<string, readonly string[]>>;

export type OnboardingOptionsConfig = {
  domains: readonly DomainType[];
  subDomainMode: typeof SUBDOMAIN_MODE;
  subDomains: SubDomainsMap;
  jobTitles: JobTitlesMap;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  result?: T | null;
  payload?: T | null;
  content?: T | null;
};

type BackendOnboardingConfig = Partial<{
  domains: string[];
  subDomainMode: Partial<typeof SUBDOMAIN_MODE>;
  subDomains: Record<string, string[]>;
  jobTitles: Record<string, Record<string, string[]>>;
}>;

/* =========================================
   DEFAULT FRONTEND FALLBACK CONFIG
========================================= */

export const DEFAULT_DOMAINS: readonly DomainType[] = [
  "Technical",
  "Non-Technical",
] as const;

export const DEFAULT_SUBDOMAINS: SubDomainsMap = {
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

export const DEFAULT_JOB_TITLES: JobTitlesMap = {
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

export const DEFAULT_ONBOARDING_OPTIONS: OnboardingOptionsConfig = {
  domains: DEFAULT_DOMAINS,
  subDomainMode: SUBDOMAIN_MODE,
  subDomains: DEFAULT_SUBDOMAINS,
  jobTitles: DEFAULT_JOB_TITLES,
};

/* =========================================
   BACKEND CONFIG
========================================= */

export const ONBOARDING_OPTIONS_API_PATH = "/api/user/onboarding/options";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function getApiBaseUrl(): string {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.trim() ||
      "http://localhost:8080"
  );
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("admin_token") ||
    null
  );
}

function normalizeRole(value?: string | null): "USER" | "ADMIN" | "UNKNOWN" {
  const normalized = (value || "").trim().toUpperCase();

  if (normalized === "USER" || normalized === "ROLE_USER") return "USER";
  if (normalized === "ADMIN" || normalized === "ROLE_ADMIN") return "ADMIN";
  return "UNKNOWN";
}

function getStoredRole(): "USER" | "ADMIN" | "UNKNOWN" {
  if (typeof window === "undefined") return "UNKNOWN";

  return normalizeRole(
    localStorage.getItem("userRole") || localStorage.getItem("role")
  );
}

function unwrapResponse<T>(value: unknown): T {
  if (value && typeof value === "object") {
    const obj = value as ApiEnvelope<T>;
    const level1 =
      obj.data ?? obj.result ?? obj.payload ?? obj.content ?? value;

    if (level1 && typeof level1 === "object") {
      const nested = level1 as ApiEnvelope<T>;
      return (nested.data ??
        nested.result ??
        nested.payload ??
        nested.content ??
        level1) as T;
    }

    return level1 as T;
  }

  return value as T;
}

/* =========================================
   TYPE / VALUE GUARDS
========================================= */

export function isDomain(x: unknown): x is DomainType {
  return x === "Technical" || x === "Non-Technical";
}

function sanitizeStringArray(
  input: unknown,
  fallback: readonly string[] = []
): readonly string[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [...fallback];
  }

  const cleaned = input
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : [...fallback];
}

function sanitizeDomains(input?: string[]): readonly DomainType[] {
  if (!Array.isArray(input) || input.length === 0) {
    return DEFAULT_DOMAINS;
  }

  const filtered = input.filter(isDomain);
  return filtered.length > 0 ? filtered : DEFAULT_DOMAINS;
}

function sanitizeSubDomains(input?: Record<string, string[]>): SubDomainsMap {
  return {
    Technical:
      Array.isArray(input?.Technical) && input.Technical.length > 0
        ? [...sanitizeStringArray(input.Technical, DEFAULT_SUBDOMAINS.Technical)]
        : [...DEFAULT_SUBDOMAINS.Technical],
    "Non-Technical":
      Array.isArray(input?.["Non-Technical"]) &&
      input["Non-Technical"].length > 0
        ? [
            ...sanitizeStringArray(
              input["Non-Technical"],
              DEFAULT_SUBDOMAINS["Non-Technical"]
            ),
          ]
        : [...DEFAULT_SUBDOMAINS["Non-Technical"]],
  };
}

function sanitizeJobTitles(
  input?: Record<string, Record<string, string[]>>
): JobTitlesMap {
  const buildDomainMap = (
    domain: DomainType,
    fallback: Record<string, readonly string[]>
  ): Record<string, readonly string[]> => {
    const backendMap = input?.[domain];
    const result: Record<string, readonly string[]> = {};

    const keys = new Set<string>([
      ...Object.keys(fallback),
      ...Object.keys(backendMap || {}),
    ]);

    for (const key of keys) {
      const fallbackValues = fallback[key] || [];
      const value = backendMap?.[key];

      result[key] =
        Array.isArray(value) && value.length > 0
          ? [...sanitizeStringArray(value, fallbackValues)]
          : [...fallbackValues];
    }

    return result;
  };

  return {
    Technical: buildDomainMap("Technical", DEFAULT_JOB_TITLES.Technical),
    "Non-Technical": buildDomainMap(
      "Non-Technical",
      DEFAULT_JOB_TITLES["Non-Technical"]
    ),
  };
}

function sanitizeSubDomainMode(
  input?: Partial<typeof SUBDOMAIN_MODE>
): typeof SUBDOMAIN_MODE {
  return {
    SINGLE:
      (typeof input?.SINGLE === "string" && input.SINGLE.trim()
        ? input.SINGLE.trim()
        : SUBDOMAIN_MODE.SINGLE) as typeof SUBDOMAIN_MODE["SINGLE"],
    ANY:
      (typeof input?.ANY === "string" && input.ANY.trim()
        ? input.ANY.trim()
        : SUBDOMAIN_MODE.ANY) as typeof SUBDOMAIN_MODE["ANY"],
    MULTI:
      (typeof input?.MULTI === "string" && input.MULTI.trim()
        ? input.MULTI.trim()
        : SUBDOMAIN_MODE.MULTI) as typeof SUBDOMAIN_MODE["MULTI"],
  } as typeof SUBDOMAIN_MODE;
}

/* =========================================
   MERGE BACKEND + FRONTEND DEFAULTS
========================================= */

export function mergeOnboardingOptions(
  backendConfig?: BackendOnboardingConfig | null
): OnboardingOptionsConfig {
  return {
    domains: sanitizeDomains(backendConfig?.domains),
    subDomainMode: sanitizeSubDomainMode(backendConfig?.subDomainMode),
    subDomains: sanitizeSubDomains(backendConfig?.subDomains),
    jobTitles: sanitizeJobTitles(backendConfig?.jobTitles),
  };
}

/* =========================================
   FETCH BACKEND OPTIONS
========================================= */

export async function fetchOnboardingOptions(): Promise<OnboardingOptionsConfig> {
  const apiBaseUrl = getApiBaseUrl();
  const token = getAccessToken();
  const role = getStoredRole();

  try {
    const response = await fetch(`${apiBaseUrl}${ONBOARDING_OPTIONS_API_PATH}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return DEFAULT_ONBOARDING_OPTIONS;
    }

    const raw = (await response.json()) as
      | BackendOnboardingConfig
      | ApiEnvelope<BackendOnboardingConfig>;

    const data = unwrapResponse<BackendOnboardingConfig>(raw);
    const merged = mergeOnboardingOptions(data);

    if (role === "ADMIN") {
      return DEFAULT_ONBOARDING_OPTIONS;
    }

    return merged;
  } catch {
    return DEFAULT_ONBOARDING_OPTIONS;
  }
}

/* =========================================
   HELPERS FOR UI COMPONENTS
========================================= */

export function getDomains(
  config: OnboardingOptionsConfig = DEFAULT_ONBOARDING_OPTIONS
): readonly DomainType[] {
  return config.domains;
}

export function getSubDomainModes(
  config: OnboardingOptionsConfig = DEFAULT_ONBOARDING_OPTIONS
): typeof SUBDOMAIN_MODE {
  return config.subDomainMode;
}

export function getSubDomains(
  domain: DomainType,
  config: OnboardingOptionsConfig = DEFAULT_ONBOARDING_OPTIONS
): string[] {
  return [...(config.subDomains[domain] || [])];
}

export function getJobTitles(
  domain: DomainType,
  subDomain: string,
  config: OnboardingOptionsConfig = DEFAULT_ONBOARDING_OPTIONS
): string[] {
  const domainMap = config.jobTitles[domain] as Record<string, readonly string[]>;
  return domainMap[subDomain] ? [...domainMap[subDomain]] : [];
}

export function getAllJobTitlesForDomain(
  domain: DomainType,
  config: OnboardingOptionsConfig = DEFAULT_ONBOARDING_OPTIONS
): string[] {
  const domainMap = config.jobTitles[domain] as Record<string, readonly string[]>;
  const results = Object.values(domainMap).flatMap((titles) => [...titles]);
  return Array.from(new Set(results));
}

export function isValidSubDomain(
  domain: DomainType,
  subDomain: string,
  config: OnboardingOptionsConfig = DEFAULT_ONBOARDING_OPTIONS
): boolean {
  return getSubDomains(domain, config).includes(subDomain);
}

export function isValidJobTitle(
  domain: DomainType,
  subDomain: string,
  jobTitle: string,
  config: OnboardingOptionsConfig = DEFAULT_ONBOARDING_OPTIONS
): boolean {
  return getJobTitles(domain, subDomain, config).includes(jobTitle);
}

/* =========================================
   OPTIONAL PAYLOAD BUILDER
   Useful for sending frontend selections to backend
========================================= */

export type UserOnboardingSelectionPayload = {
  domain: DomainType | null;
  subDomainMode: SubDomainMode | null;
  subDomainSingle?: string | null;
  subDomainMulti: string[];
  jobTitles: string[];
};

export function buildOnboardingSelectionPayload(input: {
  domain?: DomainType | null;
  subDomainMode?: SubDomainMode | null;
  subDomainSingle?: string | null;
  subDomainMulti?: string[];
  jobTitles?: string[];
}): UserOnboardingSelectionPayload {
  return {
    domain: input.domain ?? null,
    subDomainMode: input.subDomainMode ?? null,
    subDomainSingle: input.subDomainSingle ?? null,
    subDomainMulti: Array.isArray(input.subDomainMulti)
      ? [...input.subDomainMulti]
      : [],
    jobTitles: Array.isArray(input.jobTitles) ? [...input.jobTitles] : [],
  };
}

/* =========================================
   OPTIONAL BACKEND REQUEST HELPERS
   Useful for setup/profile pages
========================================= */

export async function refreshOnboardingOptionsOrDefault(): Promise<OnboardingOptionsConfig> {
  return fetchOnboardingOptions();
}

export function getDefaultOnboardingOptions(): OnboardingOptionsConfig {
  return DEFAULT_ONBOARDING_OPTIONS;
}

export function getTechnicalSubDomains(): string[] {
  return [...DEFAULT_SUBDOMAINS.Technical];
}

export function getNonTechnicalSubDomains(): string[] {
  return [...DEFAULT_SUBDOMAINS["Non-Technical"]];
}