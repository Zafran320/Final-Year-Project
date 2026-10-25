import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  lookup: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));

import { analyzeCompanyPreparation, companyPreparationInput } from "./companyPreparation";

const brief = {
  companySummary: "A software company building workflow tools.",
  roleSummary: "The role supports frontend product delivery and collaboration.",
  responsibilities: ["Build accessible product interfaces"],
  requiredSkills: ["React", "TypeScript"],
  preferredSkills: ["Testing"],
  technologySignals: ["React", "TypeScript"],
  interviewThemes: ["Frontend decisions"],
  workingStyleSignals: ["Cross-functional collaboration is mentioned in the role material."],
  sourceAttributions: [{ sourceLabel: "Company website", support: "The page describes workflow software." }],
  uncertaintyNotes: ["Verify the current interview stages with the hiring team."],
};

function htmlResponse(body: string) {
  return new Response(body, { status: 200, headers: { "content-type": "text/html" } });
}

describe("company preparation analysis", () => {
  beforeEach(() => {
    mocks.invokeLLM.mockReset();
    mocks.lookup.mockReset().mockResolvedValue([{ address: "93.184.216.34" }]);
    vi.clearAllMocks();
  });

  it("requires a company and target role", () => {
    expect(() => companyPreparationInput.parse({ companyName: "", targetRole: "" })).toThrow();
    expect(companyPreparationInput.parse({ companyName: "Example Co", targetRole: "Frontend Engineer" })).toMatchObject({ links: [], files: [] });
  });

  it("fetches only the selected public source and returns a reviewable ephemeral brief", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(htmlResponse("<html><title>Example Co</title><body>We build workflow software for teams.</body></html>"));
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(brief) } }] });

    const result = await analyzeCompanyPreparation(companyPreparationInput.parse({ companyName: "Example Co", companyWebsite: "https://example.com", targetRole: "Frontend Engineer", jobDescription: "Build product interfaces." }), { careerField: "Software engineering", skills: "React, TypeScript" });

    expect(result.brief).toEqual(brief);
    expect(result.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Example Co", status: "analyzed", kind: "website" }),
      expect.objectContaining({ label: "Role description", status: "analyzed", kind: "job-details" }),
    ]));
    expect(mocks.invokeLLM).toHaveBeenCalledWith(expect.objectContaining({ model: "gemini-3-flash-preview", response_format: expect.objectContaining({ type: "json_schema" }) }));
    expect(JSON.stringify(result)).not.toContain("React, TypeScript");
  });

  it("passes only enabled Account categories to Gemini and explicitly excludes contact and connector fixtures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(htmlResponse("<html><body>Build workflow software for teams.</body></html>"));
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(brief) } }] });

    const result = await analyzeCompanyPreparation(companyPreparationInput.parse({
      companyName: "Example Co",
      companyWebsite: "https://example.com",
      targetRole: "Frontend Engineer",
      profileCategoryIds: ["skills-experience"],
    }), {
      contactEmail: "private@example.com",
      phone: "+92 300 0000000",
      careerField: "Software engineering",
      skills: "React, TypeScript",
      experience: "Frontend projects",
      professionalSummary: "Builds accessible interfaces.",
      projects: "[{\"name\":\"Private project\"}]",
    });

    const prompt = mocks.invokeLLM.mock.calls[0][0].messages[1].content[0].text as string;
    expect(prompt).toContain("skills: React, TypeScript");
    expect(prompt).toContain("experience: Frontend projects");
    expect(prompt).not.toContain("private@example.com");
    expect(prompt).not.toContain("+92 300");
    expect(prompt).not.toContain("careerField: Software engineering");
    expect(prompt).not.toContain("Private project");
    expect(prompt).toContain("LinkedIn, Indeed, GitHub, Upwork, and Fiverr connector fixtures");
    expect(result.accountContext).toEqual({ includedCategoryIds: ["skills-experience"], includedFieldCount: 3, connectorContextIncluded: false, persisted: false });
  });

  it("marks a private or invalid public source unavailable without requesting it", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(brief) } }] });

    const result = await analyzeCompanyPreparation(companyPreparationInput.parse({ companyName: "Example Co", companyWebsite: "http://127.0.0.1:3000/internal", targetRole: "Frontend Engineer", notes: "Focus on the public role description." }), null);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.sources[0]).toMatchObject({ status: "unavailable", detail: "This source URL is not allowed." });
    expect(result.sources.some((source) => source.label === "Preparation notes" && source.status === "analyzed")).toBe(true);
  });

  it("keeps source-fetch failures visible while still allowing other supplied context to be analyzed", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network unavailable"));
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(brief) } }] });

    const result = await analyzeCompanyPreparation(companyPreparationInput.parse({ companyName: "Example Co", companyWebsite: "https://example.com", targetRole: "Frontend Engineer", jobDescription: "Build product interfaces." }), null);

    expect(result.sources[0]).toMatchObject({ status: "unavailable", detail: "network unavailable" });
    expect(result.brief.roleSummary).toContain("frontend");
  });

  it("rejects empty or unreadable source sets before calling Gemini", async () => {
    await expect(analyzeCompanyPreparation(companyPreparationInput.parse({ companyName: "Example Co", targetRole: "Frontend Engineer" }), null)).rejects.toThrow("Add readable company or role material");
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
  });

  it("recovers a partial brief by removing blank optional items and adding a verification note", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(htmlResponse("<body>Role requirements</body>"));
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({
      companySummary: "A software company building workflow tools.",
      responsibilities: ["", "Build product interfaces"],
      requiredSkills: ["React", null],
      sourceAttributions: [{ sourceLabel: "", support: "" }, { sourceLabel: "Company website", support: "The page describes workflow software." }],
      uncertaintyNotes: ["", "Verify interview stages."],
    }) } }] });

    const result = await analyzeCompanyPreparation(companyPreparationInput.parse({ companyName: "Example Co", companyWebsite: "https://example.com", targetRole: "Frontend Engineer" }), null);

    expect(result.brief.companySummary).toBe("A software company building workflow tools.");
    expect(result.brief.roleSummary).toContain("did not return a role summary");
    expect(result.brief.responsibilities).toEqual(["Build product interfaces"]);
    expect(result.brief.requiredSkills).toEqual(["React"]);
    expect(result.brief.sourceAttributions).toEqual([{ sourceLabel: "Company website", support: "The page describes workflow software." }]);
    expect(result.brief.uncertaintyNotes).toEqual(expect.arrayContaining([
      "Verify interview stages.",
      "Some model-provided details were blank or malformed and were omitted. Verify the selected sources before relying on this brief.",
    ]));
  });

  it("fails safely when Gemini returns no usable company or role evidence", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(htmlResponse("<body>Role requirements</body>"));
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({
      companySummary: "", roleSummary: "", responsibilities: [], requiredSkills: [], preferredSkills: [], technologySignals: [], interviewThemes: [], workingStyleSignals: [], sourceAttributions: [], uncertaintyNotes: [],
    }) } }] });

    await expect(analyzeCompanyPreparation(companyPreparationInput.parse({ companyName: "Example Co", companyWebsite: "https://example.com", targetRole: "Frontend Engineer" }), null)).rejects.toThrow("incomplete company brief");
  });

  it("fails safely when Gemini returns unreadable JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(htmlResponse("<body>Role requirements</body>"));
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "not json" } }] });

    await expect(analyzeCompanyPreparation(companyPreparationInput.parse({ companyName: "Example Co", companyWebsite: "https://example.com", targetRole: "Frontend Engineer" }), null)).rejects.toThrow("unreadable company brief");
  });
});
