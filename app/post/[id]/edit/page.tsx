import BottomNav from "@/components/BottomNav";
import { FORMAT_OPTIONS, formatLabel } from "@/lib/constants/filters";
import { SLOT_START_TIMES, formatSlotRange, getCordobaDateString, getCordobaHHMM, isValidSlotStart, zonedDateTimeToIso } from "@/lib/constants/slots";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "@/components/SubmitButton";
import { redirect } from "next/navigation";

export default async function EditPostPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: { error?: string; message?: string };
}) {
  const { id } = await params;
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "매치 글 수정",
          subtitle: "내가 작성한 매치의 시간/포맷을 수정할 수 있습니다.",
          save: "수정 저장",
          savePending: "저장 중...",
          failed: "수정 실패:",
          locked: "경기 시작 후에는 수정할 수 없습니다.",
          neededTooSmall: "현재 참여 인원보다 모집 인원을 작게 설정할 수 없습니다.",
          autoClose: "자동 종료: 시작 후 90분",
          courtOptional: "코트 선택 (선택)",
          courtPlaceholder: "코트 미지정",
          notePlaceholder: "모집 내용, 코트 위치, 준비물 등"
        }
      : {
          title: "Editar partido",
          subtitle: "Puedes editar horario/formato de tus partidos.",
          save: "Guardar cambios",
          savePending: "Guardando...",
          failed: "Error al editar:",
          locked: "No se puede editar despues del inicio del partido.",
          neededTooSmall: "No puedes definir cupo menor al numero actual de participantes.",
          autoClose: "Cierre automatico: 90 minutos desde el inicio",
          courtOptional: "Cancha (opcional)",
          courtPlaceholder: "Sin cancha",
          notePlaceholder: "Detalles, ubicacion de cancha, etc."
        };

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: post } = await supabase
    .from("posts")
    .select("id,host_id,start_at,format,needed,court_no,note,status")
    .eq("id", id)
    .maybeSingle();

  if (!post || post.host_id !== user.id) {
    redirect(`/post/${id}`);
  }

  const hasStarted = new Date(post.start_at).getTime() <= Date.now();
  if (hasStarted) {
    redirect(`/post/${id}`);
  }

  async function updatePost(formData: FormData) {
    "use server";

    try {
      const supabase = await createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        redirect("/login");
      }

      const { data: current } = await supabase
        .from("posts")
        .select("id,host_id,status,start_at,joins(status)")
        .eq("id", id)
        .maybeSingle();

      if (!current || current.host_id !== user.id) {
        redirect(`/post/${id}`);
      }

      if (new Date(current.start_at).getTime() <= Date.now()) {
        redirect(`/post/${id}/edit?error=locked`);
      }

      const date = String(formData.get("date") || "");
      const slot = String(formData.get("slot") || "");
      const format = String(formData.get("format") || "single");
      const needed = Number(formData.get("needed") || 2);
      const courtRaw = String(formData.get("court_no") || "").trim();
      const courtNo = courtRaw ? Number(courtRaw) : null;
      const note = String(formData.get("note") || "").trim();
      const approvedCount = current.joins?.filter((join: { status: string }) => join.status === "approved").length ?? 0;
      const currentPlayers = approvedCount + 1;

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValidSlotStart(slot)) {
        redirect(`/post/${id}/edit?error=invalid`);
      }

      const startAtIso = zonedDateTimeToIso(date, slot);
      if (new Date(startAtIso).getTime() < Date.now()) {
        redirect(`/post/${id}/edit?error=past`);
      }

      if (courtNo !== null && (!Number.isInteger(courtNo) || courtNo < 1 || courtNo > 6)) {
        redirect(`/post/${id}/edit?error=invalid`);
      }
      if (needed < currentPlayers) {
        redirect(`/post/${id}/edit?error=needed_too_small`);
      }

      const { data: duplicated } = await supabase
        .from("posts")
        .select("id")
        .eq("host_id", user.id)
        .eq("start_at", startAtIso)
        .neq("id", id)
        .limit(1);

      if ((duplicated ?? []).length > 0) {
        redirect(`/post/${id}/edit?error=duplicate`);
      }

      const { error } = await supabase
        .from("posts")
        .update({
          start_at: startAtIso,
          format,
          needed,
          court_no: courtNo,
          note
        })
        .eq("id", id)
        .eq("host_id", user.id);

      if (error) {
        redirect(`/post/${id}/edit?error=failed&message=${encodeURIComponent(error.message)}`);
      }

      redirect(`/post/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      redirect(`/post/${id}/edit?error=failed&message=${encodeURIComponent(msg)}`);
    }
  }

  const defaultDate = getCordobaDateString(new Date(post.start_at));
  const defaultSlot = getCordobaHHMM(post.start_at);
  const safeSlot = isValidSlotStart(defaultSlot) ? defaultSlot : SLOT_START_TIMES[0];

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </header>

      {searchParams?.error ? (
        <p className="notice">
          {searchParams.error === "locked"
            ? copy.locked
            : searchParams.error === "needed_too_small"
              ? copy.neededTooSmall
              : `${copy.failed} ${searchParams.message ? decodeURIComponent(searchParams.message) : searchParams.error}`}
        </p>
      ) : null}

      <form className="section" action={updatePost}>
        <input className="input" name="date" type="date" defaultValue={defaultDate} required />

        <select className="select" name="slot" defaultValue={safeSlot} required>
          {SLOT_START_TIMES.map((value) => (
            <option key={value} value={value}>
              {formatSlotRange(value)}
            </option>
          ))}
        </select>
        <p className="muted">{copy.autoClose}</p>

        <select className="select" name="format" defaultValue={post.format}>
          {FORMAT_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {formatLabel(value, lang)}
            </option>
          ))}
        </select>

        <input className="input" name="needed" type="number" min={1} max={8} defaultValue={post.needed} required />

        <select className="select" name="court_no" defaultValue={post.court_no?.toString() ?? ""}>
          <option value="">{copy.courtPlaceholder}</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
        </select>
        <p className="muted">{copy.courtOptional}</p>

        <textarea className="textarea" name="note" placeholder={copy.notePlaceholder} defaultValue={post.note ?? ""} />

        <SubmitButton idleLabel={copy.save} pendingLabel={copy.savePending} />
      </form>

      <BottomNav />
    </main>
  );
}
