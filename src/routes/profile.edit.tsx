import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CourseSelect } from "@/components/CourseSelect";
import { ModulePillRemovable } from "@/components/ModulePill";

export const Route = createFileRoute("/profile/edit")({
  head: () => ({ meta: [{ title: "Edit profile — Kopi Kaki" }] }),
  component: EditProfilePage,
});

const FACULTIES = ["Computing", "Business", "Engineering", "Science", "Arts & Social Sciences", "Law", "Medicine", "Design & Environment", "Music", "Other"];
const YEARS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5+"];
const ACCOMMODATIONS = ["Tembusu College", "CAPT", "RC4", "RVRC", "Cinnamon College", "King Edward VII Hall", "Eusoff Hall", "Sheares Hall", "Kent Ridge Hall", "Temasek Hall", "PGP", "UTown Residence", "Off-campus"];
const STUDY_STYLES = ["Silent study", "Discussion", "Timed sprints", "Others"];

function EditProfilePage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [moduleInput, setModuleInput] = useState("");

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

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth/" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from("profiles")
      .select("display_name, faculty, course, year_of_study, accommodation, study_style, telegram_handle, bio, avatar_url, current_modules")
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
          setAvatarUrl(data.avatar_url ?? null);
          setModules((data.current_modules as string[]) ?? []);
        }
      });
  }, [session]);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const addModule = () => {
    const code = moduleInput.trim().toUpperCase();
    if (!code) return;
    if (modules.includes(code)) { toast.error("Already added"); return; }
    setModules((m) => [...m, code]);
    setModuleInput("");
  };

  const removeModule = (code: string) => setModules((m) => m.filter((c) => c !== code));

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(pub.publicUrl);
    setUploading(false);
    toast.success("Photo uploaded — don't forget to save!");
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    if (!session?.user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        ...form,
        avatar_url: avatarUrl,
        current_modules: modules,
        updated_at: new Date().toISOString(),
      });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated!");
    navigate({ to: "/profile" });
  };

  if (loading) return null;

  const initials = form.display_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  return (
    <main className="min-h-screen bg-[#EDE8DC] flex justify-center px-4 py-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate({ to: "/profile" })} className="text-[#7A6A55] hover:text-[#3A2410]">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="text-lg font-bold text-[#3A2410]">Edit profile</h1>
        </div>

        {/* Avatar uploader */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-[#5C3317]" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#C8B89A] flex items-center justify-center text-2xl font-semibold text-[#5C3317]">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#5C3317] rounded-full flex items-center justify-center border-2 border-[#EDE8DC] disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#FAF6EF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </button>
          </div>
          <p className="text-xs text-[#7A6A55]">{uploading ? "Uploading..." : "Tap to change photo"}</p>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
        </div>

        {/* Form */}
        <div className="bg-[#E0D9C8] rounded-2xl border border-[rgba(92,51,23,0.15)] p-5 flex flex-col gap-4">
          <Field label="Display name">
            <input className={inp} value={form.display_name} onChange={(e) => update("display_name", e.target.value)} />
          </Field>

          <Field label="Course / Major">
            <CourseSelect value={form.course} onChange={(c) => update("course", c)} />
          </Field>

          <Field label="Faculty">
            <select className={inp} value={form.faculty} onChange={(e) => update("faculty", e.target.value)}>
              <option value="">Select faculty</option>
              {FACULTIES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Field>

          <Field label="Year of study">
            <div className="flex gap-2 flex-wrap">
              {YEARS.map((y) => (
                <button key={y} type="button" onClick={() => update("year_of_study", y)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    form.year_of_study === y ? "bg-[#5C3317] text-[#FAF6EF] border-[#5C3317]" : "text-[#3A2410] border-[rgba(92,51,23,0.25)]"
                  }`}>{y}</button>
              ))}
            </div>
          </Field>

          {/* Current modules editor */}
          <Field label="Current modules">
            <div className="flex gap-2">
              <input
                className={inp}
                placeholder="e.g. CS2030S"
                value={moduleInput}
                onChange={(e) => setModuleInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addModule(); } }}
              />
              <button type="button" onClick={addModule} className="w-11 rounded-xl bg-[#5C3317] flex items-center justify-center text-[#FAF6EF] flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
              </button>
            </div>
            {modules.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {modules.map((code) => (
                  <ModulePillRemovable key={code} code={code} onRemove={() => removeModule(code)} />
                ))}
              </div>
            )}
          </Field>

          <Field label="Accommodation">
            <select className={inp} value={form.accommodation} onChange={(e) => update("accommodation", e.target.value)}>
              <option value="">Select accommodation</option>
              {ACCOMMODATIONS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>

          <Field label="Study style">
            <div className="flex gap-2 flex-wrap">
              {STUDY_STYLES.map((s) => (
                <button key={s} type="button" onClick={() => update("study_style", s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    form.study_style === s ? "bg-[#5C3317] text-[#FAF6EF] border-[#5C3317]" : "text-[#3A2410] border-[rgba(92,51,23,0.25)]"
                  }`}>{s}</button>
              ))}
            </div>
          </Field>

          <Field label="Telegram handle">
            <input className={inp} placeholder="@username" value={form.telegram_handle} onChange={(e) => update("telegram_handle", e.target.value)} />
          </Field>

          <Field label="Bio">
            <textarea className={`${inp} min-h-[80px] resize-none`} maxLength={200} value={form.bio} onChange={(e) => update("bio", e.target.value)} />
          </Field>

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-full bg-[#5C3317] py-3 text-sm font-semibold text-[#FAF6EF] hover:opacity-90 disabled:opacity-50 mt-2"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
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
