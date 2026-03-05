"use client";

import { formatLabel } from "@/lib/constants/filters";
import { formatCordobaDate, formatSlotRange, getCordobaDateString, getCordobaHHMM, getCordobaWeekday } from "@/lib/constants/slots";
import ProfileAvatar from "@/components/ProfileAvatar";
import MotionProfileLink from "@/components/MotionProfileLink";
import ShareMini from "@/components/ShareMini";
import { useRouter } from "next/navigation";

interface PostCardProps {
  post: {
    id: string;
    isMine: boolean;
    start_at: string;
    format: string;
    needed: number;
    court_no: number | null;
    note: string | null;
    status: string;
    joinsCount: number;
    hostName: string;
    hostAvatarUrl?: string | null;
    hostId: string;
    participants: Array<{
      id: string;
      name: string;
      avatarUrl: string | null;
      isHost: boolean;
    }>;
    isExpired: boolean;
  };
  lang: "es" | "ko";
}

export default function PostCard({ post, lang }: PostCardProps) {
  const router = useRouter();
  const dateLocale = lang === "ko" ? "ko-KR" : "es-AR";
  const copy =
    lang === "ko"
      ? {
          done: "매칭완료",
          open: "모집중",
          hostRecruit: "호스트 외",
          recruitSuffix: "명 모집",
          participants: "참여자",
          participantItem: "참여자",
          hostTag: "호스트",
          emptyNote: "메모 없음",
          editForGuest: "수정하기",
          detail: "상세 보기"
        }
      : {
          done: "Cerrado",
          open: "Abierto",
          hostRecruit: "Buscando",
          recruitSuffix: " mas (sin contar host)",
          participants: "Participantes",
          participantItem: "Jugador",
          hostTag: "Host",
          emptyNote: "Sin nota",
          editForGuest: "Editar",
          detail: "Ver detalle"
        };
  const currentPlayers = post.joinsCount + 1;
  const recruitCount = Math.max(post.needed - 1, 0);
  const isCompleted = post.status === "closed" || currentPlayers >= post.needed || post.isExpired;
  const startHHMM = getCordobaHHMM(post.start_at);
  const dayKey = getCordobaDateString(new Date(post.start_at));
  const weekday = getCordobaWeekday(dayKey, dateLocale);
  const detailHref = `/post/${post.id}`;
  const guestAddHref = `/post/${post.id}#guest-add`;
  const shareTimeLabel = `${formatCordobaDate(post.start_at, "es-AR")} ${formatSlotRange(startHHMM)}`;

  function moveToDetail() {
    router.push(detailHref);
    window.setTimeout(() => {
      if (window.location.pathname !== detailHref) {
        window.location.href = detailHref;
      }
    }, 250);
  }

  function moveToGuestAdd() {
    router.push(guestAddHref);
    window.setTimeout(() => {
      if (window.location.pathname !== detailHref || window.location.hash !== "#guest-add") {
        window.location.href = guestAddHref;
      }
    }, 250);
  }

  return (
    <article className="card">
      <div className="row">
        <MotionProfileLink className="host-name-row" href={`/u/${post.hostId}`}>
          <ProfileAvatar name={post.hostName} avatarUrl={post.hostAvatarUrl ?? null} size="sm" />
          <strong className="host-name-text">{post.hostName}</strong>
        </MotionProfileLink>
        <span className={`status-chip ${isCompleted ? "done" : "open"}`}>{isCompleted ? copy.done : copy.open}</span>
      </div>
      <div className="result-date-hero">
        <span className="result-weekday">{weekday}</span>
        <span className="result-date-text">{formatCordobaDate(post.start_at, dateLocale)}</span>
        <span className="result-time-pill">{formatSlotRange(startHHMM)}</span>
      </div>
      <div className="badges">
        <span className="badge">{formatLabel(post.format, lang)}</span>
        {post.court_no ? <span className="badge">{lang === "ko" ? `${post.court_no}번코트` : `Cancha ${post.court_no}`}</span> : null}
        <span className="badge">
          {currentPlayers}/{post.needed}
        </span>
      </div>
      <span className="muted">
        {copy.hostRecruit} {recruitCount}
        {copy.recruitSuffix}
      </span>
      <p className="muted">{copy.participants}</p>
      <div className="participant-list">
        {post.participants.map((participant, idx) => (
          participant.id.startsWith("guest:") ? (
            <div key={`${post.id}-p-${participant.id}`} className="participant-chip">
              <span className="participant-row">
                <span className="participant-index">{copy.participantItem} {idx + 1}</span>
                <ProfileAvatar name={participant.name} avatarUrl={participant.avatarUrl} size="sm" />
                <strong className="participant-name">{participant.name}</strong>
              </span>
            </div>
          ) : (
            <MotionProfileLink key={`${post.id}-p-${participant.id}`} className="participant-chip" href={`/u/${participant.id}`}>
              <span className="participant-row">
                <span className="participant-index">{copy.participantItem} {idx + 1}</span>
                <ProfileAvatar name={participant.name} avatarUrl={participant.avatarUrl} size="sm" />
                <strong className="participant-name">{participant.name}</strong>
                {participant.isHost ? <span className="participant-role">{copy.hostTag}</span> : null}
              </span>
            </MotionProfileLink>
          )
        ))}
      </div>
      <p className="note">{post.note || copy.emptyNote}</p>
      <ShareMini
        postId={post.id}
        startAtLabel={shareTimeLabel}
        courtNo={post.court_no}
        formatLabel={formatLabel(post.format, "es")}
        lang={lang}
      />
      {post.isMine ? (
        <button className="button button-outline" type="button" onClick={moveToGuestAdd}>
          {copy.editForGuest}
        </button>
      ) : null}
      <button className="link-btn" type="button" onClick={moveToDetail}>
        {copy.detail}
      </button>
    </article>
  );
}
