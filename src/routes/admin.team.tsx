import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, UserPlus, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/team")({
  head: () => ({ meta: [{ title: "Team — RC4 Coffee Academy Admin" }] }),
  component: TeamPage,
});

type Profile = { id: string; email: string | null; display_name: string | null; created_at: string };
type Member = Profile & { isAdmin: boolean };

function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [promoting, setPromoting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id,email,display_name,created_at").order("created_at", { ascending: true }),
      supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
    ]);
    if (pErr || rErr) {
      toast.error("Failed to load team");
      setLoading(false);
      return;
    }
    const adminIds = new Set((roles ?? []).map((r) => r.user_id));
    setMembers((profiles ?? []).map((p) => ({ ...p, isAdmin: adminIds.has(p.id) })));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-team")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const adminCount = members.filter((m) => m.isAdmin).length;

  const promote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setPromoting(true);
    const { error } = await supabase.rpc("promote_user_to_admin", { _email: email.trim() });
    setPromoting(false);
    if (error) {
      toast.error(error.message.includes("No user found") ? "No account with that email — they need to sign up first." : error.message);
      return;
    }
    toast.success(`${email.trim()} is now an admin`);
    setEmail("");
    await load();
  };

  const promoteExisting = async (m: Member) => {
    if (!m.email) return;
    setBusyId(m.id);
    const { error } = await supabase.rpc("promote_user_to_admin", { _email: m.email });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${m.email} promoted to admin`);
    await load();
  };

  const demote = async (m: Member) => {
    if (m.id === user?.id) {
      if (!confirm("Remove your own admin access? You'll lose access to /admin.")) return;
    }
    setBusyId(m.id);
    const { error } = await supabase.rpc("demote_admin", { _user_id: m.id });
    setBusyId(null);
    if (error) {
      toast.error(error.message.includes("last admin") ? "Cannot remove the last admin." : error.message);
      return;
    }
    toast.success("Admin role removed");
    await load();
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who can access the admin dashboard. {adminCount} admin{adminCount === 1 ? "" : "s"} total.
        </p>
      </div>

      <section className="mb-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="h-4 w-4 text-primary" /> Promote by email
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The person must have already signed up at <code className="rounded bg-secondary px-1 py-0.5">/auth</code>.
        </p>
        <form onSubmit={promote} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              placeholder="owner@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none ring-ring/30 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={promoting}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {promoting ? "Promoting…" : "Make admin"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">All members</h2>
          <span className="text-xs text-muted-foreground">{members.length} total</span>
        </header>
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : members.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No accounts yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{m.display_name || m.email || "Unknown"}</span>
                    {m.isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </span>
                    )}
                    {m.id === user?.id && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">You</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {m.isAdmin ? (
                    <button
                      onClick={() => demote(m)}
                      disabled={busyId === m.id || adminCount <= 1}
                      title={adminCount <= 1 ? "Cannot remove the last admin" : ""}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                    >
                      <ShieldOff className="h-3.5 w-3.5" /> Remove admin
                    </button>
                  ) : (
                    <button
                      onClick={() => promoteExisting(m)}
                      disabled={busyId === m.id || !m.email}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Make admin
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
