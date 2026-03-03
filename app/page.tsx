import BottomNav from "@/components/BottomNav";
import FiltersBar from "@/components/FiltersBar";
import PostCard from "@/components/PostCard";
import { getCordobaDateString, getCordobaHHMM, getCordobaWeekday } from "@/lib/constants/slots";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function relativeTimeLabel(value: string, lang: "es" | "ko") {
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor((now - then) / 60000));

  if (diffMinutes < 1) {
    return lang === "ko" ? "방금 전" : "hace un momento";
  }
  if (diffMinutes < 60) {
    return lang === "ko" ? `${diffMinutes}분 전` : `hace ${diffMinutes}m`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return lang === "ko" ? `${diffHours}시간 전` : `hace ${diffHours}h`;
  }
  if (diffHours < 48) {
    return lang === "ko" ? "어제" : "ayer";
  }
  const diffDays = Math.floor(diffHours / 24);
  return lang === "ko" ? `${diffDays}일 전` : `hace ${diffDays}d`;
}

export default async function Home({
  searchParams
}: {
  searchParams: {
    format?: string;
    todayOnly?: string;
  };
}) {
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "빠른매칭",
          subtitle: "로그인 없이 둘러보기 가능",
          create: "+ 글쓰기",
          activityTitle: "최근 활동",
          activityMore: "상세보기",
          activityEmpty: "최근 활동이 없습니다.",
          loadError: "목록을 불러오지 못했습니다.",
          empty: "조건에 맞는 매치가 없습니다."
        }
      : {
          title: "Match rapido",
          subtitle: "Se puede ver sin iniciar sesion",
          create: "+ Publicar",
          activityTitle: "Actividad reciente",
          activityMore: "Ver detalle",
          activityEmpty: "No hay actividad reciente.",
          loadError: "No se pudo cargar la lista.",
          empty: "No hay partidos para este filtro."
        };

  const supabase = await createClient();

  const now = new Date();
  const expiryCutoffIso = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

  let query = supabase
    .from("posts")
    .select(
      "id,host_id,start_at,format,level,needed,court_no,note,status,profiles!posts_host_id_fkey(display_name),joins(id,status)"
    )
    .eq("status", "open")
    .gte("start_at", expiryCutoffIso)
    .order("start_at", { ascending: true });

  if (searchParams.format) {
    query = query.eq("format", searchParams.format);
  }

  const [{ data, error }, { data: activityData }] = await Promise.all([
    query,
    supabase.from("activity_feed").select("id,message,created_at").order("created_at", { ascending: false }).limit(10)
  ]);

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

  const filteredItems =
    searchParams.todayOnly === "1"
      ? items.filter((item) => item.status === "open" && !item.isExpired && item.joinsCount + 1 < item.needed)
      : items;

  const groupedByDate = filteredItems.reduce<Record<string, typeof filteredItems>>((acc, item) => {
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
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <Link className="push-write-btn" href="/post">
          {copy.create}
        </Link>
      </header>

      <section className="activity-list">
        <div className="row">
          <h2 className="activity-title">{copy.activityTitle}</h2>
          <Link className="link-inline" href="/activity">
            {copy.activityMore}
          </Link>
        </div>
        {(activityData ?? []).length === 0 ? <p className="muted">{copy.activityEmpty}</p> : null}
        {(activityData ?? []).map((item) => (
          <article key={item.id} className="activity-item">
            <p className="activity-message">{item.message}</p>
            <p className="activity-time">{relativeTimeLabel(item.created_at, lang)}</p>
          </article>
        ))}
      </section>

      <FiltersBar selectedFormat={searchParams.format} todayOnly={searchParams.todayOnly === "1"} lang={lang} />

      <section className="section">
        {error ? <p className="notice">{copy.loadError}</p> : null}
        {!error && filteredItems.length === 0 ? <p className="notice">{copy.empty}</p> : null}
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
