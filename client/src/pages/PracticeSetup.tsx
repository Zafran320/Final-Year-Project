import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  Info,
  LoaderCircle,
  Lock,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  Zap,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { AccountNavigation, type AccountNavDestination } from "@/components/AccountNavigation";
import { getProfileImageUrl } from "@/lib/profileImage";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import TaskRowsLoading from "@/components/TaskRowsLoading";
import PracticeRoadmap from "@/components/PracticeRoadmap";
import type { InterviewLevel } from "@shared/roadmapTypes";

const SESSION_PREP_KEY = "ct_company_prep_v2";

export default function PracticeSetup({
  onBackToCompanyPrep,
  showNavbar = false,
}: {
  onBackToCompanyPrep?: () => void;
  showNavbar?: boolean;
}) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const profileQuery = trpc.careerProfile.get.useQuery(undefined, { enabled: isAuthenticated });
  const latestSessionQuery = trpc.practicePreparation.getLatestSession.useQuery(undefined, { enabled: isAuthenticated });

  const [companyName, setCompanyName] = useState("Target Tech Corp");
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [jobDescription, setJobDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [jobExpanded, setJobExpanded] = useState(false);
  
  // Direct per-card toggle states for the 3 progression tiers
  const [expandedTiers, setExpandedTiers] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });

  const toggleTier = (tierNum: number) => {
    setExpandedTiers((prev) => ({
      ...prev,
      [tierNum]: !prev[tierNum],
    }));
  };

  const [roadmapData, setRoadmapData] = useState<{
    sessionId: number;
    levels: InterviewLevel[];
    currentLevel: number;
    companyName: string;
    targetRole: string;
  } | null>(null);

  // Load scraped/entered job context from previous CompanyPreparation step
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_PREP_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.targetRole) setTargetRole(parsed.targetRole);
        if (parsed.jobDescription) setJobDescription(parsed.jobDescription);
      }
    } catch {}
  }, []);

  // Hydrate from latest saved session if available (any number of generated stages)
  useEffect(() => {
    if (latestSessionQuery.data && (latestSessionQuery.data.levels?.length ?? 0) > 0 && !roadmapData) {
      setRoadmapData({
        sessionId: latestSessionQuery.data.id,
        levels: latestSessionQuery.data.levels,
        currentLevel: latestSessionQuery.data.currentLevel || 1,
        companyName: latestSessionQuery.data.companyName || companyName,
        targetRole: latestSessionQuery.data.targetRole || targetRole,
      });
    }
  }, [latestSessionQuery.data]);

  const generateRoadmapMutation = trpc.practicePreparation.generateRoadmap.useMutation({
    onSuccess: (data) => {
      setTimeout(() => {
        setIsGenerating(false);
        setRoadmapData({
          sessionId: data.sessionId,
          levels: data.levels,
          currentLevel: data.currentLevel,
          companyName: data.companyName || companyName,
          targetRole: data.targetRole || targetRole,
        });
        toast.success("10-Level Mock Progression Matrix Generated!");
      }, 3200);
    },
    onError: (err) => {
      setIsGenerating(false);
      toast.error(err.message || "Failed to generate roadmap. Please try again.");
    },
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    const profile = profileQuery.data;

    generateRoadmapMutation.mutate({
      user_cv_data: {
        fullName: profile?.fullName || user?.name || undefined,
        targetRole: profile?.targetRole || targetRole,
        experience: profile?.experience || undefined,
        skills: profile?.skills || undefined,
        education: profile?.education || undefined,
        projects: profile?.projects || undefined,
        summary: profile?.professionalSummary || undefined,
        verifiedDetails: profile?.verifiedDetails || undefined,
      },
      job_description_data: {
        companyName,
        targetRole,
        jobDescription:
          jobDescription ||
          "Standard technical engineering requirements, systems design, architecture trade-offs, and STAR behavioral competencies.",
      },
    });
  };

  const navigateFromNavbar = (destination: AccountNavDestination) => {
    if (destination === "home") setLocation("/");
    if (destination === "dashboard") setLocation("/dashboard");
    if (destination === "jobs") setLocation("/jobs");
    if (destination === "account") setLocation("/account");
    if (destination === "privacy") setLocation("/?screen=session");
    if (destination === "practice") setLocation("/?screen=company-prep");
  };

  const signOutFromNavbar = async () => {
    await logout();
    setLocation("/");
  };

  const parsedSkills = (profileQuery.data?.skills || "")
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  return (
    <main className="ct-view ct-view--wide ct-company-page" data-theme={theme}>
      {/* Optional Navbar only when on standalone route */}
      {showNavbar && isAuthenticated && (
        <AccountNavigation
          userName={user?.name || "Your account"}
          profileImageUrl={profileQuery.data?.profilePhotoUrl ?? getProfileImageUrl(user)}
          theme={theme}
          onToggleTheme={toggleTheme}
          activeDestination="practice"
          onNavigate={navigateFromNavbar}
          onSignOut={signOutFromNavbar}
        />
      )}

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="ct-company-hero" aria-labelledby="practice-setup-title">
        <div className="ct-company-hero-copy">
          <p className="ct-eyebrow"><span className="ct-eyebrow-mark" /> AI Rehearsal Progression</p>
          <h1 id="practice-setup-title" className="ct-title ct-title--compact">
            {companyName ? `${companyName} · ` : ""}{targetRole || "10-Level Mock Progression"}
          </h1>
          <p className="ct-lede">
            Adaptive 10-level mock interview progression synthesized by FutureMaker AI using your verified resume background and target role benchmarks.
          </p>
          <div className="ct-company-trust-row">
            <span><LockKeyhole size={14} /> Stage 1 unlocked by default</span>
            <span><ShieldCheck size={14} /> Private session rehearsal</span>
          </div>
        </div>

        <aside className="ct-company-analysis-status" aria-label="Progression status">
          <span className="ct-company-analysis-icon"><Sparkles size={17} /></span>
          <div>
            <span>Progression Matrix</span>
            <strong>10 Sequential Stages</strong>
            <p>{companyName ? `${companyName} · ` : ""}{targetRole}</p>
          </div>
          <ul>
            <li><Check size={13} /> Levels 1–3: Easy (Resume Validation)</li>
            <li><Check size={13} /> Levels 4–7: Intermediate (STAR &amp; Core)</li>
            <li><Check size={13} /> Levels 8–10: Hard (Crisis &amp; Arch)</li>
          </ul>
        </aside>
      </section>

      {/* ─── View 1: Generating Loading State with TaskRows ───────────────── */}
      {isGenerating && (
        <div className="ct-stage-transition w-full max-w-[1180px] mx-auto py-4">
          <div className="text-center mb-5 space-y-2">
            <p className="ct-eyebrow"><span className="ct-eyebrow-mark" /> AI Recruiter Calibration</p>
            <h2 className="ct-title ct-title--compact" style={{ fontSize: 24 }}>
              Synthesizing 10-Level Mock Progression
            </h2>
            <p className="ct-lede" style={{ fontSize: 13, maxWidth: 460, margin: "0 auto" }}>
              Matching verified candidate skills against {companyName}'s benchmark requirements...
            </p>
          </div>

          <TaskRowsLoading
            companyName={companyName}
            targetRole={targetRole}
            className="w-full"
          />
        </div>
      )}

      {/* ─── View 2: Active Roadmap Generated View ───────────────────────── */}
      {!isGenerating && roadmapData && (
        <div className="ct-stage-transition">
          <PracticeRoadmap
            sessionId={roadmapData.sessionId}
            companyName={roadmapData.companyName}
            targetRole={roadmapData.targetRole}
            levels={roadmapData.levels}
            currentLevel={roadmapData.currentLevel}
            onRegenerate={handleGenerate}
          />
        </div>
      )}

      {/* ─── View 3: Single Beautiful Context & Launch Summary Card ─────────── */}
      {!isGenerating && !roadmapData && (
        <div className="ct-stage-transition">
          <article
            className="ct-company-card"
            style={{ maxWidth: 1180, margin: "0 auto" }}
          >
            <div className="flex flex-col gap-4">
              {/* Header Kicker with AI-Powered Hook Badge */}
              <div
                className="flex items-center justify-between pb-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="ct-company-step" style={{ width: 32, height: 32, fontSize: 13 }}>
                    10
                  </span>
                  <div>
                    <h2 className="ct-company-card-title" style={{ fontSize: 17, margin: 0 }}>
                      Interview Progression Blueprint
                    </h2>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Ready to synthesize 10 adaptive rehearsal stages
                    </span>
                  </div>
                </div>

                {/* AI-Powered Hook Badge */}
                <span className="ct-badge ct-badge--required hidden sm:inline-flex items-center gap-1.5">
                  <Sparkles size={12} style={{ color: "var(--accent)" }} /> AI-Powered Rehearsal Engine
                </span>
              </div>

              {/* 2-Column Interactive Collapsible Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Candidate Profile Toggle Card */}
                <div
                  className={`ct-collapsible ${profileExpanded ? "is-open" : ""}`}
                  data-state={profileExpanded ? "open" : "closed"}
                >
                  <button
                    type="button"
                    className="ct-collapsible-trigger"
                    aria-expanded={profileExpanded}
                    onClick={() => setProfileExpanded(!profileExpanded)}
                  >
                    <span className="ct-collapsible-icon"><User size={15} /></span>
                    <span className="ct-collapsible-label truncate font-semibold text-xs">
                      {profileQuery.data?.fullName || user?.name || "Verified Candidate"}
                    </span>
                    <span className="ct-collapsible-count">{parsedSkills.length || "Verified"}</span>
                    <span className="ct-collapsible-chevron"><ChevronDown size={14} /></span>
                  </button>

                  <div className="ct-collapsible-content" aria-hidden={!profileExpanded}>
                    <div className="ct-collapsible-content-inner">
                      <div className="ct-collapsible-body space-y-2">
                        {parsedSkills.length > 0 ? (
                          <div>
                            <span className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-muted)" }}>
                              Verified Technical Stack ({parsedSkills.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-0.5">
                              {parsedSkills.map((sk: string) => (
                                <span key={sk} className="ct-badge ct-badge--tech" style={{ fontSize: 10 }}>
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Verified profile data loaded.</p>
                        )}

                        <p
                          className="text-[11px] font-medium pt-1"
                          style={{
                            borderTop: "1px solid var(--border)",
                            color: "var(--success)",
                          }}
                        >
                          🛡️ Verified Grounding: Evaluated privately against your verified background.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Target Position Toggle Card */}
                <div
                  className={`ct-collapsible ${jobExpanded ? "is-open" : ""}`}
                  data-state={jobExpanded ? "open" : "closed"}
                >
                  <button
                    type="button"
                    className="ct-collapsible-trigger"
                    aria-expanded={jobExpanded}
                    onClick={() => setJobExpanded(!jobExpanded)}
                  >
                    <span className="ct-collapsible-icon"><Building2 size={15} /></span>
                    <span className="ct-collapsible-label truncate font-semibold text-xs">
                      {companyName} · {targetRole}
                    </span>
                    <span className="ct-collapsible-count">Role Scope</span>
                    <span className="ct-collapsible-chevron"><ChevronDown size={14} /></span>
                  </button>

                  <div className="ct-collapsible-content" aria-hidden={!jobExpanded}>
                    <div className="ct-collapsible-content-inner">
                      <div className="ct-collapsible-body space-y-1.5">
                        <p className="text-xs" style={{ color: "var(--text)" }}>
                          <strong>Target Role:</strong> {targetRole} at {companyName}
                        </p>
                        <p className="text-[11.5px] line-clamp-3" style={{ color: "var(--text-muted)" }}>
                          {jobDescription || "Standard technical requirements, systems architecture, and STAR behavioral competencies."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Progression Tier Toggles - Direct Per-Card Interactive Accordions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Progression Difficulty Tiers (Click any card to toggle preview):
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    10 Stages Total
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Tier 1: Stages 1-3 */}
                  <div
                    onClick={() => toggleTier(1)}
                    className="p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col gap-2"
                    style={{
                      background: expandedTiers[1]
                        ? "color-mix(in srgb, var(--accent) 8%, var(--surface))"
                        : "var(--surface-raised)",
                      border: expandedTiers[1]
                        ? "1px solid var(--accent)"
                        : "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="ct-badge ct-badge--required" style={{ fontSize: 10 }}>Stages 1–3</span>
                        <span className="text-[10.5px] font-bold" style={{ color: "var(--success)" }}>Easy</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${
                          expandedTiers[1] ? "rotate-180" : ""
                        }`}
                        style={{ color: expandedTiers[1] ? "var(--accent)" : "var(--text-muted)" }}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>Foundation &amp; Resume</p>
                      <p className="text-[11px] leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Icebreaker, resume validation, and career motivations.
                      </p>
                    </div>

                    {expandedTiers[1] && (
                      <div
                        className="pt-2 text-[11px] space-y-1 animate-in fade-in duration-200"
                        style={{
                          borderTop: "1px solid var(--border)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <p className="font-medium flex items-center gap-1" style={{ color: "var(--success)" }}>
                          <Check size={11} /> Project background &amp; ownership
                        </p>
                        <p className="flex items-center gap-1">
                          <Check size={11} /> Technical stack validation
                        </p>
                        <p className="flex items-center gap-1">
                          <Check size={11} /> Cultural &amp; role fit
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tier 2: Stages 4-7 */}
                  <div
                    onClick={() => toggleTier(2)}
                    className="p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col gap-2"
                    style={{
                      background: expandedTiers[2]
                        ? "color-mix(in srgb, var(--accent) 8%, var(--surface))"
                        : "var(--surface-raised)",
                      border: expandedTiers[2]
                        ? "1px solid var(--accent)"
                        : "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="ct-badge ct-badge--preferred" style={{ fontSize: 10 }}>Stages 4–7</span>
                        <span className="text-[10.5px] font-bold text-[#fbbf24]">Intermediate</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${
                          expandedTiers[2] ? "rotate-180" : ""
                        }`}
                        style={{ color: expandedTiers[2] ? "var(--accent)" : "var(--text-muted)" }}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>STAR &amp; Systems Core</p>
                      <p className="text-[11px] leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Technical architecture, STAR scenarios, and trade-offs.
                      </p>
                    </div>

                    {expandedTiers[2] && (
                      <div
                        className="pt-2 text-[11px] space-y-1 animate-in fade-in duration-200"
                        style={{
                          borderTop: "1px solid var(--border)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <p className="text-[#fbbf24] font-medium flex items-center gap-1">
                          <Check size={11} /> STAR behavioral scenarios
                        </p>
                        <p className="flex items-center gap-1">
                          <Check size={11} /> Architecture scalability &amp; latency
                        </p>
                        <p className="flex items-center gap-1">
                          <Check size={11} /> Pipeline &amp; code dispute handling
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tier 3: Stages 8-10 */}
                  <div
                    onClick={() => toggleTier(3)}
                    className="p-3.5 rounded-2xl transition-all cursor-pointer flex flex-col gap-2"
                    style={{
                      background: expandedTiers[3]
                        ? "color-mix(in srgb, var(--accent) 8%, var(--surface))"
                        : "var(--surface-raised)",
                      border: expandedTiers[3]
                        ? "1px solid var(--accent)"
                        : "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="ct-badge ct-badge--tech" style={{ fontSize: 10 }}>Stages 8–10</span>
                        <span className="text-[10.5px] font-bold" style={{ color: "var(--accent)" }}>Hard</span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${
                          expandedTiers[3] ? "rotate-180" : ""
                        }`}
                        style={{ color: expandedTiers[3] ? "var(--accent)" : "var(--text-muted)" }}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--text)" }}>Executive Stress Test</p>
                      <p className="text-[11px] leading-tight mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Live production incidents, ambiguity, and crisis response.
                      </p>
                    </div>

                    {expandedTiers[3] && (
                      <div
                        className="pt-2 text-[11px] space-y-1 animate-in fade-in duration-200"
                        style={{
                          borderTop: "1px solid var(--border)",
                          color: "var(--text-muted)",
                        }}
                      >
                        <p className="font-medium flex items-center gap-1" style={{ color: "var(--accent)" }}>
                          <Check size={11} /> P0 outage &amp; incident postmortems
                        </p>
                        <p className="flex items-center gap-1">
                          <Check size={11} /> High-pressure trade-off defenses
                        </p>
                        <p className="flex items-center gap-1">
                          <Check size={11} /> Engineering disaster recovery
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions & Launch Button */}
              <div
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3"
                style={{ borderTop: "1px solid var(--border)" }}
              >
                {onBackToCompanyPrep ? (
                  <button
                    className="ct-button ct-button--secondary"
                    type="button"
                    onClick={onBackToCompanyPrep}
                    style={{ minHeight: 42 }}
                  >
                    <ArrowLeft size={15} /> Edit Company Analysis
                  </button>
                ) : (
                  <button
                    className="ct-button ct-button--secondary"
                    type="button"
                    onClick={() => setLocation("/?screen=company-prep")}
                    style={{ minHeight: 42 }}
                  >
                    <ArrowLeft size={15} /> Edit Company Prep
                  </button>
                )}

                <button
                  className="ct-button ct-button--wide"
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  style={{ minHeight: 42 }}
                >
                  <Sparkles size={15} /> Generate 10-Level Progression <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      <p className="ct-info-line" style={{ marginTop: 20 }}>
        <LockKeyhole size={16} /> Progression matrix is dynamically synthesized and stored privately for your rehearsal session.
      </p>
    </main>
  );
}
