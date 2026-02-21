import BottomNav from "@/components/BottomNav";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const COUNTRY_CODES = ["+54", "+82", "+1", "+34", "+55", "+81"] as const;

function splitWhatsapp(whatsapp: string | null | undefined) {
  const raw = (whatsapp ?? "").replace(/\s+/g, "");
  if (!raw) {
    return { countryCode: "+54", number: "" };
  }

  const matchedCode = COUNTRY_CODES.find((code) => raw.startsWith(code));
  if (matchedCode) {
    return { countryCode: matchedCode, number: raw.slice(matchedCode.length) };
  }

  return { countryCode: "+54", number: raw.replace(/^\+/, "") };
}

export default async function MyPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  const lang = getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "내 정보",
          invalidWa: "WhatsApp 번호 형식이 올바르지 않습니다. 예: +5491122334455",
          logout: "로그아웃",
          profile: "프로필 / WhatsApp 연동",
          profileGuide: "아르헨티나(+54)가 기본입니다. 필요하면 국가번호를 바꿔서 저장하세요.",
          displayName: "표시 이름",
          step1: "1) 국가번호 선택",
          step2: "2) WhatsApp 번호 입력",
          saveFormat: "저장 형식 예시: +5491122334455",
          save: "저장",
          myPosts: "내가 올린 매치",
          noPost: "작성한 글이 없습니다.",
          hostClosed: "호스트마감",
          expired: "시간종료",
          open: "모집중",
          detail: "상세 보기",
          myJoins: "내 참여 기록",
          noJoin: "참여한 매치가 없습니다.",
          ongoing: "진행중"
        }
      : {
          title: "Mi cuenta",
          invalidWa: "Formato invalido. Ejemplo: +5491122334455",
          logout: "Cerrar sesion",
          profile: "Perfil / WhatsApp",
          profileGuide: "El prefijo por defecto es Argentina (+54). Puedes cambiarlo.",
          displayName: "Nombre visible",
          step1: "1) Selecciona prefijo",
          step2: "2) Ingresa numero de WhatsApp",
          saveFormat: "Formato final: +5491122334455",
          save: "Guardar",
          myPosts: "Mis publicaciones",
          noPost: "No tienes publicaciones.",
          hostClosed: "Cerrado por host",
          expired: "Fuera de horario",
          open: "Abierto",
          detail: "Ver detalle",
          myJoins: "Mis participaciones",
          noJoin: "No participaste en ningun partido.",
          ongoing: "En curso"
        };
  const dateLocale = lang === "ko" ? "ko-KR" : "es-AR";

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?reason=auth_required");
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("display_name,whatsapp")
    .eq("id", user.id)
    .maybeSingle();
  const split = splitWhatsapp(myProfile?.whatsapp);

  const [{ data: myPosts }, { data: myJoins }] = await Promise.all([
    supabase
      .from("posts")
      .select("id,start_at,status,court_no,note")
      .eq("host_id", user.id)
      .order("start_at", { ascending: true })
      .limit(20),
    supabase
      .from("joins")
      .select("id,post_id,created_at,posts!joins_post_id_fkey(id,start_at,note,status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
  ]);

  async function signOut() {
    "use server";
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  async function saveProfile(formData: FormData) {
    "use server";

    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const displayName = String(formData.get("display_name") || "").trim();
    const countryCode = String(formData.get("country_code") || "+54").trim();
    const localNumberRaw = String(formData.get("whatsapp_number") || "").trim();
    const localNumber = localNumberRaw.replace(/[^\d]/g, "");
    const whatsapp = localNumber ? `${countryCode}${localNumber}` : "";

    if (whatsapp && !/^\+\d{8,15}$/.test(whatsapp)) {
      redirect("/my?error=invalid_whatsapp");
    }

    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        display_name: displayName || null,
        whatsapp: whatsapp || null
      },
      { onConflict: "id" }
    );

    redirect("/my");
  }

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
        <p>{user.email}</p>
      </header>

      <section className="section">
        {searchParams?.error === "invalid_whatsapp" ? (
          <p className="notice">{copy.invalidWa}</p>
        ) : null}

        <form action={signOut}>
          <button className="button" type="submit">
            {copy.logout}
          </button>
        </form>

        <article className="card">
          <strong>{copy.profile}</strong>
          <p className="muted">{copy.profileGuide}</p>
          <form className="section" action={saveProfile}>
            <input
              className="input"
              name="display_name"
              placeholder={copy.displayName}
              defaultValue={myProfile?.display_name ?? ""}
            />
            <label className="muted">{copy.step1}</label>
            <select className="select" name="country_code" defaultValue={split.countryCode}>
              <option value="+54">Argentina (+54)</option>
              <option value="+82">Korea (+82)</option>
              <option value="+1">US/CA (+1)</option>
              <option value="+34">Spain (+34)</option>
              <option value="+55">Brazil (+55)</option>
              <option value="+81">Japan (+81)</option>
            </select>
            <label className="muted">{copy.step2}</label>
            <input className="input" name="whatsapp_number" placeholder="91122334455" inputMode="tel" defaultValue={split.number} />
            <p className="muted">{copy.saveFormat}</p>
            <button className="button" type="submit">
              {copy.save}
            </button>
          </form>
        </article>

        <article className="card">
          <strong>{copy.myPosts}</strong>
          {(myPosts ?? []).length === 0 ? <p className="muted">{copy.noPost}</p> : null}
          {(myPosts ?? []).map((post) => {
            const startHHMM = getCordobaHHMM(post.start_at);
            const isExpired = new Date(post.start_at).getTime() + 30 * 60 * 1000 < Date.now();
            const label = post.status === "closed" ? copy.hostClosed : isExpired ? copy.expired : copy.open;

            return (
              <article key={post.id} className="card">
                <div className="row">
                  <span className="muted">
                    {formatCordobaDate(post.start_at, dateLocale)} · {formatSlotRange(startHHMM)}
                    {post.court_no ? ` · ${lang === "ko" ? `${post.court_no}번코트` : `Cancha ${post.court_no}`}` : ""}
                  </span>
                  <span className={`status-chip ${label === "모집중" ? "open" : "done"}`}>{label}</span>
                </div>
                <Link className="link-btn" href={`/post/${post.id}`}>
                  {copy.detail}
                </Link>
              </article>
            );
          })}
        </article>

        <article className="card">
          <strong>{copy.myJoins}</strong>
          {(myJoins ?? []).length === 0 ? <p className="muted">{copy.noJoin}</p> : null}
          {(myJoins ?? []).map((join) => {
            const relatedPost = Array.isArray(join.posts) ? join.posts[0] : join.posts;
            const when = relatedPost?.start_at ?? join.created_at;
            const isExpired =
              relatedPost?.start_at ? new Date(relatedPost.start_at).getTime() + 30 * 60 * 1000 < Date.now() : false;
            const isClosed = relatedPost?.status === "closed";
            const label = isClosed ? copy.hostClosed : isExpired ? copy.expired : copy.ongoing;
            const slot = relatedPost?.start_at ? formatSlotRange(getCordobaHHMM(relatedPost.start_at)) : "";

            return (
              <article key={join.id} className="card">
                <div className="row">
                  <span className="muted">
                    {formatCordobaDate(when, dateLocale)} {slot ? `· ${slot}` : ""}
                  </span>
                  <span className={`status-chip ${label === "진행중" ? "open" : "done"}`}>{label}</span>
                </div>
                <Link className="link-btn" href={`/post/${join.post_id}`}>
                  {copy.detail}
                </Link>
              </article>
            );
          })}
        </article>
      </section>

      <BottomNav />
    </main>
  );
}
