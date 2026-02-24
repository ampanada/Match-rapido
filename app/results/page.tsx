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
          empty: "아직 확정된 결과가 없습니다.",
          set: "1세트",
          court: "코트"
        }
      : {
          title: "Resultados",
          empty: "Aun no hay resultados confirmados.",
          set: "1 Set Slam",
          court: "Cancha"
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

      <section className="section">
        {(results ?? []).length === 0 ? <p className="notice">{copy.empty}</p> : null}

        {(results ?? []).map((result) => {
          const playerA = Array.isArray(result.player_a_profile) ? result.player_a_profile[0] : result.player_a_profile;
          const playerB = Array.isArray(result.player_b_profile) ? result.player_b_profile[0] : result.player_b_profile;
          const post = Array.isArray(result.posts) ? result.posts[0] : result.posts;
          const when = post?.start_at ?? result.created_at;
          const slotLabel = post?.start_at ? formatSlotRange(getCordobaHHMM(post.start_at)) : "";

          return (
            <article className="card" key={result.id}>
              <p>
                <Link className="link-inline" href={`/u/${playerA?.id}`}>
                  {playerA?.display_name || (lang === "ko" ? "플레이어 A" : "Jugador A")}
                </Link>{" "}
                vs{" "}
                <Link className="link-inline" href={`/u/${playerB?.id}`}>
                  {playerB?.display_name || (lang === "ko" ? "플레이어 B" : "Jugador B")}
                </Link>
              </p>
              <p>
                {copy.set}: {result.score}
              </p>
              <p className="muted">
                {formatCordobaDate(when, lang === "ko" ? "ko-KR" : "es-AR")}
                {slotLabel ? ` · ${slotLabel}` : ""}
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
