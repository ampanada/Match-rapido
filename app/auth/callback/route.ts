import { createClient } from "@/lib/supabase/server";
import { claimGuestJoinsForUser } from "@/lib/joins/claimGuestJoins";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectToRaw = searchParams.get("redirect_to") || "/";
  const redirectTo = redirectToRaw.startsWith("/") && !redirectToRaw.startsWith("//") ? redirectToRaw : "/";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const { data: myProfile } = await supabase.from("profiles").select("whatsapp").eq("id", user.id).maybeSingle();
      await claimGuestJoinsForUser(supabase, user.id, myProfile?.whatsapp);
    }
  }

  const target = new URL(redirectTo, origin);
  target.searchParams.set("loggedIn", "1");
  return NextResponse.redirect(target);
}
