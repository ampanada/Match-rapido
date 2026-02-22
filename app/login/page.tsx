"use client";

import BottomNav from "@/components/BottomNav";
import { getClientLangFromCookie } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const [lang, setLang] = useState<"es" | "ko">("es");
  const copy =
    lang === "ko"
      ? {
          title: "로그인",
          subtitle: "게스트는 홈에서 바로 둘러보기 가능",
          authRequired: "내정보를 보려면 로그인이 필요합니다.",
          sent: "이메일로 로그인 링크를 보냈습니다.",
          sending: "전송 중...",
          submit: "이메일 매직 링크 받기"
        }
      : {
          title: "Acceso",
          subtitle: "Puedes explorar como invitado desde inicio",
          authRequired: "Necesitas iniciar sesion para ver Mi cuenta.",
          sent: "Te enviamos el enlace magico por email.",
          sending: "Enviando...",
          submit: "Recibir enlace magico"
        };

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLang(getClientLangFromCookie(document.cookie));
  }, []);

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(copy.sent);
    }

    setLoading(false);
  };

  return (
    <main className="shell">
      <header className="top">
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
      </header>

      {reason === "auth_required" ? <p className="notice">{copy.authRequired}</p> : null}

      <section className="card">
        <form className="section" onSubmit={handleMagicLink}>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button className="button" type="submit" disabled={loading}>
            {loading ? copy.sending : copy.submit}
          </button>
        </form>
        {message ? <p className="notice">{message}</p> : null}
      </section>

      <BottomNav />
    </main>
  );
}
