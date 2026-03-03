"use client";

import { useId, useState } from "react";

export default function LocalizedFileInput({
  lang,
  name,
  accept
}: {
  lang: "ko" | "es";
  name: string;
  accept: string;
}) {
  const id = useId();
  const [fileName, setFileName] = useState("");
  const copy =
    lang === "ko"
      ? { choose: "파일 선택", none: "선택된 파일 없음" }
      : { choose: "Seleccionar archivo", none: "Sin archivo seleccionado" };

  return (
    <div className="file-input-wrap">
      <label className="button button-outline file-input-button" htmlFor={id}>
        {copy.choose}
      </label>
      <input
        id={id}
        className="sr-only-input"
        type="file"
        name={name}
        accept={accept}
        onChange={(e) => {
          const target = e.currentTarget.files?.[0];
          setFileName(target?.name ?? "");
        }}
      />
      <p className="muted file-input-name">{fileName || copy.none}</p>
    </div>
  );
}
