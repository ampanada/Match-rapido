function normalizeWhatsapp(raw: string | null | undefined) {
  const value = (raw ?? "").trim();
  if (!value) {
    return "";
  }

  if (value.startsWith("+")) {
    return `+${value.slice(1).replace(/[^\d]/g, "")}`;
  }

  return `+${value.replace(/[^\d]/g, "")}`;
}

type ClaimResult = {
  claimedCount: number;
  deletedDuplicateCount: number;
};

export async function claimGuestJoinsForUser(
  supabase: any,
  userId: string,
  rawWhatsapp: string | null | undefined
): Promise<ClaimResult> {
  const whatsapp = normalizeWhatsapp(rawWhatsapp);
  if (!whatsapp) {
    return { claimedCount: 0, deletedDuplicateCount: 0 };
  }

  const { data: guestRows } = await supabase
    .from("joins")
    .select("id,post_id")
    .is("user_id", null)
    .eq("guest_whatsapp", whatsapp)
    .order("created_at", { ascending: true })
    .limit(200);

  if (!guestRows || guestRows.length === 0) {
    return { claimedCount: 0, deletedDuplicateCount: 0 };
  }

  const postIds = guestRows.map((row: { post_id: string }) => row.post_id);
  const { data: existingRows } = await supabase
    .from("joins")
    .select("id,post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);

  const existingByPost = new Set((existingRows ?? []).map((row: { post_id: string }) => row.post_id));
  let claimedCount = 0;
  let deletedDuplicateCount = 0;

  for (const row of guestRows) {
    if (existingByPost.has(row.post_id)) {
      const { error: deleteError } = await supabase.from("joins").delete().eq("id", row.id).is("user_id", null);
      if (!deleteError) {
        deletedDuplicateCount += 1;
      }
      continue;
    }

    const { error: updateError } = await supabase
      .from("joins")
      .update({
        user_id: userId,
        guest_name: null,
        guest_whatsapp: null,
        claimed_at: new Date().toISOString()
      })
      .eq("id", row.id)
      .is("user_id", null)
      .eq("guest_whatsapp", whatsapp);

    if (!updateError) {
      claimedCount += 1;
      existingByPost.add(row.post_id);
    }
  }

  return { claimedCount, deletedDuplicateCount };
}

