import BottomNav from "@/components/BottomNav";
import SubmitButton from "@/components/SubmitButton";
import { formatLabel } from "@/lib/constants/filters";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
}

function isValidResultScore(score: string) {
  return /^(6-[0-4]|7-[5-6])$/.test(score);
}

export default async function PostDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ createdAt?: string; record?: string }>;
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
          joining: "참여 처리 중...",
          joined: "참여완료",
          pending: "승인 대기",
          mine: "내 모집글",
          ask: "WhatsApp 문의",
          loginToAsk: "로그인하고 연락하기",
          noWhatsapp: "WhatsApp 없음",
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
          closing: "마감 중..."
        }
      : {
          title: "Detalle del partido",
          done: "Cerrado",
          open: "Abierto",
          hostRecruit: "Buscando",
          recruitSuffix: " mas (sin contar host)",
          emptyNote: "Sin nota",
          join: "Unirme",
          joining: "Uniendo...",
          joined: "Ya participo",
          pending: "Pendiente",
          mine: "Mi publicacion",
          ask: "Contactar por WhatsApp",
          loginToAsk: "Inicia sesión para contactar",
          noWhatsapp: "Sin WhatsApp",
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
          closing: "Cerrando..."
        };

  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("id,host_id,start_at,format,level,needed,court_no,note,status")
    .eq("id", id)
    .maybeSingle();

  if (!post) {
    redirect(`/post?error=not_found&id=${encodeURIComponent(id)}`);
  }

  const [{ data: hostProfile }, { data: joins }] = await Promise.all([
    supabase.from("profiles").select("display_name,whatsapp").eq("id", post.host_id).maybeSingle(),
    supabase
      .from("joins")
      .select("id,user_id,status,profiles!joins_user_id_fkey(display_name)")
      .eq("post_id", post.id)
  ]);

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const approvedJoins = joins?.filter((join: any) => join.status === "approved") ?? [];
  const pendingJoins = joins?.filter((join: any) => join.status === "pending") ?? [];
  const currentPlayers = approvedJoins.length + 1;
  const recruitCount = Math.max(post.needed - 1, 0);
  const isHost = user?.id === post.host_id;
  const myJoin = joins?.find((join: any) => join.user_id === user?.id);
  const isJoined = !!myJoin;
  const isPending = myJoin?.status === "pending";
  const isExpired = new Date(post.start_at).getTime() + 30 * 60 * 1000 < Date.now();
  const hasStarted = new Date(post.start_at).getTime() <= Date.now();
  const isCompleted = post.status === "closed" || currentPlayers >= post.needed || isExpired;
  const startHHMM = getCordobaHHMM(post.start_at);
  const slotRange = formatSlotRange(startHHMM);

  const singleOpponentId = approvedJoins[0]?.user_id ?? null;
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

    const approved = latestPost.joins?.filter((join: any) => join.status === "approved") ?? [];
    if (approved.length !== 1) {
      redirect(`/post/${id}`);
    }

    const bId = approved[0].user_id;
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

  const singleJoinProfile = approvedJoins[0]
    ? Array.isArray(approvedJoins[0].profiles)
      ? approvedJoins[0].profiles[0]
      : approvedJoins[0].profiles
    : null;
  const singleJoinName = singleJoinProfile?.display_name || (lang === "ko" ? "참여자" : "Jugador");
  const canConfirmResult =
    !!matchResult &&
    matchResult.status === "pending" &&
    !!user &&
    user.id !== matchResult.submitted_by &&
    [matchResult.player_a, matchResult.player_b].includes(user.id);
  const isResultSubmitter = !!matchResult && !!user && user.id === matchResult.submitted_by;
  const canCancelResult =
    !!matchResult && matchResult.status === "pending" && !!user && (user.id === matchResult.player_a || user.id === matchResult.player_b);
  const winnerDisplayName = matchResult
    ? matchResult.winner_id === post.host_id
      ? hostName
      : singleJoinName
    : "";

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
        <p>
          {formatCordobaDate(post.start_at, dateLocale)} · {slotRange}
        </p>
      </header>

      {qs.createdAt ? (
        <p className="notice success">
          {copy.created} {new Date(qs.createdAt).toLocaleString(dateLocale)}
        </p>
      ) : null}

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
          {!isCompleted && !isJoined && !isHost ? (
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

          {isJoined && !isHost && post.status === "open" && !isExpired ? (
            <form method="post" action="/join/cancel">
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="redirect_to" value={`/post/${post.id}`} />
              <SubmitButton idleLabel={copy.cancelJoin} pendingLabel={copy.cancellingJoin} />
            </form>
          ) : null}

          {!user ? (
            <a className="link-btn" href="/login">
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

        {isHost && !isCompleted ? (
          <form action={closePost}>
            <SubmitButton idleLabel={copy.close} pendingLabel={copy.closing} />
          </form>
        ) : null}

        {isHost && pendingJoins.length > 0 ? (
          <article className="card">
            <strong>{copy.pendingRequests}</strong>
            {pendingJoins.map((join: any) => {
              const joinProfile = Array.isArray(join.profiles) ? join.profiles[0] : join.profiles;
              const joinName = joinProfile?.display_name || (lang === "ko" ? "참여자" : "Jugador");

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
