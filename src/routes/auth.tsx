import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Coffee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — RC4 Coffee Academy Admin" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [mode, setMode] = useState<"otp" | "signin" | "signup">("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpStage, setOtpStage] = useState<"email" | "code">("email");
  const [otpCode, setOtpCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Capture whether we already had a session on first render after auth resolves.
  // We only auto-redirect in that case; otherwise the redirect would fire
  // mid-flow (right after sendOtp/verifyOtp) and unmount the form.
  const [hadSessionAtMount, setHadSessionAtMount] = useState<boolean | null>(null);
  useEffect(() => {
    if (hadSessionAtMount === null && !loading) {
      setHadSessionAtMount(!!session);
    }
  }, [loading, session, hadSessionAtMount]);


  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { display_name: email.split("@")[0] },
        },
      });
      if (error) throw error;
      setOtpStage("code");
      toast.success("Code sent — check your email");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send code";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode.trim(),
        type: "email",
      });
      if (error) throw error;
      toast.success("Signed in");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid code";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Only redirect if we already had a session when this page loaded.
    // Otherwise the redirect would interrupt the OTP/sign-in flow before
    // the code input has a chance to render.
    if (!loading && session && hadSessionAtMount) {
      navigate({ to: isAdmin ? "/admin" : "/" });
    }
  }, [loading, session, isAdmin, navigate, hadSessionAtMount]);

  // After a successful OTP verification (session arrives mid-flow), redirect.
  useEffect(() => {
    if (!loading && session && otpStage === "code" && !busy) {
      navigate({ to: isAdmin ? "/admin" : "/" });
    }
    // Also redirect on successful password sign-in
    if (!loading && session && (mode === "signin" || mode === "signup") && !busy) {
      navigate({ to: isAdmin ? "/admin" : "/" });
    }
  }, [session, isAdmin, loading, otpStage, mode, busy, navigate]);


  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) toast.error("Google sign-in failed");
    setBusy(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary/30 px-4 py-16">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-display text-2xl font-semibold text-primary">
          <Coffee className="h-6 w-6" /> RC4 Coffee Academy
        </Link>
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">
            {mode === "otp" ? "Sign in with email" : mode === "signin" ? "Owner sign in" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "otp"
              ? "We'll email you a 6-digit code — no password needed."
              : mode === "signin"
              ? "Sign in to manage orders and sessions."
              : "The first account becomes admin."}
          </p>

          {errorMsg && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMsg}
            </div>
          )}

          {mode === "otp" ? (
            otpStage === "email" ? (
              <form onSubmit={sendOtp} className="mt-6 space-y-3">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-ring/30 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Send code"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="mt-6 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Code sent to <span className="font-medium text-foreground">{email}</span>
                </p>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  placeholder="6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-center text-lg tracking-[0.5em] outline-none ring-ring/30 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={busy || otpCode.length < 6}
                  className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Verifying…" : "Verify & sign in"}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpStage("email"); setOtpCode(""); setErrorMsg(null); }}
                  className="w-full rounded-full border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
                >
                  Use a different email
                </button>
              </form>
            )
          ) : (
            <>
              <button
                type="button"
                onClick={google}
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={submit} className="space-y-3">
                {mode === "signup" && (
                  <input
                    type="text"
                    placeholder="Display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-ring/30 focus:ring-2"
                  />
                )}
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-ring/30 focus:ring-2"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-ring/30 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                {mode === "signin" ? "Need an account?" : "Have an account?"}{" "}
                <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setErrorMsg(null); }} className="font-medium text-primary hover:underline">
                  {mode === "signin" ? "Create one" : "Sign in"}
                </button>
              </p>
            </>
          )}

          <div className="mt-6 border-t border-border pt-4 text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === "otp" ? "signin" : "otp"); setOtpStage("email"); setOtpCode(""); setErrorMsg(null); }}
              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              {mode === "otp" ? "Use password instead" : "Sign in with email code instead"}
            </button>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">← Back to coffee shop</Link>
        </p>
      </div>
    </main>
  );
}
