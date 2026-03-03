import BottomNav from "@/components/BottomNav";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ResultsPage() {
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "경기 결과",
          slogan: "1세트 슬램 · 한 세트 승부",
          rule: "룰: 1세트 승부 결과를 기록하며, 확정 시 승률 통계에 반영됩니다.",
          empty: "아직 확정된 결과가 없습니다.",
          set: "1세트",
          court: "코트",
          winner: "승자",
          unknownCourt: "코트 미지정"
        }
      : {
          title: "Resultados",
          slogan: "1 Set Slam · Partido a un set",
          rule: "Regla: se registra un solo set y, al confirmarse, impacta en el porcentaje de victorias.",
          empty: "Aun no hay resultados confirmados.",
          set: "1 Set Slam",
          court: "Cancha",
          winner: "Ganador",
          unknownCourt: "Cancha sin definir"
        };

  const supabase = await createClient();
  const { data: results } = await supabase
    .from("match_results")
    .select(
      "id,score,winner_id,confirmed_at,created_at,player_a_profile:profiles!match_results_player_a_fkey(id,display_name),player_b_profile:profiles!match_results_player_b_fkey(id,display_name),posts!match_results_post_id_fkey(start_at,court_no)"
    )
    .eq("status", "confirmed")
    .order("confirmed_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
      </header>
      <p className="notice success">{copy.slogan}</p>
      <p className="muted">{copy.rule}</p>

      <section className="section">
        {(results ?? []).length === 0 ? <p className="notice">{copy.empty}</p> : null}

        {(results ?? []).map((result) => {
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
        })}
      </section>

      <BottomNav />
    </main>
  );
}
