"use client";

import React from "react";

/**
 * src/app/components/ResumeLoadingSkeleton.tsx
 *
 * Backend-aware loading skeleton for resume pages/components.
 *
 * Use cases:
 * - While fetching resume list from backend
 * - While loading current resume / version / preview / editor
 * - While waiting for ATS score / parsed content / metadata
 *
 * Examples:
 * <ResumeLoadingSkeleton />
 * <ResumeLoadingSkeleton variant="card" count={3} />
 * <ResumeLoadingSkeleton variant="editor" />
 * <ResumeLoadingSkeleton variant="detail" />
 */

type ResumeLoadingSkeletonProps = {
  variant?: "page" | "card" | "editor" | "detail" | "list";
  count?: number;
  className?: string;
  showHeader?: boolean;
};

function SkeletonBlock({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`animate-pulse rounded-xl bg-white/10 ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3 min-w-0 flex-1">
          <SkeletonBlock className="h-12 w-12 rounded-2xl" />
          <div className="flex-1 min-w-0 space-y-3">
            <SkeletonBlock className="h-6 w-48 max-w-full" />
            <SkeletonBlock className="h-4 w-72 max-w-full" />
            <SkeletonBlock className="h-4 w-40 max-w-full" />
          </div>
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-xl" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <SkeletonBlock className="h-7 w-24 rounded-full" />
        <SkeletonBlock className="h-7 w-20 rounded-full" />
        <SkeletonBlock className="h-7 w-28 rounded-full" />
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
      </div>

      <div className="mt-5 space-y-3">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-4/5" />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <SkeletonBlock className="h-11 w-24 rounded-xl" />
        <SkeletonBlock className="h-11 w-24 rounded-xl" />
        <SkeletonBlock className="h-11 w-28 rounded-xl" />
      </div>
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <SkeletonBlock className="h-11 w-11 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-7 w-56" />
            <SkeletonBlock className="h-4 w-96 max-w-full" />
            <div className="flex flex-wrap gap-2 pt-1">
              <SkeletonBlock className="h-7 w-24 rounded-full" />
              <SkeletonBlock className="h-7 w-20 rounded-full" />
              <SkeletonBlock className="h-7 w-24 rounded-full" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <SkeletonBlock className="h-11 w-28 rounded-xl" />
          <SkeletonBlock className="h-11 w-28 rounded-xl" />
          <SkeletonBlock className="h-11 w-32 rounded-xl" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
      </div>

      <SkeletonBlock className="mt-5 h-[420px] w-full rounded-2xl" />

      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <SkeletonBlock className="h-4 w-48" />
        <div className="flex flex-wrap gap-3">
          <SkeletonBlock className="h-11 w-24 rounded-xl" />
          <SkeletonBlock className="h-11 w-36 rounded-xl" />
          <SkeletonBlock className="h-11 w-36 rounded-xl" />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/5 bg-white/5 p-4 space-y-3">
        <SkeletonBlock className="h-5 w-40" />
        <SkeletonBlock className="h-16 w-full rounded-xl" />
        <SkeletonBlock className="h-16 w-full rounded-xl" />
        <SkeletonBlock className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-9 w-72 max-w-full" />
            <SkeletonBlock className="h-4 w-[32rem] max-w-full" />
          </div>

          <div className="flex flex-wrap gap-3">
            <SkeletonBlock className="h-11 w-28 rounded-xl" />
            <SkeletonBlock className="h-11 w-32 rounded-xl" />
            <SkeletonBlock className="h-11 w-32 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
            <SkeletonBlock className="h-6 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
            <SkeletonBlock className="h-6 w-44 mb-4" />
            <SkeletonBlock className="h-[320px] w-full rounded-2xl" />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
            <SkeletonBlock className="h-6 w-56 mb-4" />
            <SkeletonBlock className="h-[220px] w-full rounded-2xl" />
          </div>
        </div>

        <div className="xl:col-span-5 space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6 flex flex-col items-center gap-4">
            <SkeletonBlock className="h-6 w-32 self-start" />
            <SkeletonBlock className="h-44 w-44 rounded-full" />
            <SkeletonBlock className="h-11 w-full rounded-xl" />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
            <SkeletonBlock className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              <SkeletonBlock className="h-16 w-full rounded-xl" />
              <SkeletonBlock className="h-16 w-full rounded-xl" />
              <SkeletonBlock className="h-16 w-full rounded-xl" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
            <SkeletonBlock className="h-6 w-36 mb-4" />
            <div className="space-y-3">
              <SkeletonBlock className="h-11 w-full rounded-xl" />
              <SkeletonBlock className="h-11 w-full rounded-xl" />
              <SkeletonBlock className="h-11 w-full rounded-xl" />
              <SkeletonBlock className="h-11 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-3 flex-1">
            <SkeletonBlock className="h-9 w-72 max-w-full" />
            <SkeletonBlock className="h-4 w-[34rem] max-w-full" />
          </div>

          <div className="flex flex-wrap gap-3">
            <SkeletonBlock className="h-11 w-28 rounded-xl" />
            <SkeletonBlock className="h-11 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export default function ResumeLoadingSkeleton({
  variant = "page",
  count = 4,
  className = "",
  showHeader = true,
}: ResumeLoadingSkeletonProps) {
  return (
    <div className={`text-white ${className}`}>
      {showHeader && variant === "list" && (
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-start gap-3">
              <SkeletonBlock className="h-11 w-11 rounded-2xl" />
              <div className="space-y-3">
                <SkeletonBlock className="h-7 w-52" />
                <SkeletonBlock className="h-4 w-80 max-w-full" />
              </div>
            </div>

            <SkeletonBlock className="h-11 w-28 rounded-xl" />
          </div>

          <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
            <SkeletonBlock className="h-12 w-full rounded-xl" />
            <SkeletonBlock className="h-12 w-[180px] rounded-xl" />
          </div>
        </div>
      )}

      {variant === "card" && <CardSkeleton />}

      {variant === "editor" && <EditorSkeleton />}

      {variant === "detail" && <DetailSkeleton />}

      {variant === "page" && <PageSkeleton />}

      {variant === "list" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {Array.from({ length: count }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      )}
    </div>
  );
}