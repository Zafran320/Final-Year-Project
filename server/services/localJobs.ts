/**
 * Local job search across every configured provider at once (JSearch and SerpApi, in parallel).
 * Both read Google for Jobs, so the same posting often comes back twice; results are merged and
 * de-duplicated. If one provider has no key, is out of quota or fails, the other carries on alone.
 */
import type { ScrapedJob } from "./careerOpsScraper";
import type { LocalJobSearchStatus, ProviderResult } from "./jobSearchStore";
import { fetchJSearchJobs, isJSearchConfigured } from "./jsearchProvider";
import { fetchSerpApiJobs, isSerpApiConfigured } from "./serpapiProvider";

export type { LocalJobSearchStatus };
export type LocalJobProvider = "jsearch" | "serpapi";

// Listed in preference order: when both return the same posting, the first provider's copy is kept
// (JSearch includes map coordinates, which make distance ranking more precise).
const PROVIDERS: Array<{ name: LocalJobProvider; search: typeof fetchJSearchJobs }> = [
  { name: "jsearch", search: fetchJSearchJobs },
  { name: "serpapi", search: fetchSerpApiJobs },
];

// When nothing returned jobs, report the most informative reason. A provider that searched and
// found nothing ("ok") is the truth; otherwise a quota or outage problem beats "not configured".
const STATUS_PRIORITY: LocalJobSearchStatus[] = ["ok", "cached", "quota-exhausted", "error", "not-configured"];

/** True when at least one job-search API key is set. Without one, Job Radar shows no listings. */
export function isLocalJobSearchConfigured() {
  return isJSearchConfigured() || isSerpApiConfigured();
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\b(pvt|private|ltd|limited|inc|llc|co)\b/g, "").replace(/[^a-z0-9]/g, "");
}

/** Same employer + same title + same city counts as one posting, whichever board it came from. */
export function postingKey(job: ScrapedJob) {
  return `${normalize(job.company)}|${normalize(job.title)}|${job.cityKey}`;
}

export function mergePostings(lists: ScrapedJob[][]): ScrapedJob[] {
  const seen = new Set<string>();
  const merged: ScrapedJob[] = [];
  for (const list of lists) {
    for (const job of list) {
      const key = postingKey(job);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(job);
    }
  }
  return merged;
}

export async function fetchLocalJobs(params: { role: string; city: string; countryCode?: string }): Promise<{
  jobs: ScrapedJob[];
  status: LocalJobSearchStatus;
  /** Providers whose jobs are in the list. */
  providers: LocalJobProvider[];
}> {
  const settled = await Promise.allSettled(PROVIDERS.map((p) => p.search(params)));
  const attempts = settled.map((outcome, i): ProviderResult & { provider: LocalJobProvider } => ({
    ...(outcome.status === "fulfilled" ? outcome.value : { jobs: [], status: "error" as const }),
    provider: PROVIDERS[i].name,
  }));

  const contributing = attempts.filter((a) => a.jobs.length > 0);
  const jobs = mergePostings(contributing.map((a) => a.jobs));

  // "ok" if anyone returned fresh results; otherwise the most informative reason.
  const status = attempts.some((a) => a.status === "ok" && a.jobs.length > 0)
    ? "ok"
    : [...(contributing.length > 0 ? contributing : attempts)].sort(
        (a, b) => STATUS_PRIORITY.indexOf(a.status) - STATUS_PRIORITY.indexOf(b.status)
      )[0].status;

  return { jobs, status, providers: contributing.map((a) => a.provider) };
}
