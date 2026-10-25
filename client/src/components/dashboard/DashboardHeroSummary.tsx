import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Award, Zap, Smile, MessageSquare, CheckCircle2 } from "lucide-react";
import { useAnimatedCount } from "./useAnimatedCount";
import { DashboardData } from "./types";

interface DashboardHeroSummaryProps {
  data: DashboardData;
  isSimulating?: boolean;
  animationKey?: number;
}

export function DashboardHeroSummary({
  data,
  isSimulating = false,
  animationKey = 0,
}: DashboardHeroSummaryProps) {
  const animatedOverallScore = useAnimatedCount(data.overallScore, 1400, animationKey);
  const animatedReadiness = useAnimatedCount(data.interviewReadiness, 1400, animationKey);
  const animatedConfidence = useAnimatedCount(data.confidenceLevel, 1400, animationKey);
  const animatedCommunication = useAnimatedCount(data.communicationScore, 1400, animationKey);

  // SVG Circular progress math
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedOverallScore / 100) * circumference;

  return (
    <div className="w-full space-y-6">
      {/* ─── Hero Header & Big Circular Score Ring ───────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/60">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
              data.overallScore > 0
                ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                : "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30"
            }`}>
              {data.overallScore > 0 ? "Analysis Complete" : "Setup Required"}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated by CareerTwin AI Core
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Interview Performance Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            {data.overallScore > 0
              ? "Great job! Your interview has been completed. Here's your performance analysis."
              : "Generate your personalized 10-stage mock interview blueprint to unlock real-time performance analytics."}
          </p>
        </div>

        {/* Big Top Right Glowing Circular Score Indicator (82) */}
        <div className="flex items-center gap-4 self-start md:self-auto bg-slate-50 dark:bg-[#101626]/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-xl dark:shadow-black/40 backdrop-blur-sm">
          <div className="relative size-20 flex items-center justify-center">
            {/* Ambient Pulse Ring */}
            <div className="absolute inset-0 rounded-full bg-orange-500/15 animate-ping opacity-30" />
            <svg className="size-20 -rotate-90 transform" viewBox="0 0 80 80">
              {/* Background Track */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="6"
                fill="transparent"
              />
              {/* Animated Glowing Progress Ring */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-[#ff5722] transition-all duration-1000 ease-out"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: "drop-shadow(0 0 6px rgba(255, 87, 34, 0.6))",
                }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {animatedOverallScore}
              </span>
            </div>
          </div>
          <div className="pr-2">
            <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
              Scorecard
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {data.overallScoreLabel}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Benchmark: Top 15%
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4 Quick Metric Cards Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Score */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm dark:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80 transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">Overall Score</span>
            <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <Award size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-[#ff5722] tracking-tight">
              {animatedOverallScore}
            </span>
            <span className="text-base font-semibold text-slate-400">/100</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle2 size={13} className="text-emerald-500 dark:text-emerald-400" />
            <span>{data.overallScoreLabel}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-600 via-amber-500 to-transparent opacity-80" />
        </motion.div>

        {/* Card 2: Interview Readiness */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm dark:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80 transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">Interview Readiness</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Zap size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {animatedReadiness}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">{data.readinessLabel}</span>
            {data.readinessDelta ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <TrendingUp size={13} /> {data.readinessDelta}
              </span>
            ) : null}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-transparent opacity-80" />
        </motion.div>

        {/* Card 3: Confidence Level */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm dark:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80 transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">Confidence Level</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Smile size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {animatedConfidence}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">{data.confidenceLabel}</span>
            {data.confidenceDelta ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <TrendingUp size={13} /> {data.confidenceDelta}
              </span>
            ) : null}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-400 to-transparent opacity-80" />
        </motion.div>

        {/* Card 4: Communication */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm dark:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80 transition-all group"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">Communication</span>
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-500 border border-teal-500/20">
              <MessageSquare size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {animatedCommunication}%
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">{data.communicationLabel}</span>
            {data.communicationDelta ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <TrendingUp size={13} /> {data.communicationDelta}
              </span>
            ) : null}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-transparent opacity-80" />
        </motion.div>
      </div>
    </div>
  );
}
