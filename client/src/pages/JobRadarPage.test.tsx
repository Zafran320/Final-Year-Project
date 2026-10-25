/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JobRadarPage from "./JobRadarPage";

let mockAuth = {
  user: { id: 1, name: "Ahmed Hassan", email: "ahmed@example.com" } as any,
  loading: false,
  isAuthenticated: true,
  logout: vi.fn(),
};

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => mockAuth,
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({
    theme: "dark",
    toggleTheme: vi.fn(),
  }),
}));

const mockJobsList = Array.from({ length: 100 }, (_, i) => ({
  id: `live-job-${i + 1}`,
  title: i === 0 ? "Full Stack Engineer (Core Platform)" : `Software Engineer ${i + 1}`,
  company: i === 0 ? "Capregsoft" : `Company ${i + 1}`,
  location: i % 2 === 0 ? "Lahore, Pakistan · Hybrid" : "Remote (Global)",
  jobUrl: i === 0 ? "https://capregsoft.com" : `https://example.com/job-${i + 1}`,
  workMode: i % 2 === 0 ? ("Hybrid" as const) : ("Remote" as const),
  salaryRange: "PKR 250,000 – 420,000 / mo",
  experienceLevel: "Mid-Level" as const,
  coreSkills: ["React", "TypeScript", "Node.js"],
  extraSkills: ["Docker"],
  platformSources: ["linkedin", "indeed", "github"] as ("linkedin" | "indeed" | "github" | "upwork" | "fiverr")[],
  isLocationMatch: i % 2 === 0,
  locationMatchReason: "Near your location (Lahore, Pakistan)",
  matchedSkills: ["React", "TypeScript"],
  matchScore: 4.8,
  matchPercentage: 96,
  whyRecommended: "Directly matches target role and skills.",
  dimensions: {
    technicalFit: 98,
    seniorityFit: 94,
    workModeFit: 92,
    growthFit: 96,
  },
  reportBlocks: {
    blockA: "Capregsoft is hiring for Full Stack Engineer.",
    blockB: "Core platform delivery.",
    blockC: "React, TypeScript, Node.js.",
    blockD: "96% alignment.",
    blockE: "Signals from LinkedIn, Indeed, GitHub.",
    blockF: "Discuss project architecture and testing.",
    blockG: "Verified authentic pipeline.",
    blockH: "Emphasize React and full-stack execution.",
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    careerProfile: {
      get: {
        useQuery: () => ({
          data: {
            fullName: "Ahmed Hassan",
            location: "Lahore, Pakistan",
            targetRole: "Full Stack Engineer",
            skills: "React, TypeScript, Node.js, SQL",
            jobRecommendationsEnabled: true,
          },
          isLoading: false,
          isError: false,
        }),
      },
      fetchLiveJobs: {
        useQuery: () => ({
          data: {
            jobs: mockJobsList,
            lastSyncedAt: new Date().toISOString(),
            userLocation: "Lahore, Pakistan",
          },
          isFetching: false,
          refetch: vi.fn(),
        }),
      },
    },
    practicePreparation: {
      getLatestSession: {
        useQuery: () => ({ data: null, isLoading: false }),
      },
    },
  },
}));

describe("JobRadarPage", () => {
  beforeEach(() => {
    mockAuth = {
      user: { id: 1, name: "Ahmed Hassan", email: "ahmed@example.com" },
      loading: false,
      isAuthenticated: true,
      logout: vi.fn(),
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the Live Job Radar page with hero, live match counters, and listings", () => {
    render(<JobRadarPage />);

    expect(screen.getByRole("heading", { name: /Live Job Radar & Offerings/i })).toBeDefined();
    expect(screen.getByText(/100 Opportunities/i)).toBeDefined();
    expect(screen.getByText(/Capregsoft/i)).toBeDefined();
    expect(screen.getAllByText(/Lahore, Pakistan/i).length).toBeGreaterThan(0);
  });

  it("provides dropdown controls for Source, Work Mode, City Hub, Seniority, and Sort", () => {
    render(<JobRadarPage />);

    expect(screen.getByLabelText(/filter by source platform/i)).toBeDefined();
    expect(screen.getByLabelText(/filter by work mode/i)).toBeDefined();
    expect(screen.getByLabelText(/filter by city hub/i)).toBeDefined();
    expect(screen.getByLabelText(/filter by experience level/i)).toBeDefined();
    expect(screen.getByLabelText(/sort opportunities/i)).toBeDefined();
  });

  it("paginates 100 opportunities at 20 items per page and navigates across pages", () => {
    render(<JobRadarPage />);

    expect(screen.getAllByText(/Showing/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1–20/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Page 1 of 5/i).length).toBeGreaterThan(0);

    // Check pagination buttons exist
    const page2Button = screen.getByRole("button", { name: "Page 2" });
    expect(page2Button).toBeDefined();
    fireEvent.click(page2Button);

    expect(screen.getAllByText(/Page 2 of 5/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/21–40/i).length).toBeGreaterThan(0);
  });

  it("provides direct external job apply links and practice role buttons", () => {
    render(<JobRadarPage />);

    const openJobLinks = screen.getAllByRole("link", { name: /apply on portal|open job/i });
    expect(openJobLinks[0].getAttribute("href")).toBe("https://capregsoft.com");
    expect(openJobLinks[0].getAttribute("target")).toBe("_blank");

    const practiceButtons = screen.getAllByRole("button", { name: /practice for/i });
    expect(practiceButtons.length).toBeGreaterThan(0);
  });

  it("opens the FutureMaker Block A–H audit modal when clicking report button", () => {
    render(<JobRadarPage />);

    const reportButton = screen.getAllByRole("button", { name: /futuremaker report/i })[0];
    fireEvent.click(reportButton);

    expect(screen.getByText(/FutureMaker Intelligence Audit/i)).toBeDefined();
    expect(screen.getByText(/Block A: Role & Organization Snapshot/i)).toBeDefined();
    expect(screen.getByText(/Block G: Legitimacy & Verification Check/i)).toBeDefined();
  });

  it("renders locked preview banner when user is not authenticated", () => {
    mockAuth = {
      user: null,
      loading: false,
      isAuthenticated: false,
      logout: vi.fn(),
    };

    render(<JobRadarPage />);

    expect(screen.getByTestId("locked-job-radar-preview")).toBeDefined();
    expect(screen.getByText(/Sign in to view live opportunities/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Sign In to Access/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Create Free Account/i })).toBeDefined();
    expect(screen.getByText(/Locked Preview/i)).toBeDefined();
    expect(screen.queryByText(/No matching live roles found/i)).toBeNull();
  });
});
