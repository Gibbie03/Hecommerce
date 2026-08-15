import type { OpeningHours } from "@/lib/types";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function isOpenNow(hours: OpeningHours | null | undefined, now: Date = new Date()): boolean | null {
  if (!hours) return null;
  const dayKey = DAY_KEYS[now.getDay()] ?? "sun";
  const today = hours[dayKey];
  if (!today) return null;
  if (today.closed) return false;

  const openParts = today.open.split(":");
  const closeParts = today.close.split(":");
  const openH = Number(openParts[0] ?? "");
  const openM = Number(openParts[1] ?? "");
  const closeH = Number(closeParts[0] ?? "");
  const closeM = Number(closeParts[1] ?? "");
  if ([openH, openM, closeH, closeM].some((n) => Number.isNaN(n))) return null;

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  return minutesNow >= openMinutes && minutesNow < closeMinutes;
}

export function todayHoursLabel(hours: OpeningHours | null | undefined, now: Date = new Date()): string {
  if (!hours) return "Unknown";
  const dayKey = DAY_KEYS[now.getDay()] ?? "sun";
  const today = hours[dayKey];
  if (!today) return "Unknown";
  if (today.closed) return "Closed today";
  return `${today.open} – ${today.close}`;
}

export const DAY_LABELS: Record<(typeof DAY_KEYS)[number], string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const ORDERED_DAY_KEYS: (typeof DAY_KEYS)[number][] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];
