"use client"

import { motion } from "framer-motion"

export default function AboutPage() {
  const values = [
    { title: "Integrity", text: "We do the right thing." },
    { title: "Excellence", text: "Quality without compromise." },
    { title: "Collaboration", text: "Built together." },
    { title: "Innovation", text: "Always evolving." },
  ]

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen bg-white text-gray-800">

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-linear-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-4xl md:text-6xl font-bold tracking-tight"
          >
            About Us
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 max-w-3xl mx-auto text-lg text-indigo-100"
          >
            We build technology with heart, clarity, and purpose.
          </motion.p>

        </div>
      </section>

      {/* ================= STORY ================= */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">

        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-semibold mb-4">Our Story</h2>
          <p className="text-gray-600 leading-relaxed ">
            We started with one simple belief: technology should make life
            simpler, not louder. From midnight code sessions to scalable
            platforms, our journey is driven by clarity, empathy, and innovation.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gray-100 rounded-2xl p-8 shadow-sm"
        >
          <h3 className="text-xl font-semibold mb-3">What We Stand For</h3>
          <ul className="space-y-3 text-gray-600">
            <li>🚀 Innovation with purpose</li>
            <li>🤝 Human-first design</li>
            <li>🔒 Trust & transparency</li>
            <li>📈 Growth that scales</li>
          </ul>
        </motion.div>

      </section>

      {/* ================= MISSION ================= */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">

          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl font-semibold"
          >
            Our Mission
          </motion.h2>

          <p className="mt-6 text-gray-600 max-w-3xl mx-auto">
            To empower people and businesses with tools that feel natural,
            scale beautifully, and create real impact.
          </p>

        </div>
      </section>

      {/* ================= VALUES ================= */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-semibold text-center mb-12">
          Our Core Values
        </h2>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {values.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-lg border"
            >
              <h3 className="font-semibold text-lg mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {item.text}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="bg-indigo-600 text-white py-20 text-center">
        <h2 className="text-3xl font-semibold">
          Let’s Build Something Meaningful
        </h2>

        <p className="mt-4 text-indigo-100">
          The future doesn’t wait. Neither should you.
        </p>

        <a
          href="/contact#message"
          className="inline-block mt-8 px-8 py-3 bg-white text-indigo-600 rounded-full font-medium hover:scale-105 transition"
        >
          Contact Us
        </a>
      </section>

    </div>
  )
}