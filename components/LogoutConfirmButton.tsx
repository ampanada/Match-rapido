"use client";

import { useState } from "react";

export default function LogoutConfirmButton({
  lang
}: {
  lang: "ko" | "es";
}) {
  const [open, setOpen] = useState(false);
  const copy =
    lang === "ko"
      ? {
          trigger: "로그아웃",
          confirm: "정말 로그아웃할까요?",
          yes: "Yes",
          no: "No"
        }
      : {
          trigger: "Cerrar sesion",
          confirm: "Realmente quieres cerrar sesion?",
          yes: "Yes",
          no: "No"
        };

  return (
    <div className="logout-wrap">
      {!open ? (
        <button className="logout-mini-btn" type="button" onClick={() => setOpen(true)}>
          {copy.trigger}
        </button>
      ) : (
        <div className="logout-confirm-box">
          <p className="muted">{copy.confirm}</p>
          <div className="logout-confirm-actions">
            <form method="post" action="/logout">
              <button className="button button-soft" type="submit">
                {copy.yes}
              </button>
            </form>
            <button className="button button-outline" type="button" onClick={() => setOpen(false)}>
              {copy.no}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
