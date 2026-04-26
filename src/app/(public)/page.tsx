"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { TypeAnimation } from "react-type-animation"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Particles from "@/components/common/Particles"
import HomeNavbar from "@/components/nav/PublicNavbar"
import { link } from "fs"


const SLIDES = [
  {
    avatar: "/home/welcome.png",
    bg: "from-black to-zinc-900",
    title: "Welcome to SaaShaa AI",
    text: "Empowering your job search with AI-driven insights and personalized career guidance.",
    button: "Get Started",
    route: "/auth/login",
  },
  {
    avatar: "/home/internship.png",
    bg: "from-purple-700 to-indigo-900",
    title: "Online Internship Opportunities",
    text: "AI-powered internship discovery and placement for students and fresh graduates.",
    button: "Explore Internships",
    route: "/internships",
  },
  {
    avatar: "/home/jobsearch.png",
    bg: "from-fuchsia-700 to-black",
    title: "Smart Job Search",
    text: "Discover verified job roles aligned with your skills and career goals.",
    button: "View Job Roles",
    route: "/jobs",
  },
  {
    avatar: "/home/career.png",
    bg: "from-emerald-700 to-black",
    title: "Career Growth & Guidance",
    text: "Build your career with continuous learning, mentoring, and AI insights.",
    button: "Explore Careers",
    route: "/career",
  },
  {
    avatar: "/home/updates.png",
    bg: "from-orange-700 to-black",
    title: "Platform Updates",
    text: "Stay informed about upcoming features and platform enhancements.",
    button: "Upcoming Updates",
    route: "/updates",
  },
  {
    avatar: "/home/doubt.png",
    bg: "from-zinc-900 to-black",
    title: "Have Questions?",
    text: "Get instant answers to common queries about SaaShaa AI.",
    button: "FAQs",
    route: "/faq",
  },
]

const TEAM = [
  { name: "Founder", role: "Vishrut Rana", img:"/image/Founder.png",link:"https://portfolio-website-reactjs-nine.vercel.app/" },
  { name: "AI Lead", role: "", img:"/image/ai-lead.png", link:"/" },
  { name: "Product", role: "", img:"/image/product.png",link:"/" },
]

const TIMELINE = [
  { year: "2025", text: "Idea ignited" },
  { year: "2026", text: "AI platform launched" },
  { year: "2027", text: "Global career network" },
]

export default function Home() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lockRef = useRef(false)

  // Check login status
  useEffect(() => {
    const token = localStorage.getItem("authToken") // adjust to your login key
    Promise.resolve().then(() => setIsLoggedIn(!!token))
  }, [])

  // Slider progress interval
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress(p => Math.min(p + 2, 100))
    }, 100)
    return () => clearInterval(intervalRef.current!)
  }, [])

  // Slide change watcher
  useEffect(() => {
    if (progress === 100 && !lockRef.current) {
      lockRef.current = true
      setTimeout(() => {
        setIndex(i => (i + 1) % SLIDES.length)
        setProgress(0)
        lockRef.current = false
      }, 400)
    }
  }, [progress])

  const next = () => {
    if (lockRef.current) return
    lockRef.current = true
    setIndex(i => (i + 1) % SLIDES.length)
    setProgress(0)
    setTimeout(() => (lockRef.current = false), 400)
  }

  const prev = () => {
    if (lockRef.current) return
    lockRef.current = true
    setIndex(i => (i - 1 + SLIDES.length) % SLIDES.length)
    setProgress(0)
    setTimeout(() => (lockRef.current = false), 400)
  }

  return (
    <main className="w-full overflow-x-hidden">

      {/* SHOW NAVBAR IF NOT LOGGED IN */}
      {!isLoggedIn && <HomeNavbar />}

      {/* HERO SLIDER */}
      <div className={`relative h-screen w-full bg-linear-to-br ${SLIDES[index].bg} overflow-hidden`}>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            className="grid grid-cols-1 md:grid-cols-2 items-center h-full px-4 sm:px-8 md:px-12"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.8 }}
          >
            <motion.img
              src={SLIDES[index].avatar}
              className="max-h-[60vh] sm:max-h-[70vh] md:max-h-[80vh] mx-auto select-none pointer-fine"
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 3 }}
            />

            <div className="text-white space-y-4 sm:space-y-6 pointer-fine select-none text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                <TypeAnimation
                  key={index}
                  sequence={[SLIDES[index].title, 1200]}
                  speed={50}
                  cursor={false}
                />
              </h1>

              <p className="text-base sm:text-lg max-w-md mx-auto md:mx-0 select-none cursor-fine">
                <TypeAnimation
                  key={index + "-p"}
                  sequence={[SLIDES[index].text, 2000]}
                  speed={50}
                  cursor={false}
                />
              </p>

              <button
                onClick={() => router.push(SLIDES[index].route)}
                className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:scale-105 transition cursor-pointer select-none text-sm sm:text-base"
              >
                {SLIDES[index].button}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        <button onClick={prev} className="absolute left-2 sm:left-6 top-1/2 bg-white p-2 sm:p-3 rounded-full cursor-pointer select-none">
          <ChevronLeft />
        </button>

        <button onClick={next} className="absolute right-2 sm:right-6 top-1/2 bg-white p-2 sm:p-3 rounded-full cursor-pointer select-none">
          <ChevronRight />
        </button>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-2 bg-white/30 rounded">
          <motion.div className="h-full bg-blue-500" animate={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIndex(i); setProgress(0) }}
            className={`w-3 h-3 rounded-full ${i === index ? "bg-blue-500" : "bg-white/40"}`}
          />
        ))}
      </div>

      {/* ABOUT */}
      <section className="relative min-h-screen bg-black text-white flex items-center justify-center select-none px-4">
        <Particles />
        <motion.div className="z-10 text-center space-y-4 sm:space-y-6 max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold">We are SaaShaa AI</h2>
          <p className="text-lg sm:text-xl text-white/70">An intelligence engine for human ambition.</p>
          <button onClick={() => router.push("/about")} className="bg-white text-black px-8 sm:px-10 py-3 sm:py-4 rounded-full cursor-pointer font-semibold hover:scale-105 transition select-none text-sm sm:text-base">
            Enter Our Story
          </button>
        </motion.div>
      </section>

      {/* TEAM */}
      <section className="min-h-screen bg-linear-to-br from-zinc-900 to-black flex items-center justify-center text-white select-none cursor-fine px-4 py-16">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 max-w-6xl mx-auto">
    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center col-span-full mb-8">Our Team</h1>

    {TEAM.map((t, i) => (
      <motion.div
        key={i}
        whileHover={{ scale: 1.05, y: -8 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => window.open(t.link, "_blank")}
        className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 sm:p-8 text-center cursor-pointer
                   hover:ring-2 hover:ring-blue-500 
                   hover:shadow-[0_0_35px_rgba(59,130,246,0.6)]
                   transition-all duration-300"
      >
        <div className="h-24 w-24 sm:h-32 sm:w-32 mx-auto rounded-full overflow-hidden mb-4 sm:mb-6 ring-2 ring-white/30">
          <Image
            src={t.img}
            alt={t.name}
            width={128}
            height={128}
            className="w-full h-full object-cover"
          />
        </div>

        <h3 className="text-xl sm:text-2xl font-bold">{t.name}</h3>
        <p className="text-white/60 text-sm sm:text-base">{t.role}</p>
      </motion.div>
    ))}
  </div>
</section>

      {/* WHY CHOOSE US */}
<section className="min-h-screen bg-linear-to-b from-zinc-100 to-white py-16 sm:py-24 md:py-32 select-none cursor-fine">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">

    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">WHY CHOOSE US</h2>
    <p className="text-gray-500 mb-8 sm:mb-10 text-sm sm:text-base">
      Choose us for expertise, quality, reliability, and exceptional service delivery.
    </p>

    <div className="flex items-center justify-center mb-12 sm:mb-20">
      <span className="w-12 sm:w-16 h-px bg-gray-400"></span>
      <span className="mx-3 w-3 h-3 bg-indigo-600 rotate-45"></span>
      <span className="w-12 sm:w-16 h-px bg-gray-400"></span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 sm:gap-8">
      {[
        { icon: "</>", label: "Live Interview" },
        { icon: "💡", label: "Get Instant Feedback" },
        { icon: "🎁", label: "Get Free Tips" },
        { icon: "🤝", label: "Enhance All The Skills" },
        { icon: "➡", label: "Find Which Path Suits You Best" },
        { icon: "⬅", label: "Career Guidance & Growth" },
      ].map((item, i) => (
        <motion.div
          key={i}
          whileHover={{ y: -8, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="bg-white shadow-xl rounded-xl p-6 sm:p-8 md:p-10 flex flex-col items-center justify-center"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-900 text-white text-2xl sm:text-3xl flex items-center justify-center rounded-lg mb-4 sm:mb-6">
            {item.icon}
          </div>
          <p className="font-semibold text-gray-800 text-center text-sm sm:text-base">
            {item.label}
          </p>
        </motion.div>
      ))}
    </div>

  </div>
</section>


      {/* VISION */}
      <section className="min-h-screen bg-black text-white py-16 sm:py-24 md:py-32 select-none cursor-fine">
        <h2 className="text-center text-3xl sm:text-4xl md:text-5xl font-bold mb-12 sm:mb-20">Our Vision</h2>
        <div className="max-w-4xl mx-auto space-y-12 sm:space-y-16 md:space-y-20 px-4">
          {TIMELINE.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: i % 2 ? 80 : -80 }}
              whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 md:gap-10 text-center sm:text-left">
              <div className="text-3xl sm:text-4xl font-bold text-blue-400 shrink-0">{t.year}</div>
              <p className="text-lg sm:text-xl text-white/70">{t.text}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
    
  )
}
