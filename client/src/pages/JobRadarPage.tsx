import { useAuth } from "@/_core/hooks/useAuth";
import { AccountNavigation, type AccountNavDestination } from "@/components/AccountNavigation";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  Compass,
  DollarSign,
  ExternalLink,
  Filter,
  Flame,
  Globe2,
  Info,
  Layers,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  UserRound,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import type { IconType } from "react-icons";
import { FaGithub, FaLinkedinIn } from "react-icons/fa";
import { SiFiverr, SiIndeed, SiMeta, SiUpwork } from "react-icons/si";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { STORAGE_KEYS } from "@/lib/brand";

type ConnectionPlatform =
  | "meta"
  | "linkedin"
  | "indeed"
  | "upwork"
  | "remoteok"
  | "github"
  | "fiverr"
  | "arbeitnow"
  | "remotive"
  | "themuse"
  | "jobicy";

const platformMeta: Record<
  ConnectionPlatform,
  { name: string; Icon: IconType; color: string }
> = {
  meta: { name: "Meta", Icon: SiMeta, color: "#0668E1" },
  linkedin: { name: "LinkedIn", Icon: FaLinkedinIn, color: "#0a66c2" },
  indeed: { name: "Indeed", Icon: SiIndeed, color: "#2164f3" },
  upwork: { name: "Upwork", Icon: SiUpwork, color: "#14a800" },
  remoteok: { name: "RemoteOK", Icon: FaGithub, color: "#00b4d8" },
  github: { name: "GitHub", Icon: FaGithub, color: "#9ca3af" },
  fiverr: { name: "Fiverr", Icon: SiFiverr, color: "#1dbf73" },
  arbeitnow: { name: "Arbeitnow", Icon: SiIndeed, color: "#10b981" },
  remotive: { name: "Remotive", Icon: FaGithub, color: "#3b82f6" },
  themuse: { name: "The Muse", Icon: SiMeta, color: "#06b6d4" },
  jobicy: { name: "Jobicy", Icon: SiUpwork, color: "#8b5cf6" },
};

const SAMPLE_LOCKED_JOBS = [
  {
    id: "sample-locked-1",
    title: "Senior Full Stack Engineer (React / Node / Cloud)",
    company: "Capregsoft",
    monogram: "CS",
    location: "Lahore, Pakistan · Hybrid",
    salary: "PKR 350k – 550k / mo",
    workMode: "Hybrid",
    match: "98%",
    skills: ["React", "TypeScript", "Node.js", "Docker", "AWS"],
  },
  {
    id: "sample-locked-2",
    title: "AI Systems Software Engineer",
    company: "Motive (KeepTruckin)",
    monogram: "MO",
    location: "Lahore, Pakistan · Remote",
    salary: "PKR 400k – 650k / mo",
    workMode: "Remote",
    match: "95%",
    skills: ["Python", "FastAPI", "PostgreSQL", "PyTorch", "Redis"],
  },
  {
    id: "sample-locked-3",
    title: "Frontend Engineering Lead",
    company: "Systems Limited",
    monogram: "SL",
    location: "Lahore, Pakistan · On-site",
    salary: "PKR 450k – 700k / mo",
    workMode: "On-site",
    match: "94%",
    skills: ["Next.js", "Tailwind CSS", "Architecture", "GraphQL"],
  },
  {
    id: "sample-locked-4",
    title: "Cloud Native Backend Developer",
    company: "Arbisoft",
    monogram: "AB",
    location: "Lahore, Pakistan · Hybrid",
    salary: "PKR 300k – 480k / mo",
    workMode: "Hybrid",
    match: "92%",
    skills: ["Go", "Kubernetes", "gRPC", "Microservices", "CI/CD"],
  },
];

export default function JobRadarPage() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const profileQuery = trpc.careerProfile.get.useQuery();
  const latestSessionQuery = trpc.practicePreparation.getLatestSession.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const [activePlatformFilter, setActivePlatformFilter] = useState<"all" | ConnectionPlatform>("all");
  const [activeLocationFilter, setActiveLocationFilter] = useState<"all" | "near" | "remote">("all");
  const [activeCityFilter, setActiveCityFilter] = useState<string>("all");
  const [activeModeFilter, setActiveModeFilter] = useState<"all" | "Remote" | "Hybrid" | "On-site">("all");
  const [activeSeniorityFilter, setActiveSeniorityFilter] = useState<"all" | "Entry / Junior" | "Mid-Level" | "Senior" | "Lead">("all");
  const [activeSortBy, setActiveSortBy] = useState<"match" | "salary" | "company" | "proximity">("match");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReportJob, setSelectedReportJob] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.appliedJobs);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [savedJobs, setSavedJobs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.savedJobs);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleApplyJob = (e: React.MouseEvent, job: any) => {
    e.preventDefault();
    setAppliedJobs((prev) => {
      const next = new Set(prev);
      const isCurrentlyApplied = next.has(job.id);
      if (isCurrentlyApplied) {
        next.delete(job.id);
        toast.message(`Application status for ${job.company} reset.`);
      } else {
        next.add(job.id);
        toast.success(`Marked application for ${job.company} as Applied! Opening portal…`);
      }
      try {
        localStorage.setItem(STORAGE_KEYS.appliedJobs, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    window.open(job.jobUrl, "_blank", "noopener,noreferrer");
  };

  const toggleSaveJob = (job: any) => {
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(job.id)) {
        next.delete(job.id);
        toast.message(`Removed ${job.title} from bookmarks.`);
      } else {
        next.add(job.id);
        toast.success(`Saved ${job.title} at ${job.company} to bookmarks!`);
      }
      try {
        localStorage.setItem(STORAGE_KEYS.savedJobs, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const liveJobsQuery = trpc.careerProfile.fetchLiveJobs.useQuery(
    {
      query: searchQuery || undefined,
      location: profileQuery.data?.location || undefined,
      workMode: activeModeFilter,
      platform: activePlatformFilter,
    },
    { enabled: isAuthenticated, staleTime: 60 * 1000 }
  );

  const userLocation = profileQuery.data?.location || "Lahore, Pakistan";
  const targetRole = profileQuery.data?.targetRole || profileQuery.data?.careerField || "Software Engineer";

  const allJobs = useMemo(() => {
    return liveJobsQuery.data?.jobs ?? [];
  }, [liveJobsQuery.data]);

  const filteredJobs = useMemo(() => {
    const list = allJobs.filter((job) => {
      if (activePlatformFilter !== "all" && !job.platformSources.includes(activePlatformFilter)) {
        return false;
      }
      if (activeLocationFilter === "near" && !job.location.toLowerCase().includes("pakistan") && job.workMode !== "Hybrid") {
        return false;
      }
      if (activeLocationFilter === "remote" && job.workMode !== "Remote") {
        return false;
      }
      if (activeCityFilter !== "all") {
        if (activeCityFilter === "remote" && job.workMode !== "Remote") return false;
        if (activeCityFilter !== "remote" && !job.location.toLowerCase().includes(activeCityFilter.toLowerCase())) return false;
      }
      if (activeModeFilter !== "all" && job.workMode !== activeModeFilter) {
        return false;
      }
      if (activeSeniorityFilter !== "all" && job.experienceLevel !== activeSeniorityFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCompany = job.company.toLowerCase().includes(q);
        const matchesLocation = job.location.toLowerCase().includes(q);
        const matchesSkills = job.matchedSkills?.some((s: string) => s.toLowerCase().includes(q));
        const matchesExtra = job.extraSkills?.some((s: string) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCompany && !matchesLocation && !matchesSkills && !matchesExtra) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (activeSortBy === "match") {
        if (a.isLocationMatch && !b.isLocationMatch) return -1;
        if (!a.isLocationMatch && b.isLocationMatch) return 1;
        return b.matchScore - a.matchScore;
      }
      if (activeSortBy === "salary") {
        const getSalRank = (sal: string) => {
          if (sal.includes("$")) return 2000000;
          const match = sal.match(/(\d+[\d,]*)/);
          return match ? parseInt(match[1].replace(/,/g, ""), 10) : 0;
        };
        return getSalRank(b.salaryRange) - getSalRank(a.salaryRange);
      }
      if (activeSortBy === "company") {
        return a.company.localeCompare(b.company);
      }
      if (activeSortBy === "proximity") {
        if (a.isLocationMatch && !b.isLocationMatch) return -1;
        if (!a.isLocationMatch && b.isLocationMatch) return 1;
        return a.location.localeCompare(b.location);
      }
      return b.matchScore - a.matchScore;
    });
  }, [allJobs, activePlatformFilter, activeLocationFilter, activeCityFilter, activeModeFilter, activeSeniorityFilter, activeSortBy, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / ITEMS_PER_PAGE));
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredJobs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredJobs, currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const element = document.getElementById("job-radar-title");
    if (element && typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFilterReset = () => {
    setActivePlatformFilter("all");
    setActiveLocationFilter("all");
    setActiveCityFilter("all");
    setActiveModeFilter("all");
    setActiveSeniorityFilter("all");
    setActiveSortBy("match");
    setSearchQuery("");
    setCurrentPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activePlatformFilter !== "all") count++;
    if (activeLocationFilter !== "all") count++;
    if (activeCityFilter !== "all") count++;
    if (activeModeFilter !== "all") count++;
    if (activeSeniorityFilter !== "all") count++;
    if (activeSortBy !== "match") count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [activePlatformFilter, activeLocationFilter, activeCityFilter, activeModeFilter, activeSeniorityFilter, activeSortBy, searchQuery]);

  const navigateFromNavbar = (destination: AccountNavDestination) => {
    if (destination === "home") setLocation("/");
    if (destination === "dashboard") setLocation("/dashboard");
    if (destination === "jobs") setLocation("/jobs");
    if (destination === "account") setLocation("/account");
    if (destination === "privacy") setLocation("/?screen=session");
    if (destination === "practice") {
      if (latestSessionQuery.data && (latestSessionQuery.data.levels?.length ?? 0) > 0) {
        setLocation("/?screen=question-plan");
      } else {
        setLocation("/?screen=consent");
      }
    }
  };

  const signOutFromNavbar = async () => {
    await logout();
    setLocation("/");
  };

  const handlePracticeForRole = (role: string, company: string) => {
    toast.success(`Preparation target set to ${role} at ${company}. Opening practice…`);
    setLocation("/?screen=consent");
  };

  return (
    <main className="ct-account-shell ct-page-transition">
      <AccountNavigation
        userName={user?.name || ""}
        profileImageUrl={profileQuery.data?.profilePhotoUrl ?? undefined}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={navigateFromNavbar}
        onSignOut={signOutFromNavbar}
        activeDestination="jobs"
        authenticated={isAuthenticated}
        loading={authLoading}
        onLogin={() => setLocation("/login?next=%2Fjobs")}
        onSignup={() => setLocation("/signup?next=%2Fjobs")}
        onStart={() => {
          if (isAuthenticated) {
            navigateFromNavbar("practice");
          } else {
            setLocation("/login?next=%2Fpractice-setup");
          }
        }}
      />

      {/* ─── Hero Header ─────────────────────────────────────────── */}
      <section className="ct-account-hero" aria-labelledby="job-radar-title">
        <div className="ct-account-hero-copy">
          <div className="flex items-center gap-2">
            <p className="ct-home-eyebrow" style={{ margin: 0 }}>
              <span /> Live Opportunity Hub
            </p>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-raised))] border border-[color-mix(in_srgb,var(--accent)_25%,var(--border))] text-[var(--accent)] flex items-center gap-1">
              <MapPin size={11} /> {userLocation}
            </span>
          </div>

          <h1 id="job-radar-title">Live Job Radar &amp; Offerings</h1>
          <p>
            Real-time opportunities prioritized for your location and verified skills using 5 platform connectors (LinkedIn, Indeed, Upwork, GitHub, Fiverr). Review CareerOps Blocks A–H intelligence reports, apply directly on official portals, or simulate interview practice.
          </p>
          <div className="ct-profile-hero-note">
            <ShieldCheck size={14} /> Factual match signals · Verified legitimate career boards only · {isAuthenticated ? `${allJobs.length} Live listings indexed.` : "Sign in to unlock personalized radar."}
          </div>
        </div>

        <aside className="ct-profile-showcase ct-account-surface" aria-label="Job Radar stats">
          <span className="p-3 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] text-[var(--accent)] mb-2">
            <Flame size={32} />
          </span>
          <strong className="text-xl font-bold text-[var(--text)]">
            {isAuthenticated ? `${filteredJobs.length} Opportunities` : "Opportunity Radar"}
          </strong>
          <small className="text-xs text-[var(--text-muted)]">
            {isAuthenticated ? `Targeting ${targetRole}` : "Sign in to Unlock 100+ Live Jobs"}
          </small>
          <em><Sparkles size={13} /> 5 Connectors Active</em>
          <div className="ct-account-photo-actions mt-2">
            {isAuthenticated ? (
              <button
                className="ct-button ct-button--secondary ct-button--calm text-xs"
                type="button"
                onClick={() => {
                  void liveJobsQuery.refetch();
                  setCurrentPage(1);
                }}
                disabled={liveJobsQuery.isFetching}
              >
                <RefreshCw size={13} className={liveJobsQuery.isFetching ? "animate-spin" : ""} />
                <span>{liveJobsQuery.isFetching ? "Scanning…" : "Sync Live Radar"}</span>
              </button>
            ) : (
              <button
                className="ct-button ct-button--primary text-xs"
                type="button"
                onClick={() => setLocation("/login?next=%2Fjobs")}
              >
                <LockKeyhole size={13} />
                <span>Sign in to Unlock</span>
              </button>
            )}
          </div>
        </aside>
      </section>

      {/* ─── Main Job Radar Container ────────────────────────────── */}
      <section
        className="ct-account-jobs ct-account-surface"
        style={{ width: "min(100%, 1180px)", margin: "0 auto 12px", display: "grid", gap: 16 }}
      >
        {/* ─── High-Hook Interactive Filter Command Center ───────── */}
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-md flex flex-col gap-3.5">
          {/* Row 1: Search & Quick Proximity Segmented Buttons */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input with Clear Button */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search live roles by title, company, technology (React, Python, AWS, SQL…)"
                className="w-full text-xs pl-10 pr-9 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Proximity Pill Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] shrink-0 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveLocationFilter("all");
                  setCurrentPage(1);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  activeLocationFilter === "all"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                All Locs
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveLocationFilter("near");
                  setCurrentPage(1);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeLocationFilter === "near"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                <MapPin size={12} /> Near Me
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveLocationFilter("remote");
                  setCurrentPage(1);
                }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeLocationFilter === "remote"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                <Globe2 size={12} /> Remote
              </button>
            </div>
          </div>

          {/* Row 2: Enhanced Dropdowns Command Grid with Embedded Icons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
            {/* 1. Source Platform Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                <Layers size={11} className={activePlatformFilter !== "all" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} /> Source Platform
              </label>
              <div className="relative">
                <Layers size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${activePlatformFilter !== "all" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
                <select
                  value={activePlatformFilter}
                  onChange={(e) => {
                    setActivePlatformFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-xs font-semibold pl-8 pr-3 py-2 rounded-xl border cursor-pointer appearance-none shadow-xs transition-all ${
                    activePlatformFilter !== "all"
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-raised))] text-[var(--text)] ring-1 ring-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] focus:border-[var(--accent)]"
                  }`}
                  aria-label="Filter by source platform"
                >
                  <option value="all">🌐 All Sources ({allJobs.length})</option>
                  <option value="arbeitnow">🇪🇺 Arbeitnow (Europe &amp; Remote)</option>
                  <option value="remotive">🌐 Remotive (Remote Tech)</option>
                  <option value="themuse">🏢 The Muse (500k+ Jobs)</option>
                  <option value="jobicy">⚡ Jobicy (Global Remote)</option>
                  <option value="linkedin">💼 LinkedIn Roles</option>
                  <option value="indeed">🎯 Indeed Roles</option>
                  <option value="github">🐙 GitHub Roles</option>
                  <option value="upwork">⚡ Upwork Roles</option>
                  <option value="fiverr">🚀 Fiverr Roles</option>
                  <option value="remoteok">🌐 RemoteOK Roles</option>
                </select>
              </div>
            </div>

            {/* 2. Work Mode Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                <Building2 size={11} className={activeModeFilter !== "all" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} /> Work Mode
              </label>
              <div className="relative">
                <Building2 size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeModeFilter !== "all" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
                <select
                  value={activeModeFilter}
                  onChange={(e) => {
                    setActiveModeFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-xs font-semibold pl-8 pr-3 py-2 rounded-xl border cursor-pointer appearance-none shadow-xs transition-all ${
                    activeModeFilter !== "all"
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-raised))] text-[var(--text)] ring-1 ring-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] focus:border-[var(--accent)]"
                  }`}
                  aria-label="Filter by work mode"
                >
                  <option value="all">🏢 All Work Modes</option>
                  <option value="Remote">🌐 100% Remote</option>
                  <option value="Hybrid">🏛️ Hybrid Office</option>
                  <option value="On-site">📍 On-site Only</option>
                </select>
              </div>
            </div>

            {/* 3. Regional Hub & City Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                <MapPin size={11} className={activeCityFilter !== "all" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} /> City / Regional Hub
              </label>
              <div className="relative">
                <MapPin size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeCityFilter !== "all" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
                <select
                  value={activeCityFilter}
                  onChange={(e) => {
                    setActiveCityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-xs font-semibold pl-8 pr-3 py-2 rounded-xl border cursor-pointer appearance-none shadow-xs transition-all ${
                    activeCityFilter !== "all"
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-raised))] text-[var(--text)] ring-1 ring-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] focus:border-[var(--accent)]"
                  }`}
                  aria-label="Filter by city hub"
                >
                  <option value="all">📍 All Locations</option>
                  <option value="Lahore">🇵🇰 Lahore Hub</option>
                  <option value="Karachi">🇵🇰 Karachi Hub</option>
                  <option value="Islamabad">🇵🇰 Islamabad Hub</option>
                  <option value="Wah Cantt">🇵🇰 Wah Cantt</option>
                  <option value="Faisalabad">🇵🇰 Faisalabad</option>
                  <option value="Peshawar">🇵🇰 Peshawar</option>
                  <option value="remote">🌍 Global Remote</option>
                </select>
              </div>
            </div>

            {/* 4. Experience Level Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                <BriefcaseBusiness size={11} className={activeSeniorityFilter !== "all" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} /> Seniority Level
              </label>
              <div className="relative">
                <BriefcaseBusiness size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeSeniorityFilter !== "all" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
                <select
                  value={activeSeniorityFilter}
                  onChange={(e) => {
                    setActiveSeniorityFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-xs font-semibold pl-8 pr-3 py-2 rounded-xl border cursor-pointer appearance-none shadow-xs transition-all ${
                    activeSeniorityFilter !== "all"
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-raised))] text-[var(--text)] ring-1 ring-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] focus:border-[var(--accent)]"
                  }`}
                  aria-label="Filter by experience level"
                >
                  <option value="all">🎯 All Levels</option>
                  <option value="Entry / Junior">🌱 Entry / Junior (0-2y)</option>
                  <option value="Mid-Level">⚡ Mid-Level (2-5y)</option>
                  <option value="Senior">👑 Senior / Lead (5y+)</option>
                </select>
              </div>
            </div>

            {/* 5. Sort By Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} className={activeSortBy !== "match" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} /> Sort Order
              </label>
              <div className="relative">
                <Sparkles size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${activeSortBy !== "match" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
                <select
                  value={activeSortBy}
                  onChange={(e) => {
                    setActiveSortBy(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className={`w-full text-xs font-semibold pl-8 pr-3 py-2 rounded-xl border cursor-pointer appearance-none shadow-xs transition-all ${
                    activeSortBy !== "match"
                      ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-raised))] text-[var(--text)] ring-1 ring-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] focus:border-[var(--accent)]"
                  }`}
                  aria-label="Sort opportunities"
                >
                  <option value="match">🌟 Highest AI Match</option>
                  <option value="salary">💰 Highest Salary</option>
                  <option value="company">🏢 Company (A–Z)</option>
                  <option value="proximity">📍 Proximity First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Row 3: Active Filter Chips Bar (Shown when any filter is active) */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)] flex-wrap text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-[var(--text-muted)]">Active:</span>

                {activePlatformFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text)] text-[11px]">
                    Source: {platformMeta[activePlatformFilter]?.name}
                    <button type="button" onClick={() => { setActivePlatformFilter("all"); setCurrentPage(1); }} className="hover:text-[var(--accent)]">✕</button>
                  </span>
                )}

                {activeLocationFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text)] text-[11px]">
                    Loc: {activeLocationFilter === "near" ? "Near Me" : "Remote"}
                    <button type="button" onClick={() => { setActiveLocationFilter("all"); setCurrentPage(1); }} className="hover:text-[var(--accent)]">✕</button>
                  </span>
                )}

                {activeCityFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text)] text-[11px]">
                    City: {activeCityFilter}
                    <button type="button" onClick={() => { setActiveCityFilter("all"); setCurrentPage(1); }} className="hover:text-[var(--accent)]">✕</button>
                  </span>
                )}

                {activeModeFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text)] text-[11px]">
                    Mode: {activeModeFilter}
                    <button type="button" onClick={() => { setActiveModeFilter("all"); setCurrentPage(1); }} className="hover:text-[var(--accent)]">✕</button>
                  </span>
                )}

                {activeSeniorityFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text)] text-[11px]">
                    Seniority: {activeSeniorityFilter}
                    <button type="button" onClick={() => { setActiveSeniorityFilter("all"); setCurrentPage(1); }} className="hover:text-[var(--accent)]">✕</button>
                  </span>
                )}

                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text)] text-[11px]">
                    Query: "{searchQuery}"
                    <button type="button" onClick={() => { setSearchQuery(""); setCurrentPage(1); }} className="hover:text-[var(--accent)]">✕</button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleFilterReset}
                className="text-xs text-[var(--accent)] font-semibold hover:underline flex items-center gap-1 ml-auto"
              >
                Reset All Filters ({activeFiltersCount})
              </button>
            </div>
          )}
        </div>

        {/* ─── Results Summary Bar ─────────────────────────────────── */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
          <span>
            {isAuthenticated ? (
              <>
                Showing <strong className="text-[var(--text)] font-semibold">{filteredJobs.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredJobs.length)}</strong> of <strong className="text-[var(--text)] font-semibold">{filteredJobs.length}</strong> opportunities
              </>
            ) : (
              <span>
                Locked Preview · <strong className="text-[var(--text)] font-semibold">100+ Opportunities Ready</strong>
              </span>
            )}
          </span>
          {isAuthenticated && totalPages > 1 && (
            <span className="font-semibold text-[var(--text)]">
              Page {currentPage} of {totalPages} (20 per page)
            </span>
          )}
        </div>

        {/* ─── High-Hook Job Cards Grid (Content-Fitting & High Visibility) ─── */}
        {!isAuthenticated ? (
          <div
            className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-raised)] min-h-[480px] flex items-center justify-center p-4 sm:p-8"
            data-testid="locked-job-radar-preview"
          >
            {/* Background blurred teaser cards */}
            <div
              className="absolute inset-0 p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 filter blur-[6px] opacity-30 select-none pointer-events-none overflow-hidden"
              aria-hidden="true"
            >
              {SAMPLE_LOCKED_JOBS.map((job) => (
                <div
                  key={job.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-11 rounded-xl bg-[color-mix(in_srgb,var(--accent)_15%,var(--surface))] flex items-center justify-center font-bold text-sm text-[var(--accent)]">
                        {job.monogram}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text)]">{job.title}</h4>
                        <p className="text-xs text-[var(--text-muted)]">{job.company} · {job.location}</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-raised))] text-[var(--accent)]">
                      {job.match} Match
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="font-semibold text-[var(--text)]">{job.salary}</span>
                    <span>•</span>
                    <span>{job.workMode}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {job.skills.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Centered Locked Preview Glassmorphism Banner */}
            <div className="relative z-10 max-w-lg w-full text-center p-6 sm:p-8 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur-xl shadow-2xl flex flex-col items-center gap-4">
              <div className="size-14 rounded-2xl bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface))] border border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] text-[var(--accent)] flex items-center justify-center shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)]">
                <LockKeyhole size={28} />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--accent)_15%,var(--surface-raised))] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] mb-2">
                  <Sparkles size={11} /> Live Intelligence Radar
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text)] tracking-tight">
                  Sign in to view live opportunities
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
                  Real-time live roles aggregated from LinkedIn, Indeed, Upwork, GitHub, and Fiverr tailored to your verified skills, with 1-click AI rehearsal simulators and CareerOps Blocks A–H intelligence.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-1">
                <button
                  type="button"
                  onClick={() => setLocation("/login?next=%2Fjobs")}
                  className="ct-button ct-button--primary w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-lg"
                >
                  <LockKeyhole size={14} /> Sign In to Access
                </button>
                <button
                  type="button"
                  onClick={() => setLocation("/signup?next=%2Fjobs")}
                  className="ct-button ct-button--secondary w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2"
                >
                  Create Free Account <ArrowRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full pt-3 border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                <div className="flex flex-col items-center text-center gap-0.5">
                  <strong className="text-[var(--text)] font-semibold">100+ Live Roles</strong>
                  <span>5 Top Platforms</span>
                </div>
                <div className="flex flex-col items-center text-center gap-0.5">
                  <strong className="text-[var(--text)] font-semibold">AI Match Score</strong>
                  <span>Skills Alignment</span>
                </div>
                <div className="flex flex-col items-center text-center gap-0.5">
                  <strong className="text-[var(--text)] font-semibold">Mock Simulators</strong>
                  <span>1-Click Practice</span>
                </div>
              </div>
            </div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]">
            <Compass size={36} className="mx-auto text-[var(--text-muted)] opacity-60 mb-3" />
            <h3 className="text-base font-semibold text-[var(--text)] m-0">No matching live roles found</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1.5 mb-4 max-w-md mx-auto">
              We couldn't find any opportunities matching your selected criteria. Try resetting your search query or expanding your location and connector source filters.
            </p>
            <button
              type="button"
              onClick={handleFilterReset}
              className="ct-button ct-button--secondary text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {paginatedJobs.map((job) => {
              const companyMonogram = job.company
                .split(/\s+/)
                .map((w: string) => w[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <article
                  key={job.id}
                  className="p-5 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_24%,var(--border))] bg-[var(--surface)] relative overflow-hidden flex flex-col justify-between transition-all duration-200 hover:border-[var(--accent)] hover:shadow-xl group"
                  style={{
                    height: "auto",
                    boxShadow: "0 4px 20px -2px color-mix(in srgb, var(--bg) 30%, transparent)",
                  }}
                >
                  {/* Subtle Top-Right Ambient Glow */}
                  <div
                    className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-[var(--accent)] opacity-15 blur-2xl group-hover:opacity-25 transition-opacity"
                    aria-hidden="true"
                  />

                  {/* ─── Card Header ─── */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        {/* Company Monogram Avatar */}
                        <div className="size-11 rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface-raised))] border border-[color-mix(in_srgb,var(--accent)_28%,var(--border))] flex items-center justify-center font-black text-sm text-[var(--accent)] shadow-sm shrink-0">
                          {companyMonogram}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-[var(--text)] flex items-center gap-1">
                              {job.company}
                              <span title="Verified ATS Employer">
                                <ShieldCheck size={12} className="text-emerald-400" />
                              </span>
                            </span>
                          </div>
                          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-[var(--accent)]" /> {job.location}
                          </span>
                        </div>
                      </div>

                      {/* Match Score Badge */}
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-black px-2.5 py-1 rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] text-[var(--accent)] shadow-sm">
                          <Star size={11} className="fill-[var(--accent)]" /> {job.matchPercentage}% Match
                        </span>
                        <span className="block text-[9.5px] font-medium text-[var(--text-muted)] mt-0.5">
                          {job.matchScore} / 5.0 score
                        </span>
                      </div>
                    </div>

                    {/* Role Title */}
                    <h3 className="text-[14.5px] font-extrabold text-[var(--text)] m-0 leading-snug group-hover:text-[var(--accent)] transition-colors">
                      {job.title}
                    </h3>

                    {/* Key Attributes Strip: Salary, Mode, Seniority */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface-raised))] border border-[color-mix(in_srgb,var(--accent)_22%,var(--border))] text-[var(--accent)] flex items-center gap-1">
                        <DollarSign size={11} /> {job.salaryRange}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] flex items-center gap-1">
                        <Building2 size={11} /> {job.workMode}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text-muted)] flex items-center gap-1">
                        <BriefcaseBusiness size={11} /> {job.experienceLevel}
                      </span>
                    </div>

                    {/* ─── Prominent Skills Matching ─── */}
                    <div className="pt-2.5 pb-1 border-t border-[var(--border)] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[var(--text)] flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-400" /> Matched with your profile:
                        </span>
                        <span className="text-[10.5px] text-[var(--accent)] font-semibold">
                          {job.matchedSkills.length} Verified Skills
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {job.matchedSkills.map((skill: string) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-raised))] text-[var(--text)] shadow-xs"
                          >
                            <CheckCircle2 size={10} className="text-[var(--accent)]" /> {skill}
                          </span>
                        ))}
                        {job.extraSkills?.slice(0, 3).map((skill: string) => (
                          <span
                            key={skill}
                            className="inline-flex items-center text-[10.5px] font-medium px-2 py-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-muted)] opacity-90"
                            title={`Role also values ${skill}`}
                          >
                            +{skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Connector Provenance Signals */}
                    <div className="flex items-center justify-between gap-1.5 text-[11px] text-[var(--text-muted)]">
                      <span className="font-medium text-[var(--text-muted)] flex items-center gap-1">
                        <Layers size={11} /> Match Signals:
                      </span>
                      <div className="flex items-center gap-1">
                        {job.platformSources.map((plat: ConnectionPlatform) => {
                          const meta = platformMeta[plat] || { name: plat, Icon: FaGithub, color: "#f97316" };
                          const Icon = meta.Icon;
                          return (
                            <span
                              key={plat}
                              className="px-1.5 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--text)] flex items-center gap-1 text-[10px] font-medium"
                              title={`Signal verified via ${meta.name}`}
                            >
                              <Icon size={10} aria-hidden="true" />
                              <span>{meta.name}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI Recommendation Memo */}
                    <div className="text-[11.5px] text-[var(--text-muted)] leading-relaxed border-l-2 border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_4%,var(--surface-raised))] p-2 rounded-r-lg">
                      <span className="font-bold text-[var(--text)] block text-[10.5px] mb-0.5 uppercase tracking-wide">
                        FutureMaker AI Assessment
                      </span>
                      {job.whyRecommended}
                    </div>
                  </div>

                  {/* ─── Action Buttons ─── */}
                  <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[var(--border)] flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedReportJob(job)}
                      className="text-[11.5px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1 transition-colors"
                    >
                      <Info size={13} /> FutureMaker Report
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSaveJob(job)}
                        className={`p-1.5 rounded-lg border transition-all ${
                          savedJobs.has(job.id)
                            ? "bg-[color-mix(in_srgb,var(--accent)_20%,var(--surface-raised))] border-[var(--accent)] text-[var(--accent)]"
                            : "bg-[var(--surface-raised)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
                        }`}
                        title={savedJobs.has(job.id) ? "Bookmarked role" : "Bookmark this role"}
                        aria-label={`Bookmark ${job.title}`}
                      >
                        {savedJobs.has(job.id) ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                      </button>

                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => toggleApplyJob(e, job)}
                        className={`ct-button text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
                          appliedJobs.has(job.id)
                            ? "bg-[color-mix(in_srgb,var(--success)_18%,var(--surface-raised))] border border-[var(--success)] text-[var(--success)] hover:bg-[color-mix(in_srgb,var(--success)_26%,var(--surface-raised))]"
                            : "ct-button--secondary"
                        }`}
                        style={{ minHeight: 28, textDecoration: "none" }}
                        title={`Open official job application for ${job.company}`}
                      >
                        {appliedJobs.has(job.id) ? (
                          <>
                            <Check size={12} className="text-[var(--success)] font-bold" />
                            <span>Applied ✓</span>
                          </>
                        ) : (
                          <>
                            <span>Apply on Portal</span>
                            <ExternalLink size={12} />
                          </>
                        )}
                      </a>

                      <button
                        type="button"
                        onClick={() => handlePracticeForRole(job.title, job.company)}
                        className="ct-button text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
                        style={{ minHeight: 28 }}
                        aria-label={`Practice for ${job.title}`}
                      >
                        <span>Practice role</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ─── Pagination Controls (20 per page) ───────────────────── */}
        {totalPages > 1 && (
          <nav
            aria-label="Job listings pagination"
            className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] mt-1 mb-0"
          >
            <div className="text-xs text-[var(--text-muted)] font-medium">
              Showing <strong className="text-[var(--text)] font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredJobs.length)}</strong> of <strong className="text-[var(--text)] font-semibold">{filteredJobs.length}</strong> opportunities (20 per page)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="ct-button ct-button--secondary text-xs px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Go to previous page"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => handlePageChange(pageNumber)}
                    className={`size-8 rounded-lg text-xs font-semibold transition-all ${
                      currentPage === pageNumber
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)]"
                    }`}
                    aria-current={currentPage === pageNumber ? "page" : undefined}
                    aria-label={`Page ${pageNumber}`}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ct-button ct-button--secondary text-xs px-3 py-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Go to next page"
              >
                Next →
              </button>
            </div>
          </nav>
        )}

        {/* ─── FutureMaker Audit Report Modal (Blocks A–H) ─────────── */}
        <Dialog
          open={Boolean(selectedReportJob)}
          onOpenChange={(open) => {
            if (!open) setSelectedReportJob(null);
          }}
        >
          <DialogContent className="ct-connection-details-dialog max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedReportJob && (
              <div className="flex flex-col gap-4">
                <div className="ct-connection-details-heading flex items-start gap-3">
                  <div className="p-3 rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_24%,var(--border))]">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <p className="ct-home-eyebrow m-0">
                      <span /> FutureMaker Intelligence Audit
                    </p>
                    <DialogTitle className="text-lg font-bold text-[var(--text)] m-0">
                      {selectedReportJob.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[var(--text-muted)] mt-0.5">
                      {selectedReportJob.company} · {selectedReportJob.location} · {selectedReportJob.salaryRange}
                    </DialogDescription>
                  </div>
                </div>

                {/* 5-Dimension Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <span className="text-[var(--text-muted)] block text-[10px]">Technical Fit</span>
                    <strong className="text-[var(--text)] text-sm">{selectedReportJob.dimensions.technicalFit}%</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <span className="text-[var(--text-muted)] block text-[10px]">Seniority Scope</span>
                    <strong className="text-[var(--text)] text-sm">{selectedReportJob.dimensions.seniorityFit}%</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <span className="text-[var(--text-muted)] block text-[10px]">Work Mode</span>
                    <strong className="text-[var(--text)] text-sm">{selectedReportJob.dimensions.workModeFit}%</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <span className="text-[var(--text-muted)] block text-[10px]">Growth Potential</span>
                    <strong className="text-[var(--text)] text-sm">{selectedReportJob.dimensions.growthFit}%</strong>
                  </div>
                </div>

                {/* Blocks A–H */}
                <div className="space-y-3 text-xs text-[var(--text-muted)]">
                  <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <strong className="text-[var(--text)] block font-semibold mb-1">
                      Block A: Role &amp; Organization Snapshot
                    </strong>
                    <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockA}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <strong className="text-[var(--text)] block font-semibold mb-1">
                      Block B: Core Mission &amp; Impact
                    </strong>
                    <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockB}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <strong className="text-[var(--text)] block font-semibold mb-1">
                      Block C: Technical Architecture &amp; Stack
                    </strong>
                    <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockC}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <strong className="text-[var(--text)] block font-semibold mb-1">
                      Block D: Candidate Fit Matrix
                    </strong>
                    <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockD}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <strong className="text-[var(--text)] block font-semibold mb-1">
                      Block E: Connector Signals Provenance
                    </strong>
                    <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockE}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <strong className="text-[var(--text)] block font-semibold mb-1">
                      Block F: Strategic Interview Talking Points
                    </strong>
                    <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockF}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <strong className="text-[var(--text)] block font-semibold mb-1">
                      Block G: Legitimacy &amp; Verification Check
                    </strong>
                    <p className="m-0 leading-relaxed flex items-center gap-1.5 text-emerald-400">
                      <ShieldCheck size={14} /> {selectedReportJob.reportBlocks.blockG}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--surface-raised)] border border-[var(--border)]">
                    <strong className="text-[var(--text)] block font-semibold mb-1">
                      Block H: Tailored Application Strategy
                    </strong>
                    <p className="m-0 leading-relaxed">{selectedReportJob.reportBlocks.blockH}</p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)] flex-wrap">
                  <button
                    type="button"
                    className="ct-button ct-button--secondary text-xs"
                    onClick={() => setSelectedReportJob(null)}
                  >
                    Close report
                  </button>

                  <div className="flex items-center gap-2">
                    <a
                      href={selectedReportJob.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ct-button ct-button--secondary text-xs flex items-center gap-1.5"
                      style={{ textDecoration: "none" }}
                    >
                      <span>Open official job portal</span>
                      <ExternalLink size={13} />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        const job = selectedReportJob;
                        setSelectedReportJob(null);
                        handlePracticeForRole(job.title, job.company);
                      }}
                      className="ct-button text-xs flex items-center gap-1.5"
                    >
                      <span>Practice for this role</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
}
