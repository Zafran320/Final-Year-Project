import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCareerProfileByUserId: vi.fn(),
  storagePut: vi.fn(),
  storageGetSignedUrl: vi.fn(),
  storageGetBuffer: vi.fn(),
  upsertCareerProfile: vi.fn(),
  extractResumeSuggestions: vi.fn(),
}));

vi.mock("../db", () => ({
  getCareerProfileByUserId: mocks.getCareerProfileByUserId,
  upsertCareerProfile: mocks.upsertCareerProfile,
}));

vi.mock("../storage", () => ({ storagePut: mocks.storagePut, storageGetSignedUrl: mocks.storageGetSignedUrl, storageGetBuffer: mocks.storageGetBuffer }));
vi.mock("../gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../gemini")>();
  return { ...actual, extractResumeSuggestions: mocks.extractResumeSuggestions };
});

import { resumeSuggestionSchema } from "../gemini";
import { careerProfileInput, careerProfileRouter, profileIsComplete } from "./careerProfile";

const testUser = {
  id: 42, openId: "career-profile-test-user", email: "ayesha@example.com", name: "Ayesha Khan", loginMethod: "manus", role: "user" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

describe("career profile contract", () => {
  beforeEach(() => {
    mocks.extractResumeSuggestions.mockReset();
    mocks.extractResumeSuggestions.mockRejectedValue(new Error("AI unavailable in this test"));
    mocks.storageGetSignedUrl.mockReset();
    mocks.storageGetBuffer.mockReset();
    mocks.storageGetBuffer.mockResolvedValue(null);
    mocks.upsertCareerProfile.mockReset();
  });

  function createCaller() {
    return careerProfileRouter.createCaller({ user: testUser } as never);
  }

  it("returns null instead of undefined when a signed-in user has no profile", async () => {
    mocks.getCareerProfileByUserId.mockResolvedValue(undefined);
    await expect(createCaller().get()).resolves.toBeNull();
  });

  it("accepts only a complete, valid core career profile", () => {
    const profile = careerProfileInput.parse({ fullName: "Ayesha Khan", education: "Bachelor's", careerStatus: "seeking", targetRole: "Junior Software Engineer", skills: "TypeScript, React, SQL" });
    expect(profileIsComplete(profile)).toBe(true);
    expect(() => careerProfileInput.parse({ careerStatus: "between jobs" })).toThrow();
  });

  it("persists readiness through the authenticated save procedure", async () => {
    mocks.upsertCareerProfile.mockResolvedValue({ id: 1, userId: testUser.id, isComplete: true });
    const result = await createCaller().save({ fullName: "Ayesha Khan", education: "Bachelor's", careerStatus: "seeking", targetRole: "Junior Software Engineer", skills: "React, TypeScript, SQL" });
    expect(mocks.upsertCareerProfile).toHaveBeenCalledWith(testUser.id, expect.objectContaining({ fullName: "Ayesha Khan", isComplete: true }));
    expect(result.isComplete).toBe(true);
  });

  it("persists reviewed resume-derived contact, link, and professional-record fields through the protected save boundary", async () => {
    mocks.upsertCareerProfile.mockResolvedValue({ id: 1, userId: testUser.id, isComplete: false });

    await createCaller().save({
      location: "Lahore, Pakistan",
      phone: "+92 300 0000000",
      contactEmail: "candidate@example.com",
      linkedinUrl: "https://www.linkedin.com/in/candidate",
      portfolioUrl: "https://candidate.dev",
      professionalSummary: "Entry-level engineer focused on web applications.",
      certifications: "Cloud foundations",
      languages: "Urdu, English",
      projects: "Career preparation platform",
    });

    expect(mocks.upsertCareerProfile).toHaveBeenCalledWith(testUser.id, expect.objectContaining({
      location: "Lahore, Pakistan",
      phone: "+92 300 0000000",
      contactEmail: "candidate@example.com",
      linkedinUrl: "https://www.linkedin.com/in/candidate",
      portfolioUrl: "https://candidate.dev/",
      professionalSummary: "Entry-level engineer focused on web applications.",
      certifications: "Cloud foundations",
      languages: "Urdu, English",
      projects: "Career preparation platform",
    }));
  });

  it("canonicalizes public profile links to HTTPS and strips unsafe protocols at the protected save boundary", async () => {
    mocks.upsertCareerProfile.mockResolvedValue({ id: 1, userId: testUser.id, isComplete: false });

    await createCaller().save({ linkedinUrl: "linkedin.com/in/candidate", portfolioUrl: "javascript:alert(1)" });

    expect(mocks.upsertCareerProfile).toHaveBeenCalledWith(testUser.id, expect.objectContaining({
      linkedinUrl: "https://linkedin.com/in/candidate",
      portfolioUrl: null,
    }));
  });

  it("stores validated resume metadata only after secure storage accepts the file", async () => {
    mocks.storagePut.mockResolvedValue({ key: "users/42/resumes/cv_hash.pdf", url: "/manus-storage/users/42/resumes/cv_hash.pdf" });
    mocks.upsertCareerProfile.mockResolvedValue({ id: 1, userId: testUser.id, resumeName: "Ayesha-CV.pdf" });
    await createCaller().uploadResume({ fileName: "Ayesha CV.pdf", mimeType: "application/pdf", contentBase64: Buffer.from("sample resume content").toString("base64") });
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^users\/42\/resumes\//), expect.any(Buffer), "application/pdf");
    expect(mocks.upsertCareerProfile).toHaveBeenCalledWith(testUser.id, expect.objectContaining({ resumeKey: "users/42/resumes/cv_hash.pdf", resumeUrl: "/manus-storage/users/42/resumes/cv_hash.pdf", resumeName: "Ayesha-CV.pdf", resumeMimeType: "application/pdf", resumeReviewCache: null, resumeReviewCacheKey: null }));
  });

  it("returns quickly after saving the resume and leaves AI analysis to a separate protected mutation", async () => {
    mocks.storagePut.mockResolvedValue({ key: "users/42/resumes/cv.pdf", url: "/manus-storage/users/42/resumes/cv.pdf" });
    mocks.upsertCareerProfile.mockResolvedValue({ id: 1, userId: testUser.id, resumeName: "Ayesha-CV.pdf", resumeKey: "users/42/resumes/cv.pdf", resumeMimeType: "application/pdf" });

    const result = await createCaller().uploadResume({ fileName: "Ayesha CV.pdf", mimeType: "application/pdf", contentBase64: Buffer.from("resume bytes").toString("base64") });

    expect(result.suggestions).toBeNull();
    expect(result.aiMessage).toContain("review is ready");
    expect(mocks.extractResumeSuggestions).not.toHaveBeenCalled();
  });

  it("returns a schema-valid private cached review for the same user-owned resume without re-reading storage or Gemini", async () => {
    const fieldEvidence = Object.fromEntries([
      "fullName", "location", "phone", "contactEmail", "linkedinUrl", "portfolioUrl", "age", "education", "degree", "careerStatus", "currentJob", "company", "lookingFor", "careerField", "targetRole", "skills", "experience", "professionalSummary", "certifications", "languages", "projects", "verifiedDetails",
    ].map((field) => [field, { confidence: 0, sourceText: "" }]));
    const cachedSuggestions = resumeSuggestionSchema.parse({
      fullName: "Ayesha Khan", location: "", phone: "", contactEmail: "", linkedinUrl: "", portfolioUrl: "", age: 0,
      education: "Bachelor's", degree: "BS Computer Science", careerStatus: "seeking", currentJob: "", company: "", lookingFor: "First Job", careerField: "Software engineering", targetRole: "Junior Software Engineer", skills: ["React", "TypeScript"], experience: "Intern at Example Co.", professionalSummary: "", certifications: [], languages: [], projects: [], verifiedDetails: [],
      fieldEvidence,
    });
    mocks.getCareerProfileByUserId.mockResolvedValue({
      resumeKey: "users/42/resumes/cv.pdf", resumeMimeType: "application/pdf", resumeReviewCacheKey: "resume-review-v3:users/42/resumes/cv.pdf", resumeReviewCache: JSON.stringify(cachedSuggestions),
    });

    await expect(createCaller().analyzeResume()).resolves.toMatchObject({ suggestions: cachedSuggestions, aiMessage: null, source: "cached" });
    expect(mocks.storageGetSignedUrl).not.toHaveBeenCalled();
    expect(mocks.extractResumeSuggestions).not.toHaveBeenCalled();
  });

  it("bypasses an obsolete cache contract and reseeds the current review contract from the user-owned resume", async () => {
    mocks.getCareerProfileByUserId.mockResolvedValue({
      resumeKey: "users/42/resumes/cv.pdf", resumeMimeType: "application/pdf", resumeReviewCacheKey: "resume-review-v2:users/42/resumes/cv.pdf", resumeReviewCache: JSON.stringify({ outdated: true }),
    });
    mocks.storageGetSignedUrl.mockResolvedValue("https://storage.example/resume.pdf");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("%PDF-1.7\nresume bytes", { status: 200 }));
    mocks.extractResumeSuggestions.mockResolvedValue({ fullName: "Ayesha Khan", age: 0, education: "Bachelor's", degree: "BS Computer Science", careerStatus: "seeking", currentJob: "", company: "", lookingFor: "First Job", careerField: "Software engineering", targetRole: "Junior Software Engineer", skills: ["React"], experience: "", fieldEvidence: {} });

    await expect(createCaller().analyzeResume()).resolves.toMatchObject({ source: "fresh", suggestions: { fullName: "Ayesha Khan" } });
    expect(mocks.storageGetSignedUrl).toHaveBeenCalledWith("users/42/resumes/cv.pdf");
    expect(mocks.extractResumeSuggestions).toHaveBeenCalledWith(expect.any(Buffer), "application/pdf");
    expect(mocks.upsertCareerProfile).toHaveBeenCalledWith(testUser.id, expect.objectContaining({ resumeReviewCacheKey: "resume-review-v3:users/42/resumes/cv.pdf" }));
  });

  it("returns validated Gemini suggestions from the separate protected analysis mutation", async () => {
    mocks.getCareerProfileByUserId.mockResolvedValue({ resumeKey: "users/42/resumes/cv.pdf", resumeMimeType: "application/pdf" });
    mocks.storageGetSignedUrl.mockResolvedValue("https://storage.example/resume.pdf");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("%PDF-1.7\nresume bytes", { status: 200 }));
    mocks.extractResumeSuggestions.mockResolvedValue({ fullName: "Ayesha Khan", age: 0, education: "Bachelor's", degree: "BS Computer Science", careerStatus: "seeking", currentJob: "", company: "", lookingFor: "First Job", careerField: "Software engineering", targetRole: "Junior Software Engineer", skills: ["React", "TypeScript"], experience: "Built a final-year web application.", fieldEvidence: {} });

    const result = await createCaller().analyzeResume();

    expect(result.suggestions?.targetRole).toBe("Junior Software Engineer");
    expect(result.aiMessage).toBeNull();
    expect(result.source).toBe("fresh");
    expect(mocks.extractResumeSuggestions).toHaveBeenCalledWith(expect.any(Buffer), "application/pdf");
    expect(mocks.upsertCareerProfile).toHaveBeenCalledWith(testUser.id, expect.objectContaining({ resumeReviewCacheKey: "resume-review-v3:users/42/resumes/cv.pdf" }));
  });

  it("issues a fresh signed URL for a secure browser-compatible resume preview", async () => {
    mocks.getCareerProfileByUserId.mockResolvedValue({
      resumeKey: "users/42/resumes/cv.pdf",
      resumeName: "Ayesha-CV.pdf",
      resumeMimeType: "application/pdf",
      resumeUrl: "/manus-storage/users/42/resumes/cv.pdf",
    });
    mocks.storageGetSignedUrl.mockResolvedValue("https://storage.example/signed-cv.pdf?temporary-token");

    await expect(createCaller().previewResume()).resolves.toEqual({
      url: "https://storage.example/signed-cv.pdf?temporary-token",
      mimeType: "application/pdf",
      name: "Ayesha-CV.pdf",
    });
    expect(mocks.storageGetSignedUrl).toHaveBeenCalledWith("users/42/resumes/cv.pdf");
  });

  it("stores a signature-validated profile photo under an authenticated user key", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    mocks.storagePut.mockResolvedValue({ key: "users/42/profile-photos/photo.png", url: "/manus-storage/users/42/profile-photos/photo.png" });
    mocks.upsertCareerProfile.mockResolvedValue({ id: 1, userId: testUser.id, profilePhotoUrl: "/manus-storage/users/42/profile-photos/photo.png" });

    await createCaller().uploadProfilePhoto({ mimeType: "image/png", contentBase64: png.toString("base64") });

    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^users\/42\/profile-photos\/[\w-]+\.png$/), expect.any(Buffer), "image/png");
    expect(mocks.upsertCareerProfile).toHaveBeenCalledWith(testUser.id, expect.objectContaining({ profilePhotoMimeType: "image/png", profilePhotoSize: png.length }));
  });

  it("rejects a profile photo whose byte signature does not match its declared image type", async () => {
    mocks.storagePut.mockClear();
    await expect(createCaller().uploadProfilePhoto({ mimeType: "image/png", contentBase64: Buffer.from("not an image").toString("base64") })).rejects.toThrow("valid JPEG, PNG, or WebP image");
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("removes profile-photo metadata while keeping the user-owned preparation profile", async () => {
    mocks.upsertCareerProfile.mockResolvedValue({ id: 1, userId: testUser.id, profilePhotoUrl: null });

    await createCaller().removeProfilePhoto();

    expect(mocks.upsertCareerProfile).toHaveBeenCalledWith(testUser.id, {
      profilePhotoKey: null,
      profilePhotoUrl: null,
      profilePhotoSize: null,
      profilePhotoMimeType: null,
    });
  });
});
