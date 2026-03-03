import BottomNav from "@/components/BottomNav";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

function relativeTimeLabel(value: string, lang: "es" | "ko") {
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor((now - then) / 60000));

  if (diffMinutes < 1) {
    return lang === "ko" ? "방금 전" : "hace un momento";
  }
  if (diffMinutes < 60) {
    return lang === "ko" ? `${diffMinutes}분 전` : `hace ${diffMinutes}m`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return lang === "ko" ? `${diffHours}시간 전` : `hace ${diffHours}h`;
  }
  if (diffHours < 48) {
    return lang === "ko" ? "어제" : "ayer";
  }
  const diffDays = Math.floor(diffHours / 24);
  return lang === "ko" ? `${diffDays}일 전` : `hace ${diffDays}d`;
}

export default async function ActivityPage() {
  const lang = await getServerLang();
  const copy =
    lang === "ko"
      ? {
          title: "최근 활동 상세",
          subtitle: "최신 활동 로그",
          empty: "표시할 최근 활동이 없습니다."
        }
      : {
          title: "Detalle de actividad",
          subtitle: "Registro reciente",
          empty: "No hay actividad para mostrar."
        };

  const supabase = await createClient();
  const { data: activityData } = await supabase
    .from("activity_feed")
    .select("id,message,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="shell">
      <header className="top">
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
      </header>

      <section className="activity-list">
        {(activityData ?? []).length === 0 ? <p className="notice">{copy.empty}</p> : null}
        {(activityData ?? []).map((item) => (
          <article key={item.id} className="activity-item">
            <p className="activity-message">{item.message}</p>
            <p className="activity-time">{relativeTimeLabel(item.created_at, lang)}</p>
          </article>
        ))}
      </section>

      <BottomNav />
    </main>
  );
}
