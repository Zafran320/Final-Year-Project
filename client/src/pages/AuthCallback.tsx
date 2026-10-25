import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const syncMutation = trpc.auth.syncSupabaseSession.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    let active = true;

    async function handleAuthCallback() {
      try {
        // 1. Get session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          throw new Error(error.message || "Failed to retrieve authentication session from Supabase.");
        }

        if (session?.access_token) {
          const result = await syncMutation.mutateAsync({ accessToken: session.access_token });
          if (active) {
            try {
              localStorage.setItem("manus-runtime-user-info", JSON.stringify(result.user));
            } catch {}
            utils.auth.me.setData(undefined, result.user);
            await utils.auth.me.invalidate();
            const next = new URLSearchParams(window.location.search).get("next") || "/";
            setLocation(next);
          }
          return;
        }

        // 2. Fallback to onAuthStateChange in case hash parsing is in flight
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (newSession?.access_token && active) {
            subscription.unsubscribe();
            try {
              const result = await syncMutation.mutateAsync({ accessToken: newSession.access_token });
              try {
                localStorage.setItem("manus-runtime-user-info", JSON.stringify(result.user));
              } catch {}
              utils.auth.me.setData(undefined, result.user);
              await utils.auth.me.invalidate();
              const next = new URLSearchParams(window.location.search).get("next") || "/";
              setLocation(next);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : "Failed to synchronize your account session.";
              setErrorMsg(message);
            }
          }
        });

        // Timeout safety
        setTimeout(() => {
          if (active && !session?.access_token) {
            setErrorMsg("Authentication session timed out. Please try logging in again.");
          }
        }, 8000);
      } catch (err: unknown) {
        if (active) {
          const message = err instanceof Error ? err.message : "Unable to complete authentication callback.";
          setErrorMsg(message);
        }
      }
    }

    handleAuthCallback();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="ct-auth-callback" style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "radial-gradient(ellipse 60% 50% at 50% 50%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%), var(--bg)",
      padding: "24px",
      color: "var(--text)"
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        style={{
          width: "min(100%, 420px)",
          padding: "36px 32px",
          border: "1px solid var(--border)",
          borderRadius: "24px",
          background: "color-mix(in srgb, var(--surface) 92%, transparent)",
          boxShadow: "0 28px 70px rgba(0,0,0,0.32)",
          backdropFilter: "blur(20px)",
          textAlign: "center"
        }}
      >
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          background: errorMsg ? "rgba(239, 68, 68, 0.12)" : "color-mix(in srgb, var(--accent) 12%, transparent)",
          border: `1px solid ${errorMsg ? "rgba(239, 68, 68, 0.3)" : "color-mix(in srgb, var(--accent) 30%, transparent)"}`,
          color: errorMsg ? "#ef4444" : "var(--accent)",
          marginBottom: "20px"
        }}>
          {errorMsg ? (
            <AlertCircle size={28} />
          ) : (
            <Loader2 size={28} className="animate-spin" />
          )}
        </div>

        <h2 style={{
          fontSize: "24px",
          fontWeight: 700,
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: "-0.04em",
          marginBottom: "10px"
        }}>
          {errorMsg ? "Sign in could not complete" : "Authenticating with CareerTwin..."}
        </h2>

        <p style={{
          fontSize: "14px",
          color: "var(--text-muted)",
          lineHeight: 1.6,
          marginBottom: "24px"
        }}>
          {errorMsg
            ? errorMsg
            : "Securing your session with Supabase and preparing your practice space."}
        </p>

        {errorMsg ? (
          <button
            type="button"
            onClick={() => setLocation("/login")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              minHeight: "48px",
              padding: "0 20px",
              borderRadius: "14px",
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "14px",
              border: 0,
              cursor: "pointer",
              boxShadow: "var(--btn-primary-glow)"
            }}
          >
            Back to Sign In <ArrowRight size={16} />
          </button>
        ) : (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: "var(--text-muted)",
            padding: "6px 14px",
            borderRadius: "100px",
            background: "color-mix(in srgb, var(--surface-raised) 60%, transparent)",
            border: "1px solid var(--border)"
          }}>
            <Sparkles size={13} style={{ color: "var(--accent)" }} /> Supabase OAuth Active
          </div>
        )}
      </motion.div>
    </main>
  );
}
