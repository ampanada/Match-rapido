"use client";

import { LANG_COOKIE_KEY, type AppLang } from "@/lib/i18n";
import { useRouter } from "next/navigation";

interface LanguageTabsProps {
  lang: AppLang;
}

export default function LanguageTabs({ lang }: LanguageTabsProps) {
  const router = useRouter();

  function switchLang(nextLang: AppLang) {
    document.cookie = `${LANG_COOKIE_KEY}=${nextLang}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="lang-tabs-wrap">
      <div className="lang-tabs">
        <button
          className={`lang-tab ${lang === "es" ? "active" : ""}`}
          type="button"
          onClick={() => switchLang("es")}
        >
          Espanol
        </button>
        <button className={`lang-tab ${lang === "ko" ? "active" : ""}`} type="button" onClick={() => switchLang("ko")}>
          Korean
        </button>
      </div>
    </div>
  );
}
