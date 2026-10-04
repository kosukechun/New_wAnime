import { requestJson } from "../http";
import { jstToday } from "../dates";
import { normalizeGenres, plainText } from "../normalize";
import type { WorkRecord } from "./types";
type Anime = {
  id: number;
  title: string;
  main_picture?: { large: string };
  alternative_titles?: { ja?: string; en?: string; synonyms?: string[] };
  synopsis?: string;
  start_date?: string;
  end_date?: string;
  status: string;
  genres?: Array<{ name: string }>;
  studios?: Array<{ name: string }>;
  source?: string;
  num_episodes?: number;
  average_episode_duration?: number;
  start_season?: { year: number; season: string };
  popularity?: number;
};
export async function collectMal(
  maxWorks: number,
  consume: (w: WorkRecord) => Promise<void>,
  report: (m: string) => void,
) {
  if (!process.env.MAL_CLIENT_ID) return;
  const today = jstToday();
  const year = Number(today.slice(0, 4));
  const quarter = Math.floor((Number(today.slice(5, 7)) - 1) / 3);
  const names = ["winter", "spring", "summer", "fall"];
  let count = 0;
  for (let offset = -1; offset <= 4; offset++) {
    const absolute = year * 4 + quarter + offset;
    const y = Math.floor(absolute / 4);
    const season = names[absolute % 4];
    try {
      const res = await requestJson<{ data: Array<{ node: Anime }> }>(
        `https://api.myanimelist.net/v2/anime/season/${y}/${season}?limit=50&sort=anime_num_list_users&fields=alternative_titles,synopsis,start_date,end_date,status,genres,studios,source,num_episodes,average_episode_duration,start_season,popularity`,
        { headers: { "X-MAL-CLIENT-ID": process.env.MAL_CLIENT_ID } },
        1200,
      );
      for (const { node: m } of res.data) {
        const record: WorkRecord = {
          source: "MAL",
          externalId: String(m.id),
          title: m.alternative_titles?.ja || m.title,
          englishTitle: m.alternative_titles?.en,
          originalTitle: m.title,
          aliases: m.alternative_titles?.synonyms ?? [],
          synopsis: plainText(m.synopsis),
          posterUrl: m.main_picture?.large,
          category: "ANIME",
          status:
            m.status === "currently_airing"
              ? "AIRING"
              : m.status === "finished_airing"
                ? "FINISHED"
                : "PLANNED",
          worldPremiere: m.start_date?.length === 10 ? m.start_date : null,
          declaredYear: m.start_date ? Number(m.start_date.slice(0, 4)) : null,
          declaredMonth:
            m.start_date && m.start_date.length >= 7
              ? Number(m.start_date.slice(5, 7))
              : null,
          endDate: m.end_date?.length === 10 ? m.end_date : null,
          season: m.start_season?.season.toUpperCase(),
          seasonYear: m.start_season?.year,
          sourceMedium: m.source?.toUpperCase(),
          episodeCount: m.num_episodes || null,
          runtimeMinutes: m.average_episode_duration
            ? Math.round(m.average_episode_duration / 60)
            : null,
          popularity: m.popularity ? 1 / m.popularity : 0,
          sourceUrl: `https://myanimelist.net/anime/${m.id}`,
          genres: normalizeGenres(m.genres?.map((g) => g.name) ?? []),
          companies: m.studios?.map((s) => s.name) ?? [],
        };
        await consume(record);
        if (++count >= maxWorks) return;
      }
    } catch {
      report(`MAL ${y}/${season} の取得失敗。Client IDを確認してください。`);
    }
  }
}
