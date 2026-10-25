/* Quiet Signal welcome page with cursor-tracking character hero, spring physics, and private rehearsal corridor. */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, ChevronRight, LockKeyhole, LogOut, Menu, Moon, Play, ShieldCheck, Sun, X } from "lucide-react";
import React, { useEffect, useRef, useState, type PointerEvent } from "react";
import { MouseTrackingHeroCanvas } from "./MouseTrackingHeroCanvas";
import { BRAND_LOGO_SRC, BRAND_NAME } from "@/lib/brand";

type WelcomeExperienceProps = {
  onStart: () => void;
  onNavigate: (screen: "session") => void;
  onAccountDetails: () => void;
  onLogin: () => void;
  onSignup: () => void;
  onLogout: () => void;
  authenticated: boolean;
  loading: boolean;
  userName: string;
  profileImageUrl?: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  showNavbar?: boolean;
};

const motionEase = [0.23, 1, 0.32, 1] as const;

export function openAccountDetails(closeMenu: () => void, navigate: () => void) {
  closeMenu();
  navigate();
}

export function getWelcomeNavbarHidden(
  current: number,
  previous: number,
  reducedMotion: boolean,
  menuOpen: boolean,
  profileOpen: boolean,
  atPageBottom = false
) {
  if (reducedMotion || menuOpen || profileOpen || atPageBottom || current < 104) return false;
  if (current - previous > 6) return true;
  if (previous - current > 3) return false;
  return null;
}

export function WelcomeExperience({
  onStart,
  onNavigate,
  onAccountDetails,
  onLogin,
  onSignup,
  onLogout,
  authenticated,
  loading,
  userName,
  profileImageUrl,
  theme,
  onToggleTheme,
  showNavbar = true,
}: WelcomeExperienceProps) {
  const reducedMotion = useReducedMotion();
  const queryMotionReduced = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("motion") === "reduce";
  const motionReduced = Boolean(reducedMotion) || queryMotionReduced;

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(typeof window === "undefined" ? 0 : window.scrollY);
  const [failedProfileImageUrl, setFailedProfileImageUrl] = useState<string>();

  const displayName = userName || "Your account";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "FM";

  const hasProfileImage = Boolean(profileImageUrl && profileImageUrl !== failedProfileImageUrl);
  const renderProfileAvatar = () =>
    hasProfileImage ? (
      <img src={profileImageUrl} alt="" onError={() => setFailedProfileImageUrl(profileImageUrl)} />
    ) : (
      initials
    );

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (motionReduced || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    const tiltX = ((y - 50) / 50) * -2.2;
    const tiltY = ((x - 50) / 50) * 2.8;
    event.currentTarget.style.setProperty("--ct-pointer-x", `${x}%`);
    event.currentTarget.style.setProperty("--ct-pointer-y", `${y}%`);
    event.currentTarget.style.setProperty("--ct-tilt-x", `${tiltX}deg`);
    event.currentTarget.style.setProperty("--ct-tilt-y", `${tiltY}deg`);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--ct-pointer-x", "65%");
    event.currentTarget.style.setProperty("--ct-pointer-y", "42%");
    event.currentTarget.style.setProperty("--ct-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--ct-tilt-y", "0deg");
  };

  const reveal = motionReduced
    ? {}
    : {
        initial: { opacity: 0.12 },
        whileInView: { opacity: 1 },
        viewport: { once: true, amount: 0.28 },
        transition: { duration: 0.46, ease: motionEase },
      };

  const stepReveal = (delay: number) =>
    motionReduced
      ? {}
      : {
          initial: { opacity: 0.12 },
          whileInView: { opacity: 1 },
          viewport: { once: true, amount: 0.35 },
          transition: { duration: 0.4, delay, ease: motionEase },
        };

  const navbarReveal = (delay: number) =>
    motionReduced
      ? {}
      : {
          initial: { opacity: 0, y: -10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.42, delay, ease: motionEase },
        };

  const navbarFade = (delay: number) =>
    motionReduced
      ? {}
      : {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.34, delay, ease: motionEase },
        };

  const menuIconMotion = motionReduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.12 },
      }
    : {
        initial: { opacity: 0, rotate: -18, scale: 0.82 },
        animate: { opacity: 1, rotate: 0, scale: 1 },
        exit: { opacity: 0, rotate: 18, scale: 0.82 },
        transition: { duration: 0.18, ease: motionEase },
      };

  const shouldHideNavbar = navHidden && !motionReduced && !menuOpen && !profileOpen;

  useEffect(() => {
    if (motionReduced || menuOpen || profileOpen) setNavHidden(false);
  }, [menuOpen, motionReduced, profileOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const current = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
      const scrollRoot = document.scrollingElement;
      const atPageBottom = Boolean(
        scrollRoot &&
          scrollRoot.scrollHeight > window.innerHeight &&
          current + window.innerHeight >= scrollRoot.scrollHeight - 2
      );
      const nextHidden = getWelcomeNavbarHidden(
        current,
        lastScrollY.current,
        motionReduced,
        menuOpen,
        profileOpen,
        atPageBottom
      );
      lastScrollY.current = current;
      if (nextHidden !== null) setNavHidden(nextHidden);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menuOpen, motionReduced, profileOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <main
      className={`ct-welcome ${motionReduced ? "is-reduced-motion" : ""}`}
      data-motion={motionReduced ? "reduced" : "full"}
      id="top"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Mouse Tracking Character Canvas & Warm Glow */}
      <MouseTrackingHeroCanvas reducedMotion={motionReduced} />

      <span className="ct-welcome-page-filament" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>

      <AnimatePresence initial={false}>
        {showNavbar && menuOpen && (
          <motion.button
            className="ct-welcome-menu-backdrop"
            type="button"
            aria-label="Close welcome page menu"
            initial={motionReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionReduced ? 0 : 0.18, ease: motionEase }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {showNavbar && (
        <motion.header
          className="ct-homebar ct-welcome-bar ct-welcome-bar--ember-halo"
          data-hidden={shouldHideNavbar}
          animate={shouldHideNavbar ? { y: -102, opacity: 0 } : { y: 0, opacity: 1 }}
          transition={motionReduced ? { duration: 0 } : { duration: 0.24, ease: motionEase }}
          style={{ pointerEvents: shouldHideNavbar ? "none" : "auto" }}
        >
          <motion.div className="ct-home-branding" {...navbarReveal(0.02)}>
            <button
              className="ct-home-brand"
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="FutureMaker AI homepage"
            >
              <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} />
              <span>
                FutureMaker <em>AI</em>
              </span>
            </button>
            <span className="ct-home-branding-note">Private practice</span>
          </motion.div>

          <motion.nav className="ct-home-nav" aria-label="Welcome page navigation" {...navbarFade(0.1)}>
            <a href="#experience">
              <span>Experience</span>
            </a>
            <a href="#workspace">
              <span>Workspace</span>
            </a>
            <a href="#method">
              <span>How it works</span>
            </a>
            <a href="#why">
              <span>Why FutureMaker</span>
            </a>
            <a href="#privacy">
              <span>Privacy</span>
            </a>
          </motion.nav>

          <motion.div className="ct-home-actions" {...navbarReveal(0.18)}>
            <div className="ct-home-utilities">
              <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
            </div>
            {authenticated ? (
              <>
                <div className="ct-home-control">
                  <button
                    className={`ct-profile-button ${profileOpen ? "is-open" : ""}`}
                    type="button"
                    aria-label={`Open account menu for ${displayName}`}
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                    onClick={() => setProfileOpen((open) => !open)}
                  >
                    <span className="ct-profile-avatar">{renderProfileAvatar()}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {profileOpen && (
                      <motion.div
                        className="ct-nav-popover ct-profile-popover"
                        role="menu"
                        initial={motionReduced ? false : { opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={motionReduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.985 }}
                        transition={{ duration: motionReduced ? 0 : 0.18, ease: motionEase }}
                      >
                        <div className="ct-profile-popover-head">
                          <span className="ct-profile-avatar">{renderProfileAvatar()}</span>
                          <div>
                            <strong>{displayName}</strong>
                            <small>FutureMaker member</small>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => openAccountDetails(() => setProfileOpen(false), onAccountDetails)}
                        >
                          <ShieldCheck size={15} /> Account details <ChevronRight size={14} />
                        </button>
                        <button type="button" role="menuitem" onClick={onLogout}>
                          <LogOut size={15} /> Sign out <ChevronRight size={14} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button className="ct-nav-cta" type="button" onClick={onStart}>
                  Practice <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <>
                <button className="ct-nav-login" type="button" disabled={loading} onClick={onLogin}>
                  Log in
                </button>
                <button className="ct-nav-cta" type="button" disabled={loading} onClick={onSignup}>
                  Create account <ArrowRight size={14} />
                </button>
              </>
            )}
          </motion.div>

          <motion.button
            className="ct-home-menu-button"
            type="button"
            aria-label="Open welcome page menu"
            aria-controls="ct-home-mobile-menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            {...navbarReveal(0.1)}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span className="ct-menu-icon-state" key={menuOpen ? "close" : "open"} {...menuIconMotion}>
                {menuOpen ? <X size={19} /> : <Menu size={19} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          <AnimatePresence initial={false}>
            {menuOpen && (
              <motion.nav
                className="ct-home-mobile-menu"
                id="ct-home-mobile-menu"
                aria-label="Mobile welcome page navigation"
                initial={motionReduced ? false : { opacity: 0, y: -10, scale: 0.975 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={motionReduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.985 }}
                transition={{ duration: motionReduced ? 0 : 0.22, ease: motionEase }}
              >
                <div className="ct-home-mobile-account">
                  <span className="ct-profile-avatar">
                    {authenticated ? renderProfileAvatar() : <LockKeyhole size={15} />}
                  </span>
                  <div>
                    <strong>{authenticated ? displayName : "FutureMaker account"}</strong>
                    <small>{authenticated ? "Account menu" : "Sign in to save practice"}</small>
                  </div>
                </div>
                <a href="#experience" onClick={() => setMenuOpen(false)}>
                  Experience <ChevronRight size={15} />
                </a>
                <a href="#workspace" onClick={() => setMenuOpen(false)}>
                  Workspace <ChevronRight size={15} />
                </a>
                <a href="#method" onClick={() => setMenuOpen(false)}>
                  How it works <ChevronRight size={15} />
                </a>
                <a href="#why" onClick={() => setMenuOpen(false)}>
                  Why FutureMaker <ChevronRight size={15} />
                </a>
                <a href="#privacy" onClick={() => setMenuOpen(false)}>
                  Privacy <ChevronRight size={15} />
                </a>
                <div className="ct-home-mobile-preferences">
                  <div className="ct-home-mobile-switch">
                    <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
                    <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
                  </div>
                </div>
                {authenticated ? (
                  <>
                    <button
                      className="ct-home-mobile-session"
                      type="button"
                      onClick={() => openAccountDetails(() => setMenuOpen(false), onAccountDetails)}
                    >
                      <ShieldCheck size={15} /> Account details <ChevronRight size={15} />
                    </button>
                    <button className="ct-home-mobile-session" type="button" onClick={onLogout}>
                      <LogOut size={15} /> Sign out <ChevronRight size={15} />
                    </button>
                    <button className="ct-button ct-button--full" type="button" onClick={onStart}>
                      Start practice <ArrowRight size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="ct-home-mobile-session" type="button" onClick={onLogin}>
                      <LockKeyhole size={15} /> Log in securely <ChevronRight size={15} />
                    </button>
                    <button className="ct-button ct-button--full" type="button" onClick={onSignup}>
                      Create account <ArrowRight size={16} />
                    </button>
                  </>
                )}
              </motion.nav>
            )}
          </AnimatePresence>
        </motion.header>
      )}

      {/* Hero Section with Mouse Tracking Character Completely Unobstructed */}
      <section className="ct-welcome-hero ct-hero-cursor-tracked" id="experience">
        <div className="ct-welcome-ambient" aria-hidden="true" />
        <div className="ct-welcome-grid" aria-hidden="true" />

        <motion.div
          className="ct-welcome-copy"
          initial={motionReduced ? false : { opacity: 0.12 }}
          animate={{ opacity: 1 }}
          transition={{ duration: motionReduced ? 0 : 0.46, ease: motionEase }}
        >
          <p className="ct-home-eyebrow ct-kicker">
            <span className="ct-kicker-dot" /> Adaptive AI Career Coach for Pakistani Graduates
          </p>
          <h1 className="ct-hero-title">
            Your career,<br />
            <em>mirrored.</em>
          </h1>
          <p className="ct-hero-lede">
            Make the first answer feel <strong>like yours.</strong> An AI coach that watches the job market and coaches you through serious interviews — constantly, honestly, and only on your behalf.
          </p>
          <div className="ct-welcome-actions">
            <button className="ct-button ct-button--hero" type="button" onClick={onStart}>
              Meet your coach <ArrowRight size={17} />
            </button>
            <a className="ct-home-text-link" href="#method">
              <Play size={15} /> See the three-step method
            </a>
          </div>
          <p className="ct-welcome-quiet-note">
            <ShieldCheck size={15} /> Private practice corridor • Never a hiring prediction.
          </p>
        </motion.div>

        <p className="ct-scroll-cue" aria-hidden="true">
          Scroll
        </p>
      </section>

      {/* Dedicated Rehearsal Workspace Showcase Section */}
      <motion.section className="ct-welcome-showcase ct-content-panel" id="workspace" {...reveal}>
        <div className="ct-showcase-container">
          <div className="ct-showcase-header">
            <p className="ct-home-eyebrow">
              <span /> Private Rehearsal Workspace
            </p>
            <h2>Connect your history. Practice in private.</h2>
            <p>
              Bring only the experiences and role context you want to prepare with. Nothing is prefilled, shared, or scored with generic averages.
            </p>
          </div>

          <motion.article
            className="ct-welcome-preview ct-app-surface"
            initial={motionReduced ? false : { opacity: 0.12 }}
            animate={{ opacity: 1 }}
            transition={{ duration: motionReduced ? 0 : 0.46, delay: motionReduced ? 0 : 0.08, ease: motionEase }}
            whileHover={motionReduced ? undefined : { y: -4 }}
          >
            <div className="ct-welcome-preview-top">
              <span className="ct-welcome-pulse" />
              <span>YOUR PREPARATION SPACE</span>
              <small>PRIVATE</small>
            </div>
            <div className="ct-welcome-question">
              <span>START WITH YOUR OWN MATERIAL</span>
              <h2>Bring the experience and target role you want to prepare for.</h2>
              <div className="ct-welcome-question-meta">
                <i />
                <i />
                <i />
                <strong>Nothing is prefilled</strong>
              </div>
            </div>
            <div
              className="ct-answer-mirror"
              aria-label="FutureMaker preparation workspace: connect your experience to the role you want"
            >
              <div className="ct-answer-mirror-head">
                <span>YOUR CONTEXT</span>
              </div>
              <div className="ct-answer-mirror-path">
                <span className="ct-answer-mirror-node is-start">Experience</span>
                <i aria-hidden="true" />
                <span className="ct-answer-mirror-node is-end">Target role</span>
              </div>
              <p>
                <strong>Resume or experience notes</strong>
                <span> → Role brief you choose to prepare for.</span>
              </p>
              <div className="ct-answer-mirror-lens" aria-hidden="true" />
            </div>
            <div className="ct-welcome-reveal">
              <div className="ct-welcome-reveal-card">
                <ShieldCheck size={17} />
                <p>
                  <strong>Private by default</strong> The workspace starts only with material you provide.
                </p>
                <ArrowRight size={16} />
              </div>
            </div>
            <div className="ct-welcome-preview-footer">
              <span>Your context</span>
              <span>Your role</span>
              <span>Your control</span>
            </div>
          </motion.article>
        </div>
      </motion.section>

      {/* How it works corridor */}
      <motion.section className="ct-welcome-method ct-content-panel" id="method" {...reveal}>
        <div className="ct-welcome-section-heading">
          <p className="ct-home-eyebrow">
            <span /> The method
          </p>
          <h2>Three steps between you and a decision made with real information.</h2>
          <p>
            FutureMaker turns the pressure before a first serious interview into a calm progression Pakistani graduates can repeat before the real conversation.
          </p>
        </div>
        <div className="ct-welcome-corridor">
          <motion.article
            className="ct-corridor-step ct-app-surface"
            {...stepReveal(0)}
            whileHover={motionReduced ? undefined : { y: -4 }}
          >
            <span className="ct-corridor-count">01</span>
            <div>
              <p>Bring your context</p>
              <h3>Your resume, the role, your own evidence.</h3>
              <span className="ct-corridor-reveal">
                The strongest examples come from things you can explain without performing. FutureMaker reads it once and keeps it.
              </span>
            </div>
            <ArrowRight size={18} />
          </motion.article>
          <motion.article
            className="ct-corridor-step ct-app-surface"
            {...stepReveal(0.08)}
            whileHover={motionReduced ? undefined : { y: -4 }}
          >
            <span className="ct-corridor-count">02</span>
            <div>
              <p>Make a first pass</p>
              <h3>One spoken or written answer in your own words.</h3>
              <span className="ct-corridor-reveal">
                The coach checks clarity, evidence, structure, and delivery — then gives one useful correction.
              </span>
            </div>
            <ArrowRight size={18} />
          </motion.article>
          <motion.article
            className="ct-corridor-step ct-app-surface"
            {...stepReveal(0.16)}
            whileHover={motionReduced ? undefined : { y: -4 }}
          >
            <span className="ct-corridor-count">03</span>
            <div>
              <p>Keep one improvement</p>
              <h3>Answers arrive before you ask.</h3>
              <span className="ct-corridor-reveal">
                You compare your own first try and retry, then carry one improvement into the next session.
              </span>
            </div>
            <ArrowRight size={18} />
          </motion.article>
        </div>
      </motion.section>

      {/* Editorial Quote Section */}
      <motion.section className="ct-welcome-quote ct-content-panel" id="why" {...reveal}>
        <div className="ct-quote-wrap">
          <blockquote className="ct-editorial-quote">
            Most career advice is generic because it&rsquo;s written before it knows <em>who you are.</em>
          </blockquote>
          <p className="ct-quote-attrib">
            Your coach starts from your actual history — not a persona built from averages.
          </p>
        </div>
      </motion.section>

      {/* Market Stats Grid */}
      <motion.section className="ct-welcome-stats ct-content-panel" id="stats" {...reveal}>
        <div className="ct-stats-container">
          <div className="ct-stat-item">
            <span className="ct-stat-figure">Daily</span>
            <span className="ct-stat-caption">
              Market scans run on your behalf, whether or not you open the app
            </span>
          </div>
          <div className="ct-stat-item">
            <span className="ct-stat-figure">4.2&times;</span>
            <span className="ct-stat-caption">
              More relevant openings surfaced than a saved keyword search
            </span>
          </div>
          <div className="ct-stat-item">
            <span className="ct-stat-figure">Yours</span>
            <span className="ct-stat-caption">
              Your history is never pooled, sold, or used to train a shared model
            </span>
          </div>
        </div>
      </motion.section>

      {/* Trust & Privacy Section */}
      <motion.section className="ct-welcome-trust ct-content-panel" id="privacy" {...reveal}>
        <div className="ct-welcome-trust-copy">
          <p className="ct-home-eyebrow">
            <span /> Built for the pressure before your first interview
          </p>
          <h2>It listens before it advises.</h2>
          <p>
            Interview, communication, technical, and IELTS signals come together around the answer in front of you — not a generic productivity score or hiring prediction.
          </p>
          <div className="ct-welcome-signal-list">
            <span>
              <Check size={15} /> Role-aware practice
            </span>
            <span>
              <Check size={15} /> One clear recommendation
            </span>
            <span>
              <Check size={15} /> Your session, your control
            </span>
          </div>
          <button className="ct-button ct-button--secondary" type="button" onClick={() => onNavigate("session")}>
            How privacy works <ArrowRight size={16} />
          </button>
        </div>
        <aside
          className="ct-welcome-trust-card ct-welcome-trust-card--recreated ct-app-surface"
          aria-label="Private preparation foundation"
        >
          <div className="ct-trust-card-head">
            <div>
              <span className="ct-welcome-card-kicker">Private preparation foundation</span>
              <strong>Your context stays yours.</strong>
            </div>
            <span className="ct-trust-card-status">
              <ShieldCheck size={14} /> Private
            </span>
          </div>
          <div className="ct-trust-ledger">
            <div className="ct-trust-ledger-item">
              <small>WHAT YOU BRING</small>
              <strong>Experience</strong>
              <p>Projects, strengths, and history you choose to share.</p>
            </div>
            <div className="ct-trust-ledger-connector" aria-hidden="true">
              <i />
              <span>
                <b>Your focus</b>
                <small>role</small>
              </span>
              <i />
            </div>
            <div className="ct-trust-ledger-item is-role">
              <small>WHAT YOU PREPARE FOR</small>
              <strong>Target role</strong>
              <p>The opportunity and skills you want to explore.</p>
            </div>
          </div>
          <div className="ct-trust-ownership">
            <ShieldCheck size={16} />
            <p>
              <strong>Under your control.</strong> Add only the material you want in the current preparation session.
            </p>
          </div>
          <div className="ct-welcome-tags">
            <span>Resume</span>
            <span>Role focus</span>
            <span>Practice</span>
            <span>Privacy</span>
          </div>
          <div className="ct-welcome-card-footer">
            <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} />
            <span>FutureMaker AI workspace</span>
          </div>
        </aside>
      </motion.section>

      {/* Closing CTA Panel */}
      <motion.section
        className="ct-welcome-final ct-app-surface"
        {...reveal}
        whileHover={motionReduced ? undefined : { y: -4 }}
      >
        <div className="ct-welcome-final-ambient" aria-hidden="true" />
        <p className="ct-home-eyebrow">
          <span /> Your next answer starts here
        </p>
        <h2>Stop guessing what your next move should be.</h2>
        <p>
          Two minutes to set up. Walk in calmer, keep the story honest, and let FutureMaker do the watching from there.
        </p>
        <div>
          <button className="ct-button ct-button--hero" type="button" onClick={onStart}>
            Start practice <ArrowRight size={17} />
          </button>
          <button className="ct-button ct-button--secondary" type="button" onClick={() => onNavigate("session")}>
            Privacy &amp; data <ShieldCheck size={16} />
          </button>
        </div>
      </motion.section>

      <footer className="ct-home-footer">
        <button
          className="ct-home-brand"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} />
          <span>
            FutureMaker <em>AI</em>
          </span>
        </button>
        <p>Adaptive career practice &amp; market intelligence for the moments that matter.</p>
        <button className="ct-home-footer-link" type="button" onClick={() => onNavigate("session")}>
          Privacy &amp; session data
        </button>
      </footer>
    </main>
  );
}

function ThemeSwitch({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  const isDark = theme === "dark";
  const shouldReduceMotion = useReducedMotion();
  const iconMotion = shouldReduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : {
        initial: { opacity: 0, rotate: -26, scale: 0.78 },
        animate: { opacity: 1, rotate: 0, scale: 1 },
        exit: { opacity: 0, rotate: 26, scale: 0.78 },
        transition: { duration: 0.2, ease: motionEase },
      };

  return (
    <button
      className={`ct-theme-switch ${isDark ? "is-dark" : ""}`}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={onToggle}
    >
      <span className="ct-theme-switch-knob">
        <AnimatePresence initial={false} mode="wait">
          <motion.span className="ct-theme-switch-state" key={isDark ? "dark" : "light"} {...iconMotion}>
            {isDark ? <Moon size={13} /> : <Sun size={13} />}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="ct-theme-switch-icon" aria-hidden="true">
        {isDark ? <Sun size={12} /> : <Moon size={12} />}
      </span>
    </button>
  );
}
