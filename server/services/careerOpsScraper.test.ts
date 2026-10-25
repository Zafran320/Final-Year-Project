import { describe, expect, it } from "vitest";
import { scrapeAndEvaluateLiveJobs } from "./careerOpsScraper";

describe("careerOpsScraper", () => {
  it("prioritizes candidate's city (Lahore) and matches verified skills", async () => {
    const jobs = await scrapeAndEvaluateLiveJobs({
      candidateLocation: "Lahore, Pakistan",
      candidateSkills: "React, TypeScript, Node.js, SQL, Tailwind CSS",
      targetRole: "Full Stack Engineer",
    });

    expect(jobs.length).toBeGreaterThan(0);
    const topJob = jobs[0];
    expect(topJob.isLocationMatch).toBe(true);
    expect(topJob.locationMatchReason).toContain("Lahore, Pakistan");
    expect(topJob.company).toBe("Capregsoft");
    expect(topJob.matchPercentage).toBeGreaterThanOrEqual(80);
    expect(topJob.reportBlocks.blockA).toBeDefined();
    expect(topJob.reportBlocks.blockG).toContain("Verified legitimate corporate hiring pipeline");
  }, 30000);

  it("evaluates global remote jobs when requested", async () => {
    const jobs = await scrapeAndEvaluateLiveJobs({
      candidateLocation: "Islamabad, Pakistan",
      candidateSkills: "TypeScript, Python, FastAPI",
      targetRole: "Backend Engineer",
      workMode: "Remote",
    });

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((j) => j.workMode === "Remote")).toBe(true);
  });

  it("filters jobs by platform source connector", async () => {
    const jobs = await scrapeAndEvaluateLiveJobs({
      candidateLocation: "Lahore, Pakistan",
      candidateSkills: "React, Node.js",
      platform: "github",
    });

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((j) => j.platformSources.includes("github"))).toBe(true);
  });

  it("aggregates live multi-board openings with verified URLs and ATS source", async () => {
    const jobs = await scrapeAndEvaluateLiveJobs({
      candidateLocation: "Karachi, Pakistan",
      candidateSkills: "Python, React, TypeScript, Docker",
      targetRole: "Full Stack Developer",
    });

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.some((j) => j.jobUrl.startsWith("http"))).toBe(true);
    expect(jobs.some((j) => j.coreSkills.length > 0)).toBe(true);
    expect(jobs.some((j) => j.dimensions.technicalFit > 0)).toBe(true);
  });

  it("performs query filtering accurately across title, company, and skills", async () => {
    const jobs = await scrapeAndEvaluateLiveJobs({
      candidateLocation: "Islamabad, Pakistan",
      candidateSkills: "Python, FastAPI, React",
      query: "Meta",
    });

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs.every((j) => j.company.toLowerCase().includes("meta") || j.title.toLowerCase().includes("meta"))).toBe(true);
  });
});
