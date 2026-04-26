"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import { X, Upload } from "lucide-react";
import emailjs from "@emailjs/browser";

type Internship = {
  id: number;
  title: string;
  company: string;
  type: "Technical" | "Non-Technical";
  location: string;
};

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!;
const TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!;
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!;

const internshipsData: Internship[] = [
  { id: 1, title: "Frontend Developer Intern", company: "TechNova", type: "Technical", location: "Remote" },
  { id: 2, title: "Data Science Intern", company: "DataForge", type: "Technical", location: "Remote" },
  { id: 3, title: "Python Developer Intern", company: "CodeCraft", type: "Technical", location: "Remote" },
  { id: 4, title: "HR Intern", company: "PeopleFirst", type: "Non-Technical", location: "Remote" },
  { id: 5, title: "Marketing Intern", company: "BrandSpark", type: "Non-Technical", location: "Remote" },
  { id: 6, title: "Operations Intern", company: "WorkFlow Inc.", type: "Non-Technical", location: "Remote" },
];

const qualifications = ["B.Tech","M.Tech","B.Sc","M.Sc","BBA","MBA","Diploma","Other"];

export default function InternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Internship | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    nationality: "",
    mobile: "",
    qualification: "",
    resume: null as File | null,
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    nationality: "",
    mobile: "",
    qualification: "",
    resume: "",
  });

  useEffect(() => setInternships(internshipsData), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = internships.filter(
    (i) =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.company.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    const newErrors = {
      name: "",
      email: "",
      nationality: "",
      mobile: "",
      qualification: "",
      resume: "",
    };

    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    if (!form.nationality.trim()) newErrors.nationality = "Nationality is required";
    if (!form.mobile.trim()) newErrors.mobile = "Mobile is required";
    if (!form.qualification || form.qualification === "Select Qualification")
      newErrors.qualification = "Select qualification";
    if (!form.resume) newErrors.resume = "Upload resume";

    setErrors(newErrors);
    if (Object.values(newErrors).some((e) => e)) return;

    try {
      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          name: form.name,
          email: form.email,
          mobile: form.mobile,
          nationality: form.nationality,
          qualification: form.qualification,
          internshipTitle: selected?.title,
          company: selected?.company,
          location: selected?.location,
          resumeFileName: form.resume?.name,
        },
        PUBLIC_KEY
      );

      toast.success("Application sent successfully 🚀");
      setSelected(null);
      setForm({
        name: "",
        email: "",
        nationality: "",
        mobile: "",
        qualification: "",
        resume: null,
      });
    } catch {
      toast.error("Failed to send. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="relative h-[60vh] w-full select-none">
        <Image src="/internship/hero.png" alt="Internships" fill className="object-cover" />
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold">Find Your Dream Internship</h1>
          <p className="mt-4 text-lg">Where ambition meets opportunity</p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="bg-white py-8 shadow sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="relative">
            <input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border px-14 py-4 text-sm"
            />
            <span className="absolute left-5 top-4 text-gray-400">🔍</span>
          </div>
        </div>
      </div>

      {/* CARDS */}
      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 rounded-2xl">
        {filtered.map((intern) => (
          <motion.div key={intern.id} whileHover={{ y: -8 }} className="bg-white rounded-2xl border-none shadow">
            <div className="p-6 border-blue-50 shadow-xl bg-blue-50">
              <h3 className="font-bold">{intern.title}</h3>
              <p className="text-sm">{intern.company}</p>
            </div>
            <div className="p-6 space-y-2 text-sm">
              <p>📍 {intern.location}</p>
              <p>💼 {intern.type}</p>
            </div>
            <div className="p-6">
              <button
                onClick={() => setSelected(intern)}
                className="w-full rounded-full bg-blue-600 text-white py-3 select-none cursor-pointer hover:bg-blue-700 transition-colors"
              >
                Apply Now
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* RESPONSIVE MODAL */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50"
            onClick={() => setSelected(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl p-6 relative"
            >
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4">
                <X />
              </button>

              <h2 className="font-bold mb-4 text-lg">
                Apply for {selected.title}
              </h2>

              {["name","email","nationality","mobile"].map((f) => (
                <input
                  key={f}
                  placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                  className="border p-2 w-full mb-2 rounded"
                  value={(form as any)[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                />
              ))}

              <select
                className="border p-2 w-full mb-2 rounded"
                value={form.qualification}
                onChange={(e) => setForm({ ...form, qualification: e.target.value })}
              >
                <option>Select Qualification</option>
                {qualifications.map((q) => <option key={q}>{q}</option>)}
              </select>

              <label className="flex items-center gap-2 border p-2 rounded cursor-pointer mb-4">
                <Upload size={18} /> Upload Resume
                <input
                  type="file"
                  hidden
                  onChange={(e) => setForm({ ...form, resume: e.target.files?.[0] || null })}
                />
              </label>

              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 text-white py-3 rounded-full hover:bg-blue-700 transition-colors select-none cursor-pointer"
              >
                Submit Application
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
