import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";
import { notify } from "@/lib/notify";

export const Route = createFileRoute("/home")({
  component: HomePage,
});

type Profile = {
  id: string;
  display_name: string | null;
  course: string | null;
  year_of_study: string | null;
  accommodation: string | null;
  study_style: string | null;
};

type Meetup = {
  id: string;
  organiser_id: string;
  invitee_id: string;
  title: string;
  location: string | null;
  meet_at: string;
  status: string;
  otherName: string;
  isInvitee: boolean;
};

function HomePage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [suggested, setSuggested] = useState<Profile[]>([]);
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/auth/" }); return; }

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
          loadSuggested();
          loadMeetups();
        }
      });
  }, [loading, session, navigate]);

  const loadSuggested = async () => {
    if (!session) return;
    const uid = session.user.id;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, course, year_of_study, accommodation, study_style")
      .neq("id", uid)
      .not("course", "is", null)
      .limit(4);
    if (data) setSuggested(data as Profile[]);

    // Track who we've already sent requests to
    const { data: reqs } = await supabase
      .from("buddy_requests")
      .select("receiver_id")
      .eq("sender_id", uid);
    setSentIds(new Set((reqs ?? []).map((r) => r.receiver_id)));
  };

  const quickAdd = async (receiverId: string) => {
    if (!session) return;
    const { error } = await supabase.from("buddy_requests").insert({
      sender_id: session.user.id,
      receiver_id: receiverId,
      status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Kaki request sent!");
    setSentIds((prev) => new Set(prev).add(receiverId));
    // Notify the receiver
    const myName = session.user.email?.split("@")[0] ?? "Someone";
    await notify({
      userId: receiverId,
      actorId: session.user.id,
      type: "request",
      message: `${myName} sent you a kaki request!`,
    });
  };

  const cancelRequest = async (receiverId: string) => {
    if (!session) return;
    const { error } = await supabase
      .from("buddy_requests")
      .delete()
      .eq("sender_id", session.user.id)
      .eq("receiver_id", receiverId)
      .eq("status", "pending");
    if (error) { toast.error(error.message); return; }
    toast.success("Request cancelled");
    setSentIds((prev) => {
      const next = new Set(prev);
      next.delete(receiverId);
      return next;
    });
  };

  const loadMeetups = async () => {
    if (!session) return;
    const uid = session.user.id;
    const { data: rows } = await supabase
      .from("meetups")
      .select("id, organiser_id, invitee_id, title, location, meet_at, status")
      .or(`organiser_id.eq.${uid},invitee_id.eq.${uid}`)
      .gte("meet_at", new Date().toISOString())
      .order("meet_at", { ascending: true });

    if (!rows) { setMeetups([]); return; }

    // Resolve the "other person" name for each
    const otherIds = [...new Set(rows.map((r) => (r.organiser_id === uid ? r.invitee_id : r.organiser_id)))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", otherIds);
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "Unknown"]));

    setMeetups(rows.map((r) => ({
      ...r,
      otherName: nameMap.get(r.organiser_id === uid ? r.invitee_id : r.organiser_id) ?? "Unknown",
      isInvitee: r.invitee_id === uid,
    })));
  };

  const respondMeetup = async (m: Meetup, accept: boolean) => {
    if (!session) return;
    const { error } = await supabase
      .from("meetups")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? "Meet-up confirmed! ☕" : "Meet-up declined");

    // Notify the organiser
    const myName = session.user.email?.split("@")[0] ?? "Someone";
    await notify({
      userId: m.organiser_id,
      actorId: session.user.id,
      type: accept ? "meetup_accepted" : "meetup_declined",
      message: `${myName} ${accept ? "accepted" : "declined"} your Kopi Meet-up: ${m.title}`,
    });
    loadMeetups();
  };

  if (loading || checking) return null;

  // Group meet-ups by day label
  const fmtDay = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  };
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-[#EDE8DC] flex flex-col">
      {/* Top bar */}
      <header className="bg-[#EDE8DC] border-b border-[rgba(92,51,23,0.12)] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
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
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[#5C3317]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
            </svg>
          </button>
          <NotificationBell />
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col gap-5 pb-24">

        {/* Kopi Meet-ups */}
        <section>
          <h2 className="font-semibold text-[#3A2410] text-sm mb-2">Kopi Meet-ups</h2>
          <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] p-4 flex flex-col gap-3">
            {meetups.length === 0 ? (
              <div className="flex items-center gap-2">
                <div className="w-1 h-8 bg-[#5C3317] rounded-full"/>
                <div>
                  <div className="text-sm font-medium text-[#3A2410]">No meet-ups yet</div>
                  <div className="text-xs text-[#7A6A55]">Connect with kakis to plan one!</div>
                </div>
              </div>
            ) : (
              meetups.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="w-1 self-stretch bg-[#5C3317] rounded-full min-h-[2.5rem]"/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-[#3A2410]">{m.title}</div>
                      <div className="text-xs font-medium text-[#3A2410] whitespace-nowrap">
                        {fmtDay(m.meet_at)} · {fmtTime(m.meet_at)}
                      </div>
                    </div>
                    <div className="text-xs text-[#7A6A55]">
                      with {m.otherName}{m.location ? ` · ${m.location}` : ""}
                    </div>

                    {/* Status / actions */}
                    {m.status === "pending" && m.isInvitee ? (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => respondMeetup(m, true)} className="flex-1 bg-[#C8D8C0] text-[#274020] rounded-full py-1.5 text-xs font-semibold">Accept</button>
                        <button onClick={() => respondMeetup(m, false)} className="flex-1 bg-[#D98A8A] text-[#5c1f1f] rounded-full py-1.5 text-xs font-semibold">Decline</button>
                      </div>
                    ) : m.status === "pending" ? (
                      <div className="text-[11px] text-[#7A6A55] mt-1 italic">Waiting for {m.otherName} to respond…</div>
                    ) : m.status === "accepted" ? (
                      <span className="inline-block mt-1.5 bg-[#C8D8C0] text-[#274020] text-[10px] font-medium px-2 py-0.5 rounded-full">Confirmed ✓</span>
                    ) : (
                      <span className="inline-block mt-1.5 bg-[#E0D0D0] text-[#7a3030] text-[10px] font-medium px-2 py-0.5 rounded-full">Declined</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Suggested Kakis */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-[#3A2410] text-sm">Suggested Kakis</h2>
            <Link to="/kakis" className="text-xs text-[#5C3317] font-medium">See all</Link>
          </div>
          {suggested.length === 0 ? (
            <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] p-6 text-center">
              <p className="text-sm text-[#7A6A55]">No kakis yet — be the first to sign up!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {suggested.map((p) => (
                <div key={p.id} className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#C8B89A] flex items-center justify-center text-xs font-semibold text-[#5C3317]">
                      {p.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#3A2410] truncate">{p.display_name ?? "Unknown"}</div>
                      <div className="text-[10px] text-[#7A6A55] truncate">{p.course} · {p.year_of_study}</div>
                    </div>
                  </div>
                  {p.study_style && (
                    <span className="text-[10px] bg-[#D3CFC6] text-[#4A4035] px-2 py-0.5 rounded-full w-fit">{p.study_style}</span>
                  )}
                  {sentIds.has(p.id) ? (
                    <button
                      onClick={() => cancelRequest(p.id)}
                      className="w-full rounded-full border border-[rgba(92,51,23,0.3)] py-1.5 text-xs font-semibold text-[#7A6A55] hover:bg-[#EDE8DC]"
                    >
                      Cancel request
                    </button>
                  ) : (
                    <button
                      onClick={() => quickAdd(p.id)}
                      className="w-full rounded-full bg-[#5C3317] py-1.5 text-xs font-semibold text-[#FAF6EF] hover:opacity-90"
                    >
                      Quick Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav active="home" />
    </div>
  );
}

export function BottomNav({ active }: { active: "home" | "kakis" | "bids" | "profile" }) {
  const tabs = [
    { key: "home", label: "Home", to: "/home", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/>
      </svg>
    )},
    { key: "kakis", label: "Kakis", to: "/kakis", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m0 0a4 4 0 118 0m-8 0A4 4 0 019 12a4 4 0 014 4"/>
      </svg>
    )},
    { key: "bids", label: "Bids", to: "/bids", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
    )},
    { key: "profile", label: "Profile", to: "/profile", icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
      </svg>
    )},
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#E0D9C8] border-t border-[rgba(92,51,23,0.12)] flex justify-around py-2 pb-4">
      {tabs.map((t) => (
        <Link
          key={t.key}
          to={t.to}
          className={`flex flex-col items-center gap-0.5 px-4 py-1 ${active === t.key ? "text-[#5C3317]" : "text-[#7A6A55]"}`}
        >
          {t.icon}
          <span className="text-[10px] font-medium">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
