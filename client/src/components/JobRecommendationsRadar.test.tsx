/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateJobOfferings, JobRecommendationsRadar } from "./JobRecommendationsRadar";
import type { ProfileForm } from "@/pages/AccountDetails";

describe("JobRecommendationsRadar", () => {
  afterEach(() => {
    cleanup();
  });

  const mockForm: ProfileForm = {
    fullName: "Ahmed Hassan",
    location: "Lahore, Pakistan",
    phone: "03001234567",
    contactEmail: "ahmed@example.com",
    linkedinUrl: "https://linkedin.com/in/ahmed",
    portfolioUrl: "https://ahmed.dev",
    age: "24",
    education: "Bachelor's",
    degree: "BS Computer Science",
    careerStatus: "seeking",
    currentJob: "Software Developer",
    company: "Tech Corp",
    lookingFor: "First Job",
    careerField: "Software Engineering",
    targetRole: "Full Stack Engineer",
    skills: "React, TypeScript, Node.js, SQL, Tailwind CSS",
    experience: "Software Engineer Intern at Tech Corp",
    professionalSummary: "Passionate engineer building web products.",
    certifications: "",
    languages: "English, Urdu",
    projects: "",
    verifiedDetails: "",
    personalizationEnabled: true,
    jobRecommendationsEnabled: true,
    professionalConnectionsEnabled: true,
  };

  const mockConnectionSelections = {
    linkedin: true,
    indeed: true,
    upwork: false,
    github: true,
    fiverr: false,
  };

  it("generates tailored job offerings matching candidate skills and connector platforms", () => {
    const offerings = generateJobOfferings(mockForm, mockConnectionSelections);
    expect(offerings.length).toBeGreaterThan(0);

    const first = offerings[0];
    expect(first.title).toContain("Full Stack Engineer");
    expect(first.company).toBe("Capregsoft");
    expect(first.matchPercentage).toBeGreaterThanOrEqual(75);
    expect(first.matchScore).toBeGreaterThanOrEqual(3.5);
    expect(first.matchedSkills).toContain("React");
  });

  it("renders job recommendations header and opportunity cards when enabled", () => {
    const onPracticeRole = vi.fn();
    const onEnableRecommendations = vi.fn();

    render(
      <JobRecommendationsRadar
        form={mockForm}
        connectionSelections={mockConnectionSelections}
        onPracticeRole={onPracticeRole}
        onEnableRecommendations={onEnableRecommendations}
      />
    );

    expect(screen.getByText(/Job recommendations & live postings/i)).toBeDefined();
    expect(screen.getAllByText(/Capregsoft/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Linear/i)).toBeDefined();
    expect(screen.getAllByText(/Lahore, Pakistan/i).length).toBeGreaterThan(0);
  });

  it("provides authentic external job application links for each listing", () => {
    render(
      <JobRecommendationsRadar
        form={mockForm}
        connectionSelections={mockConnectionSelections}
        onPracticeRole={vi.fn()}
        onEnableRecommendations={vi.fn()}
      />
    );

    const openJobLinks = screen.getAllByRole("link", { name: /apply on portal|open job/i });
    expect(openJobLinks.length).toBeGreaterThan(0);
    expect(openJobLinks[0].getAttribute("href")).toContain("http");
    expect(openJobLinks[0].getAttribute("target")).toBe("_blank");
  });

  it("opens CareerTwin structured intelligence audit modal when clicking report button", () => {
    render(
      <JobRecommendationsRadar
        form={mockForm}
        connectionSelections={mockConnectionSelections}
        onPracticeRole={vi.fn()}
        onEnableRecommendations={vi.fn()}
      />
    );

    const reportButtons = screen.getAllByRole("button", { name: /careertwin report/i });
    fireEvent.click(reportButtons[0]);

    expect(screen.getByText(/CareerTwin Intelligence Audit/i)).toBeDefined();
    expect(screen.getByText(/Block A: Role & Organization Snapshot/i)).toBeDefined();
    expect(screen.getByText(/Block G: Legitimacy & Verification Check/i)).toBeDefined();
  });

  it("filters job offerings by platform source when a platform pill is clicked", () => {
    const onPracticeRole = vi.fn();
    const onEnableRecommendations = vi.fn();

    render(
      <JobRecommendationsRadar
        form={mockForm}
        connectionSelections={mockConnectionSelections}
        onPracticeRole={onPracticeRole}
        onEnableRecommendations={onEnableRecommendations}
      />
    );

    const githubButton = screen.getByRole("button", { name: /filter by github roles/i });
    fireEvent.click(githubButton);

    // Cards matching GitHub should be displayed
    expect(screen.getByText(/Supabase/i)).toBeDefined();
  });

  it("triggers onPracticeRole callback when clicking 'Practice role'", () => {
    const onPracticeRole = vi.fn();
    const onEnableRecommendations = vi.fn();

    render(
      <JobRecommendationsRadar
        form={mockForm}
        connectionSelections={mockConnectionSelections}
        onPracticeRole={onPracticeRole}
        onEnableRecommendations={onEnableRecommendations}
      />
    );

    const practiceButtons = screen.getAllByRole("button", { name: /practice for/i });
    fireEvent.click(practiceButtons[0]);

    expect(onPracticeRole).toHaveBeenCalledTimes(1);
  });

  it("renders preview mode with top 2 roles and full radar redirection banner", () => {
    const onOpenFullRadar = vi.fn();

    render(
      <JobRecommendationsRadar
        form={mockForm}
        connectionSelections={mockConnectionSelections}
        onPracticeRole={vi.fn()}
        onEnableRecommendations={vi.fn()}
        previewMode={true}
        onOpenFullRadar={onOpenFullRadar}
      />
    );

    expect(screen.getByText(/Recommended job opportunities/i)).toBeDefined();
    const exploreBtn = screen.getByRole("button", { name: /open job radar/i });
    fireEvent.click(exploreBtn);
    expect(onOpenFullRadar).toHaveBeenCalledTimes(1);

    const openRadarBtn = screen.getByRole("button", { name: /open live job radar/i });
    fireEvent.click(openRadarBtn);
    expect(onOpenFullRadar).toHaveBeenCalledTimes(2);
  });

  it("renders paused state when jobRecommendationsEnabled is false", () => {
    const onPracticeRole = vi.fn();
    const onEnableRecommendations = vi.fn();

    render(
      <JobRecommendationsRadar
        form={{ ...mockForm, jobRecommendationsEnabled: false }}
        connectionSelections={mockConnectionSelections}
        onPracticeRole={onPracticeRole}
        onEnableRecommendations={onEnableRecommendations}
      />
    );

    expect(screen.getByText(/Job recommendations are paused/i)).toBeDefined();
    const enableBtn = screen.getByRole("button", { name: /enable recommendations/i });
    fireEvent.click(enableBtn);
    expect(onEnableRecommendations).toHaveBeenCalledTimes(1);
  });
});
