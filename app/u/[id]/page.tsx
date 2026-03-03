import BottomNav from "@/components/BottomNav";
import ProfileAvatar from "@/components/ProfileAvatar";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

type RivalStat = {
  rivalId: string;
  rivalName: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  streakWinnerId: string | null;
  streakCount: number;
};

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "공개 프로필",
          total: "총 경기",
          wins: "승리",
          losses: "패배",
          wl: "승/패",
          winRate: "승률",
          streak: "현재 연승",
          bestStreak: "최고 연승",
          recent: "최근 10경기",
          noRecent: "확정된 경기 결과가 없습니다.",
          win: "승",
          loss: "패",
          court: "코트",
          unknownCourt: "코트 미지정",
          score: "결과",
          rivals: "상대전적 TOP 5",
          rivalsEmpty: "상대전적 데이터가 아직 없습니다.",
          rivalsTotal: "전적",
          rivalsRate: "승률",
          settings: "설정"
        }
      : {
          title: "Perfil publico",
          total: "Total partidos",
          wins: "Victorias",
          losses: "Derrotas",
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
          rivals: "Head to Head TOP 5",
          rivalsEmpty: "Aun no hay datos de rivales.",
          rivalsTotal: "Historial",
          rivalsRate: "Porcentaje",
          settings: "Ajustes"
        };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user?.id === id) {
    // Only ensure row existence; never overwrite user-defined display_name here.
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? ""
      },
      { onConflict: "id" }
    );
  }

  const [{ data: profile }, { data: recentResults }, { data: rivalRows }, { count: totalConfirmedCount }, { count: winsCount }, { data: streakRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,display_name,avatar_url,wins,losses,total_matches,current_streak,best_streak")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("match_results")
      .select(
        "id,player_a,player_b,winner_id,score,confirmed_at,posts!match_results_post_id_fkey(start_at,court_no),player_a_profile:profiles!match_results_player_a_fkey(id,display_name),player_b_profile:profiles!match_results_player_b_fkey(id,display_name)"
      )
      .eq("status", "confirmed")
      .or(`player_a.eq.${id},player_b.eq.${id}`)
      .order("confirmed_at", { ascending: false })
      .limit(10),
    supabase
      .from("match_results")
      .select("player_a,player_b,winner_id,confirmed_at")
      .eq("status", "confirmed")
      .or(`player_a.eq.${id},player_b.eq.${id}`)
      .order("confirmed_at", { ascending: false })
      .limit(500),
    supabase
      .from("match_results")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .or(`player_a.eq.${id},player_b.eq.${id}`),
    supabase
      .from("match_results")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .eq("winner_id", id)
      .or(`player_a.eq.${id},player_b.eq.${id}`),
    supabase
      .from("match_results")
      .select("winner_id,confirmed_at,created_at")
      .eq("status", "confirmed")
      .or(`player_a.eq.${id},player_b.eq.${id}`)
      .order("confirmed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5000)
  ]);

  const rivalStats = new Map<string, { wins: number; losses: number; total: number; winners: string[] }>();

  for (const row of rivalRows ?? []) {
    const opponentId = row.player_a === id ? row.player_b : row.player_a;
    const entry = rivalStats.get(opponentId) ?? { wins: 0, losses: 0, total: 0, winners: [] };
    entry.total += 1;
    if (row.winner_id === id) {
      entry.wins += 1;
    } else {
      entry.losses += 1;
    }
    entry.winners.push(row.winner_id);
    rivalStats.set(opponentId, entry);
  }

  const rivalIds = Array.from(rivalStats.keys());
  const { data: rivalProfiles } =
    rivalIds.length > 0
      ? await supabase.from("profiles").select("id,display_name").in("id", rivalIds)
      : { data: [] as { id: string; display_name: string | null }[] };

  const rivalNameMap = new Map((rivalProfiles ?? []).map((p) => [p.id, p.display_name]));

  const topRivals: RivalStat[] = rivalIds
    .map((rivalId) => {
      const stat = rivalStats.get(rivalId)!;
      const firstWinner = stat.winners[0] ?? null;
      let streakCount = 0;
      for (const winnerId of stat.winners) {
        if (winnerId === firstWinner) {
          streakCount += 1;
        } else {
          break;
        }
      }

      return {
        rivalId,
        rivalName: rivalNameMap.get(rivalId) || (lang === "ko" ? "상대" : "Rival"),
        wins: stat.wins,
        losses: stat.losses,
        total: stat.total,
        winRate: stat.total > 0 ? Math.round((stat.wins / stat.total) * 100) : 0,
        streakWinnerId: firstWinner,
        streakCount
      };
    })
    .sort((a, b) => (b.total === a.total ? b.wins - a.wins : b.total - a.total))
    .slice(0, 5);

  const profileFallbackName =
    profile?.display_name ||
    (user?.id === id
      ? (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined)
      : lang === "ko"
        ? "플레이어"
        : "Jugador");

  const safeProfile = {
    id: profile?.id ?? id,
    display_name: profile?.display_name || profileFallbackName || (lang === "ko" ? "플레이어" : "Jugador"),
    avatar_url: profile?.avatar_url ?? null,
    wins: profile?.wins ?? 0,
    losses: profile?.losses ?? 0,
    total_matches: profile?.total_matches ?? 0,
    current_streak: profile?.current_streak ?? 0,
    best_streak: profile?.best_streak ?? 0
  };

  const computedTotal = totalConfirmedCount ?? 0;
  const computedWins = winsCount ?? 0;
  const computedLosses = Math.max(0, computedTotal - computedWins);
  const winRate = computedTotal > 0 ? Math.round((computedWins / computedTotal) * 100) : 0;

  const winnerSequence = (streakRows ?? []).map((row) => row.winner_id);
  const computedCurrentStreak = (() => {
    let streak = 0;
    for (const winnerId of winnerSequence) {
      if (winnerId === id) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  })();
  const computedBestStreak = (() => {
    let best = 0;
    let run = 0;
    for (const winnerId of winnerSequence) {
      if (winnerId === id) {
        run += 1;
        if (run > best) {
          best = run;
        }
      } else {
        run = 0;
      }
    }
    return best;
  })();

  return (
    <main className="shell">
      <header className="top">
        <div className="my-hero-row">
          <ProfileAvatar name={safeProfile.display_name || copy.title} avatarUrl={safeProfile.avatar_url} size="md" />
          <h1>{safeProfile.display_name || copy.title}</h1>
        </div>
        {user?.id === id ? (
          <Link className="profile-settings-btn" href="/my">
            {copy.settings}
          </Link>
        ) : null}
      </header>

      <section className="card profile-stat-card">
        <p className="profile-highlight">{copy.winRate} {winRate}%</p>
        <div className="profile-stat-grid">
          <div className="profile-stat-item">
            <span>{copy.total}</span>
            <strong>{computedTotal}</strong>
          </div>
          <div className="profile-stat-item">
            <span>{copy.wins}</span>
            <strong className="winner-name">{computedWins}</strong>
          </div>
          <div className="profile-stat-item">
            <span>{copy.losses}</span>
            <strong className="loss-name">{computedLosses}</strong>
          </div>
          <div className="profile-stat-item">
            <span>{copy.wl}</span>
            <strong>
              {computedWins} / {computedLosses}
            </strong>
          </div>
          <div className="profile-stat-item">
            <span>{copy.streak}</span>
            <strong>{computedCurrentStreak}</strong>
          </div>
          <div className="profile-stat-item">
            <span>{copy.bestStreak}</span>
            <strong>{computedBestStreak}</strong>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="subhead">{copy.rivals}</h2>
        {topRivals.length === 0 ? <p className="notice">{copy.rivalsEmpty}</p> : null}
        {topRivals.map((item) => (
          <article className="card" key={item.rivalId}>
            <p className="result-players">
              <Link className="link-inline" href={`/u/${item.rivalId}`}>
                {item.rivalName}
              </Link>
            </p>
            <p className="result-summary">
              {copy.rivalsTotal}: <strong>{item.wins}</strong>-<strong>{item.losses}</strong> ({item.total})
            </p>
            <p className="result-summary">
              {copy.rivalsRate}: {item.winRate}%
            </p>
            {item.total >= 2 && item.streakCount > 1 ? (
              <p className="muted">
                {(item.streakWinnerId === id ? (lang === "ko" ? "나" : "Yo") : item.rivalName) +
                  (lang === "ko" ? ` ${item.streakCount}연승 🔥` : ` lleva ${item.streakCount} seguidas 🔥`)}
              </p>
            ) : null}
          </article>
        ))}
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
                <strong className={isWin ? "winner-name" : "loss-name"}>{isWin ? copy.win : copy.loss}</strong> ·{" "}
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
