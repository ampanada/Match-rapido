import BottomNav from "@/components/BottomNav";
import { formatCordobaDate, formatSlotRange, getCordobaDateString, getCordobaHHMM, getCordobaWeekday, SLOT_MINUTES } from "@/lib/constants/slots";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileAvatar from "@/components/ProfileAvatar";
import MotionProfileLink from "@/components/MotionProfileLink";
import SubmitButton from "@/components/SubmitButton";
import { unstable_noStore as noStore } from "next/cache";

function safeTime(value: unknown) {
  const ms = new Date(String(value ?? "")).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function normalizeWhatsapp(raw: string) {
  const compact = raw.replace(/\s+/g, "").replace(/-/g, "");
  if (!compact) {
    return "";
  }
  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/[^\d]/g, "")}`;
  }
  return `+${compact.replace(/[^\d]/g, "")}`;
}

function isDrawScore(score: string | null | undefined) {
  return score === "6-6";
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

export default async function MyMatchesPage({
  searchParams
}: {
  searchParams?: Promise<{
    guestAdded?: string;
    guestError?: string;
    guestName?: string;
    reason?: string;
    post?: string;
  }>;
}) {
  noStore();
  const qs = (await searchParams) ?? {};
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
          draw: "무",
          completedLabel: "완료",
          recorded: "기록됨",
          hostManualClose: "매치 임의 마감",
          editPost: "포스트 수정",
          addGuestTitle: "게스트 추가",
          addGuestSavedTitle: "기존 게스트에서 선택",
          addGuestSavedEmpty: "저장된 게스트가 없습니다.",
          addGuestSavedUse: "선택해서 추가",
          addGuestSavedCount: "저장 게스트",
          addGuestOpenHint: "눌러서 열기",
          addGuestManualToggle: "새 게스트 직접 입력",
          addGuestManualHint: "눌러서 입력창 열기",
          addGuestLocked: "매치 만료 후에는 게스트를 추가할 수 없습니다.",
          addGuestName: "이름",
          addGuestWhatsapp: "WhatsApp 번호(선택)",
          addGuestHint: "비회원도 먼저 등록 가능하며, 이후 같은 번호로 가입하면 자동 연결됩니다.",
          addGuestSubmit: "게스트 등록",
          addGuestSubmitting: "등록 중...",
          guestAddedDone: "게스트가 추가되었습니다.",
          guestAddedExists: "이미 이 매치에 등록된 게스트입니다.",
          guestInvalid: "게스트 이름이 필요합니다.",
          guestForbidden: "호스트만 게스트를 추가할 수 있습니다.",
          guestExpired: "매치 만료 후에는 게스트를 추가할 수 없습니다.",
          guestFailed: "게스트 등록 중 오류가 발생했습니다."
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
          draw: "D",
          completedLabel: "Completado",
          recorded: "registrado",
          hostManualClose: "Cierre manual sin rival",
          editPost: "Editar post",
          addGuestTitle: "Agregar invitado",
          addGuestSavedTitle: "Seleccionar invitado guardado",
          addGuestSavedEmpty: "No hay invitados guardados.",
          addGuestSavedUse: "Agregar este invitado",
          addGuestSavedCount: "Invitados guardados",
          addGuestOpenHint: "Tocar para abrir",
          addGuestManualToggle: "Ingresar invitado nuevo",
          addGuestManualHint: "Pulsa para abrir el formulario",
          addGuestLocked: "No se pueden agregar invitados en partidos vencidos.",
          addGuestName: "Nombre",
          addGuestWhatsapp: "WhatsApp (opcional)",
          addGuestHint: "Puedes registrar invitados sin cuenta. Al registrarse con el mismo numero, se vinculan automaticamente.",
          addGuestSubmit: "Registrar invitado",
          addGuestSubmitting: "Registrando...",
          guestAddedDone: "Invitado agregado correctamente.",
          guestAddedExists: "Ese invitado ya estaba agregado a este partido.",
          guestInvalid: "Debes ingresar nombre del invitado.",
          guestForbidden: "Solo el host puede agregar invitados.",
          guestExpired: "No se pueden agregar invitados en partidos vencidos.",
          guestFailed: "Hubo un error al agregar el invitado."
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

  let guestDirectory: Array<{ key: string; guest_name: string; guest_whatsapp: string | null }> = [];
  if (hostPosts.length > 0) {
    let directoryRows: any[] = [];
    const guestDirectoryResponse = await supabase
      .from("joins")
      .select("guest_name,guest_whatsapp,user_id,created_at,profiles!joins_user_id_fkey(display_name,whatsapp,is_guest,email)")
      .order("created_at", { ascending: false })
      .limit(800);

    if (guestDirectoryResponse.data) {
      directoryRows = guestDirectoryResponse.data as any[];
    } else {
      const guestDirectoryFallback = await supabase
        .from("joins")
        .select("guest_name,guest_whatsapp,user_id,created_at,profiles!joins_user_id_fkey(display_name,whatsapp,email)")
        .order("created_at", { ascending: false })
        .limit(800);
      directoryRows = (guestDirectoryFallback.data ?? []) as any[];
    }

    const uniqueGuests = new Map<string, { key: string; guest_name: string; guest_whatsapp: string | null }>();
    (directoryRows as any[]).forEach((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const isLegacyGuestProfile = profile?.is_guest === true || String(profile?.email ?? "").endsWith("@guest.local");
      const legacyGuestName = isLegacyGuestProfile ? String(profile?.display_name ?? "").trim() : "";
      const legacyGuestWhatsapp = isLegacyGuestProfile && profile?.whatsapp ? normalizeWhatsapp(String(profile.whatsapp)) : null;
      const guestName = String(row.guest_name ?? "").trim() || legacyGuestName;
      if (!guestName) {
        return;
      }
      const guestWhatsapp = row.guest_whatsapp ? normalizeWhatsapp(String(row.guest_whatsapp)) : legacyGuestWhatsapp;
      const key = `${guestName.toLowerCase()}::${guestWhatsapp ?? ""}`;
      if (!uniqueGuests.has(key)) {
        uniqueGuests.set(key, {
          key,
          guest_name: guestName,
          guest_whatsapp: guestWhatsapp
        });
      }
    });

    const guestProfilesResponse = await supabase
      .from("profiles")
      .select("display_name,whatsapp,is_guest,email")
      .or("is_guest.eq.true,email.like.%@guest.local")
      .limit(400);

    const guestProfilesRows =
      guestProfilesResponse.data ??
      (
        await supabase
          .from("profiles")
          .select("display_name,whatsapp,email")
          .like("email", "%@guest.local")
          .limit(400)
      ).data ??
      [];

    (guestProfilesRows as any[]).forEach((row) => {
      const guestName = String(row.display_name ?? "").trim();
      if (!guestName) {
        return;
      }
      const guestWhatsapp = row.whatsapp ? normalizeWhatsapp(String(row.whatsapp)) : null;
      const key = `${guestName.toLowerCase()}::${guestWhatsapp ?? ""}`;
      if (!uniqueGuests.has(key)) {
        uniqueGuests.set(key, {
          key,
          guest_name: guestName,
          guest_whatsapp: guestWhatsapp
        });
      }
    });

    guestDirectory = Array.from(uniqueGuests.values()).slice(0, 40);
  }

  async function addGuestJoinFromMyMatches(formData: FormData) {
    "use server";

    function guestErrorUrl(code: string, postId: string, reason?: string) {
      const reasonPart = reason ? `&reason=${encodeURIComponent(reason)}` : "";
      return `/my-matches?guestError=${encodeURIComponent(code)}&post=${encodeURIComponent(postId)}${reasonPart}`;
    }

    function guestAddedUrl(type: "1" | "exists", postId: string, guestName?: string) {
      const namePart = guestName ? `&guestName=${encodeURIComponent(guestName)}` : "";
      return `/my-matches?guestAdded=${type}&post=${encodeURIComponent(postId)}${namePart}`;
    }

    const postId = String(formData.get("post_id") || "").trim();
    const guestName = String(formData.get("guest_name") || "").trim();
    const guestWhatsappRaw = String(formData.get("guest_whatsapp") || "").trim();
    const normalizedWhatsapp = normalizeWhatsapp(guestWhatsappRaw);
    const guestWhatsapp = normalizedWhatsapp && /^\+\d{8,15}$/.test(normalizedWhatsapp) ? normalizedWhatsapp : null;

    if (!postId || !guestName) {
      redirect(guestErrorUrl("invalid", postId || "unknown"));
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/login?redirect_to=${encodeURIComponent("/my-matches")}`);
    }

    const { data: latestPost, error: latestPostError } = await supabase
      .from("posts")
      .select("id,host_id,status,needed,start_at,joins(id,status)")
      .eq("id", postId)
      .maybeSingle();

    if (latestPostError) {
      redirect(guestErrorUrl("load_failed", postId, latestPostError.message));
    }

    if (!latestPost || latestPost.host_id !== user.id) {
      redirect(guestErrorUrl("forbidden", postId));
    }

    const startMs = latestPost.start_at ? new Date(latestPost.start_at).getTime() : null;
    if (startMs && Number.isFinite(startMs) && startMs + 30 * 60 * 1000 < Date.now()) {
      redirect(guestErrorUrl("expired", postId));
    }

    const approvedCount = latestPost.joins?.filter((join: any) => join.status === "approved").length ?? 0;
    const players = approvedCount + 1;
    const existingGuestJoinQuery = supabase
      .from("joins")
      .select("id,status")
      .eq("post_id", postId)
      .is("user_id", null)
      .eq("guest_name", guestName)
      .limit(1);

    const { data: existingGuestJoin, error: existingGuestJoinError } = await existingGuestJoinQuery.maybeSingle();
    if (existingGuestJoinError) {
      redirect(guestErrorUrl("lookup_failed", postId, existingGuestJoinError.message));
    }

    if (existingGuestJoin?.id) {
      if (existingGuestJoin.status !== "approved") {
        const { error: approveExistingError } = await supabase
          .from("joins")
          .update({ status: "approved" })
          .eq("id", existingGuestJoin.id)
          .eq("post_id", postId);
        if (approveExistingError) {
          redirect(guestErrorUrl("insert_failed", postId, approveExistingError.message));
        }
        redirect(guestAddedUrl("1", postId, guestName));
      }
      redirect(guestAddedUrl("exists", postId, guestName));
    }

    const { error: insertError } = await supabase.from("joins").insert({
      post_id: postId,
      user_id: null,
      status: "approved",
      guest_name: guestName,
      guest_whatsapp: guestWhatsapp || null,
      claimed_at: null
    });

    if (insertError) {
      redirect(guestErrorUrl("insert_failed", postId, insertError.message));
    }

    if (players >= latestPost.needed || latestPost.status === "closed") {
      await supabase
        .from("posts")
        .update({
          needed: Math.max(latestPost.needed, players + 1),
          status: "open"
        })
        .eq("id", postId)
        .eq("host_id", user.id);
    }

    redirect(guestAddedUrl("1", postId, guestName));
  }

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
      const currentPlayers = approvedCount + 1;
      const isSingleReady = post.format === "single" && approvedCount === 1;
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
  const guestFeedbackPostId = typeof qs.post === "string" ? qs.post : "";
  const guestNameFromQs = typeof qs.guestName === "string" ? decodeURIComponent(qs.guestName) : "";
  const guestReason = typeof qs.reason === "string" ? decodeURIComponent(qs.reason) : "";
  const guestErrorMessage =
    qs.guestError === "invalid"
      ? copy.guestInvalid
      : qs.guestError === "forbidden"
        ? copy.guestForbidden
        : qs.guestError === "expired"
          ? copy.guestExpired
          : copy.guestFailed;

  const renderGuestManager = (item: (typeof normalized)[number]) => {
    if (item.host_id !== user.id) {
      return null;
    }

    const isGuestExpired = item.startMs + 30 * 60 * 1000 < now;
    const showFeedback = guestFeedbackPostId === item.id;
    const openByFeedback = showFeedback && (qs.guestAdded === "1" || qs.guestAdded === "exists" || !!qs.guestError);

    return (
      <details className="guest-card guest-card-collapsible my-match-guest-card" open={openByFeedback}>
        <summary className="guest-card-toggle">
          <span className="guest-card-toggle-main">
            <span className="guest-card-toggle-icon" aria-hidden>
              +
            </span>
            <span className="guest-card-toggle-text">
              <strong>{copy.addGuestTitle}</strong>
              <small>{copy.addGuestOpenHint}</small>
            </span>
          </span>
          <span className="badge guest-count-badge">
            {copy.addGuestSavedCount} {guestDirectory.length}
          </span>
        </summary>

        <div className="guest-card-panel">
          {showFeedback && qs.guestAdded === "1" ? (
            <p className="notice success guest-feedback">
              <span className="guest-feedback-icon" aria-hidden>
                ✅
              </span>
              <span>
                {copy.guestAddedDone}
                {guestNameFromQs ? ` · ${guestNameFromQs}` : ""}
              </span>
            </p>
          ) : null}
          {showFeedback && qs.guestAdded === "exists" ? (
            <p className="notice success guest-feedback">
              <span className="guest-feedback-icon" aria-hidden>
                ✅
              </span>
              <span>
                {copy.guestAddedExists}
                {guestNameFromQs ? ` · ${guestNameFromQs}` : ""}
              </span>
            </p>
          ) : null}
          {showFeedback && qs.guestError ? (
            <p className="notice">
              {guestErrorMessage}
              {guestReason ? ` (${guestReason})` : ""}
            </p>
          ) : null}

          <div className="guest-directory-main">
            <p className="guest-directory-title">{copy.addGuestSavedTitle}</p>
            {guestDirectory.length === 0 ? <p className="muted">{copy.addGuestSavedEmpty}</p> : null}
            {guestDirectory.length > 0 ? (
              <div className="guest-directory-list">
                {guestDirectory.map((guest) => (
                  <form key={`${item.id}-${guest.key}`} action={addGuestJoinFromMyMatches}>
                    <input type="hidden" name="post_id" value={item.id} />
                    <input type="hidden" name="guest_name" value={guest.guest_name} />
                    <input type="hidden" name="guest_whatsapp" value={guest.guest_whatsapp ?? ""} />
                    <button className="guest-directory-btn" type="submit" disabled={isGuestExpired}>
                      <span className="guest-directory-mainline">
                        <ProfileAvatar name={guest.guest_name} avatarUrl={null} size="sm" />
                        <span className="guest-directory-name">{guest.guest_name}</span>
                      </span>
                      <span className="guest-directory-cta">{copy.addGuestSavedUse}</span>
                    </button>
                  </form>
                ))}
              </div>
            ) : null}
          </div>

          <details className="guest-mini-create">
            <summary className="guest-mini-summary">
              <span>{copy.addGuestManualToggle}</span>
              <small>{copy.addGuestManualHint}</small>
            </summary>
            <form className="guest-mini-form" action={addGuestJoinFromMyMatches}>
              <input type="hidden" name="post_id" value={item.id} />
              <input className="input input-compact" name="guest_name" placeholder={copy.addGuestName} required disabled={isGuestExpired} />
              <input
                className="input input-compact"
                name="guest_whatsapp"
                placeholder={copy.addGuestWhatsapp}
                inputMode="tel"
                disabled={isGuestExpired}
              />
              <SubmitButton idleLabel={copy.addGuestSubmit} pendingLabel={copy.addGuestSubmitting} disabled={isGuestExpired} />
            </form>
          </details>
          {isGuestExpired ? <p className="notice">{copy.addGuestLocked}</p> : null}
          <p className="muted">{copy.addGuestHint}</p>
        </div>
      </details>
    );
  };

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
                {renderGuestManager(item)}
                {item.host_id === user.id && item.startMs > now ? (
                  <Link className="link-btn" href={`/post/${item.id}/edit`}>
                    {copy.editPost}
                  </Link>
                ) : null}
                {item.isSingleReady && !item.hasConfirmedResult && item.startMs <= now && !item.hostManualClose ? (
                  <Link className="link-btn" href={`/post/${item.id}?record=1&from=my-matches`}>
                    {copy.record}
                  </Link>
                ) : item.hasConfirmedResult ? (
                  <div className="section">
                    {item.format === "single" && item.participants.length === 2 ? (
                      <p className="result-players">
                        {(() => {
                          const winnerId = resultMap.get(item.id)?.winner_id ?? null;
                          const draw = isDrawScore(resultMap.get(item.id)?.score ?? null);
                          const first = item.participants[0];
                          const second = item.participants[1];
                          const firstWinner = !draw && winnerId === first.id;
                          const secondWinner = !draw && winnerId === second.id;
                          return (
                            <>
                              <MotionProfileLink className="link-inline" href={`/u/${first.profile_id ?? first.id}`}>
                                <span className="result-player-line">
                                  <ProfileAvatar name={first.display_name} avatarUrl={first.avatar_url} size="sm" />
                                  <span className="result-player-name">{first.display_name}</span>
                                  <span className={draw ? "result-tag-draw" : firstWinner ? "result-tag-win" : "result-tag-loss"}>
                                    {draw ? copy.draw : firstWinner ? copy.winner : copy.loser}
                                  </span>
                                </span>
                              </MotionProfileLink>
                              <span className="result-vs">vs</span>
                              <MotionProfileLink className="link-inline" href={`/u/${second.profile_id ?? second.id}`}>
                                <span className="result-player-line">
                                  <ProfileAvatar name={second.display_name} avatarUrl={second.avatar_url} size="sm" />
                                  <span className="result-player-name">{second.display_name}</span>
                                  <span className={draw ? "result-tag-draw" : secondWinner ? "result-tag-win" : "result-tag-loss"}>
                                    {draw ? copy.draw : secondWinner ? copy.winner : copy.loser}
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
                {renderGuestManager(item)}
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
                  {renderGuestManager(item)}
                  {item.isSingleReady && !item.hasConfirmedResult && item.startMs <= now && !item.hostManualClose ? (
                    <Link className="link-btn" href={`/post/${item.id}?record=1&from=my-matches`}>
                      {copy.record}
                    </Link>
                  ) : item.hasConfirmedResult ? (
                    <div className="section">
                      {item.format === "single" && item.participants.length === 2 ? (
                        <p className="result-players">
                          {(() => {
                            const winnerId = resultMap.get(item.id)?.winner_id ?? null;
                            const draw = isDrawScore(resultMap.get(item.id)?.score ?? null);
                            const first = item.participants[0];
                            const second = item.participants[1];
                            const firstWinner = !draw && winnerId === first.id;
                            const secondWinner = !draw && winnerId === second.id;
                            return (
                              <>
                                <MotionProfileLink className="link-inline" href={`/u/${first.profile_id ?? first.id}`}>
                                  <span className="result-player-line">
                                    <ProfileAvatar name={first.display_name} avatarUrl={first.avatar_url} size="sm" />
                                    <span className="result-player-name">{first.display_name}</span>
                                    <span className={draw ? "result-tag-draw" : firstWinner ? "result-tag-win" : "result-tag-loss"}>
                                      {draw ? copy.draw : firstWinner ? copy.winner : copy.loser}
                                    </span>
                                  </span>
                                </MotionProfileLink>
                                <span className="result-vs">vs</span>
                                <MotionProfileLink className="link-inline" href={`/u/${second.profile_id ?? second.id}`}>
                                  <span className="result-player-line">
                                    <ProfileAvatar name={second.display_name} avatarUrl={second.avatar_url} size="sm" />
                                    <span className="result-player-name">{second.display_name}</span>
                                    <span className={draw ? "result-tag-draw" : secondWinner ? "result-tag-win" : "result-tag-loss"}>
                                      {draw ? copy.draw : secondWinner ? copy.winner : copy.loser}
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
