import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BottomNav } from "./home";
import { NotificationBell } from "@/components/NotificationBell";
import { SearchButton } from "@/components/SearchButton";
import { ModulePill } from "@/components/ModulePill";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

type Profile = {
  display_name: string | null;
  course: string | null;
  faculty: string | null;
  year_of_study: string | null;
  accommodation: string | null;
  study_style: string | null;
  telegram_handle: string | null;
  bio: string | null;
  email: string | null;
  avatar_url: string | null;
  current_modules: string[] | null;
};

function ProfilePage() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/auth/" }); return; }
    supabase
      .from("profiles")
      .select("display_name, course, faculty, year_of_study, accommodation, study_style, telegram_handle, bio, email, avatar_url, current_modules")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data as Profile); });
  }, [loading, session, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth/" });
  };

  if (loading || !profile) return null;

  const initials = profile.display_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

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

      {/* Centered mobile column */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col gap-4 pb-24">

        <h2 className="text-xs font-medium text-[#7A6A55] uppercase tracking-wide">My profile</h2>

        {/* Profile card */}
        <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] p-4">
          <div className="flex items-center gap-3 mb-3">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#C8B89A] flex items-center justify-center text-lg font-semibold text-[#5C3317] flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#3A2410]">{profile.display_name ?? "Your Name"}</div>
              {profile.telegram_handle && (
                <div className="text-xs text-[#5C3317]">{profile.telegram_handle}</div>
              )}
              <div className="text-xs text-[#7A6A55]">
                {[profile.course, profile.year_of_study, profile.accommodation].filter(Boolean).join(" · ")}
              </div>
            </div>
            <button onClick={() => navigate({ to: "/profile/edit" })} className="text-[#7A6A55] hover:text-[#5C3317]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          </div>

          {profile.bio && (
            <div className="border-t border-[rgba(92,51,23,0.1)] pt-3 mb-3">
              <p className="text-xs text-[#7A6A55] leading-relaxed">{profile.bio}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {(profile.current_modules ?? []).map((code) => (
              <ModulePill key={code} code={code} />
            ))}
            {profile.study_style && (
              <span className="text-[10px] bg-[#D3CFC6] text-[#4A4035] px-2 py-0.5 rounded-full">
                {profile.study_style}
              </span>
            )}
          </div>
        </div>

        {/* Account settings */}
        <h2 className="text-xs font-medium text-[#7A6A55] uppercase tracking-wide">Account</h2>

        <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] overflow-hidden">
          <SettingsRow icon={<UserIcon />} label="Edit profile" onClick={() => navigate({ to: "/profile/edit" })} />
          <SettingsRow icon={<BellIcon />} label="Notification preferences" onClick={() => setShowNotifs(true)} />
          <SettingsRow icon={<ShieldIcon />} label="Profile visibility" onClick={() => setShowPrivacy(true)} />
          <SettingsRow icon={<BlockIcon />} label="Blocked users" onClick={() => setShowBlocked(true)} />
          <SettingsRow icon={<FlagIcon />} label="Report a user" onClick={() => setShowReport(true)} />
          <SettingsRow icon={<InfoIcon />} label="About & Help" onClick={() => setShowAbout(true)} last />
        </div>

        {/* Log out */}
        <div className="text-center py-2">
          <button onClick={handleSignOut} className="text-sm font-medium text-red-600 hover:text-red-700">
            Log out
          </button>
        </div>
      </main>

      {showReport && <ReportModal onClose={() => setShowReport(false)} userId={session!.user.id} />}
      {showNotifs && <NotifPrefsModal onClose={() => setShowNotifs(false)} userId={session!.user.id} />}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} userId={session!.user.id} />}
      {showBlocked && <BlockedUsersModal onClose={() => setShowBlocked(false)} userId={session!.user.id} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      <BottomNav active="profile" />
    </div>
  );
}

function SettingsRow({ icon, label, onClick, last }: {
  icon: React.ReactNode; label: string; onClick: () => void; last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#EDE8DC] transition-colors ${!last ? "border-b border-[rgba(92,51,23,0.1)]" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-[#7A6A55] w-4">{icon}</span>
        <span className="text-sm text-[#3A2410]">{label}</span>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[#7A6A55]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </button>
  );
}

function ReportModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [reportedEmail, setReportedEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reasons = ["Inappropriate bio", "Fake profile", "Harassment", "Other"];

  const submit = async () => {
    if (!reason || !reportedEmail) { toast.error("Please fill in all required fields."); return; }
    setSubmitting(true);
    const { data: reported } = await supabase.from("profiles").select("id").eq("email", reportedEmail).single();
    if (!reported) { toast.error("User not found."); setSubmitting(false); return; }
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId, reported_id: reported.id, reason, description,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted. Thank you!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-[#EDE8DC] rounded-t-3xl w-full max-w-md mx-auto p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-[#3A2410]">Report a user</h3>
        <div>
          <label className="text-xs text-[#7A6A55] mb-1 block">Their NUS email *</label>
          <input className={inp} placeholder="e0XXXXXX@u.nus.edu" value={reportedEmail} onChange={(e) => setReportedEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-[#7A6A55] mb-1 block">Reason *</label>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  reason === r ? "bg-[#5C3317] text-[#FAF6EF] border-[#5C3317]" : "text-[#3A2410] border-[rgba(92,51,23,0.25)]"
                }`}>{r}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-[#7A6A55] mb-1 block">Additional details (optional)</label>
          <textarea className={`${inp} min-h-[80px] resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-[rgba(92,51,23,0.25)] py-3 text-sm text-[#7A6A55]">Cancel</button>
          <button onClick={submit} disabled={submitting} className="flex-1 rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF] disabled:opacity-50">
            {submitting ? "Submitting..." : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? "bg-[#5C3317]" : "bg-[#C8BCA8]"}`}
    >
      <span className={`block w-5 h-5 bg-white rounded-full transition-transform mt-0.5 ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}

function SheetShell({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-[#EDE8DC] rounded-t-3xl w-full max-w-md mx-auto p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div>
          <h3 className="font-semibold text-[#3A2410]">{title}</h3>
          {subtitle && <p className="text-xs text-[#7A6A55] mt-0.5">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

function NotifPrefsModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [reqs, setReqs] = useState(true);
  const [meetups, setMeetups] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("notify_requests, notify_meetups").eq("id", userId).single()
      .then(({ data }) => {
        setReqs(data?.notify_requests ?? true);
        setMeetups(data?.notify_meetups ?? true);
        setLoaded(true);
      });
  }, [userId]);

  const save = async (field: "notify_requests" | "notify_meetups", value: boolean) => {
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", userId);
    if (error) toast.error(error.message);
  };

  return (
    <SheetShell title="Notification preferences" subtitle="Choose what you get notified about." onClose={onClose}>
      {loaded && (
        <>
          <div className="flex items-center justify-between bg-[#E0D9C8] rounded-xl px-4 py-3">
            <div className="text-sm font-medium text-[#3A2410]">Kaki requests</div>
            <Toggle on={reqs} onToggle={() => { const n = !reqs; setReqs(n); save("notify_requests", n); }} />
          </div>
          <div className="flex items-center justify-between bg-[#E0D9C8] rounded-xl px-4 py-3">
            <div className="text-sm font-medium text-[#3A2410]">Kopi Meet-ups</div>
            <Toggle on={meetups} onToggle={() => { const n = !meetups; setMeetups(n); save("notify_meetups", n); }} />
          </div>
          <p className="text-[11px] text-[#7A6A55]">You'll still see updates in-app; this controls the notification bell.</p>
        </>
      )}
    </SheetShell>
  );
}

function PrivacyModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [discoverable, setDiscoverable] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("is_discoverable").eq("id", userId).single()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setDiscoverable(data?.is_discoverable ?? true);
        setLoaded(true);
      });
  }, [userId]);

  const toggleDiscoverability = async () => {
    const next = !discoverable;
    setDiscoverable(next);
    const { error } = await supabase
      .from("profiles")
      .update({ is_discoverable: next })
      .eq("id", userId);
    if (error) {
      setDiscoverable(!next);
      toast.error(error.message);
    }
  };

  return (
    <SheetShell title="Profile visibility" subtitle="Control whether new people can find you." onClose={onClose}>
      {loaded && (
        <>
          <div className="flex items-center justify-between bg-[#E0D9C8] rounded-xl px-4 py-3">
            <div>
              <div className="text-sm font-medium text-[#3A2410]">Appear in Kaki discovery</div>
              <p className="text-xs text-[#7A6A55] mt-0.5">Show your profile in Find Kakis, suggestions, searches, and bidding matches.</p>
            </div>
            <Toggle on={discoverable} onToggle={toggleDiscoverability} />
          </div>
          <p className="text-[11px] text-[#7A6A55]">Turning this off does not remove existing kakis or pending requests.</p>
        </>
      )}
    </SheetShell>
  );
}

type BlockedRow = { id: string; blocked_id: string; name: string };

function BlockedUsersModal({ onClose, userId }: { onClose: () => void; userId: string }) {
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    const { data: blocks } = await supabase
      .from("blocked_users").select("id, blocked_id").eq("blocker_id", userId);
    if (!blocks || blocks.length === 0) { setRows([]); setLoaded(true); return; }
    const ids = blocks.map((b) => b.blocked_id);
    const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
    const nameMap = new Map((profs ?? []).map((p) => [p.id, p.display_name ?? "Unknown"]));
    setRows(blocks.map((b) => ({ id: b.id, blocked_id: b.blocked_id, name: nameMap.get(b.blocked_id) ?? "Unknown" })));
    setLoaded(true);
  };
  useEffect(() => { load(); }, [userId]);

  const unblock = async (rowId: string) => {
    const { error } = await supabase.from("blocked_users").delete().eq("id", rowId);
    if (error) { toast.error(error.message); return; }
    toast.success("User unblocked");
    load();
  };

  return (
    <SheetShell title="Blocked users" subtitle="People you've blocked can't appear as kakis." onClose={onClose}>
      {!loaded ? (
        <p className="text-xs text-[#7A6A55] text-center py-4">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-[#7A6A55] text-center py-6">You haven't blocked anyone.</p>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between bg-[#E0D9C8] rounded-xl px-4 py-3">
            <span className="text-sm text-[#3A2410]">{r.name}</span>
            <button onClick={() => unblock(r.id)} className="text-xs font-medium text-[#5C3317] border border-[rgba(92,51,23,0.3)] rounded-full px-3 py-1.5 hover:bg-[#EDE8DC]">
              Unblock
            </button>
          </div>
        ))
      )}
    </SheetShell>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <SheetShell title="About & Help" onClose={onClose}>
      <div className="flex flex-col gap-3 text-sm text-[#3A2410]">
        <p className="leading-relaxed">
          <span className="font-semibold">Kopi Kaki</span> helps NUS students find study buddies matched by course, modules, and study style. Chiong together, score together. ☕
        </p>
        <div className="bg-[#E0D9C8] rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-[#3A2410] mb-1">How it works</div>
          <ul className="text-xs text-[#7A6A55] leading-relaxed list-disc pl-4 space-y-1">
            <li>Find kakis on the Kakis page and send a request</li>
            <li>Once they accept, contact details are revealed</li>
            <li>Schedule a Kopi Meet-up from My Kakis</li>
            <li>Flag modules you're bidding for to find co-bidders</li>
          </ul>
        </div>
        <div className="bg-[#E0D9C8] rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-[#3A2410] mb-1">Need help?</div>
          <p className="text-xs text-[#7A6A55]">Report inappropriate behaviour via "Report a user". For other issues, contact the Kopi Kaki team.</p>
        </div>
        <p className="text-[11px] text-[#7A6A55] text-center">NUS Orbital 2026 · v1.0</p>
      </div>
      <button onClick={onClose} className="w-full rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF]">Got it</button>
    </SheetShell>
  );
}

const inp = "w-full rounded-xl border border-[rgba(92,51,23,0.2)] bg-[#E0D9C8] px-4 py-2.5 text-sm text-[#3A2410] placeholder:text-[#7A6A55] outline-none focus:ring-2 focus:ring-[#5C3317]/30";

function UserIcon() { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>; }
function ShieldIcon() { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>; }
function FlagIcon() { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21V4m0 0l9-2 9 2v13l-9-2-9 2V4z"/></svg>; }
function BellIcon() { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>; }
function BlockIcon() { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-12.728 12.728M12 22a10 10 0 100-20 10 10 0 000 20z"/></svg>; }
function InfoIcon() { return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
