"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"

type Role = "admin" | "user" | null

export default function PublicFooter() {
  const pathname = usePathname()
  const year = new Date().getFullYear()

  const [role, setRole] = useState<Role>(() => {
    return (typeof window !== "undefined" ? (localStorage.getItem("role") as Role) : null) ?? null
  })

  /* ===================== LINKS ===================== */

  const PUBLIC_LINKS = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about" },
    { name: "Career", path: "/career" },
    { name: "Internships", path: "/internships" },
    { name: "Contact Us", path: "/contact" },
    { name: "Updates", path: "/updates" },
    { name: "FAQ", path: "/faq" },
  ]

  const USER_LINKS = [
    { name: "Dashboard", path: "/user/dashboard" },
    { name: "Interview", path: "/user/interview" },
    { name: "Jobs", path: "/jobs" },
    { name: "Resume", path: "/resume" },
  ]

  const ADMIN_LINKS = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Users", path: "/admin/users" },
    { name: "Resumes", path: "/admin/resume" },
    { name: "Company", path: "/admin/company" },
  ]

  const activeLinks =
    role === "admin"
      ? ADMIN_LINKS
      : role === "user"
      ? USER_LINKS
      : PUBLIC_LINKS

  /* ================= ACTIVE ROUTE DETECTION ================= */

  const activeIndex = useMemo(() => {
    return activeLinks.findIndex(
      (link) =>
        pathname === link.path ||
        pathname.startsWith(link.path + "/")
    )
  }, [pathname, activeLinks])

  /* ================= SOCIAL LINKS ================= */

  const SOCIAL_LINKS = [
    { href: "https://facebook.com", icon: <Facebook size={18} /> },
    { href: "https://x.com/SaashaaAI", icon: <Twitter size={18} /> },
    {
      href: "https://www.linkedin.com/in/saashaa-ai-6bbb863a8/",
      icon: <Linkedin size={18} />,
    },
    { href: "https://instagram.com", icon: <Instagram size={18} /> },
  ]

  return (
    <motion.footer
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="relative bg-black text-gray-300 mt-24 overflow-hidden"
    >
      {/* ================= FLOATING GRADIENT BACKGROUND ================= */}
      <motion.div
        animate={{ x: [0, 40, -40, 0], y: [0, -30, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute -top-40 -left-40 w-125 h-125
          bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600
          opacity-20 blur-3xl rounded-full"
      />

      <motion.div
        animate={{ x: [0, -30, 30, 0], y: [0, 40, -40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-40 -right-40 w-125 h-125
          bg-linear-to-r from-pink-600 via-purple-600 to-indigo-600
          opacity-20 blur-3xl rounded-full"
      />

      {/* ================= SHIMMER BORDER ================= */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 h-px w-1/2
            bg-linear-to-r from-transparent via-indigo-500 to-transparent"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12 grid gap-10 sm:grid-cols-2 md:grid-cols-3 select-none">

        {/* ================= COMPANY ================= */}
        <div>
          <Link
            href="/"
            className="text-2xl font-extrabold text-white"
          >
            SaaShaa AI
          </Link>

          <p className="text-sm leading-relaxed mt-4">
            <a
              href="https://maps.app.goo.gl/y4CzBuWJXEebu2BR7"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition"
            >
              F Block, Reserve Police Lines,
              <br />
              Shastri Nagar, Ghaziabad,
              <br />
              Uttar Pradesh 201002
            </a>
          </p>

          {/* SOCIAL ICONS */}
          <div className="flex flex-wrap gap-3 mt-5">
            {SOCIAL_LINKS.map((social, index) => (
              <motion.a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-gray-800 hover:bg-indigo-600 transition"
                whileHover={{ scale: 1.15, y: -3 }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: index * 0.15 }}
              >
                {social.icon}
              </motion.a>
            ))}
          </div>
        </div>

        {/* ================= NAV LINKS ================= */}
        <div>
          <h3 className="text-white text-lg font-semibold mb-4">
            {role === "admin"
              ? "Admin Links"
              : role === "user"
              ? "User Links"
              : "Quick Links"}
          </h3>

          <div className="relative space-y-1">
            {activeLinks.map((link, index) => {
              const isActive = index === activeIndex

              return (
                <div key={link.path} className="relative">
                  {isActive && (
                    <>
                      {/* GLOWING PILL */}
                      <motion.div
                        layoutId="footer-active-pill"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                        }}
                        className="absolute inset-0 rounded-xl
                          bg-indigo-600/20
                          border border-indigo-500
                          shadow-[0_0_20px_rgba(99,102,241,0.8)]"
                      />

                      {/* LEFT SLIDING ACCENT BAR */}
                      <motion.div
                        layoutId="footer-active-bar"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                        }}
                        className="absolute left-0 top-0 h-full w-1
                          bg-linear-to-b from-indigo-400 to-purple-500
                          rounded-l-xl"
                      />
                    </>
                  )}

                  <Link
                    href={link.path}
                    className={`relative z-10 block px-4 py-2 rounded-xl transition-all duration-300 ${
                      isActive
                        ? "text-indigo-400 font-semibold"
                        : "hover:text-white"
                    }`}
                  >
                    {link.name}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        {/* ================= AUTH + LEGAL ================= */}
        <div className="flex flex-col">
          <h3 className="text-white text-lg font-semibold mb-4">
            Login / Sign Up
          </h3>

          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/auth/login" className="hover:text-white transition">
                Login
              </Link>
            </li>
            <li>
              <Link href="/auth/register" className="hover:text-white transition">
                Sign Up
              </Link>
            </li>
          </ul>

          <h3 className="text-white text-lg font-semibold mt-6 mb-4">
            Legal
          </h3>

          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/privacy" className="hover:text-white transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white transition">
                Terms & Conditions
              </Link>
            </li>
          </ul>
        </div>

      </div>

      {/* ================= COPYRIGHT ================= */}
      <div className="relative border-t border-gray-800 text-center py-4 text-xs sm:text-sm">
        COPYRIGHT © {year} SAASHAA AI. ALL RIGHTS RESERVED.
      </div>
    </motion.footer>
  )
}