"use client";

import { useEffect, useState } from "react";
import { 
  Building2, 
  Users, 
  Briefcase, 
  TrendingUp, 
  Clock, 
  Calendar,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

function StatsCard({ title, value, icon, trend, trendUp }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

export default function CompanyDashboard() {
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    setCompanyName(localStorage.getItem("userName") || "Your Company");
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome back, <span className="text-indigo-600">{companyName}</span>
        </h1>
        <p className="text-slate-500 mt-2">
          Here's what's happening with your recruitment process today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Active Jobs" 
          value="12" 
          icon={<Briefcase className="h-5 w-5" />}
          trend="+2 this week"
          trendUp={true}
        />
        <StatsCard 
          title="Total Candidates" 
          value="1,284" 
          icon={<Users className="h-5 w-5" />}
          trend="+12% from last month"
          trendUp={true}
        />
        <StatsCard 
          title="Interviews Scheduled" 
          value="48" 
          icon={<Calendar className="h-5 w-5" />}
          trend="8 today"
          trendUp={true}
        />
        <StatsCard 
          title="Hire Rate" 
          value="64%" 
          icon={<TrendingUp className="h-5 w-5" />}
          trend="-2% from last month"
          trendUp={false}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Applications */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent Applications</h2>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</button>
          </div>
          <div className="divide-y divide-slate-50">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                    JD
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">John Doe</h4>
                    <p className="text-xs text-slate-500">Senior React Developer • 2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                    Pending Review
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Action Items</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex gap-4">
              <div className="mt-1 rounded-full bg-amber-50 p-2 text-amber-600 shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Review 5 new applications</h4>
                <p className="text-xs text-slate-500 mt-1">For "Frontend Architect" position</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 rounded-full bg-indigo-50 p-2 text-indigo-600 shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Schedule follow-up</h4>
                <p className="text-xs text-slate-500 mt-1">With Sarah Smith (Backend Dev)</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1 rounded-full bg-emerald-50 p-2 text-emerald-600 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Job posting approved</h4>
                <p className="text-xs text-slate-500 mt-1">"DevOps Engineer" is now live</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Go to Tasks</button>
          </div>
        </div>
      </div>
    </div>
  );
}
