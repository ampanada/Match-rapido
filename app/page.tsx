import BottomNav from "@/components/BottomNav";
import FiltersBar from "@/components/FiltersBar";
import PostCard from "@/components/PostCard";
import { getCordobaDateString, getCordobaDayBoundsIso, getCordobaHHMM, getCordobaWeekday } from "@/lib/constants/slots";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export default async function Home({
  searchParams
}: {
  searchParams: {
    format?: string;
    level?: string;
    todayOnly?: string;
  };
}) {
  const lang = getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "빠른매칭",
          subtitle: "로그인 없이 둘러보기 가능",
          loadError: "목록을 불러오지 못했습니다.",
          empty: "조건에 맞는 매치가 없습니다."
        }
      : {
          title: "Match rapido",
          subtitle: "Se puede ver sin iniciar sesion",
          loadError: "No se pudo cargar la lista.",
          empty: "No hay partidos para este filtro."
        };

  const supabase = createClient();

  const now = new Date();
  const expiryCutoffIso = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
  const cordobaToday = getCordobaDateString(now);
  const todayBounds = getCordobaDayBoundsIso(cordobaToday);

  let query = supabase
    .from("posts")
    .select(
      "id,host_id,start_at,format,level,needed,court_no,note,status,profiles!posts_host_id_fkey(display_name),joins(id,status)"
    )
    .eq("status", "open")
    .gte("start_at", expiryCutoffIso)
    .order("start_at", { ascending: true });

  if (searchParams.todayOnly === "1") {
    const effectiveStartIso = todayBounds.startIso > expiryCutoffIso ? todayBounds.startIso : expiryCutoffIso;
    query = query.gte("start_at", effectiveStartIso).lte("start_at", todayBounds.endIso);
  }

  if (searchParams.format) {
    query = query.eq("format", searchParams.format);
  }

  if (searchParams.level) {
    query = query.eq("level", searchParams.level);
  }

  const { data, error } = await query;

  const items =
    data?.map((post) => {
      const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;

      return {
        id: post.id,
        start_at: post.start_at,
        format: post.format,
        level: post.level,
        needed: post.needed,
        court_no: post.court_no,
        note: post.note,
        status: post.status,
        joinsCount: post.joins?.filter((join) => join.status === "approved").length ?? 0,
        hostName: profile?.display_name || (lang === "ko" ? "호스트" : "Host"),
        isExpired: new Date(post.start_at).getTime() + 30 * 60 * 1000 < Date.now()
      };
    }) ?? [];

  const groupedByDate = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = getCordobaDateString(new Date(item.start_at));
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  const groupedEntries = Object.entries(groupedByDate).sort(([a], [b]) => (a < b ? -1 : 1));

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </header>

      <FiltersBar selectedFormat={searchParams.format} selectedLevel={searchParams.level} todayOnly={searchParams.todayOnly === "1"} lang={lang} />

      <section className="section">
        {error ? <p className="notice">{copy.loadError}</p> : null}
        {!error && items.length === 0 ? <p className="notice">{copy.empty}</p> : null}
        {groupedEntries.map(([dateKey, posts]) => {
          const firstTime = getCordobaHHMM(posts[0].start_at);
          const lastTime = getCordobaHHMM(posts[posts.length - 1].start_at);
          const timeLabel = firstTime === lastTime ? firstTime : `${firstTime}-${lastTime}`;
          const day = Number(dateKey.split("-")[2]);
          const weekday = getCordobaWeekday(dateKey, lang === "ko" ? "ko-KR" : "es-AR");

          return (
            <article key={dateKey} className="section">
              <strong className="day-title">
                {lang === "ko" ? `${day}일 ${weekday} ${timeLabel}` : `${day} ${weekday} ${timeLabel}`}
              </strong>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} lang={lang} />
              ))}
            </article>
          );
        })}
      </section>

      <BottomNav />
    </main>
  );
}
