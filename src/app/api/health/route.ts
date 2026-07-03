import { NextResponse } from "next/server";

type EndpointCheck = {
  name: string;
  url: string;
  ok: boolean;
  status: number | null;
  error?: string;
};

function getConfiguredUrl(value: string | undefined, fallback: string): string {
  return (value?.trim() || fallback).replace(/\/+$/, "");
}

const BACKEND_BASE_URL = getConfiguredUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL,
  process.env.NODE_ENV === "production"
    ? "https://saashaa-ai-backend.onrender.com"
    : "http://localhost:8080"
);

const AI_ENGINE_BASE_URL = getConfiguredUrl(
  process.env.NEXT_PUBLIC_AI_ENGINE_URL || process.env.NEXT_PUBLIC_AI_ENGINE_BASE_URL,
  process.env.NODE_ENV === "production"
    ? "https://saashaa-ai-engine.onrender.com"
    : "http://localhost:8000"
);

async function checkEndpoint(name: string, url: string): Promise<EndpointCheck> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const ok = response.ok || response.status < 500;

    return {
      name,
      url,
      ok,
      status: response.status,
    };
  } catch (error) {
    return {
      name,
      url,
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const candidates = [
    `${BACKEND_BASE_URL}/`,
    `${BACKEND_BASE_URL}/api/auth/me`,
    `${BACKEND_BASE_URL}/api/health`,
  ];

  const aiCandidates = [
    `${AI_ENGINE_BASE_URL}/`,
    `${AI_ENGINE_BASE_URL}/docs`,
    `${AI_ENGINE_BASE_URL}/health`,
  ];

  const backendChecks = await Promise.all(
    candidates.map((candidate) => checkEndpoint("backend", candidate))
  );
  const aiEngineChecks = await Promise.all(
    aiCandidates.map((candidate) => checkEndpoint("ai-engine", candidate))
  );

  const backendReachable = backendChecks.some((check) => check.ok);
  const aiEngineReachable = aiEngineChecks.some((check) => check.ok);

  return NextResponse.json(
    {
      ok: backendReachable && aiEngineReachable,
      backend: {
        configuredUrl: BACKEND_BASE_URL,
        checks: backendChecks,
        reachable: backendReachable,
      },
      aiEngine: {
        configuredUrl: AI_ENGINE_BASE_URL,
        checks: aiEngineChecks,
        reachable: aiEngineReachable,
      },
    },
    { status: backendReachable && aiEngineReachable ? 200 : 503 }
  );
}
