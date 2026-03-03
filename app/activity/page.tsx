import BottomNav from "@/components/BottomNav";
import { getServerLang } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

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

function getActivityHref(item: { type: string; related_post_id: string | null; user_id: string }) {
  if ((item.type === "new_post" || item.type === "cancel_join") && item.related_post_id) {
    return `/post/${item.related_post_id}`;
  }
  if (item.type === "match_result") {
    return "/results";
  }
  if (item.type === "streak") {
    return `/u/${item.user_id}`;
  }
  return "/activity";
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
    .select("id,type,user_id,related_post_id,message,created_at")
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
          <Link key={item.id} className="activity-link" href={getActivityHref(item)}>
            <article className="activity-item">
              <p className="activity-message">{item.message}</p>
              <p className="activity-time">{relativeTimeLabel(item.created_at, lang)}</p>
            </article>
          </Link>
        ))}
      </section>

      <BottomNav />
    </main>
  );
}
