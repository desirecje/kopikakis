import { Outlet, createRootRoute, HeadContent, Scripts, useNavigate } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EDE8DC] px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-[#3A2410]">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-[#3A2410]">Page not found</h2>
        <p className="mt-2 text-sm text-[#7A6A55]">This page wandered off for a coffee.</p>
        <button
          onClick={() => navigate({ to: "/home" })}
          className="mt-6 inline-flex rounded-full bg-[#5C3317] px-5 py-2 text-sm font-medium text-[#FAF6EF] hover:opacity-90"
        >
          Back to home
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kopi Kaki" },
      { name: "description", content: "Find your study buddy at NUS" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Outlet />
        <Toaster position="top-center" richColors />
      </div>
    </AuthProvider>
  );
}
