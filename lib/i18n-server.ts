import { cookies } from "next/headers";
import { type AppLang, LANG_COOKIE_KEY } from "@/lib/i18n";

export function getServerLang(): AppLang {
  const lang = cookies().get(LANG_COOKIE_KEY)?.value;
  return lang === "ko" ? "ko" : "es";
}
