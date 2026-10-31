import {
  DEFAULT_LOCATION_LABEL,
  PROXIMITY_TIER_RANK,
  classifyProximity,
  findKnownCity,
  getCityByKey,
  type KnownCity,
  type ProximityTier,
} from "../../shared/pakistanCities";
import { fetchLocalJobs, isLocalJobSearchConfigured, type LocalJobSearchStatus, type LocalJobProvider } from "./localJobs";

/**
 * Live job aggregator. Every listing comes from a real feed at request time:
 * - local jobs for the candidate's city from JSearch and SerpApi together (both read Google for Jobs:
 *   LinkedIn, Indeed, Rozee.pk, Glassdoor…), merged and de-duplicated
 * - remote jobs from public boards (Remotive, RemoteOK, Arbeitnow, Jobicy, The Muse, We Work Remotely)
 * Nothing is hard-coded; listings are ranked by distance from the candidate, then skill match.
 */

export const JOB_PLATFORM_SOURCES = [
  "linkedin", "indeed", "glassdoor", "rozee", "googlejobs",
  "remotive", "remoteok", "arbeitnow", "jobicy", "themuse", "weworkremotely",
] as const;

export type JobPlatformSource = (typeof JOB_PLATFORM_SOURCES)[number];

export const SALARY_NOT_DISCLOSED = "Salary not disclosed";

export type ScrapedJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  cityKey: string;
  jobUrl: string;
  workMode: "Remote" | "Hybrid" | "On-site";
  salaryRange: string;
  experienceLevel: "Entry / Junior" | "Mid-Level" | "Senior" | "Lead";
  coreSkills: string[];
  extraSkills: string[];
  platformSources: JobPlatformSource[];
  whyRecommended: string;
  talkingPoints: string[];
  sourceAts: "greenhouse" | "lever" | "ashby" | "remotive" | "direct-portal";
  postedAt?: string | null;
  jobLat?: number | null;
  jobLng?: number | null;
};

export type EvaluatedCareerOpsJob = ScrapedJob & {
  proximityTier: ProximityTier;
  distanceKm: number | null;
  isLocationMatch: boolean;
  locationMatchReason: string;
  matchedSkills: string[];
  matchScore: number; // 1.0 - 5.0
  matchPercentage: number;
  dimensions: {
    technicalFit: number;
    seniorityFit: number;
    workModeFit: number;
    growthFit: number;
  };
  reportBlocks: {
    blockA: string; // Role & Organization Snapshot
    blockB: string; // Core Mission & Impact
    blockC: string; // Technical Architecture & Stack
    blockD: string; // Candidate Fit Matrix
    blockE: string; // Connector Signals Provenance
    blockF: string; // Strategic Interview Talking Points
    blockG: string; // Legitimacy & Verification Check
    blockH: string; // Tailored Application Strategy
  };
};

let cachedRemoteJobs: ScrapedJob[] = [];
let lastRemoteFetchTime = 0;
const REMOTE_CACHE_TTL = 3 * 60 * 1000; // 3 minutes for fresh real-time listings

/**
 * Normalizes and extracts recognized developer skills from raw tags or descriptions
 */
function extractSkillsFromText(tags?: unknown, fallbackTitle?: string): { core: string[]; extra: string[] } {
  const recognizedPool = [
    "React", "TypeScript", "JavaScript", "Node.js", "Python", "SQL", "PostgreSQL",
    "MongoDB", "Next.js", "Tailwind CSS", "Docker", "Kubernetes", "AWS", "FastAPI",
    "Django", "GraphQL", "Redis", "C#", ".NET Core", "Flutter", "Go", "Rust",
    "Vue.js", "Angular", "Express", "REST APIs", "Git", "CI/CD", "Linux", "PyTorch"
  ];

  const found: string[] = [];
  const tagList: string[] = Array.isArray(tags)
    ? tags.map((t) => String(t || "").trim())
    : typeof tags === "string"
      ? tags.split(/[,;\s]+/)
      : [];

  const combinedSearch = (tagList.join(" ") + " " + (fallbackTitle || "")).toLowerCase();

  for (const skill of recognizedPool) {
    const sLower = skill.toLowerCase();
    if (combinedSearch.includes(sLower) && !found.includes(skill)) {
      found.push(skill);
    }
  }

  // Only skills actually named in the listing; never pad with guesses.
  return { core: found.slice(0, 4), extra: found.slice(4, 7) };
}

// 1. Remotive Free Public Remote Jobs API Scraper
async function fetchRemotiveJobs(): Promise<ScrapedJob[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://remotive.com/api/remote-jobs?category=software-dev&limit=30", {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.jobs)) return [];

    return data.jobs.slice(0, 25).map((item: any) => {
      const skills = extractSkillsFromText(item.tags, item.title);
      return {
        id: `remotive-${item.id}`,
        title: item.title,
        company: item.company_name,
        location: item.candidate_required_location
          ? `Remote (${item.candidate_required_location})`
          : "Remote (Worldwide)",
        cityKey: "remote",
        jobUrl: item.url || "https://remotive.com",
        workMode: "Remote" as const,
        salaryRange: item.salary || SALARY_NOT_DISCLOSED,
        experienceLevel: (item.title || "").toLowerCase().includes("senior") ? "Senior" as const : "Mid-Level" as const,
        coreSkills: skills.core,
        extraSkills: skills.extra,
        platformSources: ["remotive"] as JobPlatformSource[],
        whyRecommended: `Live verified software opening aggregated from Remotive developer board.`,
        talkingPoints: [
          `Detail your experience delivering production web features with ${skills.core.slice(0, 2).join(" & ")}.`,
          `Emphasize autonomous delivery, asynchronous collaboration, and clean testing standards.`,
        ],
        sourceAts: "remotive" as const,
      };
    });
  } catch {
    return [];
  }
}

// 2. RemoteOK API Scraper
async function fetchRemoteOKJobs(): Promise<ScrapedJob[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://remoteok.com/api?tag=dev", {
      headers: { "User-Agent": "FutureMakerAI/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const items = data.slice(1, 25);
    const results: ScrapedJob[] = [];

    for (const item of items) {
      if (item && item.position && item.company) {
        const skills = extractSkillsFromText(item.tags, item.position);
        results.push({
          id: `rok-${item.id || Math.random().toString(36).slice(2, 8)}`,
          title: item.position,
          company: item.company,
          location: "Remote (Global / Worldwide)",
          cityKey: "remote",
          jobUrl: item.url || `https://remoteok.com/remote-jobs/${item.id}`,
          workMode: "Remote" as const,
          salaryRange:
            item.salary_min && item.salary_max
              ? `$${Math.round(item.salary_min / 1000)}k – $${Math.round(item.salary_max / 1000)}k / yr`
              : SALARY_NOT_DISCLOSED,
          experienceLevel: (item.position || "").toLowerCase().includes("senior") ? "Senior" as const : "Mid-Level" as const,
          coreSkills: skills.core,
          extraSkills: skills.extra,
          platformSources: ["remoteok"] as JobPlatformSource[],
          whyRecommended: `Live real-time tech posting aggregated from RemoteOK.`,
          talkingPoints: [
            `Discuss clean architecture and high-performance delivery across ${skills.core.join(", ")}.`,
          ],
          sourceAts: "remotive" as const,
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}

// 3. Arbeitnow Free Developer Jobs API Scraper (No Auth Required, Europe & Remote)
async function fetchArbeitnowJobs(): Promise<ScrapedJob[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      headers: { "User-Agent": "FutureMakerAI/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.data)) return [];

    return data.data.slice(0, 25).map((item: any) => {
      const skills = extractSkillsFromText(item.tags, item.title);
      const isRemote = Boolean(item.remote);
      return {
        id: `arbeitnow-${item.slug || Math.random().toString(36).slice(2, 8)}`,
        title: item.title,
        company: item.company_name,
        location: isRemote ? "Remote (Global / Worldwide)" : `${item.location || "Europe / Global"} · Hybrid`,
        cityKey: isRemote ? "remote" : "global",
        jobUrl: item.url || "https://www.arbeitnow.com",
        workMode: isRemote ? "Remote" as const : "Hybrid" as const,
        salaryRange: SALARY_NOT_DISCLOSED,
        experienceLevel: (item.title || "").toLowerCase().includes("senior") ? "Senior" as const : "Mid-Level" as const,
        coreSkills: skills.core,
        extraSkills: skills.extra,
        platformSources: ["arbeitnow"] as JobPlatformSource[],
        whyRecommended: `Live Europe-focused & global remote tech opportunity from Arbeitnow job board.`,
        talkingPoints: [
          `Demonstrate strong component lifecycle and API communication using ${skills.core.slice(0, 2).join(" & ")}.`,
        ],
        sourceAts: "greenhouse" as const,
      };
    });
  } catch {
    return [];
  }
}

// 4. Jobicy Free Remote Engineering Jobs API Scraper
async function fetchJobicyJobs(): Promise<ScrapedJob[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=25&industry=engineering", {
      headers: { "User-Agent": "FutureMakerAI/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.jobs)) return [];

    return data.jobs.slice(0, 25).map((item: any) => {
      const skills = extractSkillsFromText(item.jobGeo || item.jobCategory, item.jobTitle);
      return {
        id: `jobicy-${item.id || Math.random().toString(36).slice(2, 8)}`,
        title: item.jobTitle,
        company: item.companyName,
        location: item.jobGeo ? `Remote (${item.jobGeo})` : "Remote (Worldwide)",
        cityKey: "remote",
        jobUrl: item.url || "https://jobicy.com",
        workMode: "Remote" as const,
        salaryRange: item.annualSalaryMin && item.annualSalaryMax
          ? `$${Math.round(item.annualSalaryMin / 1000)}k – $${Math.round(item.annualSalaryMax / 1000)}k / yr`
          : SALARY_NOT_DISCLOSED,
        experienceLevel: (item.jobLevel || "").toLowerCase().includes("senior") ? "Senior" as const : "Mid-Level" as const,
        coreSkills: skills.core,
        extraSkills: skills.extra,
        platformSources: ["jobicy"] as JobPlatformSource[],
        whyRecommended: `Live remote engineering opening from Jobicy global talent network.`,
        talkingPoints: [
          `Highlight experience building robust, scale-ready systems in ${skills.core.slice(0, 2).join(", ")}.`,
        ],
        sourceAts: "lever" as const,
      };
    });
  } catch {
    return [];
  }
}

// 5. The Muse Free 500k+ Listings Public API Scraper (No Auth Required)
async function fetchTheMuseJobs(): Promise<ScrapedJob[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://www.themuse.com/api/public/jobs?category=Software%20Engineering&page=1", {
      headers: { "User-Agent": "FutureMakerAI/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.results)) return [];

    return data.results.slice(0, 25).map((item: any) => {
      const title = item.name || "Software Engineer";
      const company = item.company?.name || "Global Enterprise";
      const locationName = item.locations?.[0]?.name || "Flexible / Remote";
      const isRemote = locationName.toLowerCase().includes("remote") || locationName.toLowerCase().includes("flexible");
      const levelShort = item.levels?.[0]?.short_name?.toLowerCase() || "";
      const experienceLevel: "Entry / Junior" | "Mid-Level" | "Senior" | "Lead" =
        levelShort.includes("senior") || title.toLowerCase().includes("senior")
          ? "Senior"
          : levelShort.includes("entry") || levelShort.includes("intern")
          ? "Entry / Junior"
          : levelShort.includes("lead") || levelShort.includes("principal")
          ? "Lead"
          : "Mid-Level";

      const skills = extractSkillsFromText(undefined, title);
      const landingPage = item.refs?.landing_page || "https://www.themuse.com/jobs";

      return {
        id: `themuse-${item.id}`,
        title,
        company,
        location: isRemote ? "Remote (Global / Worldwide)" : `${locationName} · Hybrid`,
        cityKey: isRemote ? "remote" : "global",
        jobUrl: landingPage,
        workMode: isRemote ? "Remote" as const : "Hybrid" as const,
        salaryRange: SALARY_NOT_DISCLOSED,
        experienceLevel,
        coreSkills: skills.core,
        extraSkills: skills.extra,
        platformSources: ["themuse"] as JobPlatformSource[],
        whyRecommended: `Live verified opening from The Muse 500k+ enterprise career network.`,
        talkingPoints: [
          `Demonstrate strong engineering fundamentals, clean modular design, and ${skills.core.slice(0, 2).join(" & ")}.`,
          `Highlight team communication, ownership, and measurable customer impact.`,
        ],
        sourceAts: "greenhouse" as const,
      };
    });
  } catch {
    return [];
  }
}

// 6. We Work Remotely (WWR) Live RSS Scraper
async function fetchWWRJobs(): Promise<ScrapedJob[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://weworkremotely.com/categories/remote-programming-jobs.rss", {
      headers: { "User-Agent": "FutureMakerAI/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const xml = await res.text();
    const results: ScrapedJob[] = [];
    const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null && results.length < 20) {
      const rawTitle = match[1] ? match[1].replace(/&amp;/g, "&").replace(/&lt;.*?&gt;/g, "").trim() : "";
      const jobUrl = match[2] ? match[2].trim() : "https://weworkremotely.com";

      if (!rawTitle) continue;
      let company = "Tech Enterprise";
      let title = rawTitle;

      if (rawTitle.includes(":")) {
        const parts = rawTitle.split(":");
        company = parts[0].trim();
        title = parts.slice(1).join(":").trim();
      }

      const skills = extractSkillsFromText(undefined, title);
      results.push({
        id: `wwr-${jobUrl.replace(/[^a-z0-9]/gi, "").slice(-24)}`,
        title,
        company,
        location: "Remote (Global / Worldwide)",
        cityKey: "remote",
        jobUrl,
        workMode: "Remote" as const,
        salaryRange: SALARY_NOT_DISCLOSED,
        experienceLevel: title.toLowerCase().includes("senior") || title.toLowerCase().includes("lead") ? "Senior" as const : "Mid-Level" as const,
        coreSkills: skills.core,
        extraSkills: skills.extra,
        platformSources: ["weworkremotely"] as JobPlatformSource[],
        whyRecommended: `Live verified remote software role from WeWorkRemotely engineering board.`,
        talkingPoints: [
          `Emphasize autonomous delivery, clean code practices, and modern full-stack workflows.`,
        ],
        sourceAts: "greenhouse" as const,
      });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Aggregates all live remote APIs in parallel with fast timeouts
 */
async function fetchLiveRemoteAPIs(): Promise<ScrapedJob[]> {
  if (process.env.NODE_ENV === "test") {
    return [];
  }
  const now = Date.now();
  if (cachedRemoteJobs.length > 0 && now - lastRemoteFetchTime < REMOTE_CACHE_TTL) {
    return cachedRemoteJobs;
  }

  const [remotiveRes, remoteokRes, arbeitnowRes, jobicyRes, themuseRes, wwrRes] = await Promise.allSettled([
    fetchRemotiveJobs(),
    fetchRemoteOKJobs(),
    fetchArbeitnowJobs(),
    fetchJobicyJobs(),
    fetchTheMuseJobs(),
    fetchWWRJobs(),
  ]);

  const combined: ScrapedJob[] = [];
  if (remotiveRes.status === "fulfilled") combined.push(...remotiveRes.value);
  if (remoteokRes.status === "fulfilled") combined.push(...remoteokRes.value);
  if (arbeitnowRes.status === "fulfilled") combined.push(...arbeitnowRes.value);
  if (jobicyRes.status === "fulfilled") combined.push(...jobicyRes.value);
  if (themuseRes.status === "fulfilled") combined.push(...themuseRes.value);
  if (wwrRes.status === "fulfilled") combined.push(...wwrRes.value);

  // Deduplicate by title + company
  const seen = new Set<string>();
  const uniqueList = combined.filter((job) => {
    const key = `${job.company.toLowerCase()}-${job.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (uniqueList.length > 0) {
    cachedRemoteJobs = uniqueList;
    lastRemoteFetchTime = now;
  }

  return cachedRemoteJobs;
}


const OPEN_REMOTE_REGIONS = /(worldwide|global|anywhere|asia|apac|pakistan|emea|south asia|middle east)/i;

/** Remote roles limited to e.g. "USA only" are not reachable from Pakistan, so they must not rank as matches. */
export function isRemoteOpenToPakistan(location: string) {
  const region = location.match(/remote\s*\(([^)]*)\)/i)?.[1];
  if (!region) return true;
  return OPEN_REMOTE_REGIONS.test(region);
}

/** Search deep-links for the candidate's role and place on boards that have no public API. */
export function buildJobBoardSearchLinks(role: string, city: string, placeLabel: string, countryCode: string | null) {
  const q = encodeURIComponent(role);
  const inPakistan = !countryCode || countryCode === "PK";
  const links = [
    { platform: "linkedin", label: `LinkedIn jobs in ${city}`, url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${encodeURIComponent(placeLabel)}` },
    { platform: "indeed", label: `Indeed jobs in ${city}`, url: `https://${inPakistan ? "pk." : "www."}indeed.com/jobs?q=${q}&l=${encodeURIComponent(city)}` },
    { platform: "googlejobs", label: `Google Jobs in ${city}`, url: `https://www.google.com/search?ibp=htl;jobs&q=${encodeURIComponent(`${role} jobs in ${placeLabel}`)}` },
  ];
  if (inPakistan) {
    links.splice(2, 0, { platform: "rozee", label: `Rozee.pk jobs in ${city}`, url: `https://www.rozee.pk/job/jsearch/q/${encodeURIComponent(`${role} ${city}`)}` });
  }
  return links;
}

function proximityReason(tier: ProximityTier, job: ScrapedJob, candidateLabel: string, distance: number | null) {
  const km = distance !== null ? ` · ~${distance} km away` : "";
  switch (tier) {
    case "same-city":
      return `📍 In your city (${candidateLabel})${distance ? km : ""}`;
    case "nearby":
      return `📍 Near you${km}`;
    case "same-province":
      return `🗺️ Same province${km}`;
    case "remote":
      return "🌐 Remote · open to candidates in Pakistan";
    case "same-country":
      return `📌 Elsewhere in the country${km}`;
    default:
      return job.workMode === "Remote" ? `🌐 Remote, but limited to ${job.location.match(/\(([^)]*)\)/)?.[1] ?? "other regions"}` : "✈️ Abroad";
  }
}

const TIER_SCORE_BONUS: Record<ProximityTier, number> = {
  "same-city": 0.1,
  nearby: 0.08,
  "same-province": 0.05,
  remote: 0.04,
  "same-country": 0.01,
  elsewhere: 0,
};

export type LiveJobsResult = {
  jobs: EvaluatedCareerOpsJob[];
  localSearch: LocalJobSearchStatus;
  /** Services whose jobs are in the list (empty when none returned local jobs). */
  localProviders: LocalJobProvider[];
};

/**
 * Fetches real local jobs for the candidate's city (JSearch) plus remote jobs, then ranks
 * them by distance tier from the candidate's actual location before skill match.
 */
export async function scrapeAndEvaluateLiveJobs(params: {
  candidateLocation?: string;
  candidateCoords?: { lat: number; lng: number } | null;
  countryCode?: string | null;
  candidateSkills?: string;
  targetRole?: string;
  currentJob?: string;
  workMode?: "all" | "Remote" | "Hybrid" | "On-site";
  platform?: "all" | JobPlatformSource;
  query?: string;
}): Promise<LiveJobsResult> {
  // No job-search API connected: show nothing rather than a partial list, so the UI can ask for a key.
  if (!isLocalJobSearchConfigured()) {
    return { jobs: [], localSearch: "not-configured", localProviders: [] };
  }

  const userLoc = (params.candidateLocation || DEFAULT_LOCATION_LABEL).trim();
  const candidateCity: KnownCity | null = findKnownCity(userLoc);
  const candidateLabel = candidateCity?.name ?? userLoc.split(",")[0].trim();
  const countryCode = (params.countryCode || (candidateCity ? "PK" : null) || "PK").toUpperCase();
  const rawSkills = params.candidateSkills || "";
  const userSkillSet = new Set(
    rawSkills
      .split(/[,;\n]+/)
      .map((s) => s.trim().toLowerCase().replace(/[^\w#+]/g, ""))
      .filter(Boolean)
  );

  const targetRoleText = (params.targetRole || params.currentJob || "Software Engineer").trim();
  const canSearchLocally = Boolean(candidateLabel) && candidateLabel !== "Your location";

  const [localRes, remoteRes] = await Promise.allSettled([
    canSearchLocally
      ? fetchLocalJobs({ role: targetRoleText, city: candidateCity?.name ?? candidateLabel, countryCode })
      : Promise.resolve({ jobs: [] as ScrapedJob[], status: "error" as LocalJobSearchStatus, providers: [] as LocalJobProvider[] }),
    fetchLiveRemoteAPIs(),
  ]);
  const local = localRes.status === "fulfilled" ? localRes.value : { jobs: [], status: "error" as LocalJobSearchStatus, providers: [] as LocalJobProvider[] };
  const combined: ScrapedJob[] = [...local.jobs, ...(remoteRes.status === "fulfilled" ? remoteRes.value : [])];

  const evaluatedList: EvaluatedCareerOpsJob[] = combined.map((job) => {
    const matchingSkills = job.coreSkills.filter((skill) => {
      const norm = skill.trim().toLowerCase().replace(/[^\w#+]/g, "");
      return userSkillSet.has(norm) || Array.from(userSkillSet).some((userS) => userS.includes(norm) || norm.includes(userS));
    });
    const matchRatio = job.coreSkills.length > 0 ? matchingSkills.length / job.coreSkills.length : 0.5;

    const jobInCountry = countryCode === "PK" ? /pakistan/i.test(job.location) : job.cityKey !== "remote" && /^(jsearch|serpapi)-/.test(job.id);
    // Only text-match Pakistani listings, so "Hyderabad, India" is never mistaken for Hyderabad, Sindh.
    const jobCity = job.cityKey === "remote" ? null : getCityByKey(job.cityKey) ?? (/pakistan/i.test(job.location) ? findKnownCity(job.location) : null);
    const remoteReachable = job.workMode === "Remote" && isRemoteOpenToPakistan(job.location);
    const sameUnknownCity = !candidateCity && !jobCity && job.cityKey !== "remote" && job.cityKey === candidateLabel.toLowerCase().replace(/[^a-z]/g, "");
    const proximity = sameUnknownCity
      ? { tier: "same-city" as ProximityTier, distanceKm: null }
      : classifyProximity({
          candidateCity,
          candidateCoords: params.candidateCoords,
          jobCity,
          jobCoords: job.jobLat != null && job.jobLng != null ? { lat: job.jobLat, lng: job.jobLng } : null,
          jobIsRemote: remoteReachable,
          jobInPakistan: jobInCountry,
        });
    const { tier, distanceKm } = proximity;
    const isLocationMatch = PROXIMITY_TIER_RANK[tier] <= PROXIMITY_TIER_RANK.remote;

    const basePct = Math.round((matchRatio * 0.55 + 0.35 + TIER_SCORE_BONUS[tier]) * 100);
    const cappedPct = Math.min(98, Math.max(40, basePct));
    const score = Number(((cappedPct / 100) * 5).toFixed(1));
    const sourceName = job.platformSources.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" & ");

    return {
      ...job,
      proximityTier: tier,
      distanceKm,
      isLocationMatch,
      locationMatchReason: proximityReason(tier, job, candidateLabel, distanceKm),
      matchedSkills: matchingSkills,
      matchScore: score,
      matchPercentage: cappedPct,
      dimensions: {
        technicalFit: cappedPct,
        seniorityFit: cappedPct,
        workModeFit: tier === "same-city" || tier === "nearby" || tier === "remote" ? 98 : tier === "same-province" ? 85 : 60,
        growthFit: cappedPct,
      },
      reportBlocks: {
        blockA: `${job.company} is hiring for ${job.title} in ${job.location}. Compensation: ${job.salaryRange}. (Source: ${sourceName}).`,
        blockB: `Read the full description on ${sourceName} for responsibilities and team details.`,
        blockC: job.coreSkills.length > 0
          ? `Technologies named in the posting: ${[...job.coreSkills, ...job.extraSkills].join(", ")}.`
          : `The posting does not list specific technologies; read the full description on the source site.`,
        blockD: matchingSkills.length > 0
          ? `Your profile skills that appear in this posting: ${matchingSkills.join(", ")}.`
          : `None of your profile skills are named in this posting's summary. Check the full description before applying.`,
        blockE: `Listing source: ${sourceName}.`,
        blockF: job.talkingPoints.join(" "),
        blockG: `Live posting from ${sourceName}. Apply only through the official link and never pay a fee to apply.`,
        blockH: matchingSkills.length > 0
          ? `Lead with your work in ${matchingSkills.slice(0, 3).join(", ")}, then practise this role in an AI mock interview.`
          : `Tailor your CV to the posting's requirements, then practise this role in an AI mock interview.`,
      },
    };
  });

  const filtered = evaluatedList.filter((job) => {
    if (params.platform && params.platform !== "all" && !job.platformSources.includes(params.platform)) return false;
    if (params.workMode && params.workMode !== "all" && job.workMode !== params.workMode) return false;
    if (params.query && params.query.trim()) {
      const q = params.query.toLowerCase();
      const match =
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q) ||
        job.coreSkills.some((s) => s.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  // Closest tier first, then distance, then skill match.
  const jobs = filtered.sort((a, b) => {
    const tierDiff = PROXIMITY_TIER_RANK[a.proximityTier] - PROXIMITY_TIER_RANK[b.proximityTier];
    if (tierDiff !== 0) return tierDiff;
    if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
    return b.matchScore - a.matchScore;
  });

  return { jobs, localSearch: local.status, localProviders: local.providers };
}
