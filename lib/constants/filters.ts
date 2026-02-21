export const FORMAT_OPTIONS = ["single", "double", "rally"] as const;
export const LEVEL_OPTIONS = ["beginner", "intermediate", "advanced"] as const;
export const TIME_RANGE_OPTIONS = ["morning", "afternoon", "evening", "night"] as const;

export type MatchFormat = (typeof FORMAT_OPTIONS)[number];
export type MatchLevel = (typeof LEVEL_OPTIONS)[number];
export type TimeRange = (typeof TIME_RANGE_OPTIONS)[number];

export function formatLabel(value: string, locale: "ko" | "en" | "es" = "es") {
  const map = {
    single: locale === "ko" ? "단식" : locale === "es" ? "Individual" : "Single",
    double: locale === "ko" ? "복식" : locale === "es" ? "Dobles" : "Double",
    rally: locale === "ko" ? "랠리" : locale === "es" ? "Rally" : "Rally"
  } as const;

  return map[value as keyof typeof map] ?? value;
}

export function levelLabel(value: string, locale: "ko" | "en" | "es" = "es") {
  const map = {
    beginner: locale === "ko" ? "초급" : locale === "es" ? "Principiante" : "Beginner",
    intermediate: locale === "ko" ? "중급" : locale === "es" ? "Intermedio" : "Intermediate",
    advanced: locale === "ko" ? "상급" : locale === "es" ? "Avanzado" : "Advanced"
  } as const;

  return map[value as keyof typeof map] ?? value;
}
