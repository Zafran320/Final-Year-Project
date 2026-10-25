import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  MessageSquare,
  HelpCircle,
  Award,
  Video,
  Eye,
  Activity,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { QuestionAnalysisItem, StageDiagnosis } from "./types";
import { toast } from "sonner";

interface StageDiagnosticsAndModelAnswersProps {
  stageDiagnosis?: StageDiagnosis;
  questionAnalysis?: QuestionAnalysisItem[];
  stageNumber?: number;
  stageTitle?: string;
  stageFocusArea?: string;
  overallScore?: number;
}

export function StageDiagnosticsAndModelAnswers({
  stageDiagnosis,
  questionAnalysis = [],
  stageNumber = 1,
  stageTitle,
  stageFocusArea,
  overallScore,
}: StageDiagnosticsAndModelAnswersProps) {
  const [expandedQId, setExpandedQId] = useState<string | null>(
    questionAnalysis.length > 0 ? questionAnalysis[0].id : null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Model answer copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasDiagnostics =
    Boolean(stageDiagnosis) || (questionAnalysis && questionAnalysis.length > 0);

  if (!hasDiagnostics) {
    return null;
  }

  return (
    <section className="space-y-6 w-full mt-6">
      {/* ─── Header: Diagnostic & Model Answer Suite ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Deep Stage Diagnostics &amp; Model Answers
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500 text-white uppercase tracking-wider">
                Stage {stageNumber}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {stageTitle || `Level ${stageNumber}`} {stageFocusArea ? `· ${stageFocusArea}` : ""} — Real Interview Intent &amp; Spoken Answer Breakdown
            </p>
          </div>
        </div>

        {overallScore !== undefined && (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <Award size={16} className="text-orange-500" />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Stage Score:</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">{overallScore}/100</span>
          </div>
        )}
      </div>

      {/* ─── 1. Stage Intent & Objective Card ("انٹرویو کا مقصد") ──────────── */}
      {stageDiagnosis && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-6 rounded-2xl bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-transparent border border-blue-500/20 p-5 space-y-4 shadow-sm dark:shadow-lg"
          >
            <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 pb-2 border-b border-blue-500/20">
              <Target size={18} />
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Stage Goal &amp; Interviewer Intent
              </h3>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
              {stageDiagnosis.stagePurpose}
            </p>

            <div className="space-y-2 pt-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Key Objectives Assessed in This Stage:
              </h4>
              <ul className="space-y-1.5">
                {stageDiagnosis.keyObjectives.map((obj, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <CheckCircle2 size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* ─── 2. Verbal & Non-Verbal Weaknesses ("آپ میں یہ خرابی تھی") ──── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-6 rounded-2xl bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent border border-amber-500/20 p-5 space-y-4 shadow-sm dark:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 pb-2 border-b border-amber-500/20">
                <AlertTriangle size={18} />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Diagnostic Flaws &amp; Improvement Areas
                </h3>
              </div>

              <div className="space-y-3 mt-3">
                {/* Verbal weaknesses */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-orange-500" />
                    Verbal Content &amp; Articulation Gaps:
                  </span>
                  {stageDiagnosis.verbalWeaknesses.map((w, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-amber-500/20 text-xs text-slate-800 dark:text-slate-200 leading-snug"
                    >
                      {w}
                    </div>
                  ))}
                </div>

                {/* Non-verbal / ML vision weaknesses */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Eye size={13} className="text-blue-500" />
                    Body Language &amp; Eye Contact Telemetry:
                  </span>
                  {stageDiagnosis.nonVerbalWeaknesses.map((w, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-blue-500/20 text-xs text-slate-800 dark:text-slate-200 leading-snug"
                    >
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 italic">
              💡 {stageDiagnosis.comprehensiveReview}
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── 3. Question-by-Question Model Answers Breakdown ──────────────── */}
      {questionAnalysis.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen size={17} className="text-orange-500" />
              Question-by-Question Spoken vs. Ideal Model Answers
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                ({questionAnalysis.length} Questions Evaluated)
              </span>
            </h3>
            <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
              Click any question to inspect STAR model answer
            </span>
          </div>

          <div className="space-y-3">
            {questionAnalysis.map((item, idx) => {
              const isExpanded = expandedQId === item.id;
              const gradeColor =
                item.grade === "Strong"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : item.grade === "Partial"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all ${
                    isExpanded
                      ? "bg-white dark:bg-slate-900 border-orange-500/40 shadow-md dark:shadow-xl"
                      : "bg-white/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* Collapsed Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedQId(isExpanded ? null : item.id)}
                    className="w-full text-left p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 focus:outline-none"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <span className="shrink-0 w-7 h-7 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-extrabold text-xs flex items-center justify-center border border-orange-500/20">
                        Q{item.questionNumber || idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {item.question}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          Candidate transcript: {item.candidateAnswer}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${gradeColor}`}
                      >
                        {item.grade}
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 hidden sm:inline">
                        {item.score}/100
                      </span>
                      <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="px-4 sm:px-6 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/80 space-y-4"
                      >
                        {/* 1. Candidate's Actual Spoken Transcript */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <MessageSquare size={12} className="text-slate-400" />
                            Your Spoken Answer:
                          </span>
                          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal italic">
                            "{item.candidateAnswer}"
                          </p>
                        </div>

                        {/* 2. Ideal Model Answer Box with Copy Button ("یہ اس کا انسر یہ تھا یا یہ بنتا ہے") */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent border border-emerald-500/20 space-y-2 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <Sparkles size={13} className="text-emerald-500" />
                              Ideal Model Answer (STAR / Engineering Best Practice):
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(item.idealModelAnswer, item.id)}
                              className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-md transition"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check size={12} /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={12} /> Copy Model Answer
                                </>
                              )}
                            </button>
                          </div>

                          <pre className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                            {item.idealModelAnswer}
                          </pre>
                        </div>

                        {/* 3. Gap Analysis: What was Missing ("آپ میں یہ خرابی تھی") */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle size={12} />
                              What Was Missing in Your Answer:
                            </span>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {item.whatWasMissing}
                            </p>
                          </div>

                          {item.deliveryFeedback && (
                            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <Activity size={12} />
                                Spoken Delivery &amp; ML Telemetry:
                              </span>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                {item.deliveryFeedback}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
