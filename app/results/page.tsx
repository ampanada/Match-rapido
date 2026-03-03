import BottomNav from "@/components/BottomNav";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ResultsPage({
  searchParams
}: {
  searchParams?: { view?: string; guide?: string };
}) {
  const lang = await getServerLang();
  const view = searchParams?.view === "streak" ? "streak" : "results";
  const showGuide = searchParams?.guide === "1";
  const copy =
    lang === "ko"
      ? {
          title: "경기 결과",
          tabResults: "경기결과",
          tabStreak: "연승 TOP 5",
          topStreakTitle: "상단 연승 플레이어",
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
          emptyStreak: "연승 랭킹 데이터가 아직 없습니다.",
          set: "1세트",
          court: "코트",
          winner: "승자",
          unknownCourt: "코트 미지정",
          streakUnit: "연승",
          bestStreak: "최고"
        }
      : {
          title: "Resultados",
          tabResults: "Resultados",
          tabStreak: "Top 5 rachas",
          topStreakTitle: "Jugadores en racha",
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
          emptyStreak: "Aun no hay datos de rachas.",
          set: "1 Set Slam",
          court: "Cancha",
          winner: "Ganador",
          unknownCourt: "Cancha sin definir",
          streakUnit: "seguidas",
          bestStreak: "mejor"
        };

  const supabase = await createClient();

  const [{ data: results }, { data: streakLeaders }] = await Promise.all([
    supabase
      .from("match_results")
      .select(
        "id,score,winner_id,confirmed_at,created_at,player_a_profile:profiles!match_results_player_a_fkey(id,display_name),player_b_profile:profiles!match_results_player_b_fkey(id,display_name),posts!match_results_post_id_fkey(start_at,court_no)"
      )
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id,display_name,current_streak,best_streak,wins,losses")
      .gt("current_streak", 0)
      .order("current_streak", { ascending: false })
      .order("best_streak", { ascending: false })
      .order("wins", { ascending: false })
      .limit(5)
  ]);

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
      </header>
      <p className="notice success">{copy.slogan}</p>
      <p className="muted">{copy.rule}</p>

      <section className="activity-list">
        <div className="row">
          <h2 className="activity-title">{copy.topStreakTitle}</h2>
          <Link
            className="link-inline"
            href={`/results?view=${view}&guide=${showGuide ? "0" : "1"}`}
          >
            {showGuide ? copy.mechanismClose : copy.mechanismOpen}
          </Link>
        </div>
        {(streakLeaders ?? []).slice(0, 5).map((player, index) => (
          <Link className="activity-link" href={`/u/${player.id}`} key={`mini-streak-${player.id}`}>
            <article className="activity-item">
              <p className="activity-message">
                #{index + 1} {player.display_name || (lang === "ko" ? "플레이어" : "Jugador")}
              </p>
              <p className="activity-time">
                {player.current_streak} {copy.streakUnit} · W/L {player.wins}/{player.losses}
              </p>
            </article>
          </Link>
        ))}
      </section>

      {showGuide ? (
        <article className="card">
          <strong>{copy.mechanismTitle}</strong>
          <p className="muted">• {copy.mechanism1}</p>
          <p className="muted">• {copy.mechanism2}</p>
          <p className="muted">• {copy.mechanism3}</p>
          <p className="muted">• {copy.mechanism4}</p>
          <p className="muted">• {copy.mechanism5}</p>
        </article>
      ) : null}

      <section className="section">
        <div className="seg-tabs">
          <Link className={`seg-tab${view === "results" ? " active" : ""}`} href="/results?view=results">
            {copy.tabResults}
          </Link>
          <Link className={`seg-tab${view === "streak" ? " active" : ""}`} href="/results?view=streak">
            {copy.tabStreak}
          </Link>
        </div>
      </section>

      <section className="section">
        {view === "results" && (results ?? []).length === 0 ? <p className="notice">{copy.empty}</p> : null}
        {view === "streak" && (streakLeaders ?? []).length === 0 ? <p className="notice">{copy.emptyStreak}</p> : null}

        {view === "streak"
          ? (streakLeaders ?? []).map((player, index) => (
              <Link className="card-link" href={`/u/${player.id}`} key={player.id}>
                <article className="card">
                  <div className="row">
                    <strong>
                      #{index + 1} {player.display_name || (lang === "ko" ? "플레이어" : "Jugador")}
                    </strong>
                    <span className="status-chip done">
                      {player.current_streak} {copy.streakUnit}
                    </span>
                  </div>
                  <p className="muted">
                    W/L: {player.wins} / {player.losses} · {copy.bestStreak}: {player.best_streak}
                  </p>
                </article>
              </Link>
            ))
          : null}

        {view === "results"
          ? (results ?? []).map((result) => {
          const playerA = Array.isArray(result.player_a_profile) ? result.player_a_profile[0] : result.player_a_profile;
          const playerB = Array.isArray(result.player_b_profile) ? result.player_b_profile[0] : result.player_b_profile;
          const post = Array.isArray(result.posts) ? result.posts[0] : result.posts;
          const when = post?.start_at ?? result.created_at;
          const slotLabel = post?.start_at ? formatSlotRange(getCordobaHHMM(post.start_at)) : "";
          const isAWinner = result.winner_id === playerA?.id;
          const isBWinner = result.winner_id === playerB?.id;

          return (
            <article className="card result-card" key={result.id}>
              <div className="result-meta-strong">
                <strong>{formatCordobaDate(when, lang === "ko" ? "ko-KR" : "es-AR")}</strong>
                {slotLabel ? <span>{slotLabel}</span> : null}
                <span>{post?.court_no ? `${copy.court} ${post.court_no}` : copy.unknownCourt}</span>
              </div>

              <p className="result-players">
                <Link className="link-inline" href={`/u/${playerA?.id}`}>
                  <span className={isAWinner ? "winner-name" : "loss-name"}>
                    {playerA?.display_name || (lang === "ko" ? "플레이어 A" : "Jugador A")}
                    {isAWinner ? <em className="winner-chip">{copy.winner}</em> : null}
                  </span>
                </Link>{" "}
                vs{" "}
                <Link className="link-inline" href={`/u/${playerB?.id}`}>
                  <span className={isBWinner ? "winner-name" : "loss-name"}>
                    {playerB?.display_name || (lang === "ko" ? "플레이어 B" : "Jugador B")}
                    {isBWinner ? <em className="winner-chip">{copy.winner}</em> : null}
                  </span>
                </Link>
              </p>

              <p className="result-scoreline">
                <span className="muted">{copy.set} · 1 Set Slam</span>
                <strong>{result.score}</strong>
              </p>
            </article>
          );
        })
          : null}
      </section>

      <BottomNav />
    </main>
  );
}
