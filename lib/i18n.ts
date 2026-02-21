export type AppLang = "es" | "ko";

export const LANG_COOKIE_KEY = "app_lang";

export function getClientLangFromCookie(rawCookie: string): AppLang {
  const token = rawCookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LANG_COOKIE_KEY}=`))
    ?.split("=")[1];

  return token === "ko" ? "ko" : "es";
}

export function canUseKorean(email?: string | null) {
  if (!email) {
    return false;
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    return false;
  }

  return adminEmails.includes(email.toLowerCase());
}
