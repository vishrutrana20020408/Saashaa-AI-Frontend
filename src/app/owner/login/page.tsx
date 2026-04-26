"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  LogIn,
} from "lucide-react";
import { useRouter } from "next/navigation";

type RegistrationRole = "COMPANY" | "OWNER";

interface RegisterFormData {
  companyName: string;
  contactPersonName: string;
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  companyType: string;
}

const COMPANY_TYPES = [
  "Startup",
  "SME",
  "Enterprise",
  "Government",
  "Educational",
  "Non-profit",
  "Consulting",
];

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
  ownerId?: number | string;

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
  if (role === "COMPANY") localStorage.setItem("companyToken", token);
  if (role === "OWNER") localStorage.setItem("ownerToken", token);

  setCookie("accessToken", token);
  setCookie("authToken", token);
  setCookie("token", token);

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
  if (role === "OWNER") return "/owner";
  if (role === "COMPANY") return "/company";
  return onboardingDone ? "/user" : "/user/setup";
}

function getRegisterEndpoint(role: RegistrationRole, baseUrl: string): string {
  if (role === "OWNER") return `${baseUrl}/api/auth/owner/register`;
  return `${baseUrl}/api/auth/company/register`;
}

export default function OwnerLoginPage() {
  const router = useRouter();

  const backendBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      "http://localhost:8080"
    );
  }, []);

  const [formData, setFormData] = useState<RegisterFormData>({
    companyName: "",
    contactPersonName: "",
    firstName: "",
    surname: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    companyType: "Startup",
  });

  const [selectedRole, setSelectedRole] = useState<RegistrationRole>("COMPANY");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void {
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

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const companyName = formData.companyName.trim();
    const contactPersonName = formData.contactPersonName.trim();
    const firstName = formData.firstName.trim();
    const surname = formData.surname.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (selectedRole === "COMPANY") {
      if (!companyName) {
        setError("Company name is required.");
        return;
      }

      if (!contactPersonName) {
        setError("Contact person name is required.");
        return;
      }

      if (!formData.companyType) {
        setError("Company type is required.");
        return;
      }
    } else {
      if (!firstName) {
        setError("First name is required.");
        return;
      }

      if (!surname) {
        setError("Surname is required.");
        return;
      }
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

    try {
      setLoading(true);
      clearStoredAuth();

      const endpoint = getRegisterEndpoint(selectedRole, backendBaseUrl);

      const payloadBody: Record<string, any> =
        selectedRole === "COMPANY"
          ? {
              companyName,
              contactPersonName,
              emailAddress: email,
              mobileNumber: phone,
              password,
            }
          : {
              name: firstName,
              surname,
              emailAddress: email,
              mobileNumber: phone,
              password,
            };

      if (selectedRole === "COMPANY") {
        payloadBody.companyType = formData.companyType;
      }

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
        payload?.userRole ?? payload?.role ?? payload?.roles?.[0] ?? selectedRole
      );

      const authId = String(
        payload?.companyId ?? payload?.ownerId ?? payload?.userId ?? payload?.id ?? ""
      ).trim();

      const onboardingDone = Boolean(
        payload?.userOnboardingDone ?? payload?.onboardingDone
      );

      if (token) {
        persistAuth({
          token,
          role: role || selectedRole,
          authId,
          email,
          name:
            selectedRole === "COMPANY"
              ? contactPersonName
              : `${firstName}${surname ? ` ${surname}` : ""}`.trim(),
          onboardingDone,
        });

        setSuccessMessage("Registration successful. Redirecting...");
        window.setTimeout(() => {
          router.replace(getRedirectPath(role || selectedRole, onboardingDone));
          router.refresh();
        }, 1000);
        return;
      }

      setSuccessMessage("Registration completed. Redirecting to login...");

      window.setTimeout(() => {
        router.push("/auth/login");
      }, 1200);
    } catch (err: unknown) {
      clearStoredAuth();
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground) flex items-center justify-center p-4 pt-20">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md rounded-3xl bg-(--card) backdrop-blur shadow-2xl border border-(--border) p-8"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200 shadow-sm">
            <LogIn className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-bold text-(--foreground)">
            Owner Access Portal
          </h1>
          <p className="mt-2 text-sm leading-6 text-(--muted)">
            Register a Company or Owner account from one secure portal.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {(["COMPANY", "OWNER"] as RegistrationRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedRole === role
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-(--border) bg-(--popover) text-(--foreground) hover:bg-(--popover)"
                }`}
              >
                {role === "COMPANY" ? "Company" : "Owner"}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 text-left text-sm text-(--muted) sm:grid-cols-2">
            <div className="rounded-2xl bg-(--popover) p-4 shadow-sm border border-(--border)">
              <p className="font-semibold text-(--foreground)">
                {selectedRole === "COMPANY" ? "Company Registration" : "Owner Registration"}
              </p>
              <p>
                {selectedRole === "COMPANY"
                  ? "Register your company to hire and manage candidates."
                  : "Register as an owner to manage the platform."}
              </p>
            </div>
            <div className="rounded-2xl bg-(--popover) p-4 shadow-sm border border-(--border)">
              <p className="font-semibold text-(--foreground)">Quick Onboarding</p>
              <p>
                Complete registration in minutes with all necessary details.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400"
          >
            {successMessage}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedRole === "COMPANY" ? (
            <>
              <div>
                <label
                  htmlFor="companyName"
                  className="mb-2 block text-sm font-medium text-(--muted)"
                >
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  name="companyName"
                  placeholder="Acme Corp"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
                />
              </div>

              <div>
                <label
                  htmlFor="companyType"
                  className="mb-2 block text-sm font-medium text-(--muted)"
                >
                  Company Type
                </label>
                <select
                  id="companyType"
                  name="companyType"
                  value={formData.companyType}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
                >
                  {COMPANY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="contactPersonName"
                  className="mb-2 block text-sm font-medium text-(--muted)"
                >
                  Contact Person
                </label>
                <input
                  id="contactPersonName"
                  type="text"
                  name="contactPersonName"
                  placeholder="Jane Doe"
                  value={formData.contactPersonName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
                />
              </div>
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium text-(--muted)"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  name="firstName"
                  placeholder="Jane"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
                />
              </div>

              <div>
                <label
                  htmlFor="surname"
                  className="mb-2 block text-sm font-medium text-(--muted)"
                >
                  Surname
                </label>
                <input
                  id="surname"
                  type="text"
                  name="surname"
                  placeholder="Doe"
                  value={formData.surname}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-(--muted)"
            >
              {selectedRole === "COMPANY" ? "Business Email" : "Email Address"}
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder={
                selectedRole === "COMPANY"
                  ? "jane@company.com"
                  : "jane.doe@example.com"
              }
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-(--muted)"
            >
              {selectedRole === "COMPANY" ? "Company Phone" : "Mobile Number"}
            </label>
            <input
              id="phone"
              type="text"
              name="phone"
              placeholder="1234567890"
              value={formData.phone}
              onChange={handleChange}
              inputMode="numeric"
              maxLength={10}
              required
              className="w-full rounded-xl border border-(--border) bg-(--popover) px-4 py-3 text-(--foreground) outline-none transition focus:border-(--primary) focus:ring-(--primary/20)"
            />
            {selectedRole === "COMPANY" ? (
              <p className="mt-2 text-xs text-(--muted)">
                Provide a direct company contact number for account verification.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-(--muted)"
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
                className="mb-2 block text-sm font-medium text-(--muted)"
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating {selectedRole.toLowerCase()} account...
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                Create {selectedRole === "COMPANY" ? "company" : "owner"} account
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-sm">
          <span className="text-(--muted)">
            Already have an account?{" "}
          </span>
          <Link
            href="/auth/login"
            className="font-medium text-amber-400 hover:text-amber-300"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-6 border-t border-(--border) pt-4 text-center text-xs text-(--muted)">
          © {new Date().getFullYear()} AI Interview Platform
        </div>
      </motion.div>
    </div>
  );
}
