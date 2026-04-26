// src/types/index.ts
//
// Central barrel exports for frontend ↔ backend integration types.
//
// Latest project alignment:
// - Spring Boot backend + Next.js frontend
// - Shared type surface for:
//   - auth
//   - generic api contracts
//   - ATS analysis
//   - GitHub analysis / AI-engine integration
// - Keeps imports clean and consistent across:
//   - app/
//   - components/
//   - hooks/
//   - lib/
//
// Usage examples:
//   import type { ApiEnvelope, ResumeVersion, UserProfile } from "@/types";
//   import { authTypeUtils, githubTypeUtils } from "@/types";

/* =========================================================
   GENERIC / CORE API TYPES
========================================================= */

export * from "./api";

/* =========================================================
   AUTH TYPES + HELPERS
========================================================= */

export * from "./auth";

/* =========================================================
   ATS TYPES + HELPERS
========================================================= */

export * from "./ats";

/* =========================================================
   GITHUB / AI ANALYSIS TYPES + HELPERS
========================================================= */

export * from "./github";

/* =========================================================
   OPTIONAL NAMESPACE RE-EXPORTS
   Useful when you want grouped imports in some modules
========================================================= */

export * as ApiTypes from "./api";
export * as AuthTypes from "./auth";
export * as AtsTypes from "./ats";
export * as GitHubTypes from "./github";