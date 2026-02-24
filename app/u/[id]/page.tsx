import BottomNav from "@/components/BottomNav";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PublicProfilePage({ params }: { params: { id: string } }) {
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "공개 프로필",
          tier: "레벨/티어",
          total: "총 경기",
          wl: "승/패",
          winRate: "승률",
          streak: "현재 연승",
          bestStreak: "최고 연승",
          recent: "최근 10경기",
          noRecent: "확정된 경기 결과가 없습니다.",
          win: "승",
          loss: "패",
          court: "코트",
          settings: "내 설정"
        }
      : {
          title: "Perfil publico",
          tier: "Nivel/Tier",
          total: "Total partidos",
          wl: "Victorias/Derrotas",
          winRate: "Win rate",
          streak: "Racha actual",
          bestStreak: "Mejor racha",
          recent: "Ultimos 10 partidos",
          noRecent: "No hay resultados confirmados.",
          win: "Win",
          loss: "Loss",
          court: "Cancha",
          settings: "Mis ajustes"
        };

  const supabase = await createClient();

  const [{ data: profile }, { data: latestHostPost }, { data: recentResults }, { data: authData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,wins,losses,total_matches,current_streak,best_streak")
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("posts")
      .select("level")
      .eq("host_id", params.id)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("match_results")
      .select(
        "id,player_a,player_b,winner_id,score,confirmed_at,posts!match_results_post_id_fkey(start_at,court_no),player_a_profile:profiles!match_results_player_a_fkey(id,display_name),player_b_profile:profiles!match_results_player_b_fkey(id,display_name)"
      )
      .eq("status", "confirmed")
      .or(`player_a.eq.${params.id},player_b.eq.${params.id}`)
      .order("confirmed_at", { ascending: false })
      .limit(10),
    supabase.auth.getUser()
  ]);

  if (!profile) {
    notFound();
  }

  const winRate = profile.total_matches > 0 ? Math.round((profile.wins / profile.total_matches) * 100) : 0;

  return (
    <main className="shell">
      <header className="top">
        <h1>{profile.display_name || copy.title}</h1>
        {authData.user?.id === params.id ? (
          <Link className="link-btn" href="/my">
            {copy.settings}
          </Link>
        ) : null}
      </header>

      <section className="card">
        <p>
          <strong>{copy.tier}:</strong> {latestHostPost?.level ?? "-"}
        </p>
        <p>
          <strong>{copy.total}:</strong> {profile.total_matches}
        </p>
        <p>
          <strong>{copy.wl}:</strong> {profile.wins} / {profile.losses}
        </p>
        <p>
          <strong>{copy.winRate}:</strong> {winRate}%
        </p>
        <p>
          <strong>{copy.streak}:</strong> {profile.current_streak}
        </p>
        <p>
          <strong>{copy.bestStreak}:</strong> {profile.best_streak}
        </p>
      </section>

      <section className="section">
        <h2 className="subhead">{copy.recent}</h2>
        {(recentResults ?? []).length === 0 ? <p className="notice">{copy.noRecent}</p> : null}

        {(recentResults ?? []).map((result) => {
          const playerA = Array.isArray(result.player_a_profile) ? result.player_a_profile[0] : result.player_a_profile;
          const playerB = Array.isArray(result.player_b_profile) ? result.player_b_profile[0] : result.player_b_profile;
          const post = Array.isArray(result.posts) ? result.posts[0] : result.posts;
          const isWin = result.winner_id === params.id;
          const opponentName =
            result.player_a === params.id
              ? playerB?.display_name || (lang === "ko" ? "상대" : "Rival")
              : playerA?.display_name || (lang === "ko" ? "상대" : "Rival");

          return (
            <article className="card" key={result.id}>
              <p>
                <strong>{isWin ? copy.win : copy.loss}</strong> · {opponentName}
              </p>
              <p>Score: {result.score}</p>
              <p className="muted">
                {formatCordobaDate(post?.start_at ?? result.confirmed_at ?? new Date().toISOString(), lang === "ko" ? "ko-KR" : "es-AR")}
                {post?.start_at ? ` · ${formatSlotRange(getCordobaHHMM(post.start_at))}` : ""}
                {post?.court_no ? ` · ${copy.court} ${post.court_no}` : ""}
              </p>
            </article>
          );
        })}
      </section>

      <BottomNav />
    </main>
  );
}
