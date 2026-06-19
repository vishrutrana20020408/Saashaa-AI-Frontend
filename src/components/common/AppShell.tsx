"use client";

import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import HomeNavbar from "../nav/PublicNavbar";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import { getTokenPathPrefix } from "../../config/interviewConfig";

type AppShellProps = {
  children: ReactNode;
};

function shouldHidePublicLayout(pathname: string): boolean {
  const tokenPrefix = getTokenPathPrefix();

  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/company") ||
    pathname.startsWith("/owner") ||
    (tokenPrefix !== "" && pathname.startsWith(tokenPrefix))
  );
}

function isAuthPage(pathname: string): boolean {
  return (
    pathname === "/auth/login" ||
    pathname === "/auth/register" ||
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/register")
  );
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const hidePublicLayout = useMemo(
    () => shouldHidePublicLayout(pathname),
    [pathname]
  );

  const hideFooter = useMemo(() => isAuthPage(pathname), [pathname]);

  return (
    <div className="app-shell">
      {!hidePublicLayout && <HomeNavbar />}
      {!hidePublicLayout && <ScrollToTop />}

      <main className={!hidePublicLayout ? "page-with-navbar" : ""}>
        {children}
      </main>

      {!hidePublicLayout && !hideFooter && <Footer />}
    </div>
  );
}
