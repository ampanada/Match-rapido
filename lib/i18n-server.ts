import { cookies } from "next/headers";
import { type AppLang, LANG_COOKIE_KEY } from "@/lib/i18n";

export async function getServerLang(): Promise<AppLang> {
  const cookieStore = await cookies();
  const lang = cookieStore.get(LANG_COOKIE_KEY)?.value;
  return lang === "ko" ? "ko" : "es";
}
