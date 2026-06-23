import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CourseSelect } from "@/components/CourseSelect";

export const Route = createFileRoute("/profile/setup")({
  head: () => ({ meta: [{ title: "Set up your profile — Kopi Kaki" }] }),
  component: ProfileSetupPage,
});

const FACULTIES = ["Computing", "Business", "Engineering", "Science", "Arts & Social Sciences", "Law", "Medicine", "Design & Environment", "Music", "Other"];
const YEARS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5+"];
const ACCOMMODATIONS = ["Tembusu College", "CAPT", "RC4", "RVRC", "Cinnamon College", "King Edward VII Hall", "Eusoff Hall", "Sheares Hall", "Kent Ridge Hall", "Temasek Hall", "PGP", "UTown Residence", "Off-campus"];
const STUDY_STYLES = ["Silent study", "Discussion", "Timed sprints", "Others"];

function ProfileSetupPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    faculty: "",
    course: "",
    year_of_study: "",
    accommodation: "",
    study_style: "",
    telegram_handle: "",
    bio: "",
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  // Pre-fill form with existing profile data for returning users
  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("profiles")
      .select("display_name, faculty, course, year_of_study, accommodation, study_style, telegram_handle, bio")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setForm({
            display_name: data.display_name ?? "",
            faculty: data.faculty ?? "",
            course: data.course ?? "",
            year_of_study: data.year_of_study ?? "",
            accommodation: data.accommodation ?? "",
            study_style: data.study_style ?? "",
            telegram_handle: data.telegram_handle ?? "",
            bio: data.bio ?? "",
          });
        }
      });
  }, [session]);

  const update = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const saveProfile = async () => {
    if (!session?.user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        display_name: form.display_name,
        faculty: form.faculty,
        course: form.course,
        year_of_study: form.year_of_study,
        accommodation: form.accommodation,
        study_style: form.study_style,
        telegram_handle: form.telegram_handle,
        bio: form.bio,
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved!");
    navigate({ to: "/home" });
  };

  if (loading) return null;

  return (
    <main className="min-h-screen bg-[#EDE8DC] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6 gap-1">
          <div className="w-12 h-12 bg-[#5C3317] rounded-xl flex items-center justify-center mb-1">
            <svg viewBox="0 0 80 80" className="w-8 h-8">
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
          <p className="text-sm font-semibold text-[#3A2410]">Set up your profile</p>
          <p className="text-xs text-[#7A6A55]">Step {step} of 2</p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-[#D3CCC0] rounded-full mb-6">
          <div
            className="h-1.5 bg-[#5C3317] rounded-full transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.15)] p-6 flex flex-col gap-4">

          {step === 1 ? (
            <>
              <Field label="Display name">
                <input
                  className={inp}
                  placeholder="e.g. James Lee"
                  value={form.display_name}
                  onChange={(e) => update("display_name", e.target.value)}
                />
              </Field>

              <Field label="Faculty">
                <select className={inp} value={form.faculty} onChange={(e) => update("faculty", e.target.value)}>
                  <option value="">Select faculty</option>
                  {FACULTIES.map((f) => <option key={f}>{f}</option>)}
                </select>
              </Field>

              <Field label="Course / Major">
                <CourseSelect
                  value={form.course}
                  onChange={(c) => update("course", c)}
                />
              </Field>

              <Field label="Year of study">
                <div className="flex gap-2 flex-wrap">
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => update("year_of_study", y)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        form.year_of_study === y
                          ? "bg-[#5C3317] text-[#FAF6EF] border-[#5C3317]"
                          : "bg-transparent text-[#3A2410] border-[rgba(92,51,23,0.25)] hover:bg-[#EDE8DC]"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </Field>

              <button
                type="button"
                disabled={!form.display_name || !form.faculty || !form.course || !form.year_of_study}
                onClick={() => setStep(2)}
                className="w-full rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF] hover:opacity-90 disabled:opacity-40 mt-2"
              >
                Next →
              </button>
            </>
          ) : (
            <>
              <Field label="Accommodation (optional)">
                <select className={inp} value={form.accommodation} onChange={(e) => update("accommodation", e.target.value)}>
                  <option value="">Select accommodation</option>
                  {ACCOMMODATIONS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </Field>

              <Field label="Study style">
                <div className="flex gap-2 flex-wrap">
                  {STUDY_STYLES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update("study_style", s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        form.study_style === s
                          ? "bg-[#5C3317] text-[#FAF6EF] border-[#5C3317]"
                          : "bg-transparent text-[#3A2410] border-[rgba(92,51,23,0.25)] hover:bg-[#EDE8DC]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Telegram handle">
                <input
                  className={inp}
                  placeholder="@username"
                  value={form.telegram_handle}
                  onChange={(e) => update("telegram_handle", e.target.value)}
                />
              </Field>

              <Field label="Short bio (optional)">
                <textarea
                  className={`${inp} min-h-[80px] resize-none`}
                  placeholder="Tell potential kakis a bit about yourself..."
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                  maxLength={200}
                />
              </Field>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-full border border-[rgba(92,51,23,0.25)] py-3 text-sm font-medium text-[#7A6A55] hover:bg-[#EDE8DC]"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={saving || !form.study_style || !form.telegram_handle}
                  className="flex-1 rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF] hover:opacity-90 disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Done →"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

const inp = "w-full rounded-xl border border-[rgba(92,51,23,0.2)] bg-[#EDE8DC] px-4 py-2.5 text-sm text-[#3A2410] placeholder:text-[#7A6A55] outline-none focus:ring-2 focus:ring-[#5C3317]/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[#7A6A55]">{label}</label>
      {children}
    </div>
  );
}
