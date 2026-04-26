"use client"

import { useState } from "react"
import Image from "next/image"
import { Facebook, Twitter, Linkedin, Instagram } from "lucide-react"
import emailjs from "@emailjs/browser"

type FormData = {
  name: string
  email: string
  subject: string
  message: string
}

type Errors = Partial<FormData>

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID_JOB!
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID_JOB!
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = (): Errors => {
    const err: Errors = {}
    if (!formData.name.trim()) err.name = "Name is required"
    if (!formData.email.trim()) err.email = "Email is required"
    else if (!/^\S+@\S+\.\S+$/.test(formData.email))
      err.email = "Invalid email"
    if (!formData.subject.trim()) err.subject = "Subject is required"
    if (!formData.message.trim()) err.message = "Message cannot be empty"
    return err
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setLoading(true)

    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        },
        PUBLIC_KEY
      )

      setSubmitted(true)
      setFormData({ name: "", email: "", subject: "", message: "" })
    } catch (err) {
      alert("Failed to send message. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const socialClass =
    "p-3 rounded-full bg-white/20 backdrop-blur hover:bg-indigo-600 hover:text-white hover:scale-110 transition-all duration-300"

  const contactFields = ["name", "email"] as const
  type ContactField = (typeof contactFields)[number]

  return (
    <div className="w-full">

      {/* ===== Top Contact Info Section ===== */}
      <div className="relative text-white py-24 px-6 overflow-hidden min-h-125">
        <Image
          src="/contact/contact.png"
          alt="Contact Background"
          fill
          className="object-cover -z-10"
          priority
          sizes="100vw"
        />
        <div className="max-w-6xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 select-none">
            Contact SaaShaa AI
          </h1>
          <p className="mb-8 text-white/90 max-w-2xl select-none">
            Have questions about AI interviews, careers, or our platform? Our team
            is ready to help you move forward with confidence.
          </p>

          <div className="grid sm:grid-cols-2 gap-8 text-sm sm:text-base select-none">
            <div>
              <p className="font-semibold">Address</p>
              <p><a href="https://maps.app.goo.gl/y4CzBuWJXEebu2BR7">
                F Block, Reserve Police Lines,
                <br />
                Shastri Nagar, Ghaziabad,Uttar Pradesh-201002
              </a>
              </p>
            </div>

            <div>
              <p className="font-semibold">Contact</p>
              <p>Email: saashaaaisupp@gmail.com</p>
              <p>Phone: +91 98765 43210</p>
            </div>
          </div>

          {/* Social Icons */}
          <div className="flex gap-4 mt-10">
            <a href="https://facebook.com" target="_blank" className={socialClass}><Facebook /></a>
            <a href="https://x.com/SaashaaAI" target="_blank" className={socialClass}><Twitter /></a>
            <a href="https://www.linkedin.com/in/saashaa-ai-6bbb863a8/" target="_blank" className={socialClass}><Linkedin /></a>
            <a href="https://instagram.com" target="_blank" className={socialClass}><Instagram /></a>
          </div>
        </div>
      </div>

      {/* ===== Contact Form Section ===== */}
      <div className="py-20 px-4 sm:px-10 lg:px-24 bg-gray-50 select-none" id="message">
        <div className="w-full bg-white shadow-2xl rounded-2xl p-8 sm:p-12">
          <h2 className="text-3xl font-bold mb-10 text-center">
            Send Us a Message
          </h2>

          {submitted && (
            <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg text-center text-sm">
              Your message has been sent successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {contactFields.map((field) => (
                <div key={field}>
                  <label className="block mb-1 font-medium capitalize">
                    {field}
                  </label>
                  <input
                    type={field === "email" ? "email" : "text"}
                    name={field}
                    value={formData[field]}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  {errors[field] && (
                    <p className="text-red-500 text-sm">
                      {errors[field]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block mb-1 font-medium">Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {errors.subject && (
                <p className="text-red-500 text-sm">{errors.subject}</p>
              )}
            </div>

            <div>
              <label className="block mb-1 font-medium">Message</label>
              <textarea
                name="message"
                rows={5}
                value={formData.message}
                onChange={handleChange}
                className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {errors.message && (
                <p className="text-red-500 text-sm">{errors.message}</p>
              )}
            </div>

            <button
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 hover:scale-[1.02] transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>

      {/* ===== Google Map ===== */}
      <div className="px-4 sm:px-10 lg:px-20 pb-24">
        <div className="w-full h-87.5 sm:h-112.5 lg:h-137.5 rounded-3xl overflow-hidden shadow-xl">
          <iframe
            title="Company Location"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d850.0571160433602!2d77.4758554!3d28.6745875!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390cf3692f72b139%3A0x4c3189140cacc3b!2sSaashaaai!5e1!3m2!1sen!2sin!4v1769534972210!5m2!1sen!2sin"
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>
        <p className="text-center mt-4 text-gray-600 text-sm">
          Find us easily on Google Maps
        </p>
      </div>
    </div>
  )
}
