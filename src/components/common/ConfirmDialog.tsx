"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

export type ConfirmDialogVariant = "default" | "danger" | "warning" | "success";

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  disableClose?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * src/components/common/ConfirmDialog.tsx
 *
 * Reusable backend-friendly confirmation dialog.
 *
 * Latest project alignment:
 * - client component for App Router
 * - works with backend-triggered destructive/critical actions
 * - supports loading state during async API calls
 * - safe close handling
 * - keyboard accessible
 * - styled to match current Interview / Resume Management System UI
 *
 * Example usage:
 *
 * <ConfirmDialog
 *   open={showDeleteDialog}
 *   title="Delete resume version?"
 *   message="This action cannot be undone."
 *   variant="danger"
 *   loading={deleting}
 *   confirmText="Delete"
 *   cancelText="Cancel"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDeleteDialog(false)}
 * />
 */

function getVariantStyles(variant: ConfirmDialogVariant) {
  switch (variant) {
    case "danger":
      return {
        iconWrapper:
          "bg-red-500/15 text-red-300 border border-red-400/20",
        confirmButton:
          "bg-linear-to-r from-red-500 to-rose-600 hover:opacity-90",
        accentText: "text-red-200",
      };

    case "warning":
      return {
        iconWrapper:
          "bg-amber-500/15 text-amber-300 border border-amber-400/20",
        confirmButton:
          "bg-linear-to-r from-amber-500 to-orange-600 hover:opacity-90",
        accentText: "text-amber-200",
      };

    case "success":
      return {
        iconWrapper:
          "bg-emerald-500/15 text-emerald-300 border border-emerald-400/20",
        confirmButton:
          "bg-linear-to-r from-emerald-500 to-teal-600 hover:opacity-90",
        accentText: "text-emerald-200",
      };

    case "default":
    default:
      return {
        iconWrapper:
          "bg-indigo-500/15 text-indigo-300 border border-indigo-400/20",
        confirmButton:
          "bg-linear-to-r from-blue-500 to-purple-600 hover:opacity-90",
        accentText: "text-indigo-200",
      };
  }
}

export default function ConfirmDialog({
  open,
  title = "Please confirm",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  loading = false,
  disableClose = false,
  icon,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const styles = getVariantStyles(variant);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !disableClose && !loading) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, disableClose, loading, onCancel]);

  if (!open) return null;

  const handleBackdropClick = () => {
    if (disableClose || loading) return;
    onCancel();
  };

  const handleDialogClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const handleConfirmClick = () => {
    if (loading) return;
    onConfirm();
  };

  const handleCancelClick = () => {
    if (disableClose || loading) return;
    onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/50"
        onClick={handleDialogClick}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${styles.iconWrapper}`}
            >
              {icon ?? <AlertTriangle size={20} />}
            </div>

            <div className="min-w-0">
              <h2
                id="confirm-dialog-title"
                className="text-lg font-semibold tracking-tight text-white"
              >
                {title}
              </h2>
              <p className={`mt-1 text-xs ${styles.accentText}`}>
                Action confirmation
              </p>
            </div>
          </div>

          {!disableClose && (
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={loading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <p
            id="confirm-dialog-description"
            className="text-sm leading-6 text-white/75"
          >
            {message}
          </p>

          {children ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              {children}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 bg-white/5 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={handleCancelClick}
            disabled={loading || disableClose}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={loading}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${styles.confirmButton}`}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}