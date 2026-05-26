import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Kopi Kaki" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [justVerified, setJustVerified] = useState(false);

  // Only redirect to home if user was ALREADY logged in when page loaded
  // Not after a fresh OTP verification (justVerified handles that)
  useEffect(() => {
    if (!loading && session && !justVerified) navigate({ to: "/home" });
  }, [loading, session, navigate, justVerified]);

const sendCode = async (e: React.FormEvent) => {
  e.preventDefault();

  // Restrict to NUS emails only
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
  if (error) { toast.error(error.message); return; }
  toast.success("6-digit code sent! Check your email.");
  setStage("code");
};

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    setBusy(false);
    if (error) { toast.error("Invalid or expired code. Try again."); return; }
    setJustVerified(true);
    toast.success("Signed in!");
    navigate({ to: "/profile/setup" });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#EDE8DC] px-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8 gap-2">
          <div className="w-16 h-16 bg-[#5C3317] rounded-2xl flex items-center justify-center">
            <svg viewBox="0 0 80 80" className="w-10 h-10">
              <rect x="18" y="6" width="44" height="10" rx="5" fill="#EDE8DC"/>
              <path d="M22 16 L58 16 L52 56 L28 56 Z" fill="#EDE8DC"/>
              <ellipse cx="40" cy="56" rx="18" ry="11" fill="#EDE8DC"/>
              <path d="M22 56 Q22 70 40 70 Q58 70 58 56 Z" fill="#EDE8DC"/>
              <ellipse cx="40" cy="56" rx="14" ry="8" fill="#5C3317"/>
              <circle cx="33" cy="56" r="2.5" fill="#EDE8DC"/>
              <circle cx="40" cy="56" r="2.5" fill="#EDE8DC"/>
              <circle cx="47" cy="56" r="2.5" fill="#EDE8DC"/>
              <path d="M34 68 L40 76 L46 68" fill="#EDE8DC"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#3A2410]">Kopi Kaki</h1>
          <p className="text-sm text-[#7A6A55] italic">chiong together, score together</p>
        </div>

        <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.15)] p-6">
          {stage === "email" ? (
            <>
              <h2 className="text-lg font-semibold text-[#3A2410] mb-1">Sign in</h2>
              <p className="text-sm text-[#7A6A55] mb-5">
                Enter your NUS email — we'll send you a 6-digit code.
              </p>
              <form onSubmit={sendCode} className="flex flex-col gap-3">
                <input
                  type="email"
                  required
                  placeholder="e0XXXXXX@u.nus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[rgba(92,51,23,0.2)] bg-[#EDE8DC] px-4 py-3 text-sm text-[#3A2410] placeholder:text-[#7A6A55] outline-none focus:ring-2 focus:ring-[#5C3317]/30"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF] hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Sending..." : "Send code →"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-[#3A2410] mb-1">Enter your code</h2>
              <p className="text-sm text-[#7A6A55] mb-5">
                Sent to <span className="font-medium text-[#3A2410]">{email}</span>
              </p>
              <form onSubmit={verifyCode} className="flex flex-col gap-3">
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-xl border border-[rgba(92,51,23,0.2)] bg-[#EDE8DC] px-4 py-3 text-center text-2xl tracking-[0.5em] text-[#3A2410] outline-none focus:ring-2 focus:ring-[#5C3317]/30"
                />
                <button
                  type="submit"
                  disabled={busy || code.length < 6}
                  className="w-full rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF] hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Verifying..." : "Verify & sign in →"}
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

        <p className="text-center text-xs text-[#7A6A55] mt-5">
          NUS students only · e0XXXXXX@u.nus.edu
        </p>
      </div>
    </main>
  );
}
