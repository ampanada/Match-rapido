import Link from "next/link";
import { formatLabel, levelLabel } from "@/lib/constants/filters";
import { formatCordobaDate, formatSlotRange, getCordobaHHMM } from "@/lib/constants/slots";

interface PostCardProps {
  post: {
    id: string;
    start_at: string;
    format: string;
    level: string;
    needed: number;
    court_no: number | null;
    note: string | null;
    status: string;
    joinsCount: number;
    hostName: string;
    isExpired: boolean;
  };
  lang: "es" | "ko";
}

export default function PostCard({ post, lang }: PostCardProps) {
  const dateLocale = lang === "ko" ? "ko-KR" : "es-AR";
  const copy =
    lang === "ko"
      ? {
          done: "매칭완료",
          open: "모집중",
          hostRecruit: "호스트 외",
          recruitSuffix: "명 모집",
          emptyNote: "메모 없음",
          detail: "상세 보기"
        }
      : {
          done: "Cerrado",
          open: "Abierto",
          hostRecruit: "Buscando",
          recruitSuffix: " mas (sin contar host)",
          emptyNote: "Sin nota",
          detail: "Ver detalle"
        };
  const currentPlayers = post.joinsCount + 1;
  const recruitCount = Math.max(post.needed - 1, 0);
  const isCompleted = post.status === "closed" || currentPlayers >= post.needed || post.isExpired;
  const startHHMM = getCordobaHHMM(post.start_at);

  return (
    <article className="card">
      <div className="row">
        <strong>{post.hostName}</strong>
        <span className={`status-chip ${isCompleted ? "done" : "open"}`}>{isCompleted ? copy.done : copy.open}</span>
      </div>
      <span className="muted">
        {formatCordobaDate(post.start_at, dateLocale)} · {formatSlotRange(startHHMM)}
      </span>
      <div className="badges">
        <span className="badge">{formatLabel(post.format, lang)}</span>
        <span className="badge">{levelLabel(post.level, lang)}</span>
        {post.court_no ? <span className="badge">{lang === "ko" ? `${post.court_no}번코트` : `Cancha ${post.court_no}`}</span> : null}
        <span className="badge">
          {currentPlayers}/{post.needed}
        </span>
      </div>
      <span className="muted">
        {copy.hostRecruit} {recruitCount}
        {copy.recruitSuffix}
      </span>
      <p className="note">{post.note || copy.emptyNote}</p>
      <Link className="link-btn" href={`/post/${post.id}`}>
        {copy.detail}
      </Link>
    </article>
  );
}
