import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Save, Upload, X, Sparkles, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/homepage")({
  head: () => ({ meta: [{ title: "Homepage — RC4 Coffee Academy Admin" }] }),
  component: HomepageEditor,
});

type Form = {
  hero_eyebrow: string;
  hero_headline: string;
  hero_headline_accent: string;
  hero_subheading: string;
  special_enabled: boolean;
  special_title: string;
  special_description: string;
  special_image_url: string | null;
};

function HomepageEditor() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("hero_eyebrow,hero_headline,hero_headline_accent,hero_subheading,special_enabled,special_title,special_description,special_image_url")
      .eq("id", "home")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) { toast.error("Failed to load homepage content"); return; }
        setForm(data as Form);
      });
  }, []);

  const update = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const { error } = await supabase.from("site_content").update(form).eq("id", "home");
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Homepage updated");
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `weekly-special-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("site-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("site-images").getPublicUrl(path);
    update("special_image_url", pub.publicUrl);
    setUploading(false);
    toast.success("Photo uploaded — don't forget to save");
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!form) {
    return <main className="px-4 py-8 text-sm text-muted-foreground">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Homepage</h1>
          <p className="mt-1 text-sm text-muted-foreground">Edit the hero text and weekly special. Changes go live as soon as you save.</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            <Eye className="h-4 w-4" /> Preview
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Hero</h2>
        <p className="mt-1 text-xs text-muted-foreground">The big headline at the top of the homepage.</p>
        <div className="mt-4 space-y-3">
          <Field label="Eyebrow (small caps above headline)">
            <input className={inp} value={form.hero_eyebrow} onChange={(e) => update("hero_eyebrow", e.target.value)} maxLength={80} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Headline (line 1)">
              <input className={inp} value={form.hero_headline} onChange={(e) => update("hero_headline", e.target.value)} maxLength={80} />
            </Field>
            <Field label="Headline accent (line 2, italic)">
              <input className={inp} value={form.hero_headline_accent} onChange={(e) => update("hero_headline_accent", e.target.value)} maxLength={80} />
            </Field>
          </div>
          <Field label="Subheading">
            <textarea className={`${inp} min-h-[80px]`} value={form.hero_subheading} onChange={(e) => update("hero_subheading", e.target.value)} maxLength={300} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Weekly Special
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Show a featured drink banner above the menu.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.special_enabled}
              onChange={(e) => update("special_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span className="font-medium">{form.special_enabled ? "Showing" : "Hidden"}</span>
          </label>
        </div>

        <div className={`mt-4 space-y-3 transition-opacity ${form.special_enabled ? "" : "opacity-50"}`}>
          <Field label="Title">
            <input className={inp} value={form.special_title} onChange={(e) => update("special_title", e.target.value)} maxLength={80} placeholder="e.g. Honey Cinnamon Latte" />
          </Field>
          <Field label="Description">
            <textarea className={`${inp} min-h-[80px]`} value={form.special_description} onChange={(e) => update("special_description", e.target.value)} maxLength={300} placeholder="A short note about this week's drink" />
          </Field>

          <Field label="Photo (optional)">
            {form.special_image_url ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <img src={form.special_image_url} alt="Weekly special" className="h-28 w-28 rounded-xl object-cover" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                  >
                    <Upload className="h-3.5 w-3.5" /> Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => update("special_image_url", null)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:bg-secondary disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload a photo (max 5MB)"}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
          </Field>
        </div>
      </section>
    </main>
  );
}

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none ring-ring/30 focus:ring-2";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
