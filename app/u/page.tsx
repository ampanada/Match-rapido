"use client";

import BottomNav from "@/components/BottomNav";
import { getClientLangFromCookie } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MyPublicProfileRedirectPage() {
  const router = useRouter();
  const [lang, setLang] = useState<"es" | "ko">("es");

  useEffect(() => {
    setLang(getClientLangFromCookie(document.cookie));

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login?reason=auth_required");
        return;
      }
      router.replace(`/u/${data.user.id}`);
    });
  }, [router]);

  return (
    <main className="shell">
      <header className="top">
        <h1>{lang === "ko" ? "프로필로 이동 중" : "Abriendo perfil"}</h1>
      </header>
      <BottomNav />
    </main>
  );
}
