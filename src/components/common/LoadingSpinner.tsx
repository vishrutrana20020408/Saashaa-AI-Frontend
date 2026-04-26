"use client";

import { Loader2, LucideIcon } from "lucide-react";

export interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  text?: string;
  subtext?: string;
  fullScreen?: boolean;
  inline?: boolean;
  overlay?: boolean;
  icon?: LucideIcon;
  label?: string;
  variant?: "default" | "light" | "dark" | "brand";
}

/**
 * src/components/common/LoadingSpinner.tsx
 *
 * Reusable backend-friendly loading spinner component.
 *
 * Latest project alignment:
 * - works for backend API fetch states
 * - supports full-screen, inline, and overlay loading modes
 * - usable across auth, onboarding, resume, admin, and interview flows
 * - consistent with current frontend styling
 *
 * Example usage:
 *
 * <LoadingSpinner text="Loading resume..." subtext="Fetching current resume from backend." />
 *
 * <LoadingSpinner fullScreen text="Checking your session..." />
 *
 * <LoadingSpinner inline size={18} text="Saving..." />
 */

function getVariantClasses(variant: LoadingSpinnerProps["variant"]) {
  switch (variant) {
    case "light":
      return {
        wrapper: "text-white",
        subtext: "text-white/65",
        icon: "text-white",
        card: "bg-white/5 border-white/10",
      };

    case "dark":
      return {
        wrapper: "text-slate-900",
        subtext: "text-slate-500",
        icon: "text-slate-700",
        card: "bg-white border-slate-200",
      };

    case "brand":
      return {
        wrapper: "text-white",
        subtext: "text-white/70",
        icon: "text-indigo-300",
        card: "bg-linear-to-br from-slate-900 to-slate-950 border-white/10",
      };

    case "default":
    default:
      return {
        wrapper: "text-white",
        subtext: "text-white/60",
        icon: "text-indigo-300",
        card: "bg-white/5 border-white/10",
      };
  }
}

export default function LoadingSpinner({
  size = 28,
  className = "",
  text = "Loading...",
  subtext,
  fullScreen = false,
  inline = false,
  overlay = false,
  icon: Icon = Loader2,
  label,
  variant = "default",
}: LoadingSpinnerProps) {
  const styles = getVariantClasses(variant);

  if (inline) {
    return (
      <div
        className={`inline-flex items-center gap-2 ${styles.wrapper} ${className}`}
        role="status"
        aria-live="polite"
        aria-label={label || text}
      >
        <Icon size={size} className={`animate-spin ${styles.icon}`} />
        {text ? <span className="text-sm font-medium">{text}</span> : null}
      </div>
    );
  }

  const content = (
    <div
      className={`w-full max-w-md rounded-3xl border p-8 text-center shadow-2xl ${styles.card} ${styles.wrapper} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label || text}
    >
      <div className="mx-auto mb-4 flex justify-center">
        <Icon size={size} className={`animate-spin ${styles.icon}`} />
      </div>

      {text ? (
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{text}</h2>
      ) : null}

      {subtext ? (
        <p className={`mt-2 text-sm leading-6 ${styles.subtext}`}>{subtext}</p>
      ) : null}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-6">
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return <div className="flex w-full items-center justify-center px-4 py-10">{content}</div>;
}