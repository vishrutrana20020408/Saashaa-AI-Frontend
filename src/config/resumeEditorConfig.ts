/**
 * src/components/config/resumeEditorConfig.ts
 *
 * Backend-integrated Resume Editor configuration
 * aligned with the latest project update.
 *
 * Purpose:
 * - central source of truth for resume editor UI + backend-driven config
 * - provides safe frontend defaults when backend config is unavailable
 * - used by user resume edit pages, admin resume tools, tailoring screens, and preview forms
 * - aligned with current backend-driven Resume Management / Interview System architecture
 *
 * Recommended backend endpoint:
 * GET /api/resume/editor/config
 *
 * Supported backend response shapes:
 *
 * 1) Plain object:
 *    {
 *      sections: [...],
 *      sectionLabels: {...},
 *      sectionOrder: [...],
 *      features: {...},
 *      limits: {...},
 *      templates: [...],
 *      defaults: {...}
 *    }
 *
 * 2) Wrapped object:
 *    {
 *      success: true,
 *      data: {
 *        sections: [...],
 *        sectionLabels: {...},
 *        sectionOrder: [...],
 *        features: {...},
 *        limits: {...},
 *        templates: [...],
 *        defaults: {...}
 *      }
 *    }
 *
 * 3) Flexible backend envelopes:
 *    { payload: {...} } / { result: {...} } / { content: {...} }
 *
 * Notes:
 * - If backend config is unavailable, frontend falls back to DEFAULT_* config.
 * - Safe to import into client components.
 * - Does not use React hooks.
 * - Uses latest token fallback strategy and cookie-friendly backend fetch mode.
 */

export const RESUME_EDITOR_CONFIG_API_PATH = "/api/resume/editor/config";

export const RESUME_EDITOR_SECTIONS = {
  HEADER: "header",
  SUMMARY: "summary",
  EXPERIENCE: "experience",
  EDUCATION: "education",
  SKILLS: "skills",
  PROJECTS: "projects",
  CERTIFICATIONS: "certifications",
  ACHIEVEMENTS: "achievements",
  LANGUAGES: "languages",
  TOOLS: "tools",
  LINKS: "links",
  CUSTOM: "custom",
} as const;

export type ResumeEditorSectionKey =
  (typeof RESUME_EDITOR_SECTIONS)[keyof typeof RESUME_EDITOR_SECTIONS];

export type ResumeEditorSectionConfig = {
  key: ResumeEditorSectionKey | string;
  label: string;
  enabled: boolean;
  required: boolean;
  visibleInPreview: boolean;
  allowMultiple?: boolean;
  maxItems?: number | null;
  placeholder?: string;
  description?: string;
};

export type ResumeEditorFeatures = {
  autoSave: boolean;
  livePreview: boolean;
  dragAndDropSections: boolean;
  versioning: boolean;
  tailoring: boolean;
  atsScoring: boolean;
  aiSuggestions: boolean;
  markdownSummary: boolean;
  richTextSummary: boolean;
  uploadReplaceBaseResume: boolean;
  duplicateSectionEntries: boolean;
};

export type ResumeEditorLimits = {
  maxSummaryLength: number;
  maxSkillItems: number;
  maxProjectItems: number;
  maxExperienceItems: number;
  maxEducationItems: number;
  maxCertificationItems: number;
  maxAchievementItems: number;
  maxLanguageItems: number;
  maxToolItems: number;
  maxCustomSections: number;
  maxLinks: number;
};

export type ResumeTemplateOption = {
  code: string;
  name: string;
  description?: string;
  enabled: boolean;
  isDefault?: boolean;
};

export type ResumeEditorDefaults = {
  defaultTemplateCode: string;
  defaultSectionOrder: string[];
  defaultResumeTitle: string;
  defaultVersionNamePrefix: string;
  defaultCustomSectionTitle: string;
};

export type ResumeEditorConfig = {
  sections: ResumeEditorSectionConfig[];
  sectionLabels: Record<string, string>;
  sectionOrder: string[];
  features: ResumeEditorFeatures;
  limits: ResumeEditorLimits;
  templates: ResumeTemplateOption[];
  defaults: ResumeEditorDefaults;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T | null;
  result?: T | null;
  payload?: T | null;
  content?: T | null;
};

type BackendResumeEditorConfig = Partial<{
  sections: Partial<ResumeEditorSectionConfig>[];
  sectionLabels: Record<string, string>;
  sectionOrder: string[];
  features: Partial<ResumeEditorFeatures>;
  limits: Partial<ResumeEditorLimits>;
  templates: Partial<ResumeTemplateOption>[];
  defaults: Partial<ResumeEditorDefaults>;
}>;

/* =========================================================
   DEFAULT FRONTEND CONFIG
========================================================= */

export const DEFAULT_RESUME_EDITOR_SECTIONS: ResumeEditorSectionConfig[] = [
  {
    key: RESUME_EDITOR_SECTIONS.HEADER,
    label: "Header",
    enabled: true,
    required: true,
    visibleInPreview: true,
    allowMultiple: false,
    maxItems: 1,
    placeholder: "Name, title, contact details, links",
    description: "Top resume identity section with primary contact information.",
  },
  {
    key: RESUME_EDITOR_SECTIONS.SUMMARY,
    label: "Professional Summary",
    enabled: true,
    required: false,
    visibleInPreview: true,
    allowMultiple: false,
    maxItems: 1,
    placeholder: "Write a concise professional summary",
    description: "Short overview tailored to target role and industry.",
  },
  {
    key: RESUME_EDITOR_SECTIONS.EXPERIENCE,
    label: "Work Experience",
    enabled: true,
    required: false,
    visibleInPreview: true,
    allowMultiple: true,
    maxItems: 15,
    placeholder: "Add work experience entries",
    description: "Professional experience, internships, and role-based achievements.",
  },
  {
    key: RESUME_EDITOR_SECTIONS.EDUCATION,
    label: "Education",
    enabled: true,
    required: false,
    visibleInPreview: true,
    allowMultiple: true,
    maxItems: 10,
    placeholder: "Add education details",
    description: "Degrees, institutes, grades, and academic timeline.",
  },
  {
    key: RESUME_EDITOR_SECTIONS.SKILLS,
    label: "Skills",
    enabled: true,
    required: false,
    visibleInPreview: true,
    allowMultiple: true,
    maxItems: 50,
    placeholder: "Add technical or non-technical skills",
    description: "Core skills grouped for ATS and recruiter readability.",
  },
  {
    key: RESUME_EDITOR_SECTIONS.PROJECTS,
    label: "Projects",
    enabled: true,
    required: false,
    visibleInPreview: true,
    allowMultiple: true,
    maxItems: 12,
    placeholder: "Add projects and outcomes",
    description: "Projects with measurable impact, tools, and links.",
  },
  {
    key: RESUME_EDITOR_SECTIONS.CERTIFICATIONS,
    label: "Certifications",
    enabled: true,
    required: false,
    visibleInPreview: true,
    allowMultiple: true,
    maxItems: 10,
    placeholder: "Add certifications",
    description: "Professional certifications and credential details.",
  },
  {
    key: RESUME_EDITOR_SECTIONS.ACHIEVEMENTS,
    label: "Achievements",
    enabled: true,
    required: false,
    visibleInPreview: true,
    allowMultiple: true,
    maxItems: 10,
    placeholder: "Add achievements or awards",
    description: "Achievements, honors, and recognition items.",
  },
  {
    key: RESUME_EDITOR_SECTIONS.LANGUAGES,
    label: "Languages",
    enabled: true,
    required: false,
    visibleInPreview: true,
    allowMultiple: true,
    maxItems: 10,
    placeholder: "Add spoken/written languages",
    description: "Languages and proficiency levels.",
  },
  {
    key: RESUME_EDITOR_SECTIONS.TOOLS,
    label: "Tools & Platforms",
    enabled: true,
    required: false,
    visibleInPreview: true,
    allowMultiple: true,
    maxItems: 30,
    placeholder: "Add tools and platforms",
    description: "Software, platforms, environments, and utilities.",
  },
  {
    key: RESUME_EDITOR_SECTIONS.LINKS,
    label: "Links",
    enabled: true,
    required: false,
    visibleInPreview: true,
    allowMultiple: true,
    maxItems: 10,
    placeholder: "Add portfolio, GitHub, LinkedIn, website links",
    description: "External professional profile or portfolio links.",
  },
  {
    key: RESUME_EDITOR_SECTIONS.CUSTOM,
    label: "Custom Section",
    enabled: true,
    required: false,
    visibleInPreview: true,
    allowMultiple: true,
    maxItems: 5,
    placeholder: "Add a custom section",
    description: "Flexible section for domain-specific information.",
  },
];

export const DEFAULT_RESUME_EDITOR_FEATURES: ResumeEditorFeatures = {
  autoSave: true,
  livePreview: true,
  dragAndDropSections: true,
  versioning: true,
  tailoring: true,
  atsScoring: true,
  aiSuggestions: true,
  markdownSummary: false,
  richTextSummary: true,
  uploadReplaceBaseResume: true,
  duplicateSectionEntries: true,
};

export const DEFAULT_RESUME_EDITOR_LIMITS: ResumeEditorLimits = {
  maxSummaryLength: 1200,
  maxSkillItems: 50,
  maxProjectItems: 12,
  maxExperienceItems: 15,
  maxEducationItems: 10,
  maxCertificationItems: 10,
  maxAchievementItems: 10,
  maxLanguageItems: 10,
  maxToolItems: 30,
  maxCustomSections: 5,
  maxLinks: 10,
};

export const DEFAULT_RESUME_EDITOR_TEMPLATES: ResumeTemplateOption[] = [
  {
    code: "modern-professional",
    name: "Modern Professional",
    description: "Balanced layout for most technical and professional roles.",
    enabled: true,
    isDefault: true,
  },
  {
    code: "classic-ats",
    name: "Classic ATS",
    description: "ATS-friendly minimal design with recruiter-safe formatting.",
    enabled: true,
    isDefault: false,
  },
  {
    code: "compact-one-page",
    name: "Compact One Page",
    description: "Concise single-page layout for early-career candidates.",
    enabled: true,
    isDefault: false,
  },
];

export const DEFAULT_RESUME_EDITOR_DEFAULTS: ResumeEditorDefaults = {
  defaultTemplateCode: "modern-professional",
  defaultSectionOrder: DEFAULT_RESUME_EDITOR_SECTIONS.map((s) => s.key),
  defaultResumeTitle: "My Resume",
  defaultVersionNamePrefix: "Version",
  defaultCustomSectionTitle: "Additional Information",
};

export const DEFAULT_RESUME_EDITOR_CONFIG: ResumeEditorConfig = {
  sections: DEFAULT_RESUME_EDITOR_SECTIONS,
  sectionLabels: DEFAULT_RESUME_EDITOR_SECTIONS.reduce<Record<string, string>>(
    (acc, section) => {
      acc[section.key] = section.label;
      return acc;
    },
    {}
  ),
  sectionOrder: DEFAULT_RESUME_EDITOR_DEFAULTS.defaultSectionOrder,
  features: DEFAULT_RESUME_EDITOR_FEATURES,
  limits: DEFAULT_RESUME_EDITOR_LIMITS,
  templates: DEFAULT_RESUME_EDITOR_TEMPLATES,
  defaults: DEFAULT_RESUME_EDITOR_DEFAULTS,
};

/* =========================================================
   INTERNAL HELPERS
========================================================= */

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

function unwrapResponse<T>(value: unknown): T {
  if (value && typeof value === "object") {
    const obj = value as ApiEnvelope<T>;
    const level1 = obj.data ?? obj.result ?? obj.payload ?? obj.content ?? value;

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

function asPositiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((v) => String(v).trim()).filter(Boolean))];
}

function resolveRole(): "USER" | "ADMIN" | "UNKNOWN" {
  if (typeof window === "undefined") return "UNKNOWN";

  const raw =
    localStorage.getItem("userRole") ||
    localStorage.getItem("role") ||
    "";

  const normalized = raw.trim().toUpperCase();
  if (normalized === "USER" || normalized === "ROLE_USER") return "USER";
  if (normalized === "ADMIN" || normalized === "ROLE_ADMIN") return "ADMIN";
  return "UNKNOWN";
}

/* =========================================================
   SANITIZERS
========================================================= */

function sanitizeSections(
  input?: Partial<ResumeEditorSectionConfig>[]
): ResumeEditorSectionConfig[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [...DEFAULT_RESUME_EDITOR_SECTIONS];
  }

  const fallbackMap = new Map(
    DEFAULT_RESUME_EDITOR_SECTIONS.map((section) => [section.key, section])
  );

  const sections = input
    .filter((item) => typeof item?.key === "string" && item.key.trim().length > 0)
    .map((item) => {
      const key = String(item.key).trim();
      const fallback =
        fallbackMap.get(key as ResumeEditorSectionKey) ||
        ({
          key,
          label: key,
          enabled: true,
          required: false,
          visibleInPreview: true,
          allowMultiple: true,
          maxItems: null,
          placeholder: "",
          description: "",
        } as ResumeEditorSectionConfig);

      return {
        key,
        label: asString(item.label, fallback.label),
        enabled: asBoolean(item.enabled, fallback.enabled),
        required: asBoolean(item.required, fallback.required),
        visibleInPreview: asBoolean(
          item.visibleInPreview,
          fallback.visibleInPreview
        ),
        allowMultiple: asBoolean(item.allowMultiple, fallback.allowMultiple ?? true),
        maxItems:
          item.maxItems === null
            ? null
            : asPositiveNumber(item.maxItems, fallback.maxItems ?? 1),
        placeholder: asString(item.placeholder, fallback.placeholder ?? ""),
        description: asString(item.description, fallback.description ?? ""),
      };
    });

  return sections.length > 0 ? sections : [...DEFAULT_RESUME_EDITOR_SECTIONS];
}

function sanitizeFeatures(
  input?: Partial<ResumeEditorFeatures>
): ResumeEditorFeatures {
  return {
    autoSave: asBoolean(input?.autoSave, DEFAULT_RESUME_EDITOR_FEATURES.autoSave),
    livePreview: asBoolean(
      input?.livePreview,
      DEFAULT_RESUME_EDITOR_FEATURES.livePreview
    ),
    dragAndDropSections: asBoolean(
      input?.dragAndDropSections,
      DEFAULT_RESUME_EDITOR_FEATURES.dragAndDropSections
    ),
    versioning: asBoolean(
      input?.versioning,
      DEFAULT_RESUME_EDITOR_FEATURES.versioning
    ),
    tailoring: asBoolean(
      input?.tailoring,
      DEFAULT_RESUME_EDITOR_FEATURES.tailoring
    ),
    atsScoring: asBoolean(
      input?.atsScoring,
      DEFAULT_RESUME_EDITOR_FEATURES.atsScoring
    ),
    aiSuggestions: asBoolean(
      input?.aiSuggestions,
      DEFAULT_RESUME_EDITOR_FEATURES.aiSuggestions
    ),
    markdownSummary: asBoolean(
      input?.markdownSummary,
      DEFAULT_RESUME_EDITOR_FEATURES.markdownSummary
    ),
    richTextSummary: asBoolean(
      input?.richTextSummary,
      DEFAULT_RESUME_EDITOR_FEATURES.richTextSummary
    ),
    uploadReplaceBaseResume: asBoolean(
      input?.uploadReplaceBaseResume,
      DEFAULT_RESUME_EDITOR_FEATURES.uploadReplaceBaseResume
    ),
    duplicateSectionEntries: asBoolean(
      input?.duplicateSectionEntries,
      DEFAULT_RESUME_EDITOR_FEATURES.duplicateSectionEntries
    ),
  };
}

function sanitizeLimits(
  input?: Partial<ResumeEditorLimits>
): ResumeEditorLimits {
  return {
    maxSummaryLength: asPositiveNumber(
      input?.maxSummaryLength,
      DEFAULT_RESUME_EDITOR_LIMITS.maxSummaryLength
    ),
    maxSkillItems: asPositiveNumber(
      input?.maxSkillItems,
      DEFAULT_RESUME_EDITOR_LIMITS.maxSkillItems
    ),
    maxProjectItems: asPositiveNumber(
      input?.maxProjectItems,
      DEFAULT_RESUME_EDITOR_LIMITS.maxProjectItems
    ),
    maxExperienceItems: asPositiveNumber(
      input?.maxExperienceItems,
      DEFAULT_RESUME_EDITOR_LIMITS.maxExperienceItems
    ),
    maxEducationItems: asPositiveNumber(
      input?.maxEducationItems,
      DEFAULT_RESUME_EDITOR_LIMITS.maxEducationItems
    ),
    maxCertificationItems: asPositiveNumber(
      input?.maxCertificationItems,
      DEFAULT_RESUME_EDITOR_LIMITS.maxCertificationItems
    ),
    maxAchievementItems: asPositiveNumber(
      input?.maxAchievementItems,
      DEFAULT_RESUME_EDITOR_LIMITS.maxAchievementItems
    ),
    maxLanguageItems: asPositiveNumber(
      input?.maxLanguageItems,
      DEFAULT_RESUME_EDITOR_LIMITS.maxLanguageItems
    ),
    maxToolItems: asPositiveNumber(
      input?.maxToolItems,
      DEFAULT_RESUME_EDITOR_LIMITS.maxToolItems
    ),
    maxCustomSections: asPositiveNumber(
      input?.maxCustomSections,
      DEFAULT_RESUME_EDITOR_LIMITS.maxCustomSections
    ),
    maxLinks: asPositiveNumber(
      input?.maxLinks,
      DEFAULT_RESUME_EDITOR_LIMITS.maxLinks
    ),
  };
}

function sanitizeTemplates(
  input?: Partial<ResumeTemplateOption>[]
): ResumeTemplateOption[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [...DEFAULT_RESUME_EDITOR_TEMPLATES];
  }

  const templates = input
    .filter((item) => typeof item?.code === "string" && item.code.trim())
    .map((item, index) => ({
      code: asString(item.code, `template-${index + 1}`),
      name: asString(item.name, item.code || `Template ${index + 1}`),
      description: asString(item.description, ""),
      enabled: asBoolean(item.enabled, true),
      isDefault: asBoolean(item.isDefault, false),
    }))
    .filter((item) => item.enabled);

  if (templates.length === 0) {
    return [...DEFAULT_RESUME_EDITOR_TEMPLATES];
  }

  if (!templates.some((t) => t.isDefault)) {
    templates[0] = { ...templates[0], isDefault: true };
  }

  return templates;
}

function sanitizeDefaults(
  input: Partial<ResumeEditorDefaults> | undefined,
  templates: ResumeTemplateOption[],
  sectionOrder: string[]
): ResumeEditorDefaults {
  const enabledTemplateCodes = templates.map((t) => t.code);
  const defaultTemplateFromTemplates =
    templates.find((t) => t.isDefault)?.code || templates[0]?.code || "default";

  const requestedTemplate = asString(
    input?.defaultTemplateCode,
    defaultTemplateFromTemplates
  );

  return {
    defaultTemplateCode: enabledTemplateCodes.includes(requestedTemplate)
      ? requestedTemplate
      : defaultTemplateFromTemplates,
    defaultSectionOrder:
      Array.isArray(input?.defaultSectionOrder) &&
      input.defaultSectionOrder.length > 0
        ? uniqueStrings(input.defaultSectionOrder)
        : sectionOrder,
    defaultResumeTitle: asString(
      input?.defaultResumeTitle,
      DEFAULT_RESUME_EDITOR_DEFAULTS.defaultResumeTitle
    ),
    defaultVersionNamePrefix: asString(
      input?.defaultVersionNamePrefix,
      DEFAULT_RESUME_EDITOR_DEFAULTS.defaultVersionNamePrefix
    ),
    defaultCustomSectionTitle: asString(
      input?.defaultCustomSectionTitle,
      DEFAULT_RESUME_EDITOR_DEFAULTS.defaultCustomSectionTitle
    ),
  };
}

/* =========================================================
   MERGE BACKEND CONFIG
========================================================= */

export function mergeResumeEditorConfig(
  backendConfig?: BackendResumeEditorConfig | null
): ResumeEditorConfig {
  const sections = sanitizeSections(backendConfig?.sections);

  const sectionLabels = sections.reduce<Record<string, string>>((acc, section) => {
    acc[section.key] = section.label;
    return acc;
  }, {});

  const backendLabels = backendConfig?.sectionLabels || {};
  for (const [key, label] of Object.entries(backendLabels)) {
    if (typeof label === "string" && label.trim()) {
      sectionLabels[key] = label.trim();
    }
  }

  const validSectionKeys = sections.map((s) => s.key);
  const backendOrder = Array.isArray(backendConfig?.sectionOrder)
    ? uniqueStrings(backendConfig.sectionOrder)
    : [];

  const orderedKeys = [
    ...backendOrder.filter((key) => validSectionKeys.includes(key)),
    ...validSectionKeys.filter((key) => !backendOrder.includes(key)),
  ];

  const features = sanitizeFeatures(backendConfig?.features);
  const limits = sanitizeLimits(backendConfig?.limits);
  const templates = sanitizeTemplates(backendConfig?.templates);
  const defaults = sanitizeDefaults(backendConfig?.defaults, templates, orderedKeys);

  return {
    sections,
    sectionLabels,
    sectionOrder: orderedKeys,
    features,
    limits,
    templates,
    defaults,
  };
}

/* =========================================================
   FETCH BACKEND CONFIG
========================================================= */

export async function fetchResumeEditorConfig(): Promise<ResumeEditorConfig> {
  const apiBaseUrl = getApiBaseUrl();
  const token = getAccessToken();
  const role = resolveRole();

  try {
    const response = await fetch(`${apiBaseUrl}${RESUME_EDITOR_CONFIG_API_PATH}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return DEFAULT_RESUME_EDITOR_CONFIG;
    }

    const raw = (await response.json()) as
      | BackendResumeEditorConfig
      | ApiEnvelope<BackendResumeEditorConfig>;

    const data = unwrapResponse<BackendResumeEditorConfig>(raw);
    const merged = mergeResumeEditorConfig(data);

    if (role === "UNKNOWN") {
      return merged;
    }

    return merged;
  } catch {
    return DEFAULT_RESUME_EDITOR_CONFIG;
  }
}

/* =========================================================
   UI HELPERS
========================================================= */

export function getResumeEditorSections(
  config: ResumeEditorConfig = DEFAULT_RESUME_EDITOR_CONFIG
): ResumeEditorSectionConfig[] {
  const sectionMap = new Map(config.sections.map((s) => [s.key, s]));
  return config.sectionOrder
    .map((key) => sectionMap.get(key))
    .filter((item): item is ResumeEditorSectionConfig => Boolean(item));
}

export function getEnabledResumeEditorSections(
  config: ResumeEditorConfig = DEFAULT_RESUME_EDITOR_CONFIG
): ResumeEditorSectionConfig[] {
  return getResumeEditorSections(config).filter((section) => section.enabled);
}

export function getRequiredResumeEditorSections(
  config: ResumeEditorConfig = DEFAULT_RESUME_EDITOR_CONFIG
): ResumeEditorSectionConfig[] {
  return getEnabledResumeEditorSections(config).filter((section) => section.required);
}

export function findResumeEditorSection(
  key: string,
  config: ResumeEditorConfig = DEFAULT_RESUME_EDITOR_CONFIG
): ResumeEditorSectionConfig | undefined {
  return config.sections.find((section) => section.key === key);
}

export function getResumeEditorSectionLabel(
  key: string,
  config: ResumeEditorConfig = DEFAULT_RESUME_EDITOR_CONFIG
): string {
  return (
    config.sectionLabels[key] ||
    findResumeEditorSection(key, config)?.label ||
    key
  );
}

export function isResumeEditorSectionEnabled(
  key: string,
  config: ResumeEditorConfig = DEFAULT_RESUME_EDITOR_CONFIG
): boolean {
  return Boolean(findResumeEditorSection(key, config)?.enabled);
}

export function canAddMoreResumeSectionItems(
  key: string,
  currentCount: number,
  config: ResumeEditorConfig = DEFAULT_RESUME_EDITOR_CONFIG
): boolean {
  const section = findResumeEditorSection(key, config);
  if (!section || !section.enabled) return false;
  if (section.maxItems === null || section.maxItems === undefined) return true;
  return currentCount < section.maxItems;
}

export function getDefaultResumeTemplate(
  config: ResumeEditorConfig = DEFAULT_RESUME_EDITOR_CONFIG
): ResumeTemplateOption | undefined {
  return (
    config.templates.find(
      (template) => template.code === config.defaults.defaultTemplateCode
    ) ||
    config.templates.find((template) => template.isDefault) ||
    config.templates[0]
  );
}

export function getEnabledResumeTemplates(
  config: ResumeEditorConfig = DEFAULT_RESUME_EDITOR_CONFIG
): ResumeTemplateOption[] {
  return config.templates.filter((template) => template.enabled);
}

export function buildDefaultResumeEditorState(
  config: ResumeEditorConfig = DEFAULT_RESUME_EDITOR_CONFIG
) {
  const template = getDefaultResumeTemplate(config);

  return {
    title: config.defaults.defaultResumeTitle,
    templateCode: template?.code || config.defaults.defaultTemplateCode,
    sectionOrder: [...config.defaults.defaultSectionOrder],
    sections: getEnabledResumeEditorSections(config).reduce<Record<string, unknown>>(
      (acc, section) => {
        acc[section.key] = section.allowMultiple ? [] : "";
        return acc;
      },
      {}
    ),
  };
}

/* =========================================================
   BACKEND PAYLOAD HELPERS
========================================================= */

export type ResumeEditorSavePayload = {
  title: string;
  templateCode: string;
  sectionOrder: string[];
  sections: Record<string, unknown>;
};

export function buildResumeEditorSavePayload(input: {
  title?: string;
  templateCode?: string;
  sectionOrder?: string[];
  sections?: Record<string, unknown>;
}): ResumeEditorSavePayload {
  return {
    title:
      typeof input.title === "string" && input.title.trim()
        ? input.title.trim()
        : DEFAULT_RESUME_EDITOR_DEFAULTS.defaultResumeTitle,
    templateCode:
      typeof input.templateCode === "string" && input.templateCode.trim()
        ? input.templateCode.trim()
        : DEFAULT_RESUME_EDITOR_DEFAULTS.defaultTemplateCode,
    sectionOrder: Array.isArray(input.sectionOrder)
      ? uniqueStrings(input.sectionOrder)
      : [...DEFAULT_RESUME_EDITOR_DEFAULTS.defaultSectionOrder],
    sections:
      input.sections && typeof input.sections === "object"
        ? input.sections
        : {},
  };
}