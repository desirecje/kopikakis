import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, ArrowRightLeft, X, Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/signups")({
  component: SignupsPage,
});

type Session = {
  id: string;
  label: string;
  session_date: string;
  year: number;
  week_number: number;
  max_capacity: number;
  published: boolean;
  signups_locked: boolean;
  special_drink: string;
};
type Signup = {
  id: string;
  session_id: string;
  name: string;
  telegram_handle: string;
  status: string;
  admin_override: boolean;
  created_at: string;
  sessions: { label: string; session_date: string } | null;
};

function SignupsPage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<Signup | null>(null);
  const [timeFilter, setTimeFilter] = useState<"all" | "upcoming" | "past" | "today" | "week">("upcoming");
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected" | "waitlist">("all");

  const load = async () => {
    const [s, sess] = await Promise.all([
      supabase.from("session_signups").select("*,sessions(label,session_date)").order("created_at", { ascending: false }),
      supabase.from("sessions").select("*").order("session_date", { ascending: true }),
    ]);
    setSignups((s.data ?? []) as unknown as Signup[]);
    setSessions((sess.data ?? []) as Session[]);
  };
  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-signups")
      .on("postgres_changes", { event: "*", schema: "public", table: "session_signups" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    signups.filter((s) => s.status === "accepted").forEach((s) => m.set(s.session_id, (m.get(s.session_id) ?? 0) + 1));
    return m;
  }, [signups]);

  const update = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("session_signups").update({ status }).eq("id", id);
    if (error) toast.error("Update failed");
    else { toast.success(status === "accepted" ? "Confirmed" : "Rejected"); load(); }
  };

  const move = async (signup: Signup, newSessionId: string) => {
    const { error } = await supabase
      .from("session_signups")
      .update({ session_id: newSessionId, admin_override: true })
      .eq("id", signup.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Moved");
    setMoving(null);
    load();
  };

  const togglePublished = async (s: Session) => {
    const { error } = await supabase.from("sessions").update({ published: !s.published }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success(!s.published ? "Published — visible to customers" : "Unpublished");
    load();
  };

  const deleteSession = async (s: Session) => {
    if (!confirm(`Delete "${s.label}"? Any signups for this slot will also be removed.`)) return;
    await supabase.from("session_signups").delete().eq("session_id", s.id);
    const { error } = await supabase.from("sessions").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Session deleted");
    load();
  };

  const createWeek = async (mondayISO: string, capacities: [number, number, number]) => {
    const monday = new Date(mondayISO + "T00:00:00");
    if (isNaN(monday.getTime())) { toast.error("Invalid date"); return; }
    const { year, week } = isoYearWeek(monday);
    const slots = [
      { label: "Monday 8:00 – 8:30 PM", cap: capacities[0] },
      { label: "Monday 8:30 – 9:00 PM", cap: capacities[1] },
      { label: "Monday 9:00 – 9:30 PM", cap: capacities[2] },
    ];
    const rows = slots.map((s) => ({
      label: s.label,
      session_date: mondayISO,
      year,
      week_number: week,
      max_capacity: Math.max(1, Math.min(50, Math.floor(s.cap) || 6)),
      published: false,
    }));
    const { error } = await supabase.from("sessions").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`Week ${week} created — publish when ready`);
    load();
  };

  const updateCapacity = async (s: Session, newCap: number) => {
    const cap = Math.max(1, Math.min(50, Math.floor(newCap)));
    const used = counts.get(s.id) ?? 0;
    if (cap < used) { toast.error(`Can't set below ${used} (already confirmed)`); return; }
    const { error } = await supabase.from("sessions").update({ max_capacity: cap }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Capacity updated");
    load();
  };

  // Update fields shared across the whole week (week_number, special_drink, signups_locked) on all 3 slots
  const updateWeekField = async (
    weekSessions: Session[],
    patch: Partial<Pick<Session, "week_number" | "special_drink" | "signups_locked">>
  ) => {
    const ids = weekSessions.map((s) => s.id);
    const { error } = await supabase.from("sessions").update(patch).in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    load();
  };

  const toggleWeekLock = async (weekSessions: Session[]) => {
    const anyLocked = weekSessions.some((s) => s.signups_locked);
    await updateWeekField(weekSessions, { signups_locked: !anyLocked });
  };

  // Group sessions by week for display, sorting within each week by label so 8 PM comes before 9 PM
  const sessionWeeks = useMemo(() => {
    const g = new Map<string, { year: number; week: number; date: string; sessions: Session[] }>();
    for (const s of sessions) {
      const key = `${s.year}-${s.week_number}-${s.session_date}`;
      if (!g.has(key)) g.set(key, { year: s.year, week: s.week_number, date: s.session_date, sessions: [] });
      g.get(key)!.sessions.push(s);
    }
    for (const v of g.values()) v.sessions.sort((a, b) => a.label.localeCompare(b.label));
    // Newest week first (week 20 above week 19)
    return Array.from(g.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [sessions]);

  const filteredSignups = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().slice(0, 10);
    const weekAhead = new Date(today); weekAhead.setDate(weekAhead.getDate() + 7);
    const weekAheadISO = weekAhead.toISOString().slice(0, 10);

    return signups.filter((s) => {
      if (sessionFilter !== "all" && s.session_id !== sessionFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      const date = s.sessions?.session_date;
      if (!date && timeFilter !== "all") return false;
      if (timeFilter === "upcoming" && date! < todayISO) return false;
      if (timeFilter === "past" && date! >= todayISO) return false;
      if (timeFilter === "today" && date !== todayISO) return false;
      if (timeFilter === "week" && (date! < todayISO || date! >= weekAheadISO)) return false;
      return true;
    });
  }, [signups, timeFilter, sessionFilter, statusFilter]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Sessions & signups</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create a week, publish when ready, and manage signups.</p>
        </div>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Add walk-in
        </button>
      </div>

      <CreateWeekCard onCreate={createWeek} />

      {/* Sessions grouped by week */}
      <div className="mt-6 space-y-6">
        {sessionWeeks.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No sessions yet. Use "Create week" above to generate Monday's three slots.
          </div>
        )}
        {sessionWeeks.map((wk) => {
          const allPublished = wk.sessions.every((s) => s.published);
          const weekLocked = wk.sessions.some((s) => s.signups_locked);
          const special = wk.sessions[0]?.special_drink ?? "";
          return (
            <section key={`${wk.year}-${wk.week}-${wk.date}`}>
              <div className="mb-3 rounded-2xl border border-border bg-card/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">Week</span>
                    <input
                      type="number"
                      min={1}
                      max={53}
                      defaultValue={wk.week}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v && v !== wk.week) updateWeekField(wk.sessions, { week_number: v });
                      }}
                      className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-sm font-semibold"
                    />
                    <span className="text-sm font-normal text-muted-foreground">
                      · {new Date(wk.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleWeekLock(wk.sessions)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        weekLocked
                          ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                          : "border border-border hover:bg-secondary"
                      }`}
                      title={weekLocked ? "Unlock signups so users can unpoll again" : "Lock signups — users won't be able to unpoll"}
                    >
                      {weekLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                      {weekLocked ? "Locked" : "Lock signups"}
                    </button>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${allPublished ? "bg-primary/15 text-primary" : "bg-secondary text-secondary-foreground"}`}>
                      {allPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                <label className="mt-3 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  This week's special drink
                </label>
                <input
                  type="text"
                  defaultValue={special}
                  placeholder="e.g. Yirgacheffe pour-over"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== special) updateWeekField(wk.sessions, { special_drink: v });
                  }}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {wk.sessions.map((s) => {
                  const used = counts.get(s.id) ?? 0;
                  const full = used >= s.max_capacity;
                  return (
                    <div key={s.id} className="rounded-2xl border border-border bg-card p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{s.label.replace(/^Monday\s*/, "")}</div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${full ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                          {used}/{s.max_capacity}
                        </span>
                      </div>
                      <label className="mt-3 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Max capacity</label>
                      <input
                        key={`${s.id}-${s.max_capacity}`}
                        type="number"
                        min={Math.max(1, used)}
                        max={50}
                        defaultValue={s.max_capacity}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== s.max_capacity) updateCapacity(s, v);
                        }}
                        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                      />
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => togglePublished(s)}
                          className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium ${s.published ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"}`}
                        >
                          {s.published ? "Published" : "Publish"}
                        </button>
                        <button
                          onClick={() => deleteSession(s)}
                          className="rounded-full border border-border p-1.5 text-destructive hover:bg-destructive/10"
                          title="Delete slot"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <h2 className="mt-10 text-lg font-semibold">All signups</h2>

      {/* Filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/50 p-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Filter</span>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
          className="rounded-full border border-input bg-background px-3 py-1.5 text-xs"
        >
          <option value="all">All time</option>
          <option value="upcoming">Upcoming sessions</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="past">Past sessions</option>
        </select>
        <select
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          className="rounded-full border border-input bg-background px-3 py-1.5 text-xs"
        >
          <option value="all">All sessions</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.label} — {s.session_date}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-full border border-input bg-background px-3 py-1.5 text-xs"
        >
          <option value="all">All statuses</option>
          <option value="accepted">Accepted</option>
          <option value="waitlist">Waitlist</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{filteredSignups.length} of {signups.length}</span>
      </div>

      <div className="mt-3 space-y-3">
        {filteredSignups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">No signups match these filters.</div>
        )}
        {filteredSignups.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                  <span className="break-words">{s.name}</span>
                  <span className="break-all text-sm text-muted-foreground">{s.telegram_handle}</span>
                  {s.admin_override && <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">override</span>}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{s.sessions?.label} · {s.sessions?.session_date}</div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {s.status !== "accepted" && (
                <button onClick={() => update(s.id, "accepted")} className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 sm:flex-none">
                  Confirm
                </button>
              )}
              {s.status !== "rejected" && (
                <button onClick={() => update(s.id, "rejected")} className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary sm:flex-none">
                  Reject
                </button>
              )}
              <button onClick={() => setMoving(s)} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-2 text-sm hover:bg-secondary" title="Move to another session" aria-label="Move to another session">
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {adding && <AddDrawer sessions={sessions} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); }} />}
      {moving && <MoveDrawer signup={moving} sessions={sessions} onClose={() => setMoving(null)} onMove={(sid) => move(moving, sid)} />}
    </main>
  );
}

function AddDrawer({ sessions, onClose, onAdded }: { sessions: Session[]; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !handle.trim() || !sessionId) { toast.error("Fill in all fields"); return; }
    setBusy(true);
    const { error } = await supabase.from("session_signups").insert({
      session_id: sessionId,
      name: name.trim(),
      telegram_handle: handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`,
      status: autoConfirm ? "accepted" : "pending",
      admin_override: true,
    });
    setBusy(false);
    if (error) {
      if (error.code === "23505") toast.error("This handle already has an active signup for that session.");
      else toast.error(error.message);
      return;
    }
    toast.success("Walk-in added");
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl border border-border bg-background sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="font-semibold">Add walk-in</div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-4">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Telegram handle">
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@username" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          </Field>
          <Field label="Session">
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.label} — {s.session_date}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoConfirm} onChange={(e) => setAutoConfirm(e.target.checked)} />
            Auto-confirm (bypass lockout rule)
          </label>
          <button onClick={submit} disabled={busy} className="mt-2 w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? "…" : "Add signup"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MoveDrawer({ signup, sessions, onClose, onMove }: { signup: Signup; sessions: Session[]; onClose: () => void; onMove: (sid: string) => void }) {
  const [sid, setSid] = useState(signup.session_id);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl border border-border bg-background sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <div className="font-semibold">Move signup</div>
            <div className="text-xs text-muted-foreground">{signup.name} ({signup.telegram_handle})</div>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-4">
          <Field label="Move to session">
            <select value={sid} onChange={(e) => setSid(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.label} — {s.session_date}</option>)}
            </select>
          </Field>
          <button onClick={() => onMove(sid)} disabled={sid === signup.session_id} className="w-full rounded-full bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "accepted" ? "bg-primary/15 text-primary"
    : status === "rejected" ? "bg-destructive/15 text-destructive"
    : "bg-secondary text-secondary-foreground";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}

function CreateWeekCard({ onCreate }: { onCreate: (mondayISO: string, capacities: [number, number, number]) => void }) {
  const [date, setDate] = useState(nextMondayISO());
  const [c1, setC1] = useState(6);
  const [c2, setC2] = useState(6);
  const [c3, setC3] = useState(6);
  const slots: Array<{ label: string; value: number; set: (n: number) => void }> = [
    { label: "8:00–8:30 PM", value: c1, set: setC1 },
    { label: "8:30–9:00 PM", value: c2, set: setC2 },
    { label: "9:00–9:30 PM", value: c3, set: setC3 },
  ];
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Monday date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        {slots.map((s) => (
          <div key={s.label} className="w-28">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</label>
            <input
              type="number"
              min={1}
              max={50}
              value={s.value}
              onChange={(e) => s.set(Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        ))}
        <button
          onClick={() => onCreate(date, [c1, c2, c3])}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Create week
        </button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Creates the three Monday slots with the capacities above. They start as draft — publish each one to make it visible to customers. You can edit capacity later.
      </p>
    </div>
  );
}

function nextMondayISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (8 - day) % 7 || 7; // days until next Monday (never today)
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function isoYearWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.valueOf() - firstThursday.valueOf()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return { year: d.getUTCFullYear(), week };
}
