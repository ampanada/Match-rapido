import BottomNav from "@/components/BottomNav";
import PostFormatNeededFields from "@/components/PostFormatNeededFields";
import { LEVEL_OPTIONS, levelLabel } from "@/lib/constants/filters";
import { getServerLang } from "@/lib/i18n-server";
import { SLOT_START_TIMES, formatSlotRange, getCordobaDateString, isValidSlotStart, zonedDateTimeToIso } from "@/lib/constants/slots";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PostPage({
  searchParams
}: {
  searchParams?: { error?: string; at?: string; start?: string };
}) {
  const lang = getServerLang();
  const copy =
    lang === "ko"
        ? {
          title: "매치 글쓰기",
          subtitle: "오늘/지금 가능한 멤버 모집",
          duplicate: "중복 매칭 글이 있어 등록하지 않았습니다.",
          invalid: "유효하지 않은 날짜/슬롯입니다. 다시 선택해 주세요.",
          past: "지난 시간 슬롯은 등록할 수 없습니다.",
          autoClose: "자동 종료: 시작 후 90분 (예: 09:00-10:30)",
          courtOptional: "코트 선택 (선택)",
          courtPlaceholder: "코트 미지정",
          notePlaceholder: "모집 내용, 코트 위치, 준비물 등",
          submit: "글 등록"
        }
      : {
          title: "Publicar partido",
          subtitle: "Crear una convocatoria rapida",
          duplicate: "Ya existe una convocatoria duplicada para ese horario.",
          invalid: "Fecha o franja invalida. Vuelve a seleccionar.",
          past: "No puedes publicar una franja que ya paso.",
          autoClose: "Cierre automatico: 90 minutos desde el inicio",
          courtOptional: "Cancha (opcional)",
          courtPlaceholder: "Sin cancha",
          notePlaceholder: "Detalles, ubicacion de cancha, etc.",
          submit: "Publicar"
        };

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  async function createPost(formData: FormData) {
    "use server";

    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    // Ensure profile row exists for FK(posts.host_id -> profiles.id) and RLS checks.
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? ""
      },
      { onConflict: "id" }
    );

    if (profileError) {
      throw new Error(`프로필 생성 실패: ${profileError.message}`);
    }

    const date = String(formData.get("date") || "");
    const slot = String(formData.get("slot") || "");
    const format = String(formData.get("format") || "single");
    const level = String(formData.get("level") || "beginner");
    const defaultNeeded = format === "double" ? 4 : 2;
    const needed = Number(formData.get("needed") || defaultNeeded);
    const courtRaw = String(formData.get("court_no") || "").trim();
    const courtNo = courtRaw ? Number(courtRaw) : null;
    const note = String(formData.get("note") || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidSlotStart(slot)) {
      redirect("/post?error=invalid_slot");
    }

    const startAtIso = zonedDateTimeToIso(date, slot);

    if (new Date(startAtIso).getTime() < Date.now()) {
      redirect(`/post?error=past&start=${encodeURIComponent(startAtIso)}`);
    }
    if (courtNo !== null && (!Number.isInteger(courtNo) || courtNo < 1 || courtNo > 6)) {
      redirect("/post?error=invalid_slot");
    }

    const { data: duplicated } = await supabase
      .from("posts")
      .select("id")
      .eq("host_id", user.id)
      .eq("start_at", startAtIso)
      .limit(1);

    if (duplicated && duplicated.length > 0) {
      redirect(`/post?error=duplicate&at=${encodeURIComponent(startAtIso)}`);
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        host_id: user.id,
        start_at: startAtIso,
        format,
        level,
        needed,
        court_no: courtNo,
        note,
        status: "open"
      })
      .select("id")
      .single();

    if (error?.code === "23505") {
      redirect(`/post?error=duplicate&at=${encodeURIComponent(startAtIso)}`);
    }

    if (error || !data) {
      throw new Error(`글 생성 실패: ${error?.message ?? "unknown"}`);
    }

    redirect(`/post/${data.id}?createdAt=${encodeURIComponent(new Date().toISOString())}`);
  }

  const duplicateErrorTime = searchParams?.at ? new Date(searchParams.at) : null;
  const isDuplicateError = searchParams?.error === "duplicate";
  const isInvalidSlotError = searchParams?.error === "invalid_slot";
  const pastStart = searchParams?.start ? new Date(searchParams.start) : null;
  const isPastError = searchParams?.error === "past";
  const defaultDate = getCordobaDateString();
  const dateLocale = lang === "ko" ? "ko-KR" : "es-AR";

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </header>

      {isDuplicateError ? (
        <p className="notice">
          {copy.duplicate}
          {duplicateErrorTime ? ` (${duplicateErrorTime.toLocaleString(dateLocale)})` : ""}
        </p>
      ) : null}
      {isInvalidSlotError ? <p className="notice">{copy.invalid}</p> : null}
      {isPastError ? (
        <p className="notice">
          {copy.past} {pastStart ? `(${pastStart.toLocaleString(dateLocale)})` : ""}
        </p>
      ) : null}

      <form className="section" action={createPost}>
        <input className="input" name="date" type="date" defaultValue={defaultDate} required />

        <select className="select" name="slot" defaultValue={SLOT_START_TIMES[0]} required>
          {SLOT_START_TIMES.map((value) => (
            <option key={value} value={value}>
              {formatSlotRange(value)}
            </option>
          ))}
        </select>
        <p className="muted">{copy.autoClose}</p>

        <PostFormatNeededFields lang={lang} />

        <select className="select" name="court_no" defaultValue="">
          <option value="">{copy.courtPlaceholder}</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
        </select>
        <p className="muted">{copy.courtOptional}</p>

        <select className="select" name="level" defaultValue="beginner">
          {LEVEL_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {levelLabel(value, lang)}
            </option>
          ))}
        </select>

        <textarea className="textarea" name="note" placeholder={copy.notePlaceholder} />

        <button className="button" type="submit">
          {copy.submit}
        </button>
      </form>

      <BottomNav />
    </main>
  );
}
