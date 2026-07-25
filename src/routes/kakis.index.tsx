import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BottomNav } from "./home";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchButton } from "@/components/SearchButton";
import { ModulePill } from "@/components/ModulePill";
import { courseMatchesQuery } from "@/lib/nus-courses";
import { MeetupModal } from "@/components/MeetupModal";
import { notify } from "@/lib/notify";

export const Route = createFileRoute("/kakis/")({
  head: () => ({ meta: [{ title: "Find Kakis — Kopi Kaki" }] }),
  component: KakisPage,
});

type Profile = {
  id: string;
  display_name: string | null;
  course: string | null;
  faculty: string | null;
  year_of_study: string | null;
  accommodation: string | null;
  study_style: string | null;
  telegram_handle: string | null;
  bio: string | null;
  current_modules: string[] | null;
};

type BuddyRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
};

function KakisPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"find" | "my">("find");
  const [subTab, setSubTab] = useState<"around" | "requests">("around");
  const [courseQuery, setCourseQuery] = useState("");

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<(BuddyRequest & { profile: Profile })[]>([]);
  const [connected, setConnected] = useState<Profile[]>([]);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<Profile | null>(null);
  const [myModules, setMyModules] = useState<string[]>([]);
  const [meetupTarget, setMeetupTarget] = useState<Profile | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/auth/" }); return; }
    loadData();
  }, [loading, session, navigate]);

  const loadData = async () => {
    if (!session) return;
    const uid = session.user.id;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, course, faculty, year_of_study, accommodation, study_style, telegram_handle, bio, current_modules")
      .neq("id", uid)
      .not("course", "is", null);

    // My own current modules (for shared-module scoring)
    const { data: me } = await supabase
      .from("profiles")
      .select("current_modules")
      .eq("id", uid)
      .single();
    setMyModules((me?.current_modules as string[]) ?? []);

    const { data: reqs } = await supabase
      .from("buddy_requests")
      .select("id, sender_id, receiver_id, status")
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p as Profile]));

    const incoming = (reqs ?? [])
      .filter((r) => r.receiver_id === uid && r.status === "pending")
      .map((r) => ({ ...r, profile: profileMap.get(r.sender_id)! }))
      .filter((r) => r.profile);

    const acceptedIds = (reqs ?? [])
      .filter((r) => r.status === "accepted")
      .map((r) => (r.sender_id === uid ? r.receiver_id : r.sender_id));
    const connectedProfiles = acceptedIds.map((id) => profileMap.get(id)).filter(Boolean) as Profile[];

    const sent = new Set(
      (reqs ?? []).filter((r) => r.sender_id === uid).map((r) => r.receiver_id)
    );

    setAllProfiles((profiles ?? []) as Profile[]);
    setRequests(incoming as (BuddyRequest & { profile: Profile })[]);
    setConnected(connectedProfiles);
    setConnectedIds(new Set(acceptedIds));
    setSentIds(sent);
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

  const respondRequest = async (requestId: string, accept: boolean, senderId?: string) => {
    const { error } = await supabase
      .from("buddy_requests")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("id", requestId);
    if (error) { toast.error(error.message); return; }

    // If accepted, clean up any reciprocal pending request between the two users
    // (e.g. I also sent them a request earlier) so it doesn't linger as "pending"
    if (accept && senderId && session) {
      await supabase
        .from("buddy_requests")
        .delete()
        .eq("sender_id", session.user.id)
        .eq("receiver_id", senderId)
        .eq("status", "pending");
    }

    toast.success(accept ? "Kaki added!" : "Request declined");
    // Notify the sender if accepted
    if (accept && senderId && session) {
      const myName = session.user.email?.split("@")[0] ?? "Someone";
      await notify({
        userId: senderId,
        actorId: session.user.id,
        type: "request_accepted",
        message: `${myName} accepted your kaki request! ☕`,
      });
    }
    loadData();
  };

  if (loading) return null;

  const filtered = allProfiles
    .filter((p) => !connectedIds.has(p.id))            // hide people you're already kakis with
    .filter((p) => courseMatchesQuery(p.course, courseQuery));

  const sharedModules = (p: Profile) => {
    const theirs = p.current_modules ?? [];
    return theirs.filter((m) => myModules.includes(m));
  };

  const scoreFor = (p: Profile) => {
    let score = 50;
    const shared = sharedModules(p).length;
    score += Math.min(shared * 12, 36); // up to +36 for shared modules
    if (p.study_style) score += 8;
    if (p.accommodation) score += 6;
    return Math.min(99, score);
  };

  // Colour the compatibility badge: green (high), brown (mid), red (low < 25)


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

      {/* Find / My Kakis tabs */}
      <div className="flex border-b border-[rgba(92,51,23,0.12)] bg-[#EDE8DC]">
        <button
          onClick={() => setTab("find")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === "find" ? "text-[#3A2410] border-b-2 border-[#5C3317]" : "text-[#7A6A55]"
          }`}
        >
          Find Kakis
        </button>
        <button
          onClick={() => setTab("my")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${
            tab === "my" ? "text-[#3A2410] border-b-2 border-[#5C3317]" : "text-[#7A6A55]"
          }`}
        >
          My Kakis
        </button>
      </div>

      <main className="flex-1 px-4 py-4 flex flex-col gap-3 pb-24">

        {tab === "find" ? (
          <>
            {/* Course search filter */}
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#7A6A55] absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <input
                type="text"
                placeholder="Filter by course (e.g. Computer Science)"
                value={courseQuery}
                onChange={(e) => setCourseQuery(e.target.value)}
                className="w-full rounded-xl border border-[rgba(92,51,23,0.2)] bg-[#E0D9C8] pl-9 pr-9 py-2.5 text-sm text-[#3A2410] placeholder:text-[#7A6A55] outline-none focus:ring-2 focus:ring-[#5C3317]/30"
              />
              {courseQuery && (
                <button
                  onClick={() => setCourseQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A6A55] hover:text-[#3A2410]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Around / Requests sub-toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setSubTab("around")}
                className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  subTab === "around" ? "bg-[#5C3317] text-[#FAF6EF]" : "bg-[#E0D9C8] text-[#3A2410] border border-[rgba(92,51,23,0.2)]"
                }`}
              >
                Kakis around
              </button>
              <button
                onClick={() => setSubTab("requests")}
                className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  subTab === "requests" ? "bg-[#5C3317] text-[#FAF6EF]" : "bg-[#E0D9C8] text-[#3A2410] border border-[rgba(92,51,23,0.2)]"
                }`}
              >
                Requests ({requests.length})
              </button>
            </div>

            {subTab === "around" ? (
              filtered.length === 0 ? (
                <EmptyState text="No kakis found. Try a different course!" />
              ) : (
                filtered.map((p) => (
                  <DiscoverCard
                    key={p.id}
                    profile={p}
                    score={scoreFor(p)}
                    shared={sharedModules(p)}
                    alreadySent={sentIds.has(p.id)}
                    onAdd={() => sendRequest(p.id)}
                    onCancel={() => cancelRequest(p.id)}
                    onView={() => setViewing(p)}
                  />
                ))
              )
            ) : (
              requests.length === 0 ? (
                <EmptyState text="No pending requests right now." />
              ) : (
                requests.map((r) => (
                  <RequestCard
                    key={r.id}
                    profile={r.profile}
                    score={scoreFor(r.profile)}
                    onAccept={() => respondRequest(r.id, true, r.profile.id)}
                    onReject={() => respondRequest(r.id, false)}
                    onView={() => setViewing(r.profile)}
                  />
                ))
              )
            )}
          </>
        ) : (
          connected.length === 0 ? (
            <EmptyState text="No kakis yet. Send some requests to connect!" />
          ) : (
            connected.map((p) => <ConnectedCard key={p.id} profile={p} onView={() => setViewing(p)} onMeetup={() => setMeetupTarget(p)} />)
          )
        )}
      </main>

      {/* Meet-up modal */}
      {meetupTarget && (
        <MeetupModal
          inviteeId={meetupTarget.id}
          inviteeName={meetupTarget.display_name ?? "your kaki"}
          onClose={() => setMeetupTarget(null)}
        />
      )}

      {/* View profile modal */}
      {viewing && (
        <ProfileModal
          profile={viewing}
          isConnected={connected.some((c) => c.id === viewing.id)}
          onClose={() => setViewing(null)}
        />
      )}

      <BottomNav active="kakis" />
    </div>
  );
}

function Avatar({ name, size = "md" }: { name: string | null; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16 text-xl" : "w-11 h-11 text-sm";
  return (
    <div className={`${dim} rounded-full bg-[#C8B89A] flex items-center justify-center font-semibold text-[#5C3317] flex-shrink-0`}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function MetaLine({ profile }: { profile: Profile }) {
  return (
    <div className="text-[11px] text-[#7A6A55]">
      {[profile.course, profile.year_of_study, profile.accommodation].filter(Boolean).join(" · ")}
    </div>
  );
}

function StylePill({ style }: { style: string | null }) {
  if (!style) return null;
  return <span className="text-[10px] bg-[#D3CFC6] text-[#4A4035] px-2 py-0.5 rounded-full">{style}</span>;
}

// Returns Tailwind classes for the compatibility badge based on the score.
// >= 60 green, 25-59 brown, < 25 red.
function scoreBadgeClass(score: number): string {
  if (score >= 60) return "bg-[#C8D8C0] text-[#274020]";      // green
  if (score >= 25) return "bg-[#5C3317] text-[#FAF6EF]";      // brown
  return "bg-[#D98A8A] text-[#5c1f1f]";                        // red
}

function DiscoverCard({ profile, score, shared, alreadySent, onAdd, onCancel, onView }: {
  profile: Profile; score: number; shared: string[]; alreadySent: boolean; onAdd: () => void; onCancel: () => void; onView: () => void;
}) {
  return (
    <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] p-4">
      <div className="flex items-center gap-3">
        <Avatar name={profile.display_name} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[#3A2410] text-sm">{profile.display_name ?? "Unknown"}</div>
          <MetaLine profile={profile} />
        </div>
        <span className={`${scoreBadgeClass(score)} text-xs font-semibold px-2.5 py-1 rounded-full`}>{score}%</span>
      </div>
      {shared.length > 0 && (
        <div className="text-[10px] text-[#1a6b52] font-medium mt-2">
          ☕ You both take {shared.join(", ")}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {(profile.current_modules ?? []).slice(0, 4).map((code) => (
          <ModulePill key={code} code={code} />
        ))}
        <StylePill style={profile.study_style} />
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onView} className="flex-1 bg-[#EDE8DC] border border-[rgba(92,51,23,0.2)] rounded-full py-2 text-xs font-medium text-[#3A2410]">
          View Profile
        </button>
        {alreadySent ? (
          <button
            onClick={onCancel}
            className="flex-1 border border-[rgba(92,51,23,0.3)] rounded-full py-2 text-xs font-semibold text-[#7A6A55] hover:bg-[#EDE8DC]"
          >
            Cancel request
          </button>
        ) : (
          <button
            onClick={onAdd}
            className="flex-1 bg-[#5C3317] rounded-full py-2 text-xs font-semibold text-[#FAF6EF]"
          >
            Add Kaki
          </button>
        )}
      </div>
    </div>
  );
}

function RequestCard({ profile, score, onAccept, onReject, onView }: {
  profile: Profile; score: number; onAccept: () => void; onReject: () => void; onView: () => void;
}) {
  return (
    <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] p-4">
      <div className="flex items-center gap-3 cursor-pointer" onClick={onView}>
        <Avatar name={profile.display_name} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[#3A2410] text-sm">{profile.display_name ?? "Unknown"}</div>
          <MetaLine profile={profile} />
        </div>
        <span className={`${scoreBadgeClass(score)} text-xs font-semibold px-2.5 py-1 rounded-full`}>{score}%</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <StylePill style={profile.study_style} />
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onAccept} className="flex-1 bg-[#C8D8C0] text-[#274020] rounded-full py-2 text-xs font-semibold">
          Accept
        </button>
        <button onClick={onReject} className="flex-1 bg-[#D98A8A] text-[#5c1f1f] rounded-full py-2 text-xs font-semibold">
          Reject
        </button>
      </div>
    </div>
  );
}

function ConnectedCard({ profile, onView, onMeetup }: { profile: Profile; onView: () => void; onMeetup: () => void }) {
  return (
    <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] p-4">
      <div className="flex items-center gap-3 cursor-pointer" onClick={onView}>
        <Avatar name={profile.display_name} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[#3A2410] text-sm">{profile.display_name ?? "Unknown"}</div>
          {profile.telegram_handle && (
            <div className="text-[11px] text-[#5C3317]">{profile.telegram_handle}</div>
          )}
          <MetaLine profile={profile} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <StylePill style={profile.study_style} />
      </div>
      <button onClick={onMeetup} className="w-full bg-[#5C3317] rounded-full py-2 text-xs font-semibold text-[#FAF6EF] mt-3">
        Kopi Meet-up
      </button>
    </div>
  );
}

function ProfileModal({ profile, isConnected, onClose }: {
  profile: Profile; isConnected: boolean; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-[#EDE8DC] rounded-t-3xl w-full p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Drag handle */}
        <div className="w-10 h-1 bg-[rgba(92,51,23,0.2)] rounded-full mx-auto" />

        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar name={profile.display_name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg text-[#3A2410]">{profile.display_name ?? "Unknown"}</div>
            {isConnected && profile.telegram_handle && (
              <div className="text-sm text-[#5C3317]">{profile.telegram_handle}</div>
            )}
            <div className="text-xs text-[#7A6A55] mt-0.5">
              {[profile.course, profile.year_of_study].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-3 border-t border-[rgba(92,51,23,0.1)] pt-4">
          {(profile.current_modules ?? []).length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[#7A6A55] mb-1.5">Current modules</div>
              <div className="flex flex-wrap gap-1.5">
                {(profile.current_modules ?? []).map((code) => (
                  <ModulePill key={code} code={code} />
                ))}
              </div>
            </div>
          )}
          {profile.bio && (
            <DetailRow label="Bio" value={profile.bio} />
          )}
          {profile.faculty && <DetailRow label="Faculty" value={profile.faculty} />}
          {profile.accommodation && <DetailRow label="Accommodation" value={profile.accommodation} />}
          {profile.study_style && <DetailRow label="Study style" value={profile.study_style} />}
          {isConnected && profile.telegram_handle ? (
            <DetailRow label="Telegram" value={profile.telegram_handle} />
          ) : (
            !isConnected && (
              <div className="bg-[#E0D9C8] rounded-xl p-3 text-xs text-[#7A6A55] text-center">
                🔒 Connect as kakis to see contact details
              </div>
            )
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF] mt-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-[#7A6A55] mb-0.5">{label}</div>
      <div className="text-sm text-[#3A2410]">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] p-8 text-center mt-2">
      <p className="text-sm text-[#7A6A55]">{text}</p>
    </div>
  );
}
