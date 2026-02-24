import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

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

  const { data: post } = await supabase.from("posts").select("status,start_at").eq("id", postId).maybeSingle();
  const isExpired = post?.start_at ? new Date(post.start_at).getTime() + 30 * 60 * 1000 < Date.now() : true;

  if (post && post.status === "open" && !isExpired) {
    await supabase.from("joins").delete().eq("post_id", postId).eq("user_id", user.id);
  }

  return NextResponse.redirect(new URL(redirectTo, request.url));
}
