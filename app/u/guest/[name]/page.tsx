import BottomNav from "@/components/BottomNav";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function normalizeGuestName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeWhatsapp(raw: string | null | undefined) {
  const compact = String(raw ?? "").replace(/\s+/g, "").replace(/-/g, "");
  if (!compact) {
    return "";
  }
  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/[^\d]/g, "")}`;
  }
  return `+${compact.replace(/[^\d]/g, "")}`;
}

function rankNameMatch(candidateName: string | null | undefined, target: string) {
  const normalizedCandidate = normalizeGuestName(String(candidateName ?? ""));
  if (!normalizedCandidate || !target) {
    return 0;
  }
  if (normalizedCandidate === target) {
    return 100;
  }
  if (normalizedCandidate.includes(target) || target.includes(normalizedCandidate)) {
    return 70;
  }
  return 0;
}

export default async function GuestProfileRedirectPage({
  params
}: {
  params: Promise<{ name: string }>;
}) {
  noStore();
  const { name } = await params;
  const lang = await getServerLang();
  const decodedName = decodeURIComponent(name).trim();
  const copy =
    lang === "ko"
      ? {
          title: "게스트 프로필 준비 중",
          description: "아직 연결된 프로필이 없습니다. 게스트가 로그인하거나 연결되면 자동으로 표시됩니다.",
          back: "홈으로 돌아가기"
        }
      : {
          title: "Perfil de invitado en preparacion",
          description: "Aun no hay un perfil vinculado. Cuando se vincule, se mostrara automaticamente.",
          back: "Volver al inicio"
        };

  if (!decodedName) {
    redirect("/");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const targetNameKey = normalizeGuestName(decodedName);

  const { data: exactProfileRows } = await supabase
    .from("profiles")
    .select("id,display_name,is_guest,total_matches,created_at,whatsapp")
    .ilike("display_name", decodedName)
    .order("total_matches", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  let profileCandidates = exactProfileRows ?? [];
  if (profileCandidates.length === 0) {
    const { data: wildcardRows } = await supabase
      .from("profiles")
      .select("id,display_name,is_guest,total_matches,created_at,whatsapp")
      .ilike("display_name", `%${decodedName}%`)
      .order("total_matches", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);
    profileCandidates = wildcardRows ?? [];
  }

  const rankedProfiles = [...profileCandidates]
    .map((row) => {
      const baseScore = rankNameMatch(row.display_name, targetNameKey);
      const guestBonus = row.is_guest ? 20 : 0;
      const matchBonus = Math.min(row.total_matches ?? 0, 30);
      return {
        row,
        score: baseScore + guestBonus + matchBonus
      };
    })
    .sort((a, b) => b.score - a.score);

  if (rankedProfiles[0]?.row?.id && rankedProfiles[0].score >= 70) {
    redirect(`/u/${rankedProfiles[0].row.id}`);
  }

  const { data: exactJoinRows } = await supabase
    .from("joins")
    .select("guest_name,guest_whatsapp,created_at")
    .ilike("guest_name", decodedName)
    .order("created_at", { ascending: false })
    .limit(40);

  let joinRows = exactJoinRows ?? [];
  if (joinRows.length === 0) {
    const { data: wildcardJoinRows } = await supabase
      .from("joins")
      .select("guest_name,guest_whatsapp,created_at")
      .ilike("guest_name", `%${decodedName}%`)
      .order("created_at", { ascending: false })
      .limit(80);
    joinRows = wildcardJoinRows ?? [];
  }

  const bestJoin = [...joinRows]
    .map((row) => ({
      row,
      score: rankNameMatch(row.guest_name, targetNameKey)
    }))
    .sort((a, b) => b.score - a.score)[0]?.row;

  const normalizedGuestWhatsapp = normalizeWhatsapp(bestJoin?.guest_whatsapp);
  if (normalizedGuestWhatsapp) {
    const { data: phoneMatchedProfiles } = await supabase
      .from("profiles")
      .select("id,display_name,is_guest,total_matches,created_at")
      .eq("whatsapp", normalizedGuestWhatsapp)
      .order("total_matches", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);

    const phoneMatched = (phoneMatchedProfiles ?? [])
      .map((row) => ({
        row,
        score: rankNameMatch(row.display_name, targetNameKey) + (row.is_guest ? 20 : 0)
      }))
      .sort((a, b) => b.score - a.score)[0]?.row;

    if (phoneMatched?.id) {
      redirect(`/u/${phoneMatched.id}`);
    }
  }

  if (user?.id && bestJoin?.guest_name) {
    const newGuestId = crypto.randomUUID();
    const safeLocal = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const { data: insertedGuest } = await supabase
      .from("profiles")
      .insert({
        id: newGuestId,
        email: `guest-${safeLocal}@guest.local`,
        display_name: bestJoin.guest_name.trim() || decodedName,
        whatsapp: normalizedGuestWhatsapp || null,
        is_guest: true,
        created_by: user.id
      })
      .select("id")
      .maybeSingle();

    if (insertedGuest?.id) {
      redirect(`/u/${insertedGuest.id}`);
    }

    if (normalizedGuestWhatsapp) {
      const { data: fallbackPhoneProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("whatsapp", normalizedGuestWhatsapp)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fallbackPhoneProfile?.id) {
        redirect(`/u/${fallbackPhoneProfile.id}`);
      }
    }
  }

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
      </header>
      <article className="card">
        <strong>{decodedName}</strong>
        <p className="muted">{copy.description}</p>
      </article>
      <Link className="link-btn" href="/">
        {copy.back}
      </Link>
      <BottomNav />
    </main>
  );
}
