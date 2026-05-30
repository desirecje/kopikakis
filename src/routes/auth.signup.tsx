import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({ meta: [{ title: "Sign up — Kopi Kaki" }] }),
  component: SignupPage,
});

const RESEND_COOLDOWN = 60;

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [justVerified, setJustVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && session && !justVerified) navigate({ to: "/home" });
  }, [loading, session, navigate, justVerified]);

  useEffect(() => {
    if (stage === "code") setTimeout(() => codeInputRef.current?.focus(), 100);
  }, [stage]);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith("@u.nus.edu")) {
      toast.error("Only NUS student emails (@u.nus.edu) are allowed.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: undefined,
        data: { display_name: email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("rate limit") || error.message.toLowerCase().includes("too many")) {
        toast.error("Too many attempts. Please wait a minute.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Code sent! Check your NUS email.");
    setStage("code");
    startCooldown();
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email, token: code.trim(), type: "email",
    });
    setBusy(false);
    if (error) { toast.error("Invalid or expired code. Try again."); return; }
    setJustVerified(true);
    toast.success("Account created! Let's set up your profile.");
    navigate({ to: "/profile/setup" });
  };

  const resendCode = async () => {
    if (cooldown > 0) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { shouldCreateUser: true, emailRedirectTo: undefined },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("New code sent!");
    setCode("");
    startCooldown();
  };

  return (
    <main className="min-h-screen bg-[#EDE8DC] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Back + Logo */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate({ to: "/auth/" })}
            className="text-[#7A6A55] hover:text-[#3A2410]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#5C3317] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 80 80" className="w-4 h-4">
                <rect x="18" y="6" width="44" height="10" rx="5" fill="#EDE8DC"/>
                <path d="M22 16 L58 16 L52 56 L28 56 Z" fill="#EDE8DC"/>
                <ellipse cx="40" cy="56" rx="18" ry="11" fill="#EDE8DC"/>
                <path d="M22 56 Q22 70 40 70 Q58 70 58 56 Z" fill="#EDE8DC"/>
                <ellipse cx="40" cy="56" rx="14" ry="8" fill="#5C3317"/>
                <circle cx="33" cy="56" r="2.5" fill="#EDE8DC"/>
                <circle cx="40" cy="56" r="2.5" fill="#EDE8DC"/>
                <circle cx="47" cy="56" r="2.5" fill="#EDE8DC"/>
              </svg>
            </div>
            <span className="font-semibold text-[#3A2410]">Kopi Kaki</span>
          </div>
        </div>

        <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.15)] p-6">
          {stage === "email" ? (
            <>
              <h2 className="text-xl font-bold text-[#3A2410] mb-1">Create account</h2>
              <p className="text-sm text-[#7A6A55] mb-5">Enter your NUS email to get started.</p>
              <form onSubmit={sendCode} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-[#7A6A55]">NUS email</label>
                  <input
                    type="email"
                    required
                    placeholder="e0XXXXXX@u.nus.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inp}
                  />
                  <p className="text-[10px] text-[#7A6A55]">Must end with @u.nus.edu</p>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF] hover:opacity-90 disabled:opacity-50 mt-1"
                >
                  {busy ? "Sending..." : "Send code →"}
                </button>
              </form>
              <p className="text-center text-xs text-[#7A6A55] mt-4">
                Already have an account?{" "}
                <button onClick={() => navigate({ to: "/auth/login" })} className="text-[#5C3317] font-medium hover:underline">
                  Log in
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-[#3A2410] mb-1">Verify your email</h2>
              <p className="text-sm text-[#7A6A55] mb-1">
                Sent to <span className="font-medium text-[#3A2410]">{email}</span>
              </p>
              <p className="text-xs text-[#7A6A55] mb-5">Code expires in 10 minutes.</p>
              <form onSubmit={verifyCode} className="flex flex-col gap-3">
                <input
                  ref={codeInputRef}
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={`${inp} text-center text-2xl tracking-[0.5em]`}
                />
                <button
                  type="submit"
                  disabled={busy || code.length < 6}
                  className="w-full rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF] hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Verifying..." : "Create account →"}
                </button>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={cooldown > 0 || busy}
                  className="w-full rounded-full border border-[rgba(92,51,23,0.2)] py-2.5 text-xs font-medium text-[#7A6A55] hover:bg-[#EDE8DC] disabled:opacity-40"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStage("email"); setCode(""); }}
                  className="w-full rounded-full border border-[rgba(92,51,23,0.2)] py-2.5 text-xs font-medium text-[#7A6A55] hover:bg-[#EDE8DC]"
                >
                  Use a different email
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

const inp = "w-full rounded-xl border border-[rgba(92,51,23,0.2)] bg-[#EDE8DC] px-4 py-3 text-sm text-[#3A2410] placeholder:text-[#7A6A55] outline-none focus:ring-2 focus:ring-[#5C3317]/30";
