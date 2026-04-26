"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MapPin, Clock, Briefcase, Search, X, CheckCircle2 } from "lucide-react"
import emailjs from "@emailjs/browser"

type Job = {
  title: string
  location: string
  type: string
  category: string
}

type FormData = {
  name: string
  qualification: string
  nationality: string
  mobile: string
  email: string
  resume: File | null
}

type Errors = Partial<Record<keyof FormData, string>>

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!

export default function JobsPage() {

  const COMPANY_NAME = "Careers SaaShaa AI "

  const jobsData: Job[] = [
    { title: "Frontend Developer", location: "Remote", type: "Contract", category: "Development" },
    { title: "Backend Developer", location: "Remote", type: "Contract", category: "Development" },
    { title: "UI/UX Designer", location: "Remote", type: "Contract", category: "Design" },
    { title: "AI/ML Engineer", location: "Remote", type: "Contract", category: "AI" },
    { title: "Digital Marketing Executive", location: "Remote", type: "Full Time", category: "Marketing" },
    { title: "HR Recruiter", location: "Remote", type: "Full Time", category: "HR" },
  ]

  const categories = ["All", "Development", "Design", "AI", "Marketing", "HR"]

  const qualificationOptions = ["B.tech", "M.tech", "B.Sc", "M.Sc", "B.BA", "M.BA", "MBBS", "Diploma", "Other"]

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedJob, setSelectedJob] = useState<string | null>(null)

  const [selectedQualification, setSelectedQualification] = useState("")
  const [otherQualification, setOtherQualification] = useState("")

  const [successPopup, setSuccessPopup] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    name: "",
    qualification: "",
    nationality: "",
    mobile: "",
    email: "",
    resume: null,
  })

  const [errors, setErrors] = useState<Errors>({})

  const filteredJobs = jobsData.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === "All" || job.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedJob(null)
        setSuccessPopup(false)
      }
    }
    window.addEventListener("keydown", handleEsc)
    return () => window.removeEventListener("keydown", handleEsc)
  }, [])

  useEffect(() => {
    if (selectedQualification === "Other") {
      setFormData({ ...formData, qualification: otherQualification })
    } else {
      setFormData({ ...formData, qualification: selectedQualification })
    }
  }, [selectedQualification, otherQualification])

  const validate = (): boolean => {
    const err: Errors = {}
    if (!formData.name.trim()) err.name = "Name is required"
    if (!formData.qualification.trim()) err.qualification = "Qualification required"
    if (!formData.nationality.trim()) err.nationality = "Nationality required"
    if (!/^\d{10}$/.test(formData.mobile)) err.mobile = "Enter valid 10-digit mobile number"
    if (!/^[^\s@]+@[^\s@]+\.com$/.test(formData.email)) err.email = "Email must contain @ and end with .com"
    if (!formData.resume) err.resume = "Resume required"
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          name: formData.name,
          qualification: formData.qualification,
          nationality: formData.nationality,
          mobile: formData.mobile,
          email: formData.email,
          job_title: selectedJob,
          company: COMPANY_NAME,
          resume_name: formData.resume?.name,
        },
        PUBLIC_KEY
      )

      setSelectedJob(null)
      setSuccessPopup(true)

      setTimeout(() => {
        setSuccessPopup(false)
      }, 3000)

      setFormData({
        name: "",
        qualification: "",
        nationality: "",
        mobile: "",
        email: "",
        resume: null,
      })

      setSelectedQualification("")
      setOtherQualification("")
      setErrors({})

    } catch (error) {
      console.error("EmailJS error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* SUCCESS POPUP */}
      <AnimatePresence>
        {successPopup && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setSuccessPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm w-full"
            >
              <CheckCircle2 size={60} className="mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-bold mb-2">Application Submitted!</h3>
              <p className="text-gray-600">
                Thank you for applying. Our team will contact you soon.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <section
        className="relative h-[70vh] sm:h-[80vh] flex items-center justify-center text-center text-white select-none"
        style={{
          backgroundImage: "url('/career/career.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >

        <div className="absolute inset-0 bg-black/60" />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-3xl px-4 sm:px-6"
        >

          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-6">
            Your Career is Your Superpower
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-gray-200 italic">
            “Don’t chase jobs. Chase growth. The right opportunity will chase you back.”
          </p>

        </motion.div>

      </section>

      <div className="px-4 sm:px-6 py-20 max-w-6xl mx-auto">

        {/* TITLE */}
        <div className="text-center mb-12 select-none">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Explore Career Opportunities
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Find the right job that matches your skills and passion.
          </p>
        </div>

        {/* SEARCH */}
        <div className="max-w-xl mx-auto mb-8 relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-full border focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 select-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-white border hover:bg-gray-100 cursor-pointer"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* JOBS */}
        <div className="grid gap-6 sm:grid-cols-2">
          {filteredJobs.map((job, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.02 }}
              className="bg-white p-6 rounded-2xl shadow-md flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3 flex items-center gap-2">
                  <Briefcase size={18} className="text-blue-600" />
                  {job.title}
                </h3>
                <div className="flex flex-wrap gap-4 text-gray-600 text-sm mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin size={16} /> {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={16} /> {job.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(job.title)}
                className="mt-4 bg-blue-600 text-white py-2 rounded-full hover:bg-blue-700 transition select-none cursor-pointer"
              >
                Apply Now
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {selectedJob && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedJob(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-lg rounded-2xl p-6 relative"
            >
              <button
                onClick={() => setSelectedJob(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-black"
              >
                <X />
              </button>

              <h3 className="text-xl sm:text-2xl font-bold mb-4">
                Apply for {selectedJob}
              </h3>

              <div className="space-y-4">

                <input
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border p-3 rounded-lg"
                />

                <select
                  value={selectedQualification}
                  onChange={(e) => setSelectedQualification(e.target.value)}
                  className="w-full border p-3 rounded-lg"
                >
                  <option value="">Select Qualification</option>
                  {qualificationOptions.map((q) => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>

                {selectedQualification === "Other" && (
                  <input
                    type="text"
                    placeholder="Enter your qualification"
                    value={otherQualification}
                    onChange={(e) => setOtherQualification(e.target.value)}
                    className="w-full border p-3 rounded-lg"
                  />
                )}

                <input
                  type="text"
                  placeholder="Nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full border p-3 rounded-lg"
                />

                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                  placeholder="Mobile Number"
                  value={formData.mobile}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mobile: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  className="w-full border p-3 rounded-lg"
                />

                <input
                  type="email"
                  placeholder="Email ID"
                  pattern="^[^\s@]+@[^\s@]+\.com$"
                  title="Email must contain @ and end with .com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full border p-3 rounded-lg"
                />

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,image/*"
                  onChange={(e) =>
                    setFormData({ ...formData, resume: e.target.files?.[0] || null })
                  }
                  className="w-full border p-3 rounded-lg"
                />

                <button
                  onClick={handleSubmit}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                >
                  Submit Application
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
