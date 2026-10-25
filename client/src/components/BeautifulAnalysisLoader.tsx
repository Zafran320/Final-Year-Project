 import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Globe,
  Layers,
  LoaderCircle,
  Radio,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";

interface BeautifulAnalysisLoaderProps {
  companyName?: string;
  targetRole?: string;
  sourceCount?: number;
  sources?: string[];
  className?: string;
}

const STEPS = [
  {
    id: 1,
    title: "Reading Selected Sources",
    description: "Fetching verified public domains, career portals, and attached role requirements.",
    icon: Globe,
    badge: "Network I/O",
  },
  {
    id: 2,
    title: "Extracting Company Signals",
    description: "Parsing core technical competencies, engineering culture, and STAR behavioral rubrics.",
    icon: Layers,
    badge: "NLP Calibration",
  },
  {
    id: 3,
    title: "Synthesizing FutureMaker Intelligence",
    description: "Calibrating a bounded mock interview progression grounded in your verified evidence.",
    icon: Sparkles,
    badge: "FutureMaker Engine",
  },
];

export default function BeautifulAnalysisLoader({
  companyName = "Company",
  targetRole = "Role",
  sourceCount = 1,
  sources = [],
  className = "",
}: BeautifulAnalysisLoaderProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(20);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [viewMode, setViewMode] = useState<"visual" | "terminal">("visual");

  // Timer counter
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Step progression animation loop
  useEffect(() => {
    const t1 = setTimeout(() => {
      setActiveStepIndex(1);
      setProgressPercent(58);
    }, 2200);

    const t2 = setTimeout(() => {
      setActiveStepIndex(2);
      setProgressPercent(90);
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div
      className={`ct-stage-transition my-4 w-full ${className}`}
      role="status"
      aria-live="polite"
    >
      <article
        className="ct-company-card relative overflow-hidden w-full"
        style={{
          width: "100%",
          padding: "18px 20px",
          boxSizing: "border-box",
        }}
      >
        <div className="relative flex flex-col gap-3.5 w-full">
          {/* Header Row */}
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 w-full"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: "color-mix(in srgb, var(--accent) 14%, var(--surface))",
                  border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                  color: "var(--accent)",
                }}
              >
                <LoaderCircle size={16} className="animate-spin" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className="ct-company-card-title"
                    style={{ fontSize: 15, margin: 0, color: "var(--text)" }}
                  >
                    Calibrating Interview Intelligence
                  </h3>
                  <span className="ct-badge ct-badge--required" style={{ fontSize: 9.5 }}>
                    Live Engine
                  </span>
                </div>
                <span
                  className="text-xs truncate block"
                  style={{ color: "var(--text-muted)" }}
                >
                  {companyName} · {targetRole} ({elapsedSeconds}s elapsed)
                </span>
              </div>
            </div>

            {/* View Mode Switcher Toggle */}
            <div
              className="flex items-center gap-1 self-start sm:self-auto p-0.5 rounded-lg shrink-0"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("visual")}
                className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
                style={{
                  background: viewMode === "visual" ? "var(--accent)" : "transparent",
                  color: viewMode === "visual" ? "#fff" : "var(--text-muted)",
                }}
              >
                Visual Progress
              </button>
              <button
                type="button"
                onClick={() => setViewMode("terminal")}
                className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all"
                style={{
                  background: viewMode === "terminal" ? "var(--accent)" : "transparent",
                  color: viewMode === "terminal" ? "#fff" : "var(--text-muted)",
                }}
              >
                Telemetry
              </button>
            </div>
          </div>

          {/* Shimmering Animated Progress Bar */}
          <div className="space-y-1 w-full">
            <div
              className="flex items-center justify-between text-[11px] font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Radio size={12} className="text-[#3ddc97] animate-pulse shrink-0" />
                Step {activeStepIndex + 1} of 3: {STEPS[activeStepIndex].title}
              </span>
              <span className="shrink-0">{progressPercent}%</span>
            </div>
            <div
              className="relative h-1.5 w-full overflow-hidden rounded-full"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="h-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPercent}%`,
                  background:
                    "linear-gradient(90deg, var(--accent) 0%, color-mix(in srgb, var(--accent-light) 80%, white) 100%)",
                }}
              />
            </div>
          </div>

          {/* Visual Mode: 3 Step Cards */}
          {viewMode === "visual" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
              {STEPS.map((step, idx) => {
                const isDone = idx < activeStepIndex;
                const isCurrent = idx === activeStepIndex;
                const StepIcon = step.icon;

                return (
                  <div
                    key={step.id}
                    className="p-2.5 rounded-xl transition-all flex flex-col gap-1 w-full"
                    style={{
                      background: isCurrent
                        ? "color-mix(in srgb, var(--accent) 8%, var(--surface))"
                        : "var(--surface-raised)",
                      border: isCurrent
                        ? "1px solid var(--accent)"
                        : "1px solid var(--border)",
                      opacity: !isDone && !isCurrent ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div
                          className="flex size-5 shrink-0 items-center justify-center rounded-md text-[11px]"
                          style={{
                            background: isCurrent
                              ? "var(--accent)"
                              : isDone
                              ? "color-mix(in srgb, var(--success) 20%, transparent)"
                              : "color-mix(in srgb, var(--text-muted) 15%, transparent)",
                            color: isCurrent
                              ? "#fff"
                              : isDone
                              ? "var(--success)"
                              : "var(--text-muted)",
                          }}
                        >
                          {isDone ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <StepIcon size={11} className={isCurrent ? "animate-pulse" : ""} />
                          )}
                        </div>
                        <span
                          className="text-[9.5px] font-bold uppercase tracking-wider truncate"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Phase 0{step.id}
                        </span>
                      </div>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0"
                        style={{
                          background: isCurrent
                            ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                            : isDone
                            ? "color-mix(in srgb, var(--success) 15%, transparent)"
                            : "color-mix(in srgb, var(--text-muted) 10%, transparent)",
                          color: isCurrent
                            ? "var(--accent)"
                            : isDone
                            ? "var(--success)"
                            : "var(--text-muted)",
                        }}
                      >
                        {isDone ? "Done" : isCurrent ? "Active" : "Queued"}
                      </span>
                    </div>

                    <p
                      className="text-xs font-semibold leading-tight truncate"
                      style={{ color: "var(--text)" }}
                    >
                      {step.title}
                    </p>
                    <p
                      className="text-[10.5px] leading-tight line-clamp-2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Terminal / Telemetry Mode */}
          {viewMode === "terminal" && (
            <div
              className="rounded-xl p-2.5 font-mono text-[11px] space-y-1 animate-in fade-in duration-200 w-full"
              style={{
                background: "var(--input-surface, #111119)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <div
                className="flex items-center justify-between text-[10px] pb-1"
                style={{
                  borderBottom: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <span className="flex items-center gap-1">
                  <Terminal size={11} style={{ color: "var(--accent)" }} /> /v1/futuremaker-analysis-stream
                </span>
                <span>Latency budget: &lt;10s</span>
              </div>
              <p style={{ color: "var(--success)" }}>
                [0.00s] &gt; Initializing secure memory sandbox...
              </p>
              <p style={{ color: "var(--accent)" }}>
                [0.45s] &gt; Reading {sourceCount} authorized public source(s) for {companyName}...
              </p>
              {sources.length > 0 &&
                sources.map((src, i) => (
                  <p key={i} className="pl-3 truncate" style={{ color: "var(--text-muted)" }}>
                    ↳ FETCH: {src} [200 OK]
                  </p>
                ))}
              <p style={{ color: activeStepIndex >= 1 ? "var(--text)" : "var(--text-muted)" }}>
                [{elapsedSeconds >= 2 ? "2.20s" : "..."}] &gt; Parsing technical role keywords for &apos;{targetRole}&apos;...
              </p>
              <p style={{ color: activeStepIndex >= 2 ? "var(--accent)" : "var(--text-muted)" }}>
                [{elapsedSeconds >= 4 ? "4.50s" : "..."}] &gt; FutureMaker AI bounded synthesis executing...
              </p>
            </div>
          )}

          {/* Live Telemetry Expand/Collapse Toggle Drawer */}
          <div
            className="pt-1.5 flex flex-col gap-1.5 w-full"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <button
              type="button"
              onClick={() => setShowTelemetry(!showTelemetry)}
              className="flex items-center justify-between text-xs transition-colors py-0.5 w-full cursor-pointer"
              style={{ color: "var(--text-muted)" }}
              aria-expanded={showTelemetry}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={14} style={{ color: "var(--success)" }} />
                Zero-Leakage Privacy Isolate &amp; Bounded Execution
              </span>
              <span
                className="flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: "var(--accent)" }}
              >
                {showTelemetry ? "Hide Details" : "View Details"}
                {showTelemetry ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </span>
            </button>

            {showTelemetry && (
              <div
                className="p-2 rounded-xl text-[11px] space-y-1 animate-in fade-in duration-200 w-full"
                style={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <p>• <strong>Strict Scope:</strong> Only user-selected links and role benchmarks are reviewed.</p>
                <p>• <strong>Zero Training:</strong> Data is never persisted or used for model training.</p>
                <p>• <strong>Timeout Guard:</strong> Request automatically enforces bounded retry within limits.</p>
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
