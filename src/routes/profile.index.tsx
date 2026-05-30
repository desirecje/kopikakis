import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BottomNav } from "./home";

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
};

const MODULE_PILLS = [
  { label: "CS1101S", color: "bg-[#B8E0D2] text-[#1a6b52]" },
  { label: "CS1231S", color: "bg-[#B8E0D2] text-[#1a6b52]" },
  { label: "MA1521",  color: "bg-[#B8E0D2] text-[#1a6b52]" },
  { label: "IS1108",  color: "bg-[#F5D48A] text-[#7A4F00]" },
];

function ProfilePage() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) { navigate({ to: "/auth" }); return; }
    supabase
      .from("profiles")
      .select("display_name, course, faculty, year_of_study, accommodation, study_style, telegram_handle, bio, email")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data as Profile); });
  }, [loading, session, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  if (loading || !profile) return null;

  const initials = profile.display_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

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
          <button className="text-[#5C3317]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 flex flex-col gap-4 pb-24">

        <h2 className="text-xs font-medium text-[#7A6A55] uppercase tracking-wide">My profile</h2>

        {/* Profile card */}
        <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.12)] p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-[#C8B89A] flex items-center justify-center text-lg font-semibold text-[#5C3317] flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#3A2410]">{profile.display_name ?? "Your Name"}</div>
              {profile.telegram_handle && (
                <div className="text-xs text-[#5C3317]">{profile.telegram_handle}</div>
              )}
              <div className="text-xs text-[#7A6A55]">
                {[profile.course, profile.year_of_study, profile.accommodation].filter(Boolean).join(" · ")}
              </div>
            </div>
            <button
              onClick={() => navigate({ to: "/profile/setup" })}
              className="text-[#7A6A55] hover:text-[#5C3317]"
            >
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
          <SettingsRow
            icon={<UserIcon />}
            label="Edit profile"
            onClick={() => navigate({ to: "/profile/setup" })}
          />
          <SettingsRow
            icon={<LockIcon />}
            label="Change password"
            onClick={() => toast.info("Password change coming soon!")}
          />
          <SettingsRow
            icon={<ShieldIcon />}
            label="Privacy settings"
            onClick={() => toast.info("Privacy settings coming soon!")}
          />
          <SettingsRow
            icon={<FlagIcon />}
            label="Report a user"
            onClick={() => setShowReport(true)}
            last
          />
        </div>

        {/* Log out */}
        <div className="text-center py-2">
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-red-600 hover:text-red-700"
          >
            Log out
          </button>
        </div>
      </main>

      {/* Report modal */}
      {showReport && (
        <ReportModal onClose={() => setShowReport(false)} userId={session!.user.id} />
      )}

      <BottomNav active="profile" />
    </div>
  );
}

function SettingsRow({ icon, label, onClick, last }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  last?: boolean;
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
    const { data: reported } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", reportedEmail)
      .single();
    if (!reported) { toast.error("User not found."); setSubmitting(false); return; }
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      reported_id: reported.id,
      reason,
      description,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted. Thank you!");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50" onClick={onClose}>
      <div className="bg-[#EDE8DC] rounded-t-3xl w-full p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-[#3A2410]">Report a user</h3>

        <div>
          <label className="text-xs text-[#7A6A55] mb-1 block">Their NUS email *</label>
          <input
            className={inp}
            placeholder="e0XXXXXX@u.nus.edu"
            value={reportedEmail}
            onChange={(e) => setReportedEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-[#7A6A55] mb-1 block">Reason *</label>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  reason === r
                    ? "bg-[#5C3317] text-[#FAF6EF] border-[#5C3317]"
                    : "bg-transparent text-[#3A2410] border-[rgba(92,51,23,0.25)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[#7A6A55] mb-1 block">Additional details (optional)</label>
          <textarea
            className={`${inp} min-h-[80px] resize-none`}
            placeholder="Describe what happened..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-[rgba(92,51,23,0.25)] py-3 text-sm text-[#7A6A55]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF] disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-xl border border-[rgba(92,51,23,0.2)] bg-[#E0D9C8] px-4 py-2.5 text-sm text-[#3A2410] placeholder:text-[#7A6A55] outline-none focus:ring-2 focus:ring-[#5C3317]/30";

function UserIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>;
}
function LockIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>;
}
function ShieldIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>;
}
function FlagIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21V4m0 0l9-2 9 2v13l-9-2-9 2V4z"/></svg>;
}
