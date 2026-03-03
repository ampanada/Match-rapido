import BottomNav from "@/components/BottomNav";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
          settings: "설정"
        }
      : {
          title: "Perfil publico",
          tier: "Nivel/Tier",
          total: "Total partidos",
          wl: "Victorias/Derrotas",
          winRate: "Porcentaje de victoria",
          streak: "Racha actual",
          bestStreak: "Mejor racha",
          recent: "Ultimos 10 partidos",
          noRecent: "No hay resultados confirmados.",
          win: "Victoria",
          loss: "Derrota",
          court: "Cancha",
          unknownCourt: "Cancha sin definir",
          score: "Resultado",
          settings: "Ajustes"
        };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  // Self-heal missing profile row for logged-in user to avoid /u/[id] 404.
  if (user?.id === id) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? ""
      },
      { onConflict: "id" }
    );
  }

  const [{ data: profile }, { data: latestHostPost }, { data: recentResults }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,wins,losses,total_matches,current_streak,best_streak")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("posts")
      .select("level")
      .eq("host_id", id)
      .order("start_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("match_results")
      .select(
        "id,player_a,player_b,winner_id,score,confirmed_at,posts!match_results_post_id_fkey(start_at,court_no),player_a_profile:profiles!match_results_player_a_fkey(id,display_name),player_b_profile:profiles!match_results_player_b_fkey(id,display_name)"
      )
      .eq("status", "confirmed")
      .or(`player_a.eq.${id},player_b.eq.${id}`)
      .order("confirmed_at", { ascending: false })
      .limit(10)
  ]);

  const safeProfile = profile ?? {
    id: id,
    display_name: lang === "ko" ? "사용자" : "Jugador",
    wins: 0,
    losses: 0,
    total_matches: 0,
    current_streak: 0,
    best_streak: 0
  };

  const winRate = safeProfile.total_matches > 0 ? Math.round((safeProfile.wins / safeProfile.total_matches) * 100) : 0;

  return (
    <main className="shell">
      <header className="top">
        <h1>{safeProfile.display_name || copy.title}</h1>
        {user?.id === id ? (
          <Link className="profile-settings-btn" href="/my">
            {copy.settings}
          </Link>
        ) : null}
      </header>

      <section className="card">
        <p>
          <strong>{copy.tier}:</strong> {latestHostPost?.level ?? "-"}
        </p>
        <p>
          <strong>{copy.total}:</strong> {safeProfile.total_matches}
        </p>
        <p>
          <strong>{copy.wl}:</strong> {safeProfile.wins} / {safeProfile.losses}
        </p>
        <p>
          <strong>{copy.winRate}:</strong> {winRate}%
        </p>
        <p>
          <strong>{copy.streak}:</strong> {safeProfile.current_streak}
        </p>
        <p>
          <strong>{copy.bestStreak}:</strong> {safeProfile.best_streak}
        </p>
      </section>

      <section className="section">
        <h2 className="subhead">{copy.recent}</h2>
        {(recentResults ?? []).length === 0 ? <p className="notice">{copy.noRecent}</p> : null}

        {(recentResults ?? []).map((result) => {
          const playerA = Array.isArray(result.player_a_profile) ? result.player_a_profile[0] : result.player_a_profile;
          const playerB = Array.isArray(result.player_b_profile) ? result.player_b_profile[0] : result.player_b_profile;
          const post = Array.isArray(result.posts) ? result.posts[0] : result.posts;
          const isWin = result.winner_id === id;
          const opponentName =
            result.player_a === id
              ? playerB?.display_name || (lang === "ko" ? "상대" : "Rival")
              : playerA?.display_name || (lang === "ko" ? "상대" : "Rival");

          return (
            <article className="card result-card" key={result.id}>
              <div className="result-meta-strong">
                <strong>{formatCordobaDate(post?.start_at ?? result.confirmed_at ?? new Date().toISOString(), lang === "ko" ? "ko-KR" : "es-AR")}</strong>
                {post?.start_at ? <span>{formatSlotRange(getCordobaHHMM(post.start_at))}</span> : null}
                <span>{post?.court_no ? `${copy.court} ${post.court_no}` : copy.unknownCourt}</span>
              </div>
              <p className="result-players">
                <strong className={isWin ? "winner-name" : ""}>{isWin ? copy.win : copy.loss}</strong> ·{" "}
                <Link className="link-inline" href={result.player_a === id ? `/u/${playerB?.id}` : `/u/${playerA?.id}`}>
                  {opponentName}
                </Link>
              </p>
              <p className="result-scoreline">
                <span className="muted">{copy.score}</span>
                <strong>{result.score}</strong>
              </p>
            </article>
          );
        })}
      </section>

      <BottomNav />
    </main>
  );
}
