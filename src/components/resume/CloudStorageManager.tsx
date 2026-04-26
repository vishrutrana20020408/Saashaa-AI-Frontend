"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Cloud,
  Upload,
  Download,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Clock,
  Shield,
  Plus,
  X,
  Save,
  RefreshCw,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

interface CloudFile {
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
  modifiedAt?: string;
  checksum?: string;
  version?: number;
  mimeType?: string;
}

interface CloudStorageManagerProps {
  onFileSelect?: (file: CloudFile) => void;
  onFileUpload?: (file: CloudFile) => void;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwtToken") ||
    localStorage.getItem("accessToken")
  );
}

function unwrapResponse<T>(json: any): T | null {
  if (!json) return null;
  return (
    json.data ??
    json.payload ??
    json.result ??
    json.parsed ??
    json
  );
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatDateTime(value?: string | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function CloudStorageManager({
  onFileSelect,
  onFileUpload,
}: CloudStorageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const token = useMemo(() => getStoredToken(), []);

  const [files, setFiles] = useState<CloudFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CloudFile | null>(null);
  const [editingFile, setEditingFile] = useState<CloudFile | null>(null);
  const [editingContent, setEditingContent] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  const commonHeaders = useMemo<HeadersInit>(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const fetchCloudFiles = useCallback(
    async (isRefresh = false) => {
      try {
        setErrorMessage(null);
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/user/resume/cloud/files`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...commonHeaders,
            },
            credentials: "include",
            cache: "no-store",
          }
        );

        const resultJson = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            resultJson?.message || `Failed to fetch files. Status: ${response.status}`
          );
        }

        const fileList = unwrapResponse<CloudFile[]>(resultJson) || [];
        setFiles(Array.isArray(fileList) ? fileList : []);
        setSuccessMessage(null);
      } catch (error: any) {
        console.error("Fetch cloud files error:", error);
        setErrorMessage(error?.message || "Unable to load cloud files.");
        setFiles([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [commonHeaders]
  );

  useEffect(() => {
    fetchCloudFiles();
  }, [fetchCloudFiles]);

  const uploadFileToCloud = async (file: File) => {
    if (!file) {
      setErrorMessage("No file selected.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size must be under 10 MB.");
      return;
    }

    try {
      setUploading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE_URL}/api/user/resume/cloud/upload`,
        {
          method: "POST",
          headers: {
            ...commonHeaders,
          },
          credentials: "include",
          body: formData,
        }
      );

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          resultJson?.message || `Upload failed. Status: ${response.status}`
        );
      }

      const uploadedFile = unwrapResponse<CloudFile>(resultJson);
      setSuccessMessage(
        resultJson?.message || "File uploaded to cloud storage successfully."
      );
      setShowUploadModal(false);
      await fetchCloudFiles(true);
      if (uploadedFile && onFileUpload) {
        onFileUpload(uploadedFile);
      }
    } catch (error: any) {
      console.error("Upload file error:", error);
      setErrorMessage(error?.message || "Failed to upload file to cloud.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const downloadFileFromCloud = async (fileId?: string, fileName?: string) => {
    if (!fileId) {
      setErrorMessage("File ID not found.");
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(
        `${API_BASE_URL}/api/user/resume/cloud/file/${fileId}/download`,
        {
          method: "GET",
          headers: {
            ...commonHeaders,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Download failed. Status: ${response.status}`
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = fileName || "resume.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
      setSuccessMessage("File downloaded successfully.");
    } catch (error: any) {
      console.error("Download file error:", error);
      setErrorMessage(error?.message || "Failed to download file.");
    }
  };

  const updateFileContent = async (fileId?: string, newContent?: string) => {
    if (!fileId || !newContent) {
      setErrorMessage("File ID or content is missing.");
      return;
    }

    try {
      setUpdating(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(
        `${API_BASE_URL}/api/user/resume/cloud/file/${fileId}/update-text`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...commonHeaders,
          },
          credentials: "include",
          body: JSON.stringify({
            textContent: newContent,
          }),
        }
      );

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          resultJson?.message || `Update failed. Status: ${response.status}`
        );
      }

      setSuccessMessage(
        resultJson?.message || "File content updated successfully."
      );
      setShowEditModal(false);
      setEditingFile(null);
      setEditingContent("");
      await fetchCloudFiles(true);
    } catch (error: any) {
      console.error("Update file error:", error);
      setErrorMessage(error?.message || "Failed to update file content.");
    } finally {
      setUpdating(false);
    }
  };

  const deleteFileFromCloud = async (fileId?: string) => {
    if (!fileId) {
      setErrorMessage("File ID not found.");
      return;
    }

    if (!confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(
        `${API_BASE_URL}/api/user/resume/cloud/file/${fileId}`,
        {
          method: "DELETE",
          headers: {
            ...commonHeaders,
          },
          credentials: "include",
        }
      );

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          resultJson?.message || `Delete failed. Status: ${response.status}`
        );
      }

      setSuccessMessage("File deleted successfully.");
      setSelectedFile(null);
      await fetchCloudFiles(true);
    } catch (error: any) {
      console.error("Delete file error:", error);
      setErrorMessage(error?.message || "Failed to delete file.");
    } finally {
      setDeleting(false);
    }
  };

  const verifyFileIntegrity = async (fileId?: string) => {
    if (!fileId) {
      setErrorMessage("File ID not found.");
      return;
    }

    try {
      setVerifying(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch(
        `${API_BASE_URL}/api/user/resume/cloud/file/${fileId}/verify`,
        {
          method: "GET",
          headers: {
            ...commonHeaders,
          },
          credentials: "include",
        }
      );

      const resultJson = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          resultJson?.message || `Verification failed. Status: ${response.status}`
        );
      }

      setSuccessMessage("File integrity verified successfully.");
    } catch (error: any) {
      console.error("Verify file error:", error);
      setErrorMessage(error?.message || "File integrity verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFileToCloud(e.target.files[0]);
    }
  };

  const startEditingFile = (file: CloudFile) => {
    setEditingFile(file);
    setEditingContent(""); // Will be set by user or fetched from file
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
          <CheckCircle2 size={18} className="mt-0.5 text-green-300" />
          <p className="text-sm text-green-100">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle size={18} className="mt-0.5 text-red-300" />
          <p className="text-sm text-red-100">{errorMessage}</p>
        </div>
      )}

      {/* Cloud Storage Header */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Cloud size={24} className="text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">Cloud Storage</h2>
              <p className="text-xs text-white/50 sm:text-sm">
                Encrypted file storage with read, edit, delete, and save operations
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setShowUploadModal(true)}
              disabled={uploading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Upload to Cloud
                </>
              )}
            </button>

            <button
              onClick={() => fetchCloudFiles(true)}
              disabled={refreshing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold transition hover:bg-white/15 disabled:opacity-50 sm:w-auto"
            >
              {refreshing ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} />
              )}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Files List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-12 shadow-xl backdrop-blur-xl">
          <Loader2 className="animate-spin" size={30} />
          <p className="text-sm text-white/55">Loading cloud files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center shadow-xl backdrop-blur-xl">
          <Cloud size={40} className="mx-auto mb-4 text-white/40" />
          <p className="text-sm text-white/55">No files in cloud storage yet.</p>
          <p className="mt-2 text-xs text-white/40">
            Upload a resume file to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <div
              key={file.fileId}
              onClick={() => {
                setSelectedFile(file);
                if (onFileSelect) {
                  onFileSelect(file);
                }
              }}
              className={`cursor-pointer rounded-2xl border transition p-4 ${
                selectedFile?.fileId === file.fileId
                  ? "border-blue-500/50 bg-blue-500/10"
                  : "border-white/10 bg-black/25 hover:border-white/20 hover:bg-black/35"
              }`}
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <FileText size={20} className="text-blue-300" />
                  <div className="flex-1">
                    <p className="font-semibold text-white/90 wrap-break-word">
                      {file.fileName || "Unnamed"}
                    </p>
                    <p className="text-xs text-white/50">
                      {formatBytes(file.fileSize)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4 space-y-1 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <Clock size={12} />
                  <span>{formatDateTime(file.uploadedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={12} />
                  <span>{file.checksum?.slice(0, 12)}...</span>
                </div>
                {file.version && (
                  <div className="text-white/50">v{file.version}</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFileFromCloud(file.fileId, file.fileName);
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/15"
                >
                  <Download size={14} />
                  Download
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditingFile(file);
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/15"
                >
                  <Edit3 size={14} />
                  Edit
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    verifyFileIntegrity(file.fileId);
                  }}
                  disabled={verifying}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/15 disabled:opacity-50"
                >
                  <Shield size={14} />
                  Verify
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFileFromCloud(file.fileId);
                  }}
                  disabled={deleting}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/30 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
          <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-white/10 bg-gray-900 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold sm:text-xl">
                Upload File to Cloud Storage
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-lg bg-white/10 p-2 transition hover:bg-white/15"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="rounded-2xl border-2 border-dashed border-white/15 bg-black/20 p-8 text-center transition hover:border-blue-500 hover:bg-blue-500/10"
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  uploadFileToCloud(e.dataTransfer.files[0]);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload size={32} className="mx-auto mb-3 text-blue-300" />
              <p className="font-semibold text-white/80">
                Drag & drop your file here
              </p>
              <p className="mt-1 text-xs text-white/50">
                or use the button below
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.doc,.docx"
                className="hidden"
                onChange={handleFileInputChange}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Select File
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-white/50">
              Files are encrypted with AES-256-GCM encryption and stored securely.
              Maximum file size: 10 MB.
            </p>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
          <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-white/10 bg-gray-900 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold sm:text-xl">
                Edit: {editingFile.fileName}
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingFile(null);
                  setEditingContent("");
                }}
                className="rounded-lg bg-white/10 p-2 transition hover:bg-white/15"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="h-64 w-full rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter file content here..."
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingFile(null);
                  setEditingContent("");
                }}
                className="w-full rounded-xl bg-gray-700 px-6 py-3 font-semibold transition hover:bg-gray-600 sm:w-auto"
              >
                Cancel
              </button>

              <button
                onClick={() => updateFileContent(editingFile.fileId, editingContent)}
                disabled={updating || !editingContent.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {updating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
