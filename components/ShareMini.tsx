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
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const path = `/post/${postId}`;

  function stop(event: React.MouseEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function onShareWhatsApp(event: React.MouseEvent<HTMLButtonElement>) {
    stop(event);
    const url = buildAbsoluteUrl(path);
    const message = `Partido 🎾 ${startAtLabel} | Cancha ${courtNo ?? "-"} — ${formatLabel}\n${url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  async function onCopyLink(event: React.MouseEvent<HTMLButtonElement>) {
    stop(event);
    const url = buildAbsoluteUrl(path);
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copiar link:", url);
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="post-share-mini" onClick={stop}>
      <button className="mini-share-btn" type="button" onClick={onShareWhatsApp}>
        WhatsApp
      </button>
      <button className="mini-share-btn" type="button" onClick={(event) => void onCopyLink(event)} disabled={copying}>
        {copying ? (lang === "ko" ? "복사중..." : "Copiando...") : "Copiar"}
      </button>
      {copied ? <span className="mini-share-feedback">Copiado ✅</span> : null}
    </div>
  );
}
