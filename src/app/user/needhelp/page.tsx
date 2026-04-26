"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How do I start an interview?",
    answer:
      "Go to the Interview page from your dashboard and click on 'Start Interview'. Make sure your microphone and camera permissions are enabled.",
  },
  {
    question: "Why is my microphone not working?",
    answer:
      "Please check browser permissions and ensure no other application is using your microphone.",
  },
  {
    question: "How can I retake an interview?",
    answer:
      "If retakes are enabled by your recruiter, you will see a 'Retake Interview' option in your dashboard.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can use the contact form below or email us at support@aiinterview.com.",
  },
];

export default function NeedHelpPage() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [animationData, setAnimationData] = useState<any>(null);

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  useEffect(() => {
    // Check if lottie file exists before fetching, or just disable for now if not present
    /*
    fetch("/lottie/support.json")
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch(err => console.error("Lottie load failed", err));
    */
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden"
    >
      {/* Floating Gradient Background */}
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient" />

      {/* ========== HERO SECTION ========== */}
      <section className="min-h-screen flex items-center justify-center px-6 bg-linear-to-br from-black/60 to-black/40 backdrop-blur-lg">
        <div className="max-w-6xl w-full grid md:grid-cols-2 gap-10 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-white"
          >
            <h1 className="text-5xl font-bold mb-6">
              Need Help? We're Here for You 👋
            </h1>
            <p className="text-lg opacity-90">
              Get instant support, browse FAQs, or contact our support team for
              personalized assistance.
            </p>
          </motion.div>

          {/* Lottie Animation or Placeholder */}
          <motion.div
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            {animationData ? (
              <Lottie animationData={animationData} loop={true} />
            ) : (
              <div className="w-full max-w-md aspect-square bg-white/10 rounded-3xl border border-white/20 backdrop-blur-md flex flex-col items-center justify-center p-8 text-white">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="bg-white/20 p-6 rounded-full mb-6"
                >
                  <HelpCircle size={80} className="text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold mb-2">Help Center</h3>
                <p className="text-center text-white/70">
                  Our AI support assistant is ready to help you with any questions.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ========== FAQ SECTION ========== */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-bold text-center mb-12 text-black"
          >
            Frequently Asked Questions
          </motion.h2>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 cursor-pointer shadow-xl"
                whileHover={{ scale: 1.02 }}
                onClick={() => toggleFAQ(index)}
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-black/90">
                    {faq.question}
                  </h3>
                  <span className="text-white text-xl">
                    {activeIndex === index ? "-" : "+"}
                  </span>
                </div>

                <AnimatePresence>
                  {activeIndex === index && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="text-black/70 mt-4 overflow-hidden"
                    >
                      {faq.answer}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CONTACT SECTION ========== */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-2xl border border-white/20 p-10 rounded-3xl shadow-2xl">
          <h2 className="text-3xl font-bold text- mb-6 text-center">
            Still Need Help?
          </h2>

          <form className="space-y-6">
            <input
              type="text"
              placeholder="Your Name"
              className="w-full p-4 rounded-xl bg-white/20 text-black/80 placeholder-black/60 focus:outline-none"
            />
            <input
              type="email"
              placeholder="Your Email"
              className="w-full p-4 rounded-xl bg-white/20 text-black/80 placeholder-black/60 focus:outline-none"
            />
            <textarea
              placeholder="Describe your issue..."
              rows={5}
              className="w-full p-4 rounded-xl bg-white/20 text-black/80 placeholder-black/60 focus:outline-none"
            />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full py-4 rounded-xl bg-linear-to-r from-indigo-500 to-pink-500 text-white font-semibold shadow-lg"
            >
              Submit Request
            </motion.button>
          </form>
        </div>
      </section>
    </motion.div>
  );
}