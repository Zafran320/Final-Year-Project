import { afterEach, describe, expect, it, vi } from "vitest";
import { compactResumeSourceText, compactResumeSourceTextLimit, extractExplicitAgeHint, extractResumeSuggestions, geminiResumeFallbackTimeoutMs, geminiResumeRequestTimeoutMs, mergeQualificationRecovery, normalizePublicHttpsUrl, normalizeResumePayload, parseGeminiJson, resumeSuggestionSchema } from "./gemini";

const evidence = { confidence: 0.92, sourceText: "Ayesha Khan" };
const absentEvidence = { confidence: 0, sourceText: "" };
const validSuggestions = {
  fullName: "Ayesha Khan", location: "", phone: "", contactEmail: "", linkedinUrl: "", portfolioUrl: "", age: 0, education: "Bachelor's", degree: "BS Computer Science", careerStatus: "seeking", currentJob: "", company: "", lookingFor: "First Job", careerField: "Software engineering", targetRole: "Junior Software Engineer", skills: ["React", "TypeScript"], experience: "Built a final-year web application.", professionalSummary: "", certifications: [], languages: [], projects: [], verifiedDetails: [],
  fieldEvidence: { fullName: evidence, location: absentEvidence, phone: absentEvidence, contactEmail: absentEvidence, linkedinUrl: absentEvidence, portfolioUrl: absentEvidence, age: absentEvidence, education: evidence, degree: evidence, careerStatus: evidence, currentJob: absentEvidence, company: absentEvidence, lookingFor: evidence, careerField: evidence, targetRole: evidence, skills: evidence, experience: evidence, professionalSummary: absentEvidence, certifications: absentEvidence, languages: absentEvidence, projects: absentEvidence, verifiedDetails: absentEvidence },
};

describe("Gemini resume extraction", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("extracts the JSON object when a provider adds harmless commentary or a fenced label", () => {
    expect(parseGeminiJson('Here is the result:\n```JSON5\n{"fullName":"Ayesha Khan","skills":["React"]}\n```\n')).toEqual({ fullName: "Ayesha Khan", skills: ["React"] });
  });

  it("falls back to a native inline PDF part and returns validated suggestions when local parsing cannot read the bytes", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(validSuggestions) }] } }] }), { status: 200, headers: { "content-type": "application/json" } }));

    const result = await extractResumeSuggestions(Buffer.from("pdf-bytes"), "application/pdf");

    expect(result).toEqual(validSuggestions);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.contents[0].parts[1]?.inline_data?.mime_type).toBe("application/pdf");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("normalizes provider-safe unknown enums and unavailable evidence excerpts", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const providerSuggestions = { ...validSuggestions, education: "unknown", careerStatus: "unknown", lookingFor: "unknown", fieldEvidence: { ...validSuggestions.fieldEvidence, skills: { confidence: 0.8, sourceText: null }, experience: { confidence: 0.7 }, projects: { confidence: 0.86, sourceText: "x".repeat(400) } } };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(providerSuggestions) }] } }] }), { status: 200 }));

    const result = await extractResumeSuggestions(Buffer.from("pdf-bytes"), "application/pdf");

    expect(result.education).toBe("");
    expect(result.careerStatus).toBe("");
    expect(result.lookingFor).toBe("");
    expect(result.fieldEvidence.skills.sourceText).toBe("");
    expect(result.fieldEvidence.experience.sourceText).toBe("");
    expect(result.fieldEvidence.projects.sourceText).toHaveLength(360);
  });

  it("drops evidence that is not quoted from the parsed resume text", () => {
    const normalized = normalizeResumePayload({
      ...validSuggestions,
      fieldEvidence: {
        ...validSuggestions.fieldEvidence,
        fullName: { confidence: 0.95, sourceText: "Ayesha Khan" },
        targetRole: { confidence: 0.99, sourceText: "Invented role title" },
      },
    }, "Ayesha Khan\nBS Computer Science") as typeof validSuggestions;

    expect(normalized.fieldEvidence.fullName).toEqual({ confidence: 0.95, sourceText: "Ayesha Khan" });
    expect(normalized.fieldEvidence.targetRole).toEqual({ confidence: 0, sourceText: "" });
  });

  it("normalizes common education aliases, duplicate skills, structured qualifications, projects, array experience, and an explicit age source", () => {
    const normalized = normalizeResumePayload({
      ...validSuggestions,
      age: "0",
      education: "BSc",
      skills: ["React", "react", " TypeScript "],
      experience: ["Intern at Atlas — Lahore | 2025", "Volunteer at FutureMaker — Remote | 2024"],
      certifications: [{ name: "AWS Cloud Practitioner", issuer: "Amazon Web Services", credentialId: "AWS-123", issuedOn: "Jun 2025", link: "https://example.com/aws" }, { name: "aws cloud practitioner", issuer: "Duplicate", credentialId: "", issuedOn: "", link: "" }],
      languages: [{ name: "Urdu", proficiency: "native" }, { name: "English", proficiency: "fluent" }, { name: "urdu", proficiency: "Basic" }],
      projects: [{ name: "FutureMaker AI", summary: "Interview rehearsal platform", link: "github.com/example/futuremaker", technologies: ["React", "react", " TypeScript "] }],
    }, "Ayesha Khan\nAge: 23\nBSc Computer Science") as typeof validSuggestions;

    expect(normalized.age).toBe(23);
    expect(normalized.education).toBe("Bachelor's");
    expect(normalized.skills).toEqual(["React", "TypeScript"]);
    expect(normalized.experience).toBe("Intern at Atlas — Lahore | 2025; Volunteer at FutureMaker — Remote | 2024");
    expect(normalized.certifications).toEqual([{ name: "AWS Cloud Practitioner", issuer: "Amazon Web Services", credentialId: "AWS-123", issuedOn: "Jun 2025", link: "https://example.com/aws" }]);
    expect(normalized.languages).toEqual([{ name: "Urdu", proficiency: "Native" }, { name: "English", proficiency: "Professional" }]);
    expect(normalized.projects).toEqual([{ name: "FutureMaker AI", summary: "Interview rehearsal platform", link: "https://github.com/example/futuremaker", technologies: ["React", "TypeScript"] }]);
    expect(normalized.fieldEvidence.age).toEqual({ confidence: 0.98, sourceText: "Age: 23" });
    expect(resumeSuggestionSchema.parse(normalized)).toMatchObject({ age: 23, education: "Bachelor's" });
  });

  it("canonicalizes extracted public links to HTTPS, rejects unsafe formats, and keeps all distinct skills within the review limit", () => {
    const skills = Array.from({ length: 43 }, (_, index) => `Skill ${index + 1}`);
    const normalized = normalizeResumePayload({
      ...validSuggestions,
      linkedinUrl: "linkedin.com/in/ayesha-khan",
      portfolioUrl: "http://ayesha.dev/work",
      skills,
      certifications: [{ name: "Cloud Certificate", issuer: "AWS", credentialId: "AWS-123", issuedOn: "2026", link: "www.example.com/credentials/aws" }],
      projects: [{ name: "FutureMaker", summary: "Interview practice", link: "github.com/example/futuremaker", technologies: ["React"] }],
    }) as typeof validSuggestions;

    expect(normalized.linkedinUrl).toBe("https://linkedin.com/in/ayesha-khan");
    expect(normalized.portfolioUrl).toBe("https://ayesha.dev/work");
    expect(normalized.certifications[0]?.link).toBe("https://www.example.com/credentials/aws");
    expect(normalized.projects[0]?.link).toBe("https://github.com/example/futuremaker");
    expect(normalized.skills).toHaveLength(40);
    expect(normalized.skills.at(-1)).toBe("Skill 40");
    expect(normalizePublicHttpsUrl("javascript:alert(1)")).toBe("");
    expect(normalizePublicHttpsUrl("https://user:pass@example.com")).toBe("");
    expect(normalizePublicHttpsUrl("localhost:3000/private")).toBe("");
  });

  it("removes repeated parsed-resume lines and retains the opening and final sections within the compact AI input budget", () => {
    const documentText = ["Opening profile", ...Array.from({ length: 4000 }, (_, index) => `Experience line ${index}`), "Closing credential"].join("\n");
    const compacted = compactResumeSourceText(`${documentText}\nOpening profile\nOpening profile`);

    expect(compacted.length).toBeLessThanOrEqual(compactResumeSourceTextLimit + 40);
    expect(compacted).toContain("Opening profile");
    expect(compacted).toContain("Closing credential");
    expect(compacted.split("\n").filter((line) => line === "Opening profile")).toHaveLength(1);
  });

  it("converts object-shaped experience records into timeline text and recovers explicitly stated education", () => {
    const normalized = normalizeResumePayload({
      ...validSuggestions,
      education: "",
      degree: "",
      careerStatus: "",
      currentJob: "",
      company: "",
      certifications: [],
      experience: [
        { title: "Software Engineering Intern", company: "Atlas", location: "Lahore", dates: "Jun 2025 – Present", description: "Built resume review workflows." },
        { role: "Volunteer", organization: "FutureMaker", period: "2024" },
      ],
    }, "Education\nBachelor of Science in Computer Science\nExperience\nAWS Certified Developer Certificate") as typeof validSuggestions;

    expect(normalized.education).toBe("Bachelor's");
    expect(normalized.degree).toBe("Bachelor of Science in Computer Science");
    expect(normalized.experience).toContain("Software Engineering Intern at Atlas — Lahore | Jun 2025 – Present Built resume review workflows.");
    expect(normalized.experience).toContain("Volunteer at FutureMaker — 2024");
    expect(normalized.experience).not.toContain("[object Object]");
    expect(normalized.careerStatus).toBe("working");
    expect(normalized.currentJob).toBe("Software Engineering Intern");
    expect(normalized.company).toBe("Atlas");
    expect(normalized.certifications).toEqual([{ name: "AWS Certified Developer Certificate", issuer: "", credentialId: "", issuedOn: "", link: "" }]);
    expect(normalized.fieldEvidence.degree.sourceText).toBe("Bachelor of Science in Computer Science");
  });

  it("keeps only unique verified details quoted from the parsed resume text", () => {
    const normalized = normalizeResumePayload({
      ...validSuggestions,
      verifiedDetails: [
        { category: "Award", title: "Competition recognition", detail: "Runner-up in a university innovation challenge" },
        { category: "Award", title: "Competition recognition", detail: "Runner-up in a university innovation challenge" },
        { category: "Other", title: "Unsupported", detail: "Invented accomplishment" },
      ],
    }, "Awards\nRunner-up in a university innovation challenge") as typeof validSuggestions;

    expect(normalized.verifiedDetails).toEqual([{ category: "Award", title: "Competition recognition", detail: "Runner-up in a university innovation challenge" }]);
    expect(resumeSuggestionSchema.parse(normalized).verifiedDetails).toHaveLength(1);
  });

  it("calculates an age only from an explicit date of birth", () => {
    expect(extractExplicitAgeHint("DOB: 18/05/2003", new Date("2026-08-26T00:00:00Z"))).toEqual({ age: 23, sourceText: "DOB: 18/05/2003" });
    expect(extractExplicitAgeHint("Motivated software graduate", new Date("2026-08-26T00:00:00Z"))).toBeNull();
  });

  it("merges only missing explicit qualification recovery details into the primary result", () => {
    const primary = { ...validSuggestions, certifications: [{ name: "Cloud Practitioner", issuer: "", credentialId: "", issuedOn: "", link: "" }], languages: [], projects: [{ name: "FutureMaker", summary: "", link: "", technologies: [] }] };
    const recovered = {
      certifications: [{ name: "Cloud Practitioner", issuer: "Amazon Web Services", credentialId: "AWS-123", issuedOn: "Jun 2025", link: "https://example.com/aws" }],
      languages: [{ name: "Urdu", proficiency: "Native" as const }],
      projects: [{ name: "FutureMaker", summary: "Interview preparation platform", link: "https://example.com/futuremaker", technologies: ["React"] }],
      fieldEvidence: { certifications: evidence, languages: evidence, projects: evidence },
    };

    const merged = mergeQualificationRecovery(primary, recovered);

    expect(merged.certifications).toEqual([expect.objectContaining({ issuer: "Amazon Web Services", credentialId: "AWS-123" })]);
    expect(merged.languages).toEqual([{ name: "Urdu", proficiency: "Native" }]);
    expect(merged.projects).toEqual([expect.objectContaining({ summary: "Interview preparation platform", technologies: ["React"] })]);
    expect(merged.fieldEvidence.languages).toEqual(evidence);
  });

  it("rejects malformed structured output", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{not-json}" }] } }] }), { status: 200 }));

    await expect(extractResumeSuggestions(Buffer.from("pdf-bytes"), "application/pdf")).rejects.toThrow("could not return a readable resume review");
  });

  it("retries malformed primary JSON with a compact partial payload and fills unknown fields safely", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const compactPayload = {
      fullName: "Ayesha Khan",
      skills: "React, TypeScript, react",
      fieldEvidence: {
        fullName: { confidence: "0.94", sourceText: "Ayesha Khan" },
        skills: { confidence: 0.81, sourceText: "React" },
      },
    };
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{truncated-json" }] } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(compactPayload) }] } }] }), { status: 200 }));

    const result = await extractResumeSuggestions(Buffer.from("pdf-bytes"), "application/pdf");

    expect(result).toMatchObject({ fullName: "Ayesha Khan", skills: ["React", "TypeScript"], education: "", careerStatus: "", lookingFor: "", experience: "" });
    expect(result.fieldEvidence.fullName).toEqual({ confidence: 0.94, sourceText: "Ayesha Khan" });
    expect(result.fieldEvidence.experience).toEqual(absentEvidence);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const compactRequest = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(compactRequest.generationConfig.responseSchema).toBeUndefined();
    expect(String(compactRequest.contents[0].parts[0].text)).not.toContain("fieldEvidence");
  });

  it("rejects evidence confidence values outside the 0 to 1 range", () => {
    expect(() => resumeSuggestionSchema.parse({ ...validSuggestions, fieldEvidence: { ...validSuggestions.fieldEvidence, targetRole: { confidence: 1.2, sourceText: "Junior Software Engineer" } } })).toThrow();
  });

  it("returns a precise message when Gemini rejects an unreadable PDF", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("invalid pdf", { status: 400 }));

    await expect(extractResumeSuggestions(Buffer.from("pdf-bytes"), "application/pdf")).rejects.toThrow("could not read this PDF");
  });

  it("returns a user-safe message when the free-tier limit is reached", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("quota", { status: 429 }));

    await expect(extractResumeSuggestions(Buffer.from("pdf-bytes"), "application/pdf")).rejects.toThrow("free-tier limit");
  });

  it("retries a temporary high-demand provider response once before returning a valid resume review", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("temporarily busy", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(validSuggestions) }] } }] }), { status: 200 }));

    await expect(extractResumeSuggestions(Buffer.from("pdf-bytes"), "application/pdf")).resolves.toEqual(validSuggestions);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to the compact JSON request when the primary structured Gemini request times out", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new DOMException("The operation was aborted due to timeout", "TimeoutError"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: `\`\`\`json\n${JSON.stringify(validSuggestions)}\n\`\`\`` }] } }] }), { status: 200 }));

    await expect(extractResumeSuggestions(Buffer.from("pdf-bytes"), "application/pdf")).resolves.toEqual(validSuggestions);

    expect(geminiResumeRequestTimeoutMs).toBe(35_000);
    expect(geminiResumeFallbackTimeoutMs).toBe(20_000);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    const primary = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const fallback = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(primary.generationConfig.responseSchema).toBeTruthy();
    expect(primary.generationConfig.maxOutputTokens).toBe(4096);
    expect(fallback.generationConfig.responseSchema).toBeUndefined();
    expect(fallback.generationConfig.maxOutputTokens).toBe(2048);
  });

  it("returns the safe retry message only after both bounded Gemini requests time out", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));

    await expect(extractResumeSuggestions(Buffer.from("pdf-bytes"), "application/pdf")).rejects.toThrow("taking longer than usual");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
