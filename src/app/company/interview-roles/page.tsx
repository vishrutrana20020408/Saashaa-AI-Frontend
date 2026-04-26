"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "companyInterviewRoles";

const ALLOWED_HR_INTERVIEW_ROLES = [
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
];

function loadSavedRoles(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((role) => typeof role === "string");
    }
  } catch {
    return [];
  }
  return [];
}

function saveRoles(roles: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
}

export default function CompanyInterviewRolesPage() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelectedRoles(loadSavedRoles());
  }, []);

  const selectedSet = useMemo(
    () => new Set(selectedRoles.map((role) => role.toLowerCase())),
    [selectedRoles]
  );

  const handleToggleRole = (role: string) => {
    setSaved(false);
    setSelectedRoles((current) =>
      current.some((item) => item.toLowerCase() === role.toLowerCase())
        ? current.filter((item) => item.toLowerCase() !== role.toLowerCase())
        : [...current, role]
    );
  };

  const handleSave = () => {
    saveRoles(selectedRoles);
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/company"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Company Dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-slate-900">
              Interview Roles Management
            </h1>
            <p className="mt-2 max-w-2xl text-slate-500">
              Manage the HR interview roles that are allowed for your company interview flows.
              These are the approved positions for interview sessions within the admin interview module.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500">Selected roles</p>
              <p className="text-xl font-semibold text-slate-900">{selectedRoles.length}</p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Save Selected Roles
            </button>
          </div>
        </div>

        {saved && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Interview roles saved successfully to browser storage.
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Approved HR Interview Roles
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Toggle the roles you want to include in your interview workflow.
              </p>
            </div>
            <div className="text-sm text-slate-500">
              {selectedRoles.length} selected of {ALLOWED_HR_INTERVIEW_ROLES.length}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ALLOWED_HR_INTERVIEW_ROLES.map((role) => {
              const active = selectedSet.has(role.toLowerCase());
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleToggleRole(role)}
                  className={`text-left rounded-2xl border p-4 transition hover:border-indigo-300 hover:bg-indigo-50 ${
                    active
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-900">{role}</span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {active ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Page Notes</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            These are the only interview roles allowed for the HR interview flow in the admin interview module.
            The selected roles are stored locally in the browser and can be used to manage or preview your allowed interview roles.
          </p>
        </div>
      </div>
    </div>
  );
}
