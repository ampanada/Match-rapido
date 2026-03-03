import { FORMAT_OPTIONS, formatLabel } from "@/lib/constants/filters";

interface FiltersBarProps {
  selectedFormat?: string;
  lang: "es" | "ko";
}

export default function FiltersBar({ selectedFormat, lang }: FiltersBarProps) {
  const copy =
    lang === "ko"
      ? {
          all: "전체",
          apply: "적용"
        }
      : {
          all: "Todo",
          apply: "Aplicar"
        };

  return (
    <form className="filters" method="get" action="/">
      <select name="format" defaultValue={selectedFormat ?? ""} className="input">
        <option value="">{copy.all}</option>
        {FORMAT_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {formatLabel(value, lang)}
          </option>
        ))}
      </select>

      <button type="submit" className="button">
        {copy.apply}
      </button>
    </form>
  );
}
