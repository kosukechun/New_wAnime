import { requestJson } from "../http";
import { jstToday, parseDate } from "../dates";
import { normalizeGenres, plainText, safeUrl } from "../normalize";
import type { WorkRecord } from "./types";
export function anilistEnabled() {
  return (
    process.env.ANILIST_ENABLED === "true" &&
    process.env.ANILIST_PERMISSION_CONFIRMED === "true"
  );
}
type Media = {
  id: number;
  idMal?: number;
  title: { native?: string; english?: string; romaji: string };
  synonyms: string[];
  description?: string;
  coverImage?: { large: string };
  genres: string[];
  status: string;
  season?: string;
  seasonYear?: number;
  startDate: { year?: number; month?: number; day?: number };
  endDate: { year?: number; month?: number; day?: number };
  episodes?: number;
  duration?: number;
  source?: string;
  popularity?: number;
  siteUrl: string;
  studios: { nodes: Array<{ name: string }> };
  externalLinks: Array<{ type: string; site: string; url: string }>;
  characters: {
    edges: Array<{
      node: { name: { full: string }; image: { medium: string } };
      voiceActors: Array<{
        id: number;
        name: { full: string; native?: string };
        image: { medium: string };
        description?: string;
        siteUrl: string;
      }>;
    }>;
  };
  staff: {
    edges: Array<{
      role: string;
      node: { name: { full: string; native?: string } };
    }>;
  };
};
export function fuzzyDate(d: Media["startDate"]) {
  if (!d.year || !d.month || !d.day) return null;
  const value = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
  return parseDate(value) ? value : null;
}
const fields = `id idMal title { native english romaji } synonyms description coverImage { large } genres status season seasonYear startDate { year month day } endDate { year month day } episodes duration source popularity siteUrl studios(isMain:true) { nodes { name } } externalLinks { type site url } characters(perPage:25) { edges { node { name { full } image { medium } } voiceActors(language:JAPANESE) { id name { full native } image { medium } description siteUrl } } } staff(perPage:15) { edges { role node { name { full native } } } }`;
export function normalizeAnilist(m: Media): WorkRecord {
  const start = fuzzyDate(m.startDate);
  const official = m.externalLinks.find(
    (l) => l.type === "INFO" && l.site === "Official Site",
  );
  return {
    source: "ANILIST",
    externalId: String(m.id),
    crossIds: m.idMal ? [{ source: "MAL", externalId: String(m.idMal) }] : [],
    title: m.title.native ?? m.title.romaji,
    englishTitle: m.title.english,
    originalTitle: m.title.romaji,
    aliases: m.synonyms,
    synopsis: plainText(m.description),
    posterUrl: m.coverImage?.large,
    category: "ANIME",
    status:
      m.status === "NOT_YET_RELEASED"
        ? "PLANNED"
        : m.status === "RELEASING"
          ? "AIRING"
          : m.status === "FINISHED" || m.status === "CANCELLED"
            ? "FINISHED"
            : m.status === "HIATUS"
              ? "DELAYED"
              : "UNKNOWN",
    worldPremiere: start,
    declaredYear: m.startDate.year,
    declaredMonth: m.startDate.month,
    endDate: fuzzyDate(m.endDate),
    season: m.season,
    seasonYear: m.seasonYear,
    sourceMedium: m.source,
    episodeCount: m.episodes,
    runtimeMinutes: m.duration,
    officialUrl: safeUrl(official?.url),
    popularity: m.popularity,
    sourceUrl: m.siteUrl,
    genres: normalizeGenres(m.genres),
    companies: m.studios.nodes.map((s) => s.name),
    // 外部配信リンクは地域や料金区分が未確認なので配信可能サービスへ転記しない。
    metadata: {
      staff: m.staff.edges.map(
        (s) => `${s.role}: ${s.node.name.native ?? s.node.name.full}`,
      ),
    },
    people: m.characters.edges.flatMap((e) =>
      e.voiceActors.map((a) => ({
        source: "ANILIST",
        externalId: String(a.id),
        name: a.name.native ?? a.name.full,
        nativeName: a.name.native,
        aliases: [a.name.full],
        kind: "VOICE_ACTOR",
        photoUrl: a.image.medium,
        biography: plainText(a.description),
        sourceUrl: a.siteUrl,
        role: e.node.name.full,
        characterImage: e.node.image.medium,
      })),
    ),
  };
}
export async function collectAnilist(
  maxWorks: number,
  consume: (w: WorkRecord) => Promise<void>,
  report: (m: string) => void,
) {
  if (!anilistEnabled()) return;
  const currentYear = Number(jstToday().slice(0, 4));
  let count = 0;
  for (const year of [currentYear, currentYear + 1]) {
    for (let page = 1; page <= Math.ceil(maxWorks / 25); page++) {
      try {
        const data = await requestJson<{
          data: {
            Page: { pageInfo: { hasNextPage: boolean }; media: Media[] };
          };
          errors?: unknown[];
        }>(
          "https://graphql.anilist.co",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `query($year:Int,$page:Int){ Page(page:$page,perPage:25){ pageInfo { hasNextPage } media(type:ANIME,seasonYear:$year,format_in:[TV,ONA],sort:POPULARITY_DESC){ ${fields} } } }`,
              variables: { year, page },
            }),
          },
          2200,
        );
        if (data.errors || !data.data) throw new Error("AniList GraphQL error");
        for (const m of data.data.Page.media) {
          await consume(normalizeAnilist(m));
          if (++count >= maxWorks) return;
        }
        if (!data.data.Page.pageInfo.hasNextPage) break;
      } catch {
        report(
          "AniListの取得失敗。許諾、API制限、接続状況を確認してください。",
        );
        break;
      }
    }
  }
}
