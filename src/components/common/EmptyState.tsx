"use client";

import Link from "next/link";
import { Inbox, RefreshCw, ArrowRight, LucideIcon } from "lucide-react";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * src/components/common/EmptyState.tsx
 *
 * Reusable backend-friendly empty state component.
 *
 * Latest project alignment:
 * - supports empty API responses
 * - works across user/admin/resume/interview modules
 * - supports action buttons for retry, create, upload, navigate
 * - consistent with current frontend design language
 *
 * Example:
 *
 * <EmptyState
 *   title="No resumes found"
 *   description="Upload your first resume to begin resume management."
 *   action={{
 *     label: "Upload Resume",
 *     href: "/user/resume/upload",
 *   }}
 *   secondaryAction={{
 *     label: "Refresh",
 *     onClick: fetchData,
 *     icon: RefreshCw,
 *     variant: "secondary",
 *   }}
 * />
 */

function buildButtonClass(variant: EmptyStateAction["variant"] = "primary") {
  if (variant === "secondary") {
    return "bg-white/10 hover:bg-white/15 text-white";
  }

  if (variant === "ghost") {
    return "bg-transparent hover:bg-white/10 text-white border border-white/10";
  }

  return "bg-linear-to-r from-blue-500 to-purple-600 hover:opacity-90 text-white";
}

function ActionButton({ action }: { action: EmptyStateAction }) {
  const Icon = action.icon ?? ArrowRight;
  const classes = `inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${buildButtonClass(
    action.variant
  )}`;

  if (action.href) {
    return (
      <Link
        href={action.disabled ? "#" : action.href}
        className={`${classes} ${action.disabled ? "pointer-events-none" : ""}`}
        aria-disabled={action.disabled}
      >
        <Icon size={18} />
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className={classes}
    >
      <Icon size={18} />
      {action.label}
    </button>
  );
}

export default function EmptyState({
  title = "Nothing here yet",
  description = "No data is available right now. Try refreshing or creating something new.",
  icon: Icon = Inbox,
  action,
  secondaryAction,
  children,
  className = "",
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/5 text-white shadow-xl ${compact ? "p-6" : "p-8 sm:p-10"} ${className}`}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-indigo-300 shadow-lg shadow-black/10">
          <Icon size={30} />
        </div>

        <h2 className={`${compact ? "text-xl" : "text-2xl sm:text-3xl"} font-bold tracking-tight`}>
          {title}
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
          {description}
        </p>

        {children ? <div className="mt-6 w-full">{children}</div> : null}

        {(action || secondaryAction) && (
          <div className="mt-7 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            {action ? <ActionButton action={action} /> : null}
            {secondaryAction ? <ActionButton action={secondaryAction} /> : null}
          </div>
        )}

        {!action && !secondaryAction && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/55">
            <RefreshCw size={14} />
            Waiting for backend data
          </div>
        )}
      </div>
    </div>
  );
}