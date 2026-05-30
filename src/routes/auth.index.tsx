import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export const Route = createFileRoute("/auth/")({
  head: () => ({ meta: [{ title: "Welcome — Kopi Kaki" }] }),
  component: AuthLandingPage,
});

function AuthLandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/home" });
  }, [loading, session, navigate]);

  if (loading) return null;

  return (
    <main className="min-h-screen bg-[#EDE8DC] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 bg-[#5C3317] rounded-3xl flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 80 80" className="w-12 h-12">
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
          <h1 className="text-3xl font-bold text-[#3A2410]">Kopi Kaki</h1>
          <p className="text-sm text-[#7A6A55] italic">chiong together, score together</p>
        </div>

        {/* Tagline */}
        <div className="text-center px-4">
          <p className="text-[#5C3317] text-sm leading-relaxed">
            Find your NUS study buddy — matched by course, modules, and vibe. ☕
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-3 mt-2">
          <button
            onClick={() => navigate({ to: "/auth/login" })}
            className="w-full rounded-full bg-[#5C3317] py-3.5 text-sm font-semibold text-[#FAF6EF] hover:opacity-90 transition-opacity"
          >
            Log in
          </button>
          <button
            onClick={() => navigate({ to: "/auth/signup" })}
            className="w-full rounded-full border-2 border-[#5C3317] py-3.5 text-sm font-semibold text-[#5C3317] hover:bg-[#E0D9C8] transition-colors"
          >
            Create account
          </button>
        </div>

        <p className="text-xs text-[#7A6A55] text-center mt-2">
          NUS students only · @u.nus.edu
        </p>
      </div>
    </main>
  );
}
