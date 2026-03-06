import BottomNav from "@/components/BottomNav";
import FiltersBar from "@/components/FiltersBar";
import PostCard from "@/components/PostCard";
import ProfileAvatar from "@/components/ProfileAvatar";
import LoginSuccessToast from "./_components/LoginSuccessToast";
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

function getActivityHref(item: { type: string; related_post_id: string | null; user_id: string }) {
  if ((item.type === "new_post" || item.type === "cancel_join") && item.related_post_id) {
    return `/post/${item.related_post_id}`;
  }
  if (item.type === "match_result") {
    return "/results";
  }
  if (item.type === "streak") {
    return `/u/${item.user_id}`;
  }
  return "/activity";
}

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{
    format?: string;
    loggedIn?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const showLoggedInToast = params.loggedIn === "1";
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "빠른매칭",
          subtitle: "로그인 없이 둘러보기 가능",
          create: "+ 글쓰기",
          activityTitle: "최근 활동",
          activityEmpty: "최근 활동이 없습니다.",
          loadError: "목록을 불러오지 못했습니다.",
          empty: "조건에 맞는 매치가 없습니다."
        }
      : {
          title: "Match rapido",
          subtitle: "Se puede ver sin iniciar sesion",
          create: "+ Publicar",
          activityTitle: "Actividad reciente",
          activityEmpty: "No hay actividad reciente.",
          loadError: "No se pudo cargar la lista.",
          empty: "No hay partidos para este filtro."
        };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const now = new Date();
  const expiryCutoffIso = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

  let query = supabase
    .from("posts")
    .select(
      "id,host_id,start_at,format,level,needed,court_no,note,status,profiles!posts_host_id_fkey(id,display_name,avatar_url),joins(id,user_id,status,guest_name,guest_whatsapp,profiles!joins_user_id_fkey(id,display_name,avatar_url))"
    )
    .eq("status", "open")
    .gte("start_at", expiryCutoffIso)
    .order("start_at", { ascending: true });

  if (params.format) {
    query = query.eq("format", params.format);
  }

  const [{ data, error }, { data: activityData }] = await Promise.all([
    query,
    supabase.from("activity_feed").select("id,type,user_id,related_post_id,message,created_at").order("created_at", { ascending: false }).limit(10)
  ]);
  const activityUserIds = Array.from(new Set((activityData ?? []).map((item) => item.user_id).filter(Boolean)));
  const { data: activityProfiles } =
    activityUserIds.length > 0
      ? await supabase.from("profiles").select("id,display_name,avatar_url").in("id", activityUserIds)
      : { data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] };
  const activityProfileMap = new Map((activityProfiles ?? []).map((profile) => [profile.id, profile]));

  const items =
    data?.map((post) => {
      const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      const hostName = profile?.display_name || (lang === "ko" ? "호스트" : "Host");
      const hostAvatarUrl = profile?.avatar_url ?? null;
      const approvedJoins = post.joins?.filter((join) => join.status === "approved") ?? [];
      const participantMap = new Map<
        string,
        {
          id: string;
          name: string;
          avatarUrl: string | null;
          isHost: boolean;
        }
      >();

      participantMap.set(post.host_id, {
        id: post.host_id,
        name: hostName,
        avatarUrl: hostAvatarUrl,
        isHost: true
      });

      approvedJoins.forEach((join) => {
        const joinProfile = Array.isArray(join.profiles) ? join.profiles[0] : join.profiles;
        const joinName = joinProfile?.display_name || join.guest_name || (lang === "ko" ? "참여자" : "Jugador");
        const participantId = join.user_id ? join.user_id : `guest:${join.id}`;
        participantMap.set(participantId, {
          id: participantId,
          name: joinName,
          avatarUrl: joinProfile?.avatar_url ?? null,
          isHost: false
        });
      });

      return {
        id: post.id,
        hostId: post.host_id,
        isMine: user?.id === post.host_id,
        start_at: post.start_at,
        format: post.format,
        level: post.level,
        needed: post.needed,
        court_no: post.court_no,
        note: post.note,
        status: post.status,
        joinsCount: approvedJoins.length,
        hostName,
        hostAvatarUrl,
        participants: Array.from(participantMap.values()),
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
        <div>
          <h1 className="brand-title">
            {copy.title}
            <img className="brand-logo-img" src="/tennis-ball.svg" alt="Tennis logo" />
          </h1>
          <p>{copy.subtitle}</p>
        </div>
        <Link className="push-write-btn" href="/post">
          {copy.create}
        </Link>
      </header>
      {showLoggedInToast ? <LoginSuccessToast lang={lang} /> : null}

      <section className="activity-list">
        <div className="row">
          <h2 className="activity-title">{copy.activityTitle}</h2>
        </div>
        {(activityData ?? []).length === 0 ? <p className="muted">{copy.activityEmpty}</p> : null}
        {(activityData ?? []).map((item) => {
          const actor = activityProfileMap.get(item.user_id);
          const actorName = actor?.display_name || (lang === "ko" ? "플레이어" : "Jugador");
          return (
            <Link key={item.id} className="activity-link" href={getActivityHref(item)}>
              <article className="activity-item">
                <div className="activity-item-main">
                  <ProfileAvatar name={actorName} avatarUrl={actor?.avatar_url ?? null} size="sm" />
                  <div className="activity-copy">
                    <p className="activity-message">{item.message}</p>
                    <p className="activity-time">{relativeTimeLabel(item.created_at, lang)}</p>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </section>

      <FiltersBar selectedFormat={params.format} lang={lang} />

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
