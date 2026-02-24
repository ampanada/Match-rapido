import BottomNav from "@/components/BottomNav";
import { formatLabel, levelLabel } from "@/lib/constants/filters";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

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
  params: { id: string };
  searchParams?: { createdAt?: string };
}) {
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
          cancelJoin: "참여 신청 철회",
          resultTitle: "1 Set Slam 결과",
          registerResult: "결과 등록",
          resultWaiting: "상대 확인 대기중",
          confirmResult: "결과 확정",
          cancelResult: "결과 취소",
          confirmedResult: "확정 결과",
          scorePlaceholder: "예: 6-2, 7-5, 7-6"
        }
      : {
          title: "Detalle del partido",
          done: "Cerrado",
          open: "Abierto",
          hostRecruit: "Buscando",
          recruitSuffix: " mas (sin contar host)",
          emptyNote: "Sin nota",
          join: "Unirme",
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
          cancelJoin: "Cancelar participacion",
          resultTitle: "Resultado 1 Set Slam",
          registerResult: "Registrar resultado",
          resultWaiting: "Esperando confirmacion",
          confirmResult: "Confirmar resultado",
          cancelResult: "Cancelar resultado",
          confirmedResult: "Resultado confirmado",
          scorePlaceholder: "Ej: 6-2, 7-5, 7-6"
        };

  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id,host_id,start_at,format,level,needed,court_no,note,status,profiles!posts_host_id_fkey(display_name,whatsapp),joins(id,user_id,status,profiles!joins_user_id_fkey(display_name))"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!post) {
    notFound();
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const approvedJoins = post.joins?.filter((join) => join.status === "approved") ?? [];
  const pendingJoins = post.joins?.filter((join) => join.status === "pending") ?? [];
  const currentPlayers = approvedJoins.length + 1;
  const recruitCount = Math.max(post.needed - 1, 0);
  const isHost = user?.id === post.host_id;
  const myJoin = post.joins?.find((join) => join.user_id === user?.id);
  const isJoined = !!myJoin;
  const isPending = myJoin?.status === "pending";
  const isExpired = new Date(post.start_at).getTime() + 30 * 60 * 1000 < Date.now();
  const isCompleted = post.status === "closed" || currentPlayers >= post.needed || isExpired;
  const startHHMM = getCordobaHHMM(post.start_at);
  const slotRange = formatSlotRange(startHHMM);

  const singleOpponentId = approvedJoins[0]?.user_id ?? null;
  const canUseResultFeature = !!user && post.format === "single" && (isHost || user.id === singleOpponentId);
  const playerA = post.host_id;
  const playerB = singleOpponentId;

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

    const { data } = await supabase.from("posts").select("host_id").eq("id", params.id).single();

    if (!data || data.host_id !== user.id) {
      redirect(`/post/${params.id}`);
    }

    await supabase.from("posts").update({ status: "closed" }).eq("id", params.id);
    redirect(`/post/${params.id}`);
  }

  async function approveJoin(formData: FormData) {
    "use server";

    const joinId = String(formData.get("join_id") || "");
    if (!joinId) {
      redirect(`/post/${params.id}`);
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: postData } = await supabase.from("posts").select("id,host_id").eq("id", params.id).maybeSingle();
    if (!postData || postData.host_id !== user.id) {
      redirect(`/post/${params.id}`);
    }

    const { data: postWithJoins } = await supabase
      .from("posts")
      .select("needed,joins(id,status)")
      .eq("id", params.id)
      .maybeSingle();

    const approvedCount = postWithJoins?.joins?.filter((join) => join.status === "approved").length ?? 0;
    const players = approvedCount + 1;

    if (players >= (postWithJoins?.needed ?? 0)) {
      redirect(`/post/${params.id}`);
    }

    await supabase.from("joins").update({ status: "approved" }).eq("id", joinId).eq("post_id", params.id);
    redirect(`/post/${params.id}`);
  }

  async function createResult(formData: FormData) {
    "use server";

    const winnerId = String(formData.get("winner_id") || "");
    const score = String(formData.get("score") || "").trim();

    if (!winnerId || !isValidResultScore(score)) {
      redirect(`/post/${params.id}`);
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
      .select("id,host_id,format,status,joins(user_id,status)")
      .eq("id", params.id)
      .maybeSingle();

    if (!latestPost || latestPost.format !== "single") {
      redirect(`/post/${params.id}`);
    }

    const approved = latestPost.joins?.filter((join) => join.status === "approved") ?? [];
    if (approved.length !== 1) {
      redirect(`/post/${params.id}`);
    }

    const bId = approved[0].user_id;
    const participants = [latestPost.host_id, bId];
    if (!participants.includes(user.id) || !participants.includes(winnerId)) {
      redirect(`/post/${params.id}`);
    }

    const { data: existing } = await supabase.from("match_results").select("id").eq("post_id", params.id).maybeSingle();
    if (existing) {
      redirect(`/post/${params.id}`);
    }

    await supabase.from("match_results").insert({
      post_id: params.id,
      player_a: latestPost.host_id,
      player_b: bId,
      winner_id: winnerId,
      score,
      status: "pending",
      submitted_by: user.id
    });

    redirect(`/post/${params.id}`);
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

    await supabase
      .from("match_results")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("post_id", params.id)
      .eq("status", "pending");

    redirect(`/post/${params.id}`);
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

    await supabase.from("match_results").update({ status: "cancelled" }).eq("post_id", params.id).eq("status", "pending");
    redirect(`/post/${params.id}`);
  }

  const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const hostName = profile?.display_name || (lang === "ko" ? "호스트" : "Host");
  const hostWhatsapp = profile?.whatsapp || "";
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

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
        <p>
          {formatCordobaDate(post.start_at, dateLocale)} · {slotRange}
        </p>
      </header>

      {searchParams?.createdAt ? (
        <p className="notice success">
          {copy.created} {new Date(searchParams.createdAt).toLocaleString(dateLocale)}
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
          <span className="badge">{levelLabel(post.level, lang)}</span>
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
              <button className="button" type="submit">
                {copy.join}
              </button>
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
              <button className="button" type="submit">
                {copy.cancelJoin}
              </button>
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
            <button className="button" type="submit">
              {copy.close}
            </button>
          </form>
        ) : null}

        {isHost && pendingJoins.length > 0 ? (
          <article className="card">
            <strong>{copy.pendingRequests}</strong>
            {pendingJoins.map((join) => {
              const joinProfile = Array.isArray(join.profiles) ? join.profiles[0] : join.profiles;
              const joinName = joinProfile?.display_name || (lang === "ko" ? "참여자" : "Jugador");

              return (
                <form key={join.id} className="row" action={approveJoin}>
                  <span className="muted">{joinName}</span>
                  <input type="hidden" name="join_id" value={join.id} />
                  <button className="button" type="submit">
                    {copy.approve}
                  </button>
                </form>
              );
            })}
          </article>
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
                <input className="input" name="score" placeholder={copy.scorePlaceholder} required />
                <button className="button" type="submit">
                  {copy.registerResult}
                </button>
              </form>
            ) : null}

            {matchResult?.status === "pending" ? (
              <div className="section">
                <p className="muted">
                  {matchResult.score} · {isResultSubmitter ? copy.resultWaiting : copy.confirmResult}
                </p>

                {canConfirmResult ? (
                  <form action={confirmResult}>
                    <button className="button" type="submit">
                      {copy.confirmResult}
                    </button>
                  </form>
                ) : null}

                {canCancelResult ? (
                  <form action={cancelResult}>
                    <button className="link-btn" type="submit">
                      {copy.cancelResult}
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}

            {matchResult?.status === "confirmed" ? (
              <p className="notice success">
                {copy.confirmedResult}: {matchResult.score}
              </p>
            ) : null}
          </article>
        ) : null}
      </section>

      <BottomNav />
    </main>
  );
}
