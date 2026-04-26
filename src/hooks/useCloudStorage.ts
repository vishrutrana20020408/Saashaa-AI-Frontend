import { useCallback, useMemo, useState } from "react";

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

interface CloudStorageHookReturn {
  files: CloudFile[];
  loading: boolean;
  refreshing: boolean;
  uploading: boolean;
  updating: boolean;
  deleting: boolean;
  verifying: boolean;
  error: string | null;
  success: string | null;
  fetchCloudFiles: (isRefresh?: boolean) => Promise<void>;
  uploadFileToCloud: (file: File) => Promise<void>;
  downloadFileFromCloud: (fileId?: string, fileName?: string) => Promise<void>;
  updateFileContent: (fileId?: string, newContent?: string) => Promise<void>;
  deleteFileFromCloud: (fileId?: string) => Promise<void>;
  verifyFileIntegrity: (fileId?: string) => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
}

export function useCloudStorage(token: string | null): CloudStorageHookReturn {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const commonHeaders = useMemo<HeadersInit>(
    () => ({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }),
    [token]
  );

  const unwrapResponse = useCallback(<T,>(json: any): T | null => {
    if (!json) return null;
    return (
      json.data ??
      json.payload ??
      json.result ??
      json.parsed ??
      json
    );
  }, []);

  const fetchCloudFiles = useCallback(
    async (isRefresh = false) => {
      try {
        setError(null);
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
      } catch (err: any) {
        console.error("Fetch cloud files error:", err);
        setError(err?.message || "Unable to load cloud files.");
        setFiles([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [commonHeaders, unwrapResponse]
  );

  const uploadFileToCloud = useCallback(
    async (file: File) => {
      if (!file) {
        setError("No file selected.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be under 10 MB.");
        return;
      }

      try {
        setUploading(true);
        setError(null);
        setSuccess(null);

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

        setSuccess(
          resultJson?.message || "File uploaded to cloud storage successfully."
        );
        await fetchCloudFiles(true);
      } catch (err: any) {
        console.error("Upload file error:", err);
        setError(err?.message || "Failed to upload file to cloud.");
      } finally {
        setUploading(false);
      }
    },
    [commonHeaders, fetchCloudFiles]
  );

  const downloadFileFromCloud = useCallback(
    async (fileId?: string, fileName?: string) => {
      if (!fileId) {
        setError("File ID not found.");
        return;
      }

      try {
        setError(null);
        setSuccess(null);

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
        setSuccess("File downloaded successfully.");
      } catch (err: any) {
        console.error("Download file error:", err);
        setError(err?.message || "Failed to download file.");
      }
    },
    [commonHeaders]
  );

  const updateFileContent = useCallback(
    async (fileId?: string, newContent?: string) => {
      if (!fileId || !newContent) {
        setError("File ID or content is missing.");
        return;
      }

      try {
        setUpdating(true);
        setError(null);
        setSuccess(null);

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

        setSuccess(
          resultJson?.message || "File content updated successfully."
        );
        await fetchCloudFiles(true);
      } catch (err: any) {
        console.error("Update file error:", err);
        setError(err?.message || "Failed to update file content.");
      } finally {
        setUpdating(false);
      }
    },
    [commonHeaders, fetchCloudFiles]
  );

  const deleteFileFromCloud = useCallback(
    async (fileId?: string) => {
      if (!fileId) {
        setError("File ID not found.");
        return;
      }

      if (!confirm("Are you sure you want to delete this file? This action cannot be undone.")) {
        return;
      }

      try {
        setDeleting(true);
        setError(null);
        setSuccess(null);

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

        setSuccess("File deleted successfully.");
        await fetchCloudFiles(true);
      } catch (err: any) {
        console.error("Delete file error:", err);
        setError(err?.message || "Failed to delete file.");
      } finally {
        setDeleting(false);
      }
    },
    [commonHeaders, fetchCloudFiles]
  );

  const verifyFileIntegrity = useCallback(
    async (fileId?: string) => {
      if (!fileId) {
        setError("File ID not found.");
        return;
      }

      try {
        setVerifying(true);
        setError(null);
        setSuccess(null);

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

        setSuccess("File integrity verified successfully.");
      } catch (err: any) {
        console.error("Verify file error:", err);
        setError(err?.message || "File integrity verification failed.");
      } finally {
        setVerifying(false);
      }
    },
    [commonHeaders]
  );

  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccess(null), []);

  return {
    files,
    loading,
    refreshing,
    uploading,
    updating,
    deleting,
    verifying,
    error,
    success,
    fetchCloudFiles,
    uploadFileToCloud,
    downloadFileFromCloud,
    updateFileContent,
    deleteFileFromCloud,
    verifyFileIntegrity,
    clearError,
    clearSuccess,
  };
}
