"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  X,
  LogOut,
  Building2,
  LayoutDashboard,
  Briefcase,
  Users,
  Bell,
  Loader2,
  UserPlus,
  Activity,
} from "lucide-react";
import ThemeToggle from "@/components/common/ThemeToggle";

type NavLink = {
  name: string;
  path: string;
  icon: React.ReactNode;
  exact?: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:8080";

function normalizeRole(value?: string | null) {
  return (value || "").trim().toUpperCase().replace(/^ROLE_/, "");
}

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

function clearStoredAuth() {
  if (typeof window === "undefined") return;
  const keys = [
    "token",
    "authToken",
    "accessToken",
    "jwtToken",
    "userRole",
    "role",
    "userEmail",
    "userName",
    "authId",
  ];
  keys.forEach((k) => localStorage.removeItem(k));
}

export default function CompanyNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsMenuRef = useRef<HTMLDivElement | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const notifications = useMemo(
    () => [
      {
        title: "New candidate request",
        subtitle: "A candidate just applied for the open role.",
        time: "5m ago",
      },
      {
        title: "Profile update",
        subtitle: "Company profile changes are pending approval.",
        time: "20m ago",
      },
      {
        title: "Weekly summary",
        subtitle: "Your weekly engagement report is ready.",
        time: "1h ago",
      },
    ],
    []
  );

  const navLinks: NavLink[] = useMemo(
    () => [
      {
        name: "Dashboard",
        path: "/company",
        icon: <LayoutDashboard className="h-4 w-4" />,
        exact: true,
      },
      {
        name: "Jobs",
        path: "/company/jobs",
        icon: <Briefcase className="h-4 w-4" />,
      },
      {
        name: "Candidates",
        path: "/company/candidates",
        icon: <Users className="h-4 w-4" />,
      },
      {
        name: "Interview Roles",
        path: "/company/interview-roles",
        icon: <Activity className="h-4 w-4" />,
      },
    ],
    []
  );

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    setUserName(localStorage.getItem("userName"));
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showNotifications &&
        notificationsMenuRef.current &&
        !notificationsMenuRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getStoredToken() || ""}`,
        },
      }).catch(() => null);

      clearStoredAuth();
      router.push("/auth/login");
      router.refresh();
    } catch {
      clearStoredAuth();
      router.push("/auth/login");
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  return (
    <nav
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/80 backdrop-blur-md shadow-md py-2"
          : "bg-white py-4"
      }`}
    >
      <div className="mx-auto max-w-10xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 items-center justify-between">
          {/* Logo */}
          <Link href="/company" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-indigo-200 shadow-lg transition-transform group-hover:scale-105">
              <Building2 className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ShaaShaa AI <span className="text-indigo-600"></span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            {navLinks.map((link) => {
              const isActive = link.exact
                ? pathname === link.path
                : pathname.startsWith(link.path);

              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {link.icon}
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="hidden lg:flex lg:items-center lg:gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-label="Toggle notifications menu"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.65rem] font-semibold text-white shadow-lg shadow-rose-500/30">
                  {notifications.length}
                </span>
              </button>

              {showNotifications && (
                <div
                  ref={notificationsMenuRef}
                  className="absolute right-0 top-full z-50 mt-3 w-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-900/10"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">Notifications</p>
                      <p className="text-xs text-slate-500">{notifications.length} new alerts</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto px-3 py-3">
                    {notifications.map((notification, index) => (
                      <div
                        key={index}
                        className="group rounded-3xl border border-slate-200 bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{notification.title}</p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">{notification.subtitle}</p>
                          </div>
                          <span className="text-xs text-slate-400">{notification.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => router.push("/company/notifications")}
                      className="w-full rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle />

            <Link
              href="/company/register"
              className="hidden rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 md:inline-flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Register
            </Link>

            <div className="h-8 w-px bg-slate-200 mx-1" />

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-900 leading-none">
                  {userName || "Company User"}
                </span>
                <span className="text-[10px] font-medium text-indigo-600 uppercase tracking-wider mt-1">
                  Company
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-70"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Logout
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 animate-in slide-in-from-top duration-300">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navLinks.map((link) => {
              const isActive = link.exact
                ? pathname === link.path
                : pathname.startsWith(link.path);

              return (
                <Link
                  key={link.path}
                  href={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium ${
                    isActive
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {link.icon}
                  {link.name}
                </Link>
              );
            })}
            <Link
              href="/company/register"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <UserPlus className="h-5 w-5" />
              Register
            </Link>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
