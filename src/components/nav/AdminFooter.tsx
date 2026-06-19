"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react"
import { motion } from "framer-motion"
import { useMemo } from "react"

export default function AdminFooter() {
  const pathname = usePathname()
  const currentYear = new Date().getFullYear()

  /* ================= ADMIN NAVIGATION ================= */

  const adminLinks = useMemo(
    () => [
      { name: "Overview", path: "/admin" },
      { name: "Dashboard", path: "/admin/dashboard" },
      { name: "Companies", path: "/admin/company" },
      { name: "Interviews", path: "/admin/interviewdashboard" },
      { name: "Resumes", path: "/admin/resume" },
      { name: "Users", path: "/admin/users" },
    ],
    []
  )

  /* ================= ACTIVE ROUTE LOGIC ================= */

  const activeIndex = useMemo(() => {
    return adminLinks.findIndex((link) => {
      if (link.path === "/admin/company") {
        return pathname.startsWith("/admin/company")
      }
      return pathname === link.path
    })
  }, [pathname, adminLinks])

  /* ================= SOCIAL LINKS ================= */

  const socialLinks = [
    { href: "https://facebook.com", icon: <Facebook size={18} /> },
    { href: "https://x.com", icon: <Twitter size={18} /> },
    { href: "https://linkedin.com", icon: <Linkedin size={18} /> },
    { href: "https://instagram.com", icon: <Instagram size={18} /> },
  ]

  return (
    <motion.footer
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="relative bg-black text-gray-400 mt-24 overflow-hidden"
    >
      {/* ================= FLOATING GRADIENT BACKGROUND ================= */}
      <motion.div
        animate={{
          x: [0, 40, -40, 0],
          y: [0, -30, 30, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -top-40 -left-40 w-125 h-125 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-20 blur-3xl rounded-full"
      />

      <motion.div
        animate={{
          x: [0, -30, 30, 0],
          y: [0, 40, -40, 0],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -bottom-40 -right-40 w-125 h-125 bg-linear-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-20 blur-3xl rounded-full"
      />

      {/* ================= SHIMMER BORDER ================= */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 rounded-none border-t border-transparent">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
            className="h-px w-1/2 bg-linear-to-r from-transparent via-indigo-500 to-transparent"
          />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12 grid gap-10 sm:grid-cols-2 md:grid-cols-3 select-none">

        {/* ================= BRAND ================= */}
        <div>
          <Link
            href="/admin"
            className="text-2xl font-extrabold text-white"
          >
            SaaShaa Admin
          </Link>

          <p className="text-sm leading-relaxed mt-4">
            Admin Control Panel
            <br />
            SaaShaa AI Management System
            <br />
            Secure & Centralized Dashboard
          </p>

          <div className="flex gap-3 mt-5">
            {socialLinks.map((social, index) => (
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

        {/* ================= ADMIN LINKS ================= */}
        <div>
          <h3 className="text-white text-lg font-semibold mb-4">
            Admin Links
          </h3>

          <div className="relative space-y-1">
            {adminLinks.map((link, index) => {
              const isActive = index === activeIndex

              return (
                <div key={link.path} className="relative">
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                      className="absolute inset-0 rounded-xl bg-indigo-600/20 border border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.8)]"
                    />
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

        {/* ================= LEGAL ================= */}
        <div>
          <h3 className="text-white text-lg font-semibold mb-4">
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
        COPYRIGHT © {currentYear} SAASHAA AI ADMIN PANEL. ALL RIGHTS RESERVED.
      </div>
    </motion.footer>
  )
}