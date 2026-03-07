import BottomNav from "@/components/BottomNav";
import FiltersBar from "@/components/FiltersBar";
import PostCard from "@/components/PostCard";
import ProfileAvatar from "@/components/ProfileAvatar";
import LoginSuccessToast from "./_components/LoginSuccessToast";
import { getCordobaDateString, getCordobaHHMM, getCordobaWeekday } from "@/lib/constants/slots";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

function normalizeWhatsapp(raw: string | null | undefined) {
  const compact = String(raw ?? "").replace(/\s+/g, "").replace(/-/g, "");
  if (!compact) {
    return "";
  }
  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/[^\d]/g, "")}`;
  }
  return `+${compact.replace(/[^\d]/g, "")}`;
}

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

function getActivityHref(item: { type: string; related_post_id: string | null; related_match_id: string | null; user_id: string | null }) {
  if (item.related_post_id) {
    return `/post/${item.related_post_id}`;
  }
  if (item.related_match_id || item.type === "match_result") {
    return "/results";
  }
  if (item.user_id) {
    return `/u/${item.user_id}`;
  }
  return "/activity";
}

function renderActivityMessage(messageRaw: string, actorNameRaw: string) {
  const message = String(messageRaw ?? "").trim();
  const actorName = String(actorNameRaw ?? "").trim();
  if (!message || !actorName) {
    return message;
  }

  const messageLower = message.toLowerCase();
  const actorLower = actorName.toLowerCase();
  const startIndex = messageLower.indexOf(actorLower);

  if (startIndex < 0) {
    return message;
  }

  const actorEnd = startIndex + actorName.length;
  const prefix = message.slice(0, startIndex);
  const actor = message.slice(startIndex, actorEnd);
  const suffix = message.slice(actorEnd);

  return (
    <>
      {prefix}
      <span className="activity-actor-accent">{actor}</span>
      {suffix}
    </>
  );
}

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{
    format?: string;
    loggedIn?: string;
  }>;
}) {
  noStore();
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
  const activityCutoffIso = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from("posts")
    .select(
      "id,host_id,start_at,format,level,needed,court_no,note,status,profiles!posts_host_id_fkey(id,display_name,avatar_url),joins(id,user_id,status,guest_name,guest_whatsapp,profiles!joins_user_id_fkey(id,display_name,avatar_url))"
    )
    .order("start_at", { ascending: true });

  if (params.format) {
    query = query.eq("format", params.format);
  }

  const [{ data, error }, { data: activityData }] = await Promise.all([
    query,
    supabase
      .from("activity_feed")
      .select("id,type,user_id,related_post_id,related_match_id,message,created_at")
      .gte("created_at", activityCutoffIso)
      .order("created_at", { ascending: false })
      .limit(10)
  ]);

  let postsData = data ?? [];
  let postsError = error;

  if (postsError) {
    const fallback = await supabase
      .from("posts")
      .select(
        "id,host_id,start_at,format,needed,status,profiles!posts_host_id_fkey(id,display_name,avatar_url),joins(id,user_id,profiles!joins_user_id_fkey(id,display_name,avatar_url))"
      )
      .order("start_at", { ascending: true })
      .limit(200);

    if (!fallback.error && fallback.data) {
      postsData = fallback.data as any[];
      postsError = null;
    } else {
      const legacy = await supabase
        .from("posts")
        .select("id,host_id,date_time,format,needed,status")
        .order("date_time", { ascending: true })
        .limit(200);
      if (!legacy.error && legacy.data) {
        postsData = legacy.data.map((row: any) => ({
          ...row,
          start_at: row.date_time,
          level: null,
          court_no: null,
          note: null,
          profiles: null,
          joins: []
        }));
        postsError = null;
      }
    }
  }
  const activityUserIds = Array.from(new Set((activityData ?? []).map((item) => item.user_id).filter(Boolean)));
  const { data: activityProfiles } =
    activityUserIds.length > 0
      ? await supabase.from("profiles").select("id,display_name,avatar_url").in("id", activityUserIds)
      : { data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] };
  const activityProfileMap = new Map((activityProfiles ?? []).map((profile) => [profile.id, profile]));

  const guestNames = Array.from(
    new Set(
      (postsData ?? []).flatMap((post: any) =>
        (post.joins ?? [])
          .filter((join: any) => !join?.user_id && !!join?.guest_name)
          .map((join: any) => String(join.guest_name).trim())
          .filter(Boolean)
      )
    )
  );
  const guestProfileCandidates: Array<{
    id: string;
    display_name: string | null;
    whatsapp: string | null;
    avatar_url: string | null;
    is_guest?: boolean | null;
    email?: string | null;
    total_matches?: number | null;
  }> = [];

  for (let i = 0; i < guestNames.length; i += 100) {
    const chunk = guestNames.slice(i, i + 100);
    const { data: chunkProfiles } = await supabase
      .from("profiles")
      .select("id,display_name,whatsapp,avatar_url,is_guest,email,total_matches")
      .in("display_name", chunk)
      .limit(400);
    if (chunkProfiles?.length) {
      guestProfileCandidates.push(...chunkProfiles);
    }
  }

  type SlimGuestProfile = {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    score: number;
  };

  function profileScore(profile: {
    is_guest?: boolean | null;
    email?: string | null;
    total_matches?: number | null;
  }) {
    const email = String(profile.email ?? "").toLowerCase();
    const isGuest = profile.is_guest === true || email.endsWith("@guest.local");
    let score = 0;
    if (!isGuest) {
      score += 4;
    }
    if ((profile.total_matches ?? 0) > 0) {
      score += 2;
    }
    return score;
  }

  const guestProfileMapByNamePhone = new Map<string, SlimGuestProfile>();
  const guestProfilesByName = new Map<string, Array<SlimGuestProfile>>();

  for (const profile of guestProfileCandidates) {
    const name = String(profile.display_name ?? "").trim();
    if (!name) {
      continue;
    }
    const nameKey = name.toLowerCase();
    const phoneKey = normalizeWhatsapp(profile.whatsapp);
    const compositeKey = `${nameKey}::${phoneKey}`;
    const slim: SlimGuestProfile = {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      score: profileScore(profile)
    };
    const existingByPhone = guestProfileMapByNamePhone.get(compositeKey);
    if (!existingByPhone || slim.score > existingByPhone.score) {
      guestProfileMapByNamePhone.set(compositeKey, slim);
    }
    const current = guestProfilesByName.get(nameKey) ?? [];
    current.push(slim);
    guestProfilesByName.set(nameKey, current);
  }

  function resolveGuestProfile(guestNameRaw: string | null | undefined, guestWhatsappRaw: string | null | undefined) {
    const guestName = String(guestNameRaw ?? "").trim();
    if (!guestName) {
      return null;
    }
    const nameKey = guestName.toLowerCase();
    const phoneKey = normalizeWhatsapp(guestWhatsappRaw);

    if (phoneKey) {
      const exact = guestProfileMapByNamePhone.get(`${nameKey}::${phoneKey}`);
      if (exact) {
        return exact;
      }
    }

    const blankPhone = guestProfileMapByNamePhone.get(`${nameKey}::`);
    if (blankPhone) {
      return blankPhone;
    }

    const byName = (guestProfilesByName.get(nameKey) ?? []).sort((a, b) => b.score - a.score);
    if (byName.length > 0) {
      return byName[0];
    }
    return null;
  }

  const items =
    postsData
      .map((post: any) => {
      const startAt = post.start_at ?? post.date_time;
      if (!startAt) {
        return null;
      }
      const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      const hostName = profile?.display_name || (lang === "ko" ? "호스트" : "Host");
      const hostAvatarUrl = profile?.avatar_url ?? null;
      const approvedJoins = (post.joins ?? []).filter((join: any) => (join.status ?? "approved") === "approved");
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

      approvedJoins.forEach((join: any) => {
        const joinProfile = Array.isArray(join.profiles) ? join.profiles[0] : join.profiles;
        const guestProfile = !join.user_id ? resolveGuestProfile(join.guest_name, join.guest_whatsapp) : null;
        const joinName = joinProfile?.display_name || join.guest_name || (lang === "ko" ? "참여자" : "Jugador");
        const participantId = join.user_id || guestProfile?.id || `guest:${join.id}`;
        participantMap.set(participantId, {
          id: participantId,
          name: guestProfile?.display_name || joinName,
          avatarUrl: guestProfile?.avatar_url ?? joinProfile?.avatar_url ?? null,
          isHost: false
        });
      });

      return {
        id: post.id,
        hostId: post.host_id,
        isMine: user?.id === post.host_id,
        start_at: startAt,
        format: post.format,
        level: post.level ?? null,
        needed: post.needed,
        court_no: post.court_no ?? null,
        note: post.note ?? null,
        status: post.status ?? "open",
        joinsCount: approvedJoins.length,
        hostName,
        hostAvatarUrl,
        participants: Array.from(participantMap.values()),
        isExpired: new Date(startAt).getTime() + 30 * 60 * 1000 < Date.now()
      };
    })
      .filter(Boolean)
      .filter((item: any) => item.status === "open")
      .filter((item: any) => new Date(item.start_at).getTime() >= new Date(expiryCutoffIso).getTime())
      .sort((a: any, b: any) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()) as Array<{
        id: string;
        hostId: string;
        isMine: boolean;
        start_at: string;
        format: string;
        level: string | null;
        needed: number;
        court_no: number | null;
        note: string | null;
        status: string;
        joinsCount: number;
        hostName: string;
        hostAvatarUrl: string | null;
        participants: Array<{ id: string; name: string; avatarUrl: string | null; isHost: boolean }>;
        isExpired: boolean;
      }>;

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
                    <p className="activity-message">{renderActivityMessage(item.message, actorName)}</p>
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
        {postsError ? <p className="notice">{copy.loadError}</p> : null}
        {!postsError && items.length === 0 ? <p className="notice">{copy.empty}</p> : null}
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
