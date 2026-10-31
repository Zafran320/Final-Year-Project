/**
 * Tracks which jobs the user opened and which they actually applied to.
 *
 * Opening a job's apply link no longer counts as applying: we record "opened", and when
 * the user returns to the tab we ask whether they applied. Only a "Yes" (or the manual
 * "Mark as applied" button) records "applied".
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/lib/brand";

export type ApplicationStatus = "opened" | "applied";

type ApplicationRecord = { status: ApplicationStatus; title: string; company: string; updatedAt: number };
type ApplicationMap = Record<string, ApplicationRecord>;

type TrackableJob = { id: string; title: string; company: string; jobUrl?: string; link?: string };

const CHANGED_EVENT = "futuremaker:applications-changed";

export function readApplications(storage: Storage | null = safeStorage()): ApplicationMap {
  try {
    const raw = storage?.getItem(STORAGE_KEYS.appliedJobs);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      // Old format: a list of ids marked "applied" just for clicking the link. We can't tell
      // which were real, so they become "opened" and the user can confirm them.
      return Object.fromEntries(
        parsed.filter((id): id is string => typeof id === "string").map((id) => [id, { status: "opened" as const, title: "", company: "", updatedAt: 0 }])
      );
    }
    return parsed && typeof parsed === "object" ? (parsed as ApplicationMap) : {};
  } catch {
    return {};
  }
}

function writeApplications(next: ApplicationMap, storage: Storage | null = safeStorage()) {
  try {
    storage?.setItem(STORAGE_KEYS.appliedJobs, JSON.stringify(next));
  } catch {
    // Storage blocked: status lasts for this page view only.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED_EVENT));
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function setApplicationStatus(job: Pick<TrackableJob, "id" | "title" | "company">, status: ApplicationStatus | null) {
  const next = { ...readApplications() };
  if (status) next[job.id] = { status, title: job.title, company: job.company, updatedAt: Date.now() };
  else delete next[job.id];
  writeApplications(next);
}

// The job whose apply page the user most recently opened; asked about when they come back.
let awaitingConfirmation: Pick<TrackableJob, "id" | "title" | "company"> | null = null;
let returnListenerInstalled = false;

function askIfApplied() {
  if (document.visibilityState !== "visible" || !awaitingConfirmation) return;
  const job = awaitingConfirmation;
  awaitingConfirmation = null;
  toast(`Did you apply to ${job.title} at ${job.company}?`, {
    duration: 20_000,
    action: {
      label: "Yes, I applied",
      onClick: () => {
        setApplicationStatus(job, "applied");
        toast.success("Marked as applied.");
      },
    },
    cancel: { label: "Not yet", onClick: () => {} },
  });
}

function installReturnListener() {
  if (returnListenerInstalled || typeof document === "undefined") return;
  returnListenerInstalled = true;
  document.addEventListener("visibilitychange", askIfApplied);
  window.addEventListener("focus", askIfApplied);
}

export function useJobApplications() {
  const [applications, setApplications] = useState<ApplicationMap>(() => readApplications());

  useEffect(() => {
    installReturnListener();
    const sync = () => setApplications(readApplications());
    window.addEventListener(CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  /** Opens the job's official apply page and remembers to ask whether the user applied. */
  const openJob = useCallback((job: TrackableJob) => {
    const url = job.jobUrl || job.link;
    if (!url) return;
    if (readApplications()[job.id]?.status !== "applied") {
      setApplicationStatus(job, "opened");
      awaitingConfirmation = { id: job.id, title: job.title, company: job.company };
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const statusOf = useCallback((jobId: string): ApplicationStatus | null => applications[jobId]?.status ?? null, [applications]);

  const toggleApplied = useCallback((job: TrackableJob) => {
    const applied = readApplications()[job.id]?.status === "applied";
    setApplicationStatus(job, applied ? "opened" : "applied");
    toast.success(applied ? `Unmarked ${job.company}.` : `Marked ${job.title} as applied.`);
  }, []);

  const appliedCount = Object.values(applications).filter((a) => a.status === "applied").length;

  return { statusOf, openJob, toggleApplied, appliedCount };
}
