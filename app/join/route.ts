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
    .select("id,host_id,status,needed,start_at,joins(count)")
    .eq("id", postId)
    .maybeSingle();

  const joinsCount = post?.joins?.[0]?.count ?? 0;
  const currentPlayers = joinsCount + 1;
  const isExpired = post?.start_at ? new Date(post.start_at).getTime() + 30 * 60 * 1000 < Date.now() : true;
  const isHost = !!post && post.host_id === user.id;
  const isClosed = !post || post.status === "closed" || currentPlayers >= post.needed || isExpired || isHost;

  if (!isClosed) {
    await supabase.from("joins").insert({ post_id: postId, user_id: user.id });
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
