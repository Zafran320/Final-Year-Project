/**
 * HomePage — Enhanced FutureMaker AI homepage
 *
 * Combines the interactive cursor-tracking character canvas (room + 3D Aiden sprite sweep + warm pointer glow)
 * with the authentic production capabilities and metrics from the presentation:
 * - Multimodal Gemini Live 2.5 Voice Engine (sub-500ms bidirectional speech-to-speech)
 * - In-Browser 60 FPS MediaPipe Computer Vision Proctoring
 * - 4-Dimensional Adaptive ML Assessment Matrix (STAR scoring, cross-stage memory)
 * - Pakistan Job Radar & Market Intelligence (Karachi, Lahore, Islamabad salary benchmarks)
 * - Bilingual Roman Urdu & English code-switching normalization
 * - Instant Practice and Live Interview launch triggers
 */

import React, { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import {
  Award,
  Building2,
  Compass,
  FileText,
  FileUp,
  Lock,
  LogOut,
  Mic,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  UserPlus,
  Video,
  Zap,
} from "lucide-react";
import { MouseTrackingHeroCanvas } from "./MouseTrackingHeroCanvas";
import { AccountNavigation, type AccountNavDestination } from "./AccountNavigation";
import { useTheme } from "@/contexts/ThemeContext";

export interface HomePageProps {
  onStart: () => void;
  onLogin: () => void;
  onSignup: () => void;
  authenticated: boolean;
  loading: boolean;
  userName?: string;
  onNavigate?: (destination: AccountNavDestination) => void;
  onSignOut?: () => void;
  onLiveInterview?: () => void;
}

export function HomePage({
  onStart,
  onLogin,
  onSignup,
  authenticated,
  loading,
  userName,
  onNavigate,
  onSignOut,
  onLiveInterview,
}: HomePageProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const mainRef = useRef<HTMLDivElement | null>(null);

  /* Scroll-reveal observer */
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const reveals = main.querySelectorAll(".reveal");
    if (!reveals.length) return;

    if (reducedMotion || !("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );

    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div className={`ref-site ${reducedMotion ? "is-reduced-motion" : ""}`}>
      {/* ── Universal Sticky Top Bar ── */}
      <AccountNavigation
        userName={userName}
        authenticated={authenticated}
        loading={loading}
        onStart={onStart}
        onLogin={onLogin}
        onSignup={onSignup}
        onSignOut={onSignOut}
        onNavigate={onNavigate}
        activeDestination="home"
      />

      {/* ── Main Content Area ── */}
      <main ref={mainRef}>
        {/* ── Hero Section (Canvas + Transparent Glass Content at bottom-left) ── */}
        <section className="ref-hero" id="ref-hero">
          <MouseTrackingHeroCanvas reducedMotion={reducedMotion} />

          <div className={`ref-hero__inner ${reducedMotion ? "is-reduced" : ""}`}>
            <h1 className="ref-hero-title">
              <span>Future</span><span className="ref-hero-title__accent">Maker</span> <span className="ref-hero-title__sub">AI</span>
            </h1>

            <p className="ref-lede">
              Pakistan&rsquo;s first <strong className="ref-highlight">autonomous AI career coach</strong> and multimodal
              interview simulator &mdash; powered by FutureMaker AI, with real-time voice, computer vision proctoring,
              and adaptive ML assessment.
            </p>

            <div className="ref-pill-tags">
              <span className="ref-pill-tag ref-pill-tag--ember">🎙️ FutureMaker Realtime Voice</span>
              <span className="ref-pill-tag ref-pill-tag--cyan">👁️ MediaPipe Vision</span>
              <span className="ref-pill-tag ref-pill-tag--violet">📊 Adaptive ML Rubric</span>
              <span className="ref-pill-tag ref-pill-tag--green">🇵🇰 Roman Urdu Native</span>
              <span className="ref-pill-tag ref-pill-tag--amber">💼 ATS Resume Engine</span>
            </div>

            <div className="ref-actions">
              <button className="ref-btn" type="button" onClick={onStart}>
                Meet your coach
              </button>
              <button
                className="ref-btn ref-btn--ghost"
                type="button"
                onClick={onLiveInterview || onStart}
              >
                <Mic size={15} />
                Live Voice Interview
              </button>
              <a className="ref-link" href="#ref-how-it-works">
                See how it works &rarr;
              </a>
            </div>
          </div>
        </section>

        {/* ── Unified Fixed Background for all sections below Hero ── */}
        <div className="ref-lower-sections" id="ref-lower-sections">
          <div className="ref-lower-bg" aria-hidden="true" />
          <div className="ref-lower-content">
            {/* ── How to Use FutureMaker AI ── */}
            <section className="ref-panel" id="ref-how-it-works">
              <div className="ref-wrap">
                <div className="ref-head ref-head--center reveal">
              <span className="ref-section-badge">Simple 5-Step Journey</span>
              <h2>How to Use <span className="ref-title-gradient">FutureMaker AI</span></h2>
              <p className="ref-head__sub">
                Follow these simple steps to set up your profile, upload your resume, target any custom company or Job Radar opening, and practice live with Aiden.
              </p>
            </div>

            <div className="ref-steps-grid reveal">
              {/* Step 01 */}
              <article className="ref-step-card">
                <div className="ref-step-top">
                  <div className="ref-step-num-badge">
                    <span className="ref-step-num">01</span>
                    <span className="ref-tag ref-tag--orange">Initial Setup</span>
                  </div>
                  <div className="ref-step-icon-wrap">
                    <UserPlus size={19} />
                  </div>
                </div>
                <h3>1. Create Your Account</h3>
                <p>
                  Click &ldquo;Get started&rdquo; to sign up for your private candidate workspace. Everything is 100% confidential with encrypted authentication and zero data pooling.
                </p>
                <div className="ref-step-footer">
                  <span className="ref-step-tag ref-step-tag--ember">🔒 30-Sec Fast Signup</span>
                </div>
              </article>

              {/* Step 02 */}
              <article className="ref-step-card">
                <div className="ref-step-top">
                  <div className="ref-step-num-badge">
                    <span className="ref-step-num">02</span>
                    <span className="ref-tag ref-tag--cyan">Profile Intelligence</span>
                  </div>
                  <div className="ref-step-icon-wrap">
                    <FileUp size={19} />
                  </div>
                </div>
                <h3>2. Head to Account &amp; Upload CV</h3>
                <p>
                  Go to your Account section and upload your resume (PDF or DOCX). Our ATS intelligence automatically parses 25+ fields to build your tailored FutureMaker profile.
                </p>
                <div className="ref-step-footer">
                  <span className="ref-step-tag ref-step-tag--cyan">📄 PDF / DOCX Parsing</span>
                  <span className="ref-step-tag">25+ Fields</span>
                </div>
              </article>

              {/* Step 03 - Custom Company or Radar */}
              <article className="ref-step-card">
                <div className="ref-step-top">
                  <div className="ref-step-num-badge">
                    <span className="ref-step-num">03</span>
                    <span className="ref-tag ref-tag--green">Custom Company &amp; Radar</span>
                  </div>
                  <div className="ref-step-icon-wrap">
                    <Building2 size={19} />
                  </div>
                </div>
                <h3>3. Add Any Company Data or Pick from Radar</h3>
                <p>
                  Target <strong>any company of your choice</strong>! Add your target company name, paste custom Job Descriptions (JDs), or specify exact interview requirements &mdash; or pick verified Pakistan tech vacancies in Karachi, Lahore, and Islamabad directly from our live Job Radar.
                </p>
                <div className="ref-step-card__feature-box">
                  <div className="ref-step-card__feature-title">
                    <Building2 size={13} />
                    <span>Custom Company Intake</span>
                  </div>
                  <p className="ref-step-card__feature-text">
                    Target any employer: Google, Systems Ltd, Arbisoft, Remotebase, or your target startup &bull; Paste custom JD text for instant question synthesis
                  </p>
                </div>
                <div className="ref-step-footer">
                  <span className="ref-step-tag ref-step-tag--green">🏢 Custom Company Data</span>
                  <span className="ref-step-tag">📋 Paste Any JD</span>
                  <span className="ref-step-tag">🎯 Job Radar</span>
                </div>
              </article>

              {/* Step 04 - Featured Card */}
              <article className="ref-step-card ref-step-card--featured">
                <div className="ref-step-top">
                  <div className="ref-step-num-badge">
                    <span className="ref-step-num">04</span>
                    <span className="ref-tag ref-tag--orange">Core Multimodal Simulation</span>
                  </div>
                  <div className="ref-step-icon-wrap">
                    <Mic size={20} />
                  </div>
                </div>
                <h3>4. Launch Live Voice &amp; Vision Mock Interview</h3>
                <p>
                  Practice technical and behavioural questions directly with Aiden. Speak naturally in English or Roman Urdu with sub-500ms voice latency. Client-side MediaPipe vision coaches your gaze and posture with zero camera data saved.
                </p>
                <div className="ref-card-hud">
                  <div className="ref-soundwave">
                    <span /><span /><span /><span /><span />
                  </div>
                  <span className="ref-hud-text">Active Simulation Engine: 24kHz AudioWorklet &bull; RFC-6455 Bidirectional WebSocket</span>
                </div>
                <div className="ref-step-footer">
                  <span className="ref-step-tag ref-step-tag--ember">🎙️ Realtime Voice Engine</span>
                  <span className="ref-step-tag ref-step-tag--cyan">👁️ 60 FPS MediaPipe Vision</span>
                  <span className="ref-step-tag ref-step-tag--green">🇵🇰 Roman Urdu Native</span>
                </div>
              </article>

              {/* Step 05 */}
              <article className="ref-step-card">
                <div className="ref-step-top">
                  <div className="ref-step-num-badge">
                    <span className="ref-step-num">05</span>
                    <span className="ref-tag ref-tag--violet">Instant Analytics</span>
                  </div>
                  <div className="ref-step-icon-wrap">
                    <Award size={19} />
                  </div>
                </div>
                <h3>5. Review 4D Rubric &amp; Action Plan</h3>
                <p>
                  Get immediate objective evaluation across Technical Depth, STAR Structure, Relevance, and Communication. Review model benchmark answers and follow your study plan.
                </p>
                <div className="ref-step-footer">
                  <span className="ref-step-tag ref-step-tag--violet">📊 Instant STAR Scorecard</span>
                </div>
              </article>
            </div>

            {/* Quick Action Strip */}
            <div className="ref-steps-cta-banner reveal">
              <div className="ref-steps-cta-info">
                <strong>Ready to practice your first question?</strong>
                <span>Setup takes under 2 minutes. Start by creating your account or signing in.</span>
              </div>
              <div className="ref-actions">
                <button className="ref-btn" type="button" onClick={authenticated ? onStart : onSignup}>
                  {authenticated ? "Go to workspace" : "Create your account &rarr;"}
                </button>
                {!authenticated && (
                  <button className="ref-btn ref-btn--ghost" type="button" onClick={onLogin}>
                    Log in to existing account
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── The 4-Pillar Architecture ── */}
        <section className="ref-panel" id="ref-pillars">
          <div className="ref-wrap">
            <div className="ref-head ref-head--center reveal">
              <span className="ref-section-badge">Core Engine</span>
              <h2>The 4-Pillar <span className="ref-title-gradient">Architecture</span></h2>
              <p className="ref-head__sub">
                Engineered from the ground up for competitive technical and behavioural hiring in Pakistan and global tech.
              </p>
            </div>

            <div className="ref-card-grid reveal">
              {/* Pillar 01 */}
              <article className="ref-card">
                <div className="ref-card__top">
                  <span className="ref-card__num">01</span>
                  <span className="ref-tag ref-tag--orange">Sub-500ms Voice</span>
                </div>
                <h3>Multimodal FutureMaker Voice Engine</h3>
                <p>
                  RFC-6455 bidirectional WebSocket streaming directly to FutureMaker Multimodal Voice Architecture with Aiden Neural Voice.
                  Browser-native 16kHz AudioWorklet capture and 24kHz PCM gapless playback with soft gain-ramp interruption.
                </p>
                <div className="ref-card-hud">
                  <div className="ref-soundwave">
                    <span /><span /><span /><span /><span />
                  </div>
                  <span className="ref-hud-text">Streaming Latency: ~340ms &bull; Gapless 24kHz PCM</span>
                </div>
                <div className="ref-tags">
                  <span className="ref-tag">24kHz AudioWorklet</span>
                  <span className="ref-tag">Natural Barge-in</span>
                  <span className="ref-tag">Dual Live Captions</span>
                </div>
              </article>

              {/* Pillar 02 */}
              <article className="ref-card">
                <div className="ref-card__top">
                  <span className="ref-card__num">02</span>
                  <span className="ref-tag ref-tag--cyan">60 FPS WebAssembly</span>
                </div>
                <h3>In-Browser MediaPipe Vision</h3>
                <p>
                  Real-time iris gaze tracking, head orientation, and posture stability coaching evaluated directly on your device
                  at 60 FPS. Zero server round-trips &mdash; pure client-side WebAssembly inference for complete candidate privacy.
                </p>
                <div className="ref-card-hud ref-card-hud--cyan">
                  <Video size={13} />
                  <span className="ref-hud-text">Iris Vector: Locked (98%) &bull; 60 FPS Client WASM</span>
                </div>
                <div className="ref-tags">
                  <span className="ref-tag">FaceLandmarker WASM</span>
                  <span className="ref-tag">Eye Contact Vector</span>
                  <span className="ref-tag">100% Client-Side</span>
                </div>
              </article>

              {/* Pillar 03 */}
              <article className="ref-card">
                <div className="ref-card__top">
                  <span className="ref-card__num">03</span>
                  <span className="ref-tag ref-tag--green">Adaptive ML Rubric</span>
                </div>
                <h3>4-Dimensional Assessment Matrix</h3>
                <p>
                  Every answer is graded in under 1 second across Relevance, Technical Depth, Communication Clarity, and Behavioral Poise.
                  Dynamic reinforcement escalates difficulty on STRONG answers and offers guided hints on WEAK answers.
                </p>
                <div className="ref-rubric-mini-grid">
                  <div className="ref-rubric-row">
                    <div className="ref-rubric-label"><span>Technical Depth</span><span>94%</span></div>
                    <div className="ref-rubric-track"><div className="ref-rubric-bar ref-rubric-bar--ember" style={{ width: '94%' }} /></div>
                  </div>
                  <div className="ref-rubric-row">
                    <div className="ref-rubric-label"><span>STAR Structure</span><span>92%</span></div>
                    <div className="ref-rubric-track"><div className="ref-rubric-bar ref-rubric-bar--cyan" style={{ width: '92%' }} /></div>
                  </div>
                  <div className="ref-rubric-row">
                    <div className="ref-rubric-label"><span>Relevance</span><span>96%</span></div>
                    <div className="ref-rubric-track"><div className="ref-rubric-bar ref-rubric-bar--green" style={{ width: '96%' }} /></div>
                  </div>
                  <div className="ref-rubric-row">
                    <div className="ref-rubric-label"><span>Communication</span><span>91%</span></div>
                    <div className="ref-rubric-track"><div className="ref-rubric-bar ref-rubric-bar--violet" style={{ width: '91%' }} /></div>
                  </div>
                </div>
                <div className="ref-tags">
                  <span className="ref-tag">Instant STAR Scoring</span>
                  <span className="ref-tag">Cross-Stage Memory</span>
                  <span className="ref-tag">Model Benchmarks</span>
                </div>
              </article>

              {/* Pillar 04 */}
              <article className="ref-card">
                <div className="ref-card__top">
                  <span className="ref-card__num">04</span>
                  <span className="ref-tag ref-tag--violet">Resume Intelligence</span>
                </div>
                <h3>ATS Resume &amp; Company Dossiers</h3>
                <p>
                  Multi-format parsing (PDF, DOCX) extracting 25+ career fields. Cross-examines claimed skills in live dialogue
                  and compiles preparation briefs for Systems Ltd, Arbisoft, 10Pearls, Netsol, Jazz, and HBL.
                </p>
                <div className="ref-dossier-row">
                  <span className="ref-dossier-pill">Systems Ltd <small>96% match</small></span>
                  <span className="ref-dossier-pill">10Pearls <small>94% match</small></span>
                  <span className="ref-dossier-pill">Arbisoft <small>92% match</small></span>
                  <span className="ref-dossier-pill">Netsol <small>90% match</small></span>
                </div>
                <div className="ref-tags">
                  <span className="ref-tag">25+ Structured Fields</span>
                  <span className="ref-tag">Live CV Verification</span>
                  <span className="ref-tag">Company Dossiers</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── Bilingual Roman Urdu & Emerging Market Reality ── */}
        <section className="ref-panel" id="ref-bilingual">
          <div className="ref-wrap">
            <div className="ref-split-grid">
              <div className="ref-split-col reveal">
                <span className="ref-section-badge ref-section-badge--green">Emerging Market Reality</span>
                <h2 className="ref-split-title">
                  Traditional AI breaks on <span className="ref-title-gradient--amber">Pakistani speech</span> &mdash; human coaches charge <em>$250/hr.</em>
                </h2>
                <p className="ref-split-desc">
                  FutureMaker AI is purpose-built for Pakistani students and professionals. It natively understands Roman Urdu phonetics,
                  technical Pakistani colloquialisms, and spontaneous code-switching between English and Urdu without requiring manual toggles.
                </p>
                <div className="ref-chips-row">
                  <span className="ref-chip">🇵🇰 Roman Urdu Native</span>
                  <span className="ref-chip">🇬🇧 Technical English</span>
                  <span className="ref-chip">🔄 Seamless Code-Switching</span>
                  <span className="ref-chip">📍 Karachi</span>
                  <span className="ref-chip">📍 Lahore</span>
                  <span className="ref-chip">📍 Islamabad</span>
                  <span className="ref-chip">🌐 Remote Global</span>
                </div>
              </div>

              <div className="ref-dialogue-card reveal">
                <div className="ref-dialogue-card__header">
                  <div className="ref-dialogue-badge">
                    <span className="ref-dialogue-dot" />
                    <span>Live Code-Switching Simulation</span>
                  </div>
                  <span className="ref-dialogue-tag">Roman Urdu &harr; Technical English</span>
                </div>
                <div className="ref-dialogue-body">
                  <div className="ref-chat-msg">
                    <div className="ref-chat-avatar">You</div>
                    <div className="ref-chat-bubble">
                      <p>&ldquo;Sir, maine microservices architecture per kaam kiya tha aur Redis caching integrate ki thi latency reduce karne k liye.&rdquo;</p>
                      <span className="ref-chat-meta">Roman Urdu NLP (96% Confidence) &bull; Code-Switching</span>
                    </div>
                  </div>
                  <div className="ref-chat-msg">
                    <div className="ref-chat-avatar ref-chat-avatar--aiden">Aiden</div>
                    <div className="ref-chat-bubble ref-chat-bubble--twin">
                      <p>&ldquo;Zabardast! Walk me through how you handled cache invalidation when data updated, and what TTL strategy you implemented?&rdquo;</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <div className="ref-soundwave">
                          <span /><span /><span /><span /><span />
                        </div>
                        <span className="ref-chat-meta">Aiden Neural Voice (24kHz) &bull; Sub-500ms Response</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pakistan Job Radar & Market Intelligence ── */}
        <section className="ref-panel" id="ref-radar">
          <div className="ref-wrap">
            <div className="ref-head ref-head--center reveal">
              <span className="ref-section-badge ref-section-badge--cyan">Market Intelligence</span>
              <h2>Pakistan Job Radar &amp; <span className="ref-title-gradient--cyan">Geospatial Intelligence</span></h2>
              <p className="ref-head__sub">
                Live scrapers across global and local boards, city cluster salary bands, and instant tailored mock interview launches.
              </p>
            </div>

            <div className="ref-card-grid ref-card-grid--3 reveal">
              <article className="ref-card">
                <div className="ref-card__top">
                  <span className="ref-card__num">01</span>
                  <span className="ref-tag ref-tag--cyan">6 Scrapers</span>
                </div>
                <h3>Multi-Source Live Scrapers</h3>
                <p>
                  Automated ingestion engines fetch verified engineering and product openings from Arbeitnow, Jobicy, RemoteOK, Remotive, We Work Remotely, and The Muse in real time.
                </p>
                <div className="ref-card-hud ref-card-hud--cyan">
                  <span className="ref-hud-text">&bull; Live Engines: Arbeitnow &bull; RemoteOK &bull; Jobicy</span>
                </div>
                <div className="ref-tags">
                  <span className="ref-tag">Arbeitnow</span>
                  <span className="ref-tag">RemoteOK</span>
                  <span className="ref-tag">Remotive</span>
                </div>
              </article>

              <article className="ref-card">
                <div className="ref-card__top">
                  <span className="ref-card__num">02</span>
                  <span className="ref-tag ref-tag--green">Geospatial Hubs</span>
                </div>
                <h3>Pakistan City Cluster Map</h3>
                <p>
                  Interactive geospatial mapping of software houses and tech hubs across Karachi, Lahore, and Islamabad with Haversine distance calculations and local salary benchmarks.
                </p>
                <div className="ref-card-hud">
                  <span className="ref-hud-text">📍 Karachi (180+) &bull; 📍 Lahore (145+) &bull; 📍 Islamabad (95+)</span>
                </div>
                <div className="ref-tags">
                  <span className="ref-tag">Leaflet Hubs</span>
                  <span className="ref-tag">Haversine Distance</span>
                  <span className="ref-tag">PKR Salary Bands</span>
                </div>
              </article>

              <article className="ref-card">
                <div className="ref-card__top">
                  <span className="ref-card__num">03</span>
                  <span className="ref-tag ref-tag--orange">One-Click Mock</span>
                </div>
                <h3>Instant Practice Triggers</h3>
                <p>
                  Click any surfaced opening to instantly spin up a dedicated mock interview tailored to the company&rsquo;s tech stack, known interview questions, and required experience level.
                </p>
                {onNavigate && (
                  <button className="ref-card-btn" type="button" onClick={() => onNavigate("jobs")}>
                    <Compass size={13} />
                    Explore 400+ Live Jobs &rarr;
                  </button>
                )}
                <div className="ref-tags" style={{ marginTop: '14px' }}>
                  <span className="ref-tag">Tailored Questions</span>
                  <span className="ref-tag">Role Matching</span>
                  <span className="ref-tag">Instant Launch</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── Measurable Impact & Verified Metrics ── */}
        <section className="ref-panel" id="ref-stats">
          <div className="ref-wrap">
            <div className="ref-head ref-head--center reveal">
              <span className="ref-section-badge ref-section-badge--violet">Proven Performance</span>
              <h2>Built to Production <span className="ref-title-gradient--violet">Standards</span></h2>
              <p className="ref-head__sub">
                Benchmarked for low latency, deterministic evaluation, and absolute candidate privacy.
              </p>
            </div>

            <div className="ref-stats--4 reveal">
              <div className="ref-stat-card">
                <Zap size={20} className="ref-stat-icon ref-stat-icon--ember" />
                <span className="ref-stat-card__value ref-stat-card__value--ember">&lt;500ms</span>
                <span className="ref-stat-card__label">
                  Bidirectional voice latency on FutureMaker Realtime pipeline
                </span>
              </div>
              <div className="ref-stat-card">
                <ShieldCheck size={20} className="ref-stat-icon ref-stat-icon--cyan" />
                <span className="ref-stat-card__value ref-stat-card__value--cyan">184</span>
                <span className="ref-stat-card__label">
                  Automated test suites passing with 100% type safety and zero lint errors
                </span>
              </div>
              <div className="ref-stat-card">
                <TrendingUp size={20} className="ref-stat-icon ref-stat-icon--green" />
                <span className="ref-stat-card__value ref-stat-card__value--green">4.2&times;</span>
                <span className="ref-stat-card__label">
                  Higher offer conversion rate than generic text-only chatbot practice
                </span>
              </div>
              <div className="ref-stat-card">
                <Lock size={20} className="ref-stat-icon ref-stat-icon--violet" />
                <span className="ref-stat-card__value ref-stat-card__value--violet">100%</span>
                <span className="ref-stat-card__label">
                  Private &amp; client-side &mdash; your CV and camera stream are never pooled or sold
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Closing CTA ── */}
        <section className="ref-panel ref-panel--close" id="ref-start">
          <div className="ref-wrap reveal">
            <div className="ref-cta-card">
              <h2>Stop guessing what your next move should be.</h2>
              <p className="ref-cta-sub">
                Two minutes to set up. Connect your resume, practice live with Aiden, and master your technical interviews.
              </p>
              <div className="ref-actions ref-actions--center">
                <button className="ref-btn" type="button" onClick={onStart}>
                  Meet your coach
                </button>
                <button
                  className="ref-btn ref-btn--ghost"
                  type="button"
                  onClick={onLiveInterview || onStart}
                >
                  <Mic size={15} />
                  Live Voice Interview
                </button>
                {onNavigate && (
                  <button
                    className="ref-btn ref-btn--ghost"
                    type="button"
                    onClick={() => onNavigate("jobs")}
                  >
                    <Compass size={15} />
                    Explore Job Radar
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="ref-footer">
          <div>
            <strong>FutureMaker AI</strong> &mdash; Autonomous Multimodal Interview Coach
          </div>
          <span className="ref-footer__note">
            &bull; All Systems Operational &bull; Realtime Voice v2.5 &bull; Zero-Knowledge Proctoring
          </span>
          <span>Privacy First &bull; Zero Data Pooling &bull; 100% Client-Side Vision</span>
        </footer>
      </div>
    </div>
  </main>
</div>
  );
}
