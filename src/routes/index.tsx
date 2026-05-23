import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMenuItems } from "@/lib/menu";
import { ArrowRight, Coffee, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type SiteContent = {
  hero_eyebrow: string;
  hero_headline: string;
  hero_headline_accent: string;
  hero_subheading: string;
  special_enabled: boolean;
  special_title: string;
  special_description: string;
  special_image_url: string | null;
};

const FALLBACK: SiteContent = {
  hero_eyebrow: "Today's Special Drink",
  hero_headline: "Sea-Salt ",
  hero_headline_accent: "Caramel Latte",
  hero_subheading: "get your salted caramel latte now! meow",
  special_enabled: false,
  special_title: "",
  special_description: "",
  special_image_url: null,
};

async function fetchHomeContent() {
  try {
    const { data } = await supabase
      .from("site_content")
      .select("hero_eyebrow,hero_headline,hero_headline_accent,hero_subheading,special_enabled,special_title,special_description,special_image_url")
      .eq("id", "home")
      .maybeSingle();

    return (data as SiteContent | null) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Menu — RC4 Coffee Academy" },
      { name: "description", content: "Browse our handcrafted espresso menu and place an order." },
    ],
  }),
  component: MenuPage,
});

function MenuPage() {
  const [content, setContent] = useState<SiteContent>(FALLBACK);
  const menuResult = useMenuItems();
  const drinks = menuResult?.items ?? [];

  useEffect(() => {
    const load = () => fetchHomeContent().then((c) => { if (c) setContent(c); });
    load();
    const channel = supabase
      .channel("site-content-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="mb-14 max-w-2xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-primary/70">{content.hero_eyebrow}</p>
        <h1 className="text-5xl font-semibold leading-[1.05] text-foreground sm:text-6xl">
          {content.hero_headline}
          <br />
          <span className="italic text-primary">{content.hero_headline_accent}</span>
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">{content.hero_subheading}</p>
      </section>

      {content.special_enabled && (content.special_title || content.special_description || content.special_image_url) && (
        <section className="mb-12 overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/30">
          <div className="grid gap-0 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="p-6 sm:p-8">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" /> This week's special
              </div>
              {content.special_title && (
                <h2 className="font-display text-3xl font-semibold sm:text-4xl">{content.special_title}</h2>
              )}
              {content.special_description && (
                <p className="mt-2 max-w-xl text-muted-foreground">{content.special_description}</p>
              )}
            </div>
            {content.special_image_url && (
              <img
                src={content.special_image_url}
                alt={content.special_title || "Weekly special"}
                className="h-44 w-full object-cover sm:h-48 sm:w-48 sm:rounded-l-3xl"
              />
            )}
          </div>
        </section>
      )}

      <h2 className="mb-6 text-2xl font-semibold">Our Menu</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {drinks.length === 0 ? (
          <div className="sm:col-span-2 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Menu is being updated. Check back shortly.
          </div>
        ) : drinks.map((d) => (
          <Link
            key={d.id}
            to="/order"
            search={{ drink: d.id }}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Coffee className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-xl font-semibold">{d.name}</h3>
                <span className="font-medium text-primary">${d.price.toFixed(2)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <Link
          to="/order"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Place an order <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
