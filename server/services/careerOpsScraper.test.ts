import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScrapedJob } from "./careerOpsScraper";

const fetchJSearchJobs = vi.fn();
let keysConfigured = true;
vi.mock("./localJobs", () => ({
  isLocalJobSearchConfigured: () => keysConfigured,
  fetchLocalJobs: async (...args: unknown[]) => ({ providers: ["jsearch"], ...(await fetchJSearchJobs(...args)) }),
}));

const { buildJobBoardSearchLinks, isRemoteOpenToPakistan, scrapeAndEvaluateLiveJobs } = await import("./careerOpsScraper");

function liveJob(id: string, city: string, cityKey: string, extra: Partial<ScrapedJob> = {}): ScrapedJob {
  return {
    id: `jsearch-${id}`,
    title: "React Developer",
    company: `Company ${id}`,
    location: `${city}, Pakistan · On-site`,
    cityKey,
    jobUrl: `https://www.linkedin.com/jobs/view/${id}`,
    workMode: "On-site",
    salaryRange: "Salary not disclosed",
    experienceLevel: "Mid-Level",
    coreSkills: ["React", "TypeScript"],
    extraSkills: [],
    platformSources: ["linkedin"],
    whyRecommended: "",
    talkingPoints: [],
    sourceAts: "direct-portal",
    ...extra,
  };
}

describe("scrapeAndEvaluateLiveJobs", () => {
  beforeEach(() => {
    fetchJSearchJobs.mockReset();
    keysConfigured = true;
  });

  it("searches the candidate's own city and ranks Islamabad → Rawalpindi → Lahore → Karachi", async () => {
    fetchJSearchJobs.mockResolvedValue({
      status: "ok",
      jobs: [
        liveJob("khi", "Karachi", "karachi"),
        liveJob("lhr", "Lahore", "lahore"),
        liveJob("rwp", "Rawalpindi", "rawalpindi"),
        liveJob("isb", "Islamabad", "islamabad"),
      ],
    });

    const { jobs, localSearch } = await scrapeAndEvaluateLiveJobs({
      candidateLocation: "Islamabad, Pakistan",
      candidateSkills: "React, Node.js",
      targetRole: "React Developer",
    });

    expect(fetchJSearchJobs).toHaveBeenCalledWith({ role: "React Developer", city: "Islamabad", countryCode: "PK" });
    expect(localSearch).toBe("ok");
    expect(jobs.map((j) => j.id)).toEqual(["jsearch-isb", "jsearch-rwp", "jsearch-lhr", "jsearch-khi"]);
    expect(jobs.map((j) => j.proximityTier)).toEqual(["same-city", "nearby", "same-country", "same-country"]);
    expect(jobs[0].matchedSkills).toEqual(["React"]);
    expect(jobs[3].isLocationMatch).toBe(false);
  });

  it("searches Lahore for a Lahore user and Rawalpindi for a Rawalpindi user", async () => {
    fetchJSearchJobs.mockResolvedValue({ status: "ok", jobs: [] });
    await scrapeAndEvaluateLiveJobs({ candidateLocation: "Lahore, Pakistan", targetRole: "Designer" });
    await scrapeAndEvaluateLiveJobs({ candidateLocation: "Rawalpindi", targetRole: "Designer" });
    expect(fetchJSearchJobs.mock.calls.map(([args]) => (args as { city: string }).city)).toEqual(["Lahore", "Rawalpindi"]);
  });

  it("uses the real GPS distance when the posting has coordinates", async () => {
    fetchJSearchJobs.mockResolvedValue({
      status: "ok",
      jobs: [liveJob("far", "Islamabad", "islamabad", { jobLat: 33.73, jobLng: 73.09 }), liveJob("near", "Islamabad", "islamabad", { jobLat: 33.66, jobLng: 73.15 })],
    });
    const { jobs } = await scrapeAndEvaluateLiveJobs({ candidateLocation: "Islamabad, Pakistan", candidateCoords: { lat: 33.6518, lng: 73.1566 } });
    expect(jobs[0].id).toBe("jsearch-near");
    expect(jobs[0].distanceKm).toBeLessThan(jobs[1].distanceKm!);
  });

  it("lists no jobs at all (not even remote ones) when no job-search API key is set", async () => {
    keysConfigured = false;
    const remoteFeed = vi.fn();
    vi.stubGlobal("fetch", remoteFeed);
    const result = await scrapeAndEvaluateLiveJobs({ candidateLocation: "Islamabad, Pakistan" });
    vi.unstubAllGlobals();

    expect(result).toEqual({ jobs: [], localSearch: "not-configured", localProviders: [] });
    expect(fetchJSearchJobs).not.toHaveBeenCalled();
    expect(remoteFeed).not.toHaveBeenCalled();
  });

  it("contains no hard-coded companies: a city with no postings gives an empty list", async () => {
    fetchJSearchJobs.mockResolvedValue({ status: "ok", jobs: [] });
    const { jobs } = await scrapeAndEvaluateLiveJobs({ candidateLocation: "Gilgit, Pakistan" });
    expect(jobs).toEqual([]);
  });

  it("searches abroad in the user's own country", async () => {
    fetchJSearchJobs.mockResolvedValue({
      status: "ok",
      jobs: [liveJob("dxb", "Dubai", "dubai", { location: "Dubai, United Arab Emirates · On-site" })],
    });
    const { jobs } = await scrapeAndEvaluateLiveJobs({ candidateLocation: "Dubai, United Arab Emirates", countryCode: "AE" });
    expect(fetchJSearchJobs).toHaveBeenCalledWith(expect.objectContaining({ city: "Dubai", countryCode: "AE" }));
    expect(jobs[0].proximityTier).toBe("same-city");
  });

  it("filters by source and work mode", async () => {
    fetchJSearchJobs.mockResolvedValue({
      status: "ok",
      jobs: [liveJob("a", "Islamabad", "islamabad"), liveJob("b", "Islamabad", "islamabad", { platformSources: ["indeed"], workMode: "Hybrid" })],
    });
    const { jobs } = await scrapeAndEvaluateLiveJobs({ candidateLocation: "Islamabad", platform: "indeed" });
    expect(jobs.map((j) => j.id)).toEqual(["jsearch-b"]);
    const remoteOnly = await scrapeAndEvaluateLiveJobs({ candidateLocation: "Islamabad", workMode: "Remote" });
    expect(remoteOnly.jobs).toEqual([]);
  });
});

describe("helpers", () => {
  it("does not count remote roles restricted to other countries as matches", () => {
    expect(isRemoteOpenToPakistan("Remote (USA Only)")).toBe(false);
    expect(isRemoteOpenToPakistan("Remote (Worldwide)")).toBe(true);
    expect(isRemoteOpenToPakistan("Remote (APAC)")).toBe(true);
  });

  it("builds city search links, with Rozee.pk only inside Pakistan", () => {
    const pk = buildJobBoardSearchLinks("React Developer", "Islamabad", "Islamabad, Pakistan", "PK");
    expect(pk.map((l) => l.platform)).toEqual(["linkedin", "indeed", "rozee", "googlejobs"]);
    expect(pk[0].url).toContain("location=Islamabad%2C%20Pakistan");
    expect(pk[1].url).toContain("pk.indeed.com");

    const ae = buildJobBoardSearchLinks("React Developer", "Dubai", "Dubai, United Arab Emirates", "AE");
    expect(ae.map((l) => l.platform)).toEqual(["linkedin", "indeed", "googlejobs"]);
    expect(ae[1].url).toContain("www.indeed.com");
  });
});
