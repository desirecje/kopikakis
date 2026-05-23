import { Link } from "@tanstack/react-router";
import { Coffee, Menu as MenuIcon, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Menu", exact: true },
  { to: "/order", label: "Order", exact: false },
  { to: "/sessions", label: "Sessions", exact: false },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          to="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 font-display text-xl font-semibold text-primary"
        >
          <Coffee className="h-5 w-5" />
          RC4 Coffee Academy
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 text-sm md:flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} exact={item.exact}>
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/status"
            activeProps={{ className: "bg-secondary text-secondary-foreground" }}
            className="rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-4"
          >
            Status
          </Link>
          <Link to="/auth" className="ml-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground/70 hover:text-foreground sm:px-4">
            Owner login
          </Link>
        </nav>

        {/* Mobile menu trigger */}
        <button
          type="button"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-full p-2 text-foreground hover:bg-secondary md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav panel */}
      {open && (
        <nav className="border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden">
          <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm sm:px-6">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.exact }}
                  activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                to="/status"
                onClick={() => setOpen(false)}
                activeProps={{ className: "bg-secondary text-secondary-foreground" }}
                className="block rounded-lg px-3 py-2.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Status
              </Link>
            </li>
            <li>
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-xs font-medium text-muted-foreground/70 hover:bg-secondary hover:text-foreground"
              >
                Owner login
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function NavLink({ to, children, exact }: { to: string; children: React.ReactNode; exact?: boolean }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: !!exact }}
      activeProps={{ className: "bg-secondary text-secondary-foreground" }}
      className="rounded-full px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-4"
    >
      {children}
    </Link>
  );
}
