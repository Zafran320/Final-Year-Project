/**
 * Second source of real local job listings: SerpApi's Google Jobs API. Like JSearch it reads
 * Google for Jobs (LinkedIn, Indeed, Rozee.pk, Glassdoor, company sites). It is queried alongside
 * JSearch and the results are merged (see localJobs.ts).
 *
 * Free plan: 250 searches/month, no card. Enabled only when SERPAPI_API_KEY is set.
 */
import { createHash } from "node:crypto";
import { findKnownCity } from "../../shared/pakistanCities";
import { SALARY_NOT_DISCLOSED, type ScrapedJob } from "./careerOpsScraper";
import { countryName, extractSkills, inferExperience, inferWorkMode, publisherToPlatform } from "./jobListingUtils";
import { JobSearchStore, type ProviderResult, type StoreState } from "./jobSearchStore";

const SERPAPI_URL = "https://serpapi.com/search.json";
const REQUEST_TIMEOUT_MS = 12_000;

type SerpApiJob = {
  job_id?: string;
  title?: string;
  company_name?: string;
  location?: string;
  via?: string;
  description?: string;
  share_link?: string;
  apply_options?: Array<{ title?: string; link?: string }>;
  detected_extensions?: {
    posted_at?: string;
    schedule_type?: string;
    work_from_home?: boolean;
    salary?: string;
  };
};

const store = new JobSearchStore("serpapi", "SERPAPI_MONTHLY_LIMIT", 250);

export function isSerpApiConfigured() {
  return Boolean(process.env.SERPAPI_API_KEY?.trim());
}

/** Turns Google's relative "3 days ago" into an ISO timestamp so cards can show the age. */
export function relativeAgeToIso(postedAt: string | undefined, now = Date.now()): string | null {
  const match = postedAt?.match(/(\d+)\s*\+?\s*(minute|hour|day|week|month)/i);
  if (!match) return null;
  const unitMs: Record<string, number> = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000, month: 2_592_000_000 };
  return new Date(now - Number(match[1]) * unitMs[match[2].toLowerCase()]).toISOString();
}

export function mapSerpApiJob(job: SerpApiJob, countryCode: string): ScrapedJob | null {
  // Prefer the original board's apply link (LinkedIn/Indeed) over Google's share page.
  const applyLink = job.apply_options?.find((o) => o.link)?.link || job.share_link;
  if (!job.title || !job.company_name || !applyLink) return null;

  const publisher = (job.via || "").replace(/^via\s+/i, "").trim() || "Google Jobs";
  const ext = job.detected_extensions ?? {};
  const workMode = inferWorkMode(ext.work_from_home || /\banywhere\b|\bremote\b/i.test(job.location || ""), job.description);
  // Google labels remote postings "Anywhere"; that is not a city.
  const rawPlace = /^\s*anywhere\s*$/i.test(job.location || "") ? "" : (job.location || "").trim();
  const inPakistan = countryCode.toUpperCase() === "PK";
  const city = inPakistan ? findKnownCity(rawPlace) : null;
  const cityName = rawPlace.split(",")[0].trim();
  const place = !rawPlace
    ? workMode === "Remote" ? "Remote" : "Location not listed"
    : rawPlace.includes(",") ? rawPlace : `${rawPlace}, ${countryName(countryCode)}`;
  const skills = extractSkills(`${job.title} ${job.description || ""}`);
  const stableId = createHash("sha1").update(job.job_id || `${job.title}|${job.company_name}|${applyLink}`).digest("hex").slice(0, 16);

  return {
    id: `serpapi-${stableId}`,
    title: job.title,
    company: job.company_name,
    location: `${place} · ${workMode}`,
    cityKey: city?.key ?? (workMode === "Remote" && !cityName ? "remote" : cityName.toLowerCase().replace(/[^a-z]/g, "")),
    jobUrl: applyLink,
    workMode,
    salaryRange: ext.salary || SALARY_NOT_DISCLOSED,
    experienceLevel: inferExperience(job.title),
    coreSkills: skills.slice(0, 4),
    extraSkills: skills.slice(4),
    platformSources: [publisherToPlatform(publisher)],
    whyRecommended: `Live opening posted on ${publisher}${cityName ? ` in ${cityName}` : ""}.`,
    talkingPoints: [`Read the full posting on ${publisher} and map each requirement to a project you have shipped.`],
    sourceAts: "direct-portal",
    postedAt: relativeAgeToIso(ext.posted_at),
  };
}

/** Real openings for a role in a city via SerpApi Google Jobs. Never throws. */
export async function fetchSerpApiJobs(params: { role: string; city: string; countryCode?: string }): Promise<ProviderResult> {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key) return { jobs: [], status: "not-configured" };

  const country = (params.countryCode || "PK").toUpperCase();
  // City goes in the query rather than SerpApi's `location`, which rejects names not in Google's location list.
  const query = `${params.role} jobs in ${params.city}`;

  return store.search(`${country}|${query.toLowerCase()}`, async () => {
    const url = new URL(SERPAPI_URL);
    url.searchParams.set("engine", "google_jobs");
    url.searchParams.set("q", query);
    url.searchParams.set("gl", country.toLowerCase());
    url.searchParams.set("hl", "en");
    url.searchParams.set("api_key", key);

    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const data = (await res.json().catch(() => ({}))) as { error?: string; jobs_results?: SerpApiJob[] };

    if (data.error) {
      if (/run out of searches|searches per month|plan limit|exceeded/i.test(data.error) || res.status === 429) return { kind: "quota-exhausted" };
      // "Google hasn't returned any results" is a real empty result, not a failure.
      if (/hasn't returned any results/i.test(data.error)) return { kind: "ok", jobs: [] };
      console.warn(`[Jobs] SerpApi error for "${query}": ${data.error}`);
      return { kind: "error" };
    }
    if (!res.ok) {
      console.warn(`[Jobs] SerpApi returned HTTP ${res.status} for "${query}"`);
      return { kind: res.status === 429 ? "quota-exhausted" : "error" };
    }
    return {
      kind: "ok",
      jobs: (data.jobs_results ?? []).map((job) => mapSerpApiJob(job, country)).filter((job): job is ScrapedJob => job !== null),
    };
  });
}

/** Test hook: forget in-memory state so each test starts clean. */
export function resetSerpApiStateForTests(initial?: StoreState) {
  store.reset(initial);
}
