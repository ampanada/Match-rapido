import BottomNav from "@/components/BottomNav";
import LanguageTabs from "@/components/LanguageTabs";
import LocalizedFileInput from "@/components/LocalizedFileInput";
import LogoutConfirmButton from "@/components/LogoutConfirmButton";
import ProfileAvatar from "@/components/ProfileAvatar";
import SubmitButton from "@/components/SubmitButton";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
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
  searchParams?: Promise<{ error?: string; saved?: string; reason?: string; warn?: string }>;
}) {
  noStore();
  const params = (await searchParams) ?? {};
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "내 정보",
          defaultName: "WhatsApp 사용자",
          invalidWa: "WhatsApp 번호 형식이 올바르지 않습니다. 예: +5491122334455",
          saveFailed: "저장에 실패했습니다. 다시 시도해 주세요.",
          saveDone: "저장되었습니다.",
          uploadWarn: "프로필 사진 업로드는 실패했지만 이름/번호는 저장되었습니다.",
          invalidAvatar: "이미지 파일만 업로드할 수 있습니다. (jpg, png, webp)",
          avatarTooLarge: "이미지 용량이 너무 큽니다. 최대 5MB",
          uploadFailed: "프로필 사진 업로드에 실패했습니다.",
          profile: "프로필 / WhatsApp 연동",
          profileGuide: "아르헨티나(+54)가 기본입니다. 필요하면 국가번호를 바꿔서 저장하세요.",
          language: "언어",
          languageGuide: "기본 언어는 Espanol입니다. 필요할 때만 Korean으로 변경하세요.",
          displayName: "WhatsApp 이름(표시 이름)",
          avatar: "프로필 사진",
          avatarGuide: "이미지 업로드 시 결과/프로필 화면에 표시됩니다. (jpg, png, webp)",
          step1: "1) 국가번호 선택",
          step2: "2) WhatsApp 번호 입력",
          saveFormat: "저장 형식 예시: +5491122334455",
          save: "저장",
          editProfile: "수정하기",
          savePending: "저장 중...",
          savedWhatsappLabel: "현재 저장된 WhatsApp"
        }
      : {
          title: "Mi cuenta",
          defaultName: "Usuario WhatsApp",
          invalidWa: "Formato invalido. Ejemplo: +5491122334455",
          saveFailed: "No se pudo guardar. Intenta de nuevo.",
          saveDone: "Guardado correctamente.",
          uploadWarn: "La foto no se pudo subir, pero nombre/numero si se guardaron.",
          invalidAvatar: "Solo se permiten imagenes (jpg/png/webp).",
          avatarTooLarge: "La imagen es demasiado grande. Maximo 5MB.",
          uploadFailed: "No se pudo subir la foto de perfil.",
          profile: "Perfil / WhatsApp",
          profileGuide: "El prefijo por defecto es Argentina (+54). Puedes cambiarlo.",
          language: "Idioma",
          languageGuide: "El idioma base es Espanol. Cambia a Korean solo si lo necesitas.",
          displayName: "Nombre de WhatsApp (visible)",
          avatar: "Foto de perfil",
          avatarGuide: "Se muestra en resultados/perfil. (jpg, png, webp)",
          step1: "1) Selecciona prefijo",
          step2: "2) Ingresa numero de WhatsApp",
          saveFormat: "Formato final: +5491122334455",
          save: "Guardar",
          editProfile: "Editar",
          savePending: "Guardando...",
          savedWhatsappLabel: "WhatsApp guardado actualmente"
        };

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
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        display_name: metadataName
      },
      { onConflict: "id" }
    );

    if (!error) {
      myProfile = {
        display_name: metadataName,
        whatsapp: myProfile?.whatsapp ?? null,
        avatar_url: myProfile?.avatar_url ?? null
      };
    }
  }

  const effectiveDisplayName = myProfile?.display_name || metadataName || null;
  const profileName = effectiveDisplayName || copy.defaultName;
  const split = splitWhatsapp(myProfile?.whatsapp);

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
        {params.error === "invalid_whatsapp" ? <p className="notice">{copy.invalidWa}</p> : null}
        {params.error === "save_failed" ? <p className="notice">{copy.saveFailed}</p> : null}
        {params.error === "invalid_avatar" ? <p className="notice">{copy.invalidAvatar}</p> : null}
        {params.error === "avatar_too_large" ? <p className="notice">{copy.avatarTooLarge}</p> : null}
        {params.error === "upload_failed" ? <p className="notice">{copy.uploadFailed}</p> : null}
        {params.saved === "1" ? <p className="notice success">{copy.saveDone}</p> : null}
        {params.warn === "avatar_upload_failed" ? <p className="notice">{copy.uploadWarn}</p> : null}
        {params.reason ? <p className="muted">reason: {params.reason}</p> : null}

        <article className="card">
          <strong>{copy.language}</strong>
          <p className="muted">{copy.languageGuide}</p>
          <LanguageTabs lang={lang} />
        </article>

        <article className="card">
          <strong>{copy.profile}</strong>
          <p className="muted">{copy.profileGuide}</p>
          <form className="section" method="post" action="/my/save" encType="multipart/form-data">
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
          <LogoutConfirmButton lang={lang} />
        </article>
      </section>

      <BottomNav />
    </main>
  );
}
