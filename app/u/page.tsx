import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MyPublicProfileRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?reason=auth_required");
  }

  redirect(`/u/${user.id}`);
}
