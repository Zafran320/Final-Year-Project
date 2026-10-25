import React, { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Lock,
  LockKeyhole,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import type { InterviewLevel } from "@shared/roadmapTypes";

const DEFAULT_INTERVIEWER_VOICE = "Puck";

export type PracticeRoadmapProps = {
  sessionId: number;
  companyName: string;
  targetRole: string;
  levels: InterviewLevel[];
  currentLevel?: number;
  onStartLevel?: (levelNumber: number) => void;
  onRegenerate?: () => void;
};

export default function PracticeRoadmap({
  sessionId,
  companyName,
  targetRole,
  levels,
  currentLevel = 1,
  onStartLevel,
  onRegenerate,
}: PracticeRoadmapProps) {
  const [, setLocation] = useLocation();
  const [selectedLevelNum, setSelectedLevelNum] = useState<number>(currentLevel);
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "Easy" | "Intermediate" | "Hard">("all");
  const [fullscreenLockdown, setFullscreenLockdown] = useState<boolean>(true);
  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>({
    [currentLevel]: true,
  });

  const toggleLevelExpand = (levelNum: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedLevels((prev) => ({
      ...prev,
      [levelNum]: !prev[levelNum],
    }));
    setSelectedLevelNum(levelNum);
  };

  const filteredLevels = levels.filter((lvl) => {
    if (difficultyFilter !== "all" && lvl.difficulty !== difficultyFilter) return false;
    return true;
  });

  const currentLevelData = levels.find((l) => l.level_number === currentLevel) || levels[0];

  const handleStartLevel = async (levelNumber: number = 1) => {
    if (levelNumber > currentLevel) {
      toast.info(`Stage ${levelNumber} is locked. Complete Stage ${levelNumber - 1} first!`);
      return;
    }

    try {
      sessionStorage.setItem(
        "ct_active_interview_session",
        JSON.stringify({
          sessionId,
          companyName,
          targetRole,
          currentLevel: levelNumber,
          levelDetails: levels.find((l) => l.level_number === levelNumber),
          allLevels: levels,
          fullscreenLockdown,
          voice: DEFAULT_INTERVIEWER_VOICE,
          startedAt: Date.now(),
        })
      );
    } catch {}

    if (fullscreenLockdown) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
      } catch (fsErr) {
        console.warn("Fullscreen request was dismissed or not permitted:", fsErr);
      }
    }

    if (onStartLevel) {
      onStartLevel(levelNumber);
    } else {
      setLocation(`/live-interview?sessionId=${sessionId}&level=${levelNumber}`);
    }
  };

  const renderBadge = (difficulty: "Easy" | "Intermediate" | "Hard") => {
    switch (difficulty) {
      case "Easy":
        return <span className="ct-badge ct-badge--required">Easy</span>;
      case "Intermediate":
        return <span className="ct-badge ct-badge--preferred">Intermediate</span>;
      case "Hard":
        return <span className="ct-badge ct-badge--tech">Hard</span>;
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-300">
      {/* ─── Ultra-Compact Control Bar: Filter Pills & Fullscreen Lockdown ── */}
      <div
        className="ct-company-card relative overflow-hidden"
        style={{
          padding: "8px 16px",
          margin: 0,
          borderRadius: 14,
          background:
            "radial-gradient(260px 80px at 0% 0%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%), var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="pointer-events-none absolute -top-8 -left-8 size-20 rounded-full bg-[var(--accent)] opacity-10 blur-lg" aria-hidden="true" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Difficulty Filter Toggle Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] flex items-center gap-1 mr-1">
              <Filter size={11} /> Filter:
            </span>
            {(["all", "Easy", "Intermediate", "Hard"] as const).map((diff) => {
              const isActive = difficultyFilter === diff;
              return (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficultyFilter(diff)}
                  style={{
                    height: 26,
                    minHeight: 26,
                    padding: "0 10px",
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 500,
                    borderRadius: 7,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: isActive
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border)",
                    background: isActive
                      ? "var(--accent)"
                      : "var(--surface-raised)",
                    color: isActive ? "#ffffff" : "var(--text-muted)",
                    cursor: "pointer",
                    transition: "all 150ms ease",
                  }}
                >
                  {diff === "all" ? `All (${levels.length})` : diff}
                </button>
              );
            })}
          </div>

          {/* Fullscreen Lockdown Toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer m-0 p-0 select-none">
              <input
                type="checkbox"
                checked={fullscreenLockdown}
                onChange={(e) => setFullscreenLockdown(e.target.checked)}
                className="cursor-pointer"
                style={{ width: 13, height: 13, accentColor: "var(--accent)" }}
              />
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <ShieldCheck size={12} className="text-[var(--accent)]" /> Fullscreen Lockdown
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ─── Active Stage Continuation Banner ─────────────────────────────── */}
      {currentLevelData && (
        <div
          className="ct-company-card relative overflow-hidden"
          style={{
            padding: "16px 20px",
            margin: 0,
            borderRadius: 16,
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--surface)), var(--surface))",
            border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))",
            boxShadow: "0 8px 24px -6px color-mix(in srgb, var(--accent) 15%, transparent)",
          }}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[var(--accent)] text-white shadow-sm">
                  Active Stage {currentLevel} of {levels.length}
                </span>
                <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  {currentLevelData.title}
                </span>
                <div className="hidden sm:inline-block">{renderBadge(currentLevelData.difficulty)}</div>
              </div>
              <p className="text-xs text-[var(--text-muted)] max-w-2xl leading-relaxed m-0">
                <strong className="text-[var(--text)]">Focus:</strong> {currentLevelData.focus_area}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleStartLevel(currentLevel)}
              className="ct-button ct-button--primary flex items-center gap-2 shadow-lg shadow-orange-500/25 shrink-0 whitespace-nowrap"
              style={{
                minHeight: 40,
                padding: "0 20px",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <Play size={14} fill="white" />
              <span>Continue Stage {currentLevel} Rehearsal</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Compact Table View ─────────────────────────────────────────── */}
      <div
        className="ct-company-card relative overflow-hidden"
        style={{
          padding: 0,
          margin: 0,
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        {/* Table Header */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface-raised)",
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: "var(--accent)" }} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] m-0">
              {levels.length}-Stage Progression Table ({filteredLevels.length} Stages)
            </h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            Stage {currentLevel} Active · Click row to expand rubric
          </span>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-[var(--border)]" style={{ borderColor: "var(--border)" }}>
          {filteredLevels.map((lvl) => {
            const isUnlocked = lvl.level_number <= currentLevel;
            const isCurrent = lvl.level_number === currentLevel;
            const isExpanded = expandedLevels[lvl.level_number] ?? false;

            return (
              <div
                key={lvl.level_number}
                className="transition-colors"
                style={{
                  background: isCurrent
                    ? "radial-gradient(320px 100px at 0% 0%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 70%), var(--surface)"
                    : undefined,
                }}
              >
                {/* Main Row Content */}
                <div
                  onClick={() => toggleLevelExpand(lvl.level_number)}
                  className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[var(--surface-raised)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Stage Step Indicator */}
                    <div className="shrink-0">
                      {isCurrent ? (
                        <span
                          className="ct-company-step"
                          style={{
                            background: "var(--accent)",
                            color: "white",
                            width: 30,
                            height: 30,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {lvl.level_number}
                        </span>
                      ) : isUnlocked ? (
                        <span
                          className="ct-company-step"
                          style={{
                            background: "rgba(46, 184, 92, 0.15)",
                            color: "#16a34a",
                            width: 30,
                            height: 30,
                            fontSize: 12,
                          }}
                        >
                          <Check size={14} />
                        </span>
                      ) : (
                        <span
                          className="ct-company-step"
                          style={{
                            width: 30,
                            height: 30,
                            fontSize: 12,
                            opacity: 0.6,
                          }}
                        >
                          <Lock size={12} />
                        </span>
                      )}
                    </div>

                    {/* Title and Focus Area */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--text)] truncate">
                          {lvl.title}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]">
                            Active
                          </span>
                        )}
                        {!isUnlocked && (
                          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-0.5">
                            <Lock size={10} /> Locked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] m-0 truncate">
                        {lvl.focus_area}
                      </p>
                    </div>
                  </div>

                  {/* Badges, Time & Action */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="hidden sm:block">{renderBadge(lvl.difficulty)}</div>

                    <span className="text-xs text-[var(--text-muted)] hidden md:inline tabular-nums">
                      <Clock size={11} className="inline mr-1" />~{lvl.estimated_duration_min}m · Live Adaptive Qs
                    </span>

                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartLevel(lvl.level_number);
                        }}
                        className={`ct-button ${isCurrent ? "ct-button--primary shadow-md shadow-orange-500/20" : "ct-button--secondary"}`}
                        style={{
                          minHeight: 30,
                          height: 30,
                          padding: "0 12px",
                          fontSize: 11.5,
                          fontWeight: isCurrent ? 700 : 500,
                        }}
                      >
                        <Play size={11} fill={isCurrent ? "white" : "currentColor"} />
                        <span>{isCurrent ? `Continue Stage ${lvl.level_number}` : `Replay Stage ${lvl.level_number}`}</span>
                      </button>
                    ) : (
                      <span className="p-1.5 text-[var(--text-muted)] opacity-60">
                        <Lock size={13} />
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => toggleLevelExpand(lvl.level_number, e)}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {/* Expandable Evaluation Details Drawer */}
                {isExpanded && (
                  <div
                    className="px-4 pb-3 pt-1 text-xs border-t animate-in fade-in duration-200"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface-raised)",
                    }}
                  >
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1.5">
                      <span className="font-semibold text-[var(--text)]">
                        AI Evaluator Rubric &amp; Prompt Instructions:
                      </span>
                      <span>Unlimited Live Adaptive Questions · ~{lvl.estimated_duration_min} min target</span>
                    </div>
                    <div
                      className="p-2.5 rounded-lg font-mono text-[11px] leading-relaxed text-[var(--text-muted)]"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {lvl.ai_prompt_instructions}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Bottom Actions ──────────────────────────────────────────────── */}
      <div className="ct-company-actions" style={{ marginTop: 4 }}>
        {onRegenerate && (
          <button
            type="button"
            className="ct-button ct-button--secondary"
            onClick={onRegenerate}
          >
            <RotateCcw size={15} /> Re-generate Matrix
          </button>
        )}

        <button
          type="button"
          className="ct-button ct-button--wide"
          onClick={() => handleStartLevel(1)}
        >
          <Play size={15} fill="white" /> Start Stage 1 Rehearsal <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
