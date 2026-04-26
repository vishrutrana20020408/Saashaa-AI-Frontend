"use client"

import { useState, FormEvent } from "react"
import { motion } from "framer-motion"
import {
  Rocket,
  Sparkles,
  Brain,
  Briefcase,
  Bell,
  ShieldCheck,
  LucideIcon,
} from "lucide-react"
import Image from "next/image"

/* ================= TYPES ================= */
type Feature = {
  icon: LucideIcon
  title: string
  description: string
  expectedRelease: string
}

type RecentFeature = {
  icon: LucideIcon
  title: string
  description: string
  Released: string
}

/* ================= DATA ================= */
const UPCOMING_FEATURES: Feature[] = [
  {
    icon: Brain,
    title: "AI-Powered Role Matching",
    description:
      "Next-generation AI will analyze your profile more intelligently to recommend highly relevant roles and long-term career pathways.",
    expectedRelease: "04-08-2027",
  },
  {
    icon: Briefcase,
    title: "Personalized Feedback on Applications",
    description:
      "Receive AI-driven insights and suggestions to optimize your resumes and cover letters for each application.",
    expectedRelease: "04-08-2027",
  },
  {
    icon: Sparkles,
    title: "Job Opportunities Based on Learning Progress",
    description:
      "AI algorithms suggest job openings aligned with the skills and knowledge you acquire through our platform.",
    expectedRelease: "04-08-2027",
  },
  {
    icon: Bell,
    title: "Interview Preparation Plans",
    description:
      "Personalized interview preparation resources tailored to your target roles and industries.",
    expectedRelease: "04-08-2027",
  },
  {
    icon: ShieldCheck,
    title: "Real-Time Interview Assessments",
    description:
      "Simulated interview environments where you can practice and receive feedback on your performance.",
    expectedRelease: "04-08-2027",
  },
  {
    icon: Rocket,
    title: "Skills-Focused Job Recommendations",
    description:
      "Job suggestions that prioritize your demonstrated skills and competencies over traditional qualifications.",
    expectedRelease: "04-08-2027",
  },
]

const RECENT_UPDATES: RecentFeature[] = [
  {
    icon: Brain,
    title: "AI-Powered Role Matching",
    description:
      "Next-generation AI will analyze your profile more intelligently to recommend highly relevant roles.",
    Released: "04-08-2026",
  },
  {
    icon: Briefcase,
    title: "Personalized Feedback on Applications",
    description:
      "Receive AI-driven insights to optimize your resumes and cover letters.",
    Released: "04-08-2026",
  },
  {
    icon: Sparkles,
    title: "Job Opportunities Based on Learning Progress",
    description:
      "AI suggests job openings aligned with the skills you acquire.",
    Released: "04-08-2026",
  },
  {
    icon: Bell,
    title: "Interview Preparation Plans",
    description:
      "Personalized interview preparation resources for your career goals.",
    Released: "04-08-2026",
  },
  {
    icon: ShieldCheck,
    title: "Real-Time Interview Assessments",
    description:
      "Simulated interviews with real-time AI feedback.",
    Released: "04-08-2026",
  },
  {
    icon: Rocket,
    title: "Skills-Focused Job Recommendations",
    description:
      "Job suggestions that prioritize your skills over degrees.",
    Released: "04-08-2026",
  },
]

/* ================= COMPONENT ================= */
export default function UpdatesPage() {
  return (
    <div className="w-full bg-black text-white overflow-x-hidden">
      {/* HERO */}
      <section className="min-h-screen flex items-center bg-linear-to-br from-black via-zinc-900 to-black px-6 md:px-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
              Platform Enhancements Arriving Soon
            </h1>
            <p className="text-lg text-zinc-400 max-w-xl">
              SaaShaa AI is evolving with smarter tools, stronger career paths,
              and personalized opportunities.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <Image
              src="/updates/updates.png"
              alt="Upcoming updates"
              width={500}
              height={400}
              className="w-full max-w-md md:max-w-lg object-contain"
            />
          </motion.div>
        </div>
      </section>

      {/* RECENT UPDATES */}
      <section className="bg-white text-black py-20 px-6 md:px-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-10 text-center">
            Recent Updates
          </h2>

          <ul className="relative border-l-2 border-indigo-600 ml-6 space-y-10">
            {RECENT_UPDATES.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="relative pl-10 flex flex-col md:flex-row md:items-center gap-2 md:gap-6"
                >
                  <div className="absolute -left-6 top-1 w-12 h-12 flex items-center justify-center rounded-full bg-indigo-900 text-white">
                    <Icon size={22} />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-zinc-600">
                      {item.description}
                    </p>
                  </div>

                  <span className="hidden md:block text-sm text-indigo-600 font-semibold">
                    {item.Released}
                  </span>
                </motion.li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* UPCOMING FEATURES */}
      <section className="bg-white text-black py-20 px-6 md:px-20 border-t">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-10 text-center">
            Upcoming Features
          </h2>

          <ul className="relative border-l-2 border-indigo-600 ml-6 space-y-10">
            {UPCOMING_FEATURES.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="relative pl-10 flex flex-col md:flex-row md:items-center gap-2 md:gap-6"
                >
                  <div className="absolute -left-6 top-1 w-12 h-12 flex items-center justify-center rounded-full bg-indigo-900 text-white">
                    <Icon size={22} />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-zinc-600">
                      {item.description}
                    </p>
                  </div>

                  <span className="hidden md:block text-sm text-indigo-600 font-semibold">
                    {item.expectedRelease}
                  </span>
                </motion.li>
              )
            })}
          </ul>
        </div>
      </section>
    </div>
  )
}
