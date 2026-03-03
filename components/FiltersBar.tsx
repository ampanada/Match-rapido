import { FORMAT_OPTIONS, formatLabel } from "@/lib/constants/filters";

interface FiltersBarProps {
  selectedFormat?: string;
  todayOnly?: boolean;
  lang: "es" | "ko";
}

export default function FiltersBar({ selectedFormat, todayOnly, lang }: FiltersBarProps) {
  const copy =
    lang === "ko"
      ? {
          all: "전체",
          todayOnly: "매칭 안된 게시글만 보기",
          apply: "적용"
        }
      : {
          all: "Todo",
          todayOnly: "Solo publicaciones sin completar",
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
