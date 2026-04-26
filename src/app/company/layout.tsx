"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CompanyNavbar from "../../components/nav/CompanyNavbar";
import CompanyFooter from "../../components/nav/CompanyFooter";
import ScrollToTop from "../../components/common/ScrollToTop";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const API_ROUTES = {
  me: `${API_BASE_URL}/api/auth/me`,
};

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwtToken") ||
    null
  );
}

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    async function verifySession() {
      const token = getStoredToken();

      if (!token) {
        console.warn("No token found in localStorage");
        router.push("/auth/login");
        return;
      }

      try {
        const response = await fetch(API_ROUTES.me, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Unauthorized: ${response.status}`);
        }

        const json = await response.json();
        const data = json.data || json.payload || json.result || json;
        const role = (data?.role || data?.userRole || "").toUpperCase();

        if (role !== "COMPANY") {
          console.error("User does not have COMPANY role:", role);
          throw new Error("Forbidden");
        }

        setIsAuthorized(true);
      } catch (err) {
        console.error("Session verification failed:", err);
        router.push("/auth/login");
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <CompanyNavbar />
      <main className="grow pt-20 pb-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <CompanyFooter />
      <ScrollToTop />
    </div>
  );
}
