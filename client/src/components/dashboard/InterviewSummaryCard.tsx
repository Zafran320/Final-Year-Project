import React from "react";
import { motion } from "framer-motion";
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  Mic2,
  Sparkles,
  Star,
  Layers,
  Award
} from "lucide-react";
import { InterviewStats } from "./types";
import { useAnimatedCount } from "./useAnimatedCount";

interface InterviewSummaryCardProps {
  stats: InterviewStats;
  animationKey?: number;
}

export function InterviewSummaryCard({
  stats,
  animationKey = 0,
}: InterviewSummaryCardProps) {
  const animatedQuestions = useAnimatedCount(stats.totalQuestions, 1000, animationKey);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 lg:p-6 shadow-sm dark:shadow-xl flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
            <FileCheck2 size={16} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Interview Summary
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Session Overview &amp; Key Stats
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          Passed
        </span>
      </div>

      {/* Structured Stats Rows */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 my-2">
        {/* Row 1: Total Questions */}
        <div className="py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Layers size={14} className="text-slate-400" />
            <span>Total Questions</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-sm tabular-nums">
            {animatedQuestions}
          </span>
        </div>

        {/* Row 2: Relevant Answers */}
        <div className="py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <CheckCircle2 size={14} className="text-emerald-500 dark:text-emerald-400" />
            <span>Relevant Answers</span>
          </div>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm tabular-nums">
            {stats.relevantAnswers}
          </span>
        </div>

        {/* Row 3: Average Answer Time */}
        <div className="py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Clock size={14} className="text-amber-500 dark:text-amber-400" />
            <span>Average Answer Time</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-sm">
            {stats.averageAnswerTime}
          </span>
        </div>

        {/* Row 4: # of Filler Words Used */}
        <div className="py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Mic2 size={14} className="text-indigo-500 dark:text-indigo-400" />
            <span># of Filler Words Used</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            {stats.fillerWordsUsage}
          </span>
        </div>

        {/* Row 5: Clarity & Structure */}
        <div className="py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Sparkles size={14} className="text-teal-500 dark:text-teal-400" />
            <span>Clarity &amp; Structure</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            {stats.clarityAndStructure}
          </span>
        </div>

        {/* Row 6: Overall Impression */}
        <div className="py-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Award size={14} className="text-orange-500 dark:text-orange-400" />
            <span>Overall Impression</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((starIdx) => (
                <Star
                  key={starIdx}
                  size={14}
                  className={`${
                    starIdx <= stats.rating
                      ? "text-orange-400 fill-orange-400 drop-shadow-[0_0_4px_rgba(251,146,60,0.7)]"
                      : "text-slate-300 dark:text-slate-700"
                  }`}
                />
              ))}
            </div>
            <span className="font-extrabold text-orange-500 dark:text-orange-400 text-sm">
              {stats.rating}/{stats.maxRating}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
