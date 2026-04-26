"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

type RoleType = "OWNER" | "COMPANY" | "ADMIN";

function getLoginEndpoint(role: RoleType, baseUrl: string) {
  if (role === "OWNER") return `${baseUrl}/api/auth/owner/login`;
  if (role === "ADMIN") return `${baseUrl}/api/auth/admin/login`;
  return `${baseUrl}/api/auth/company/login`;
}

function getRedirectPath(role: RoleType) {
  if (role === "OWNER") return "/owner";
  if (role === "ADMIN") return "/admin";
  return "/company";
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; path=/; SameSite=Lax`;
}

function clearAuthStorage() {
  if (typeof window === "undefined") return;

  const keys = [
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

  keys.forEach((key) => localStorage.removeItem(key));
}

function persistAdminAuth(params: {
  token: string;
  authId?: string;
  email?: string;
  name?: string;
}) {
  if (typeof window === "undefined") return;

  const { token, authId, email, name } = params;

  localStorage.setItem("accessToken", token);
  localStorage.setItem("authToken", token);
  localStorage.setItem("token", token);
  localStorage.setItem("adminToken", token);
  setCookie("accessToken", token);
  setCookie("authToken", token);
  setCookie("token", token);

  localStorage.setItem("userRole", "ADMIN");
  localStorage.setItem("role", "ADMIN");
  setCookie("userRole", "ADMIN");
  setCookie("role", "ADMIN");

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
}

function persistRoleAuth(params: {
  token: string;
  role: RoleType;
  authId?: string;
  email?: string;
  name?: string;
}) {
  if (typeof window === "undefined") return;

  const { token, role, authId, email, name } = params;

  localStorage.setItem("accessToken", token);
  localStorage.setItem("authToken", token);
  localStorage.setItem("token", token);
  if (role === "COMPANY") localStorage.setItem("companyToken", token);
  if (role === "OWNER") localStorage.setItem("ownerToken", token);
  if (role === "ADMIN") localStorage.setItem("adminToken", token);
  setCookie("accessToken", token);
  setCookie("authToken", token);
  setCookie("token", token);
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
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
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

export default function AdminLoginPage() {
  const router = useRouter();

  const backendBaseUrl = useMemo(() => {
    return (
      process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") ||
      API_BASE_URL
    );
  }, []);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [selectedRole, setSelectedRole] = useState<RoleType>("COMPANY");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const email = formData.email.trim();
    const password = formData.password;
    const role = selectedRole;

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    clearAuthStorage();

    try {
      const response = await fetch(getLoginEndpoint(role, backendBaseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          emailAddress: email,
          password,
        }),
      });

      const raw = await response.text();
      const parsed = safeJsonParse<any>(raw);

      if (!response.ok) {
        const payload = unwrapPayload(parsed);
        const message =
          payload?.message || payload?.error || raw || "Invalid credentials.";
        throw new Error(message);
      }

      const payload = unwrapPayload(parsed);
      const token = String(
        payload?.accessToken ?? payload?.authToken ?? payload?.token ?? payload?.jwtToken ?? payload?.jwt ?? ""
      ).trim();

      if (!token) {
        throw new Error("Login succeeded but no token was returned by the backend.");
      }

      const authId = String(
        payload?.adminId ?? payload?.companyId ?? payload?.ownerId ?? payload?.id ?? ""
      ).trim();
      const emailAddress = String(payload?.email ?? payload?.emailAddress ?? email).trim();
      const name = String(
        payload?.fullName ?? payload?.name ?? payload?.companyName ?? payload?.ownerName ??
          (role === "OWNER" ? "Owner" : "Company")
      ).trim();

      persistRoleAuth({
        token,
        role,
        authId,
        email: emailAddress,
        name,
      });

      router.replace(getRedirectPath(role));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-black px-4 py-16 text-white">
      <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-cyan-900/20">
        <div className="space-y-4 bg-slate-900/90 px-8 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-500 text-slate-950">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold">
              {selectedRole === "OWNER" ? "Owner Login" : "Company Login"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in with your {selectedRole === "OWNER" ? "owner" : "company"} account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-8 py-8">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Login as</label>
            <div className="grid grid-cols-2 gap-2">
              {(["COMPANY", "OWNER"] as RoleType[]).map((roleOption) => (
                <button
                  key={roleOption}
                  type="button"
                  onClick={() => setSelectedRole(roleOption)}
                  className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                    selectedRole === roleOption
                      ? "border-cyan-400 bg-cyan-500 text-slate-950"
                      : "border-slate-700 bg-slate-950/90 text-slate-200 hover:border-slate-500"
                  }`}
                >
                  {roleOption === "OWNER" ? "Owner" : "Company"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="company@example.com"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={formData.password}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, password: event.target.value }))
                }
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 pr-12 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
            {loading
              ? "Signing in..."
              : `Sign in as ${selectedRole === "OWNER" ? "Owner" : "Company"}`}
          </button>

          <div className="flex items-center justify-start text-sm text-slate-400">
            <Link href="/auth/forgot" className="hover:text-white">
              Forgot password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

