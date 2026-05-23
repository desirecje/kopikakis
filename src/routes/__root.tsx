import { Outlet, createRootRoute, HeadContent, Scripts, Link, useRouterState } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/hooks/useAuth";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page wandered off for a coffee.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Back to menu
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RC4 Coffee Academy" },
      { name: "description", content: "RC4 COFFEE ACADEMY OWN WEBSITE FIREEEE" },
      { property: "og:title", content: "RC4 Coffee Academy" },
      { name: "twitter:title", content: "RC4 Coffee Academy" },
      { property: "og:description", content: "RC4 COFFEE ACADEMY OWN WEBSITE FIREEEE" },
      { name: "twitter:description", content: "RC4 COFFEE ACADEMY OWN WEBSITE FIREEEE" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6118ed6b-93f9-45bf-94fc-44f8e2cef3a2/id-preview-f9b82466--77be62f7-48bb-4400-abb9-b49190f5700f.lovable.app-1777451164026.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6118ed6b-93f9-45bf-94fc-44f8e2cef3a2/id-preview-f9b82466--77be62f7-48bb-4400-abb9-b49190f5700f.lovable.app-1777451164026.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
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
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hideHeader = path.startsWith("/admin") || path.startsWith("/auth");
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        {!hideHeader && <Header />}
        <Outlet />
        <Toaster position="top-center" richColors />
      </div>
    </AuthProvider>
  );
}
