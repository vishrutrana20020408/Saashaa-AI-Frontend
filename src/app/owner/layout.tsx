"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OwnerNavbar from "@/components/nav/OwnerNavbar";
import { Loader2 } from "lucide-react";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated as owner
    const role = localStorage.getItem("userRole")?.toUpperCase();
    const token = localStorage.getItem("token");

    if (!token || role !== "OWNER") {
      // Redirect to login if not authenticated as owner
      router.push("/owner/login");
      return;
    }

    setIsAuthenticated(true);
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <OwnerNavbar />
      <section className="pt-20 min-h-screen">{children}</section>
    </>
  );
}
