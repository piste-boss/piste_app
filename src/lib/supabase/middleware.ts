import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/signup", "/api/stripe/webhook"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public paths: allow access
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );
  if (isPublicPath || pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  // Not authenticated: redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Role-based routing
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile) {
    const isTrainerPath =
      pathname.startsWith("/trainer-dashboard") ||
      pathname.startsWith("/members") ||
      pathname.startsWith("/sessions") ||
      pathname.startsWith("/ai-suggest");
    const isMemberPath =
      pathname.startsWith("/member-dashboard") ||
      pathname.startsWith("/records") ||
      pathname.startsWith("/photos") ||
      pathname.startsWith("/weight");

    if (profile.role === "member" && isTrainerPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/member-dashboard";
      return NextResponse.redirect(url);
    }
    if (profile.role === "trainer" && isMemberPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/trainer-dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
