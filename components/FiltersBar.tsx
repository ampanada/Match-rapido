import { FORMAT_OPTIONS, LEVEL_OPTIONS, formatLabel, levelLabel } from "@/lib/constants/filters";

interface FiltersBarProps {
  selectedFormat?: string;
  selectedLevel?: string;
  todayOnly?: boolean;
  lang: "es" | "ko";
}

export default function FiltersBar({ selectedFormat, selectedLevel, todayOnly, lang }: FiltersBarProps) {
  const copy =
    lang === "ko"
      ? {
          all: "전체",
          allLevel: "전체 레벨",
          todayOnly: "오늘 매칭만 보기",
          apply: "적용"
        }
      : {
          all: "Todo",
          allLevel: "Todos los niveles",
          todayOnly: "Solo hoy",
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

      <select name="level" defaultValue={selectedLevel ?? ""} className="input">
        <option value="">{copy.allLevel}</option>
        {LEVEL_OPTIONS.map((value) => (
          <option key={value} value={value}>
            {levelLabel(value, lang)}
          </option>
        ))}
      </select>

      <label className="quick-filter">
        <input type="checkbox" name="todayOnly" value="1" defaultChecked={todayOnly} />
        {copy.todayOnly}
      </label>

      <button type="submit" className="button">
        {copy.apply}
      </button>
    </form>
  );
}
