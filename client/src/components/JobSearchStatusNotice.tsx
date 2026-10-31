import React from "react";
import { AlertTriangle, PlugZap } from "lucide-react";

export type LocalJobSearchStatus = "ok" | "cached" | "not-configured" | "quota-exhausted" | "error";

/** User-facing message for each job-search problem; null when there is nothing to report. */
export function jobSearchStatusMessage(status: LocalJobSearchStatus | undefined): { title: string; body: string } | null {
  switch (status) {
    case "not-configured":
      return {
        title: "Job search is not connected",
        body: "Please connect a job search API key (JSearch or SerpApi) to see live jobs. Add JSEARCH_API_KEY or SERPAPI_API_KEY to the server's .env file and restart it.",
      };
    case "quota-exhausted":
      return {
        title: "Monthly job search limit reached",
        body: "The free job-search limit for this month has been used up. New searches will work again next month, or when a higher plan or another API key is added. Any jobs below are from earlier searches.",
      };
    case "error":
      return {
        title: "Job search is temporarily unavailable",
        body: "We couldn't reach the job search service. Please try again in a few minutes.",
      };
    default:
      return null;
  }
}

export function JobSearchStatusNotice({ status, className = "" }: { status: LocalJobSearchStatus | undefined; className?: string }) {
  const message = jobSearchStatusMessage(status);
  if (!message) return null;
  const Icon = status === "not-configured" ? PlugZap : AlertTriangle;

  return (
    <div
      role="alert"
      data-testid="job-search-status"
      className={`flex items-start gap-3 rounded-2xl border p-4 text-left border-red-500/40 bg-red-500/10 ${className}`}
    >
      <Icon size={20} className="shrink-0 text-red-500 mt-0.5" aria-hidden="true" />
      <div>
        <p className="m-0 text-sm font-bold text-red-600 dark:text-red-400">{message.title}</p>
        <p className="m-0 mt-1 text-xs text-[var(--text-muted,#64748b)] leading-relaxed">{message.body}</p>
      </div>
    </div>
  );
}
