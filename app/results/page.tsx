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

function buildPairKey(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) {
    return null;
  }
  return [a, b].sort().join("::");
}

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

function getLeaderDedupKey(player: {
  id: string;
  whatsapp?: string | null;
  display_name?: string | null;
  is_guest?: boolean | null;
  email?: string | null;
}) {
  const whatsapp = normalizeWhatsapp(player.whatsapp);
  if (whatsapp) {
    return `wa:${whatsapp}`;
  }

  const displayName = String(player.display_name ?? "").trim().toLowerCase();
  const email = String(player.email ?? "").trim().toLowerCase();
  const guestLike = player.is_guest === true || email.endsWith("@guest.local");
  if (guestLike && displayName) {
    return `guest:${displayName}`;
  }

  return `id:${player.id}`;
}

function resolveLeaderName(player: {
  display_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  id: string;
}, lang: "ko" | "es") {
  const displayName = String(player.display_name ?? "").trim();
  if (displayName) {
    return displayName;
  }

  const email = String(player.email ?? "").trim();
  const emailLocal = email.includes("@") ? email.split("@")[0].trim() : "";
  if (emailLocal && !email.endsWith("@guest.local")) {
    return emailLocal;
  }

  const whatsapp = String(player.whatsapp ?? "").trim();
  if (whatsapp) {
    return whatsapp;
  }

  return lang === "ko" ? `유저 ${player.id.slice(0, 4)}` : `Usuario ${player.id.slice(0, 4)}`;
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
          mechanism3: "승률 공식: (승 / (승+패)) × 100 · 무승부 제외",
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
          wdlLabel: "승/무/패",
          winRateLabel: "승률",
          h2hLabel: "상대전적",
          h2hRateEmpty: "데이터 없음"
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
          mechanism3: "Formula: (victorias / (victorias+derrotas)) × 100 · empates fuera",
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
          wdlLabel: "G/E/P",
          winRateLabel: "Win %",
          h2hLabel: "H2H",
          h2hRateEmpty: "Sin datos"
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
      .select("id,display_name,email,avatar_url,whatsapp,is_guest,current_streak,best_streak,wins,losses,total_matches")
      .order("current_streak", { ascending: false })
      .order("total_matches", { ascending: false })
      .order("wins", { ascending: false })
      .order("best_streak", { ascending: false })
      .limit(30)
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

  const resultPairKeys = new Set<string>();
  const resultParticipantIds = new Set<string>();
  for (const row of results ?? []) {
    const playerA = Array.isArray((row as any).player_a_profile) ? (row as any).player_a_profile[0] : (row as any).player_a_profile;
    const playerB = Array.isArray((row as any).player_b_profile) ? (row as any).player_b_profile[0] : (row as any).player_b_profile;
    const playerAId = playerA?.id ?? (row as any).player_a ?? null;
    const playerBId = playerB?.id ?? (row as any).player_b ?? null;
    const pairKey = buildPairKey(playerAId, playerBId);
    if (!pairKey) {
      continue;
    }
    resultPairKeys.add(pairKey);
    resultParticipantIds.add(playerAId);
    resultParticipantIds.add(playerBId);
  }

  const participantIdList = Array.from(resultParticipantIds).join(",");
  const { data: h2hRows } =
    resultParticipantIds.size > 1
      ? await supabase
          .from("match_results")
          .select("player_a,player_b,winner_id,score")
          .eq("status", "confirmed")
          .or(`player_a.in.(${participantIdList}),player_b.in.(${participantIdList})`)
          .limit(5000)
      : { data: [] as { player_a: string; player_b: string; winner_id: string | null; score: string | null }[] };

  const h2hByPair = new Map<string, { winsByPlayer: Map<string, number>; draws: number }>();
  for (const row of h2hRows ?? []) {
    const pairKey = buildPairKey(row.player_a, row.player_b);
    if (!pairKey || !resultPairKeys.has(pairKey)) {
      continue;
    }

    const entry = h2hByPair.get(pairKey) ?? { winsByPlayer: new Map<string, number>(), draws: 0 };
    if (isDrawScore(row.score)) {
      entry.draws += 1;
      h2hByPair.set(pairKey, entry);
      continue;
    }

    if (row.winner_id) {
      const prevWins = entry.winsByPlayer.get(row.winner_id) ?? 0;
      entry.winsByPlayer.set(row.winner_id, prevWins + 1);
    }
    h2hByPair.set(pairKey, entry);
  }

  const streakLeaderRows = streakLeaders ?? [];
  const leaderAggregateMap = new Map<string, Set<string>>();

  await Promise.all(
    streakLeaderRows.map(async (player: any) => {
      const aggregateIds = new Set<string>([player.id]);

      if (player.whatsapp) {
        const { data: samePhoneProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("whatsapp", player.whatsapp)
          .limit(200);
        for (const row of samePhoneProfiles ?? []) {
          if (row.id) {
            aggregateIds.add(row.id);
          }
        }
      } else if (player.is_guest && player.display_name) {
        const { data: sameNameGuestProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_guest", true)
          .eq("display_name", player.display_name)
          .limit(200);
        for (const row of sameNameGuestProfiles ?? []) {
          if (row.id) {
            aggregateIds.add(row.id);
          }
        }
      }

      leaderAggregateMap.set(player.id, aggregateIds);
    })
  );

  const streakLeaderIds = streakLeaderRows.map((player: any) => player.id).filter(Boolean);
  const allTrackedProfileIds = Array.from(
    new Set(
      streakLeaderIds.flatMap((leaderId) => Array.from(leaderAggregateMap.get(leaderId) ?? new Set([leaderId])))
    )
  );
  const trackedProfileIdList = allTrackedProfileIds.join(",");
  const { data: streakMatches } =
    allTrackedProfileIds.length > 0
      ? await supabase
          .from("match_results")
          .select("player_a,player_b,winner_id,score")
          .eq("status", "confirmed")
          .or(`player_a.in.(${trackedProfileIdList}),player_b.in.(${trackedProfileIdList})`)
          .limit(5000)
      : { data: [] as { player_a: string; player_b: string; winner_id: string | null; score: string | null }[] };

  const streakStatsMap = new Map<string, { wins: number; draws: number; losses: number; total: number }>();
  for (const playerId of streakLeaderIds) {
    streakStatsMap.set(playerId, { wins: 0, draws: 0, losses: 0, total: 0 });
  }

  const trackedProfileToLeaderIds = new Map<string, string[]>();
  for (const [leaderId, profileIds] of leaderAggregateMap.entries()) {
    for (const profileId of profileIds) {
      const bucket = trackedProfileToLeaderIds.get(profileId) ?? [];
      bucket.push(leaderId);
      trackedProfileToLeaderIds.set(profileId, bucket);
    }
  }

  for (const match of streakMatches ?? []) {
    const affectedLeaderIds = new Set<string>();
    for (const participantId of [match.player_a, match.player_b]) {
      const leaderIds = trackedProfileToLeaderIds.get(participantId) ?? [];
      for (const leaderId of leaderIds) {
        affectedLeaderIds.add(leaderId);
      }
    }

    for (const leaderId of affectedLeaderIds) {
      const entry = streakStatsMap.get(leaderId);
      const aggregateIds = leaderAggregateMap.get(leaderId);
      if (!entry || !aggregateIds) {
        continue;
      }

      entry.total += 1;
      if (isDrawScore(match.score)) {
        entry.draws += 1;
      } else if (match.winner_id && aggregateIds.has(match.winner_id)) {
        entry.wins += 1;
      } else {
        entry.losses += 1;
      }
    }
  }

  const seenLeaderKeys = new Set<string>();
  const sortedStreakLeaders = [...(streakLeaders ?? [])]
    .sort((a, b) => {
      const aStats = streakStatsMap.get(a.id) ?? { wins: 0, draws: 0, losses: 0, total: 0 };
      const bStats = streakStatsMap.get(b.id) ?? { wins: 0, draws: 0, losses: 0, total: 0 };
      return (
        (b.current_streak ?? 0) - (a.current_streak ?? 0) ||
        bStats.total - aStats.total ||
        bStats.wins - aStats.wins ||
        (b.best_streak ?? 0) - (a.best_streak ?? 0)
      );
    })
    .filter((player) => {
      const stats = streakStatsMap.get(player.id) ?? { wins: 0, draws: 0, losses: 0, total: 0 };
      const hasDisplayName = String(player.display_name ?? "").trim().length > 0;
      const hasAnyActivity = (player.current_streak ?? 0) > 0 || (player.total_matches ?? 0) > 0 || stats.total > 0;
      return hasDisplayName || hasAnyActivity;
    })
    .filter((player) => {
      const dedupKey = getLeaderDedupKey(player);
      if (seenLeaderKeys.has(dedupKey)) {
        return false;
      }
      seenLeaderKeys.add(dedupKey);
      return true;
    })
    .slice(0, 5);

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
        {sortedStreakLeaders.map((player, index) => (
          <MotionProfileLink className="activity-link" href={`/u/${player.id}`} key={`mini-streak-${player.id}`}>
            <article className="activity-item streak-top-item">
              <div className="streak-top-main">
                <span className="streak-rank">#{index + 1}</span>
                <ProfileAvatar
                  name={resolveLeaderName(player, lang)}
                  avatarUrl={player.avatar_url}
                  size="sm"
                />
                <p className="activity-message">
                  {resolveLeaderName(player, lang)}
                </p>
              </div>
              {(() => {
                const stats = streakStatsMap.get(player.id) ?? { wins: 0, draws: 0, losses: 0, total: 0 };
                const decisiveTotal = stats.wins + stats.losses;
                const winRate = decisiveTotal > 0 ? Math.round((stats.wins / decisiveTotal) * 100) : 0;

                return (
                  <div className="streak-top-metrics">
                    <span className="streak-pill streak-pill-primary">
                      <strong>{player.current_streak}</strong> {copy.streakUnit}
                    </span>
                    <span className="streak-pill">
                      {copy.wdlLabel} <strong>{stats.wins}/{stats.draws}/{stats.losses}</strong>
                    </span>
                    <span className="streak-pill streak-pill-accent">
                      {copy.winRateLabel} <strong>{winRate}%</strong>
                    </span>
                  </div>
                );
              })()}
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
          const courtLabel = post?.court_no ? `${copy.court} ${post.court_no}` : copy.unknownCourt;
          const winnerName = isAWinner ? playerAName : playerBName;
          const mainResultSummary = draw ? (lang === "ko" ? "무승부" : "empate") : lang === "ko" ? `${winnerName} 승리` : `gano ${winnerName}`;
          const h2hKey = buildPairKey(playerAId, playerBId);
          const h2hStats = h2hKey ? h2hByPair.get(h2hKey) : null;
          const playerAWins = playerAId ? h2hStats?.winsByPlayer.get(playerAId) ?? 0 : 0;
          const playerBWins = playerBId ? h2hStats?.winsByPlayer.get(playerBId) ?? 0 : 0;
          const h2hDecisiveTotal = playerAWins + playerBWins;
          const playerARate = h2hDecisiveTotal > 0 ? Math.round((playerAWins / h2hDecisiveTotal) * 100) : 0;
          const playerBRate = h2hDecisiveTotal > 0 ? Math.round((playerBWins / h2hDecisiveTotal) * 100) : 0;
          const h2hDisplay = h2hDecisiveTotal > 0 ? `${playerARate}% - ${playerBRate}%` : copy.h2hRateEmpty;
          const participants = [
            { id: playerAId, name: playerAName, avatar: playerAAvatar, isWinner: isAWinner },
            { id: playerBId, name: playerBName, avatar: playerBAvatar, isWinner: isBWinner }
          ];

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
              <p className="result-main-headline">
                <strong>{result.score}</strong>
                <span>{mainResultSummary}</span>
              </p>
              <div className="result-info-grid">
                <article className="result-info-card">
                  <span className="result-info-label">{copy.court}</span>
                  <strong className="result-info-value">{courtLabel}</strong>
                </article>
                <article className="result-info-card">
                  <span className="result-info-label">{copy.h2hLabel}</span>
                  <strong className="result-info-value">{h2hDisplay}</strong>
                </article>
              </div>
              <div className="result-participants-card">
                <p className="result-participants-title">{copy.participants}</p>
                <div className="result-participants-stack">
                  {participants.map((player, idx) => {
                    const marker = draw ? "D" : player.isWinner ? "W" : "L";
                    const markerClass = draw ? "draw" : player.isWinner ? "win" : "loss";
                    const row = (
                      <span className="participant-row">
                        <span className="participant-index">{copy.participantItem} {idx + 1}</span>
                        <span className={`result-outcome-marker ${markerClass}`}>{marker}</span>
                        <ProfileAvatar name={player.name} avatarUrl={player.avatar} size="sm" />
                        <strong className="participant-name">{player.name}</strong>
                        {player.id && post?.host_id && player.id === post.host_id ? <span className="participant-role">{copy.hostTag}</span> : null}
                      </span>
                    );

                    return (
                      <div key={`${result.id}-participant-${player.id ?? idx}`}>
                        {player.id ? (
                          <MotionProfileLink className="participant-chip" href={`/u/${player.id}`}>
                            {row}
                          </MotionProfileLink>
                        ) : (
                          <div className="participant-chip disabled-link">{row}</div>
                        )}
                        {idx === 0 ? (
                          <div className="result-vs-divider">
                            <span>vs</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <BottomNav />
    </main>
  );
}
