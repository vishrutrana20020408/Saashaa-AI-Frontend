"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, Eye, EyeOff, Loader2, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, any>) => void;
      reset?: (widgetId: any) => void;
    };
  }
}

type RoleType = "user" | "admin";

type Primitive = string | number | boolean | null | undefined;

interface LoginResponseLike {
  success?: boolean;
  message?: string;

  token?: string;
  accessToken?: string;
  authToken?: string;
  jwtToken?: string;
  jwt?: string;

  role?: string;
  userRole?: string;
  roles?: string[];

  id?: number | string;
  userId?: number | string;
  adminId?: number | string;
  companyId?: number | string;

  email?: string;
  name?: string;
  fullName?: string;
  companyName?: string;
  ownerName?: string;

  onboardingDone?: boolean;
  userOnboardingDone?: boolean;

  data?: LoginResponseLike | null;
  payload?: LoginResponseLike | null;
  result?: LoginResponseLike | null;
}

interface AuthMePayloadLike {
  success?: boolean;
  authenticated?: boolean;
  valid?: boolean;
  message?: string;

  id?: number | string;
  userId?: number | string;
  adminId?: number | string;
  companyId?: number | string;

  email?: string;
  name?: string;
  fullName?: string;

  role?: string;
  userRole?: string;
  roles?: string[];

  onboardingDone?: boolean;
  userOnboardingDone?: boolean;

  data?: AuthMePayloadLike | null;
  payload?: AuthMePayloadLike | null;
  result?: AuthMePayloadLike | null;
}

interface VerifiedAuthState {
  isValid: boolean;
  role: string;
  onboardingDone: boolean;
  authId: string;
  email: string;
  name: string;
}

function normalizeRole(value?: Primitive): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
}

function unwrapPayload<T extends object>(json: T | null | undefined): T | null {
  if (!json || typeof json !== "object") return null;

  const candidate = json as T & {
    data?: T | null;
    payload?: T | null;
    result?: T | null;
  };

  return candidate.data ?? candidate.payload ?? candidate.result ?? json;
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; path=/; SameSite=Lax`;
}

function removeCookie(name: string) {
  if (typeof document === "undefined") return;

  document.cookie = `${encodeURIComponent(
    name
  )}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  const localStorageKeys = [
    "token",
    "authToken",
    "accessToken",
    "jwtToken",
    "userToken",
    "adminToken",
    "companyToken",
    "ownerToken",
    "userRole",
    "role",
    "userEmail",
    "userName",
    "authId",
    "userOnboardingDone",
    "onboardingDone",
  ];

  const cookieKeys = [
    "token",
    "authToken",
    "accessToken",
    "jwtToken",
    "userToken",
    "adminToken",
    "companyToken",
    "ownerToken",
    "userRole",
    "role",
    "userOnboardingDone",
    "onboardingDone",
    "authId",
  ];

  localStorageKeys.forEach((key) => localStorage.removeItem(key));
  cookieKeys.forEach((key) => removeCookie(key));
}

function persistAuth(params: {
  token: string;
  role: string;
  authId?: string;
  email?: string;
  name?: string;
  onboardingDone: boolean;
}) {
  if (typeof window === "undefined") return;

  const { token, role, authId, email, name, onboardingDone } = params;

  localStorage.setItem("accessToken", token);
  localStorage.setItem("authToken", token);
  localStorage.setItem("token", token);
  if (role === "USER") localStorage.setItem("userToken", token);
  if (role === "ADMIN") localStorage.setItem("adminToken", token);
  if (role === "COMPANY") localStorage.setItem("companyToken", token);
  if (role === "OWNER") localStorage.setItem("ownerToken", token);

  setCookie("accessToken", token);
  setCookie("authToken", token);
  setCookie("token", token);
  if (role === "ADMIN") setCookie("adminToken", token);
  if (role === "COMPANY") setCookie("companyToken", token);
  if (role === "OWNER") setCookie("ownerToken", token);

  if (role) {
    localStorage.setItem("userRole", role);
    localStorage.setItem("role", role);
    setCookie("userRole", role);
    setCookie("role", role);
  }

  if (authId) {
    localStorage.setItem("authId", authId);
    setCookie("authId", authId);
  }

  if (email) {
    localStorage.setItem("userEmail", email);
  }

  if (name) {
    localStorage.setItem("userName", name);
  }

  localStorage.setItem("userOnboardingDone", String(onboardingDone));
  localStorage.setItem("onboardingDone", String(onboardingDone));
  setCookie("userOnboardingDone", String(onboardingDone));
  setCookie("onboardingDone", String(onboardingDone));
}

async function verifyAuthWithBackend(
  backendBaseUrl: string,
  token: string
): Promise<VerifiedAuthState> {
  try {
    const response = await fetch(`${backendBaseUrl}/api/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        isValid: false,
        role: "",
        onboardingDone: false,
        authId: "",
        email: "",
        name: "",
      };
    }

    const raw = await response.text();
    const parsed = safeJsonParse<AuthMePayloadLike>(raw);
    const payload = unwrapPayload(parsed);

    const valid = Boolean(
      payload?.authenticated ?? payload?.valid ?? response.ok
    );

    const role = normalizeRole(
      payload?.userRole ?? payload?.role ?? payload?.roles?.[0]
    );

    const onboardingDone = Boolean(
      payload?.userOnboardingDone ?? payload?.onboardingDone
    );

    const authId = String(
      payload?.adminId ?? payload?.userId ?? payload?.companyId ?? payload?.id ?? ""
    ).trim();

    const email = String(payload?.email ?? "").trim();
    const name = String(payload?.fullName ?? payload?.name ?? "").trim();

    return {
      isValid: valid,
      role,
      onboardingDone,
      authId,
      email,
      name,
    };
  } catch {
    return {
      isValid: false,
      role: "",
      onboardingDone: false,
      authId: "",
      email: "",
      name: "",
    };
  }
}

function getLoginEndpoint(role: RoleType, backendBaseUrl: string): string {
  if (role === "admin") return `${backendBaseUrl}/api/auth/admin/login`;
  return `${backendBaseUrl}/api/auth/user/login`;
}

function getRegisterPath(role: RoleType): string {
  return "/auth/register";
}

function getRedirectPath(role: string, onboardingDone: boolean): string {
  if (role === "ADMIN") return "/admin";
  return onboardingDone ? "/user" : "/user/setup";
}

export default function LoginPage() {
  const router = useRouter();

  const backendBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      "http://localhost:8080"
    );
  }, []);

  const [mounted, setMounted] = useState(false);
  const [checkingExistingSession, setCheckingExistingSession] = useState(true);

  const [role, setRole] = useState<RoleType>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const [captchaError, setCaptchaError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const turnstileSiteKey = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY?.trim() || ""
    );
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (turnstileSiteKey) {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
      );

      const renderWidget = () => {
        if (!window.turnstile) {
          return;
        }

        window.turnstile.render("cf-turnstile", {
          sitekey: turnstileSiteKey,
          callback: (token: string) => {
            setCaptchaToken(String(token || ""));
            setCaptchaError("");
          },
          "error-callback": () => {
            setCaptchaError("CAPTCHA failed to load. Please refresh the page.");
          },
          "expired-callback": () => {
            setCaptchaToken("");
          },
        });

        setCaptchaReady(true);
      };

      if (existingScript) {
        if (window.turnstile) {
          renderWidget();
        } else {
          existingScript.addEventListener("load", renderWidget, { once: true });
        }
      } else {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.body.appendChild(script);
      }
    }

    let cancelled = false;

    const checkExistingSession = async () => {
      try {
        const existingToken =
          localStorage.getItem("accessToken") ||
          localStorage.getItem("authToken") ||
          localStorage.getItem("token") ||
          "";

        if (!existingToken) {
          if (!cancelled) setCheckingExistingSession(false);
          return;
        }

        const verified = await verifyAuthWithBackend(
          backendBaseUrl,
          existingToken
        );

        if (!verified.isValid || !verified.role) {
          clearStoredAuth();
          if (!cancelled) setCheckingExistingSession(false);
          return;
        }

        persistAuth({
          token: existingToken,
          role: verified.role,
          authId: verified.authId,
          email: verified.email,
          name: verified.name,
          onboardingDone: verified.onboardingDone,
        });

        if (!cancelled) {
          router.replace(
            getRedirectPath(verified.role, verified.onboardingDone)
          );
          router.refresh();
        }
      } catch {
        clearStoredAuth();
        if (!cancelled) setCheckingExistingSession(false);
      } finally {
        if (!cancelled) setCheckingExistingSession(false);
      }
    };

    void checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [backendBaseUrl, mounted, router]);

  function triggerShakeWithMessage(message: string) {
    setError(message);
    setShake(true);
    window.setTimeout(() => setShake(false), 500);
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      triggerShakeWithMessage("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      clearStoredAuth();

        const loginEndpoint = getLoginEndpoint(role, backendBaseUrl);

      if (turnstileSiteKey && !captchaToken) {
        throw new Error("Please complete the CAPTCHA before signing in.");
      }

      const response = await fetch(loginEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          emailAddress: email,
          password,
          captchaToken: captchaToken || undefined,
        }),
      });

      const raw = await response.text();
      const parsed = safeJsonParse<LoginResponseLike>(raw);

      if (!response.ok) {
        const message =
          parsed?.message ||
          raw ||
          "Invalid credentials or backend rejected the login request.";
        throw new Error(message);
      }

      const payload = unwrapPayload(parsed);

      const token = String(
        payload?.accessToken ?? payload?.authToken ?? payload?.token ?? payload?.jwtToken ?? payload?.jwt ?? ""
      ).trim();

      if (!token) {
        throw new Error(
          "Login succeeded but no token was returned by the backend."
        );
      }

      const loginRole = normalizeRole(
        payload?.userRole ?? payload?.role ?? payload?.roles?.[0] ?? role
      );

      const loginAuthId = String(
        payload?.adminId ?? payload?.companyId ?? payload?.userId ?? payload?.id ?? ""
      ).trim();

      const loginEmail = String(payload?.email ?? email).trim();
      const loginName = String(
        payload?.fullName ?? payload?.name ?? payload?.companyName ?? payload?.ownerName ?? ""
      ).trim();

      const onboardingFromLogin = Boolean(
        payload?.userOnboardingDone ?? payload?.onboardingDone
      );

      const verified = await verifyAuthWithBackend(backendBaseUrl, token);

      const finalRole = verified.role || loginRole;
      const finalOnboardingDone = verified.isValid
        ? verified.onboardingDone
        : onboardingFromLogin;
      const finalAuthId = verified.authId || loginAuthId;
      const finalEmail = verified.email || loginEmail;
      const finalName = verified.name || loginName;

      if (!finalRole) {
        throw new Error("Login succeeded, but the backend did not return a role.");
      }

      persistAuth({
        token,
        role: finalRole,
        authId: finalAuthId,
        email: finalEmail,
        name: finalName,
        onboardingDone: finalOnboardingDone,
      });

      router.replace(getRedirectPath(finalRole, finalOnboardingDone));
      router.refresh();
    } catch (err) {
      clearStoredAuth();
      triggerShakeWithMessage(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingExistingSession) {
    return (
      <div className="min-h-screen bg-linear-to-br from-indigo-600 via-blue-500 to-cyan-500 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-(--card)/95 shadow-2xl p-8 text-center border border-(--border)">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100/20">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
          </div>
          <h1 className="text-xl font-bold text-(--foreground)">
            Checking your session
          </h1>
          <p className="mt-2 text-sm text-(--muted)">
            Please wait while we verify your backend authentication state.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-600 via-blue-500 to-cyan-500 flex items-center justify-center p-4">
      <motion.div
        animate={shake ? { x: [-10, 10, -8, 8, 0] } : {}}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md rounded-3xl bg-(--card)/95 backdrop-blur shadow-2xl border border-(--border) p-8"
      >
        <div className="mb-6 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm ${
            role === "admin"
              ? "bg-cyan-500/20"
              : "bg-indigo-500/20"
          }`}>
            {role === "admin" ? (
              <Shield className="h-8 w-8 text-cyan-500" />
            ) : (
              <User className="h-8 w-8 text-indigo-500" />
            )}
          </div>

          <h1 className="text-3xl font-bold text-(--foreground)">Welcome Back</h1>
          <p className="mt-2 text-sm text-(--muted)">
            Sign in to continue your interview, resume, and AI-assisted workflow.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2">
          {(["user", "admin"] as RoleType[]).map(
            (roleOption) => (
              <button
                key={roleOption}
                type="button"
                onClick={() => setRole(roleOption)}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-xs font-semibold transition ${
                  role === roleOption
                    ? roleOption === "admin"
                      ? "bg-cyan-600 text-white shadow-md shadow-cyan-200/50"
                      : "bg-indigo-600 text-white shadow-md shadow-indigo-200/50"
                    : "bg-(--muted-bg) text-(--muted-foreground) hover:bg-(--accent)"
                }`}
              >
                {roleOption === "admin" ? "Admin" : "User"}
              </button>
            )
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-(--foreground)"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  email: e.target.value.replace(/\s/g, ""),
                }))
              }
              className="w-full rounded-xl border border-(--border) bg-(--background) px-4 py-3 text-(--foreground) outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-(--foreground)"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-(--border) bg-(--background) px-4 py-3 text-(--foreground) outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted)"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-rose-500/10 p-3 text-center text-xs font-medium text-rose-500 border border-rose-500/20"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-3">
            <div id="cf-turnstile" className="mx-auto" />
            {captchaError ? (
              <div className="rounded-xl bg-rose-500/10 px-3 py-2 text-center text-xs font-medium text-rose-600">
                {captchaError}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white shadow-lg transition disabled:opacity-50 ${
                role === "admin"
                  ? "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-200/50"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/50"
              }`}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 border-t border-(--border) pt-6 text-center">
          <p className="text-sm text-(--muted)">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="font-bold text-indigo-500 hover:underline"
            >
              Register now
            </Link>
          </p>
          <div className="mt-4">
            <Link
              href="/auth/forgot"
              className="text-xs font-medium text-(--muted) hover:text-(--foreground)"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
