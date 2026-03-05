"use client";

import BottomNav from "@/components/BottomNav";
import { getClientLangFromCookie } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LOGIN_COOLDOWN_SECONDS = 60;
type SendState = "idle" | "loading" | "success" | "error";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const redirectToRaw = searchParams.get("redirect_to") || "/";
  const redirectTo = redirectToRaw.startsWith("/") && !redirectToRaw.startsWith("//") ? redirectToRaw : "/";
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [lang, setLang] = useState<"es" | "ko">("es");
  const copy =
    lang === "ko"
      ? {
          title: "로그인",
          subtitle: "게스트는 홈에서 바로 둘러보기 가능",
          authRequired: "내정보를 보려면 로그인이 필요합니다.",
          sentToast: "입력하신 이메일로 로그인 링크를 보냈어요.",
          sentHeadline: "입력하신 이메일로 로그인 링크를 보냈어요.",
          sentSpam: "메일이 안 보이면 스팸함/프로모션함을 확인해 주세요.",
          sentBrowser: "같은 브라우저에서 링크를 열어주세요.",
          sentReady: "전송 완료",
          openMail: "메일 열기",
          resend: "다시 보내기",
          resendIn: "다시 보내기",
          sendFailed: "링크 전송에 실패했어요. 다시 시도해 주세요.",
          sending: "전송 중...",
          submit: "이메일 매직 링크 받기",
          placeholder: "you@example.com"
        }
      : {
          title: "Acceso",
          subtitle: "Puedes explorar como invitado desde inicio",
          authRequired: "Necesitas iniciar sesion para ver Mi cuenta.",
          sentToast: "Te enviamos un link de acceso a tu email.",
          sentHeadline: "Te enviamos un link de acceso a tu email.",
          sentSpam: "Revisa Spam/Promociones si no lo ves.",
          sentBrowser: "Abri el link en este mismo navegador.",
          sentReady: "Listo",
          openMail: "Abrir correo",
          resend: "Reenviar",
          resendIn: "Reenviar en",
          sendFailed: "No se pudo enviar el link. Proba de nuevo.",
          sending: "Enviando...",
          submit: "Recibir enlace magico",
          placeholder: "you@example.com"
        };

  const [email, setEmail] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [errorDetail, setErrorDetail] = useState("");
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    setLang(getClientLangFromCookie(document.cookie));
  }, []);

  useEffect(() => {
    if (cooldownLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownLeft]);

  async function sendMagicLink() {
    if (sendState === "loading") {
      return;
    }

    const supabase = createClient();
    setSendState("loading");
    setErrorDetail("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`
      }
    });

    if (error) {
      setSendState("error");
      setErrorDetail(error.message);
    } else {
      setSendState("success");
      setCooldownLeft(LOGIN_COOLDOWN_SECONDS);
      emailInputRef.current?.blur();
    }
  }

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    await sendMagicLink();
  };

  function openMailApp() {
    if (!email.trim()) {
      return;
    }

    const normalized = email.trim();
    const mailtoUrl = `mailto:${encodeURIComponent(normalized)}`;
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);

    if (isIOS) {
      window.location.href = "message://";
      window.setTimeout(() => {
        window.location.href = mailtoUrl;
      }, 280);
      return;
    }

    if (isAndroid) {
      const gmailIntent = `intent://compose?to=${encodeURIComponent(normalized)}#Intent;scheme=mailto;package=com.google.android.gm;end`;
      window.location.href = gmailIntent;
      window.setTimeout(() => {
        window.location.href = mailtoUrl;
      }, 280);
      return;
    }

    window.location.href = mailtoUrl;
  }

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </header>

      {reason === "auth_required" ? <p className="notice">{copy.authRequired}</p> : null}
      {sendState === "success" ? <p className="notice success">{copy.sentToast}</p> : null}
      {sendState === "error" ? <p className="notice">{copy.sendFailed}</p> : null}

      <section className="card">
        <form className="section" onSubmit={handleMagicLink}>
          <input
            ref={emailInputRef}
            className="input"
            type="email"
            placeholder={copy.placeholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          {sendState === "success" ? (
            <>
              <div className="login-success-panel">
                <span className="status-chip done">{copy.sentReady}</span>
                <p className="login-help-line">{copy.sentHeadline}</p>
                <p className="muted">{copy.sentSpam}</p>
                <p className="muted">{copy.sentBrowser}</p>
              </div>
              <div className="actions">
                <button className="button button-outline" type="button" onClick={openMailApp}>
                  {copy.openMail}
                </button>
                <button
                  className="button"
                  type="button"
                  disabled={cooldownLeft > 0}
                  onClick={() => {
                    void sendMagicLink();
                  }}
                >
                  {cooldownLeft > 0 ? `${copy.resendIn} ${cooldownLeft}s` : copy.resend}
                </button>
              </div>
            </>
          ) : (
            <button className="button" type="submit" disabled={sendState === "loading"}>
              {sendState === "loading" ? copy.sending : copy.submit}
            </button>
          )}
        </form>
        {sendState === "error" && errorDetail ? <p className="muted login-error-detail">{errorDetail}</p> : null}
      </section>

      <BottomNav />
    </main>
  );
}
