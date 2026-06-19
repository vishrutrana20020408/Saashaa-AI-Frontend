"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Mail,
  MessageSquare,
  Building2,
  Search,
  PanelLeft,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

/* ============================== TYPES ============================== */

type ItemType = "message" | "mail";

type FilterType =
  | "all"
  | "all-messages"
  | "all-mail"
  | "unread-messages"
  | "unread-mail"
  | "read-messages"
  | "read-mail"
  | "important-messages"
  | "important-mail";

interface InboxItem {
  id: number;
  type: ItemType;
  sender: string;
  subject: string;
  content: string;
  date: string;
  read: boolean;
  important: boolean;
}

interface CompanyData {
  id: number;
  name: string;
  description: string;
}

/* ============================== DATA ============================== */

const dummyInbox: InboxItem[] = [
  {
    id: 1,
    type: "message",
    sender: "John Doe",
    subject: "Interview Schedule",
    content: "Can we reschedule the interview to next Monday at 10 AM?",
    date: "Today",
    read: false,
    important: true,
  },
  {
    id: 2,
    type: "mail",
    sender: "hr@candidate.com",
    subject: "Resume Submission",
    content:
      "Please find attached resume. Let me know if any additional documents are required.",
    date: "Yesterday",
    read: true,
    important: false,
  },
  {
    id: 3,
    type: "message",
    sender: "Sarah Lee",
    subject: "Follow-up",
    content:
      "Waiting for your response regarding the project update shared earlier.",
    date: "2 days ago",
    read: true,
    important: true,
  },
];

const noticePeriods: Record<string, string> = {
  "TechNova Solutions": "60 Days",
  "InnoSoft Pvt Ltd": "30 Days",
  "NextGen Systems": "45 Days",
  CloudMatrix: "90 Days",
};

/* ============================== COMPONENT ============================== */

export default function CompanyInboxPage() {
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [items] = useState<InboxItem[]>(dummyInbox);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [previewWidth, setPreviewWidth] = useState(400);

  const sidebarResizing = useRef(false);
  const previewResizing = useRef(false);

  const itemsPerPage = 5;

  /* ---------------- LOAD COMPANY ---------------- */

  useEffect(() => {
    const storedCompany = localStorage.getItem("joinedCompany");
    if (storedCompany) {
      setCompany(JSON.parse(storedCompany));
    }
  }, []);

  /* ---------------- FILTER LOGIC ---------------- */

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        switch (activeFilter) {
          case "all":
            return true;
          case "all-messages":
            return item.type === "message";
          case "all-mail":
            return item.type === "mail";
          case "unread-messages":
            return item.type === "message" && !item.read;
          case "unread-mail":
            return item.type === "mail" && !item.read;
          case "read-messages":
            return item.type === "message" && item.read;
          case "read-mail":
            return item.type === "mail" && item.read;
          case "important-messages":
            return item.type === "message" && item.important;
          case "important-mail":
            return item.type === "mail" && item.important;
          default:
            return true;
        }
      })
      .filter(
        (item) =>
          item.sender.toLowerCase().includes(search.toLowerCase()) ||
          item.subject.toLowerCase().includes(search.toLowerCase())
      );
  }, [items, activeFilter, search]);

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ---------------- RESIZE HANDLERS ---------------- */

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (sidebarResizing.current) {
        const newWidth = e.clientX;
        if (newWidth >= 200 && newWidth <= 400) {
          setSidebarWidth(newWidth);
        }
      }

      if (previewResizing.current) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 300 && newWidth <= 800) {
          setPreviewWidth(newWidth);
        }
      }
    };

    const stopResizing = () => {
      sidebarResizing.current = false;
      previewResizing.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, []);

  /* ---------------- LEAVE COMPANY ---------------- */

  const handleLeaveCompany = () => {
    if (!company) return;
    const notice = noticePeriods[company.name] || "30 Days";
    setNoticeMessage(`Your notice period has started. Duration: ${notice}`);
    localStorage.removeItem("joinedCompany");
    setCompany(null);
  };

  /* ============================== UI ============================== */

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="w-full px-10 py-8 text-white shadow-lg bg-linear-to-r from-blue-700 via-indigo-600 to-purple-700 mt-15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-xl backdrop-blur-md">
              <Building2 size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {company?.name || "No Company Joined"}
              </h1>
              <p className="text-blue-100 text-sm">
                Company Communication Center
              </p>
            </div>
          </div>

          {company && (
            <button
              onClick={handleLeaveCompany}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              Leave Company
            </button>
          )}
        </div>
      </header>

      {noticeMessage && (
        <div className="bg-yellow-100 text-yellow-800 text-center py-3 font-medium">
          {noticeMessage}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* SIDEBAR */}
        <div
          style={{ width: sidebarOpen ? sidebarWidth : 0 }}
          className="bg-white border-r shadow-md overflow-hidden transition-all duration-500 ease-in-out relative"
        >
          {sidebarOpen && (
            <>
              <div className="p-5">
                <h2 className="text-xl font-semibold mb-6 text-gray-800">
                  Filters
                </h2>

                <div className="space-y-3 text-sm">
                  {[
                    { label: "All", value: "all" },
                    { label: "All Messages", value: "all-messages" },
                    { label: "All Mail", value: "all-mail" },
                    { label: "Unread Messages", value: "unread-messages" },
                    { label: "Unread Mail", value: "unread-mail" },
                    { label: "Read Messages", value: "read-messages" },
                    { label: "Read Mail", value: "read-mail" },
                    { label: "Important Messages", value: "important-messages" },
                    { label: "Important Mail", value: "important-mail" },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => {
                        setActiveFilter(filter.value as FilterType);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${
                        activeFilter === filter.value
                          ? "bg-blue-600 text-white shadow"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Resize Handle */}
              <div
                onMouseDown={() => (sidebarResizing.current = true)}
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-gray-300 hover:bg-blue-500"
              />
            </>
          )}
        </div>

        {/* SIDEBAR TOGGLE BUTTON ATTACHED */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-6 left-0 translate-x-[-50%] bg-white shadow-md border rounded-full p-2 hover:bg-gray-100 transition z-20"
          style={{ left: sidebarOpen ? sidebarWidth : 0 }}
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        {/* MAIN */}
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 p-8 space-y-6 overflow-y-auto">
            <div className="relative w-full max-w-md">
              <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by sender or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-white rounded-xl shadow border">
              {paginatedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`cursor-pointer flex justify-between items-center p-5 border-b hover:bg-gray-50 transition ${
                    !item.read ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex gap-4">
                    {item.type === "mail" ? (
                      <Mail size={20} className="text-blue-600" />
                    ) : (
                      <MessageSquare size={20} className="text-green-600" />
                    )}
                    <div>
                      <p className="font-medium">{item.sender}</p>
                      <p className="text-sm text-gray-600">{item.subject}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>

          {/* PREVIEW RESIZER */}
          {selectedItem && (
            <div
              onMouseDown={() => (previewResizing.current = true)}
              className="w-1 cursor-col-resize bg-gray-300 hover:bg-blue-500"
            />
          )}

          {/* PREVIEW PANEL */}
          {selectedItem && (
            <div
              style={{ width: previewWidth }}
              className="bg-white border-l shadow-xl p-6 overflow-y-auto relative transition-all duration-500"
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 p-1 rounded hover:bg-gray-200"
              >
                <X size={18} />
              </button>

              <h2 className="text-xl font-bold mb-2">
                {selectedItem.subject}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                From: {selectedItem.sender}
              </p>
              <p className="text-gray-700 leading-relaxed">
                {selectedItem.content}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}