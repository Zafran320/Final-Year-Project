import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { DEFAULT_CITY_NAME, findKnownCity } from "@shared/pakistanCities";
import { motion, AnimatePresence } from "framer-motion";
import {
  Info,
  Sparkles,
  Flame,
  ArrowRight,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Loader2,
  TrendingUp,
  Target,
  FileCheck2,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { AccountNavigation, type AccountNavDestination } from "@/components/AccountNavigation";
import { DashboardHeroSummary } from "@/components/dashboard/DashboardHeroSummary";
import { PerformanceRadarChart } from "@/components/dashboard/PerformanceRadarChart";
import { MetricProgressBars } from "@/components/dashboard/MetricProgressBars";
import { InterviewSummaryCard } from "@/components/dashboard/InterviewSummaryCard";
import { StrengthsAndImprovements } from "@/components/dashboard/StrengthsAndImprovements";
import { StageDiagnosticsAndModelAnswers } from "@/components/dashboard/StageDiagnosticsAndModelAnswers";
import { JobRecommendationsGrid } from "@/components/dashboard/JobRecommendationsGrid";
import {
  zeroStateDashboardData,
} from "@/components/dashboard/mockData";
import { DashboardData } from "@/components/dashboard/types";
import { trpc } from "@/lib/trpc";
import { getProfileImageUrl } from "@/lib/profileImage";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function InterviewPerformanceDashboard() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  // Queries
  const profileQuery = trpc.careerProfile.get.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const analyticsQuery = trpc.practicePreparation.getUserInterviewAnalytics.useQuery(undefined, {
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY_NAME);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const hasInitializedCity = useRef(false);

  const handleResumeSession = (targetSession?: any) => {
    const sessionToResume = targetSession || activeSession || analyticsQuery.data?.activeSession;
    if (!sessionToResume) {
      setLocation("/?screen=company-prep");
      return;
    }

    try {
      const rawLevels = Array.isArray(sessionToResume.levels)
        ? sessionToResume.levels
        : typeof sessionToResume.levels === "string"
        ? JSON.parse(sessionToResume.levels)
        : [];
      const currentLvl = sessionToResume.currentLevel || 1;
      const levelDetails = rawLevels.find((l: any) => l.level_number === currentLvl) || rawLevels[0];

      sessionStorage.setItem(
        "ct_active_interview_session",
        JSON.stringify({
          sessionId: sessionToResume.id,
          companyName: sessionToResume.companyName,
          targetRole: sessionToResume.targetRole,
          currentLevel: currentLvl,
          levelDetails,
          allLevels: rawLevels,
          fullscreenLockdown: true,
          startedAt: Date.now(),
        })
      );
    } catch (e) {
      console.warn("Failed to store active session in sessionStorage", e);
    }

    setLocation("/?screen=question-plan");
  };

  const navigateFromNavbar = (destination: AccountNavDestination) => {
    if (destination === "home") setLocation("/");
    if (destination === "dashboard") setLocation("/dashboard");
    if (destination === "jobs") setLocation("/jobs");
    if (destination === "account") setLocation("/account");
    if (destination === "privacy") setLocation("/?screen=session");
    if (destination === "practice") {
      if (analyticsQuery.data?.activeSession || (analyticsQuery.data?.allSessions?.length ?? 0) > 0) {
        handleResumeSession(activeSession || analyticsQuery.data?.activeSession);
      } else {
        setLocation("/?screen=company-prep");
      }
    }
  };

  const signOutFromNavbar = async () => {
    await logout();
    setLocation("/");
  };

  // Initialize City from Profile if available
  useEffect(() => {
    if (!hasInitializedCity.current && profileQuery.data?.location) {
      const matchedCity = findKnownCity(profileQuery.data.location);
      if (matchedCity) {
        setSelectedCity(matchedCity.name);
        hasInitializedCity.current = true;
      }
    }
  }, [profileQuery.data?.location]);

  // Derive dashboard data reactively from real backend analytics.
  // ONLY original values measured during live interviews are rendered —
  // no mock numbers anywhere. Empty states show honest zeros.
  const dashboardData = useMemo<DashboardData>(() => {
    const analytics = analyticsQuery.data;

    if (analytics && analytics.scorecard) {
      const card = analytics.scorecard;
      return {
        overallScore: card.overallScore,
        overallScoreLabel: card.overallScoreLabel,
        interviewReadiness: card.interviewReadiness,
        readinessLabel: card.readinessLabel,
        confidenceLevel: card.confidenceLevel,
        confidenceLabel: card.confidenceLabel,
        communicationScore: card.communicationScore,
        communicationLabel: card.communicationLabel,
        radarMetrics: card.radarMetrics,
        progressMetrics: card.progressMetrics,
        interviewStats: card.interviewStats,
        strengths: card.strengths,
        improvements: card.improvements,
        aiAdvice: card.aiAdvice,
        nextGoal: card.nextGoal,
        stageNumber: card.stageNumber,
        stageTitle: card.stageTitle,
        stageFocusArea: card.stageFocusArea,
        measuredByML: card.measuredByML,
        stageHistory: analytics.stageHistory,
        questionAnalysis: card.questionAnalysis,
        stageDiagnosis: card.stageDiagnosis,
        selectedCity: selectedCity,
        jobs: zeroStateDashboardData.jobs,
      };
    }

    return {
      ...zeroStateDashboardData,
      selectedCity,
    };
  }, [analyticsQuery.data, selectedCity]);

  const activeSession =
    analyticsQuery.data?.allSessions?.find((s: any) => s.id === selectedSessionId) ||
    analyticsQuery.data?.activeSession;

  const candidateSkills = profileQuery.data?.skills || "React, TypeScript, Node.js, SQL";
  const targetRole = activeSession?.targetRole || profileQuery.data?.targetRole || profileQuery.data?.careerField || "Frontend Developer";
  const savedProfileLocation = profileQuery.data?.location;

  const handleSelectCity = useCallback((city: string) => {
    setSelectedCity(city);
  }, []);

  return (
    <main className="ct-account-shell ct-page-transition min-h-screen flex flex-col">
      {/* ─── 1. Real Website Global Header ────────────────────────────────── */}
      <AccountNavigation
        userName={user?.name || ""}
        profileImageUrl={profileQuery.data?.profilePhotoUrl ?? getProfileImageUrl(user)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={navigateFromNavbar}
        onSignOut={signOutFromNavbar}
        activeDestination="dashboard"
        authenticated={isAuthenticated}
        loading={authLoading}
        onLogin={() => setLocation("/login?next=%2Fdashboard")}
        onSignup={() => setLocation("/signup?next=%2Fdashboard")}
      />

      {/* ─── Main Content Canvas ─────────────────────────────────────────── */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 flex-1">
        {/* Loading Skeleton */}
        {analyticsQuery.isLoading && !analyticsQuery.data ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-28 bg-slate-200 dark:bg-slate-800/80 rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800/80 rounded-2xl" />
              ))}
            </div>
            <div className="h-80 bg-slate-200 dark:bg-slate-800/80 rounded-2xl" />
          </div>
        ) : (
          <>

            {/* ─── Active Blueprint & Generated Sessions Navigator ─────────── */}
            {analyticsQuery.data?.allSessions && analyticsQuery.data.allSessions.length > 0 ? (
              <div className="rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-orange-500 text-white">
                      {analyticsQuery.data.totalSessions} Interview Blueprint{analyticsQuery.data.totalSessions > 1 ? "s" : ""}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      10-Stage Progression · Unlimited Live Adaptive Questions
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Target: {activeSession?.companyName || "Career Rehearsal"} — {activeSession?.targetRole || "Software Engineer"}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Current Stage: <span className="font-semibold text-orange-600 dark:text-orange-400">Level {activeSession?.currentLevel || 1} of {activeSession?.totalLevels || 10}</span> ({activeSession?.status === "completed" ? "Completed" : activeSession?.status === "in_progress" ? "In Progress" : "Generated"})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
                  {analyticsQuery.data.allSessions.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs py-1">
                      {analyticsQuery.data.allSessions.map((s: any) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedSessionId(s.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                            (selectedSessionId === s.id || (!selectedSessionId && analyticsQuery.data?.activeSession?.id === s.id))
                              ? "bg-orange-500 text-white shadow-sm"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-500/50"
                          }`}
                        >
                          {s.companyName || "Rehearsal"} (L{s.currentLevel})
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleResumeSession(activeSession)}
                    className="ct-button ct-button--primary flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                    style={{ minHeight: 38, padding: "0 14px", fontSize: 13 }}
                  >
                    <Play size={14} className="fill-current" />
                    <span>Resume Level {activeSession?.currentLevel || 1}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocation("/?screen=company-prep")}
                    className="ct-button ct-button--secondary flex items-center gap-1.5"
                    style={{ minHeight: 38, padding: "0 12px", fontSize: 13 }}
                  >
                    <Sparkles size={13} className="text-orange-500" />
                    <span>+ New Interview</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/30 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-600 dark:text-orange-400">
                    <Sparkles size={12} /> Ready to Practice
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                    Generate Your 10-Level Interview Blueprint
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                    Tailored specifically to your CV profile and dream company job description with realistic progressive difficulty (Easy → Intermediate → Hard).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLocation("/?screen=company-prep")}
                  className="ct-button ct-button--primary flex items-center gap-2 whitespace-nowrap shadow-lg shadow-orange-500/25"
                  style={{ minHeight: 42, padding: "0 18px", fontSize: 14 }}
                >
                  <Sparkles size={15} />
                  <span>Generate Blueprint</span>
                </button>
              </div>
            )}

            {/* ─── 2. Top Summary Section (Hero Title, Glowing Score ring, 4 Cards) ─ */}
            <DashboardHeroSummary
              data={dashboardData}
            />

            {/* ─── Honest empty-state notice: no live measurement yet ─────── */}
            {dashboardData.overallScore === 0 && !dashboardData.measuredByML && (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4 flex items-start gap-3">
                <span className="text-orange-500 mt-0.5">
                  <AlertCircle size={16} />
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">No live measurements yet.</span>{" "}
                  Every metric on this dashboard fills in with real values measured during your live interview
                  stages (camera &amp; voice analysis). Complete a stage to see your original performance data here.
                </p>
              </div>
            )}

            {/* ─── Stage history strip (real per-stage scores) ─────────────── */}
            {dashboardData.stageHistory && dashboardData.stageHistory.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-4 sm:p-5 shadow-sm dark:shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={15} className="text-orange-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stage History</h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {dashboardData.stageHistory.length} stage{dashboardData.stageHistory.length > 1 ? "s" : ""} measured live
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {dashboardData.stageHistory.map((entry, idx) => (
                    <div
                      key={`${entry.stageNumber}-${idx}`}
                      className="shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 min-w-[84px]"
                      title={entry.stageTitle || `Stage ${entry.stageNumber}`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Stage {entry.stageNumber}
                      </span>
                      <span
                        className={`text-base font-extrabold ${
                          entry.overallScore >= 75
                            ? "text-emerald-500"
                            : entry.overallScore >= 50
                            ? "text-amber-500"
                            : "text-orange-500"
                        }`}
                      >
                        {entry.overallScore}
                      </span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500">
                        {entry.measuredByML ? "ML Measured" : "Evaluated"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── 3. Performance Breakdown & Interview Summary (2-Column Grid) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Performance Breakdown (Radar + Progress Bars) */}
              <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 lg:p-7 flex flex-col justify-between transition-colors shadow-sm dark:shadow-xl">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800/80 mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Performance Breakdown
                    </h3>
                    <button
                      type="button"
                      title="Multi-dimensional behavioral and speech synthesis evaluation"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <Info size={15} />
                    </button>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                    Core Metrics
                  </span>
                </div>

                {/* Split layout: Radar Chart on Left, Progress Bars on Right */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Radar Chart */}
                  <div className="md:col-span-6 flex items-center justify-center">
                    <PerformanceRadarChart
                      metrics={dashboardData.radarMetrics}
                    />
                  </div>

                  {/* Progress Bars */}
                  <div className="md:col-span-6 flex flex-col justify-center">
                    <MetricProgressBars
                      metrics={dashboardData.progressMetrics}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Interview Summary Panel */}
              <div className="lg:col-span-4 flex flex-col">
                <InterviewSummaryCard
                  stats={dashboardData.interviewStats}
                />
              </div>
            </div>

            {/* ─── 4. Strengths & Improvements & AI Recommendation (3 Cards) ──── */}
            <StrengthsAndImprovements
              strengths={dashboardData.strengths}
              improvements={dashboardData.improvements}
              aiAdvice={dashboardData.aiAdvice}
              nextGoal={dashboardData.nextGoal}
              currentScore={dashboardData.overallScore}
              stageInfo={{
                stageNumber: dashboardData.stageNumber,
                stageTitle: dashboardData.stageTitle,
                stageFocusArea: dashboardData.stageFocusArea,
                measuredByML: dashboardData.measuredByML,
              }}
            />

            {/* ─── 4b. Deep Stage Diagnostics & Model Answers (STAR Breakdown) ─ */}
            <StageDiagnosticsAndModelAnswers
              stageDiagnosis={dashboardData.stageDiagnosis}
              questionAnalysis={dashboardData.questionAnalysis}
              stageNumber={dashboardData.stageNumber}
              stageTitle={dashboardData.stageTitle}
              stageFocusArea={dashboardData.stageFocusArea}
              overallScore={dashboardData.overallScore}
            />

            {/* ─── 5. Location & Top Job Recommendations Grid (Real-Time Live) ─── */}
            <JobRecommendationsGrid
              initialJobs={dashboardData.jobs}
              selectedCity={selectedCity}
              onSelectCity={handleSelectCity}
              candidateSkills={candidateSkills}
              targetRole={targetRole}
              interviewScore={dashboardData.overallScore}
              savedProfileLocation={savedProfileLocation}
            />
          </>
        )}
      </div>
    </main>
  );
}
