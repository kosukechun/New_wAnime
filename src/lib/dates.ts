export function jstToday(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function isoDate(date: Date | string | null | undefined) {
  if (!date) return null;
  return typeof date === "string"
    ? date.slice(0, 10)
    : date.toISOString().slice(0, 10);
}
export function parseDate(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(d.getTime()) && isoDate(d) === value ? d : null;
}
export function addDays(date: string, amount: number) {
  const d = parseDate(date)!;
  d.setUTCDate(d.getUTCDate() + amount);
  return isoDate(d)!;
}
export function monthRange(year: number, month: number) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
}
export function jstParts(instant: string) {
  const d = new Date(instant);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return { date: parts.slice(0, 10), time: parts.slice(11, 16) };
}
export function dateLabel(value: Date | string | null | undefined) {
  const iso = isoDate(value);
  return iso
    ? `${iso.slice(0, 4)}年${Number(iso.slice(5, 7))}月${Number(iso.slice(8, 10))}日`
    : "未発表";
}
export function timestampLabel(value: Date | string | null | undefined) {
  if (!value) return "未取得";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function weekStart(date: string) {
  const weekday = parseDate(date)!.getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}
