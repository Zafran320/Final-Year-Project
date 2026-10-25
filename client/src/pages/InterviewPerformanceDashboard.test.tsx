/** @vitest-environment jsdom */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import InterviewPerformanceDashboard from "./InterviewPerformanceDashboard";
import { ThemeProvider } from "@/contexts/ThemeContext";

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock wouter
vi.mock("wouter", () => ({
  useLocation: () => ["/dashboard", vi.fn()],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock auth hook
vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user", name: "Ahmed Hassan", email: "ahmed@example.com" },
    isAuthenticated: true,
    loading: false,
    logout: vi.fn(),
  }),
}));

// Mock trpc
vi.mock("@/lib/trpc", () => ({
  trpc: {
    careerProfile: {
      get: {
        useQuery: () => ({
          data: {
            fullName: "Ahmed Hassan",
            location: "Islamabad, Pakistan",
            skills: "React, TypeScript, Node.js",
            targetRole: "Frontend Developer",
            profilePhotoUrl: null,
          },
          isLoading: false,
        }),
      },
      fetchLiveJobs: {
        useQuery: () => ({
          data: {
            jobs: [
              {
                id: "test-1",
                title: "Frontend Developer",
                company: "ABC Technologies",
                location: "Islamabad, Pakistan",
                workMode: "Full-time",
                experienceLevel: "1-3 years",
                salaryRange: "PKR 120,000 - 180,000 / mo",
                matchedSkills: ["React", "TypeScript", "Tailwind CSS"],
                matchPercentage: 94,
                platformSources: ["LinkedIn"],
              },
              {
                id: "test-2",
                title: "Software Engineer",
                company: "XYZ Software House",
                location: "Islamabad, Pakistan",
                workMode: "Full-time",
                experienceLevel: "2-4 years",
                salaryRange: "PKR 140,000 - 200,000 / mo",
                matchedSkills: ["React", "Node.js", "SQL"],
                matchPercentage: 88,
                platformSources: ["Indeed"],
              },
              {
                id: "test-3",
                title: "UI/UX Designer",
                company: "Creative Solutions",
                location: "Islamabad, Pakistan",
                workMode: "Full-time",
                experienceLevel: "1-2 years",
                salaryRange: "PKR 90,000 - 130,000 / mo",
                matchedSkills: ["Figma", "UI/UX", "Tailwind"],
                matchPercentage: 78,
                platformSources: ["Rozee.pk"],
              },
            ],
            lastSyncedAt: new Date().toISOString(),
            userLocation: "Islamabad, Pakistan",
          },
          isLoading: false,
          refetch: vi.fn(),
        }),
      },
    },
    practicePreparation: {
      getLatestSession: {
        useQuery: () => ({
          data: null,
          isLoading: false,
        }),
      },
      getUserInterviewAnalytics: {
        useQuery: () => ({
          data: {
            hasAnyInterviews: true,
            hasCompletedEvaluation: true,
            totalSessions: 1,
            completedSessions: 1,
            inProgressSessions: 0,
            generatedSessions: 0,
            totalQuestionsAcrossAllSessions: 12,
            allSessions: [
              {
                id: 101,
                companyName: "ABC Technologies",
                targetRole: "Frontend Developer",
                currentLevel: 1,
                totalLevels: 10,
                status: "completed",
                questionCount: 12,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                score: 84,
              },
            ],
            activeSession: {
              id: 101,
              companyName: "ABC Technologies",
              targetRole: "Frontend Developer",
              currentLevel: 1,
              totalLevels: 10,
              status: "completed",
              levels: [],
            },
            scorecard: {
              overallScore: 84,
              overallScoreLabel: "Good Performance",
              interviewReadiness: 80,
              readinessLabel: "Above Average",
              confidenceLevel: 78,
              confidenceLabel: "Good",
              communicationScore: 86,
              communicationLabel: "Strong",
              radarMetrics: [
                { key: "eye_contact", label: "Eye Contact", value: 74, fullMark: 100 },
                { key: "confidence", label: "Confidence", value: 78, fullMark: 100 },
                { key: "communication", label: "Communication", value: 86, fullMark: 100 },
                { key: "clarity", label: "Clarity", value: 84, fullMark: 100 },
                { key: "language_skills", label: "Language Skills", value: 82, fullMark: 100 },
                { key: "content_quality", label: "Content Quality", value: 85, fullMark: 100 },
                { key: "body_language", label: "Body Language", value: 70, fullMark: 100 },
              ],
              progressMetrics: [
                { key: "eye_contact", label: "Eye Contact", value: 74 },
                { key: "confidence", label: "Confidence Level", value: 78 },
                { key: "communication_clarity", label: "Communication Clarity", value: 86 },
                { key: "content_relevance", label: "Content & Relevance", value: 85 },
                { key: "body_language", label: "Body Language", value: 70 },
                { key: "language_skills", label: "Language Skills", value: 82 },
              ],
              interviewStats: {
                totalQuestions: 12,
                relevantAnswers: "10/12",
                averageAnswerTime: "1m 35s",
                fillerWordsUsage: "Low",
                clarityAndStructure: "Good",
                rating: 4,
                maxRating: 5,
              },
              strengths: [
                "Good Technical Knowledge & System Architecture Depth",
                "Clear Answer Structure & Logical Transitions",
                "Active Listening & Responsive Problem Solving",
                "Culture & Value Alignment with Enterprise Standards",
              ],
              improvements: [
                { id: "1", text: "Maintain Eye Contact during Complex Explanations", badge: "Improve", badgeVariant: "orange" },
                { id: "2", text: "Increase Confidence on Boundary Failure Modes", badge: "Improve", badgeVariant: "orange" },
                { id: "3", text: "Reduce Verbal Pauses & Filler Words", badge: "Moderate", badgeVariant: "yellow" },
                { id: "4", text: "Structure Quantitative STAR Metric Proof Points", badge: "Needs Practice", badgeVariant: "orange" },
              ],
              aiAdvice:
                "Practice consistently and focus on improving eye contact, confidence and answer structure. You are on the right track!",
              nextGoal: "90%+",
            },
          },
          isLoading: false,
        }),
      },
      getLatestResults: {
        useQuery: () => ({
          data: {
            sessionId: 101,
            overallScore: 84,
            overallScoreLabel: "Good Performance",
            overallScoreDelta: "+12%",
            interviewReadiness: 80,
            readinessLabel: "Above Average",
            readinessDelta: "+8%",
            confidenceLevel: 78,
            confidenceLabel: "Good",
            confidenceDelta: "+5%",
            communicationScore: 86,
            communicationLabel: "Strong",
            communicationDelta: "+6%",
            radarMetrics: [
              { key: "eye_contact", label: "Eye Contact", value: 74, fullMark: 100 },
              { key: "confidence", label: "Confidence", value: 78, fullMark: 100 },
              { key: "communication", label: "Communication", value: 86, fullMark: 100 },
              { key: "clarity", label: "Clarity", value: 84, fullMark: 100 },
              { key: "language_skills", label: "Language Skills", value: 82, fullMark: 100 },
              { key: "content_quality", label: "Content Quality", value: 85, fullMark: 100 },
              { key: "body_language", label: "Body Language", value: 70, fullMark: 100 },
            ],
            progressMetrics: [
              { key: "eye_contact", label: "Eye Contact", value: 74 },
              { key: "confidence", label: "Confidence Level", value: 78 },
              { key: "communication_clarity", label: "Communication Clarity", value: 86 },
              { key: "content_relevance", label: "Content & Relevance", value: 85 },
              { key: "body_language", label: "Body Language", value: 70 },
              { key: "language_skills", label: "Language Skills", value: 82 },
            ],
            interviewStats: {
              totalQuestions: 12,
              relevantAnswers: "10/12",
              averageAnswerTime: "1m 35s",
              fillerWordsUsage: "Low",
              clarityAndStructure: "Good",
              rating: 4,
              maxRating: 5,
            },
            strengths: [
              "Good Technical Knowledge & System Architecture Depth",
              "Clear Answer Structure & Logical Transitions",
              "Active Listening & Responsive Problem Solving",
              "Culture & Value Alignment with Enterprise Standards",
            ],
            improvements: [
              { id: "1", text: "Maintain Eye Contact during Complex Explanations", badge: "Improve", badgeVariant: "orange" },
              { id: "2", text: "Increase Confidence on Boundary Failure Modes", badge: "Improve", badgeVariant: "orange" },
              { id: "3", text: "Reduce Verbal Pauses & Filler Words", badge: "Moderate", badgeVariant: "yellow" },
              { id: "4", text: "Structure Quantitative STAR Metric Proof Points", badge: "Needs Practice", badgeVariant: "orange" },
            ],
            aiAdvice:
              "Practice consistently and focus on improving eye contact, confidence and answer structure. You are on the right track!",
            nextGoal: "90%+",
          },
          isLoading: false,
        }),
      },
    },
  },
}));

describe("InterviewPerformanceDashboard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderDashboard = () =>
    render(
      <ThemeProvider defaultTheme="dark" switchable>
        <InterviewPerformanceDashboard />
      </ThemeProvider>
    );

  it("renders the real AccountNavigation with brand and active dashboard destination", () => {
    renderDashboard();
    expect(screen.getByText("CareerTwin")).toBeDefined();
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Job Radar")).toBeDefined();
    expect(screen.getByText("Account")).toBeDefined();
  });

  it("renders the main dashboard heading and completion subtitle", () => {
    renderDashboard();
    expect(screen.getByText("Interview Performance Dashboard")).toBeDefined();
    expect(
      screen.getByText(/Great job! Your interview has been completed/i)
    ).toBeDefined();
  });

  it("renders the 4 key stat cards with metrics", () => {
    renderDashboard();
    expect(screen.getByText("Overall Score")).toBeDefined();
    expect(screen.getByText("Interview Readiness")).toBeDefined();
    expect(screen.getAllByText(/Confidence Level/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Communication/i).length).toBeGreaterThan(0);
  });

  it("renders the performance breakdown section and progress metrics", () => {
    renderDashboard();
    expect(screen.getByText("Performance Breakdown")).toBeDefined();
    expect(screen.getByText("Communication Clarity")).toBeDefined();
    expect(screen.getByText("Content & Relevance")).toBeDefined();
    expect(screen.getAllByText(/Body Language/i).length).toBeGreaterThan(0);
  });

  it("renders the interview summary panel with key stats", () => {
    renderDashboard();
    expect(screen.getByText("Interview Summary")).toBeDefined();
    expect(screen.getByText("Total Questions")).toBeDefined();
    expect(screen.getByText("Relevant Answers")).toBeDefined();
    expect(screen.getByText("Average Answer Time")).toBeDefined();
    expect(screen.getAllByText(/Filler Words/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Clarity & Structure/i).length).toBeGreaterThan(0);
  });

  it("renders strengths, areas to improve, and AI recommendations", () => {
    renderDashboard();
    expect(screen.getByText("Your Strengths")).toBeDefined();
    expect(screen.getByText("Areas to Improve")).toBeDefined();
    expect(screen.getByText("AI Recommendation")).toBeDefined();
    expect(screen.getByText(/Good Technical Knowledge/i)).toBeDefined();
    expect(screen.getByText(/Maintain Eye Contact/i)).toBeDefined();
    expect(screen.getByText(/Reduce Verbal Pauses/i)).toBeDefined();
  });

  it("renders location station, 10km precision radar, and live job recommendations", () => {
    renderDashboard();
    expect(screen.getByText(/Live Career-Ops Radar & Location Station/i)).toBeDefined();
    expect(screen.getByText(/10 KM Precision Radar/i)).toBeDefined();
    expect(screen.getByText(/Top Job Recommendations in/i)).toBeDefined();
    expect(screen.getByText("Frontend Developer")).toBeDefined();
    expect(screen.getByText("Software Engineer")).toBeDefined();
    expect(screen.getByText("UI/UX Designer")).toBeDefined();
  });

  it("renders the active interview blueprints banner with target role and resume button", () => {
    renderDashboard();
    expect(screen.getByText(/1 Interview Blueprint/i)).toBeDefined();
    expect(screen.getByText(/Target: ABC Technologies — Frontend Developer/i)).toBeDefined();
    expect(screen.getByText(/Resume Level 1/i)).toBeDefined();
    expect(screen.getByText(/\+ New Interview/i)).toBeDefined();
  });

  it("renders 10km live radar station with locate me action and precision metrics", () => {
    renderDashboard();
    const locateBtn = screen.getByRole("button", { name: /Locate Me \(10km Radar\)/i });
    expect(locateBtn).toBeDefined();
    expect(screen.getByText(/Live Radar Station/i)).toBeDefined();
    expect(screen.getAllByText(/10 KM/i).length).toBeGreaterThan(0);
  });
});
