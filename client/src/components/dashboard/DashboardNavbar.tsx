import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Sun,
  Moon,
  Sparkles,
  User,
  History,
  FileText,
  Compass,
  Bookmark,
  Settings,
  HelpCircle,
  BarChart3,
  Bell,
  Check,
  ChevronRight
} from "lucide-react";
import { useLocation } from "wouter";

interface DashboardNavbarProps {
  theme: "light" | "dark";
  onToggleTheme?: () => void;
  activeTab?: string;
  userName?: string;
}

export function DashboardNavbar({
  theme,
  onToggleTheme,
  activeTab = "Dashboard",
  userName = "Candidate",
}: DashboardNavbarProps) {
  const [, setLocation] = useLocation();

  const mainNavItems = [
    { label: "Dashboard", href: "/dashboard", active: true },
    { label: "My Profile", href: "/account" },
    { label: "CV Analysis", href: "/?screen=intake" },
    { label: "AI Interview", href: "/live-interview" },
    { label: "Practice", href: "/practice-setup" },
  ];

  const subNavItems = [
    { label: "Interview History", href: "/dashboard", icon: History },
    { label: "Skills & Analytics", href: "/dashboard", icon: BarChart3 },
    { label: "Saved Jobs", href: "/jobs", icon: Bookmark },
    { label: "Career Roadmap", href: "/practice-setup", icon: Compass },
    { label: "Settings", href: "/account", icon: Settings },
    { label: "Help & Support", href: "#", icon: HelpCircle },
  ];

  return (
    <header className={`w-full ${theme === "light" ? "bg-white/95 border-slate-200 text-slate-800" : "bg-[#0b0f19]/95 border-slate-800/80 text-slate-200"} backdrop-blur-md border-b sticky top-0 z-50 transition-colors duration-200`}>
      {/* Top Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            onClick={() => setLocation("/")}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="relative flex items-center justify-center size-9 rounded-xl overflow-hidden shadow-md shadow-orange-500/20 transition-transform group-hover:scale-105 border border-white/10">
              <img src="/branding/career-twin-logo.png" alt="CareerTwin AI" className="size-full object-cover" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-lg font-bold tracking-tight ${theme === "light" ? "text-slate-900" : "text-white"}`}>
                Career Twin
              </span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500 border border-orange-500/30">
                Ai
              </span>
            </div>
          </div>

          {/* Main Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-3">
            {mainNavItems.map((item) => {
              const isActive = item.active || item.label === activeTab;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setLocation(item.href)}
                  className={`relative px-3.5 py-1.5 text-xs lg:text-sm font-medium rounded-lg transition-all duration-150 ${
                    isActive
                      ? "text-white bg-[#e8442e] shadow-md shadow-orange-600/30 font-semibold"
                      : theme === "light"
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Area: Theme Toggle + User Avatar */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border ${theme === "light" ? "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200" : "border-slate-700/60 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800"} transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500/40`}
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
              aria-label="Toggle Theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                {theme === "dark" ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -45, opacity: 0, scale: 0.8 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 45, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Sun size={17} className="text-amber-400" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 45, opacity: 0, scale: 0.8 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -45, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Moon size={17} className="text-indigo-600" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Profile Avatar / Trigger */}
            <button
              type="button"
              onClick={() => setLocation("/account")}
              className={`flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl border ${theme === "light" ? "bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200" : "bg-slate-900/60 border-slate-700/60 text-slate-200 hover:border-slate-600"} transition-all text-xs`}
            >
              <div className="size-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-bold text-xs">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className={`hidden sm:inline font-medium ${theme === "light" ? "text-slate-800" : "text-slate-200"} truncate max-w-[100px]`}>
                {userName}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub Navigation Strip matching reference */}
      <div className={`border-t ${theme === "light" ? "border-slate-200 bg-slate-50/90 text-slate-600" : "border-slate-800/60 bg-[#090d16]/90 text-slate-400"} hidden md:block`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-6 overflow-x-auto py-0.5 no-scrollbar">
            {subNavItems.map((subItem) => {
              const Icon = subItem.icon;
              return (
                <button
                  key={subItem.label}
                  type="button"
                  onClick={() => setLocation(subItem.href)}
                  className="flex items-center gap-1.5 hover:text-orange-500 transition-colors whitespace-nowrap"
                >
                  <Icon size={13} className="text-slate-400 group-hover:text-orange-500" />
                  <span>{subItem.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0 pl-4">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Model Gemini Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
