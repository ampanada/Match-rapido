"use client";

import { useState } from "react";

interface ShareButtonsProps {
  url: string;
  dateTimeLabel: string;
  courtNo: number | null;
  format: string;
  level?: string | null;
}

const FORMAT_LABELS: Record<string, string> = {
  single: "Single",
  double: "Doble",
  mixed_double: "Doble mixto",
  men_double: "Doble masculino",
  women_double: "Doble femenino",
  rally: "Rally"
};

function normalizeAbsoluteUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const base = window.location.origin;
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export default function ShareButtons({ url, dateTimeLabel, courtNo, format, level }: ShareButtonsProps) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  function buildMessage(absoluteUrl: string) {
    const formatLabel = FORMAT_LABELS[format] ?? format;
    const levelPart = level ? ` | Nivel: ${level}` : "";

    return [
      "Partido en Match Rapido 🎾",
      `${dateTimeLabel} | Cancha ${courtNo ?? "-"}`,
      `Formato: ${formatLabel}${levelPart}`,
      `Link: ${absoluteUrl}`
    ].join("\n");
  }

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 2200);
  }

  function shareWhatsApp() {
    const absoluteUrl = normalizeAbsoluteUrl(url);
    const text = buildMessage(absoluteUrl);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    const absoluteUrl = normalizeAbsoluteUrl(url);
    setBusy(true);
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      showFeedback("Link copiado ✅");
    } catch {
      window.prompt("Copiar link:", absoluteUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <div className="actions share-actions">
        <button className="button button-outline" type="button" onClick={shareWhatsApp}>
          Compartir por WhatsApp
        </button>
        <button className="button" type="button" onClick={() => void copyLink()} disabled={busy}>
          {busy ? "Copiando..." : "Copiar link"}
        </button>
      </div>
      {feedback ? <p className="notice success share-feedback">{feedback}</p> : null}
    </div>
  );
}
