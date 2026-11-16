import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SESSION_COOKIE, isPublicPath, loginRequired, supabaseAuthConfig } from "@/lib/auth/config";

/**
 * Optimistic auth gate: unauthenticated visitors are sent to /login (API calls get 401).
 * The real authorization happens on the server for every page, action and route handler.
 * In Supabase mode this is also where expired access tokens are refreshed.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = isPublicPath(pathname);
  const cfg = supabaseAuthConfig();
  // The clients' area always needs a sign-in; coach pages only when REQUIRE_LOGIN is on.
  const isPortal = pathname === "/portale" || pathname.startsWith("/portale/") || pathname.startsWith("/api/portale/");
  const gated = loginRequired() ? !isPublic : isPortal && Boolean(cfg);
  // Login disabled (default): no gate. /login stays viewable as a preview.
  if (!gated && !(cfg && pathname.startsWith("/auth/"))) return NextResponse.next();
  let response = NextResponse.next({ request });
  let signedIn = false;

  if (cfg) {
    const supabase = createServerClient(cfg.url, cfg.anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims);
  } else {
    signedIn = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  }

  if (!signedIn && gated) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  // Everything except Next internals and public assets (images, fonts, icons).
  matcher: ["/((?!_next/static|_next/image|icon\\.svg|favicon\\.ico|exercises/|foods/|emoji/|brand/|.*\\.(?:png|jpg|jpeg|svg|webp|woff2?)$).*)"],
};
