/**
 * Real city-specific job listings via JSearch (RapidAPI), which indexes Google for Jobs
 * and therefore LinkedIn, Indeed, Rozee.pk, Glassdoor and company sites. LinkedIn has no
 * public job-search API, so this is the supported way to show real local openings.
 *
 * The free plan is 200 requests/month (hard limit, no card). To stay inside it:
 * - results are cached per role + city on disk, so dev-server restarts don't refetch;
 * - identical concurrent requests share one API call;
 * - a monthly counter stops calling the API at JSEARCH_MONTHLY_LIMIT and serves stale cache instead.
 */
import { findKnownCity } from "../../shared/pakistanCities";
import { SALARY_NOT_DISCLOSED, type ScrapedJob } from "./careerOpsScraper";
import { countryName, extractSkills, inferExperience, inferWorkMode, publisherToPlatform } from "./jobListingUtils";
import { JobSearchStore, type ProviderResult, type StoreState } from "./jobSearchStore";

const JSEARCH_HOST = "jsearch.p.rapidapi.com";
const REQUEST_TIMEOUT_MS = 10_000;

type JSearchJob = {
  job_id: string;
  job_title?: string;
  employer_name?: string;
  job_publisher?: string;
  job_apply_link?: string;
  job_city?: string | null;
  job_state?: string | null;
  job_country?: string | null;
  job_latitude?: number | null;
  job_longitude?: number | null;
  job_is_remote?: boolean | null;
  job_description?: string | null;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_currency?: string | null;
  job_salary_period?: string | null;
  job_posted_at_datetime_utc?: string | null;
  job_required_skills?: string[] | null;
};

const store = new JobSearchStore("jsearch", "JSEARCH_MONTHLY_LIMIT", 200);

export function isJSearchConfigured() {
  return Boolean(process.env.JSEARCH_API_KEY?.trim());
}

function formatSalary(job: JSearchJob) {
  if (!job.job_min_salary && !job.job_max_salary) return SALARY_NOT_DISCLOSED;
  const currency = job.job_salary_currency || "";
  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const range = job.job_min_salary && job.job_max_salary
    ? `${fmt(job.job_min_salary)} – ${fmt(job.job_max_salary)}`
    : fmt((job.job_min_salary || job.job_max_salary)!);
  const period = job.job_salary_period ? ` / ${job.job_salary_period.toLowerCase()}` : "";
  return `${currency} ${range}${period}`.trim();
}

export function mapJSearchJob(job: JSearchJob): ScrapedJob | null {
  if (!job.job_id || !job.job_title || !job.employer_name || !job.job_apply_link) return null;
  const workMode = inferWorkMode(job.job_is_remote, job.job_description);
  const country = countryName(job.job_country);
  const place = [job.job_city, country].filter(Boolean).join(", ") || (workMode === "Remote" ? "Remote" : "Location not listed");
  const city = job.job_country === "PK" || !job.job_country ? findKnownCity(job.job_city) ?? findKnownCity(job.job_state) : null;
  const skills = job.job_required_skills?.length
    ? job.job_required_skills.slice(0, 8)
    : extractSkills(`${job.job_title} ${job.job_description || ""}`);
  const publisher = job.job_publisher || "the web";

  return {
    id: `jsearch-${job.job_id}`,
    title: job.job_title,
    company: job.employer_name,
    location: `${place} · ${workMode}`,
    cityKey: city?.key ?? (workMode === "Remote" && !job.job_city ? "remote" : (job.job_city || "").toLowerCase().replace(/[^a-z]/g, "")),
    jobUrl: job.job_apply_link,
    workMode,
    salaryRange: formatSalary(job),
    experienceLevel: inferExperience(job.job_title),
    coreSkills: skills.slice(0, 4),
    extraSkills: skills.slice(4),
    platformSources: [publisherToPlatform(job.job_publisher)],
    whyRecommended: `Live opening posted on ${publisher}${job.job_city ? ` in ${job.job_city}` : ""}.`,
    talkingPoints: [`Read the full posting on ${publisher} and map each requirement to a project you have shipped.`],
    sourceAts: "direct-portal",
    postedAt: job.job_posted_at_datetime_utc ?? null,
    jobLat: job.job_latitude ?? null,
    jobLng: job.job_longitude ?? null,
  };
}

/** Real openings for a role in a city via JSearch. Never throws; the status says where the jobs came from. */
export async function fetchJSearchJobs(params: { role: string; city: string; countryCode?: string }): Promise<ProviderResult> {
  const key = process.env.JSEARCH_API_KEY?.trim();
  if (!key) return { jobs: [], status: "not-configured" };

  const country = (params.countryCode || "PK").toLowerCase();
  const query = `${params.role} jobs in ${params.city}`;

  return store.search(`${country}|${query.toLowerCase()}`, async () => {
    // JSearch v5 renamed the endpoint from /search to /search-v2.
    const url = new URL(`https://${JSEARCH_HOST}/search-v2`);
    url.searchParams.set("query", query);
    url.searchParams.set("num_pages", "1");
    url.searchParams.set("country", country);
    url.searchParams.set("date_posted", "month");

    const res = await fetch(url, {
      headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": JSEARCH_HOST },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.status === 429) return { kind: "quota-exhausted" };
    if (!res.ok) {
      console.warn(`[Jobs] JSearch returned HTTP ${res.status} for "${query}"`);
      return { kind: "error" };
    }
    // v5 returns { data: { jobs, cursor } }; older versions returned { data: [...] }.
    const body = (await res.json()) as { data?: JSearchJob[] | { jobs?: JSearchJob[] } };
    const rawJobs = Array.isArray(body.data) ? body.data : body.data?.jobs ?? [];
    const remainingHeader = res.headers.get("x-ratelimit-requests-remaining");
    return {
      kind: "ok",
      jobs: rawJobs.map(mapJSearchJob).filter((job): job is ScrapedJob => job !== null),
      remaining: remainingHeader !== null ? Number(remainingHeader) : undefined,
    };
  });
}

/** Test hook: forget in-memory state so each test starts clean. */
export function resetJSearchStateForTests(initial?: StoreState) {
  store.reset(initial);
}
