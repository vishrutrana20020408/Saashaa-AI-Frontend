"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

type FAQ = {
  q: string
  a: string
}

type FAQGroup = {
  section: string
  bg: string
  faqs: FAQ[]
}

const FAQ_DATA: FAQGroup[] = [
  {
    section: "General",
    bg: "bg-white",
    faqs: [
      {
        q: "What is SaaShaa AI?",
        a: "SaaShaa AI is an AI-powered career guidance platform that helps students and job seekers discover the right career paths, develop skills, and connect with verified job opportunities.",
      },
      {
        q: "Who can use SaaShaa AI?",
        a: "Our platform is designed for college students, fresh graduates, and early-career professionals seeking internships, training programs, and job placements.",
      },
      {
        q: "Is SaaShaa AI free to use?",
        a: "We offer both free and premium features. Users can access essential career tools for free, while advanced AI insights and premium programs may require a subscription.",
      },
    ],
  },
  {
    section: "Career Guidance",
    bg: "bg-zinc-50",
    faqs: [
      {
        q: "How does AI career guidance work?",
        a: "Our AI analyzes your skills, interests, and goals to recommend personalized career paths, training programs, and job opportunities.",
      },
      {
        q: "Can I change my career path recommendations later?",
        a: "Yes. As you update your profile and complete more activities, our AI continuously refines your recommendations.",
      },
      {
        q: "Are the career paths industry-relevant?",
        a: "Absolutely. Our recommendations are based on current job market trends and verified employer requirements.",
      },
    ],
  },
  {
    section: "Programs & Training",
    bg: "bg-white",
    faqs: [
      {
        q: "What kind of skill development programs are offered?",
        a: "We provide both technical and soft-skill programs, including coding, communication, interview preparation, and workplace readiness.",
      },
      {
        q: "Are training programs certified?",
        a: "Many of our partner programs offer certifications upon completion, enhancing your resume credibility.",
      },
      {
        q: "How do I enroll in a program?",
        a: "You can browse available programs in your dashboard and enroll directly through the platform.",
      },
    ],
  },
  {
    section: "Internships & Jobs",
    bg: "bg-zinc-50",
    faqs: [
      {
        q: "Are the internships verified?",
        a: "Yes. We verify partner companies to ensure legitimate internship and job opportunities for our users.",
      },
      {
        q: "Do you guarantee job placement?",
        a: "While we provide 100% placement assistance, final hiring decisions are made by employers based on performance and fit.",
      },
      {
        q: "How does placement assistance work?",
        a: "We support you with resume building, interview preparation, referrals, and direct employer connections.",
      },
    ],
  },
]

function FAQItem({
  question,
  answer,
}: {
  question: string
  answer: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-zinc-200 py-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center text-left"
      >
        <span className="text-lg font-semibold text-zinc-800">
          {question}
        </span>
        <ChevronDown
          className={`transition-transform duration-300 ${
            open ? "rotate-180 text-indigo-600" : "text-zinc-400"
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="text-zinc-600 mt-3 leading-relaxed"
          >
            {answer}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="w-full text-black">
      {/* Hero */}
      <section className="bg-indigo-900 text-white py-24 text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-6xl font-bold mb-4"
        >
          Frequently Asked Questions
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg md:text-xl max-w-2xl mx-auto"
        >
          Find answers to common questions about SaaShaa AI, our programs,
          and career support services.
        </motion.p>
      </section>

      {/* Sections */}
      {FAQ_DATA.map((group, index) => (
        <section
          key={index}
          className={`${group.bg} py-20 px-6 md:px-20`}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center text-indigo-900">
              {group.section}
            </h2>

            <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10">
              {group.faqs.map((faq, i) => (
                <FAQItem
                  key={i}
                  question={faq.q}
                  answer={faq.a}
                />
              ))}
            </div>
          </motion.div>
        </section>
      ))}

      {/* CTA */}
      <section className="bg-indigo-900 text-white py-20 text-center px-6">
        <motion.h3
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold mb-4"
        >
          Still have questions?
        </motion.h3>
        <p className="mb-8 text-lg text-indigo-100">
          Our support team is here to help you on your career journey.
        </p>
        <button className="bg-white text-indigo-900 font-semibold px-8 py-3 rounded-full hover:bg-indigo-100 transition"><a href="/contact#message">
          Contact Support</a>
        </button>
      </section>
    </div>
  )
}
