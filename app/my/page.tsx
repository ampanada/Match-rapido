import BottomNav from "@/components/BottomNav";
import LocalizedFileInput from "@/components/LocalizedFileInput";
import LogoutConfirmButton from "@/components/LogoutConfirmButton";
import ProfileAvatar from "@/components/ProfileAvatar";
import SubmitButton from "@/components/SubmitButton";
import { getServerLang } from "@/lib/i18n-server";
import { formatCordobaDate, formatSlotRange, getCordobaDateString, getCordobaHHMM, getCordobaWeekday } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { revalidatePath } from "next/cache";
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

function normalizeWhatsapp(countryCode: string, rawInput: string) {
  const compact = rawInput.replace(/\s+/g, "").replace(/-/g, "");
  if (!compact) {
    return "";
  }

  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/[^\d]/g, "")}`;
  }

  return `${countryCode}${compact.replace(/[^\d]/g, "")}`;
}

function upcomingPrioritySort<T extends { status?: string | null; start_at?: string }>(a: T, b: T) {
  const aClosed = a.status === "closed";
  const bClosed = b.status === "closed";
  if (aClosed !== bClosed) {
    return aClosed ? 1 : -1;
  }
  const aTime = new Date(a.start_at ?? 0).getTime();
  const bTime = new Date(b.start_at ?? 0).getTime();
  return aTime - bTime;
}

export default async function MyPage({
  searchParams
}: {
  searchParams?: { error?: string; view?: string; saved?: string; debug?: string };
}) {
  noStore();
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "내 정보",
          defaultName: "WhatsApp 사용자",
          account: "계정",
          invalidWa: "WhatsApp 번호 형식이 올바르지 않습니다. 예: +5491122334455",
          saveFailed: "이름/번호 저장에 실패했습니다. 다시 시도해 주세요.",
          saveVerifyFailed: "저장 후 확인에 실패했습니다. 다시 저장해 주세요.",
          saveDone: "저장되었습니다.",
          savedWhatsappLabel: "현재 저장된 WhatsApp",
          invalidAvatar: "이미지 파일만 업로드할 수 있습니다. (jpg, png, webp)",
          avatarTooLarge: "이미지 용량이 너무 큽니다. 최대 5MB",
          uploadFailed: "프로필 사진 업로드에 실패했습니다.",
          profile: "프로필 / WhatsApp 연동",
          profileGuide: "아르헨티나(+54)가 기본입니다. 필요하면 국가번호를 바꿔서 저장하세요.",
          displayName: "WhatsApp 이름(표시 이름)",
          avatar: "프로필 사진",
          avatarGuide: "이미지 업로드 시 결과/프로필 화면에 표시됩니다. (jpg, png, webp)",
          step1: "1) 국가번호 선택",
          step2: "2) WhatsApp 번호 입력",
          saveFormat: "저장 형식 예시: +5491122334455",
          save: "저장",
          editProfile: "수정하기",
          savePending: "저장 중...",
          myPosts: "내가 올린 매치",
          resultTab: "결과 등록",
          matchesTab: "내 매치",
          noResultTarget: "결과 등록 가능한 지난 단식 매치가 없습니다.",
          registerResult: "결과 등록",
          pendingResult: "결과확정 대기",
          confirmedResult: "결과 확정",
          closeReason: "마감사유",
          closeManual: "호스트 임의마감",
          closeAuto: "시간 자동종료",
          closeFull: "정원 마감",
          opponent: "상대",
          noPost: "작성한 글이 없습니다.",
          upcoming: "예정 매치",
          past: "지난 매치",
          hostClosed: "호스트마감",
          expired: "시간종료",
          open: "모집중",
          detail: "상세 보기",
          edit: "수정",
          myJoins: "내 참여 기록",
          noJoin: "참여한 매치가 없습니다.",
          ongoing: "진행중",
          players: "참여",
          morePast: "추가 지난 기록"
        }
      : {
          title: "Mi cuenta",
          defaultName: "Usuario WhatsApp",
          account: "Cuenta",
          invalidWa: "Formato invalido. Ejemplo: +5491122334455",
          saveFailed: "No se pudo guardar nombre/numero. Intenta de nuevo.",
          saveVerifyFailed: "No se pudo verificar el guardado. Intenta nuevamente.",
          saveDone: "Guardado correctamente.",
          savedWhatsappLabel: "WhatsApp guardado actualmente",
          invalidAvatar: "Solo se permiten imagenes (jpg/png/webp).",
          avatarTooLarge: "La imagen es demasiado grande. Maximo 5MB.",
          uploadFailed: "No se pudo subir la foto de perfil.",
          profile: "Perfil / WhatsApp",
          profileGuide: "El prefijo por defecto es Argentina (+54). Puedes cambiarlo.",
          displayName: "Nombre de WhatsApp (visible)",
          avatar: "Foto de perfil",
          avatarGuide: "Se muestra en resultados/perfil. (jpg, png, webp)",
          step1: "1) Selecciona prefijo",
          step2: "2) Ingresa numero de WhatsApp",
          saveFormat: "Formato final: +5491122334455",
          save: "Guardar",
          editProfile: "Editar",
          savePending: "Guardando...",
          myPosts: "Mis publicaciones",
          resultTab: "Cargar resultado",
          matchesTab: "Mis partidos",
          noResultTarget: "No hay partidos individuales pasados para cargar resultado.",
          registerResult: "Registrar resultado",
          pendingResult: "Resultado pendiente",
          confirmedResult: "Resultado confirmado",
          closeReason: "Cierre",
          closeManual: "Cierre manual del host",
          closeAuto: "Cierre automatico por tiempo",
          closeFull: "Cupo completo",
          opponent: "Rival",
          noPost: "No tienes publicaciones.",
          upcoming: "Proximos",
          past: "Pasados",
          hostClosed: "Cerrado por host",
          expired: "Fuera de horario",
          open: "Abierto",
          detail: "Ver detalle",
          edit: "Editar",
          myJoins: "Mis participaciones",
          noJoin: "No participaste en ningun partido.",
          ongoing: "En curso",
          players: "Jugadores",
          morePast: "Registros pasados adicionales"
        };

  const dateLocale = lang === "ko" ? "ko-KR" : "es-AR";
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?reason=auth_required");
  }

  let { data: myProfile } = await supabase
    .from("profiles")
    .select("display_name,whatsapp,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const metadataName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  if ((!myProfile || !myProfile.display_name) && metadataName && user.email) {
    const { error: ensureProfileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        display_name: metadataName
      },
      { onConflict: "id" }
    );
    if (!ensureProfileError) {
      myProfile = {
        display_name: metadataName,
        whatsapp: myProfile?.whatsapp ?? null,
        avatar_url: myProfile?.avatar_url ?? null
      };
    }
  }

  const effectiveDisplayName = myProfile?.display_name || metadataName || null;
  const split = splitWhatsapp(myProfile?.whatsapp);
  const profileName = effectiveDisplayName || copy.defaultName;

  const [{ data: myPosts }, { data: myJoins }] = await Promise.all([
    supabase
      .from("posts")
      .select("id,start_at,status,format,court_no,note,needed,joins(user_id,status,profiles!joins_user_id_fkey(display_name))")
      .eq("host_id", user.id)
      .order("start_at", { ascending: true })
      .limit(50),
    supabase
      .from("joins")
      .select(
        "id,post_id,created_at,status,posts!joins_post_id_fkey(id,start_at,note,status,court_no,needed,host_id,profiles!posts_host_id_fkey(display_name),joins(status,user_id,profiles!joins_user_id_fkey(display_name)))"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  const hostPostIds = (myPosts ?? []).map((post) => post.id);
  const { data: hostResults } =
    hostPostIds.length > 0
      ? await supabase.from("match_results").select("post_id,status,score").in("post_id", hostPostIds)
      : { data: [] as any[] };
  const resultByPostId = new Map((hostResults ?? []).map((item) => [item.post_id, item]));

  const now = Date.now();

  const hostMatches = (myPosts ?? []).map((post) => {
    const approvedJoins = post.joins?.filter((join: any) => join.status === "approved") ?? [];
    const approved = approvedJoins.length;
    const players = approved + 1;
    const isExpired = new Date(post.start_at).getTime() + 30 * 60 * 1000 < now;
    const label = post.status === "closed" ? copy.hostClosed : isExpired ? copy.expired : copy.open;
    const isPast = new Date(post.start_at).getTime() < now;
    const firstApproved = approvedJoins[0];
    const joinProfile = firstApproved
      ? Array.isArray(firstApproved.profiles)
        ? firstApproved.profiles[0]
        : firstApproved.profiles
      : null;
    const opponentName = joinProfile?.display_name || "-";
    const closeReason =
      post.status === "closed"
        ? copy.closeManual
        : players >= post.needed
          ? copy.closeFull
          : isExpired
            ? copy.closeAuto
            : "-";
    const result = resultByPostId.get(post.id);
    const isEditable = post.status === "open" && !isPast && !isExpired;

    return {
      ...post,
      players,
      label,
      isPast,
      isExpired,
      isEditable,
      opponentName,
      closeReason,
      resultStatus: result?.status ?? null,
      resultScore: result?.score ?? null
    };
  });

  const upcomingHost = hostMatches
    .filter((post) => !post.isPast)
    .sort(upcomingPrioritySort);
  const pastHost = hostMatches.filter((post) => post.isPast);

  const joinMatches = (myJoins ?? []).map((join) => {
    const relatedPost = Array.isArray(join.posts) ? join.posts[0] : join.posts;
    const when = relatedPost?.start_at ?? join.created_at;
    const approved = relatedPost?.joins?.filter((item) => item.status === "approved").length ?? 0;
    const players = approved + 1;
    const isPast = new Date(when).getTime() < now;
    const isExpired = relatedPost?.start_at ? new Date(relatedPost.start_at).getTime() + 30 * 60 * 1000 < now : false;
    const isClosed = relatedPost?.status === "closed";
    const label = isClosed ? copy.hostClosed : isExpired ? copy.expired : copy.ongoing;
    return { ...join, relatedPost, when, players, label, isPast };
  });

  const upcomingJoin = joinMatches
    .filter((join) => !join.isPast)
    .sort(upcomingPrioritySort);
  const pastJoin = joinMatches.filter((join) => join.isPast);
  const pastHostPreview = pastHost.slice(0, 20);
  const pastJoinPreview = pastJoin.slice(0, 20);

  const pastHostGrouped = pastHostPreview.reduce<Record<string, typeof pastHostPreview>>((acc, post) => {
    const key = getCordobaDateString(new Date(post.start_at));
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(post);
    return acc;
  }, {});

  const pastJoinGrouped = pastJoinPreview.reduce<Record<string, typeof pastJoinPreview>>((acc, join) => {
    const key = getCordobaDateString(new Date(join.when));
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(join);
    return acc;
  }, {});

  const resultTargets = pastHost.filter(
    (post) => post.format === "single" && post.players >= 2 && post.resultStatus !== "confirmed"
  );

  const upcomingCombined = [
    ...upcomingHost.map((post) => ({
      id: post.id,
      start_at: post.start_at,
      status: post.status,
      href: `/post/${post.id}`,
      role: lang === "ko" ? "호스트" : "Host",
      court_no: post.court_no
    })),
    ...upcomingJoin.map((join) => ({
      id: join.post_id,
      start_at: join.when,
      status: join.relatedPost?.status ?? null,
      href: `/post/${join.post_id}`,
      role: lang === "ko" ? "참여" : "Join",
      court_no: join.relatedPost?.court_no ?? null
    }))
  ].sort(upcomingPrioritySort);

  const view = searchParams?.view === "result" ? "result" : "matches";

  function debugErrorCode(stage: string, extra?: string) {
    return encodeURIComponent(extra ? `${stage}:${extra}` : stage);
  }

  async function saveProfile(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("display_name,avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const displayName = String(formData.get("display_name") || "").trim();
    const countryCode = String(formData.get("country_code") || "+54").trim();
    const localNumberRaw = String(formData.get("whatsapp_number") || "").trim();
    const whatsapp = normalizeWhatsapp(countryCode, localNumberRaw);
    const avatarFile = formData.get("avatar_file");

    if (whatsapp && !/^\+\d{8,15}$/.test(whatsapp)) {
      redirect("/my?error=invalid_whatsapp");
    }

    let avatarUrl: string | null = currentProfile?.avatar_url ?? null;
    if (avatarFile instanceof File && avatarFile.size > 0) {
      if (!avatarFile.type.startsWith("image/")) {
        redirect("/my?error=invalid_avatar");
      }
      if (avatarFile.size > 5 * 1024 * 1024) {
        redirect("/my?error=avatar_too_large");
      }

      const ext = avatarFile.name.includes(".") ? avatarFile.name.split(".").pop()!.toLowerCase() : "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const filePath = `${user.id}/${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, avatarFile, {
        upsert: true,
        contentType: avatarFile.type
      });

      if (uploadError) {
        console.error("[my/saveProfile] upload_failed", uploadError);
        redirect(`/my?error=upload_failed&debug=${debugErrorCode("upload_failed", uploadError.message)}`);
      }

      const publicUrlData = supabase.storage.from("avatars").getPublicUrl(filePath);
      avatarUrl = publicUrlData.data.publicUrl;
    }

    if (!user.email) {
      redirect(`/my?error=save_failed&debug=${debugErrorCode("missing_email")}`);
    }

    const profilePayload = {
      display_name: displayName || currentProfile?.display_name || null,
      whatsapp: whatsapp || null,
      avatar_url: avatarUrl
    };

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[my/saveProfile] update_error", updateError);
      redirect(`/my?error=save_failed&debug=${debugErrorCode("update_error", updateError.message)}`);
    }

    if (!updated) {
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        ...profilePayload
      });

      if (insertError) {
        console.error("[my/saveProfile] insert_error", insertError);
        redirect(`/my?error=save_failed&debug=${debugErrorCode("insert_error", insertError.message)}`);
      }
    }

    const { data: verifyProfile, error: verifyError } = await supabase
      .from("profiles")
      .select("id,display_name,whatsapp")
      .eq("id", user.id)
      .maybeSingle();

    if (verifyError || !verifyProfile) {
      console.error("[my/saveProfile] verify_read_error", verifyError);
      redirect(`/my?error=save_verify_failed&debug=${debugErrorCode("verify_read_error", verifyError?.message)}`);
    }

    const expectedName = profilePayload.display_name ?? null;
    const expectedWhatsapp = profilePayload.whatsapp ?? null;
    const actualName = verifyProfile.display_name ?? null;
    const actualWhatsapp = verifyProfile.whatsapp ?? null;

    if (expectedName !== actualName || expectedWhatsapp !== actualWhatsapp) {
      const mismatch = `expected(${expectedName ?? "null"},${expectedWhatsapp ?? "null"})_actual(${actualName ?? "null"},${actualWhatsapp ?? "null"})`;
      console.error("[my/saveProfile] verify_mismatch", mismatch);
      redirect(`/my?error=save_verify_failed&debug=${debugErrorCode("verify_mismatch", mismatch)}`);
    }

    revalidatePath("/my");
    revalidatePath("/");
    redirect("/my?saved=1");
  }

  return (
    <main className="shell">
      <header className="card my-hero">
        <div className="my-hero-row">
          <ProfileAvatar name={profileName} avatarUrl={myProfile?.avatar_url} size="lg" />
          <div>
            <h1>{profileName || copy.title}</h1>
          </div>
        </div>
      </header>

      <section className="section">
        {searchParams?.error === "invalid_whatsapp" ? <p className="notice">{copy.invalidWa}</p> : null}
        {searchParams?.error === "save_failed" ? <p className="notice">{copy.saveFailed}</p> : null}
        {searchParams?.error === "save_verify_failed" ? <p className="notice">{copy.saveVerifyFailed}</p> : null}
        {searchParams?.error === "invalid_avatar" ? <p className="notice">{copy.invalidAvatar}</p> : null}
        {searchParams?.error === "avatar_too_large" ? <p className="notice">{copy.avatarTooLarge}</p> : null}
        {searchParams?.error === "upload_failed" ? <p className="notice">{copy.uploadFailed}</p> : null}
        {searchParams?.saved === "1" ? <p className="notice success">{copy.saveDone}</p> : null}
        {searchParams?.debug ? <p className="muted">debug: {searchParams.debug}</p> : null}

        {view === "matches" && upcomingCombined.length > 0 ? (
          <article className="card">
            <strong>{copy.upcoming}</strong>
            {upcomingCombined.map((item) => {
              const itemStart = item.start_at ?? "";
              const startHHMM = getCordobaHHMM(itemStart);
              return (
                <article key={`upcoming-combined-${item.role}-${item.id}`} className="card">
                  <p className="compact-line">
                    {formatCordobaDate(itemStart, dateLocale)} | {formatSlotRange(startHHMM)} |{" "}
                    {item.court_no ? (lang === "ko" ? `${item.court_no}번코트` : `Cancha ${item.court_no}`) : "-"} | {item.role}
                  </p>
                  <Link className="link-btn" href={item.href}>
                    {copy.detail}
                  </Link>
                </article>
              );
            })}
          </article>
        ) : null}

        <article className="card">
          <strong>{copy.account}</strong>
          <strong>{copy.profile}</strong>
          <p className="muted">{copy.profileGuide}</p>
          <form className="section" action={saveProfile} encType="multipart/form-data">
            <input className="input" name="display_name" placeholder={copy.displayName} defaultValue={effectiveDisplayName ?? ""} />
            <label className="muted">{copy.avatar}</label>
            <LocalizedFileInput lang={lang} name="avatar_file" accept="image/png,image/jpeg,image/webp" />
            <p className="muted">{copy.avatarGuide}</p>
            <div className="field-row">
              <div>
                <label className="muted">{copy.step1}</label>
                <select className="select" name="country_code" defaultValue={split.countryCode}>
                  <option value="+54">Argentina (+54)</option>
                  <option value="+82">Korea (+82)</option>
                  <option value="+1">US/CA (+1)</option>
                  <option value="+34">Spain (+34)</option>
                  <option value="+55">Brazil (+55)</option>
                  <option value="+81">Japan (+81)</option>
                </select>
              </div>
              <div>
                <label className="muted">{copy.step2}</label>
                <input className="input" name="whatsapp_number" placeholder="91122334455" inputMode="tel" defaultValue={split.number} />
              </div>
            </div>
            <p className="muted">{copy.saveFormat}</p>
            <p className="muted">
              {copy.savedWhatsappLabel}: {myProfile?.whatsapp || "-"}
            </p>
            <SubmitButton
              idleLabel={myProfile?.whatsapp ? copy.editProfile : copy.save}
              pendingLabel={copy.savePending}
              className="button button-outline"
            />
          </form>
        </article>

        <article className="card">
          <div className="seg-tabs">
            <Link className={`seg-tab${view === "matches" ? " active" : ""}`} href="/my?view=matches">
              {copy.matchesTab}
            </Link>
            <Link className={`seg-tab${view === "result" ? " active" : ""}`} href="/my?view=result">
              {copy.resultTab}
            </Link>
          </div>
        </article>

        {view === "matches" ? (
          <article className="card">
            <strong>{copy.myPosts}</strong>
            {(myPosts ?? []).length === 0 ? <p className="muted">{copy.noPost}</p> : null}

            {upcomingHost.length > 0 ? <h3 className="subhead">{copy.upcoming}</h3> : null}
            {upcomingHost.map((post) => {
              const startHHMM = getCordobaHHMM(post.start_at);
              return (
                <article key={post.id} className="card">
                  <div className="row">
                    <span className="muted">
                      {formatCordobaDate(post.start_at, dateLocale)} · {formatSlotRange(startHHMM)}
                      {post.court_no ? ` · ${lang === "ko" ? `${post.court_no}번코트` : `Cancha ${post.court_no}`}` : ""}
                    </span>
                    <span className={`status-chip ${post.label === copy.open ? "open" : "done"}`}>{post.label}</span>
                  </div>
                  <p className="muted">
                    {copy.players}: {post.players}/{post.needed}
                  </p>
                  {post.status === "closed" ? <p className="muted">{copy.closeReason}: {copy.closeManual}</p> : null}
                  <div className="actions">
                    <Link className="link-btn" href={`/post/${post.id}`}>
                      {copy.detail}
                    </Link>
                    {post.isEditable ? (
                      <Link className="link-btn" href={`/post/${post.id}/edit`}>
                        {copy.edit}
                      </Link>
                    ) : (
                      <button className="link-btn" type="button" disabled>
                        {copy.edit}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}

            {pastHost.length > 0 ? <h3 className="subhead">{copy.past}</h3> : null}
            {Object.entries(pastHostGrouped).map(([dateKey, posts]) => (
              <div key={`past-host-group-${dateKey}`} className="section">
                <p className="date-partition">
                  {lang === "ko"
                    ? `${Number(dateKey.split("-")[2])}일 ${getCordobaWeekday(dateKey, "ko-KR")}`
                    : `${Number(dateKey.split("-")[2])} ${getCordobaWeekday(dateKey, "es-AR")}`}
                </p>
                {posts.map((post) => {
                  const startHHMM = getCordobaHHMM(post.start_at);
                  return (
                    <article className="card" key={`past-host-${post.id}`}>
                      <p className="compact-line">
                        {formatCordobaDate(post.start_at, dateLocale)} | {formatSlotRange(startHHMM)} |{" "}
                        {post.court_no ? (lang === "ko" ? `${post.court_no}번코트` : `Cancha ${post.court_no}`) : "-"} | {copy.opponent}{" "}
                        {post.opponentName} | {copy.closeReason} {post.closeReason}
                      </p>
                      <p className="muted">
                        {post.resultStatus === "confirmed"
                          ? `${copy.confirmedResult}${post.resultScore ? ` (${post.resultScore})` : ""}`
                          : post.resultStatus === "pending"
                            ? copy.pendingResult
                            : "-"}
                      </p>
                    </article>
                  );
                })}
              </div>
            ))}
            {pastHost.length > 20 ? <p className="muted">{copy.morePast}: +{pastHost.length - 20}</p> : null}
          </article>
        ) : (
          <article className="card">
            <strong>{copy.resultTab}</strong>
            {resultTargets.length === 0 ? <p className="muted">{copy.noResultTarget}</p> : null}
            {resultTargets.map((post) => {
              const startHHMM = getCordobaHHMM(post.start_at);
              const statusText =
                post.resultStatus === "pending"
                  ? copy.pendingResult
                  : post.resultStatus === "confirmed"
                    ? `${copy.confirmedResult}${post.resultScore ? ` (${post.resultScore})` : ""}`
                    : "";
              return (
                <article key={post.id} className="card">
                  <p className="muted">
                    {formatCordobaDate(post.start_at, dateLocale)} · {formatSlotRange(startHHMM)}
                    {post.court_no ? ` · ${lang === "ko" ? `${post.court_no}번코트` : `Cancha ${post.court_no}`}` : ""}
                  </p>
                  <p className="muted">
                    {copy.opponent}: {post.opponentName}
                  </p>
                  {statusText ? <p className="muted">{statusText}</p> : null}
                  <Link className="link-btn" href={`/post/${post.id}`}>
                    {copy.registerResult}
                  </Link>
                </article>
              );
            })}
          </article>
        )}

        <article className="card">
          <strong>{copy.myJoins}</strong>
          {(myJoins ?? []).length === 0 ? <p className="muted">{copy.noJoin}</p> : null}

          {upcomingJoin.length > 0 ? <h3 className="subhead">{copy.upcoming}</h3> : null}
          {upcomingJoin.map((join) => {
            const slot = join.relatedPost?.start_at ? formatSlotRange(getCordobaHHMM(join.relatedPost.start_at)) : "";

            return (
              <article key={join.id} className="card">
                <div className="row">
                  <span className="muted">
                    {formatCordobaDate(join.when, dateLocale)} {slot ? `· ${slot}` : ""}
                    {join.relatedPost?.court_no ? ` · ${lang === "ko" ? `${join.relatedPost.court_no}번코트` : `Cancha ${join.relatedPost.court_no}`}` : ""}
                  </span>
                  <span className={`status-chip ${join.label === copy.ongoing ? "open" : "done"}`}>{join.label}</span>
                </div>
                <p className="muted">
                  {copy.players}: {join.players}/{join.relatedPost?.needed ?? "-"}
                </p>
                <Link className="link-btn" href={`/post/${join.post_id}`}>
                  {copy.detail}
                </Link>
              </article>
            );
          })}

          {pastJoin.length > 0 ? <h3 className="subhead">{copy.past}</h3> : null}
          {Object.entries(pastJoinGrouped).map(([dateKey, joins]) => (
            <div key={`past-join-group-${dateKey}`} className="section">
              <p className="date-partition">
                {lang === "ko"
                  ? `${Number(dateKey.split("-")[2])}일 ${getCordobaWeekday(dateKey, "ko-KR")}`
                  : `${Number(dateKey.split("-")[2])} ${getCordobaWeekday(dateKey, "es-AR")}`}
              </p>
              {joins.map((join) => {
                const slot = join.relatedPost?.start_at ? formatSlotRange(getCordobaHHMM(join.relatedPost.start_at)) : "";
                const hostProfile = Array.isArray(join.relatedPost?.profiles) ? join.relatedPost?.profiles[0] : join.relatedPost?.profiles;
                const opponentName = hostProfile?.display_name || "-";
                return (
                  <article className="card" key={`past-join-${join.id}`}>
                    <p className="compact-line">
                      {formatCordobaDate(join.when, dateLocale)} | {slot || "-"} |{" "}
                      {join.relatedPost?.court_no ? `${lang === "ko" ? `${join.relatedPost.court_no}번코트` : `Cancha ${join.relatedPost.court_no}`}` : "-"} |{" "}
                      {copy.opponent} {opponentName} | {join.label} | {copy.players} {join.players}/{join.relatedPost?.needed ?? "-"}
                    </p>
                  </article>
                );
              })}
            </div>
          ))}
          {pastJoin.length > 20 ? <p className="muted">{copy.morePast}: +{pastJoin.length - 20}</p> : null}
        </article>

        <article className="card">
          <LogoutConfirmButton lang={lang} />
        </article>
      </section>

      <BottomNav />
    </main>
  );
}
