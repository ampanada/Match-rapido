import BottomNav from "@/components/BottomNav";
import { formatCordobaDate, formatSlotRange, getCordobaDateString, getCordobaHHMM, getCordobaWeekday, SLOT_MINUTES } from "@/lib/constants/slots";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileAvatar from "@/components/ProfileAvatar";
import MotionProfileLink from "@/components/MotionProfileLink";
import { unstable_noStore as noStore } from "next/cache";

function safeTime(value: unknown) {
  const ms = new Date(String(value ?? "")).getTime();
  return Number.isNaN(ms) ? null : ms;
}

type MatchItem = {
  id: string;
  host_id: string;
  start_at: string;
  format: string;
  needed: number;
  court_no: number | null;
  status: string;
  profiles:
    | { id: string; display_name: string | null; avatar_url: string | null }
    | Array<{ id: string; display_name: string | null; avatar_url: string | null }>
    | null;
  joins: Array<{
    id: string;
    status?: string | null;
    user_id: string | null;
    guest_name?: string | null;
    guest_whatsapp?: string | null;
    profiles:
      | { id: string; display_name: string | null; avatar_url: string | null }
      | Array<{ id: string; display_name: string | null; avatar_url: string | null }>
      | null;
  }>;
};

type Participant = {
  id: string;
  profile_id: string | null;
  display_name: string;
  avatar_url: string | null;
};

export default async function MyMatchesPage() {
  noStore();
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "내 매칭",
          todayTitle: "오늘 매칭",
          upcomingTitle: "다가오는 매칭",
          completedTitle: "플레이 완료",
          todayBadge: "오늘",
          record: "점수 기록",
          noToday: "오늘 매칭이 없습니다.",
          noUpcoming: "다가오는 매칭이 없습니다.",
          noCompleted: "완료된 매칭이 없습니다.",
          court: "코트",
          noCourt: "코트 미지정",
          players: "인원",
          participants: "참여자",
          participantItem: "참여자",
          hostTag: "호스트",
          winner: "승",
          loser: "패",
          completedLabel: "완료",
          recorded: "기록됨",
          hostManualClose: "매치 임의 마감",
          editPost: "포스트 수정"
        }
      : {
          title: "Mis partidos",
          todayTitle: "Partidos de hoy",
          upcomingTitle: "Proximos partidos",
          completedTitle: "Completados",
          todayBadge: "Hoy",
          record: "Registrar marcador",
          noToday: "No hay partidos de hoy.",
          noUpcoming: "No hay partidos proximos.",
          noCompleted: "No hay partidos completados.",
          court: "Cancha",
          noCourt: "Sin cancha",
          players: "Jugadores",
          participants: "Participantes",
          participantItem: "Jugador",
          hostTag: "Host",
          winner: "W",
          loser: "L",
          completedLabel: "Completado",
          recorded: "registrado",
          hostManualClose: "Cierre manual sin rival",
          editPost: "Editar post"
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
      .select(
        "id,host_id,start_at,format,needed,court_no,status,profiles!posts_host_id_fkey(id,display_name,avatar_url,wins,losses,total_matches),joins(id,status,user_id,guest_name,guest_whatsapp,profiles!joins_user_id_fkey(id,display_name,avatar_url,wins,losses,total_matches))"
      )
      .eq("host_id", user.id)
      .order("start_at", { ascending: false })
      .limit(80),
    supabase
      .from("joins")
      .select(
        "post_id,posts!joins_post_id_fkey(id,host_id,start_at,format,needed,court_no,status,profiles!posts_host_id_fkey(id,display_name,avatar_url,wins,losses,total_matches),joins(id,status,user_id,guest_name,guest_whatsapp,profiles!joins_user_id_fkey(id,display_name,avatar_url,wins,losses,total_matches)))"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80)
  ]);

  let hostPosts = (hostResponse.data ?? []) as MatchItem[];
  if (hostResponse.error) {
    const hostFallback = await supabase
      .from("posts")
      .select(
        "id,host_id,start_at,format,needed,court_no,status,profiles!posts_host_id_fkey(id,display_name,avatar_url),joins(id,user_id,profiles!joins_user_id_fkey(id,display_name,avatar_url))"
      )
      .eq("host_id", user.id)
      .order("start_at", { ascending: false })
      .limit(80);
    hostPosts = (hostFallback.data ?? []) as MatchItem[];
  }

  let joinedPosts = (joinResponse.data ?? [])
    .map((row: any) => (Array.isArray(row.posts) ? row.posts[0] : row.posts))
    .filter(Boolean) as MatchItem[];
  if (joinResponse.error) {
    const joinFallback = await supabase
      .from("joins")
      .select(
        "post_id,posts!joins_post_id_fkey(id,host_id,start_at,format,needed,court_no,status,profiles!posts_host_id_fkey(id,display_name,avatar_url),joins(id,user_id,profiles!joins_user_id_fkey(id,display_name,avatar_url)))"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80);
    joinedPosts = (joinFallback.data ?? [])
      .map((row: any) => (Array.isArray(row.posts) ? row.posts[0] : row.posts))
      .filter(Boolean) as MatchItem[];
  }

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
      ? await supabase.from("match_results").select("post_id,status,score,winner_id").in("post_id", postIds)
      : { data: [] as { post_id: string; status: string; score: string; winner_id: string | null }[] };

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
      const hostProfileRaw = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
      const hostProfile: Participant = {
        id: hostProfileRaw?.id ?? post.host_id,
        profile_id: hostProfileRaw?.id ?? post.host_id,
        display_name: hostProfileRaw?.display_name || (lang === "ko" ? "호스트" : "Host"),
        avatar_url: hostProfileRaw?.avatar_url ?? null
      };
      const approvedCount = joins.filter((join) => (join.status ?? "approved") === "approved").length;
      const approvedRegisteredCount = joins.filter((join) => (join.status ?? "approved") === "approved" && !!join.user_id).length;
      const currentPlayers = approvedCount + 1;
      const isSingleReady = post.format === "single" && approvedRegisteredCount === 1;
      const hostManualClose = approvedCount === 0 && post.status === "closed";
      const result = resultMap.get(post.id);
      const hasConfirmedResult = result?.status === "confirmed";

      const dateKey = getCordobaDateString(new Date(startMs));
      const isPlayingNow = now >= startMs && now < startMs + durationMs;
      const isUpcoming = startMs > now;
      const isCompleted = now >= startMs + durationMs;

      const participantMap = new Map<string, Participant>();
      participantMap.set(hostProfile.id, hostProfile);

      joins
        .filter((join) => (join.status ?? "approved") === "approved")
        .forEach((join) => {
          const raw = Array.isArray(join.profiles) ? join.profiles[0] : join.profiles;
          if (raw?.id) {
            participantMap.set(raw.id, {
              id: raw.id,
              profile_id: raw.id,
              display_name: raw.display_name || (lang === "ko" ? "참여자" : "Jugador"),
              avatar_url: raw.avatar_url ?? null
            });
            return;
          }

          if (join.guest_name) {
            const guestId = `guest:${join.id}`;
            participantMap.set(guestId, {
              id: guestId,
              profile_id: null,
              display_name: join.guest_name,
              avatar_url: null
            });
          }
        });

      return {
        ...post,
        startMs,
        currentPlayers,
        participants: Array.from(participantMap.values()),
        isSingleReady,
        hostManualClose,
        hasConfirmedResult,
        resultScore: result?.score ?? null,
        dateKey,
        isPlayingNow,
        isUpcoming,
        isCompleted
      };
    })
    .filter(Boolean) as Array<
    MatchItem & {
      startMs: number;
      currentPlayers: number;
      participants: Participant[];
      isSingleReady: boolean;
      hostManualClose: boolean;
      hasConfirmedResult: boolean;
      resultScore: string | null;
      dateKey: string;
      isPlayingNow: boolean;
      isUpcoming: boolean;
      isCompleted: boolean;
    }
  >;

  const todayKey = getCordobaDateString();

  const todayMatches = normalized
    .filter((item) => item.dateKey === todayKey)
    .sort((a, b) => a.startMs - b.startMs);

  const upcoming = normalized
    .filter((item) => item.isUpcoming && item.dateKey !== todayKey)
    .sort((a, b) => a.startMs - b.startMs);

  const completed = normalized
    .filter((item) => item.isCompleted && item.dateKey !== todayKey)
    .sort((a, b) => b.startMs - a.startMs);

  const dateLocale = lang === "ko" ? "ko-KR" : "es-AR";
  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
      </header>

      <section className="section">
        <article className="card">
          <strong>{copy.todayTitle}</strong>
          {todayMatches.length === 0 ? <p className="muted">{copy.noToday}</p> : null}
          {todayMatches.map((item) => {
            const startHHMM = getCordobaHHMM(item.start_at);
            const weekday = getCordobaWeekday(getCordobaDateString(new Date(item.startMs)), dateLocale);
            return (
              <article key={`today-${item.id}`} className="card match-card match-card-today">
                <div className="row">
                  <span className="badge">{copy.todayBadge}</span>
                  <span className="muted">{item.isPlayingNow ? copy.todayBadge : copy.completedLabel}</span>
                </div>
                <p className="match-date-line">
                  <strong>
                    {formatCordobaDate(item.start_at, dateLocale)} ({weekday}) · {formatSlotRange(startHHMM)}
                  </strong>
                </p>
                <p className="muted">{item.court_no ? `${copy.court} ${item.court_no}` : copy.noCourt}</p>
                <p className="muted">{copy.participants}</p>
                <div className="participant-list">
                  {item.participants.map((participant, idx) => (
                    participant.profile_id ? (
                      <MotionProfileLink
                        key={`today-player-${item.id}-${participant.id}`}
                        className="participant-chip"
                        href={`/u/${participant.profile_id}`}
                      >
                        <span className="participant-row">
                          <span className="participant-index">{copy.participantItem} {idx + 1}</span>
                          <ProfileAvatar name={participant.display_name} avatarUrl={participant.avatar_url} size="sm" />
                          <strong className="participant-name">{participant.display_name}</strong>
                          {participant.profile_id === item.host_id ? <span className="participant-role">{copy.hostTag}</span> : null}
                        </span>
                      </MotionProfileLink>
                    ) : (
                      <div key={`today-player-${item.id}-${participant.id}`} className="participant-chip">
                        <span className="participant-row">
                          <span className="participant-index">{copy.participantItem} {idx + 1}</span>
                          <ProfileAvatar name={participant.display_name} avatarUrl={participant.avatar_url} size="sm" />
                          <strong className="participant-name">{participant.display_name}</strong>
                        </span>
                      </div>
                    )
                  ))}
                </div>
                {item.hostManualClose ? <p className="notice">{copy.hostManualClose}</p> : null}
                {item.host_id === user.id && item.startMs > now ? (
                  <Link className="link-btn" href={`/post/${item.id}/edit`}>
                    {copy.editPost}
                  </Link>
                ) : null}
                {item.isSingleReady && !item.hasConfirmedResult && item.startMs <= now && !item.hostManualClose ? (
                  <Link className="link-btn" href={`/post/${item.id}?record=1`}>
                    {copy.record}
                  </Link>
                ) : item.hasConfirmedResult ? (
                  <div className="section">
                    {item.format === "single" && item.participants.length === 2 ? (
                      <p className="result-players">
                        {(() => {
                          const winnerId = resultMap.get(item.id)?.winner_id ?? null;
                          const first = item.participants[0];
                          const second = item.participants[1];
                          const firstWinner = winnerId === first.id;
                          const secondWinner = winnerId === second.id;
                          return (
                            <>
                              <MotionProfileLink className="link-inline" href={`/u/${first.profile_id ?? first.id}`}>
                                <span className="result-player-line">
                                  <ProfileAvatar name={first.display_name} avatarUrl={first.avatar_url} size="sm" />
                                  <span className="result-player-name">{first.display_name}</span>
                                  <span className={firstWinner ? "result-tag-win" : "result-tag-loss"}>
                                    {firstWinner ? copy.winner : copy.loser}
                                  </span>
                                </span>
                              </MotionProfileLink>
                              <span className="result-vs">vs</span>
                              <MotionProfileLink className="link-inline" href={`/u/${second.profile_id ?? second.id}`}>
                                <span className="result-player-line">
                                  <ProfileAvatar name={second.display_name} avatarUrl={second.avatar_url} size="sm" />
                                  <span className="result-player-name">{second.display_name}</span>
                                  <span className={secondWinner ? "result-tag-win" : "result-tag-loss"}>
                                    {secondWinner ? copy.winner : copy.loser}
                                  </span>
                                </span>
                              </MotionProfileLink>
                            </>
                          );
                        })()}
                      </p>
                    ) : null}
                    <p className="result-scoreline">
                      <span className="muted">{copy.recorded}</span>
                      <strong>{item.resultScore}</strong>
                    </p>
                  </div>
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
            const weekday = getCordobaWeekday(getCordobaDateString(new Date(item.startMs)), dateLocale);
            return (
              <article key={`upcoming-${item.id}`} className="card match-card match-card-upcoming">
                <p className="match-date-line">
                  <strong>
                    {formatCordobaDate(item.start_at, dateLocale)} ({weekday}) · {formatSlotRange(startHHMM)}
                  </strong>
                </p>
                <p className="muted">{item.court_no ? `${copy.court} ${item.court_no}` : copy.noCourt}</p>
                <p className="muted">
                  {copy.players}: {item.currentPlayers}/{item.needed}
                </p>
                <p className="muted">{copy.participants}</p>
                <div className="participant-list">
                  {item.participants.map((participant, idx) => (
                    participant.profile_id ? (
                      <MotionProfileLink
                        key={`up-player-${item.id}-${participant.id}`}
                        className="participant-chip"
                        href={`/u/${participant.profile_id}`}
                      >
                        <span className="participant-row">
                          <span className="participant-index">{copy.participantItem} {idx + 1}</span>
                          <ProfileAvatar name={participant.display_name} avatarUrl={participant.avatar_url} size="sm" />
                          <strong className="participant-name">{participant.display_name}</strong>
                          {participant.profile_id === item.host_id ? <span className="participant-role">{copy.hostTag}</span> : null}
                        </span>
                      </MotionProfileLink>
                    ) : (
                      <div key={`up-player-${item.id}-${participant.id}`} className="participant-chip">
                        <span className="participant-row">
                          <span className="participant-index">{copy.participantItem} {idx + 1}</span>
                          <ProfileAvatar name={participant.display_name} avatarUrl={participant.avatar_url} size="sm" />
                          <strong className="participant-name">{participant.display_name}</strong>
                        </span>
                      </div>
                    )
                  ))}
                </div>
                {item.hostManualClose ? <p className="notice">{copy.hostManualClose}</p> : null}
                {item.host_id === user.id ? (
                  <Link className="link-btn" href={`/post/${item.id}/edit`}>
                    {copy.editPost}
                  </Link>
                ) : null}
              </article>
            );
          })}
        </article>

        <article className="card">
          <details className="compact-block" open>
            <summary>{copy.completedTitle}</summary>
            {completed.length === 0 ? <p className="muted">{copy.noCompleted}</p> : null}
            {completed.map((item) => {
              const startHHMM = getCordobaHHMM(item.start_at);
              const weekday = getCordobaWeekday(getCordobaDateString(new Date(item.startMs)), dateLocale);
              return (
                <article key={`completed-${item.id}`} className="card match-card match-card-completed">
                  <p className="compact-line">
                    {formatCordobaDate(item.start_at, dateLocale)} ({weekday}) | {formatSlotRange(startHHMM)} | {item.court_no ? `${copy.court} ${item.court_no}` : copy.noCourt} | {copy.completedLabel}
                  </p>
                  <div className="participant-list">
                    {item.participants.map((participant, idx) => (
                      participant.profile_id ? (
                        <MotionProfileLink
                          key={`done-player-${item.id}-${participant.id}`}
                          className="participant-chip"
                          href={`/u/${participant.profile_id}`}
                        >
                          <span className="participant-row">
                            <span className="participant-index">{copy.participantItem} {idx + 1}</span>
                            <ProfileAvatar name={participant.display_name} avatarUrl={participant.avatar_url} size="sm" />
                            <strong className="participant-name">{participant.display_name}</strong>
                            {participant.profile_id === item.host_id ? <span className="participant-role">{copy.hostTag}</span> : null}
                          </span>
                        </MotionProfileLink>
                      ) : (
                        <div key={`done-player-${item.id}-${participant.id}`} className="participant-chip">
                          <span className="participant-row">
                            <span className="participant-index">{copy.participantItem} {idx + 1}</span>
                            <ProfileAvatar name={participant.display_name} avatarUrl={participant.avatar_url} size="sm" />
                            <strong className="participant-name">{participant.display_name}</strong>
                          </span>
                        </div>
                      )
                    ))}
                  </div>
                  {item.hostManualClose ? <p className="notice">{copy.hostManualClose}</p> : null}
                  {item.isSingleReady && !item.hasConfirmedResult && item.startMs <= now && !item.hostManualClose ? (
                    <Link className="link-btn" href={`/post/${item.id}?record=1`}>
                      {copy.record}
                    </Link>
                  ) : item.hasConfirmedResult ? (
                    <div className="section">
                      {item.format === "single" && item.participants.length === 2 ? (
                        <p className="result-players">
                          {(() => {
                            const winnerId = resultMap.get(item.id)?.winner_id ?? null;
                            const first = item.participants[0];
                            const second = item.participants[1];
                            const firstWinner = winnerId === first.id;
                            const secondWinner = winnerId === second.id;
                            return (
                              <>
                                <MotionProfileLink className="link-inline" href={`/u/${first.profile_id ?? first.id}`}>
                                  <span className="result-player-line">
                                    <ProfileAvatar name={first.display_name} avatarUrl={first.avatar_url} size="sm" />
                                    <span className="result-player-name">{first.display_name}</span>
                                    <span className={firstWinner ? "result-tag-win" : "result-tag-loss"}>
                                      {firstWinner ? copy.winner : copy.loser}
                                    </span>
                                  </span>
                                </MotionProfileLink>
                                <span className="result-vs">vs</span>
                                <MotionProfileLink className="link-inline" href={`/u/${second.profile_id ?? second.id}`}>
                                  <span className="result-player-line">
                                    <ProfileAvatar name={second.display_name} avatarUrl={second.avatar_url} size="sm" />
                                    <span className="result-player-name">{second.display_name}</span>
                                    <span className={secondWinner ? "result-tag-win" : "result-tag-loss"}>
                                      {secondWinner ? copy.winner : copy.loser}
                                    </span>
                                  </span>
                                </MotionProfileLink>
                              </>
                            );
                          })()}
                        </p>
                      ) : null}
                      <p className="result-scoreline">
                        <span className="muted">{copy.recorded}</span>
                        <strong>{item.resultScore}</strong>
                      </p>
                    </div>
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
