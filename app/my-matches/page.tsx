import BottomNav from "@/components/BottomNav";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM, SLOT_MINUTES } from "@/lib/constants/slots";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

function safeTime(value: unknown) {
  const ms = new Date(String(value ?? "")).getTime();
  return Number.isNaN(ms) ? null : ms;
}

type MatchItem = {
  id: string;
  start_at: string;
  format: string;
  needed: number;
  court_no: number | null;
  status: string;
  joins: Array<{ status: string; user_id: string }>;
};

export default async function MyMatchesPage() {
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "내 매칭",
          nowTitle: "지금 플레이 중",
          upcomingTitle: "다가오는 매칭",
          completedTitle: "플레이 완료",
          nowBadge: "지금 플레이 중",
          record: "점수 기록",
          noNow: "지금 플레이 중인 매치가 없습니다.",
          noUpcoming: "다가오는 매칭이 없습니다.",
          noCompleted: "완료된 매칭이 없습니다.",
          court: "코트",
          noCourt: "코트 미지정",
          players: "인원",
          completedLabel: "완료",
          recorded: "기록됨"
        }
      : {
          title: "Mis partidos",
          nowTitle: "Jugando ahora",
          upcomingTitle: "Proximos partidos",
          completedTitle: "Completados",
          nowBadge: "Jugando ahora",
          record: "Registrar marcador",
          noNow: "No hay partidos en juego ahora.",
          noUpcoming: "No hay partidos proximos.",
          noCompleted: "No hay partidos completados.",
          court: "Cancha",
          noCourt: "Sin cancha",
          players: "Jugadores",
          completedLabel: "Completado",
          recorded: "registrado"
        };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?reason=auth_required");
  }

  const [hostResponse, joinResponse] = await Promise.all([
    supabase
      .from("posts")
      .select("id,start_at,format,needed,court_no,status,joins(status,user_id)")
      .eq("host_id", user.id)
      .order("start_at", { ascending: false })
      .limit(80),
    supabase
      .from("joins")
      .select("post_id,posts!joins_post_id_fkey(id,start_at,format,needed,court_no,status,joins(status,user_id))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80)
  ]);

  const hostPosts = (hostResponse.data ?? []) as MatchItem[];
  const joinedPosts = (joinResponse.data ?? [])
    .map((row: any) => (Array.isArray(row.posts) ? row.posts[0] : row.posts))
    .filter(Boolean) as MatchItem[];

  const postMap = new Map<string, MatchItem>();
  for (const post of [...hostPosts, ...joinedPosts]) {
    if (!postMap.has(post.id)) {
      postMap.set(post.id, post);
    }
  }

  const mergedPosts = Array.from(postMap.values());
  const postIds = mergedPosts.map((post) => post.id);

  const { data: results } =
    postIds.length > 0
      ? await supabase.from("match_results").select("post_id,status,score").in("post_id", postIds)
      : { data: [] as { post_id: string; status: string; score: string }[] };

  const resultMap = new Map((results ?? []).map((result) => [result.post_id, result]));

  const now = Date.now();
  const durationMs = SLOT_MINUTES * 60 * 1000;

  const normalized = mergedPosts
    .map((post) => {
      const startMs = safeTime(post.start_at);
      if (startMs === null) {
        return null;
      }

      const joins = Array.isArray(post.joins) ? post.joins : [];
      const approvedCount = joins.filter((join) => join.status === "approved").length;
      const currentPlayers = approvedCount + 1;
      const isSingleReady = post.format === "single" && approvedCount === 1;
      const result = resultMap.get(post.id);
      const hasConfirmedResult = result?.status === "confirmed";

      const isPlayingNow = now >= startMs && now < startMs + durationMs;
      const isUpcoming = startMs > now;
      const isCompleted = now >= startMs + durationMs;

      return {
        ...post,
        startMs,
        currentPlayers,
        isSingleReady,
        hasConfirmedResult,
        resultScore: result?.score ?? null,
        isPlayingNow,
        isUpcoming,
        isCompleted
      };
    })
    .filter(Boolean) as Array<
    MatchItem & {
      startMs: number;
      currentPlayers: number;
      isSingleReady: boolean;
      hasConfirmedResult: boolean;
      resultScore: string | null;
      isPlayingNow: boolean;
      isUpcoming: boolean;
      isCompleted: boolean;
    }
  >;

  const playingNow = normalized
    .filter((item) => item.isPlayingNow)
    .sort((a, b) => a.startMs - b.startMs);

  const upcoming = normalized
    .filter((item) => item.isUpcoming)
    .sort((a, b) => a.startMs - b.startMs);

  const completed = normalized
    .filter((item) => item.isCompleted)
    .sort((a, b) => b.startMs - a.startMs);

  const dateLocale = lang === "ko" ? "ko-KR" : "es-AR";

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
      </header>

      <section className="section">
        <article className="card">
          <strong>{copy.nowTitle}</strong>
          {playingNow.length === 0 ? <p className="muted">{copy.noNow}</p> : null}
          {playingNow.map((item) => {
            const startHHMM = getCordobaHHMM(item.start_at);
            return (
              <article key={`now-${item.id}`} className="card">
                <div className="row">
                  <span className="badge">{copy.nowBadge}</span>
                  <span className="muted">{copy.completedLabel}</span>
                </div>
                <p>
                  <strong>
                    {formatCordobaDate(item.start_at, dateLocale)} · {formatSlotRange(startHHMM)}
                  </strong>
                </p>
                <p className="muted">{item.court_no ? `${copy.court} ${item.court_no}` : copy.noCourt}</p>
                {item.isSingleReady && !item.hasConfirmedResult ? (
                  <Link className="link-btn" href={`/post/${item.id}?record=1`}>
                    {copy.record}
                  </Link>
                ) : item.hasConfirmedResult ? (
                  <p className="muted">{item.resultScore} {copy.recorded}</p>
                ) : null}
              </article>
            );
          })}
        </article>

        <article className="card">
          <strong>{copy.upcomingTitle}</strong>
          {upcoming.length === 0 ? <p className="muted">{copy.noUpcoming}</p> : null}
          {upcoming.map((item) => {
            const startHHMM = getCordobaHHMM(item.start_at);
            return (
              <article key={`upcoming-${item.id}`} className="card">
                <p>
                  <strong>
                    {formatCordobaDate(item.start_at, dateLocale)} · {formatSlotRange(startHHMM)}
                  </strong>
                </p>
                <p className="muted">{item.court_no ? `${copy.court} ${item.court_no}` : copy.noCourt}</p>
                <p className="muted">
                  {copy.players}: {item.currentPlayers}/{item.needed}
                </p>
              </article>
            );
          })}
        </article>

        <article className="card">
          <details className="compact-block" open={false}>
            <summary>{copy.completedTitle}</summary>
            {completed.length === 0 ? <p className="muted">{copy.noCompleted}</p> : null}
            {completed.map((item) => {
              const startHHMM = getCordobaHHMM(item.start_at);
              return (
                <article key={`completed-${item.id}`} className="card">
                  <p className="compact-line">
                    {formatCordobaDate(item.start_at, dateLocale)} | {formatSlotRange(startHHMM)} | {item.court_no ? `${copy.court} ${item.court_no}` : copy.noCourt} | {copy.completedLabel}
                  </p>
                  {item.isSingleReady && !item.hasConfirmedResult ? (
                    <Link className="link-btn" href={`/post/${item.id}?record=1`}>
                      {copy.record}
                    </Link>
                  ) : item.hasConfirmedResult ? (
                    <p className="muted">{item.resultScore} {copy.recorded}</p>
                  ) : null}
                </article>
              );
            })}
          </details>
        </article>
      </section>

      <BottomNav />
    </main>
  );
}
