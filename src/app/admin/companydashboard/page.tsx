"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search } from "lucide-react";

/* ================= TYPES ================= */

interface Company {
  id: number;
  name: string;
  description: string;
  logo: string;
  industry: string;
}

interface ResumeMeta {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

/* ================= DATA ================= */

const companies: Company[] = [
  {
    id: 1,
    name: "TechNova Solutions",
    description: "AI-driven enterprise automation and cloud solutions.",
    logo: "/logos/technova.png",
    industry: "AI",
  },
  {
    id: 2,
    name: "InnoSoft Pvt Ltd",
    description: "Scalable SaaS products for startups and enterprises.",
    logo: "/logos/innosoft.png",
    industry: "SaaS",
  },
  {
    id: 3,
    name: "NextGen Systems",
    description: "AI-powered recruitment and HR tech platforms.",
    logo: "/logos/nextgen.png",
    industry: "HR Tech",
  },
  {
    id: 4,
    name: "CloudMatrix",
    description: "Secure cloud infrastructure and DevOps automation.",
    logo: "/logos/cloudmatrix.png",
    industry: "Cloud",
  },
];

export default function CompanyDashboardPage() {
  const router = useRouter();

  const [selectedCompany, setSelectedCompany] =
    useState<Company | null>(null);

  const [status, setStatus] =
    useState<"idle" | "pending" | "accepted">("idle");

  const [resumeFile, setResumeFile] =
    useState<File | null>(null);

  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] =
    useState("All");

  const [checkedJoinStatus, setCheckedJoinStatus] =
    useState(false);

  /* ================= AUTO REDIRECT ================= */

  useEffect(() => {
    const storedCompany = localStorage.getItem("joinedCompany");

    if (storedCompany) {
      router.replace("/admin/company");
    } else {
      setCheckedJoinStatus(true);
    }
  }, [router]);

  /* ================= FILTER ================= */

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch =
        company.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        company.description
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesIndustry =
        industryFilter === "All" ||
        company.industry === industryFilter;

      return matchesSearch && matchesIndustry;
    });
  }, [search, industryFilter]);

  if (!checkedJoinStatus) return null;

  /* ================= JOIN LOGIC ================= */

  const handleSendResume = () => {
    if (!resumeFile || !selectedCompany) {
      alert("Please upload your resume.");
      return;
    }

    setStatus("pending");

    setTimeout(() => {
      setStatus("accepted");

      /* Save joined company */
      localStorage.setItem(
        "joinedCompany",
        JSON.stringify(selectedCompany)
      );

      /* Save resume metadata */
      const resumeMeta: ResumeMeta = {
        fileName: resumeFile.name,
        fileSize: resumeFile.size,
        fileType: resumeFile.type,
        uploadedAt: new Date().toISOString(),
      };

      localStorage.setItem(
        "resumeMeta",
        JSON.stringify(resumeMeta)
      );

      setTimeout(() => {
        router.replace("/admin/company");
      }, 1200);
    }, 2000);
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-600 via-purple-600 to-pink-500 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-6 text-center">
          Available Companies
        </h1>

        {/* Search + Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-3 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full pl-10 pr-4 py-2 rounded-lg"
            />
          </div>

          <select
            value={industryFilter}
            onChange={(e) =>
              setIndustryFilter(e.target.value)
            }
            className="px-4 py-2 rounded-lg"
          >
            <option value="All">All Industries</option>
            <option value="AI">AI</option>
            <option value="SaaS">SaaS</option>
            <option value="HR Tech">HR Tech</option>
            <option value="Cloud">Cloud</option>
          </select>
        </div>

        {/* Company Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCompanies.map((company) => (
            <motion.div
              key={company.id}
              whileHover={{ scale: 1.05 }}
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl text-white flex flex-col items-center text-center"
            >
              <Image
                src={company.logo}
                alt={company.name}
                width={80}
                height={80}
                className="mb-4 rounded-xl"
              />

              <h2 className="text-xl font-semibold mb-2">
                {company.name}
              </h2>

              <p className="text-sm opacity-80 mb-4">
                {company.description}
              </p>

              <button
                onClick={() => {
                  setSelectedCompany(company);
                  setStatus("idle");
                }}
                className="mt-auto px-6 py-2 rounded-xl font-semibold bg-white text-indigo-600 hover:bg-indigo-100"
              >
                Join Company
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedCompany && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-white p-8 rounded-3xl max-w-md w-full"
            >
              <h2 className="text-xl font-bold mb-4">
                {selectedCompany.name}
              </h2>

              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) =>
                  setResumeFile(
                    e.target.files
                      ? e.target.files[0]
                      : null
                  )
                }
                className="mb-4"
              />

              {status === "idle" && (
                <button
                  onClick={handleSendResume}
                  className="w-full py-2 bg-indigo-600 text-white rounded-xl"
                >
                  Submit Resume
                </button>
              )}

              {status === "pending" && (
                <p className="text-yellow-600">
                  Reviewing resume...
                </p>
              )}

              {status === "accepted" && (
                <p className="text-green-600">
                  Accepted! Redirecting...
                </p>
              )}

              <button
                onClick={() =>
                  setSelectedCompany(null)
                }
                className="mt-4 text-sm text-gray-500"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}