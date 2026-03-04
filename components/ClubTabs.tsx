import { type AppLang } from "@/lib/i18n";

interface ClubTabsProps {
  lang: AppLang;
}

export default function ClubTabs({ lang }: ClubTabsProps) {
  return (
    <div className="club-tabs-wrap">
      <div className="club-tabs">
        <button className="club-tab active" type="button" aria-current="page">
          <img className="club-tab-avatar" src="/api/club-avatar" alt="MITRE" />
          MITRE
        </button>
        <button className="club-tab" type="button" disabled>
          {lang === "ko" ? "추후 추가" : "Proximamente"}
        </button>
      </div>
    </div>
  );
}
