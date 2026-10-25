export interface RadarMetric {
  key: string;
  label: string;
  value: number; // 0 to 100
  fullMark: number;
}

export interface MetricProgressBarItem {
  key: string;
  label: string;
  value: number; // 0 to 100
}

export interface InterviewStats {
  totalQuestions: number;
  relevantAnswers: string; // e.g. "9/12"
  averageAnswerTime: string; // e.g. "1m 35s"
  fillerWordsUsage: "Low" | "Moderate" | "High";
  clarityAndStructure: "Good" | "Excellent" | "Needs Work";
  rating: number; // e.g. 4
  maxRating: number; // 5
}

export interface ImprovementItem {
  id: string;
  text: string;
  badge: "Improve" | "Moderate" | "Needs Practice" | "Crucial";
  badgeVariant: "orange" | "yellow" | "red" | "purple";
  measuredValue?: number;
}

export interface StageHistoryEntry {
  stageNumber: number;
  overallScore: number;
  completedAt?: string;
  measuredByML?: boolean;
  stageTitle?: string;
}

export interface JobCardData {
  id: string;
  title: string;
  company: string;
  companyLogoVariant: "abc" | "xyz" | "creative" | "generic";
  matchPercentage: number;
  location: string;
  jobType: string;
  experience: string;
  salaryRange: string;
  skills: string[];
  source: string;
  link: string;
}

export interface CityPin {
  id: string;
  name: string;
  province: string;
  coordinates: { x: number; y: number }; // SVG percentage or relative coords
  isMainCapital?: boolean;
}

export interface QuestionAnalysisItem {
  id: string;
  questionNumber: number;
  question: string;
  candidateAnswer: string;
  grade: "Strong" | "Partial" | "Needs Improvement";
  idealModelAnswer: string;
  whatWasMissing: string;
  deliveryFeedback?: string;
  score: number; // 0 to 100
}

export interface StageDiagnosis {
  stagePurpose: string;
  keyObjectives: string[];
  verbalWeaknesses: string[];
  nonVerbalWeaknesses: string[];
  comprehensiveReview: string;
}

export interface DashboardData {
  overallScore: number;
  overallScoreLabel: string;
  overallScoreDelta?: string;
  interviewReadiness: number;
  readinessLabel: string;
  readinessDelta?: string;
  confidenceLevel: number;
  confidenceLabel: string;
  confidenceDelta?: string;
  communicationScore: number;
  communicationLabel: string;
  communicationDelta?: string;
  radarMetrics: RadarMetric[];
  progressMetrics: MetricProgressBarItem[];
  interviewStats: InterviewStats;
  strengths: string[];
  improvements: ImprovementItem[];
  aiAdvice: string;
  nextGoal: string;
  selectedCity: string;
  jobs: JobCardData[];
  stageNumber?: number;
  stageTitle?: string;
  stageFocusArea?: string;
  measuredByML?: boolean;
  stageHistory?: StageHistoryEntry[];
  questionAnalysis?: QuestionAnalysisItem[];
  stageDiagnosis?: StageDiagnosis;
}
