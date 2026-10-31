import { DEFAULT_CITY_NAME } from "@shared/pakistanCities";
import { DashboardData } from "./types";

// Empty dashboard state before the first interview. Every performance metric must come
// from a real live-interview evaluation, and jobs come only from the live job search.
export const zeroStateDashboardData: DashboardData = {
  overallScore: 0,
  overallScoreLabel: "Pending Assessment",
  interviewReadiness: 0,
  readinessLabel: "Not Assessed",
  confidenceLevel: 0,
  confidenceLabel: "Not Assessed",
  communicationScore: 0,
  communicationLabel: "Not Assessed",
  radarMetrics: [
    { key: "eye_contact", label: "Eye Contact", value: 0, fullMark: 100 },
    { key: "confidence", label: "Confidence", value: 0, fullMark: 100 },
    { key: "communication", label: "Communication", value: 0, fullMark: 100 },
    { key: "clarity", label: "Clarity", value: 0, fullMark: 100 },
    { key: "language_skills", label: "Language Skills", value: 0, fullMark: 100 },
    { key: "content_quality", label: "Content Quality", value: 0, fullMark: 100 },
    { key: "body_language", label: "Body Language", value: 0, fullMark: 100 },
  ],
  progressMetrics: [
    { key: "eye_contact", label: "Eye Contact", value: 0 },
    { key: "confidence", label: "Confidence Level", value: 0 },
    { key: "communication_clarity", label: "Communication Clarity", value: 0 },
    { key: "content_relevance", label: "Content & Relevance", value: 0 },
    { key: "body_language", label: "Body Language", value: 0 },
    { key: "language_skills", label: "Language Skills", value: 0 },
  ],
  interviewStats: {
    totalQuestions: 0,
    relevantAnswers: "0/0",
    averageAnswerTime: "--",
    fillerWordsUsage: "Low",
    clarityAndStructure: "Needs Work",
    rating: 0,
    maxRating: 5,
  },
  strengths: [
    "Complete your first AI mock interview to reveal your technical & behavioral strengths.",
  ],
  improvements: [
    { id: "1", text: "Take an AI rehearsal to receive targeted feedback", badge: "Improve", badgeVariant: "orange" },
  ],
  aiAdvice:
    "Launch an AI mock interview session to unlock your real-time performance evaluation and tailored job recommendations.",
  nextGoal: "Target: 80%+",
  selectedCity: DEFAULT_CITY_NAME,
  jobs: [],
};
