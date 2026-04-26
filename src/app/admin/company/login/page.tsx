"use client";

import { useState } from "react";
import { 
  Building2, 
  Mail, 
  Lock, 
  Loader2,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function AdminCompanyLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    emailAddress: "",
    password: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/company/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        const payload = data.data || data.payload || data.result || data;
        const token =
          payload.accessToken || payload.authToken || payload.token || payload.jwt;
        const role = payload.role || payload.userRole || "COMPANY";
        const companyId = payload.companyId || payload.id || "";
        const companyName = payload.companyName || payload.name || "";
        const email = payload.email || payload.emailAddress || "";

        if (token) {
          localStorage.setItem("token", token);
          localStorage.setItem("accessToken", token);
          localStorage.setItem("authToken", token);
          localStorage.setItem("companyToken", token);
          document.cookie = `token=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
          document.cookie = `authToken=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
          document.cookie = `accessToken=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
          document.cookie = `companyToken=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
        }

        localStorage.setItem("userRole", role);
        localStorage.setItem("role", role);
        if (email) localStorage.setItem("userEmail", email);
        if (companyName) localStorage.setItem("userName", companyName);
        if (companyId) localStorage.setItem("authId", companyId);

        router.push("/company");
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100 mb-6">
            <Building2 className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Company Access</h1>
          <p className="text-slate-500 mt-2">Log in to a company account to manage jobs and candidates.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl flex items-center gap-3 bg-rose-50 text-rose-700 border border-rose-100">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Company Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                name="emailAddress"
                value={formData.emailAddress}
                onChange={handleChange}
                required
                placeholder="company@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            Access Company Portal
          </button>
        </form>
      </div>
    </div>
  );
}
