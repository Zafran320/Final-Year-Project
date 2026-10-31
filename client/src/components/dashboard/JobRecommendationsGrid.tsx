import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Search,
  X,
  ArrowRight,
  Briefcase,
  Clock,
  ExternalLink,
  Sparkles,
  Bot,
  Building2,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Layers,
  Code2,
  Loader2,
  TrendingUp,
  ShieldCheck,
  Bookmark,
  BookmarkCheck,
  Navigation,
  Globe2,
  Radar,
} from "lucide-react";
import { JobCardData } from "./types";
import { RealInteractiveJobMap } from "./RealInteractiveJobMap";
import { JobSearchStatusNotice } from "@/components/JobSearchStatusNotice";
import { useJobApplications } from "@/lib/jobApplications";
import { useUserLocation } from "@/lib/userLocation";
import { JOB_PLATFORM_LABELS, type JobPlatformSource } from "@/lib/jobPlatforms";
import { DEFAULT_CITY_NAME, findKnownCity } from "@shared/pakistanCities";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { STORAGE_KEYS } from "@/lib/brand";

interface JobRecommendationsGridProps {
  initialJobs: JobCardData[];
  selectedCity: string;
  onSelectCity: (city: string) => void;
  candidateSkills?: string;
  targetRole?: string;
  interviewScore?: number;
  savedProfileLocation?: string | null;
}

export function JobRecommendationsGrid({
  initialJobs,
  selectedCity: selectedCityProp,
  onSelectCity,
  candidateSkills = "React, TypeScript, Node.js, Tailwind CSS",
  targetRole = "Frontend Developer",
  interviewScore,
  savedProfileLocation,
}: JobRecommendationsGridProps) {
  const [, setLocation] = useLocation();
  const [selectedCity, setSelectedCity] = useState(selectedCityProp || DEFAULT_CITY_NAME);
  // The map owns auto-detection; this instance only reads the shared location.
  const { location: userLocation, isResolving: locationResolving } = useUserLocation(savedProfileLocation);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeFilterTab, setActiveFilterTab] = useState<"near" | "city" | "remote" | "all">("near");
  const [selectedPlatform, setSelectedPlatform] = useState<"all" | JobPlatformSource>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleJobsCount, setVisibleJobsCount] = useState(9);
  const [selectedJobForModal, setSelectedJobForModal] = useState<any | null>(null);

  // Shared with the /jobs page: "opened" vs "applied" is only set when the user confirms.
  const { statusOf, openJob, toggleApplied } = useJobApplications();

  const [savedJobs, setSavedJobs] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.savedJobs);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleSaveJob = (e: React.MouseEvent, jobId: string, jobTitle: string) => {
    e.stopPropagation();
    setSavedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
        toast.message(`Removed from bookmarks.`);
      } else {
        next.add(jobId);
        toast.success(`Saved ${jobTitle} to bookmarks!`);
      }
      try {
        localStorage.setItem(STORAGE_KEYS.savedJobs, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (selectedCityProp && selectedCityProp !== selectedCity) {
      setSelectedCity(selectedCityProp);
    }
  }, [selectedCityProp]);

  // Real-time live jobs query from backend Career-Ops scraper & evaluator
  // Rank from the user's real position when they are browsing their own city; otherwise from the city they picked on the map.
  const browsingOwnCity = selectedCity.toLowerCase() === userLocation.city.toLowerCase();
  const selectedKnownCity = findKnownCity(selectedCity);
  const liveJobsQuery = trpc.careerProfile.fetchLiveJobs.useQuery(
    {
      location: browsingOwnCity ? userLocation.label : selectedKnownCity ? `${selectedKnownCity.name}, Pakistan` : selectedCity,
      lat: browsingOwnCity ? userLocation.lat ?? undefined : selectedKnownCity?.lat,
      lng: browsingOwnCity ? userLocation.lng ?? undefined : selectedKnownCity?.lng,
      countryCode: browsingOwnCity ? userLocation.countryCode ?? undefined : selectedKnownCity ? "PK" : undefined,
    },
    {
      // Wait for GPS so we don't spend a job-search request on the fallback city first.
      enabled: !locationResolving,
      staleTime: 10 * 60_000,
      refetchOnWindowFocus: false,
    }
  );

  const rawLiveJobs = useMemo(() => {
    return liveJobsQuery.data?.jobs || [];
  }, [liveJobsQuery.data]);

  // Transform and enrich live jobs with proximity distance
  const allEvaluatedJobs = useMemo(() => {
    return rawLiveJobs.map((job: any, index: number) => {
      const logoVariants: Array<"abc" | "xyz" | "creative" | "generic"> = [
        "abc",
        "xyz",
        "creative",
        "generic",
      ];

      // Only the server's distance: it is left out when the posting gives just a city, not an office location.
      const distanceKm: number | null = typeof job.distanceKm === "number" ? job.distanceKm : null;

      return {
        ...job,
        companyLogoVariant: logoVariants[index % logoVariants.length],
        distanceKm,
      };
    });
  }, [rawLiveJobs]);

  // Count listings per source, only for sources that actually returned jobs.
  const platformCounts = useMemo(() => {
    const counts = new Map<JobPlatformSource, number>();
    allEvaluatedJobs.forEach((j: any) => {
      (j.platformSources || []).forEach((p: JobPlatformSource) => counts.set(p, (counts.get(p) ?? 0) + 1));
    });
    return counts;
  }, [allEvaluatedJobs]);

  // Filter jobs based on active tab, platform, and search query
  const filteredJobs = useMemo(() => {
    let list = [...allEvaluatedJobs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (j) =>
          (j.title || "").toLowerCase().includes(q) ||
          (j.company || "").toLowerCase().includes(q) ||
          (j.location || "").toLowerCase().includes(q) ||
          (j.matchedSkills || []).some((s: string) => s.toLowerCase().includes(q)) ||
          (j.coreSkills || []).some((s: string) => s.toLowerCase().includes(q))
      );
    }

    if (selectedPlatform !== "all") {
      list = list.filter((j) => (j.platformSources || []).includes(selectedPlatform));
    }

    const cityClean = selectedCity.toLowerCase().replace(/[^a-z]/g, "");

    if (activeFilterTab === "near") {
      // Same city or within ~50 km; never silently widen to the whole country.
      return list.filter((j) => j.proximityTier === "same-city" || j.proximityTier === "nearby");
    }

    if (activeFilterTab === "city") {
      const cityMatches = list.filter(
        (j) =>
          (j.location || "").toLowerCase().includes(cityClean) ||
          (j.cityKey || "").toLowerCase().includes(cityClean)
      );
      return cityMatches;
    }

    if (activeFilterTab === "remote") {
      return list.filter((j) => j.workMode === "Remote");
    }

    return list;
  }, [allEvaluatedJobs, activeFilterTab, selectedCity, savedProfileLocation, selectedPlatform, searchQuery]);

  const handleCitySelect = useCallback((city: string) => {
    setSelectedCity(city);
    onSelectCity(city);
  }, [onSelectCity]);

  const handleUserCoords = useCallback((coords: { lat: number; lng: number }, nearestCity: string) => {
    setUserCoords(coords);
    setSelectedCity(nearestCity);
    onSelectCity(nearestCity);
  }, [onSelectCity]);

  return (
    <div className="w-full space-y-10">
      {/* ─── 1. Auto-Geolocation & Real Interactive Map Station ──────────── */}
      <RealInteractiveJobMap
        selectedCity={selectedCity}
        onSelectCity={handleCitySelect}
        savedProfileLocation={savedProfileLocation}
        totalJobsCount={allEvaluatedJobs.length}
        liveJobs={allEvaluatedJobs}
        userCoords={userCoords}
        onUserCoordsDetected={handleUserCoords}
      />

      {/* ─── 2. Top Job Recommendations For You ──────────────────────────── */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-orange-500/10 text-orange-500">
                <Sparkles size={14} />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                Live Opportunity Radar
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
              Top Job Recommendations in {selectedCity}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Live jobs ranked by distance from you, with the skills from your profile highlighted.
            </p>
          </div>

          {/* Quick Filter Tabs & Full Radar Link */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveFilterTab("near")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeFilterTab === "near"
                    ? "bg-[#ff5722] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Navigation size={12} />
                <span>Near Me</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTab("city")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeFilterTab === "city"
                    ? "bg-[#ff5722] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{selectedCity}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTab("remote")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeFilterTab === "remote"
                    ? "bg-[#ff5722] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Globe2 size={12} />
                <span>Remote</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTab("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeFilterTab === "all"
                    ? "bg-[#ff5722] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>All ({allEvaluatedJobs.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setLocation("/jobs")}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 transition-all cursor-pointer"
            >
              <Radar size={13} />
              <span>Full Radar (/jobs)</span>
            </button>
          </div>
        </div>

        {/* ─── Platform Selector Pills & Search Bar ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Layers size={13} /> Live Feeds:
            </span>
            {[
              { id: "all" as const, label: "All Boards", count: allEvaluatedJobs.length },
              ...Array.from(platformCounts.entries()).map(([id, count]) => ({ id, label: JOB_PLATFORM_LABELS[id] ?? id, count })),
            ].map((plat) => {
              const isSel = selectedPlatform === plat.id;
              return (
                <button
                  key={plat.id}
                  type="button"
                  onClick={() => setSelectedPlatform(plat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSel
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {plat.id !== "all" && <span className="size-2 rounded-full bg-orange-500" />}
                  <span>{plat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSel
                        ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {plat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Keyword/Skill Search */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by role, skill, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <JobSearchStatusNotice status={liveJobsQuery.data?.localSearch} />

        {/* 3 Job Cards Grid */}
        {liveJobsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm dark:shadow-xl flex flex-col justify-between animate-pulse min-h-[260px]"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-1 flex-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                </div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mt-4" />
              </div>
            ))}
          </div>
        ) : liveJobsQuery.data?.localSearch === "not-configured" ? null : filteredJobs.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-8 text-center space-y-3">
            <div className="size-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
              <Search size={20} />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              No matching jobs found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Try adjusting your search keywords, switching between live feeds, or choosing another city from the map above.
            </p>
            {(liveJobsQuery.data?.searchLinks?.length ?? 0) > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {liveJobsQuery.data!.searchLinks.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-orange-500 hover:text-orange-500 transition-colors"
                  >
                    {link.label} ↗
                  </a>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedPlatform("all");
                setActiveFilterTab("all");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#ff5722] hover:bg-orange-600 text-white shadow-md shadow-orange-600/20 transition-all cursor-pointer"
            >
              <span>Reset All Filters</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {filteredJobs.slice(0, visibleJobsCount).map((job: any) => {
                const isApplied = statusOf(job.id) === "applied";
                const isSaved = savedJobs.has(job.id);
                const plats = (job.platformSources || []).map((p: string) => p.toLowerCase());
                const comp = (job.company || "").toLowerCase();

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-orange-500/50 dark:hover:border-orange-500/40 hover:shadow-orange-500/5 transition-all group"
                  >
                    <div>
                      {/* Platform Badge Bar */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {plats.includes("arbeitnow") ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <span className="size-1.5 rounded-full bg-emerald-500"></span> Arbeitnow (EU &amp; Remote)
                            </span>
                          ) : plats.includes("remotive") ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                              <span className="size-1.5 rounded-full bg-blue-500"></span> Remotive
                            </span>
                          ) : plats.includes("themuse") ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                              <span className="size-1.5 rounded-full bg-cyan-500"></span> The Muse 500k+
                            </span>
                          ) : plats.includes("jobicy") ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                              <span className="size-1.5 rounded-full bg-purple-500"></span> Jobicy
                            </span>
                          ) : plats.includes("meta") || comp.includes("meta") || comp.includes("facebook") || comp.includes("whatsapp") || comp.includes("instagram") ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                              <span className="size-1.5 rounded-full bg-blue-500"></span> Meta Careers
                            </span>
                          ) : plats.includes("upwork") || comp.includes("upwork") ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <span className="size-1.5 rounded-full bg-emerald-500"></span> Upwork Contract
                            </span>
                          ) : plats.includes("linkedin") ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                              <span className="size-1.5 rounded-full bg-sky-500"></span> LinkedIn Jobs
                            </span>
                          ) : plats.includes("indeed") ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                              <span className="size-1.5 rounded-full bg-indigo-500"></span> Indeed
                            </span>
                          ) : plats.includes("remoteok") ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                              <span className="size-1.5 rounded-full bg-teal-500"></span> RemoteOK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                              <span className="size-1.5 rounded-full bg-[#ff5722]"></span> Direct Portal
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          ATS: {(job.sourceAts || "Verified").toUpperCase()}
                        </span>
                      </div>

                      {/* Top Row: Logo, Title, Bookmark & Match Badge */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center font-bold text-xs text-slate-800 dark:text-white shrink-0">
                            {comp.includes("meta") ? (
                              <span className="text-blue-500 font-extrabold">META</span>
                            ) : comp.includes("upwork") ? (
                              <span className="text-emerald-500 font-extrabold">UP</span>
                            ) : job.companyLogoVariant === "abc" ? (
                              <span className="text-orange-500 font-extrabold">CS</span>
                            ) : job.companyLogoVariant === "xyz" ? (
                              <span className="text-emerald-500 font-extrabold">PK</span>
                            ) : job.companyLogoVariant === "creative" ? (
                              <span className="text-indigo-500 font-extrabold">AI</span>
                            ) : (
                              <Building2 size={18} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {job.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {job.company}
                            </p>
                          </div>
                        </div>

                        {/* Right Controls: Bookmark & Match Badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => toggleSaveJob(e, job.id, job.title)}
                            title={isSaved ? "Saved in bookmarks" : "Save job"}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSaved
                                ? "text-orange-500 bg-orange-500/10"
                                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                          </button>

                          <div className="flex flex-col items-center justify-center size-11 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <span className="text-xs font-black leading-none">
                              {job.matchPercentage || 85}%
                            </span>
                            <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
                              Match
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Location & Compensation */}
                      <div className="py-2.5 space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                          <span className="flex items-center gap-1.5 truncate">
                            <MapPin size={13} className="text-slate-400 shrink-0" />
                            {job.location}
                          </span>
                          {job.distanceKm !== null && (
                            <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded shrink-0">
                              {job.distanceKm}km away
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                            <DollarSign size={13} className="text-emerald-500 shrink-0" />
                            {job.salaryRange}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            {job.workMode} · {job.experienceLevel}
                          </span>
                        </div>
                      </div>

                      {/* Why Recommended AI Badge */}
                      {job.whyRecommended && (
                        <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/15 text-[11px] text-orange-700 dark:text-orange-300 flex items-start gap-1.5">
                          <Sparkles size={13} className="shrink-0 mt-0.5 text-orange-500" />
                          <span className="line-clamp-2 leading-tight">
                            {job.whyRecommended}
                          </span>
                        </div>
                      )}

                      {/* Skills Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(job.matchedSkills || job.coreSkills || job.skills || ["React", "TypeScript"]).slice(0, 3).map((skill: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60"
                          >
                            {skill}
                          </span>
                        ))}
                        {(job.matchedSkills || job.coreSkills || job.skills || []).length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            +{(job.matchedSkills || job.coreSkills || job.skills || []).length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openJob(job)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer bg-[#ff5722] hover:bg-orange-600 text-white shadow-sm shadow-orange-600/20"
                          title={`Open the official posting for ${job.company}`}
                        >
                          <ExternalLink size={13} />
                          <span>Apply</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleApplied(job)}
                          aria-pressed={isApplied}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer border ${
                            isApplied
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                          title={isApplied ? "Click to unmark" : "Mark this job as applied"}
                        >
                          <CheckCircle2 size={13} />
                          <span>{isApplied ? "Applied" : "Mark applied"}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedJobForModal(job)}
                        className="inline-flex items-center gap-1 text-[#ff5722] hover:text-orange-600 dark:hover:text-orange-400 font-bold transition-colors cursor-pointer py-1"
                      >
                        <span>Intelligence</span>
                        <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Load More Controller */}
            {filteredJobs.length > visibleJobsCount && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleJobsCount((prev) => prev + 9)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#ff5722] hover:bg-orange-600 text-white shadow-md shadow-orange-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  Load More Opportunities (Showing {Math.min(visibleJobsCount, filteredJobs.length)} of {filteredJobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleJobsCount(filteredJobs.length)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Show All ({filteredJobs.length})
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Gemini & FutureMaker AI Attribution Footer Badge ─────────────── */}
        <div className="rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-gradient-to-br from-[#ff5722] to-[#e8442e] flex items-center justify-center text-white shadow-md shadow-orange-500/30 shrink-0">
              <Bot size={22} />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium m-0">
                Live postings from <strong>Google for Jobs</strong> (LinkedIn, Indeed, Rozee.pk, Glassdoor) and{" "}
                <strong className="text-orange-600 dark:text-orange-400">public remote job boards</strong>, ranked by distance from your location.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                {interviewScore ? `Your latest AI interview score: ${interviewScore}%.` : "Take an AI mock interview to see how ready you are for these roles."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Sparkles size={12} /> Real-Time Scraper
            </span>
          </div>
        </div>
      </div>

      {/* ─── Rich Career-Ops Intelligence Modal ──────────────────────────── */}
      <AnimatePresence>
        {selectedJobForModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0f1422] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      {selectedJobForModal.matchPercentage || 85}% Profile Match
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedJobForModal.workMode || "Hybrid"} · {selectedJobForModal.experienceLevel || "Mid-Level"}
                    </span>
                    {selectedJobForModal.distanceKm !== null && (
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                        📍 {selectedJobForModal.distanceKm} km from your location
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {selectedJobForModal.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedJobForModal.company} · {selectedJobForModal.location}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJobForModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Compensation</span>
                    <strong className="text-slate-900 dark:text-white text-sm">
                      {selectedJobForModal.salaryRange}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Platform Provenance</span>
                    <strong className="text-slate-900 dark:text-white">
                      {(selectedJobForModal.platformSources || ["LinkedIn", "Indeed"]).join(" & ")}
                    </strong>
                  </div>
                </div>

                {/* Core Stack */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2">Required Core Stack &amp; Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedJobForModal.coreSkills || selectedJobForModal.skills || ["React", "TypeScript"]).map((s: string, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Interview Talking Points */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-orange-500" />
                    Strategic Interview Talking Points:
                  </h4>
                  <ul className="space-y-1.5 pl-2 text-slate-600 dark:text-slate-300">
                    {(selectedJobForModal.talkingPoints || [
                      "Discuss your component architecture and type contracts.",
                      "Highlight your production delivery on rapid sprint cycles.",
                    ]).map((pt: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-orange-500 font-bold">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Interview Readiness Recommendation */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                  {interviewScore ? (
                    <>
                      <span className="font-bold block mb-1">Your latest AI interview score: {interviewScore}%</span>
                      Practise this role in a mock interview before you apply to {selectedJobForModal.company}.
                    </>
                  ) : (
                    <>
                      <span className="font-bold block mb-1">No interview score yet</span>
                      Take an AI mock interview for this role before you apply to {selectedJobForModal.company}.
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex-wrap">
                <button
                  type="button"
                  onClick={() => openJob(selectedJobForModal)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <ExternalLink size={14} />
                  <span>Open official posting</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedJobForModal(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJobForModal(null);
                      setLocation("/?screen=company-prep");
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#ff5722] hover:bg-orange-600 text-white shadow-md shadow-orange-500/30 cursor-pointer"
                  >
                    <span>Practice Interview</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
