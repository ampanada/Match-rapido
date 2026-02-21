import BottomNav from "@/components/BottomNav";
import { formatLabel, levelLabel } from "@/lib/constants/filters";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
}

export default async function PostDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { createdAt?: string };
}) {
  const lang = getServerLang();
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
          mine: "내 모집글",
          ask: "WhatsApp 문의",
          loginToAsk: "로그인하고 연락하기",
          noWhatsapp: "WhatsApp 없음",
          close: "모집 마감",
          created: "작성 완료:"
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
          mine: "Mi publicacion",
          ask: "Contactar por WhatsApp",
          loginToAsk: "Inicia sesión para contactar",
          noWhatsapp: "Sin WhatsApp",
          close: "Cerrar convocatoria",
          created: "Publicado:"
        };

  const supabase = createClient();

  const { data: post } = await supabase
    .from("posts")
    .select(
      "id,host_id,start_at,format,level,needed,court_no,note,status,profiles!posts_host_id_fkey(display_name,whatsapp),joins(id,user_id)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!post) {
    notFound();
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const joinsCount = post.joins?.length ?? 0;
  const currentPlayers = joinsCount + 1;
  const recruitCount = Math.max(post.needed - 1, 0);
  const isHost = user?.id === post.host_id;
  const isJoined = post.joins?.some((join) => join.user_id === user?.id) ?? false;
  const isExpired = new Date(post.start_at).getTime() + 30 * 60 * 1000 < Date.now();
  const isCompleted = post.status === "closed" || currentPlayers >= post.needed || isExpired;
  const startHHMM = getCordobaHHMM(post.start_at);
  const slotRange = formatSlotRange(startHHMM);

  async function closePost() {
    "use server";

    const supabase = createClient();
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

  const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
  const hostName = profile?.display_name || (lang === "ko" ? "호스트" : "Host");
  const hostWhatsapp = profile?.whatsapp || "";
  const dateLocale = lang === "ko" ? "ko-KR" : "es-AR";
  const chatLink = hostWhatsapp
    ? waLink(hostWhatsapp, `Hola ${hostName}, consulta por el partido ${formatCordobaDate(post.start_at, "es-AR")} ${slotRange}.`)
    : "";

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
              {isHost ? copy.mine : isJoined ? copy.joined : copy.done}
            </button>
          )}

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
      </section>

      <BottomNav />
    </main>
  );
}
