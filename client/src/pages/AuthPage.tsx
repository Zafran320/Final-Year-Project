/* Quiet Signal authentication gateway: Supabase powered Email/Password & Google OAuth */
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, Sparkles, User as UserIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";

type AuthMode = "login" | "signup";

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const googleStatus = trpc.auth.googleStatus.useQuery(undefined, { staleTime: 60_000, retry: false });
  const reducedMotion = useReducedMotion();
  const next = new URLSearchParams(window.location.search).get("next") || "/";
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const utils = trpc.useUtils();
  const signUpMutation = trpc.auth.signUp.useMutation();

  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const syncMutation = trpc.auth.syncSupabaseSession.useMutation();

  const isSubmitting = isSubmittingManual || signUpMutation.isPending || syncMutation.isPending || googleLoading;

  useEffect(() => {
    if (isAuthenticated) {
      window.location.replace(next || "/");
    }
  }, [isAuthenticated, next]);

  useEffect(() => {
    setErrorMessage(null);
    setInfoMessage(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    if (isSignup && password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    try {
      setIsSubmittingManual(true);

      if (isSignup) {
        const displayName = name.trim() || email.trim().split("@")[0] || "User";
        const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next || "/")}`;

        // Attempt 1: Server-side admin auto-confirm signup (bypasses 3-emails/hr limit & eliminates broken localhost emails)
        let serverCreatedUser = null;
        try {
          const res = await signUpMutation.mutateAsync({
            email: email.trim(),
            password,
            name: displayName,
          });
          if (res?.success && res?.user) {
            serverCreatedUser = res.user;
          }
        } catch (serverErr: unknown) {
          const msg = serverErr instanceof Error ? serverErr.message : "";
          if (msg.includes("already exists") || msg.includes("already registered") || msg.includes("Password must")) {
            throw serverErr;
          }
          console.info("[Auth] Server signup fallback to client Supabase SDK:", msg);
        }

        if (serverCreatedUser) {
          // Sign in via client SDK to establish browser session token
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

          if (!signInErr && signInData?.session?.access_token) {
            try {
              localStorage.setItem("manus-runtime-user-info", JSON.stringify(serverCreatedUser));
            } catch {}
            utils.auth.me.setData(undefined, serverCreatedUser);
            await utils.auth.me.invalidate();
            window.location.replace(next || "/");
            return;
          }
        }

        // Attempt 2: Direct Supabase client sign up with dynamic production emailRedirectTo
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: callbackUrl,
            data: {
              name: displayName,
              full_name: displayName,
            },
          },
        });

        if (error) {
          const errLower = error.message.toLowerCase();
          if (errLower.includes("rate limit") || errLower.includes("over_email_send_rate_limit")) {
            throw new Error(
              "Supabase email rate limit exceeded (maximum 3 emails/hour on free tier). In your Supabase Dashboard, go to Authentication -> Providers -> Email and disable 'Confirm email' to allow instant signups, or continue with Google."
            );
          }
          throw new Error(error.message);
        }

        if (data.session?.access_token) {
          const result = await syncMutation.mutateAsync({ accessToken: data.session.access_token });
          if (result.success && result.user) {
            try {
              localStorage.setItem("manus-runtime-user-info", JSON.stringify(result.user));
            } catch {}
            utils.auth.me.setData(undefined, result.user);
            await utils.auth.me.invalidate();
            window.location.replace(next || "/");
          }
        } else {
          // Email confirmation link was sent
          setInfoMessage(
            `Account created! A confirmation link has been sent to ${email.trim()}. Please click the link in your email to confirm your account.`
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          const errLower = error.message.toLowerCase();
          if (errLower.includes("email not confirmed")) {
            throw new Error(
              "Your email has not been confirmed yet. Please check your inbox for the confirmation link, or disable 'Confirm email' in Supabase Dashboard."
            );
          }
          throw new Error(error.message);
        }

        if (data.session?.access_token) {
          const result = await syncMutation.mutateAsync({ accessToken: data.session.access_token });
          if (result.success && result.user) {
            try {
              localStorage.setItem("manus-runtime-user-info", JSON.stringify(result.user));
            } catch {}
            utils.auth.me.setData(undefined, result.user);
            await utils.auth.me.invalidate();
            window.location.replace(next || "/");
          }
        } else {
          throw new Error("Could not start session. Please verify your credentials.");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const continueWithGoogle = async () => {
    try {
      setGoogleLoading(true);
      setErrorMessage(null);
      setInfoMessage(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      setGoogleLoading(false);
      const message = err instanceof Error ? err.message : "Google sign-in could not be initiated.";
      setErrorMessage(message);
    }
  };

  const providerError = new URLSearchParams(window.location.search).get("error");

  return (
    <main className={`ct-auth ct-auth--${mode}`} aria-labelledby="auth-title">
      <section className="ct-auth-story">
        <button className="ct-auth-brand" type="button" onClick={() => setLocation("/")} aria-label="Back to CareerTwin AI home">
          <img src="/branding/career-twin-logo.png" alt="CareerTwin AI" />
          <span>CareerTwin <em>AI</em></span>
        </button>
        <motion.div className="ct-auth-editorial" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.42, ease: [0.23, 1, 0.32, 1] }}>
          <p className="ct-auth-overline"><span /> {isSignup ? "Your private starting point" : "Return to your private practice"}</p>
          <h1>{isSignup ? "A calmer way to prepare starts with what is already yours." : "Pick up the story you have been making stronger."}</h1>
          <p>{isSignup ? "Create a secure space for the experience, projects, and role direction you choose to bring into practice." : "Continue from the evidence, focus, and one next improvement you chose in your last session."}</p>
          <div className="ct-auth-thread" aria-label="CareerTwin preparation thread"><span>Experience</span><i /><span>Focus</span><i /><strong>One stronger answer</strong></div>
        </motion.div>
        <div className="ct-auth-promises" aria-label="CareerTwin account benefits">
          <div><CheckCircle2 size={17} /><span><strong>Your evidence stays yours.</strong> Practice begins with what you can genuinely stand behind.</span></div>
          <div><Sparkles size={17} /><span><strong>One focused next step.</strong> Feedback stays useful, specific, and calm.</span></div>
          <div><ShieldCheck size={17} /><span><strong>Supabase Cloud Security.</strong> End-to-end encrypted authentication & data protection.</span></div>
        </div>
      </section>

      <section className="ct-auth-panel">
        <motion.div className="ct-auth-card" initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reducedMotion ? 0 : 0.48, delay: reducedMotion ? 0 : 0.08, ease: [0.23, 1, 0.32, 1] }}>
          <button className="ct-auth-back" type="button" onClick={() => setLocation("/")}><ArrowLeft size={15} /> Back to home</button>
          
          <div className="ct-auth-card-identity">
            <span className="ct-auth-card-icon"><LockKeyhole size={20} /></span>
            <span>
              <small>CareerTwin account</small>
              <b>{isSignup ? "Set up your private practice" : "Secure return"}</b>
            </span>
          </div>

          <p className="ct-auth-label">{isSignup ? "Create your secure account" : "Secure sign in"}</p>
          <h2 id="auth-title">{isSignup ? "Start your practice space." : `Hello${user?.name ? `, ${user.name}` : " again"}.`}</h2>
          <p className="ct-auth-copy">{isSignup ? "Sign up with your email or Google account to begin personalized interview preparation." : "Sign in to access your saved resume, company insights, and practice progress."}</p>

          {/* Google Sign In via Supabase */}
          <button
            className="ct-auth-google"
            type="button"
            onClick={continueWithGoogle}
            disabled={isSubmitting}
            title="Continue with Google"
            style={{ marginTop: "24px" }}
          >
            <span className="ct-google-mark" aria-hidden="true">
              {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleMark />}
            </span>
            <span>
              <strong>Continue with Google</strong>
              <small>Instant access with your Google account</small>
            </span>
            <ArrowRight size={16} />
          </button>

          <div className="ct-auth-divider">
            <span /> or continue with email <span />
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="ct-auth-form" style={{ display: "grid", gap: "14px" }}>
            {isSignup && (
              <div className="ct-auth-input-group">
                <label htmlFor="auth-name" className="ct-auth-input-label">Full Name</label>
                <div className="ct-auth-input-wrapper">
                  <UserIcon size={16} className="ct-auth-input-icon" />
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="e.g. Ayesha Khan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="name"
                    className="ct-auth-input"
                  />
                </div>
              </div>
            )}

            <div className="ct-auth-input-group">
              <label htmlFor="auth-email" className="ct-auth-input-label">Email Address</label>
              <div className="ct-auth-input-wrapper">
                <Mail size={16} className="ct-auth-input-icon" />
                <input
                  id="auth-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                  autoComplete="email"
                  className="ct-auth-input"
                />
              </div>
            </div>

            <div className="ct-auth-input-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="auth-password" className="ct-auth-input-label">Password</label>
                {isSignup && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Min. 6 chars</span>}
              </div>
              <div className="ct-auth-input-wrapper">
                <LockKeyhole size={16} className="ct-auth-input-icon" />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isSignup ? "Create a strong password" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  className="ct-auth-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="ct-auth-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {infoMessage && (
              <div className="ct-auth-info-alert" role="status">
                <CheckCircle2 size={16} className="ct-auth-info-icon" />
                <span>{infoMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="ct-auth-error-alert" role="alert">
                <span className="ct-auth-error-dot" />
                <span>{errorMessage}</span>
              </div>
            )}

            {providerError && (
              <p className="ct-auth-provider-error" role="status">
                Google sign-in could not complete. You can sign in with your email or try Google again.
              </p>
            )}

            <button
              className="ct-auth-provider"
              type="submit"
              disabled={isSubmitting}
              style={{ marginTop: "10px", width: "100%", justifyContent: "center" }}
            >
              <span className="ct-auth-provider-mark">
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <img src="/branding/career-twin-logo.png" alt="" />
                )}
              </span>
              <span>{isSubmitting ? (isSignup ? "Creating account…" : "Signing in…") : isSignup ? "Create account" : "Sign in to CareerTwin"}</span>
              <ArrowRight size={17} />
            </button>
          </form>

          <button
            className="ct-auth-switch"
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setInfoMessage(null);
              setLocation(isSignup ? "/login" : "/signup");
            }}
            style={{ marginTop: "20px" }}
          >
            {isSignup ? "Already have an account?" : "New to CareerTwin?"}{" "}
            <strong>{isSignup ? "Sign in" : "Create an account"}</strong> <ArrowRight size={14} />
          </button>

          <p className="ct-auth-fineprint">
            <ShieldCheck size={14} />
            <span>Protected by Supabase Auth with PostgreSQL Row Level Security.</span>
          </p>
        </motion.div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path className="ct-google-blue" d="M21.35 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.52h3.14c1.83-1.69 2.89-4.18 2.89-7.29Z" />
      <path className="ct-google-green" d="M12 21.5c2.62 0 4.82-.87 6.43-2.35l-3.14-2.52c-.87.58-1.98.92-3.29.92-2.53 0-4.67-1.71-5.44-4.01H3.32v2.6A9.72 9.72 0 0 0 12 21.5Z" />
      <path className="ct-google-yellow" d="M6.56 13.54A5.85 5.85 0 0 1 6.25 12c0-.53.09-1.04.31-1.54v-2.6H3.32A9.72 9.72 0 0 0 2.28 12c0 1.56.37 3.04 1.04 4.14l3.24-2.6Z" />
      <path className="ct-google-red" d="M12 6.45c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.82 3.55 14.62 2.5 12 2.5a9.72 9.72 0 0 0-8.68 5.36l3.24 2.6C7.33 8.16 9.47 6.45 12 6.45Z" />
    </svg>
  );
}
