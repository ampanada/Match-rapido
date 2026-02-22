"use client";

import { useState } from "react";
import { FORMAT_OPTIONS, formatLabel } from "@/lib/constants/filters";

const DEFAULT_NEEDED_BY_FORMAT: Record<string, number> = {
  single: 2,
  double: 4,
  mixed_double: 4,
  men_double: 4,
  women_double: 4,
  rally: 2
};

interface PostFormatNeededFieldsProps {
  lang: "es" | "ko";
}

export default function PostFormatNeededFields({ lang }: PostFormatNeededFieldsProps) {
  const [format, setFormat] = useState("single");
  const [needed, setNeeded] = useState(DEFAULT_NEEDED_BY_FORMAT.single);

  function onFormatChange(nextFormat: string) {
    setFormat(nextFormat);
    setNeeded(DEFAULT_NEEDED_BY_FORMAT[nextFormat] ?? 2);
  }

  return (
    <>
      <select className="select" name="format" value={format} onChange={(event) => onFormatChange(event.target.value)}>
        {FORMAT_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {formatLabel(value, lang)}
          </option>
        ))}
      </select>

      <input
        className="input"
        name="needed"
        type="number"
        min={1}
        max={8}
        value={needed}
        onChange={(event) => setNeeded(Number(event.target.value))}
        required
      />
    </>
  );
}
