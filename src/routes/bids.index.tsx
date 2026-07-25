import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BottomNav } from "./home";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchButton } from "@/components/SearchButton";
import { moduleColor } from "@/lib/module-colors";

export const Route = createFileRoute("/bids/")({
  head: () => ({ meta: [{ title: "Module Bidding — Kopi Kaki" }] }),
  component: BidsPage,
});

type Profile = {
  id: string;
  display_name: string | null;
  course: string | null;
  year_of_study: string | null;
};

type MatchedKaki = {
  profile: Profile;
  module_code: string;
  alreadyConnected: boolean;
  requestSent: boolean;
};

function BidsPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [moduleInput, setModuleInput] = useState("");
  const [myBids, setMyBids] = useState<string[]>([]);
  const [matched, setMatched] = useState<MatchedKaki[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/auth/" }); return; }
    loadBids();
  }, [loading, session, navigate]);

  const loadBids = async () => {
    if (!session) return;
    const uid = session.user.id;

    // My bid modules
    const { data: bids } = await supabase
      .from("bid_modules")
      .select("module_code")
      .eq("user_id", uid);
    const myModules = (bids ?? []).map((b) => b.module_code);
    setMyBids(myModules);

    if (myModules.length === 0) { setMatched([]); return; }

    // Other people bidding the same modules
    const { data: others } = await supabase
      .from("bid_modules")
      .select("user_id, module_code")
      .in("module_code", myModules)
      .neq("user_id", uid);

    if (!others || others.length === 0) { setMatched([]); return; }

    // Get their profiles
    const otherIds = [...new Set(others.map((o) => o.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, course, year_of_study")
      .in("id", otherIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));

    // Existing requests / connections
    const { data: reqs } = await supabase
      .from("buddy_requests")
      .select("sender_id, receiver_id, status")
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

    const connectedIds = new Set(
      (reqs ?? []).filter((r) => r.status === "accepted")
        .map((r) => (r.sender_id === uid ? r.receiver_id : r.sender_id))
    );
    const sentIds = new Set(
      (reqs ?? []).filter((r) => r.sender_id === uid).map((r) => r.receiver_id)
    );

    const result: MatchedKaki[] = others
      .map((o) => {
        const profile = profileMap.get(o.user_id);
        if (!profile) return null;
        return {
          profile,
          module_code: o.module_code,
          alreadyConnected: connectedIds.has(o.user_id),
          requestSent: sentIds.has(o.user_id),
        };
      })
      .filter(Boolean) as MatchedKaki[];

    setMatched(result);
  };

  const addModule = async () => {
    if (!session) return;
    const code = moduleInput.trim().toUpperCase();
    if (!code) return;
    if (myBids.includes(code)) { toast.error("Already in your bid list"); return; }
    const { error } = await supabase.from("bid_modules").insert({
      user_id: session.user.id,
      module_code: code,
    });
    if (error) { toast.error(error.message); return; }
    setModuleInput("");
    toast.success(`${code} added to your bid list`);
    loadBids();
  };

  const removeModule = async (code: string) => {
    if (!session) return;
    const { error } = await supabase
      .from("bid_modules")
      .delete()
      .eq("user_id", session.user.id)
      .eq("module_code", code);
    if (error) { toast.error(error.message); return; }
    loadBids();
  };

  const sendRequest = async (receiverId: string) => {
    if (!session) return;
    const { error } = await supabase.from("buddy_requests").insert({
      sender_id: session.user.id,
      receiver_id: receiverId,
      status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Buddy request sent!");
    loadBids();
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[#EDE8DC] flex flex-col">
      {/* Top bar */}
      <header className="bg-[#EDE8DC] border-b border-[rgba(92,51,23,0.12)] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link to="/home" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-[#5C3317] rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 80 80" className="w-5 h-5">
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
          <span className="font-semibold text-[#3A2410] text-base">Kopi Kakis</span>
        </Link>
        <div className="flex items-center gap-4">
          <SearchButton />
          <NotificationBell />
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col gap-5 pb-24">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-[#3A2410]">Module Bidding</h1>
          <p className="text-sm text-[#7A6A55] mt-1">
            Flag modules you plan to bid for. We'll surface kakis with the same plans.
          </p>
        </div>

        {/* Add module */}
        <div>
          <label className="text-sm font-semibold text-[#3A2410] mb-2 block">Add a module to bid</label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-[rgba(92,51,23,0.2)] bg-[#E0D9C8] px-4 py-3 text-sm text-[#3A2410] placeholder:text-[#7A6A55] outline-none focus:ring-2 focus:ring-[#5C3317]/30"
              placeholder="e.g. CS2030S"
              value={moduleInput}
              onChange={(e) => setModuleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addModule(); }}
            />
            <button
              onClick={addModule}
              className="w-12 rounded-xl bg-[#5C3317] flex items-center justify-center text-[#FAF6EF] hover:opacity-90"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Bid list */}
        <div>
          <label className="text-sm font-semibold text-[#3A2410] mb-2 block">Your Bid List</label>
          {myBids.length === 0 ? (
            <p className="text-xs text-[#7A6A55]">No modules added yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {myBids.map((code) => {
                const { bg, text } = moduleColor(code);
                return (
                  <div key={code} className={`flex items-center gap-2 ${bg} ${text} rounded-full px-3 py-1.5 text-xs font-semibold`}>
                    {code}
                    <button onClick={() => removeModule(code)} className="opacity-70 hover:opacity-100">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Matched kakis */}
        <div>
          <label className="text-sm font-semibold text-[#3A2410] mb-2 block">Kakis Bidding the same mods</label>
          {matched.length === 0 ? (
            <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] p-6 text-center">
              <p className="text-sm text-[#7A6A55]">
                {myBids.length === 0
                  ? "Add modules above to find kakis bidding the same ones."
                  : "No kakis bidding the same modules yet."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {matched.map((m, i) => (
                <div key={`${m.profile.id}-${m.module_code}-${i}`} className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#C8B89A] flex items-center justify-center text-sm font-semibold text-[#5C3317]">
                    {m.profile.display_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#3A2410] text-sm">{m.profile.display_name ?? "Unknown"}</div>
                    <div className="text-[11px] text-[#7A6A55] flex items-center gap-1">
                      bidding for
                      <span className={`${moduleColor(m.module_code).bg} ${moduleColor(m.module_code).text} px-1.5 py-0.5 rounded-full font-semibold`}>{m.module_code}</span>
                    </div>
                  </div>
                  {m.alreadyConnected ? (
                    <span className="bg-[#C8D8C0] text-[#274020] text-xs font-medium px-3 py-1.5 rounded-full">Matched</span>
                  ) : m.requestSent ? (
                    <span className="text-[#7A6A55] text-xs px-3 py-1.5">Sent</span>
                  ) : (
                    <button
                      onClick={() => sendRequest(m.profile.id)}
                      className="bg-[#EDE8DC] border border-[rgba(92,51,23,0.25)] text-[#3A2410] text-xs font-medium px-3 py-1.5 rounded-full"
                    >
                      Add Kaki
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav active="bids" />
    </div>
  );
}
