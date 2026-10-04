import { GENRES, PLATFORMS } from "./constants";
export function normalizeText(s: string) {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s・._-]/g, "");
}
const genreMap: Record<string, string[]> = {
  action: ["action"],
  adventure: ["adventure"],
  fantasy: ["fantasy"],
  isekai: ["isekai"],
  "science-fiction": ["sf"],
  "sci-fi": ["sf"],
  "sci fi": ["sf"],
  comedy: ["comedy"],
  romance: ["romance"],
  "romantic comedy": ["romcom", "romance", "comedy"],
  mystery: ["mystery"],
  thriller: ["suspense"],
  suspense: ["suspense"],
  horror: ["horror"],
  "slice of life": ["slice-of-life"],
  school: ["school"],
  sports: ["sports"],
  sport: ["sports"],
  music: ["music"],
  historical: ["history"],
  history: ["history"],
  medical: ["medical"],
  crime: ["police"],
  drama: ["human"],
  supernatural: ["fantasy"],
  idol: ["idol"],
  idols: ["idol"],
};
export function normalizeGenres(values: string[]) {
  return [
    ...new Set(
      values.flatMap(
        (v) =>
          genreMap[v.toLowerCase()] ??
          GENRES.filter(([id, name]) => id === v || name === v).map(
            ([id]) => id,
          ),
      ),
    ),
  ];
}
export function platformId(name: string, externalId?: number) {
  const n = normalizeText(name);
  const p = PLATFORMS.find(([, label]) => normalizeText(label) === n);
  if (p) return p[0];
  if (n.includes("amazon") || n.includes("primevideo")) return "prime";
  if (n.includes("netflix")) return "netflix";
  if (n.includes("disney")) return "disney";
  if (n.includes("apple")) return "apple";
  if (n.includes("dアニメ")) return "danime";
  return `tmdb-${externalId ?? n}`;
}
export function plainText(value: string | null | undefined) {
  return (
    value
      ?.replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}
export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}
