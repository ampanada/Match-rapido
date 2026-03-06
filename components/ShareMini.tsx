"use client";

import { useState } from "react";

interface ShareMiniProps {
  postId: string;
  startAtLabel: string;
  courtNo: number | null;
  formatLabel: string;
  lang: "es" | "ko";
}

function buildAbsoluteUrl(path: string) {
  const origin = window.location.origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function ShareMini({ postId, startAtLabel, courtNo, formatLabel, lang }: ShareMiniProps) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const path = `/post/${postId}`;

  function stop(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function buildMessage(url: string) {
    return `Partido 🎾 ${startAtLabel} | Cancha ${courtNo ?? "-"} — ${formatLabel}\n${url}`;
  }

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 1800);
  }

  async function onShare(event: React.MouseEvent<HTMLButtonElement>) {
    stop(event);
    if (busy) {
      return;
    }

    setBusy(true);
    const url = buildAbsoluteUrl(path);
    const message = buildMessage(url);

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Match Rapido",
          text: message,
          url
        });
        showFeedback(lang === "ko" ? "공유됨 ✅" : "Compartido ✅");
        return;
      }

      await navigator.clipboard.writeText(url);
      showFeedback(lang === "ko" ? "링크 복사 완료 ✅" : "Link copiado ✅");
    } catch {
      window.prompt("Copiar link:", url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="post-share-mini" onClick={stop}>
      <button
        className="mini-share-icon-btn"
        type="button"
        onClick={(event) => void onShare(event)}
        disabled={busy}
        aria-label={lang === "ko" ? "공유" : "Compartir"}
        title={lang === "ko" ? "공유" : "Compartir"}
      >
        <span className="mini-share-icon" aria-hidden="true">
          ↗
        </span>
      </button>
      {feedback ? <span className="mini-share-feedback">{feedback}</span> : null}
    </div>
  );
}
