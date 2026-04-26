"use client";

import { ReactNode, useMemo } from "react";
import { usePathname } from "next/navigation";
import HomeNavbar from "../components/nav/PublicNavbar";
import Footer from "../components/common/Footer";
import ScrollToTop from "../components/common/ScrollToTop";
import { getTokenPathPrefix } from "../config/interviewConfig";
import "./globals.css";

/**
 * src/app/layout.tsx
 *
 * Root App Layout
 *
 * Latest project alignment:
 * - keeps public layout for public-facing routes
 * - hides public navbar/footer for protected admin/user modules
 * - preserves dedicated layout control inside /user and /admin segments
 * - keeps global styles mounted once for the full app
 *
 * Notes:
 * - /user routes use their own protected layout
 * - /admin routes use their own protected/admin layout
 * - public routes continue using PublicNavbar + Footer
 */

type RootLayoutProps = {
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

export default function RootLayout({ children }: RootLayoutProps) {
  const pathname = usePathname();

  const hidePublicLayout = useMemo(
    () => shouldHidePublicLayout(pathname),
    [pathname]
  );

  const hideFooter = useMemo(() => isAuthPage(pathname), [pathname]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('saashaa-theme');
                  var root = document.documentElement;
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                  } else {
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-(--background) text-(--foreground) antialiased transition-colors duration-300 overflow-x-hidden">
        <div className="app-shell">
          {!hidePublicLayout && <HomeNavbar />}
          {!hidePublicLayout && <ScrollToTop />}

          <main className={!hidePublicLayout ? "page-with-navbar" : ""}>
            {children}
          </main>

          {!hidePublicLayout && !hideFooter && <Footer />}
        </div>
      </body>
    </html>
  );
}