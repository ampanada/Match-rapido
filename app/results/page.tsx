import BottomNav from "@/components/BottomNav";
import ProfileAvatar from "@/components/ProfileAvatar";
import MotionProfileLink from "@/components/MotionProfileLink";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaDateString, getCordobaHHMM, getCordobaWeekday } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function isDrawScore(score: string | null | undefined) {
  return score === "6-6";
}

export default async function ResultsPage({
  searchParams
}: {
  searchParams?: Promise<{ guide?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const lang = await getServerLang();
  const showGuide = params.guide === "1";
  const copy =
    lang === "ko"
      ? {
          title: "실시간 경기 결과",
          topStreakTitle: "실시간 Top5 연승 플레이어",
          slogan: "1세트 슬램 · 한 세트 승부",
          rule: "룰: 1세트 승부 결과를 기록하며, 확정 시 승률 통계에 반영됩니다.",
          mechanismTitle: "승률/연승 계산 기준",
          mechanismOpen: "계산 기준 보기",
          mechanismClose: "계산 기준 닫기",
          mechanism1: "포함: status=confirmed 결과만 집계",
          mechanism2: "제외: pending/cancelled 결과, 미확정 매치",
          mechanism3: "승률 공식: (승 / 확정 총경기) × 100",
          mechanism4: "연승: 최신 확정 경기부터 연속 승리 횟수",
          mechanism5: "1 Set Slam 단식 결과 기준으로 업데이트",
          empty: "아직 확정된 결과가 없습니다.",
          set: "1세트",
          court: "코트",
          winner: "승자",
          winTag: "승",
          lossTag: "패",
          drawTag: "무",
          todayBadge: "오늘",
          completedLabel: "완료",
          participants: "참여자",
          participantItem: "참여자",
          hostTag: "호스트",
          recorded: "기록됨",
          unknownCourt: "코트 미지정",
          streakUnit: "연승",
          bestStreak: "최고",
          wlLabel: "전적"
        }
      : {
          title: "Resultados en vivo",
          topStreakTitle: "Top5 en racha en vivo",
          slogan: "1 Set Slam · Partido a un set",
          rule: "Regla: se registra un solo set y, al confirmarse, impacta en el porcentaje de victorias.",
          mechanismTitle: "Como se calcula porcentaje/racha",
          mechanismOpen: "Ver calculo",
          mechanismClose: "Ocultar calculo",
          mechanism1: "Incluye solo resultados con status=confirmed",
          mechanism2: "Excluye pending/cancelled y partidos sin confirmar",
          mechanism3: "Formula: (victorias / total confirmado) × 100",
          mechanism4: "Racha: victorias consecutivas desde el partido confirmado mas reciente",
          mechanism5: "Actualiza con resultados de 1 Set Slam (individual)",
          empty: "Aun no hay resultados confirmados.",
          set: "1 Set Slam",
          court: "Cancha",
          winner: "Ganador",
          winTag: "W",
          lossTag: "L",
          drawTag: "D",
          todayBadge: "Hoy",
          completedLabel: "Completado",
          participants: "Participantes",
          participantItem: "Jugador",
          hostTag: "Host",
          recorded: "Registrado",
          unknownCourt: "Cancha sin definir",
          streakUnit: "seguidas",
          bestStreak: "mejor",
          wlLabel: "W/L"
        };

  const supabase = await createClient();

  const [{ data: results }, { data: streakLeaders }] = await Promise.all([
    supabase
      .from("match_results")
      .select(
        "id,score,winner_id,confirmed_at,created_at,player_a,player_b,player_a_profile:profiles!match_results_player_a_fkey(id,display_name,avatar_url),player_b_profile:profiles!match_results_player_b_fkey(id,display_name,avatar_url),posts!match_results_post_id_fkey(start_at,court_no,host_id)"
      )
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id,display_name,avatar_url,current_streak,best_streak,wins,losses")
      .order("current_streak", { ascending: false })
      .order("best_streak", { ascending: false })
      .order("wins", { ascending: false })
      .order("total_matches", { ascending: false })
      .limit(5)
  ]);

  const missingProfileIds = Array.from(
    new Set(
      (results ?? [])
        .flatMap((result: any) => [result.player_a, result.player_b])
        .filter(Boolean)
    )
  );

  const { data: fallbackProfiles } =
    missingProfileIds.length > 0
      ? await supabase.from("profiles").select("id,display_name,avatar_url").in("id", missingProfileIds)
      : { data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] };

  const fallbackProfileMap = new Map((fallbackProfiles ?? []).map((profile) => [profile.id, profile]));
  const dateLocale = lang === "ko" ? "ko-KR" : "es-AR";
  const todayKey = getCordobaDateString();

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
      </header>
      <p className="notice success">{copy.slogan}</p>
      <p className="muted">{copy.rule}</p>

      <section className="activity-list streak-top-list">
        <div className="row">
          <h2 className="activity-title">{copy.topStreakTitle}</h2>
          <Link
            className="link-inline"
            href={`/results?guide=${showGuide ? "0" : "1"}`}
          >
            {showGuide ? copy.mechanismClose : copy.mechanismOpen}
          </Link>
        </div>
        {(streakLeaders ?? []).slice(0, 5).map((player, index) => (
          <MotionProfileLink className="activity-link" href={`/u/${player.id}`} key={`mini-streak-${player.id}`}>
            <article className="activity-item streak-top-item">
              <div className="streak-top-main">
                <span className="streak-rank">#{index + 1}</span>
                <ProfileAvatar
                  name={player.display_name || (lang === "ko" ? "플레이어" : "Jugador")}
                  avatarUrl={player.avatar_url}
                  size="sm"
                />
                <p className="activity-message">
                  {player.display_name || (lang === "ko" ? "플레이어" : "Jugador")}
                </p>
              </div>
              <div className="streak-top-metrics">
                <p className="streak-metric-line">
                  <strong>{player.current_streak}</strong> <span>{copy.streakUnit}</span>
                </p>
                <p className="streak-metric-line">
                  <span>{copy.wlLabel}</span> <strong>{player.wins}/{player.losses}</strong>
                </p>
              </div>
            </article>
          </MotionProfileLink>
        ))}
      </section>

      {showGuide ? (
        <article className="card mechanism-card">
          <strong>{copy.mechanismTitle}</strong>
          <p className="muted mechanism-item">• {copy.mechanism1}</p>
          <p className="muted mechanism-item">• {copy.mechanism2}</p>
          <p className="muted mechanism-item">• {copy.mechanism3}</p>
          <p className="muted mechanism-item">• {copy.mechanism4}</p>
          <p className="muted mechanism-item">• {copy.mechanism5}</p>
        </article>
      ) : null}

      <section className="section">
        {(results ?? []).length === 0 ? <p className="notice">{copy.empty}</p> : null}

        {(results ?? []).map((result) => {
          const playerA = Array.isArray(result.player_a_profile) ? result.player_a_profile[0] : result.player_a_profile;
          const playerB = Array.isArray(result.player_b_profile) ? result.player_b_profile[0] : result.player_b_profile;
          const post = Array.isArray(result.posts) ? result.posts[0] : result.posts;
          const when = post?.start_at ?? result.created_at;
          const whenDate = getCordobaDateString(new Date(when));
          const weekday = getCordobaWeekday(whenDate, dateLocale);
          const isToday = whenDate === todayKey;
          const slotLabel = post?.start_at ? formatSlotRange(getCordobaHHMM(post.start_at)) : "";
          const draw = isDrawScore(result.score);
          const isAWinner = !draw && result.winner_id === playerA?.id;
          const isBWinner = !draw && result.winner_id === playerB?.id;
          const playerAId = playerA?.id ?? result.player_a ?? null;
          const playerBId = playerB?.id ?? result.player_b ?? null;
          const playerAName =
            playerA?.display_name ||
            (playerAId ? fallbackProfileMap.get(playerAId)?.display_name : null) ||
            (lang === "ko" ? "플레이어 A" : "Jugador A");
          const playerBName =
            playerB?.display_name ||
            (playerBId ? fallbackProfileMap.get(playerBId)?.display_name : null) ||
            (lang === "ko" ? "플레이어 B" : "Jugador B");
          const playerAAvatar =
            playerA?.avatar_url ??
            (playerAId ? fallbackProfileMap.get(playerAId)?.avatar_url : null) ??
            null;
          const playerBAvatar =
            playerB?.avatar_url ??
            (playerBId ? fallbackProfileMap.get(playerBId)?.avatar_url : null) ??
            null;

          return (
            <article className="card match-card match-card-completed result-card" key={result.id}>
              <div className="row">
                {isToday ? <span className="badge">{copy.todayBadge}</span> : <span className="badge">{copy.completedLabel}</span>}
                <span className="muted">{copy.completedLabel}</span>
              </div>
              <div className="result-date-hero">
                <span className="result-weekday">{weekday}</span>
                <span className="result-date-text">{formatCordobaDate(when, dateLocale)}</span>
                {slotLabel ? <span className="result-time-pill">{slotLabel}</span> : null}
              </div>
              <p className="muted">{post?.court_no ? `${copy.court} ${post.court_no}` : copy.unknownCourt}</p>
              <p className="muted">{copy.participants}</p>
              <div className="participant-list">
                {[{ id: playerAId, name: playerAName, avatar: playerAAvatar }, { id: playerBId, name: playerBName, avatar: playerBAvatar }].map(
                  (player, idx) => (
                    <MotionProfileLink
                      key={`${result.id}-participant-${player.id ?? idx}`}
                      className={`participant-chip${player.id ? "" : " disabled-link"}`}
                      href={player.id ? `/u/${player.id}` : "#"}
                    >
                      <span className="participant-row">
                        <span className="participant-index">{copy.participantItem} {idx + 1}</span>
                        <ProfileAvatar name={player.name} avatarUrl={player.avatar} size="sm" />
                        <strong className="participant-name">{player.name}</strong>
                        {player.id && post?.host_id && player.id === post.host_id ? <span className="participant-role">{copy.hostTag}</span> : null}
                      </span>
                    </MotionProfileLink>
                  )
                )}
              </div>

              <p className="result-players">
                <MotionProfileLink className={`link-inline${playerAId ? "" : " disabled-link"}`} href={playerAId ? `/u/${playerAId}` : "#"}>
                  <span className="result-player-line">
                    <ProfileAvatar name={playerAName} avatarUrl={playerAAvatar} size="sm" />
                    <span className="result-player-name">{playerAName}</span>
                    <span className={draw ? "result-tag-draw" : isAWinner ? "result-tag-win" : "result-tag-loss"}>
                      {draw ? copy.drawTag : isAWinner ? copy.winTag : copy.lossTag}
                    </span>
                  </span>
                </MotionProfileLink>{" "}
                vs{" "}
                <MotionProfileLink className={`link-inline${playerBId ? "" : " disabled-link"}`} href={playerBId ? `/u/${playerBId}` : "#"}>
                  <span className="result-player-line">
                    <ProfileAvatar name={playerBName} avatarUrl={playerBAvatar} size="sm" />
                    <span className="result-player-name">{playerBName}</span>
                    <span className={draw ? "result-tag-draw" : isBWinner ? "result-tag-win" : "result-tag-loss"}>
                      {draw ? copy.drawTag : isBWinner ? copy.winTag : copy.lossTag}
                    </span>
                  </span>
                </MotionProfileLink>
              </p>

              <p className="result-scoreline">
                <span className="muted">{copy.recorded}</span>
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
