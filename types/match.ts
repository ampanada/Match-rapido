export type SkillLevel = "전체" | "입문" | "초급" | "중급" | "상급";

export interface MatchItem {
  id: string;
  hostName: string;
  hostHandle: string;
  hostWhatsApp: string;
  level: Exclude<SkillLevel, "전체">;
  location: string;
  date: string;
  time: string;
  participants: string;
  caption: string;
}

export interface MatchFilters {
  level?: SkillLevel;
  date?: string;
}
