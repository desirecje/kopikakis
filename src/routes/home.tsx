import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/home")({
  component: HomePage,
});

function HomePage() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/auth" }); return; }

    // Check if profile is complete
    supabase
      .from("profiles")
      .select("course, year_of_study")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (!data?.course || !data?.year_of_study) {
          navigate({ to: "/profile/setup" });
        } else {
          setChecking(false);
        }
      });
  }, [loading, session, navigate]);

  if (loading || checking) return null;

  return (
    <main className="min-h-screen bg-[#EDE8DC] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#3A2410]">Welcome to Kopi Kaki ☕</h1>
        <p className="mt-2 text-[#7A6A55]">You are logged in as {session?.user?.email}</p>
        <button
          onClick={signOut}
          className="mt-6 rounded-full border border-[rgba(92,51,23,0.3)] px-6 py-2 text-sm text-[#5C3317] hover:bg-[#E0D9C8]"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
