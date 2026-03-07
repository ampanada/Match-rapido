import BottomNav from "@/components/BottomNav";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GuestProfileRedirectPage({
  params
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "게스트 프로필을 찾지 못했습니다.",
          back: "홈으로 돌아가기"
        }
      : {
          title: "No se encontro el perfil del invitado.",
          back: "Volver al inicio"
        };

  const decodedName = decodeURIComponent(name).trim();
  if (!decodedName) {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id,display_name,is_guest,total_matches,created_at")
    .ilike("display_name", decodedName)
    .order("total_matches", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  const profile = (profileRows ?? [])
    .sort((a, b) => {
      const aGuest = a.is_guest === true ? 1 : 0;
      const bGuest = b.is_guest === true ? 1 : 0;
      if (aGuest !== bGuest) {
        return aGuest - bGuest;
      }
      return (b.total_matches ?? 0) - (a.total_matches ?? 0);
    })[0];

  if (profile?.id) {
    redirect(`/u/${profile.id}`);
  }

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
      </header>
      <Link className="link-btn" href="/">
        {copy.back}
      </Link>
      <BottomNav />
    </main>
  );
}
