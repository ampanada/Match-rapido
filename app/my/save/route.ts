import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

function normalizeWhatsapp(countryCode: string, rawInput: string) {
  const compact = rawInput.replace(/\s+/g, "").replace(/-/g, "");
  if (!compact) {
    return "";
  }

  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/[^\d]/g, "")}`;
  }

  return `${countryCode}${compact.replace(/[^\d]/g, "")}`;
}

export async function POST(request: Request) {
  function redirectWithReason(path: string, reason: string) {
    return NextResponse.redirect(new URL(`${path}&reason=${encodeURIComponent(reason)}`, request.url), 303);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const displayName = String(formData.get("display_name") || "").trim();
  const countryCode = String(formData.get("country_code") || "+54").trim();
  const localNumberRaw = String(formData.get("whatsapp_number") || "").trim();
  const whatsapp = normalizeWhatsapp(countryCode, localNumberRaw);
  const avatarFile = formData.get("avatar_file");

  if (whatsapp && !/^\+\d{8,15}$/.test(whatsapp)) {
    return NextResponse.redirect(new URL("/my?error=invalid_whatsapp", request.url), 303);
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("display_name,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  let avatarUrl: string | null = currentProfile?.avatar_url ?? null;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!avatarFile.type.startsWith("image/")) {
      return NextResponse.redirect(new URL("/my?error=invalid_avatar", request.url), 303);
    }
    if (avatarFile.size > 5 * 1024 * 1024) {
      return NextResponse.redirect(new URL("/my?error=avatar_too_large", request.url), 303);
    }

    const ext = avatarFile.name.includes(".") ? avatarFile.name.split(".").pop()!.toLowerCase() : "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const filePath = `${user.id}/${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, avatarFile, {
      upsert: true,
      contentType: avatarFile.type
    });

    if (uploadError) {
      return NextResponse.redirect(new URL("/my?error=upload_failed", request.url), 303);
    }

    const publicUrlData = supabase.storage.from("avatars").getPublicUrl(filePath);
    avatarUrl = publicUrlData.data.publicUrl;
  }

  if (!user.email) {
    return redirectWithReason("/my?error=save_failed", "missing_email");
  }

  const payload = {
    display_name: displayName || currentProfile?.display_name || null,
    whatsapp: whatsapp || null,
    avatar_url: avatarUrl
  };

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return redirectWithReason("/my?error=save_failed", `update:${updateError.code ?? "no_code"}:${updateError.message}`);
  }

  if (!updated) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      ...payload
    });

    if (insertError) {
      return redirectWithReason("/my?error=save_failed", `insert:${insertError.code ?? "no_code"}:${insertError.message}`);
    }
  }

  revalidatePath("/my");
  revalidatePath("/");

  return NextResponse.redirect(new URL("/my?saved=1", request.url), 303);
}
