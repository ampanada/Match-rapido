import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const formData = await request.formData();
  const postId = String(formData.get("post_id") || "");
  const redirectTo = String(formData.get("redirect_to") || `/post/${postId}`);

  if (!postId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { data: post } = await supabase
    .from("posts")
    .select("id,host_id,status,needed,start_at,joins(id,status)")
    .eq("id", postId)
    .maybeSingle();

  const approvedCount = post?.joins?.filter((join) => join.status === "approved").length ?? 0;
  const currentPlayers = approvedCount + 1;
  const isExpired = post?.start_at ? new Date(post.start_at).getTime() + 30 * 60 * 1000 < Date.now() : true;
  const isHost = !!post && post.host_id === user.id;
  const isClosed = !post || post.status === "closed" || currentPlayers >= post.needed || isExpired || isHost;

  if (!isClosed) {
    const { error: joinError } = await supabase
      .from("joins")
      .upsert({ post_id: postId, user_id: user.id, status: "pending" }, { onConflict: "post_id,user_id" });

    if (!joinError && post?.host_id) {
      const [{ data: hostProfile }, { data: requesterProfile }] = await Promise.all([
        supabase.from("profiles").select("email,display_name").eq("id", post.host_id).maybeSingle(),
        supabase.from("profiles").select("display_name,email").eq("id", user.id).maybeSingle()
      ]);

      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.NOTIFY_FROM_EMAIL;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

      if (resendKey && fromEmail && hostProfile?.email) {
        const requesterName = requesterProfile?.display_name || requesterProfile?.email || "Jugador";
        const detailUrl = `${appUrl}/post/${postId}`;

        // Fire-and-forget email notification for host approval workflow.
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [hostProfile.email],
            subject: "Nueva solicitud de participacion",
            html: `<p>Tienes una nueva solicitud de participacion de <strong>${requesterName}</strong>.</p>
<p>Revisa y aprueba desde: <a href="${detailUrl}">${detailUrl}</a></p>`
          })
        }).catch(() => {});
      }
    }
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
