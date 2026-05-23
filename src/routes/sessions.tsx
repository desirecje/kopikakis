import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Calendar, Users, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Weekly Sessions — RC4 Coffee Academy" },
      { name: "description", content: "Reserve a seat at one of our weekly sessions." },
    ],
  }),
  component: SessionsPage,
});

type Session = { id: string; label: string; session_date: string; week_number: number; year: number; max_capacity: number; special_drink: string; signups_locked: boolean };
type MySignup = { id: string; session_id: string; telegram_handle: string; status: string; session_year: number; session_week: number };
type SeatCount = { session_id: string; accepted_count: number; total_count: number };
type LockoutWeek = { year: number; week: number };

const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  telegram_handle: z
    .string()
    .trim()
    .min(1, "Enter your Telegram handle")
    .max(40)
    .transform((v) => v.replace(/^@+/, ""))
    .pipe(
      z
        .string()
        .min(1, "Enter your Telegram handle")
        .regex(/^[A-Za-z0-9_]+$/, "Invalid Telegram handle")
    )
    .transform((v) => "@" + v),
});

function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [seatCounts, setSeatCounts] = useState<SeatCount[]>([]);
  const [mySignups, setMySignups] = useState<MySignup[]>([]);
  const [lockouts, setLockouts] = useState<LockoutWeek[]>([]);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedName = localStorage.getItem("rc4_name") ?? "";
      const savedHandle = localStorage.getItem("rc4_handle") ?? "";
      if (savedName) setName(savedName);
      if (savedHandle) setHandle(savedHandle);
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem("rc4_name", name); } catch {} }, [name]);
  useEffect(() => { try { localStorage.setItem("rc4_handle", handle); } catch {} }, [handle]);

  const normHandle = useMemo(() => handle.trim().replace(/^@/, "").toLowerCase(), [handle]);

  const loadPublic = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [s1, c1] = await Promise.all([
      supabase.from("sessions").select("*").eq("published", true).gte("session_date", today).order("session_date"),
      supabase.rpc("get_session_seat_counts"),
    ]);
    setSessions((s1.data ?? []) as Session[]);
    setSeatCounts((c1.data ?? []) as SeatCount[]);
    setLoading(false);
  }, []);

  const loadMine = useCallback(async () => {
    if (!normHandle) { setMySignups([]); setLockouts([]); return; }
    const [m1, l1] = await Promise.all([
      supabase.rpc("get_my_signups", { _handle: normHandle }),
      supabase.rpc("get_my_lockout_weeks", { _handle: normHandle }),
    ]);
    setMySignups((m1.data ?? []) as MySignup[]);
    setLockouts((l1.data ?? []) as LockoutWeek[]);
  }, [normHandle]);

  useEffect(() => {
    loadPublic();
    // Realtime: only `sessions` is published (signups table is excluded for privacy)
    const channel = supabase
      .channel("sessions-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => loadPublic())
      .subscribe();
    // Polling fallback every 15s so seat counts and own-signup status stay fresh
    const poll = setInterval(() => { loadPublic(); loadMine(); }, 15_000);
    // Refresh immediately when the tab regains focus
    const onVis = () => { if (document.visibilityState === "visible") { loadPublic(); loadMine(); } };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [loadPublic, loadMine]);

  useEffect(() => { loadMine(); }, [loadMine]);

  const acceptedCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of seatCounts) m.set(c.session_id, c.accepted_count);
    return m;
  }, [seatCounts]);

  const lockedWeeks = useMemo(() => {
    const set = new Set<string>();
    for (const l of lockouts) set.add(`${l.year}-${l.week}`);
    return set;
  }, [lockouts]);

  const userSignupBySession = useMemo(() => {
    const m = new Map<string, MySignup>();
    for (const s of mySignups) m.set(s.session_id, s);
    return m;
  }, [mySignups]);

  // Per-signup tokens are stored in localStorage so only this device can delete its own signups
  const TOKENS_KEY = "rc4_signup_tokens";
  const readTokens = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem(TOKENS_KEY) ?? "{}"); } catch { return {}; }
  };
  const saveToken = (signupId: string, token: string) => {
    const tokens = readTokens();
    tokens[signupId] = token;
    try { localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens)); } catch {}
  };
  const removeToken = (signupId: string) => {
    const tokens = readTokens();
    delete tokens[signupId];
    try { localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens)); } catch {}
  };

  const unpoll = async (signupId: string, sessionLocked: boolean) => {
    if (sessionLocked) {
      toast.error("Signups are locked for this session — message an admin if you need to drop out.");
      return;
    }
    const tokens = readTokens();
    const token = tokens[signupId];
    if (!token) {
      toast.error("This signup wasn't created on this device, so it can't be removed here. Ask an admin to remove it.");
      return;
    }
    if (!confirm("Remove your request from this session?")) return;
    // Use the secure backend delete function so token-owned removals don't depend on table RLS/count behavior.
    const { data, error } = await supabase.rpc("delete_session_signup", {
      _signup_id: signupId,
      _owner_token: token,
    });
    if (error) { toast.error(error.message || "Could not remove request."); return; }
    if (data !== true) {
      toast.error("Couldn't remove this request — it may already be locked, removed, or tied to another device.");
      loadPublic(); loadMine();
      return;
    }
    removeToken(signupId);
    toast.success("Request removed.");
    loadPublic(); loadMine();
  };

  const join = async (session: Session) => {
    if (session.signups_locked) {
      toast.error("Signups are locked for this session.");
      return;
    }
    const parsed = signupSchema.safeParse({ name, telegram_handle: handle });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

    if (lockedWeeks.has(`${session.year}-${session.week_number}`)) {
      toast.error("You're locked out of this week (joined the previous week).");
      return;
    }
    if (userSignupBySession.has(session.id)) {
      toast.error("You already requested this session.");
      return;
    }
    const { data, error } = await supabase.rpc("create_session_signup", {
      _session_id: session.id,
      _name: parsed.data.name,
      _telegram_handle: parsed.data.telegram_handle,
    });
    if (error) {
      if (error.message?.includes("Signups are locked")) {
        toast.error("Signups are locked for this session.");
      } else if (error.message?.includes("already signed up for another slot")) {
        toast.error("You've already signed up for another slot this week.");
      } else if (error.code === "23505") {
        toast.error("You already have a request for this session.");
      } else {
        toast.error(error.message || "Could not sign up.");
      }
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.id && row?.owner_token) saveToken(row.id, row.owner_token);
    toast.success("Signup submitted!");
    loadPublic(); loadMine();
  };

  const grouped = useMemo(() => {
    const g = new Map<string, { year: number; week: number; special: string; sessions: Session[] }>();
    for (const s of sessions) {
      const key = `${s.year}-${s.week_number}`;
      if (!g.has(key)) g.set(key, { year: s.year, week: s.week_number, special: s.special_drink ?? "", sessions: [] });
      g.get(key)!.sessions.push(s);
    }
    for (const v of g.values()) v.sessions.sort((a, b) => a.label.localeCompare(b.label));
    return Array.from(g.values()).sort((a, b) => (b.year - a.year) || (b.week - a.week));
  }, [sessions]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-semibold">Weekly Sessions</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Poll for your session! You can only poll for one slot. Same individual only can poll once every alternate week!
      </p>

      <div className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={80}
          className="rounded-lg border border-input bg-background px-4 py-2.5 outline-none ring-ring/30 focus:ring-2"
        />
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@telegram_handle"
          maxLength={40}
          className="rounded-lg border border-input bg-background px-4 py-2.5 outline-none ring-ring/30 focus:ring-2"
        />
      </div>

      {normHandle && userSignupBySession.size > 0 && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Your requests</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {Array.from(userSignupBySession.values()).map((sg) => {
              const sess = sessions.find((x) => x.id === sg.session_id);
              const sessLocked = sess?.signups_locked ?? false;
              const hasToken = !!readTokens()[sg.id];
              return (
                <li key={sg.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {sess ? `${sess.label.split(" - ")[0]} · ${new Date(sess.session_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "Session"}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      sg.status === "accepted" ? "bg-primary/15 text-primary" :
                      sg.status === "rejected" ? "bg-destructive/15 text-destructive" :
                      sg.status === "waitlisted" ? "bg-accent/30 text-foreground" :
                      "bg-secondary text-secondary-foreground"
                    }`}>
                      {sg.status === "accepted" ? "Confirmed ✓" :
                       sg.status === "rejected" ? "Not selected" :
                       sg.status === "waitlisted" ? "Waitlisted" :
                       "Pending review"}
                    </span>
                    {sessLocked ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground" title="Signups are locked by the organisers — message an admin if you need to drop out.">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    ) : hasToken ? (
                      <button
                        onClick={() => unpoll(sg.id, sessLocked)}
                        className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors"
                      >
                        Unpoll
                      </button>
                    ) : (
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground" title="This signup was added by an admin or from another device. Message an admin to remove it.">
                        Admin-managed
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Updates live as soon as anything changes. Your handle is remembered on this device.</p>
        </div>
      )}

      {loading ? (
        <div className="mt-8 h-40 animate-pulse rounded-2xl bg-muted" />
      ) : grouped.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
          No sessions open right now. Check back soon — we release the week's slots on Sunday evenings.
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {grouped.map((wk) => (
            <section key={`${wk.year}-${wk.week}`}>
              <div className="mb-4">
                <h2 className="flex items-center gap-2 text-2xl font-semibold">
                  Week {wk.week}
                  {lockedWeeks.has(`${wk.year}-${wk.week}`) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                      <Lock className="h-3 w-3" /> Locked for you
                    </span>
                  )}
                </h2>
                {wk.special && (
                  <p className="mt-1 text-base text-primary">
                    Featuring <span className="font-medium">{wk.special}</span>
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {wk.sessions.map((s) => {
                  const taken = acceptedCount.get(s.id) ?? 0;
                  const remaining = Math.max(0, s.max_capacity - taken);
                  const userStatus = userSignupBySession.get(s.id)?.status;
                  const locked = lockedWeeks.has(`${s.year}-${s.week_number}`);
                  const full = remaining <= 0;
                  const fillPct = Math.min(100, (taken / s.max_capacity) * 100);
                  return (
                    <div key={s.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
                      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(s.session_date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                      </div>
                      <h3 className="font-display text-lg font-semibold">{s.label.split(" - ")[0]}</h3>
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">{remaining}</span>
                        <span className="text-muted-foreground">of {s.max_capacity} seats left</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary transition-all" style={{ width: `${fillPct}%` }} />
                      </div>
                      <button
                        onClick={() => join(s)}
                        disabled={locked || s.signups_locked || !!userStatus}
                        className="mt-4 rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {userStatus === "accepted" ? "Accepted ✓" :
                         userStatus === "rejected" ? "Rejected" :
                         userStatus === "waitlisted" ? "Waitlisted" :
                         userStatus === "pending" ? "Pending review" :
                         s.signups_locked ? "Signups locked" :
                         locked ? "Locked out" :
                         full ? "Full — join waitlist" : "Request seat"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
