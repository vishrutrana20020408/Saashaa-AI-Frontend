"use client"

import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, X } from "lucide-react"

const HOME_LINKS = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
  { name: "Careers In SaaShaa", path: "/career" },
  { name: "Internships", path: "/internships" },
  { name: "Contact", path: "/contact" },
  { name: "Updates", path: "/updates" },
  { name: "FAQ", path: "/faq" },
]

export default function PublicNavbar() {
  const router = useRouter()
  const pathname = usePathname()

  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path: string) => pathname === path

  const navigate = (path: string) => {
    setMenuOpen(false)
    router.push(path)
  }

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-(--border) bg-(--card) text-(--foreground) shadow-sm">
      <div className="max-w-10xl mx-auto px-6 py-3 flex justify-between items-center">

        {/* LOGO */}
        <h1
          onClick={() => navigate("/")}
          className="text-2xl font-bold cursor-pointer tracking-wide text-(--foreground) hover:text-(--primary) transition"
        >
          SaaShaa AI
        </h1>

        {/* DESKTOP LINKS */}
        <div className="hidden lg:flex items-center gap-8">
          {HOME_LINKS.map((link) => (
            <button
              key={link.name}
              onClick={() => navigate(link.path)}
              className={`relative group font-medium transition cursor-pointer select-none text-sm ${
                isActive(link.path)
                  ? "text-(--primary) font-semibold"
                  : "text-(--foreground) hover:text-(--primary)"
              }`}
            >
              {link.name}
              <span className="absolute left-0 -bottom-1 h-0.5 w-0 bg-blue-600 transition-all duration-300 group-hover:w-full" />
            </button>
          ))}

          {/* AUTH */}
          <button
            onClick={() => navigate("/auth/login")}
            className="px-4 py-2 rounded-lg border border-(--border) bg-(--card) text-(--foreground) hover:bg-(--popover) hover:text-(--foreground) transition font-medium text-sm"
          >
            Login
          </button>

          <button
            onClick={() => navigate("/auth/register")}
            className="px-6 py-2 rounded-lg bg-(--primary) text-(--primary-foreground) hover:opacity-90 transition font-medium text-sm shadow-sm"
          >
            Register
          </button>
        </div>

        {/* MOBILE MENU TOGGLE */}
        <button className="lg:hidden text-(--foreground)" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-3 bg-(--card) border-t border-(--border)"
        >
          {HOME_LINKS.map((link) => (
            <button
              key={link.name}
              onClick={() => navigate(link.path)}
              className={`py-2 text-left border-b border-(--border) font-medium ${
                isActive(link.path)
                  ? "text-(--primary)"
                  : "text-(--foreground)"
              }`}
            >
              {link.name}
            </button>
          ))}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/auth/login")}
              className="border border-(--border) py-2 rounded-lg text-left text-(--foreground) hover:bg-(--popover) px-3 font-medium"
            >
              Login
            </button>

            <button
              onClick={() => navigate("/auth/register")}
              className="bg-blue-600 text-white py-2 rounded-lg text-left px-3 font-medium hover:bg-blue-700"
            >
              Register
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}