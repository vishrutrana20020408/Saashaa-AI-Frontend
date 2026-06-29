"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, any>) => void;
      reset?: (widgetId: any) => void;
    };
  }
}

interface RegisterFormData {
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface RegisterResponseLike {
  success?: boolean;
  message?: string;
  error?: string;
  detail?: string;

  token?: string;
  accessToken?: string;
  jwtToken?: string;

  role?: string;
  userRole?: string;
  roles?: string[];

  id?: number | string;
  userId?: number | string;
  adminId?: number | string;
  companyId?: number | string;

  onboardingDone?: boolean;
  userOnboardingDone?: boolean;

  data?: RegisterResponseLike | null;
  payload?: RegisterResponseLike | null;
  result?: RegisterResponseLike | null;
}

function normalizeRole(value?: string | null): string {
  return (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
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
    "jwt",
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
    "jwt",
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
  if (role === "USER") setCookie("userToken", token);
  if (role === "ADMIN") setCookie("adminToken", token);
  if (role === "COMPANY") setCookie("companyToken", token);
  if (role === "OWNER") setCookie("ownerToken", token);

  localStorage.setItem("userRole", role);
  localStorage.setItem("role", role);
  setCookie("userRole", role);
  setCookie("role", role);

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

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  return null;
}

function getRedirectPath(role: string, onboardingDone: boolean): string {
  if (role === "ADMIN") return "/admin";
  if (role === "OWNER") return "/owner";
  if (role === "COMPANY") return "/company";
  return onboardingDone ? "/user" : "/user/setup";
}

export default function RegisterPage() {
  const router = useRouter();

  const backendBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      "http://localhost:8080"
    );
  }, []);

  const [formData, setFormData] = useState<RegisterFormData>({
    firstName: "",
    surname: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [captchaReady, setCaptchaReady] = useState<boolean>(false);
  const [captchaError, setCaptchaError] = useState<string>("");

  const turnstileSiteKey = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY?.trim() || ""
    );
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const name = e.target.name as keyof RegisterFormData;
    let value = e.target.value;

    if (name === "phone") {
      value = value.replace(/\D/g, "").slice(0, 10);
    }

    if (name === "email") {
      value = value.replace(/\s/g, "");
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  useEffect(() => {
    if (!turnstileSiteKey) return;

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
  }, [turnstileSiteKey]);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const firstName = formData.firstName.trim();
    const surname = formData.surname.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!firstName) {
      setError("First name is required.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (phone.length !== 10) {
      setError("Mobile number must be exactly 10 digits.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (turnstileSiteKey && !captchaToken) {
      setError("Please complete the CAPTCHA before registering.");
      return;
    }

    try {
      setLoading(true);
      clearStoredAuth();

      const endpoint = `${backendBaseUrl}/api/auth/user/register`;

      const payloadBody = {
        name: firstName,
        surname,
        emailAddress: email,
        mobileNumber: phone,
        password,
        captchaToken: captchaToken || undefined,
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payloadBody),
      });

      const raw = await response.text();
      const parsed = safeJsonParse<RegisterResponseLike>(raw);
      const payload = unwrapPayload(parsed);

      if (!response.ok) {
        const message =
          payload?.message ||
          payload?.detail ||
          payload?.error ||
          parsed?.message ||
          parsed?.detail ||
          parsed?.error ||
          raw ||
          "Registration failed.";
        throw new Error(message);
      }

      const token = String(
        payload?.accessToken ?? payload?.token ?? payload?.jwtToken ?? ""
      ).trim();

      const role = normalizeRole(
        payload?.userRole ?? payload?.role ?? payload?.roles?.[0] ?? "USER"
      );

      const authId = String(
        payload?.adminId ?? payload?.userId ?? payload?.companyId ?? payload?.id ?? ""
      ).trim();

      const onboardingDone = Boolean(
        payload?.userOnboardingDone ?? payload?.onboardingDone
      );

      if (token) {
        persistAuth({
          token,
          role: role || "USER",
          authId,
          email,
          name: `${firstName}${surname ? ` ${surname}` : ""}`.trim(),
          onboardingDone,
        });

        setSuccessMessage("Registration successful. Redirecting...");
        window.setTimeout(() => {
          router.replace(
            getRedirectPath(role || "USER", onboardingDone)
          );
          router.refresh();
        }, 1000);
        return;
      }

      setSuccessMessage("Registration successful. Redirecting to login...");

      window.setTimeout(() => {
        router.push("/auth/login");
      }, 1200);
    } catch (err: unknown) {
      clearStoredAuth();
      setError(
        err instanceof Error ? err.message : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground) flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md rounded-3xl bg-(--card) backdrop-blur shadow-2xl border border-(--border) p-8"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-sm">
            <UserPlus className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-bold text-white">
            Create New Account
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Register as a user for the AI interview platform.
          </p>
        </div>


        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="firstName"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              name="firstName"
              placeholder="Enter your first name"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
            />
          </div>

          <div>
            <label
              htmlFor="surname"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Surname
            </label>
            <input
              id="surname"
              type="text"
              name="surname"
              placeholder="Enter your surname"
              value={formData.surname}
              onChange={handleChange}
              className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Mobile Number
            </label>
            <input
              id="phone"
              type="text"
              name="phone"
              placeholder="10 digit mobile number"
              value={formData.phone}
              onChange={handleChange}
              inputMode="numeric"
              maxLength={10}
              required
              className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 pr-12 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted) hover:text-(--foreground)"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 pr-12 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-(--muted) hover:text-(--foreground)"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-600/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {successMessage}
            </div>
          ) : null}

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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Create Account
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-5 text-center text-sm">
          <span className="text-slate-300">Already have an account? </span>
          <Link
            href="/auth/login"
            className="font-semibold text-indigo-300 hover:text-indigo-100"
          >
            Login
          </Link>
        </div>

        <div className="mt-6 border-t border-(--border) pt-4 text-center text-xs text-(--muted)">
          © {new Date().getFullYear()} AI Interview Platform
        </div>
      </motion.div>
    </div>
  );
}
