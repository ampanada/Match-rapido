import BottomNav from "@/components/BottomNav";
import SubmitButton from "@/components/SubmitButton";
import { formatLabel } from "@/lib/constants/filters";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ShareButtons from "./_components/ShareButtons";
import LoginSuccessToast from "../../_components/LoginSuccessToast";

function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
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

function isValidResultScore(score: string) {
  return /^(6-[0-4]|7-[5-6])$/.test(score);
}

export default async function PostDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ createdAt?: string; record?: string; loggedIn?: string; guestAdded?: string; guestError?: string }>;
}) {
  const { id } = await params;
  const qs = (await searchParams) ?? {};
  const shouldFocusRecord = qs.record === "1";
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "매치 상세",
          done: "매칭완료",
          open: "모집중",
          hostRecruit: "호스트 외",
          recruitSuffix: "명 모집",
          emptyNote: "메모 없음",
          join: "참여하기",
          loginToJoin: "로그인하고 참여하기",
          joining: "참여 처리 중...",
          joined: "참여완료",
          pending: "승인 대기",
          mine: "내 모집글",
          ask: "WhatsApp 문의",
          loginToAsk: "로그인하고 연락하기",
          noWhatsapp: "WhatsApp 없음",
          shareTitle: "공유",
          close: "모집 마감",
          created: "작성 완료:",
          pendingRequests: "참여 요청",
          approve: "승인",
          approving: "승인 중...",
          cancelJoin: "참여 신청 철회",
          cancellingJoin: "철회 중...",
          resultTitle: "1 Set Slam 결과",
          singleOnlyResult: "1 Set Slam 결과 등록은 단식 매치에서만 가능합니다.",
          registerResult: "결과 등록",
          registeringResult: "등록 중...",
          resultWaiting: "상대 확인 대기중",
          confirmResult: "결과 확정",
          confirmingResult: "확정 중...",
          cancelResult: "결과 취소",
          cancellingResult: "취소 중...",
          confirmedResult: "확정 결과",
          winner: "승자",
          scorePlaceholder: "예: 6-2, 7-5, 7-6",
          resultNotStarted: "경기 시작 전에는 결과를 등록할 수 없습니다.",
          h2hTitle: "상대전적 (Head to Head)",
          h2hTotal: "총 전적",
          h2hRate: "승률",
          h2hNoData: "아직 두 선수의 확정 전적이 없습니다.",
          closing: "마감 중...",
          addGuestTitle: "게스트 추가",
          addGuestName: "이름",
          addGuestWhatsapp: "WhatsApp 번호(선택)",
          addGuestHint: "비회원도 먼저 등록 가능하며, 이후 같은 번호로 가입하면 자동 연결됩니다.",
          addGuestSubmit: "게스트 등록",
          addGuestSubmitting: "등록 중...",
          guestAddedDone: "게스트가 추가되었습니다.",
          guestInvalid: "게스트 이름 또는 WhatsApp 번호 형식이 올바르지 않습니다."
        }
      : {
          title: "Detalle del partido",
          done: "Cerrado",
          open: "Abierto",
          hostRecruit: "Buscando",
          recruitSuffix: " mas (sin contar host)",
          emptyNote: "Sin nota",
          join: "Unirme",
          loginToJoin: "Inicia sesión para participar",
          joining: "Uniendo...",
          joined: "Ya participo",
          pending: "Pendiente",
          mine: "Mi publicacion",
          ask: "Contactar por WhatsApp",
          loginToAsk: "Inicia sesión para contactar",
          noWhatsapp: "Sin WhatsApp",
          shareTitle: "Compartir",
          close: "Cerrar convocatoria",
          created: "Publicado:",
          pendingRequests: "Solicitudes pendientes",
          approve: "Aprobar",
          approving: "Aprobando...",
          cancelJoin: "Cancelar participacion",
          cancellingJoin: "Cancelando...",
          resultTitle: "Resultado 1 Set Slam",
          singleOnlyResult: "El registro de 1 Set Slam solo esta disponible para partidos individuales.",
          registerResult: "Registrar resultado",
          registeringResult: "Registrando...",
          resultWaiting: "Esperando confirmacion",
          confirmResult: "Confirmar resultado",
          confirmingResult: "Confirmando...",
          cancelResult: "Cancelar resultado",
          cancellingResult: "Cancelando...",
          confirmedResult: "Resultado confirmado",
          winner: "Ganador",
          scorePlaceholder: "Ej: 6-2, 7-5, 7-6",
          resultNotStarted: "No se puede registrar resultado antes del inicio del partido.",
          h2hTitle: "Head to Head",
          h2hTotal: "Historial total",
          h2hRate: "Porcentaje",
          h2hNoData: "Aun no hay historial confirmado entre ambos.",
          closing: "Cerrando...",
          addGuestTitle: "Agregar invitado",
          addGuestName: "Nombre",
          addGuestWhatsapp: "WhatsApp (opcional)",
          addGuestHint: "Puedes registrar invitados sin cuenta. Al registrarse con el mismo numero, se vinculan automaticamente.",
          addGuestSubmit: "Registrar invitado",
          addGuestSubmitting: "Registrando...",
          guestAddedDone: "Invitado agregado correctamente.",
          guestInvalid: "Nombre o formato de WhatsApp invalido."
        };

  const supabase = await createClient();

  const primaryPostQuery = await supabase
    .from("posts")
    .select("id,host_id,start_at,format,needed,level,court_no,note,status")
    .eq("id", id)
    .maybeSingle();

  let post: {
    id: string;
    host_id: string;
    start_at: string;
    format: string;
    needed: number;
    level: string | null;
    court_no: number | null;
    note: string | null;
    status: string;
  } | null = primaryPostQuery.data as any;

  if (!post && primaryPostQuery.error) {
    const fallbackPostQuery = await supabase
      .from("posts")
      .select("id,host_id,start_at,format,needed")
      .eq("id", id)
      .maybeSingle();

    if (fallbackPostQuery.data) {
      post = {
        ...fallbackPostQuery.data,
        level: null,
        court_no: null,
        note: null,
        status: "open"
      } as any;
    }

    if (!post) {
      const legacyPostQuery = await supabase
        .from("posts")
        .select("id,host_id,date_time,format,needed")
        .eq("id", id)
        .maybeSingle();

      if (legacyPostQuery.data?.date_time) {
        post = {
          id: legacyPostQuery.data.id,
          host_id: legacyPostQuery.data.host_id,
          start_at: legacyPostQuery.data.date_time,
          format: legacyPostQuery.data.format,
          needed: legacyPostQuery.data.needed,
          level: null,
          court_no: null,
          note: null,
          status: "open"
        };
      }
    }
  }

  if (!post) {
    const reason = primaryPostQuery.error?.message ? `&reason=${encodeURIComponent(primaryPostQuery.error.message)}` : "";
    redirect(`/post?error=not_found&id=${encodeURIComponent(id)}${reason}`);
  }

  const [hostProfileResponse, joinsResponse] = await Promise.all([
    supabase.from("profiles").select("display_name,whatsapp").eq("id", post.host_id).maybeSingle(),
    supabase
      .from("joins")
      .select("id,user_id,status,guest_name,guest_whatsapp,profiles!joins_user_id_fkey(id,display_name,is_guest)")
      .eq("post_id", post.id)
  ]);

  let hostProfile = hostProfileResponse.data;
  if (hostProfileResponse.error) {
    const hostFallback = await supabase.from("profiles").select("display_name").eq("id", post.host_id).maybeSingle();
    hostProfile = hostFallback.data ? { display_name: hostFallback.data.display_name, whatsapp: null } : null;
  }

  let joins = joinsResponse.data ?? [];
  if (joinsResponse.error) {
    const joinsFallback = await supabase
      .from("joins")
      .select("id,user_id,profiles!joins_user_id_fkey(id,display_name)")
      .eq("post_id", post.id);
    joins = (joinsFallback.data ?? []).map((join: any) => ({
      ...join,
      status: "approved",
      guest_name: null,
      guest_whatsapp: null
    }));
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const approvedJoins = joins?.filter((join: any) => (join.status ?? "approved") === "approved") ?? [];
  const pendingJoins = joins?.filter((join: any) => (join.status ?? "approved") === "pending") ?? [];
  const currentPlayers = approvedJoins.length + 1;
  const recruitCount = Math.max(post.needed - 1, 0);
  const isHost = user?.id === post.host_id;
  const myJoin = joins?.find((join: any) => join.user_id === user?.id);
  const isJoined = !!myJoin;
  const isPending = myJoin?.status === "pending";
  const isExpired = new Date(post.start_at).getTime() + 30 * 60 * 1000 < Date.now();
  const hasStarted = new Date(post.start_at).getTime() <= Date.now();
  const postStatus = post.status ?? "open";
  const isCompleted = postStatus === "closed" || currentPlayers >= post.needed || isExpired;
  const startHHMM = getCordobaHHMM(post.start_at);
  const slotRange = formatSlotRange(startHHMM);

  const singleApprovedRegisteredJoin = approvedJoins.find((join: any) => !!join.user_id) ?? null;
  const singleOpponentId = singleApprovedRegisteredJoin?.user_id ?? null;
  const canUseResultFeature = !!user && post.format === "single" && (isHost || user.id === singleOpponentId) && hasStarted;
  const playerA = post.host_id;
  const playerB = singleOpponentId;
  const canViewH2H = !!user && post.format === "single" && !!playerB;

  let h2hRecords: { winner_id: string | null }[] = [];
  if (canViewH2H) {
    const { data } = await supabase
      .from("match_results")
      .select("winner_id")
      .eq("status", "confirmed")
      .or(`and(player_a.eq.${post.host_id},player_b.eq.${playerB}),and(player_a.eq.${playerB},player_b.eq.${post.host_id})`)
      .order("confirmed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    h2hRecords = data ?? [];
  }

  const h2hTotal = h2hRecords.length;
  const hostWins = h2hRecords.filter((item) => item.winner_id === post.host_id).length;
  const opponentWins = h2hTotal - hostWins;
  const hostWinRate = h2hTotal > 0 ? Math.round((hostWins / h2hTotal) * 100) : 0;
  const opponentWinRate = h2hTotal > 0 ? Math.round((opponentWins / h2hTotal) * 100) : 0;
  const latestWinner = h2hRecords[0]?.winner_id ?? null;
  let h2hStreak = 0;
  if (latestWinner) {
    for (const row of h2hRecords) {
      if (row.winner_id === latestWinner) {
        h2hStreak += 1;
      } else {
        break;
      }
    }
  }

  const { data: matchResult } = await supabase
    .from("match_results")
    .select("id,post_id,player_a,player_b,winner_id,score,status,submitted_by,confirmed_at")
    .eq("post_id", post.id)
    .maybeSingle();

  async function closePost() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data } = await supabase.from("posts").select("host_id").eq("id", id).single();

    if (!data || data.host_id !== user.id) {
      redirect(`/post/${id}`);
    }

    await supabase.from("posts").update({ status: "closed" }).eq("id", id);
    redirect(`/post/${id}`);
  }

  async function approveJoin(formData: FormData) {
    "use server";

    const joinId = String(formData.get("join_id") || "");
    if (!joinId) {
      redirect(`/post/${id}`);
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: postData } = await supabase.from("posts").select("id,host_id").eq("id", id).maybeSingle();
    if (!postData || postData.host_id !== user.id) {
      redirect(`/post/${id}`);
    }

    const { data: postWithJoins } = await supabase
      .from("posts")
      .select("needed,joins(id,status)")
      .eq("id", id)
      .maybeSingle();

    const approvedCount = postWithJoins?.joins?.filter((join: any) => join.status === "approved").length ?? 0;
    const players = approvedCount + 1;

    if (players >= (postWithJoins?.needed ?? 0)) {
      redirect(`/post/${id}`);
    }

    await supabase.from("joins").update({ status: "approved" }).eq("id", joinId).eq("post_id", id);
    redirect(`/post/${id}`);
  }

  async function createResult(formData: FormData) {
    "use server";

    const winnerId = String(formData.get("winner_id") || "");
    const score = String(formData.get("score") || "").trim();

    if (!winnerId || !isValidResultScore(score)) {
      redirect(`/post/${id}`);
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: latestPost } = await supabase
      .from("posts")
      .select("id,host_id,format,status,start_at,joins(user_id,status)")
      .eq("id", id)
      .maybeSingle();

    if (!latestPost || latestPost.format !== "single") {
      redirect(`/post/${id}`);
    }

    if (new Date(latestPost.start_at).getTime() > Date.now()) {
      redirect(`/post/${id}`);
    }

    const approved = latestPost.joins?.filter((join: any) => join.status === "approved" && !!join.user_id) ?? [];
    if (approved.length !== 1) {
      redirect(`/post/${id}`);
    }

    const bId = approved[0].user_id as string;
    const participants = [latestPost.host_id, bId];
    if (!participants.includes(user.id) || !participants.includes(winnerId)) {
      redirect(`/post/${id}`);
    }

    const { data: existing } = await supabase.from("match_results").select("id").eq("post_id", id).maybeSingle();
    if (existing) {
      redirect(`/post/${id}`);
    }

    await supabase.from("match_results").insert({
      post_id: id,
      player_a: latestPost.host_id,
      player_b: bId,
      winner_id: winnerId,
      score,
      status: "pending",
      submitted_by: user.id
    });

    redirect(`/post/${id}`);
  }

  async function confirmResult() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: latestPost } = await supabase.from("posts").select("start_at,format").eq("id", id).maybeSingle();
    if (!latestPost || latestPost.format !== "single" || new Date(latestPost.start_at).getTime() > Date.now()) {
      redirect(`/post/${id}`);
    }

    await supabase
      .from("match_results")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("post_id", id)
      .eq("status", "pending");

    redirect(`/post/${id}`);
  }

  async function cancelResult() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: latestPost } = await supabase.from("posts").select("format").eq("id", id).maybeSingle();
    if (!latestPost || latestPost.format !== "single") {
      redirect(`/post/${id}`);
    }

    await supabase.from("match_results").update({ status: "cancelled" }).eq("post_id", id).eq("status", "pending");
    redirect(`/post/${id}`);
  }

  const hostName = hostProfile?.display_name || (lang === "ko" ? "호스트" : "Host");
  const hostWhatsapp = hostProfile?.whatsapp || "";
  const dateLocale = lang === "ko" ? "ko-KR" : "es-AR";
  const chatLink = hostWhatsapp
    ? waLink(hostWhatsapp, `Hola ${hostName}, consulta por el partido ${formatCordobaDate(post.start_at, "es-AR")} ${slotRange}.`)
    : "";
  const sharePath = `/post/${post.id}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  let shareUrl = sharePath;

  if (siteUrl) {
    shareUrl = `${siteUrl}${sharePath}`;
  } else {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
    if (host) {
      shareUrl = `${proto}://${host}${sharePath}`;
    }
  }

  const shareDateTimeLabel = `${formatCordobaDate(post.start_at, "es-AR")} · ${slotRange}`;

  const singleJoinProfile = singleApprovedRegisteredJoin
    ? Array.isArray(singleApprovedRegisteredJoin.profiles)
      ? singleApprovedRegisteredJoin.profiles[0]
      : singleApprovedRegisteredJoin.profiles
    : null;
  const singleJoinName = singleJoinProfile?.display_name || (lang === "ko" ? "참여자" : "Jugador");
  const opponentIsGuest = singleJoinProfile?.is_guest === true;
  const canConfirmResult =
    !!matchResult &&
    matchResult.status === "pending" &&
    !!user &&
    [matchResult.player_a, matchResult.player_b].includes(user.id) &&
    (user.id !== matchResult.submitted_by || opponentIsGuest);
  const isResultSubmitter = !!matchResult && !!user && user.id === matchResult.submitted_by;
  const canCancelResult =
    !!matchResult && matchResult.status === "pending" && !!user && (user.id === matchResult.player_a || user.id === matchResult.player_b);
  const winnerDisplayName = matchResult
    ? matchResult.winner_id === post.host_id
      ? hostName
      : singleJoinName
    : "";

  async function addGuestJoin(formData: FormData) {
    "use server";

    const guestName = String(formData.get("guest_name") || "").trim();
    const guestWhatsappRaw = String(formData.get("guest_whatsapp") || "").trim();
    const guestWhatsapp = normalizeWhatsapp(guestWhatsappRaw);

    if (!guestName || (guestWhatsapp && !/^\+\d{8,15}$/.test(guestWhatsapp))) {
      redirect(`/post/${id}?guestError=invalid`);
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/login?redirect_to=${encodeURIComponent(`/post/${id}`)}`);
    }

    const { data: latestPost } = await supabase
      .from("posts")
      .select("id,host_id,status,needed,start_at,joins(id,status)")
      .eq("id", id)
      .maybeSingle();

    if (!latestPost || latestPost.host_id !== user.id) {
      redirect(`/post/${id}`);
    }

    if (latestPost.start_at && new Date(latestPost.start_at).getTime() <= Date.now()) {
      redirect(`/post/${id}`);
    }
    const approvedCount = latestPost.joins?.filter((join: any) => join.status === "approved").length ?? 0;
    const players = approvedCount + 1;

    let guestProfileId: string | null = null;

    if (guestWhatsapp) {
      const { data: existingGuest } = await supabase
        .from("profiles")
        .select("id,display_name")
        .eq("is_guest", true)
        .eq("whatsapp", guestWhatsapp)
        .maybeSingle();

      if (existingGuest?.id) {
        guestProfileId = existingGuest.id;
        if (existingGuest.display_name !== guestName) {
          await supabase.from("profiles").update({ display_name: guestName }).eq("id", existingGuest.id).eq("is_guest", true);
        }
      }
    }

    if (!guestProfileId) {
      const newGuestId = crypto.randomUUID();
      const guestEmail = `guest+${newGuestId}@guest.local`;
      const { error: createGuestError } = await supabase.from("profiles").insert({
        id: newGuestId,
        email: guestEmail,
        display_name: guestName,
        whatsapp: guestWhatsapp || null,
        is_guest: true,
        created_by: user.id
      });

      if (createGuestError && guestWhatsapp) {
        const { data: fallbackGuest } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_guest", true)
          .eq("whatsapp", guestWhatsapp)
          .maybeSingle();
        guestProfileId = fallbackGuest?.id ?? null;
      } else if (!createGuestError) {
        guestProfileId = newGuestId;
      }
    }

    if (!guestProfileId) {
      redirect(`/post/${id}?guestError=insert`);
    }

    const { error } = await supabase.from("joins").upsert(
      {
        post_id: id,
        user_id: guestProfileId,
        status: "approved",
        guest_name: null,
        guest_whatsapp: null
      },
      { onConflict: "post_id,user_id" }
    );

    if (error) {
      redirect(`/post/${id}?guestError=insert`);
    }

    if (players >= latestPost.needed || latestPost.status === "closed") {
      await supabase
        .from("posts")
        .update({
          needed: Math.max(latestPost.needed, players + 1),
          status: "open"
        })
        .eq("id", id)
        .eq("host_id", user.id);
    }

    redirect(`/post/${id}?guestAdded=1`);
  }

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
        <p>
          {formatCordobaDate(post.start_at, dateLocale)} · {slotRange}
        </p>
      </header>
      {qs.loggedIn === "1" ? <LoginSuccessToast lang={lang} /> : null}

      {qs.createdAt ? (
        <p className="notice success">
          {copy.created} {new Date(qs.createdAt).toLocaleString(dateLocale)}
        </p>
      ) : null}
      {qs.guestAdded === "1" ? <p className="notice success">{copy.guestAddedDone}</p> : null}
      {qs.guestError ? <p className="notice">{copy.guestInvalid}</p> : null}

      <section className="card">
        <div className="row">
          <strong>{hostName}</strong>
          <span className={`status-chip ${isCompleted ? "done" : "open"}`}>
            {isCompleted ? copy.done : copy.open}
          </span>
        </div>

        <div className="badges">
          <span className="badge">{formatLabel(post.format, lang)}</span>
          {post.court_no ? (
            <span className="badge">{lang === "ko" ? `${post.court_no}번코트` : `Cancha ${post.court_no}`}</span>
          ) : null}
          <span className="badge">
            {currentPlayers}/{post.needed}
          </span>
        </div>
        <span className="muted">
          {copy.hostRecruit} {recruitCount}
          {copy.recruitSuffix}
        </span>

        <p className="note">{post.note || copy.emptyNote}</p>

        <div className="actions">
          {!user && !isCompleted ? (
            <a className="button" href={`/login?redirect_to=${encodeURIComponent(`/post/${post.id}`)}`}>
              {copy.loginToJoin}
            </a>
          ) : !isCompleted && !isJoined && !isHost ? (
            <form method="post" action="/join">
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="redirect_to" value={`/post/${post.id}`} />
              <SubmitButton idleLabel={copy.join} pendingLabel={copy.joining} />
            </form>
          ) : (
            <button className="button" type="button" disabled>
              {isHost ? copy.mine : isPending ? copy.pending : isJoined ? copy.joined : copy.done}
            </button>
          )}

          {isJoined && !isHost && postStatus === "open" && !isExpired ? (
            <form method="post" action="/join/cancel">
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="redirect_to" value={`/post/${post.id}`} />
              <SubmitButton idleLabel={copy.cancelJoin} pendingLabel={copy.cancellingJoin} />
            </form>
          ) : null}

          {!user ? (
            <a className="link-btn" href={`/login?redirect_to=${encodeURIComponent(`/post/${post.id}`)}`}>
              {copy.loginToAsk}
            </a>
          ) : chatLink ? (
            <a className="link-btn" href={chatLink} target="_blank" rel="noreferrer">
              {copy.ask}
            </a>
          ) : (
            <button className="link-btn" type="button" disabled>
              {copy.noWhatsapp}
            </button>
          )}
        </div>

        <article className="card">
          <strong>{copy.shareTitle}</strong>
          <ShareButtons
            url={shareUrl}
            dateTimeLabel={shareDateTimeLabel}
            courtNo={post.court_no}
            format={post.format}
            level={post.level}
          />
        </article>

        {isHost && !isCompleted ? (
          <form action={closePost}>
            <SubmitButton idleLabel={copy.close} pendingLabel={copy.closing} />
          </form>
        ) : null}

        {isHost && !hasStarted ? (
          <article className="card" id="guest-add">
            <strong>{copy.addGuestTitle}</strong>
            <form className="section" action={addGuestJoin}>
              <input className="input" name="guest_name" placeholder={copy.addGuestName} required />
              <input className="input" name="guest_whatsapp" placeholder={copy.addGuestWhatsapp} inputMode="tel" />
              <SubmitButton idleLabel={copy.addGuestSubmit} pendingLabel={copy.addGuestSubmitting} />
            </form>
            <p className="muted">{copy.addGuestHint}</p>
          </article>
        ) : null}

        {isHost && pendingJoins.length > 0 ? (
          <article className="card">
            <strong>{copy.pendingRequests}</strong>
            {pendingJoins.map((join: any) => {
              const joinProfile = Array.isArray(join.profiles) ? join.profiles[0] : join.profiles;
              const joinName = joinProfile?.display_name || join.guest_name || (lang === "ko" ? "참여자" : "Jugador");

              return (
                <form key={join.id} className="row" action={approveJoin}>
                  <span className="muted">{joinName}</span>
                  <input type="hidden" name="join_id" value={join.id} />
                  <SubmitButton idleLabel={copy.approve} pendingLabel={copy.approving} />
                </form>
              );
            })}
          </article>
        ) : null}

        {post.format !== "single" ? <p className="muted">{copy.singleOnlyResult}</p> : null}

        {!hasStarted && !!user && post.format === "single" && (isHost || user?.id === singleOpponentId) ? (
          <p className="notice">{copy.resultNotStarted}</p>
        ) : null}

        {canUseResultFeature && playerB ? (
          <article className="card">
            <strong>{copy.resultTitle}</strong>
            {!matchResult ? (
              <form className="section" action={createResult}>
                <select className="select" name="winner_id" required>
                  <option value={post.host_id}>{hostName}</option>
                  <option value={playerB}>{singleJoinName}</option>
                </select>
                <input className="input" name="score" placeholder={copy.scorePlaceholder} required autoFocus={shouldFocusRecord} />
                <SubmitButton idleLabel={copy.registerResult} pendingLabel={copy.registeringResult} />
              </form>
            ) : null}

            {matchResult?.status === "pending" ? (
              <div className="section">
                <p className="muted">
                  {matchResult.score} · {isResultSubmitter ? copy.resultWaiting : copy.confirmResult}
                </p>
                <p className="result-summary">
                  {copy.winner}: <strong>{winnerDisplayName}</strong> · {formatCordobaDate(post.start_at, dateLocale)} · {slotRange}
                  {post.court_no ? ` · ${lang === "ko" ? `${post.court_no}번코트` : `Cancha ${post.court_no}`}` : ""}
                </p>

                {canConfirmResult ? (
                  <form action={confirmResult}>
                    <SubmitButton idleLabel={copy.confirmResult} pendingLabel={copy.confirmingResult} />
                  </form>
                ) : null}

                {canCancelResult ? (
                  <form action={cancelResult}>
                    <SubmitButton idleLabel={copy.cancelResult} pendingLabel={copy.cancellingResult} className="link-btn" />
                  </form>
                ) : null}
              </div>
            ) : null}

            {matchResult?.status === "confirmed" ? (
              <p className="notice success">
                {copy.confirmedResult}: {matchResult.score} · {copy.winner} {winnerDisplayName}
              </p>
            ) : null}
          </article>
        ) : null}

        {canViewH2H ? (
          <article className="card">
            <strong>{copy.h2hTitle}</strong>
            <p className="result-players">
              {hostName} vs {singleJoinName}
            </p>
            {h2hTotal === 0 ? <p className="muted">{copy.h2hNoData}</p> : null}
            {h2hTotal > 0 ? (
              <>
                <p className="result-summary">
                  {copy.h2hTotal}: <strong>{hostWins}</strong> - <strong>{opponentWins}</strong> ({h2hTotal})
                </p>
                <p className="result-summary">
                  {copy.h2hRate}: {hostName} {hostWinRate}% / {singleJoinName} {opponentWinRate}%
                </p>
                {h2hTotal >= 2 && h2hStreak > 1 ? (
                  <p className="notice success">
                    {(latestWinner === post.host_id ? hostName : singleJoinName) +
                      (lang === "ko" ? ` ${h2hStreak}연승 🔥` : ` lleva ${h2hStreak} seguidas 🔥`)}
                  </p>
                ) : null}
              </>
            ) : null}
          </article>
        ) : null}
      </section>

      <BottomNav />
    </main>
  );
}
