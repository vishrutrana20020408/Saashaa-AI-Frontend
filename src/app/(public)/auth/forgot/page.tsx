"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Mail, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [shake, setShake] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])

  const handleSubmit = () => {
    if (!email.includes("@") || !email.endsWith(".com") || email.includes(" ")) {
      setError("Enter a valid email (must contain @ and .com)")
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    setError("")
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-(--background) text-(--foreground) flex items-center justify-center p-4">
      <motion.div
        animate={shake ? { x: [-10, 10, -8, 8, 0] } : {}}
        className="bg-(--card) rounded-2xl shadow-2xl w-full max-w-md p-8 relative border border-(--border)"
      >
        {/* Back */}
        <button
          onClick={() => router.push("/auth/login")}
          className="absolute top-4 left-4 text-(--muted) hover:text-(--primary)"
        >
          <ArrowLeft />
        </button>

        <h2 className="text-2xl font-bold text-center mb-2">
          Forgot Your Password?
        </h2>
        <p className="text-center text-(--muted) mb-6 italic">
          Even legends forget. We’ve got you. 😌
        </p>

        {!sent ? (
          <>
            <div className="relative mb-4">
              <Mail className="absolute left-3 top-3 text-(--muted)" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value.replace(/\s/g, ""))
                }
                className="w-full rounded-lg border border-(--border) bg-(--popover) text-(--foreground) pl-10 pr-4 py-3 outline-none focus:border-(--primary) focus:ring-(--primary/20)"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 mb-3 text-center">
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              className="w-full bg-(--primary) text-(--primary-foreground) py-3 rounded-lg hover:opacity-90 transition"
            >
              Send Reset Link
            </button>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <p className="text-green-600 font-semibold mb-2">
              Reset link sent! 📩
            </p>
            <p className="text-(--muted) text-sm mb-6">
              Check your inbox. If it’s not there, check spam — or destiny.
            </p>
            <button
              onClick={() => router.push("/auth/login")}
              className="bg-(--primary) text-(--primary-foreground) px-6 py-2 rounded-lg hover:opacity-90"
            >
              Back to Login
            </button>
          </motion.div>
        )}

        <p className="text-center text-xs mt-8 text-(--muted)">
          © {year} All rights reserved
        </p>
      </motion.div>
    </div>
  )
}
