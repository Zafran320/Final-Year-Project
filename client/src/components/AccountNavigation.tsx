import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronRight, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

export type AccountNavDestination = "home" | "dashboard" | "account" | "jobs" | "privacy" | "practice";

export type AccountNavigationProps = {
  userName?: string;
  profileImageUrl?: string;
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
  onNavigate?: (destination: AccountNavDestination) => void;
  onSignOut?: () => void | Promise<void>;
  onProfileClick?: () => void;
  activeDestination?: AccountNavDestination;
  authenticated?: boolean;
  loading?: boolean;
  onStart?: () => void;
  onLogin?: () => void;
  onSignup?: () => void;
};

export function getScrollNavbarHidden(
  current: number,
  previous: number,
  reducedMotion: boolean,
  menuOpen: boolean,
  atPageBottom = false
) {
  if (reducedMotion || menuOpen || atPageBottom || current < 104) return false;
  if (current - previous > 6) return true;
  if (previous - current > 3) return false;
  return null;
}

export function AccountNavigation({
  userName,
  profileImageUrl,
  theme: propTheme,
  onToggleTheme: propToggleTheme,
  onNavigate,
  onSignOut,
  onProfileClick,
  activeDestination,
  authenticated,
  loading = false,
  onStart,
  onLogin,
  onSignup,
}: AccountNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isStuck, setIsStuck] = useState(false);
  const reducedMotion = useReducedMotion();

  const isAuth =
    authenticated !== undefined
      ? Boolean(authenticated)
      : Boolean(userName && userName.trim() !== "" && userName !== "Your account" && userName !== "Account");

  // Safely attempt useTheme in case called outside ThemeProvider
  let themeFromContext: { theme: "light" | "dark"; toggleTheme?: () => void } | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    themeFromContext = useTheme();
  } catch {
    // Fallback when outside ThemeProvider
  }

  const currentTheme = propTheme || themeFromContext?.theme || "dark";
  const handleToggleTheme = propToggleTheme || themeFromContext?.toggleTheme;

  // Infer location if activeDestination is omitted
  let location = "/";
  let setLocation: ((to: string) => void) | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [loc, setLoc] = useLocation();
    location = loc;
    setLocation = setLoc;
  } catch {
    // Fallback
  }

  let activeDest = activeDestination;
  if (!activeDest) {
    if (location === "/" || location === "") activeDest = "home";
    else if (location.startsWith("/jobs")) activeDest = "jobs";
    else if (location.startsWith("/dashboard") || location.startsWith("/interview-dashboard")) activeDest = "dashboard";
    else if (location.startsWith("/account")) activeDest = "account";
    else if (location.startsWith("/practice")) activeDest = "practice";
    else activeDest = "home";
  }

  const displayName = userName?.trim() || "Account";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      setIsStuck(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen || typeof window === "undefined") return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileOpen]);

  const handleNavigate = (destination: AccountNavDestination) => {
    setMobileOpen(false);
    if (destination === "home" && (activeDest === "home" || (typeof window !== "undefined" && window.location.pathname === "/"))) {
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (onNavigate) {
      onNavigate(destination);
    } else if (setLocation) {
      if (destination === "home") setLocation("/");
      else if (destination === "jobs") setLocation("/jobs");
      else if (destination === "dashboard") setLocation("/dashboard");
      else if (destination === "account") setLocation("/account");
      else if (destination === "practice") {
        if (onStart) onStart();
        else setLocation("/practice-setup");
      } else if (destination === "privacy") {
        setLocation("/account?tab=privacy");
      }
    }
  };

  const handleSignOut = async () => {
    setMobileOpen(false);
    if (onSignOut) {
      await onSignOut();
    }
  };

  const handlePracticeClick = () => {
    setMobileOpen(false);
    if (onStart) {
      onStart();
    } else {
      handleNavigate("practice");
    }
  };

  const handleAccountClick = () => {
    setMobileOpen(false);
    if (onProfileClick) {
      onProfileClick();
    } else {
      handleNavigate("account");
    }
  };

  const handleLoginClick = () => {
    setMobileOpen(false);
    if (onLogin) {
      onLogin();
    } else if (setLocation) {
      setLocation("/login");
    }
  };

  const handleSignupClick = () => {
    setMobileOpen(false);
    if (onSignup) {
      onSignup();
    } else if (setLocation) {
      setLocation("/signup");
    }
  };

  const renderThemeToggle = () => (
    <motion.button
      className="ref-topnav__theme"
      type="button"
      onClick={handleToggleTheme}
      disabled={!handleToggleTheme}
      aria-label={`Switch to ${currentTheme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${currentTheme === "dark" ? "light" : "dark"} theme`}
      whileHover={reducedMotion ? undefined : { scale: 1.08 }}
      whileTap={reducedMotion ? undefined : { scale: 0.92 }}
    >
      <AnimatePresence initial={false} mode="wait">
        {currentTheme === "dark" ? (
          <motion.span
            key="theme-moon"
            className="ref-topnav__theme-icon-wrap"
            initial={reducedMotion ? false : { rotate: -60, scale: 0.35, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={reducedMotion ? undefined : { rotate: 60, scale: 0.35, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <Moon size={16} className="ref-theme-moon" />
          </motion.span>
        ) : (
          <motion.span
            key="theme-sun"
            className="ref-topnav__theme-icon-wrap"
            initial={reducedMotion ? false : { rotate: -90, scale: 0.35, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={reducedMotion ? undefined : { rotate: 90, scale: 0.35, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <Sun size={16} className="ref-theme-sun" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );

  return (
    <>
      <header
        className={`ref-topbar ${isStuck ? "is-stuck" : ""}`}
        data-testid="universal-navbar"
      >
        {/* Brand */}
        <button
          className="ref-brand"
          type="button"
          onClick={() => handleNavigate("home")}
          aria-label="Return to CareerTwin homepage"
        >
          <span className="ref-brand__logo-wrap">
            <img
              src="/branding/career-twin-logo.png"
              alt="CareerTwin AI"
              className="ref-brand__logo"
            />
          </span>
          <span>CareerTwin</span>
          <span className="ref-brand__ai">AI</span>
        </button>

        {/* Desktop Navigation in requested exact order:
            Home -> Job Radar -> Dashboard -> Account (Logo + Name) -> Toggle -> Practice -> Sign out */}
        <nav className="ref-topnav" aria-label="Main navigation">
          {isAuth ? (
            <>
              {/* 1. Home */}
              <button
                className={`ref-topnav__link ${activeDest === "home" ? "is-active" : ""}`}
                type="button"
                onClick={() => handleNavigate("home")}
                aria-current={activeDest === "home" ? "page" : undefined}
              >
                Home
              </button>

              {/* 2. Job Radar */}
              <button
                className={`ref-topnav__link ${activeDest === "jobs" ? "is-active" : ""}`}
                type="button"
                onClick={() => handleNavigate("jobs")}
                aria-current={activeDest === "jobs" ? "page" : undefined}
              >
                Job Radar
              </button>

              {/* 3. Dashboard */}
              <button
                className={`ref-topnav__link ${activeDest === "dashboard" ? "is-active" : ""}`}
                type="button"
                onClick={() => handleNavigate("dashboard")}
                aria-current={activeDest === "dashboard" ? "page" : undefined}
              >
                Dashboard
              </button>

              {/* 4. Practice */}
              <button
                className={`ref-topnav__cta ${activeDest === "practice" ? "is-active" : ""}`}
                type="button"
                onClick={handlePracticeClick}
                aria-current={activeDest === "practice" ? "page" : undefined}
              >
                <span>Practice</span>
                <ArrowRight size={14} />
              </button>

              {/* 5. Account */}
              <button
                className={`ref-topnav__account ${activeDest === "account" ? "is-active" : ""}`}
                type="button"
                onClick={handleAccountClick}
                aria-current={activeDest === "account" ? "page" : undefined}
              >
                <span className="ref-topnav__avatar" aria-hidden="true">
                  <img
                    src={profileImageUrl || "/branding/career-twin-logo.png"}
                    alt=""
                    className="ref-topnav__avatar-img"
                  />
                </span>
                <span className="ref-topnav__name">{displayName}</span>
                {displayName !== "Account" && <span className="sr-only">Account</span>}
                <img
                  src="/branding/career-twin-logo.png"
                  alt="CareerTwin AI"
                  className="ref-topnav__account-logo"
                  aria-hidden="true"
                />
              </button>

              {/* 6. Sign out */}
              {onSignOut && (
                <button
                  className="ref-topnav__signout"
                  type="button"
                  onClick={() => void handleSignOut()}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              )}

              {/* 7. Theme Toggle */}
              {renderThemeToggle()}
            </>
          ) : (
            <>
              {/* Unauthenticated view */}
              <button
                className={`ref-topnav__link ${activeDest === "home" ? "is-active" : ""}`}
                type="button"
                onClick={() => handleNavigate("home")}
                aria-current={activeDest === "home" ? "page" : undefined}
              >
                Home
              </button>
              <button
                className={`ref-topnav__link ${activeDest === "jobs" ? "is-active" : ""}`}
                type="button"
                onClick={() => handleNavigate("jobs")}
                aria-current={activeDest === "jobs" ? "page" : undefined}
              >
                Job Radar
              </button>
              {loading ? (
                <span style={{ fontSize: "0.88rem", opacity: 0.6 }}>Loading...</span>
              ) : (
                <>
                  <button
                    className="ref-topnav__login"
                    type="button"
                    onClick={handleLoginClick}
                  >
                    Log in
                  </button>
                  <button
                    className="ref-topnav__cta"
                    type="button"
                    onClick={handleSignupClick}
                  >
                    <span>Get started</span>
                    <ArrowRight size={14} />
                  </button>
                </>
              )}
              {/* Theme Toggle */}
              {renderThemeToggle()}
            </>
          )}

          {/* Mobile Hamburger Button */}
          <button
            className="ref-topnav__mobile-toggle"
            type="button"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="ref-mobile-drawer"
            initial={reducedMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {isAuth ? (
              <>
                <button
                  className={`ref-topnav__link ${activeDest === "home" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => handleNavigate("home")}
                >
                  <span>Home</span>
                  <ChevronRight size={15} />
                </button>
                <button
                  className={`ref-topnav__link ${activeDest === "jobs" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => handleNavigate("jobs")}
                >
                  <span>Job Radar</span>
                  <ChevronRight size={15} />
                </button>
                <button
                  className={`ref-topnav__link ${activeDest === "dashboard" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => handleNavigate("dashboard")}
                >
                  <span>Dashboard</span>
                  <ChevronRight size={15} />
                </button>
                <button
                  className={`ref-topnav__link ${activeDest === "account" ? "is-active" : ""}`}
                  type="button"
                  onClick={handleAccountClick}
                >
                  <span>Account</span>
                  <ChevronRight size={15} />
                </button>

                <div className="ref-topnav__theme-row">
                  <span>Theme ({currentTheme === "dark" ? "Dark" : "Light"})</span>
                  {renderThemeToggle()}
                </div>

                <button
                  className={`ref-topnav__cta ${activeDest === "practice" ? "is-active" : ""}`}
                  type="button"
                  onClick={handlePracticeClick}
                >
                  <span>Practice</span>
                  <ArrowRight size={14} />
                </button>

                {onSignOut && (
                  <button
                    className="ref-topnav__signout"
                    type="button"
                    onClick={() => void handleSignOut()}
                  >
                    <LogOut size={14} />
                    <span>Sign out</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  className={`ref-topnav__link ${activeDest === "home" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => handleNavigate("home")}
                >
                  <span>Home</span>
                  <ChevronRight size={15} />
                </button>
                <button
                  className={`ref-topnav__link ${activeDest === "jobs" ? "is-active" : ""}`}
                  type="button"
                  onClick={() => handleNavigate("jobs")}
                >
                  <span>Job Radar</span>
                  <ChevronRight size={15} />
                </button>
                <div className="ref-topnav__theme-row">
                  <span>Theme ({currentTheme === "dark" ? "Dark" : "Light"})</span>
                  {renderThemeToggle()}
                </div>
                <button
                  className="ref-topnav__login"
                  type="button"
                  onClick={handleLoginClick}
                >
                  Log in
                </button>
                <button
                  className="ref-topnav__cta"
                  type="button"
                  onClick={handleSignupClick}
                >
                  <span>Get started</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
