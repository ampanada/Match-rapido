export const CLUB_TIMEZONE = "America/Argentina/Cordoba";
export const SLOT_MINUTES = 90;

export const SLOT_START_TIMES = [
  "09:00",
  "10:30",
  "12:00",
  "13:30",
  "15:00",
  "16:30",
  "18:00",
  "19:30",
  "21:00"
] as const;

export const TIME_RANGE_SLOTS = {
  morning: ["09:00", "10:30"],
  afternoon: ["12:00", "13:30", "15:00"],
  evening: ["16:30", "18:00", "19:30"],
  night: ["21:00"]
} as const;

export type SlotStartTime = (typeof SLOT_START_TIMES)[number];

function parseOffsetMinutes(timeZoneName: string) {
  const match = timeZoneName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);

  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || "0");
  return sign * (hours * 60 + minutes);
}

function getOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit"
  }).formatToParts(date);

  const zone = parts.find((part) => part.type === "timeZoneName")?.value || "GMT+0";
  return parseOffsetMinutes(zone);
}

export function isValidSlotStart(value: string): value is SlotStartTime {
  return SLOT_START_TIMES.includes(value as SlotStartTime);
}

export function toSlotEnd(start: string) {
  const [hour, minute] = start.split(":").map(Number);
  const base = hour * 60 + minute + SLOT_MINUTES;
  const endHour = String(Math.floor(base / 60)).padStart(2, "0");
  const endMinute = String(base % 60).padStart(2, "0");
  return `${endHour}:${endMinute}`;
}

export function formatSlotRange(start: string) {
  return `${start}–${toSlotEnd(start)}`;
}

export function getCordobaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function zonedDateTimeToIso(dateText: string, timeText: string, timeZone = CLUB_TIMEZONE) {
  const [year, month, day] = dateText.split("-").map(Number);
  const [hour, minute] = timeText.split(":").map(Number);

  const localAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  let offset = getOffsetMinutes(new Date(localAsUtcMs), timeZone);
  let utcMs = localAsUtcMs - offset * 60 * 1000;

  const adjustedOffset = getOffsetMinutes(new Date(utcMs), timeZone);

  if (adjustedOffset !== offset) {
    offset = adjustedOffset;
    utcMs = localAsUtcMs - offset * 60 * 1000;
  }

  return new Date(utcMs).toISOString();
}

export function getCordobaHHMM(isoText: string) {
  const date = new Date(isoText);

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: CLUB_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

export function formatCordobaDate(isoText: string, locale = "ko-KR") {
  const date = new Date(isoText);

  return new Intl.DateTimeFormat(locale, {
    timeZone: CLUB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function getCordobaWeekday(dateText: string, locale = "ko-KR") {
  const iso = zonedDateTimeToIso(dateText, "12:00");
  return new Intl.DateTimeFormat(locale, {
    timeZone: CLUB_TIMEZONE,
    weekday: "long"
  }).format(new Date(iso));
}

export function getCordobaDayBoundsIso(dateText: string) {
  return {
    startIso: zonedDateTimeToIso(dateText, "00:00"),
    endIso: zonedDateTimeToIso(dateText, "23:59")
  };
}
