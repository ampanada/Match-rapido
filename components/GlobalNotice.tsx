import { type AppLang } from "@/lib/i18n";

interface GlobalNoticeProps {
  lang: AppLang;
}

export default function GlobalNotice({ lang }: GlobalNoticeProps) {
  const enabled = process.env.NEXT_PUBLIC_NOTICE_ENABLED === "1";
  if (!enabled) {
    return null;
  }

  const esText = process.env.NEXT_PUBLIC_NOTICE_ES?.trim();
  const koText = process.env.NEXT_PUBLIC_NOTICE_KO?.trim();
  const text = lang === "ko" ? koText || esText : esText || koText;

  if (!text) {
    return null;
  }

  return (
    <div className="global-notice-wrap" role="status" aria-live="polite">
      <p className="global-notice-text">{text}</p>
    </div>
  );
}
