"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Globe2,
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  ArrowLeft,
  Loader2,
  X,
  Search
} from "lucide-react";
import Link from "next/link";

const HR_TYPES = [
  "HR Generalist",
  "HR Specialist",
  "HR Manager",
  "HR Director",
  "Chief People Officer (CPO)",
  "HR Business Partner (HRBP)",
  "Talent Acquisition Specialist / Recruiter",
  "Compensation and Benefits Manager",
  "Learning and Development (L&D) Manager",
  "Employee Relations Manager",
  "Payroll Specialist",
  "HRIS Analyst (Human Resources Information Systems)",
  "DEI Officer (Diversity, Equity, and Inclusion)",
  "Talent Management Specialist",
  "HR Compliance Officer",
  "Health and Safety Coordinator",
  "People Data Analyst",
  "HR Digital Transformation Manager",
  "Onboarding Coordinator",
  "Employer Branding Specialist",
  "Others"
];

const SUGGESTED_SKILLS = [
  "Recruitment",
  "Employee Engagement",
  "Performance Management",
  "HR Strategy",
  "Talent Acquisition",
  "Employee Relations",
  "Payroll Processing",
  "Training & Development",
  "HRIS",
  "Labor Laws",
  "Conflict Resolution",
  "Onboarding",
  "Compensation & Benefits",
  "Workforce Planning",
  "Organizational Development",
  "Public Speaking",
  "Data Analysis",
  "Project Management",
  "Interpersonal Skills",
  "Leadership"
];

const WORKING_TYPES = ["Work from home", "Work From office", "Hybrid"];

export default function CreateJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [companyType, setCompanyType] = useState<string>("");
  const [geoMessage, setGeoMessage] = useState<string>("");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const [skillInput, setSkillInput] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const [formData, setFormData] = useState({
    post: "HR",
    hrType: "",
    otherHrType: "",
    workingType: "Work From office",
    officeLocation: "",
    startDateType: "IMMEDIATE",
    specificStartDate: "",
    salaryMin: "",
    salaryMax: "",
    salaryPeriod: "month",
    lastDateToApply: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: "",
    skillsRequired: "",
    whoCanApply: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const loadCompanyProfile = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`${backendUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) return;
      const payload = await response.json();
      const companyInfo = payload?.data ?? payload?.payload ?? payload?.result ?? payload;
      if (companyInfo?.companyType) {
        setCompanyType(companyInfo.companyType);
      }
    } catch {
      // ignore and leave companyType empty
    }
  };

  const detectCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator?.geolocation) {
      setGeoMessage("Geolocation is not supported by this browser.");
      return;
    }

    setIsDetectingLocation(true);
    setGeoMessage("Detecting current location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setGeoMessage("Detecting address details...");

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const json = await response.json();
          const address = json.address ?? {};
          const city = address.city || address.town || address.village || address.hamlet || address.county || "";
          const region = address.state || address.region || "";
          const country = address.country || "";
          const locationString = [city, region, country].filter(Boolean).join(", ");

          setFormData((prev) => ({
            ...prev,
            officeLocation: locationString || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          }));
          setGeoMessage(locationString ? "Location detected." : "Unable to resolve city/state/country.");
        } catch {
          setGeoMessage("Unable to resolve current location details.");
          setFormData((prev) => ({
            ...prev,
            officeLocation: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          }));
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        setGeoMessage("Unable to detect location. Please allow location access.");
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const addSkill = (skill: string) => {
    const trimmedSkill = skill.trim();
    if (trimmedSkill && !selectedSkills.includes(trimmedSkill)) {
      const newSkills = [...selectedSkills, trimmedSkill];
      setSelectedSkills(newSkills);
      setFormData(prev => ({ ...prev, skillsRequired: newSkills.join(", ") }));
    }
    setSkillInput("");
  };

  const removeSkill = (skillToRemove: string) => {
    const newSkills = selectedSkills.filter(s => s !== skillToRemove);
    setSelectedSkills(newSkills);
    setFormData(prev => ({ ...prev, skillsRequired: newSkills.join(", ") }));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  const filteredSuggestions = SUGGESTED_SKILLS.filter(
    skill => !selectedSkills.includes(skill)
  );

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
      const token = localStorage.getItem("accessToken");

      const payload = {
        ...formData,
        specificStartDate: formData.specificStartDate || null,
      };

      const salaryMin = formData.salaryMin.trim();
      const salaryMax = formData.salaryMax.trim();
      const salaryPeriod = formData.salaryPeriod.trim() || "month";

      if (!salaryMin) {
        throw new Error("Minimum salary is required.");
      }

      if (!salaryMax) {
        throw new Error("Maximum salary is required.");
      }

      if (Number(salaryMin) > Number(salaryMax)) {
        throw new Error("Maximum salary must be greater than or equal to minimum salary.");
      }

      const salaryText = `₹${Number(salaryMin).toLocaleString("en-IN")} - ₹${Number(salaryMax).toLocaleString("en-IN")} / ${salaryPeriod}`;

      const requestBody = {
        post: formData.post,
        hrType: formData.hrType,
        otherHrType: formData.otherHrType,
        workingType: formData.workingType,
        officeLocation: formData.officeLocation,
        startDateType: formData.startDateType,
        specificStartDate: formData.specificStartDate || null,
        salary: salaryText,
        lastDateToApply: formData.lastDateToApply,
        description: formData.description,
        skillsRequired: formData.skillsRequired,
        whoCanApply: formData.whoCanApply,
      };

      const response = await fetch(`${backendUrl}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to post job");
      }

      setSuccess("Job posted successfully!");
      setTimeout(() => router.push("/company/jobs"), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <Link 
          href="/company/jobs" 
          className="mb-6 flex w-fit items-center gap-2 text-slate-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100"
        >
          <div className="mb-8 border-b border-slate-100 pb-6">
            <h1 className="text-3xl font-bold text-slate-900">Post a New Job</h1>
            <p className="mt-2 text-slate-500">Hire top HR talent for your company</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Post - Read Only/Default */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Post</label>
                <input 
                  type="text" 
                  value="HR" 
                  readOnly 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 outline-none"
                />
              </div>

              {/* Company Type */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Company Type</label>
                <input 
                  type="text" 
                  value={companyType || "Loading company type..."} 
                  readOnly 
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 outline-none"
                />
              </div>

              {/* HR Type */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">HR Type</label>
                <select 
                  name="hrType"
                  value={formData.hrType}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                >
                  <option value="">Select HR Type</option>
                  {HR_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Other HR Type */}
              {formData.hrType === "Others" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="md:col-span-2"
                >
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Specify HR Type</label>
                  <input 
                    type="text" 
                    name="otherHrType"
                    value={formData.otherHrType}
                    onChange={handleChange}
                    required
                    placeholder="Enter HR role title"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                  />
                </motion.div>
              )}

              {/* Working Type */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Type of working</label>
                <select 
                  name="workingType"
                  value={formData.workingType}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                >
                  {WORKING_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Office Location */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Office Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    name="officeLocation"
                    value={formData.officeLocation}
                    onChange={handleChange}
                    placeholder="City, State"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={detectCurrentLocation}
                  disabled={isDetectingLocation}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Globe2 className="h-4 w-4" />
                  {isDetectingLocation ? "Detecting location…" : "Use current location"}
                </button>
                {geoMessage ? (
                  <p className="mt-2 text-sm text-slate-500">{geoMessage}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Allow location access to prefill office location.</p>
                )}
              </div>

              {/* Start Date */}
              <div className="md:col-span-2 space-y-4">
                <label className="block text-sm font-semibold text-slate-700">Starting Date</label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input 
                      type="radio" 
                      name="startDateType" 
                      value="IMMEDIATE"
                      checked={formData.startDateType === "IMMEDIATE"}
                      onChange={() => setFormData(prev => ({ ...prev, startDateType: "IMMEDIATE", specificStartDate: "" }))}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700">Immediate</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input 
                      type="radio" 
                      name="startDateType" 
                      value="SPECIFIC_DATE"
                      checked={formData.startDateType === "SPECIFIC_DATE"}
                      onChange={() => setFormData(prev => ({ ...prev, startDateType: "SPECIFIC_DATE" }))}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700">Join by</span>
                  </label>
                </div>
                
                {formData.startDateType === "SPECIFIC_DATE" && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <input 
                      type="date" 
                      name="specificStartDate"
                      value={formData.specificStartDate}
                      onChange={handleChange}
                      required
                      className="max-w-xs w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                    />
                  </motion.div>
                )}
              </div>

              {/* Salary range */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Salary range (INR)</label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <input
                      type="number"
                      name="salaryMin"
                      min="0"
                      value={formData.salaryMin}
                      onChange={handleChange}
                      required
                      placeholder="Min"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      name="salaryMax"
                      min="0"
                      value={formData.salaryMax}
                      onChange={handleChange}
                      required
                      placeholder="Max"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                    />
                  </div>
                  <div>
                    <select
                      name="salaryPeriod"
                      value={formData.salaryPeriod}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                    >
                      <option value="month">/month</option>
                      <option value="year">/year</option>
                      <option value="day">/day</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Last Date to Apply */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Last date to apply</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="date" 
                    name="lastDateToApply"
                    value={formData.lastDateToApply}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                  />
                </div>
              </div>
            </div>

            {/* Detailed Sections */}
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">About the Job</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Describe the responsibilities and expectations..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition resize-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Skills Required*</label>
                
                {/* Selected Skills Tags */}
                {selectedSkills.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedSkills.map(skill => (
                      <span 
                        key={skill}
                        className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-100"
                      >
                        {skill}
                        <button 
                          type="button" 
                          onClick={() => removeSkill(skill)}
                          className="hover:text-indigo-800"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Skill Search Input */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleSkillKeyDown}
                    placeholder="Skill (ex: Recruitment)"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                  />
                </div>

                {/* Suggestions Box */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-2xl bg-slate-50 p-5 border border-slate-100 relative"
                  >
                    <button 
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    
                    <p className="mb-4 text-sm font-medium text-slate-600">Suggested based on typical HR roles</p>
                    <div className="flex flex-wrap gap-2">
                      {filteredSuggestions.map(skill => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => addSkill(skill)}
                          className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          {skill}
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Who can apply</label>
                <textarea 
                  name="whoCanApply"
                  value={formData.whoCanApply}
                  onChange={handleChange}
                  required
                  rows={3}
                  placeholder="e.g. Freshers with MBA HR, Candidates with 2+ years experience..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition resize-none"
                />
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-indigo-200"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Posting Job...
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  Submit Job Posting
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
