import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Target,
  ShieldCheck,
  Zap
} from "lucide-react";
import { ImprovementItem } from "./types";
import { useAnimatedCount } from "./useAnimatedCount";

interface StrengthsAndImprovementsProps {
  strengths: string[];
  improvements: ImprovementItem[];
  aiAdvice: string;
  nextGoal: string;
  currentScore: number;
  animationKey?: number;
  stageInfo?: {
    stageNumber?: number;
    stageTitle?: string;
    stageFocusArea?: string;
    measuredByML?: boolean;
  };
}

export function StrengthsAndImprovements({
  strengths,
  improvements,
  aiAdvice,
  nextGoal,
  currentScore,
  animationKey = 0,
  stageInfo,
}: StrengthsAndImprovementsProps) {
  const animatedScore = useAnimatedCount(currentScore, 1400, animationKey);

  const stageAttribution = stageInfo?.stageNumber
    ? `Stage ${stageInfo.stageNumber}${stageInfo.stageTitle ? ` · ${stageInfo.stageTitle}` : ""}${
        stageInfo.stageFocusArea ? ` · ${stageInfo.stageFocusArea}` : ""
      }`
    : null;

  // Mini circular gauge math
  const gaugeRadius = 24;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (animatedScore / 100) * gaugeCircumference;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
      {/* ─── Card 1: Your Strengths (Green Theme) ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm dark:shadow-xl flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800/80 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Your Strengths
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {stageAttribution ? `Measured in ${stageAttribution}` : "Validated Competencies"}
              </p>
            </div>
          </div>

          <ul className="space-y-3">
            {strengths.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200"
              >
                <span className="shrink-0 mt-0.5 text-emerald-500 dark:text-emerald-400">
                  <CheckCircle size={15} />
                </span>
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Behavioral &amp; Technical Fit</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {strengths.length > 0
              ? stageInfo?.measuredByML
                ? `${strengths.length} ML-Measured`
                : `${strengths.length} Validated`
              : "Not Measured Yet"}
          </span>
        </div>
      </motion.div>

      {/* ─── Card 2: Areas to Improve (Amber/Orange Theme) ────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm dark:shadow-xl flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800/80 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Areas to Improve
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {stageAttribution ? `Stage-Based Focus · ${stageAttribution}` : "Actionable Focus Points"}
              </p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {improvements.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 text-xs text-slate-700 dark:text-slate-200 py-0.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 dark:text-amber-400 shrink-0">
                    <AlertTriangle size={13} />
                  </span>
                  <span className="leading-tight">{item.text}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    item.badge === "Needs Practice"
                      ? "bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/30"
                      : item.badge === "Moderate"
                      ? "bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30"
                      : "bg-orange-500/15 text-orange-500 dark:text-orange-400 border border-orange-500/30"
                  }`}
                >
                  {item.badge}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Priority Practice Items</span>
          <span className="text-orange-500 dark:text-orange-400 font-semibold">Next Stage Rehearsal</span>
        </div>
      </motion.div>

      {/* ─── Card 3: AI Recommendation & Next Goal (Purple/Coral Theme) ──── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm dark:shadow-xl flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800/80 mb-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 dark:text-orange-400 border border-orange-500/20">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                AI Recommendation
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Personalized Coaching Note
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {aiAdvice}
          </p>
        </div>

        {/* Next Goal + Mini Circular Gauge */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/60">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Target Milestone
            </div>
            <div className="text-sm font-extrabold text-[#ff5722]">
              Next Goal: {nextGoal}
            </div>
          </div>

          {/* Mini Radial Gauge matching PDF */}
          <div className="relative size-14 flex items-center justify-center">
            <svg className="size-14 -rotate-90 transform" viewBox="0 0 60 60">
              <circle
                cx="30"
                cy="30"
                r={gaugeRadius}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="30"
                cy="30"
                r={gaugeRadius}
                className="stroke-[#ff5722] transition-all duration-1000 ease-out"
                strokeWidth="4"
                strokeDasharray={gaugeCircumference}
                strokeDashoffset={gaugeOffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: "drop-shadow(0 0 4px rgba(255, 87, 34, 0.6))",
                }}
              />
            </svg>
            <div className="absolute text-xs font-black text-slate-900 dark:text-white">
              {animatedScore}%
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
