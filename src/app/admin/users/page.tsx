"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  MoreVertical,
  Verified
} from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  verified: boolean;
  profileCreated: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.payload || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading Users...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="text-indigo-600" />
            User Management
          </h1>
          <p className="text-slate-500 mt-1">Manage and verify platform users.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search users..." 
            className="pl-10 pr-4 py-2 border rounded-xl w-full focus:ring-2 focus:ring-indigo-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Verification</th>
                <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                        {user.name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 flex items-center gap-1.5">
                          {user.name || "Anonymous"}
                          {user.verified && <Verified className="text-emerald-500" size={16} />}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold uppercase text-slate-600">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.profileCreated ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <CheckCircle2 size={14} /> Profile Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                        <XCircle size={14} /> Setup Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.verified ? (
                      <div className="flex items-center gap-1 text-emerald-600">
                        <Verified size={14} />
                        <span className="text-xs font-bold">Verified</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">Not Verified</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden">
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-slate-50/50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                      {user.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 flex items-center gap-1.5">
                        {user.name || "Anonymous"}
                        {user.verified && <Verified className="text-emerald-500" size={14} />}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                    <MoreVertical size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold uppercase text-slate-600">
                    {user.role}
                  </span>
                  {user.profileCreated ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                      <CheckCircle2 size={12} /> Profile Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                      <XCircle size={12} /> Setup Pending
                    </span>
                  )}
                </div>
                <div>
                  {user.verified ? (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Verified size={12} />
                      <span className="text-xs font-bold">Verified</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">Not Verified</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-8 md:p-20 text-center text-slate-400">
            No users found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
