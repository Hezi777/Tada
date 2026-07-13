import { NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";

// OAuth + email-confirmation landing: exchange the auth code for a session,
// then send the user into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Behind a proxy (e.g. production hosting) the original host arrives in
      // x-forwarded-host; prefer it so the redirect stays on the user's URL.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (isLocal || !forwardedHost) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
      return NextResponse.redirect(`https://${forwardedHost}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
