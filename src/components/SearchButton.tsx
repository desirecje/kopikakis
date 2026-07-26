import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { courseMatchesQuery } from "@/lib/nus-courses";
import { ModulePill } from "@/components/ModulePill";

type Profile = {
  id: string;
  display_name: string | null;
  course: string | null;
  year_of_study: string | null;
  study_style: string | null;
  current_modules: string[] | null;
};

// A search icon that opens an inline overlay to search kakis by name or course.
// Drop <SearchButton /> into any top bar in place of the static magnifier icon.
export function SearchButton() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<Profile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load candidate profiles once when the overlay first opens
  useEffect(() => {
    if (!open || loaded || !session) return;
    supabase
      .from("profiles")
      .select("id, display_name, course, year_of_study, study_style, current_modules")
      .neq("id", session.user.id)
      .eq("is_discoverable", true)
      .not("course", "is", null)
      .limit(100)
      .then(({ data }) => {
        if (data) setAll(data as Profile[]);
        setLoaded(true);
      });
  }, [open, loaded, session]);

  // Focus the input when the overlay opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => { setOpen(false); setQuery(""); };

  const q = query.trim().toLowerCase();
  const results = q
    ? all.filter((p) => {
        const nameMatch = (p.display_name ?? "").toLowerCase().includes(q);
        const courseMatch = courseMatchesQuery(p.course, query);
        const moduleMatch = (p.current_modules ?? []).some((m) => m.toLowerCase().includes(q));
        return nameMatch || courseMatch || moduleMatch;
      })
    : [];

  const goToProfile = () => {
    // Send them to the Kakis page where they can view and connect
    close();
    navigate({ to: "/kakis" });
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-[#5C3317]" aria-label="Search">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-4 px-4" onClick={close}>
          <div
            className="w-full max-w-md bg-[#EDE8DC] rounded-2xl border border-[rgba(92,51,23,0.15)] shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(92,51,23,0.12)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#7A6A55] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search kakis by name, course (e.g. CS), or module"
                className="flex-1 bg-transparent text-sm text-[#3A2410] placeholder:text-[#7A6A55] outline-none"
              />
              <button onClick={close} className="text-[#7A6A55] hover:text-[#3A2410] flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!q ? (
                <div className="px-4 py-8 text-center text-xs text-[#7A6A55]">
                  Start typing to search for kakis.
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-[#7A6A55]">
                  No kakis found for "{query}".
                </div>
              ) : (
                results.map((p) => (
                  <button
                    key={p.id}
                    onClick={goToProfile}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#E0D9C8] transition-colors text-left border-b border-[rgba(92,51,23,0.06)] last:border-0"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#C8B89A] flex items-center justify-center text-xs font-semibold text-[#5C3317] flex-shrink-0">
                      {p.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#3A2410] truncate">{p.display_name ?? "Unknown"}</div>
                      <div className="text-[11px] text-[#7A6A55] truncate">
                        {[p.course, p.year_of_study].filter(Boolean).join(" · ")}
                      </div>
                      {(p.current_modules ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(p.current_modules ?? []).slice(0, 3).map((code) => (
                            <ModulePill key={code} code={code} />
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
