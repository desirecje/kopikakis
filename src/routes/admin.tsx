import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Coffee, LogOut, ClipboardList, Users, ExternalLink, ShieldCheck, Home, Utensils } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — RC4 Coffee Academy" }] }),
  component: AdminGate,
});

function AdminGate() {
  const { session, isAdmin, loading, signOut, user } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading) {
    return <FullScreen><div className="text-muted-foreground">Loading…</div></FullScreen>;
  }
  if (!session) return null;

  if (!isAdmin) {
    return (
      <FullScreen>
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">No admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You're signed in as <span className="font-medium">{user?.email}</span>, but this account doesn't have admin privileges.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link to="/" className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Back to shop</Link>
            <button onClick={signOut} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Sign out</button>
          </div>
        </div>
      </FullScreen>
    );
  }

  const tabs = [
    { to: "/admin", label: "Orders", icon: ClipboardList, exact: true },
    { to: "/admin/menu", label: "Menu", icon: Utensils, exact: false },
    { to: "/admin/signups", label: "Sessions", icon: Users, exact: false },
    { to: "/admin/homepage", label: "Homepage", icon: Home, exact: false },
    { to: "/admin/team", label: "Team", icon: ShieldCheck, exact: false },
  ];

  return (
    <div className="min-h-screen bg-secondary/20">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <Link to="/admin" className="flex min-w-0 items-center gap-1.5 font-display text-base font-semibold sm:gap-2 sm:text-lg">
            <Coffee className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate">RC4 Coffee Academy</span>
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">Admin</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/"
              className="hidden items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary sm:inline-flex"
            >
              Customer view <ExternalLink className="h-3 w-3" />
            </Link>
            <span className="hidden text-xs text-muted-foreground md:inline">{user?.email}</span>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-secondary sm:px-3"
            >
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6">
          <div className="flex min-w-max gap-1">
            {tabs.map((t) => {
              const active = t.exact ? path === t.to : path.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                    active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background px-4">{children}</div>;
}
