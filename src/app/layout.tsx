import { ReactNode } from "react";
import AppShell from "../components/common/AppShell";
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

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  root.classList.remove('dark');
                  root.style.colorScheme = 'light';
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-(--background) text-(--foreground) antialiased transition-colors duration-300 overflow-x-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
