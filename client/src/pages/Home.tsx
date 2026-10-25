/* CareerTwin AI: an auth-first, private preparation workspace. No preview account, hardcoded user, or simulated coaching result is shown. */
import {
  ArrowRight,
  Check,
  ChevronRight,
  FileText,
  Info,
  LockKeyhole,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { AccountNavigation, type AccountNavDestination } from "@/components/AccountNavigation";
import CompanyPreparation from "@/pages/CompanyPreparation";
import PracticeSetup from "@/pages/PracticeSetup";
import { PracticeLeaveConfirmation } from "@/components/PracticeLeaveConfirmation";
import { HomePage } from "@/components/HomePage";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { normalizePracticeLocation } from "@/lib/practiceNavigation";
import { getProfileImageUrl } from "@/lib/profileImage";
import { useLocation } from "wouter";

type Screen = "splash" | "consent" | "intake" | "company-prep" | "question-plan" | "session";
type PracticeLeaveIntent =
  | { kind: "screen"; screen: Screen }
  | { kind: "route"; path: "/account" | "/dashboard" | "/jobs" }
  | { kind: "history"; path: string; screen: Screen }
  | { kind: "sign-out" };

const knownScreens: Screen[] = ["splash", "consent", "intake", "company-prep", "question-plan", "session"];

function currentScreen(location: string): Screen {
  const candidate = new URLSearchParams(location.split("?")[1] ?? "").get("screen");
  return knownScreens.includes(candidate as Screen) ? (candidate as Screen) : "splash";
}

function wordCount(value: string) {
  const cleaned = value.trim();
  return cleaned ? cleaned.split(/\s+/).length : 0;
}

export default function Home() {
  const { user, loading: authLoading, isAuthenticated, logout } = useAuth();
  const profileQuery = trpc.careerProfile.get.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const latestSessionQuery = trpc.practicePreparation.getLatestSession.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const [, setLocation] = useLocation();
  const [screen, setScreen] = useState<Screen>(() => currentScreen(`${window.location.pathname}${window.location.search}`));
  const [understood, setUnderstood] = useState(false);
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contextReady, setContextReady] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingPracticeLeave, setPendingPracticeLeave] = useState<PracticeLeaveIntent | null>(null);
  const screenRef = useRef(screen);
  const companyPreparationHasActiveWorkRef = useRef(false);
  const currentLocationRef = useRef(`${window.location.pathname}${window.location.search}`);

  const resumeWords = useMemo(() => wordCount(resume), [resume]);
  const jobWords = useMemo(() => wordCount(jobDescription), [jobDescription]);

  const navigate = useCallback((nextScreen: Screen) => {
    const nextLocation = nextScreen === "splash" ? "/" : `/?screen=${nextScreen}`;
    window.history.pushState({}, "", nextLocation);
    currentLocationRef.current = nextLocation;
    setScreen(nextScreen);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }, []);

  const completePracticeLeave = useCallback(async (intent: PracticeLeaveIntent) => {
    if (intent.kind === "screen") {
      navigate(intent.screen);
      return;
    }
    if (intent.kind === "route") {
      setLocation(intent.path);
      return;
    }
    if (intent.kind === "history") {
      window.history.pushState({}, "", intent.path);
      currentLocationRef.current = intent.path;
      setScreen(intent.screen);
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
      return;
    }
    await logout();
    navigate("splash");
  }, [logout, navigate, setLocation]);

  const requestPracticeLeave = useCallback((intent: PracticeLeaveIntent) => {
    if (screenRef.current !== "company-prep" || !companyPreparationHasActiveWorkRef.current) {
      void completePracticeLeave(intent);
      return;
    }
    setPendingPracticeLeave(intent);
    setLeaveDialogOpen(true);
  }, [completePracticeLeave]);

  const cancelPracticeLeave = useCallback(() => {
    setLeaveDialogOpen(false);
    setPendingPracticeLeave(null);
  }, []);

  const confirmPracticeLeave = useCallback(() => {
    const intent = pendingPracticeLeave;
    if (!intent) return;
    companyPreparationHasActiveWorkRef.current = false;
    setLeaveDialogOpen(false);
    setPendingPracticeLeave(null);
    void completePracticeLeave(intent);
  }, [completePracticeLeave, pendingPracticeLeave]);

  const handleCompanyPreparationActiveWorkChange = useCallback((hasActiveWork: boolean) => {
    companyPreparationHasActiveWorkRef.current = hasActiveWork;
  }, []);

  const navigateFromNavbar = (destination: AccountNavDestination) => {
    if (destination === "home") requestPracticeLeave({ kind: "screen", screen: "splash" });
    if (destination === "dashboard") requestPracticeLeave({ kind: "route", path: "/dashboard" });
    if (destination === "jobs") requestPracticeLeave({ kind: "route", path: "/jobs" });
    if (destination === "account") requestPracticeLeave({ kind: "route", path: "/account" });
    if (destination === "privacy") requestPracticeLeave({ kind: "screen", screen: "session" });
    if (destination === "practice") {
      if (latestSessionQuery.data && (latestSessionQuery.data.levels?.length ?? 0) > 0) {
        requestPracticeLeave({ kind: "screen", screen: "question-plan" });
      } else {
        requestPracticeLeave({ kind: "screen", screen: "consent" });
      }
    }
  };

  const openAuth = (mode: "login" | "signup") => {
    window.location.assign(`/${mode}?next=${encodeURIComponent("/")}`);
  };

  const beginPractice = () => {
    if (!isAuthenticated) {
      openAuth("login");
      return;
    }
    if (latestSessionQuery.data && (latestSessionQuery.data.levels?.length ?? 0) > 0) {
      navigate("question-plan");
      return;
    }
    navigate("consent");
  };

  useEffect(() => {
    const currentLocation = `${window.location.pathname}${window.location.search}`;
    const normalizedLocation = normalizePracticeLocation(window.location.pathname, window.location.search);
    if (normalizedLocation === currentLocation) return;
    window.history.replaceState({}, "", normalizedLocation);
    currentLocationRef.current = normalizedLocation;
    setScreen(currentScreen(normalizedLocation));
  }, []);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    if (authLoading || isAuthenticated || screen === "splash") return;
    const next = normalizePracticeLocation(window.location.pathname, window.location.search);
    window.location.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [authLoading, isAuthenticated, screen]);

  useEffect(() => {
    const syncScreenFromUrl = () => {
      const nextLocation = normalizePracticeLocation(window.location.pathname, window.location.search);
      const nextScreen = currentScreen(nextLocation);
      if (screenRef.current === "company-prep" && companyPreparationHasActiveWorkRef.current && nextScreen !== "company-prep") {
        setPendingPracticeLeave({ kind: "history", path: nextLocation, screen: nextScreen });
        setLeaveDialogOpen(true);
        window.history.pushState({}, "", currentLocationRef.current);
        return;
      }
      currentLocationRef.current = nextLocation;
      setScreen(nextScreen);
    };
    window.addEventListener("popstate", syncScreenFromUrl);
    return () => window.removeEventListener("popstate", syncScreenFromUrl);
  }, []);

  const clearCurrentSession = () => {
    setDeleteOpen(false);
    setResume("");
    setJobDescription("");
    setContextReady(false);
    setDeleted(true);
    navigate("session");
  };

  const { theme, toggleTheme } = useTheme();

  return (
    <div className="ct-app">
      {isAuthenticated && screen !== "splash" && (
        <AccountNavigation
          userName={user?.name || "Your account"}
          profileImageUrl={profileQuery.data?.profilePhotoUrl ?? getProfileImageUrl(user)}
          theme={theme}
          onToggleTheme={toggleTheme}
          activeDestination="practice"
          onNavigate={navigateFromNavbar}
          onSignOut={() => requestPracticeLeave({ kind: "sign-out" })}
        />
      )}

      {screen === "splash" && (
        <div key="splash" className="ct-screen-transition">
          <HomePage
            onStart={beginPractice}
            onLogin={() => openAuth("login")}
            onSignup={() => openAuth("signup")}
            authenticated={isAuthenticated}
            loading={authLoading}
            userName={user?.name || ""}
            onNavigate={navigateFromNavbar}
            onSignOut={() => requestPracticeLeave({ kind: "sign-out" })}
            onLiveInterview={() => {
              if (!isAuthenticated) {
                openAuth("login");
              } else {
                setLocation("/live-interview");
              }
            }}
          />
        </div>
      )}

      {screen === "consent" && isAuthenticated && (
        <div key="consent" className="ct-screen-transition">
          <main className="ct-view ct-view--narrow ct-view--minimal">
            <section className="ct-panel ct-consent-card" aria-labelledby="consent-title">
              <p className="ct-eyebrow"><span className="ct-eyebrow-mark" /> Private practice</p>
              <h1 id="consent-title" className="ct-card-title">Before we start</h1>
              <p className="ct-card-copy">CareerTwin uses only the resume, role brief, and answers you choose to provide. You can clear the current browser session at any time. It is a learning tool and does not make hiring decisions.</p>
              <label className="ct-check-row"><input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} /> <span>I understand and want to continue.</span></label>
              <div className="ct-action-row"><button className="ct-button ct-button--full" type="button" disabled={!understood} onClick={() => navigate("company-prep")}>Continue to preparation <ArrowRight size={16} /></button></div>
              <button className="ct-text-action" style={{ marginTop: 18 }} type="button" onClick={() => navigate("session")}>What data is stored? <ChevronRight size={14} /></button>
            </section>
          </main>
        </div>
      )}

      {screen === "company-prep" && isAuthenticated && (
        <div key="company-prep" className="ct-screen-transition">
          <CompanyPreparation onContinue={() => navigate("question-plan")} onActiveWorkChange={handleCompanyPreparationActiveWorkChange} />
        </div>
      )}

      {screen === "question-plan" && isAuthenticated && (
        <div key="question-plan" className="ct-screen-transition">
          <PracticeSetup onBackToCompanyPrep={() => navigate("company-prep")} />
        </div>
      )}

      {screen === "intake" && isAuthenticated && (
        <div key="intake" className="ct-screen-transition">
          <main className="ct-view">
            <section aria-labelledby="intake-title">
              <p className="ct-eyebrow"><span className="ct-eyebrow-mark" /> Your preparation brief</p>
              <h1 id="intake-title" className="ct-title ct-title--compact">Bring your own context.</h1>
              <p className="ct-lede">Paste the experience and role you want to work with. Nothing is prefilled; this workspace begins only with information you provide.</p>
              <div className="ct-intake-stack">
                <article className="ct-intake-card">
                  <label className="ct-input-label" htmlFor="resume"><span>Your resume or experience notes</span><span className="ct-input-help">Required</span></label>
                  <textarea id="resume" className="ct-textarea" value={resume} onChange={(event) => { setResume(event.target.value); setDeleted(false); }} placeholder="Paste the experiences, projects, internships, or strengths you want to practise with…" />
                  {showValidation && !resume.trim() && <span className="ct-validation">Add your own context to continue.</span>}
                </article>
                <article className="ct-intake-card">
                  <label className="ct-input-label" htmlFor="job"><span>Target role or job description</span><span className="ct-input-help">Required</span></label>
                  <textarea id="job" className="ct-textarea ct-textarea--short" value={jobDescription} onChange={(event) => { setJobDescription(event.target.value); setDeleted(false); }} placeholder="Paste the target role, responsibilities, or the skills you want to prepare for…" />
                  {showValidation && !jobDescription.trim() && <span className="ct-validation">Add the role context to continue.</span>}
                </article>
              </div>
              <div className="ct-action-row"><button className="ct-button ct-button--full" type="button" onClick={() => { if (!resume.trim() || !jobDescription.trim()) { setShowValidation(true); return; } setShowValidation(false); setContextReady(true); navigate("session"); }}>Review my preparation brief <ArrowRight size={16} /></button></div>
            </section>
          </main>
        </div>
      )}

      {screen === "session" && isAuthenticated && (
        <div key="session" className="ct-screen-transition">
          <main className="ct-view">
            <section aria-labelledby="session-title">
              <p className="ct-eyebrow"><span className="ct-eyebrow-mark" /> Secure workspace</p>
              <h1 id="session-title" className="ct-title ct-title--compact">Your preparation brief.</h1>
              {deleted ? (
                <section className="ct-panel" style={{ marginTop: 30 }}><span className="ct-error-icon"><Check size={22} color="#3DDC97" /></span><p className="ct-card-copy">The current browser-session content has been cleared. Add only the material you want CareerTwin to use when you are ready.</p><div className="ct-action-row"><button className="ct-button" type="button" onClick={() => navigate("intake")}>Create a new brief <ArrowRight size={16} /></button></div></section>
              ) : contextReady ? (
                <>
                  <p className="ct-lede">Your own preparation context is ready. It remains in this browser session until you clear it.</p>
                  <div className="ct-stored-list">
                    <article className="ct-stored-item"><span className="ct-stored-icon"><FileText size={17} /></span><div><p className="ct-stored-title">Experience context</p><p className="ct-stored-copy">{resumeWords} words supplied by you for this current session.</p></div></article>
                    <article className="ct-stored-item"><span className="ct-stored-icon"><LockKeyhole size={17} /></span><div><p className="ct-stored-title">Target role context</p><p className="ct-stored-copy">{jobWords} words supplied by you for this current session.</p></div></article>
                    <article className="ct-stored-item"><span className="ct-stored-icon"><Info size={17} /></span><div><p className="ct-stored-title">Coaching status</p><p className="ct-stored-copy">Personalized question generation and feedback require the secure coaching service. They are intentionally unavailable until that service is connected.</p></div></article>
                  </div>
                  <p className="ct-info-line"><ShieldCheck size={16} /> CareerTwin does not create hiring predictions or invent practice results for your account.</p>
                  <div className="ct-action-row"><button className="ct-button ct-button--secondary" type="button" onClick={() => navigate("intake")}>Edit preparation brief</button><button className="ct-button ct-button--danger" type="button" onClick={() => setDeleteOpen(true)}><Trash2 size={16} /> Clear current session</button></div>
                </>
              ) : (
                <section className="ct-panel" style={{ marginTop: 30 }}><p className="ct-card-copy">No preparation brief has been added yet. Start with your own experience and the role you are targeting.</p><div className="ct-action-row"><button className="ct-button" type="button" onClick={() => navigate("intake")}>Add my context <ArrowRight size={16} /></button></div></section>
              )}
            </section>
          </main>
        </div>
      )}

      {deleteOpen && (
        <div className="ct-modal-backdrop" role="presentation">
          <section className="ct-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <h2 id="delete-title" className="ct-modal-title">Clear this session?</h2>
            <p className="ct-modal-copy">This removes the resume and role text held in the current browser session.</p>
            <div className="ct-modal-actions"><button className="ct-button ct-button--secondary" type="button" onClick={() => setDeleteOpen(false)}>Cancel</button><button className="ct-button ct-button--danger" type="button" onClick={clearCurrentSession}>Clear session</button></div>
          </section>
        </div>
      )}
      <PracticeLeaveConfirmation open={leaveDialogOpen} onStay={cancelPracticeLeave} onLeave={confirmPracticeLeave} />
    </div>
  );
}

// end of Home.tsx
