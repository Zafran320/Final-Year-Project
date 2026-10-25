import React, { useEffect, useState } from "react";

/* ─────────────────────────────────────────────────────────
 * TASK ROWS LOADING ANIMATION
 * CareerTwin AI Rehearsal Synthesis
 * ───────────────────────────────────────────────────────── */

const TICKS = [600, 900, 2400, 1400, 2400, 600];

function useTick(intervals: number[]) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (tick >= intervals.length - 1) return;
    const t = setTimeout(() => setTick((x) => x + 1), intervals[tick]);
    return () => clearTimeout(t);
  }, [tick, intervals]);
  return tick;
}

function SpinnerRing({ active, children }: { active?: boolean; children?: React.ReactNode }) {
  const size = 24, stroke = 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={active ? { animation: "spin 1.1s linear infinite" } : undefined}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="color-mix(in srgb, var(--text, #000) 14%, transparent)"
          strokeWidth={stroke}
        />
        {active && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--accent, #e8442e)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * 0.32} ${c * 0.68}`}
          />
        )}
      </svg>
      <span className="relative text-[10.5px] font-semibold tabular-nums text-[var(--text,#0b1220)]">{children}</span>
    </span>
  );
}

function Badge({ tone, children }: { tone: "red" | "green"; children: React.ReactNode }) {
  return (
    <span
      className={`flex size-5.5 shrink-0 items-center justify-center rounded-full text-white shadow-sm
        ${tone === "red" ? "bg-[var(--accent,#e8442e)]" : "bg-[#2eb85c]"}`}
      style={{ animation: "pop-in 300ms cubic-bezier(0.23,1,0.32,1) both" }}
    >
      {children}
    </span>
  );
}

const CheckIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export type TaskDetail = { label: string; meta: string };

export type TaskRow = {
  key: string;
  label: string;
  amount: string;
  status: "done" | "running" | "sequence";
  step?: number;
  details: TaskDetail[];
};

export type TaskRowsLabels = {
  completed: string;
  failed: string;
};

const DEFAULT_LABELS: TaskRowsLabels = {
  completed: "Completed",
  failed: "Calibrating",
};

const ROADMAP_TASK_ROWS: TaskRow[] = [
  {
    key: "cv_parse",
    label: "Candidate Profile & Verified Skills",
    amount: "Verified",
    status: "done",
    details: [
      { label: "Extracted work history & tech stack", meta: "100%" },
      { label: "Mapped seniority & accomplishments", meta: "Verified" },
    ],
  },
  {
    key: "job_match",
    label: "Target Role & Company Competencies",
    amount: "10 benchmarks",
    status: "running",
    step: 2,
    details: [
      { label: "Evaluating core domain requirements", meta: "Matched" },
      { label: "Identifying gap areas & STAR triggers", meta: "Calibrated" },
    ],
  },
  {
    key: "progression_synth",
    label: "Synthesizing 10-Level Progression Matrix",
    amount: "10 Stages",
    status: "sequence",
    step: 3,
    details: [
      { label: "Stages 1–3: Resume & Foundations", meta: "Easy" },
      { label: "Stages 4–7: STAR & Core Architecture", meta: "Intermediate" },
      { label: "Stages 8–10: High-Pressure Crisis & Leadership", meta: "Hard" },
    ],
  },
];

export default function TaskRowsLoading({
  rows = ROADMAP_TASK_ROWS,
  labels,
  className,
  companyName,
  targetRole,
}: {
  rows?: TaskRow[];
  labels?: Partial<TaskRowsLabels>;
  className?: string;
  companyName?: string;
  targetRole?: string;
}) {
  const tick = useTick(TICKS);
  const [manualOpen, setManualOpen] = useState<Record<string, boolean>>({
    job_match: true,
    progression_synth: true,
  });
  const row2: "pending" | "failed" | "done" = tick < 3 ? "pending" : tick === 3 ? "failed" : "done";
  const copy = { ...DEFAULT_LABELS, ...labels };

  const badgeFor = (row: TaskRow) => {
    if (row.status === "done") return <Badge tone="green">{CheckIcon}</Badge>;
    if (row.status === "running") return <SpinnerRing active>{row.step}</SpinnerRing>;
    return row2 === "pending" ? (
      <SpinnerRing active>{row.step}</SpinnerRing>
    ) : row2 === "failed" ? (
      <Badge tone="green">{CheckIcon}</Badge>
    ) : (
      <Badge tone="green">{CheckIcon}</Badge>
    );
  };

  const pillFor = (row: TaskRow) => {
    if (row.status === "done")
      return (
        <span className="inline-flex h-5.5 items-center rounded-full bg-[rgba(46,184,92,0.12)] border border-[rgba(46,184,92,0.3)] px-2.5 text-[11px] font-semibold text-[#16a34a] dark:text-[#46d678]">
          {copy.completed}
        </span>
      );
    if (row.status === "running") return null;
    return row2 === "done" ? (
      <span className="inline-flex h-5.5 items-center gap-1.5 rounded-full bg-[rgba(46,184,92,0.12)] border border-[rgba(46,184,92,0.3)] px-2.5 text-[11px] font-semibold text-[#16a34a] dark:text-[#46d678]">
        {copy.completed}
      </span>
    ) : (
      <span className="inline-flex h-5.5 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] px-2.5 text-[11px] font-semibold text-[var(--accent)]">
        Generating…
      </span>
    );
  };

  return (
    <div className={`flex w-full flex-col gap-3.5 ${className || ""}`}>
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent,#e8442e)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent,#e8442e)]"></span>
          </span>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            CareerTwin AI Synthesis in Progress
          </p>
        </div>
        {(companyName || targetRole) && (
          <span className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--surface-raised)] px-3 py-1 rounded-full border border-[var(--border)]">
            {companyName ? `${companyName} · ` : ""}{targetRole || "Role"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {rows.map((row, i) => {
          const open = manualOpen[row.key] ?? true;
          return (
            <div
              key={row.key}
              className="self-stretch overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] transition-all duration-300 shadow-xs"
              style={{
                animation: `fade-up 450ms cubic-bezier(0.23,1,0.32,1) ${i * 80}ms both`,
              }}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setManualOpen((current) => ({ ...current, [row.key]: !open }))}
                className="flex h-12 w-full items-center gap-3 px-4 text-left hover:bg-[var(--surface-raised)] transition-colors"
              >
                <span className="flex size-6 shrink-0 items-center justify-center">
                  {badgeFor(row)}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--text)]">
                  {row.label}
                </span>
                <span className="text-[11.5px] text-[var(--text-muted)] tabular-nums hidden sm:inline">
                  {row.amount}
                </span>
                {pillFor(row)}
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center text-[var(--text-muted)]"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-300"
                    style={{ transform: open ? "rotate(180deg)" : "rotate(0)" }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              {/* Expandable detail breakdown */}
              {open && (
                <div className="px-4 pb-3.5 pt-1.5 border-t border-[var(--border)] bg-[var(--surface-raised)]">
                  <div className="grid grid-cols-[20px_1fr] gap-2.5">
                    <span aria-hidden className="mx-auto h-full w-px bg-[var(--border)]" />
                    <div className="flex flex-col gap-1.5 py-1">
                      {row.details.map((d) => (
                        <div key={d.label} className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-muted)] text-[11.5px]">{d.label}</span>
                          <span className="font-mono text-[11px] text-[var(--text)] tabular-nums px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] font-semibold">
                            {d.meta}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
