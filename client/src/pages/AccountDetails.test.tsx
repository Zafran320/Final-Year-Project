/** @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccountDetails, { getPopulatedResumeSuggestionEntries, isCurrentExperience, parseCertificationCards, parseExperienceTimeline, parseLanguageCards, parseProjectCards, projectExternalHref, replaceProfileWithResumeSuggestions, serializeExperienceTimeline, serializeProjectCards, splitSkillTags, type ProfileForm, type ResumeSuggestions } from "./AccountDetails";

const refetch = vi.fn();
const saveProfileMock = vi.fn();
const setLocationMock = vi.fn();
const resumeTestMocks = vi.hoisted(() => ({ uploadResume: vi.fn(), analyzeResume: vi.fn(), previewResume: vi.fn(), removeResume: vi.fn() }));
const projectTestMocks = vi.hoisted(() => ({ profile: null as unknown, repositories: [] as Array<{ sourceLink: string; repository: string; htmlUrl: string; stars: number; forks: number }> }));
const toastTestMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), message: vi.fn(), info: vi.fn(), dismiss: vi.fn() }));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: 1,
      openId: "audit-user",
      name: "Mira Ahmed",
      email: "mira@example.com",
      loginMethod: "google",
      createdAt: new Date("2026-08-01"),
      lastSignedIn: new Date("2026-08-25"),
    },
    loading: false,
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    careerProfile: {
      get: { useQuery: () => ({ data: projectTestMocks.profile, isLoading: false, isError: false, refetch }) },
      githubMetadata: { useQuery: () => ({ data: { repositories: projectTestMocks.repositories }, isFetching: false }) },
      save: { useMutation: () => ({ mutateAsync: saveProfileMock, isPending: false }) },
      uploadResume: { useMutation: () => ({ mutateAsync: resumeTestMocks.uploadResume, isPending: false }) },
      analyzeResume: { useMutation: () => ({ mutateAsync: resumeTestMocks.analyzeResume, isPending: false }) },
      previewResume: { useMutation: () => ({ mutateAsync: resumeTestMocks.previewResume, isPending: false }) },
      removeResume: { useMutation: () => ({ mutateAsync: resumeTestMocks.removeResume, isPending: false }) },
      uploadProfilePhoto: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      removeProfilePhoto: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
    practicePreparation: {
      getLatestSession: { useQuery: () => ({ data: null, isLoading: false }) },
    },
  },
}));

vi.mock("@/components/AccountNavigation", () => ({
  AccountNavigation: ({ onNavigate }: { onNavigate: (destination: string) => void }) => (
    <nav aria-label="Account navigation"><button type="button" onClick={() => onNavigate("practice")}>Practice</button></nav>
  ),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/account", setLocationMock],
}));

vi.mock("sonner", () => ({ toast: toastTestMocks }));

describe("AccountDetails", () => {
  afterEach(() => {
    cleanup();
    refetch.mockReset();
    saveProfileMock.mockReset();
    setLocationMock.mockReset();
    resumeTestMocks.uploadResume.mockReset();
    resumeTestMocks.analyzeResume.mockReset();
    resumeTestMocks.previewResume.mockReset();
    resumeTestMocks.removeResume.mockReset();
    toastTestMocks.success.mockReset();
    toastTestMocks.error.mockReset();
    toastTestMocks.message.mockReset();
    toastTestMocks.info.mockReset();
    toastTestMocks.dismiss.mockReset();
    projectTestMocks.profile = null;
    projectTestMocks.repositories = [];
    vi.restoreAllMocks();
  });

  it("replaces the editable draft with the complete reviewed resume result while retaining account-level preferences", () => {
    const current: ProfileForm = {
      fullName: "Old name", location: "Old city", phone: "0300", contactEmail: "old@example.com", linkedinUrl: "https://linkedin.com/in/old", portfolioUrl: "https://old.dev", age: "33", education: "Master's", degree: "Old degree", careerStatus: "working", currentJob: "Old role", company: "Old company", lookingFor: "Freelance", careerField: "Old field", targetRole: "Old target", skills: "Old skill", experience: "Old experience", professionalSummary: "Old summary", certifications: "Old certification", languages: "Old language", projects: "Old project", verifiedDetails: "Old detail", personalizationEnabled: true, jobRecommendationsEnabled: false, professionalConnectionsEnabled: true,
    };
    const suggestions: ResumeSuggestions = {
      fullName: "Resume name", location: "Lahore", phone: "0300", contactEmail: "resume@example.com", linkedinUrl: "https://linkedin.com/in/resume", portfolioUrl: "https://resume.dev", age: 22, education: "Bachelor's", degree: "BS Computer Science", careerStatus: "seeking", currentJob: "Graduate", company: "CareerTwin", lookingFor: "First Job", careerField: "Engineering", targetRole: "Software Engineer", skills: ["React", "TypeScript"], experience: "Intern at CareerTwin — Lahore | 2025", professionalSummary: "Resume summary", certifications: [{ name: "AWS Certified Cloud Practitioner", issuer: "Amazon Web Services", credentialId: "AWS-123", issuedOn: "Jun 2025", link: "https://example.com/aws" }], languages: [{ name: "Urdu", proficiency: "Native" }, { name: "English", proficiency: "Professional" }], projects: [{ name: "CareerTwin", summary: "Interview preparation platform", link: "github.com/example/careertwin", technologies: ["React", "TypeScript"] }], verifiedDetails: [{ category: "Achievement", title: "Competition recognition", detail: "Runner-up in a university innovation challenge" }], fieldEvidence: {},
    };

    expect(replaceProfileWithResumeSuggestions(current, suggestions)).toMatchObject({
      fullName: "Resume name", location: "Lahore", phone: "0300", contactEmail: "resume@example.com", linkedinUrl: "https://linkedin.com/in/resume", portfolioUrl: "https://resume.dev", age: "22", education: "Bachelor's", degree: "BS Computer Science", careerStatus: "seeking", currentJob: "Graduate", company: "CareerTwin", lookingFor: "First Job", careerField: "Engineering", targetRole: "Software Engineer", skills: "React, TypeScript", experience: "Intern at CareerTwin — Lahore | 2025", professionalSummary: "Resume summary", personalizationEnabled: true, jobRecommendationsEnabled: false, professionalConnectionsEnabled: true,
    });
    expect(parseProjectCards(replaceProfileWithResumeSuggestions(current, suggestions).projects)).toEqual([expect.objectContaining({ name: "CareerTwin", technologies: ["React", "TypeScript"] })]);
    expect(parseCertificationCards(replaceProfileWithResumeSuggestions(current, suggestions).certifications)).toEqual([expect.objectContaining({ name: "AWS Certified Cloud Practitioner", issuer: "Amazon Web Services" })]);
    expect(parseLanguageCards(replaceProfileWithResumeSuggestions(current, suggestions).languages)).toEqual([expect.objectContaining({ name: "Urdu", proficiency: "Native" }), expect.objectContaining({ name: "English", proficiency: "Professional" })]);
    expect(replaceProfileWithResumeSuggestions(current, suggestions).verifiedDetails).toContain("Competition recognition");
  });

  it("counts reviewed resume fields from actual extracted values even when compact extraction has no optional evidence quotes", () => {
    const suggestions = { fullName: "Resume name", targetRole: "Software Engineer", skills: ["React"], age: 0, fieldEvidence: {} } as ResumeSuggestions;

    expect(getPopulatedResumeSuggestionEntries(suggestions)).toEqual([
      { key: "fullName", label: "Full name" },
      { key: "targetRole", label: "Target role" },
      { key: "skills", label: "Skills" },
    ]);
  });

  it("replaces the visible editable form from populated AI review results without relying on evidence quotes", async () => {
    projectTestMocks.profile = { resumeName: "candidate.docx", resumeUrl: "https://example.com/candidate.docx", resumeMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", personalizationEnabled: true, jobRecommendationsEnabled: true, professionalConnectionsEnabled: true };
    resumeTestMocks.analyzeResume.mockResolvedValue({
      suggestions: { fullName: "Resume name", location: "", phone: "", contactEmail: "", linkedinUrl: "", portfolioUrl: "", age: 0, education: "", degree: "", careerStatus: "", currentJob: "", company: "", lookingFor: "", careerField: "", targetRole: "Software Engineer", skills: ["React"], experience: "", professionalSummary: "", certifications: [], languages: [], projects: [], verifiedDetails: [{ category: "Achievement", title: "Competition recognition", detail: "Runner-up in a university innovation challenge" }], fieldEvidence: {} },
      aiMessage: null,
    });
    render(<AccountDetails />);

    fireEvent.click(screen.getByRole("button", { name: "Re-read AI" }));

    await waitFor(() => expect(toastTestMocks.success).toHaveBeenCalledWith("Resume review ready", expect.objectContaining({ action: expect.objectContaining({ label: "Keep draft" }), cancel: expect.objectContaining({ label: "Discard" }) })));
    expect(screen.queryByText(/Gemini reviewed \d+ profile details/i)).toBeNull();
    expect(screen.getByDisplayValue("Resume name")).toBeTruthy();
    expect(screen.getByDisplayValue("Software Engineer")).toBeTruthy();
    expect(screen.getAllByText("React").length).toBeGreaterThan(0);
    expect(screen.getByText("1 skills retained for targeted practice")).toBeTruthy();
    expect(screen.getByText("Competition recognition")).toBeTruthy();
  });

  it("keeps resume-analysis failures out of the page and exposes a retry toast", async () => {
    projectTestMocks.profile = {
      resumeName: "candidate.pdf",
      resumeUrl: "https://example.com/candidate.pdf",
      resumeMimeType: "application/pdf",
      personalizationEnabled: true,
      jobRecommendationsEnabled: true,
      professionalConnectionsEnabled: true,
    };
    resumeTestMocks.analyzeResume.mockResolvedValue({ suggestions: null, aiMessage: "Gemini is temporarily unavailable. Your resume remains secure." });
    render(<AccountDetails />);

    fireEvent.click(screen.getByRole("button", { name: "Re-read AI" }));

    await waitFor(() => expect(toastTestMocks.error).toHaveBeenCalledWith("Resume review needs attention", expect.objectContaining({ action: expect.objectContaining({ label: "Retry" }) })));
    expect(screen.queryByText("We could not read this resume for AI review.")).toBeNull();
    expect(screen.queryByText("Gemini is temporarily unavailable. Your resume remains secure.")).toBeNull();
  });

  it("normalizes skills into readable tags and turns resume experience into editable timeline entries", () => {
    expect(splitSkillTags("React, TypeScript\nReact | REST APIs")).toEqual(["React", "TypeScript", "REST APIs"]);
    const entries = parseExperienceTimeline("Intern at Atlas — Islamabad | 2024; Engineer at CareerTwin — Lahore | May 2025 – Present; Associate at Vertex — Karachi | Dec 2024");
    expect(entries).toEqual([
      expect.objectContaining({ title: "Engineer", organisation: "CareerTwin", period: "May 2025 – Present" }),
      expect.objectContaining({ title: "Associate", organisation: "Vertex", period: "Dec 2024" }),
      expect.objectContaining({ title: "Intern", organisation: "Atlas", period: "2024" }),
    ]);
    expect(isCurrentExperience(entries[0]!)).toBe(true);
    expect(serializeExperienceTimeline([{ ...entries[2]!, title: "Product Intern" }, entries[0]!])).toBe("Product Intern at Atlas — Islamabad | 2024; Engineer at CareerTwin — Lahore | May 2025 – Present");
  });

  it("places the Current status tag beside the active role title", () => {
    projectTestMocks.profile = {
      experience: "Engineer at CareerTwin — Lahore | May 2025 – Present",
      personalizationEnabled: false,
      jobRecommendationsEnabled: false,
      professionalConnectionsEnabled: false,
    };
    render(<AccountDetails />);

    const currentBadge = screen.getByText("Current");
    const titleRow = currentBadge.closest(".ct-experience-title-row");
    expect(titleRow).not.toBeNull();
    expect(titleRow?.textContent).toContain("Engineer");
  });

  it("serializes project cards with technology chips and exposes only safe clickable external links", () => {
    const cards = parseProjectCards(serializeProjectCards([{ id: "project-1", name: "CareerTwin", summary: "Interview preparation platform", link: "github.com/example/careertwin", technologies: ["React", "TypeScript", "React"] }]));
    expect(cards).toEqual([expect.objectContaining({ name: "CareerTwin", technologies: ["React", "TypeScript"] })]);
    expect(projectExternalHref(cards[0]!.link)).toBe("https://github.com/example/careertwin");
    expect(projectExternalHref("http://portfolio.example/work")).toBe("https://portfolio.example/work");
    expect(projectExternalHref("javascript:alert(1)")).toBe("");
  });

  it("lets a user add a linked project card with technology-stack chips before the account save boundary", () => {
    render(<AccountDetails />);

    fireEvent.click(screen.getByRole("button", { name: /Add project/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g., CareerTwin AI"), { target: { value: "Portfolio platform" } });
    fireEvent.change(screen.getByPlaceholderText("https://github.com/… or live URL"), { target: { value: "github.com/example/portfolio" } });
    fireEvent.change(screen.getByPlaceholderText("What the project does and the outcome you can discuss."), { target: { value: "A personal work showcase." } });
    fireEvent.change(screen.getByPlaceholderText("e.g., React, TypeScript, MySQL"), { target: { value: "React, TypeScript" } });
    fireEvent.click(screen.getByRole("button", { name: /Save project/i }));

    expect(screen.getByText("Portfolio platform")).toBeTruthy();
    expect(screen.getAllByText("React").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Open link/i }).getAttribute("href")).toBe("https://github.com/example/portfolio");
  });

  it("offers a non-destructive AI re-read action for an already stored resume", () => {
    projectTestMocks.profile = {
      resumeName: "candidate.docx",
      resumeUrl: "https://example.com/candidate.docx",
      resumeMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      personalizationEnabled: false,
      jobRecommendationsEnabled: false,
      professionalConnectionsEnabled: false,
    };

    render(<AccountDetails />);

    expect(screen.getByRole("button", { name: "Re-read AI" })).toBeTruthy();
  });

  it("requires privacy-safe authorization before preparing an illustrative connection detail view", () => {
    vi.useFakeTimers();
    render(<AccountDetails />);

    expect(screen.getByRole("heading", { name: "Professional connections", level: 2 })).toBeTruthy();
    const githubToggle = screen.getByRole("switch", { name: "Toggle GitHub connection setup" });
    expect(githubToggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(githubToggle);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Prepare GitHub details" })).toBeTruthy();
    expect(screen.getByText(/does not sign you in, connect an account, access platform data/i)).toBeTruthy();
    expect(githubToggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByText(/demo/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(githubToggle.getAttribute("disabled")).not.toBeNull();
    expect(githubToggle.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Preparing connection…")).toBeTruthy();
    expect(screen.getAllByRole("switch", { name: /connection setup/i })).toHaveLength(5);
    expect(screen.getByRole("switch", { name: "Toggle LinkedIn connection setup" }).getAttribute("disabled")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(600); });
    expect(githubToggle.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Ready to view")).toBeTruthy();
    expect(screen.getByText("1 connection ready")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open GitHub profile details" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "View GitHub profile details" })).toBeTruthy();
    const githubConnection = screen.getByText("GitHub").closest("article");
    expect(githubConnection?.querySelector(":scope > .ct-account-connection-hitarea > button")).toBeTruthy();
    expect(githubConnection?.querySelector(":scope > button")).toBeNull();
    expect(toastTestMocks.success).toHaveBeenCalledWith("GitHub is ready to view", expect.objectContaining({ description: expect.stringContaining("No account data was accessed") }));

    fireEvent.click(screen.getByRole("button", { name: "Open GitHub profile details" }));
    expect(screen.getByText("Opening profile details…")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "View GitHub profile details" }).getAttribute("disabled")).not.toBeNull();
    expect(githubToggle.getAttribute("disabled")).not.toBeNull();
    act(() => { vi.advanceTimersByTime(280); });
    expect(screen.getByRole("heading", { name: "GitHub profile details" })).toBeTruthy();
    expect(screen.getByText("Illustrative profile snapshot")).toBeTruthy();
    expect(screen.getByText("career-profile")).toBeTruthy();
    expect(screen.getByText("TypeScript, Python, and SQL")).toBeTruthy();
    expect(screen.queryByText(/demo/i)).toBeNull();
    fireEvent.click(screen.getByText("Close", { selector: "button.ct-button" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(githubToggle);
    act(() => { vi.advanceTimersByTime(600); });
    expect(githubToggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("button", { name: "Open GitHub profile details" })).toBeNull();
    expect(saveProfileMock).not.toHaveBeenCalled();
    expect(resumeTestMocks.uploadResume).not.toHaveBeenCalled();
    expect(resumeTestMocks.analyzeResume).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("cancels an authorization request without selection and renders platform-specific illustrative detail content", () => {
    vi.useFakeTimers();
    render(<AccountDetails />);

    const linkedinToggle = screen.getByRole("switch", { name: "Toggle LinkedIn connection setup" });
    fireEvent.click(linkedinToggle);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(linkedinToggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("button", { name: "Open LinkedIn profile details" })).toBeNull();

    fireEvent.click(linkedinToggle);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    act(() => { vi.advanceTimersByTime(600); });
    fireEvent.click(screen.getByRole("button", { name: "View LinkedIn profile details" }));
    expect(screen.getByText("Opening profile details…")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(280); });
    expect(screen.getByRole("heading", { name: "LinkedIn profile details" })).toBeTruthy();
    expect(screen.getByText("career-profile")).toBeTruthy();
    expect(screen.getByText("320+")).toBeTruthy();
    expect(screen.getByText("Recent activity")).toBeTruthy();
    expect(screen.getByText("Connection signals")).toBeTruthy();
    expect(screen.getByText("Data source")).toBeTruthy();
    expect(screen.getByText("Illustrative fallback")).toBeTruthy();
    expect(screen.getByText("No external LinkedIn account connected")).toBeTruthy();
    expect(saveProfileMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("renders GitHub repositories and contribution context without profile mutation", () => {
    vi.useFakeTimers();
    render(<AccountDetails />);

    fireEvent.click(screen.getByRole("switch", { name: "Toggle GitHub connection setup" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    act(() => { vi.advanceTimersByTime(600); });
    fireEvent.click(screen.getByRole("button", { name: "Open GitHub profile details" }));
    act(() => { vi.advanceTimersByTime(280); });
    expect(screen.getByRole("heading", { name: "GitHub profile details" })).toBeTruthy();
    expect(screen.getByText("Repositories and contributions")).toBeTruthy();
    expect(screen.getByText("214 illustrative contributions this year")).toBeTruthy();
    expect(screen.getByText("Primary languages")).toBeTruthy();
    expect(screen.getByText("Data source")).toBeTruthy();
    expect(screen.getByText("Illustrative fallback")).toBeTruthy();
    expect(screen.getByText("No external GitHub account connected")).toBeTruthy();
    vi.useRealTimers();
  });

  it("renders distinct illustrative details for Indeed, Upwork, and Fiverr without profile mutation", () => {
    vi.useFakeTimers();
    render(<AccountDetails />);

    for (const [platform, expectedDetail] of [["Indeed", "Software, product, and analytical pathways"], ["Upwork", "Research, documentation, and product support"], ["Fiverr", "Presentation, research, and digital support"]] as const) {
      fireEvent.click(screen.getByRole("switch", { name: `Toggle ${platform} connection setup` }));
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      act(() => { vi.advanceTimersByTime(600); });
      fireEvent.click(screen.getByRole("button", { name: `Open ${platform} profile details` }));
      expect(screen.getByText("Opening profile details…")).toBeTruthy();
      act(() => { vi.advanceTimersByTime(280); });
      expect(screen.getByRole("heading", { name: `${platform} profile details` })).toBeTruthy();
      expect(screen.getByText(expectedDetail)).toBeTruthy();
      expect(screen.getByText("Data source")).toBeTruthy();
      expect(screen.getByText("Illustrative fallback")).toBeTruthy();
      expect(screen.getByText(`No external ${platform} account connected`)).toBeTruthy();
      fireEvent.click(screen.getByText("Close", { selector: "button.ct-button" }));
    }

    expect(saveProfileMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("renders a distinct bundled brand SVG mark for every professional connection", () => {
    render(<AccountDetails />);

    for (const platform of ["linkedin", "indeed", "upwork", "github", "fiverr"]) {
      const icon = screen.getByTestId(`connection-brand-${platform}`);
      expect(icon.tagName.toLowerCase()).toBe("svg");
      expect(icon.querySelector("path")?.getAttribute("d")).toBeTruthy();
    }
  });

  it("opens a stored PDF in a closable secure preview dialog", async () => {
    projectTestMocks.profile = {
      resumeName: "candidate.pdf",
      resumeUrl: "https://example.com/candidate.pdf",
      resumeMimeType: "application/pdf",
      personalizationEnabled: false,
      jobRecommendationsEnabled: false,
      professionalConnectionsEnabled: false,
    };

    resumeTestMocks.previewResume.mockResolvedValue({ url: "https://storage.example/candidate.pdf" });
    render(<AccountDetails />);
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(screen.getByRole("heading", { name: "candidate.pdf" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close resume preview" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("lets a user add structured certification and language cards before the account save boundary", () => {
    render(<AccountDetails />);

    fireEvent.click(screen.getByRole("button", { name: /Add certification/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g., AWS Certified Cloud Practitioner"), { target: { value: "Cloud Practitioner" } });
    fireEvent.change(screen.getByPlaceholderText("e.g., Amazon Web Services"), { target: { value: "Amazon Web Services" } });
    fireEvent.change(screen.getByPlaceholderText("https://credential-provider.example/…"), { target: { value: "https://example.com/credential" } });
    fireEvent.click(screen.getByRole("button", { name: /Save certification/i }));

    expect(screen.getByText("Cloud Practitioner")).toBeTruthy();
    expect(screen.getByText("Amazon Web Services")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Verify/i }).getAttribute("href")).toBe("https://example.com/credential");

    fireEvent.click(screen.getByRole("button", { name: /Add language/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g., Urdu"), { target: { value: "Urdu" } });
    fireEvent.change(screen.getAllByRole("combobox").at(-1)!, { target: { value: "Native" } });
    fireEvent.click(screen.getByRole("button", { name: /Save language/i }));

    expect(screen.getByText("Urdu")).toBeTruthy();
    expect(screen.getByText("Native")).toBeTruthy();
  });

  it("shows GitHub stars and forks and filters visible project cards by technology", () => {
    projectTestMocks.profile = {
      projects: JSON.stringify([
        { name: "Web platform", summary: "Web project", link: "https://github.com/example/web", technologies: ["React", "TypeScript"] },
        { name: "Data tool", summary: "Data project", link: "", technologies: ["Python"] },
      ]),
      personalizationEnabled: false,
      jobRecommendationsEnabled: false,
      professionalConnectionsEnabled: false,
    };
    projectTestMocks.repositories = [{ sourceLink: "https://github.com/example/web", repository: "example/web", htmlUrl: "https://github.com/example/web", stars: 12, forks: 4 }];

    render(<AccountDetails />);

    expect(screen.getByText("12 stars")).toBeTruthy();
    expect(screen.getByText("4 forks")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Python 1/i }));
    expect(screen.getByText("Data tool")).toBeTruthy();
    expect(screen.queryByText("Web platform")).toBeNull();
    expect(screen.getByRole("button", { name: /All projects 2/i }).getAttribute("aria-pressed")).toBe("false");
  });

  it("lets a user add an individual experience entry to the timeline", () => {
    render(<AccountDetails />);

    fireEvent.click(screen.getByRole("button", { name: /Add experience/i }));
    fireEvent.change(screen.getByPlaceholderText("e.g., Software Engineering Intern"), { target: { value: "Product Intern" } });
    fireEvent.change(screen.getByPlaceholderText("e.g., CareerTwin"), { target: { value: "Atlas" } });
    fireEvent.change(screen.getByPlaceholderText("e.g., Lahore"), { target: { value: "Islamabad" } });
    fireEvent.change(screen.getByPlaceholderText("e.g., Jun 2025 – Present"), { target: { value: "2025" } });
    fireEvent.click(screen.getByRole("button", { name: /Save entry/i }));

    expect(screen.getByText("Product Intern")).toBeTruthy();
    expect(screen.getByText("Atlas")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit Product Intern" })).toBeTruthy();
  });

  it("frames account details as a private preparation profile with a secure photo editor and retained save/practice actions", () => {
    render(<AccountDetails />);

    expect(screen.getByRole("heading", { name: "Your private preparation profile." })).toBeTruthy();
    expect(screen.getByText(/Nothing is silently saved, shared, or turned into a hiring decision/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Upload your resume first." })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Upload resume/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Add photo/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Add experience/i })).toBeTruthy();
    expect(screen.getByText(/JPEG, PNG, or WebP/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Save account details/i }).className).toContain("ct-button");
    expect(screen.getByRole("button", { name: "Practice" })).toBeTruthy();
  });

  it("saves changed personalization toggles before opening practice", async () => {
    saveProfileMock.mockResolvedValue({ isComplete: false });
    render(<AccountDetails />);

    fireEvent.click(screen.getByRole("switch", { name: "Toggle Personalized coaching" }));
    expect(screen.getByText(/Toggle preferences changed/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Save & open practice/i }));

    await waitFor(() => expect(saveProfileMock).toHaveBeenCalledWith(expect.objectContaining({ personalizationEnabled: false })));
    await waitFor(() => expect(setLocationMock).toHaveBeenCalledWith("/?screen=consent"));
  });

  it("automatically saves field edits to database in background after debounce", async () => {
    vi.useFakeTimers();
    saveProfileMock.mockResolvedValue({ isComplete: false });
    render(<AccountDetails />);

    const locationInput = screen.getByPlaceholderText("e.g., Lahore, Pakistan");
    fireEvent.change(locationInput, { target: { value: "Karachi, Pakistan" } });

    // Status shifts to unsaved/auto-saving in the sync indicators
    expect(screen.getAllByText(/Auto-saving/i).length).toBeGreaterThan(0);

    // Advance past the 1200ms debounce
    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(saveProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({ location: "Karachi, Pakistan" })
    );
    vi.useRealTimers();
  });

  it("saves directly to database and shows success notification when manual Save button is clicked", async () => {
    saveProfileMock.mockResolvedValue({ isComplete: true });
    render(<AccountDetails />);

    const saveButton = screen.getByRole("button", { name: /Save account details/i });
    fireEvent.click(saveButton);

    await waitFor(() => expect(saveProfileMock).toHaveBeenCalled());
    expect(toastTestMocks.success).toHaveBeenCalledWith(
      expect.stringContaining("saved to database")
    );
  });

  it("discards reviewed resume suggestions, reverts form fields, and persists restored data to database", async () => {
    projectTestMocks.profile = {
      fullName: "Original Mira",
      location: "Islamabad",
      targetRole: "Engineer",
      skills: "React",
      resumeName: "existing.pdf",
      resumeUrl: "https://example.com/existing.pdf",
      resumeMimeType: "application/pdf",
      personalizationEnabled: true,
      jobRecommendationsEnabled: true,
      professionalConnectionsEnabled: true,
    };
    resumeTestMocks.analyzeResume.mockResolvedValue({
      suggestions: {
        fullName: "AI Extracted Name",
        location: "Karachi",
        targetRole: "AI Engineer",
        skills: ["Python", "PyTorch"],
        age: 26,
        education: "Master's",
        careerStatus: "seeking",
        fieldEvidence: {},
      },
      aiMessage: null,
    });
    saveProfileMock.mockResolvedValue({ isComplete: true });

    render(<AccountDetails />);

    fireEvent.click(screen.getByRole("button", { name: "Re-read AI" }));

    await waitFor(() =>
      expect(toastTestMocks.success).toHaveBeenCalledWith(
        "Resume review ready",
        expect.objectContaining({
          action: expect.objectContaining({ label: "Keep draft" }),
          cancel: expect.objectContaining({ label: "Discard" }),
        })
      )
    );

    // Form shows AI suggestions
    expect(screen.getByDisplayValue("AI Extracted Name")).toBeTruthy();

    const toastArgs = toastTestMocks.success.mock.calls.find(
      (call) => call[0] === "Resume review ready"
    )?.[1];
    const discardAction = toastArgs?.cancel;
    expect(discardAction).toBeDefined();

    await act(async () => {
      await discardAction?.onClick();
    });

    // Form reverted to previous values
    expect(screen.getByDisplayValue("Original Mira")).toBeTruthy();
    expect(screen.queryByDisplayValue("AI Extracted Name")).toBeNull();

    // Database is reconciled with reverted data
    expect(saveProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Original Mira",
        location: "Islamabad",
      })
    );
    expect(toastTestMocks.dismiss).toHaveBeenCalled();
    expect(toastTestMocks.info).toHaveBeenCalledWith(
      "Resume changes discarded. All previous details have been restored."
    );
  });

  it("does not auto-save to database while resume suggestions are under review", async () => {
    vi.useFakeTimers();
    projectTestMocks.profile = {
      fullName: "Original Mira",
      location: "Islamabad",
      resumeName: "existing.pdf",
      resumeUrl: "https://example.com/existing.pdf",
      resumeMimeType: "application/pdf",
    };
    resumeTestMocks.analyzeResume.mockResolvedValue({
      suggestions: {
        fullName: "AI Extracted Name",
        targetRole: "AI Engineer",
        skills: ["Python"],
        fieldEvidence: {},
      },
      aiMessage: null,
    });
    saveProfileMock.mockResolvedValue({ isComplete: true });

    render(<AccountDetails />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Re-read AI" }));
    });

    expect(screen.getByDisplayValue("AI Extracted Name")).toBeTruthy();

    saveProfileMock.mockClear();

    // Fast-forward past normal debounce period (1200ms)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Auto-save must NOT fire while suggestions are under review
    expect(saveProfileMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("clears all profile form fields after confirmation and syncs empty state to database", async () => {
    projectTestMocks.profile = {
      fullName: "Ahmed Hassan",
      location: "Lahore",
      targetRole: "Full Stack Dev",
      skills: "React, Node",
      personalizationEnabled: true,
      jobRecommendationsEnabled: false,
      professionalConnectionsEnabled: true,
    };
    saveProfileMock.mockResolvedValue({ isComplete: false });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AccountDetails />);

    expect(screen.getByDisplayValue("Ahmed Hassan")).toBeTruthy();

    const clearButton = screen.getByRole("button", { name: /Clear form/i });
    await act(async () => {
      fireEvent.click(clearButton);
    });

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("clear all form fields")
    );
    expect(screen.queryByDisplayValue("Ahmed Hassan")).toBeNull();

    // Persisted to database with cleared fields and preserved personalization toggles
    expect(saveProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: null,
        location: null,
        targetRole: null,
        skills: null,
        personalizationEnabled: true,
        jobRecommendationsEnabled: false,
        professionalConnectionsEnabled: true,
      })
    );
    expect(toastTestMocks.info).toHaveBeenCalledWith(
      "All form fields cleared. You can now enter fresh information."
    );
  });

  it("aborts clearing form fields if user cancels confirmation dialog", async () => {
    projectTestMocks.profile = {
      fullName: "Ahmed Hassan",
      location: "Lahore",
    };
    saveProfileMock.mockResolvedValue({ isComplete: false });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<AccountDetails />);

    expect(screen.getByDisplayValue("Ahmed Hassan")).toBeTruthy();

    const clearButton = screen.getByRole("button", { name: /Clear form/i });
    await act(async () => {
      fireEvent.click(clearButton);
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByDisplayValue("Ahmed Hassan")).toBeTruthy();
    expect(saveProfileMock).not.toHaveBeenCalled();
  });
});


