import { z } from "zod";
import { requestJson } from "../http";
import { addDays, jstToday } from "../dates";
import { normalizeGenres, plainText, platformId, safeUrl } from "../normalize";
import type { WorkRecord, OfferRecord } from "./types";
const api = "https://api.themoviedb.org/3";
export function tmdbGet<T>(path: string): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new Error("TMDB_READ_TOKEN が未設定です");
  return requestJson<T>(
    `${api}${path}${path.includes("?") ? "&" : "?"}language=ja-JP`,
    { headers: { Authorization: `Bearer ${token}` } },
    300,
  );
}
const provider = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: z.string().nullable(),
});
export const providerSchema = z.object({
  results: z.record(
    z.string(),
    z.object({
      link: z.string().optional(),
      flatrate: z.array(provider).optional(),
      rent: z.array(provider).optional(),
      buy: z.array(provider).optional(),
      free: z.array(provider).optional(),
      ads: z.array(provider).optional(),
    }),
  ),
});
export function normalizeTmdbOffers(
  data: z.infer<typeof providerSchema>,
  id: number,
): OfferRecord[] {
  const jp = data.results.JP;
  if (!jp) return [];
  const types = {
    flatrate: "SUBSCRIPTION",
    rent: "RENT",
    buy: "BUY",
    free: "FREE",
    ads: "ADS",
  } as const;
  const offers = Object.entries(types).flatMap(([key, type]) =>
    (jp[key as keyof typeof types] ?? []).map((p) => ({
      platformId: platformId(p.provider_name, p.provider_id),
      name: p.provider_name,
      logoUrl: p.logo_path
        ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
        : null,
      region: "JP",
      type,
      watchUrl: null,
      availabilityUrl: safeUrl(jp.link),
      sourceUrl: `https://www.themoviedb.org/tv/${id}/watch?locale=JP`,
    })),
  );
  return offers.filter(
    (o, i) =>
      offers.findIndex(
        (x) => x.platformId === o.platformId && x.type === o.type,
      ) === i,
  );
}
const tvSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string(),
  overview: z.string().nullable(),
  poster_path: z.string().nullable(),
  first_air_date: z.string().optional(),
  last_air_date: z.string().optional(),
  status: z.string(),
  origin_country: z.array(z.string()),
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
  number_of_episodes: z.number().optional(),
  episode_run_time: z.array(z.number()).optional(),
  homepage: z.string().nullable(),
  popularity: z.number().optional(),
  production_companies: z.array(z.object({ name: z.string() })).optional(),
  created_by: z.array(z.object({ name: z.string() })).optional(),
  external_ids: z
    .object({
      imdb_id: z.string().nullable().optional(),
      tvdb_id: z.number().nullable().optional(),
    })
    .optional(),
  credits: z
    .object({
      cast: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          original_name: z.string().optional(),
          character: z.string(),
          profile_path: z.string().nullable(),
        }),
      ),
    })
    .optional(),
  videos: z
    .object({
      results: z.array(
        z.object({ site: z.string(), key: z.string(), type: z.string() }),
      ),
    })
    .optional(),
  alternative_titles: z
    .object({ results: z.array(z.object({ title: z.string() })) })
    .optional(),
});
export async function refreshTmdb(id: string): Promise<WorkRecord> {
  const s = tvSchema.parse(
    await tmdbGet(
      `/tv/${Number(id)}?append_to_response=external_ids,credits,videos,alternative_titles`,
    ),
  );
  const providers = providerSchema.parse(
    await tmdbGet(`/tv/${s.id}/watch/providers`),
  );
  const crossIds = [];
  if (s.external_ids?.imdb_id)
    crossIds.push({ source: "IMDB", externalId: s.external_ids.imdb_id });
  if (s.external_ids?.tvdb_id)
    crossIds.push({
      source: "THETVDB",
      externalId: String(s.external_ids.tvdb_id),
    });
  const trailer = s.videos?.results.find(
    (v) =>
      v.site === "YouTube" &&
      v.type === "Trailer" &&
      /^[a-zA-Z0-9_-]+$/.test(v.key),
  );
  const genreIds: Record<number, string[]> = {
    10759: ["action", "adventure"],
    35: ["comedy"],
    18: ["human"],
    9648: ["mystery"],
    10765: ["sf", "fantasy"],
    80: ["police"],
    10768: ["history"],
  };
  const genres = [
    ...new Set([
      ...s.genres.flatMap((g) => genreIds[g.id] ?? []),
      ...normalizeGenres(s.genres.map((g) => g.name)),
    ]),
  ];
  return {
    source: "TMDB",
    externalId: String(s.id),
    crossIds,
    title: s.name,
    originalTitle: s.original_name,
    aliases: s.alternative_titles?.results.map((t) => t.title) ?? [],
    synopsis: plainText(s.overview),
    posterUrl: s.poster_path
      ? `https://image.tmdb.org/t/p/w500${s.poster_path}`
      : null,
    category: s.genres.some((g) => g.id === 16)
      ? "ANIME"
      : s.origin_country.includes("JP")
        ? "DOMESTIC_DRAMA"
        : "FOREIGN_DRAMA",
    status:
      s.status === "Ended" || s.status === "Canceled"
        ? "FINISHED"
        : s.status === "Planned" || s.status === "In Production"
          ? "PLANNED"
          : s.status === "Returning Series"
            ? "AIRING"
            : "UNKNOWN",
    // TMDB first_air_date は世界初公開日。日本開始日は公式登録または日本番組表から取得。
    worldPremiere: s.first_air_date || null,
    episodeCount: s.number_of_episodes,
    runtimeMinutes: s.episode_run_time?.[0],
    officialUrl: safeUrl(s.homepage),
    trailerUrl: trailer
      ? `https://www.youtube.com/watch?v=${trailer.key}`
      : null,
    popularity: s.popularity,
    sourceUrl: `https://www.themoviedb.org/tv/${s.id}`,
    genres,
    companies: s.production_companies?.map((c) => c.name) ?? [],
    metadata: { creators: s.created_by?.map((c) => c.name) ?? [] },
    offers: normalizeTmdbOffers(providers, s.id),
    people: s.credits?.cast.slice(0, 60).map((p) => ({
      source: "TMDB",
      externalId: String(p.id),
      name: p.name,
      aliases: p.original_name ? [p.original_name] : [],
      kind: s.genres.some((g) => g.id === 16) ? "VOICE_ACTOR" : "ACTOR",
      photoUrl: p.profile_path
        ? `https://image.tmdb.org/t/p/w185${p.profile_path}`
        : null,
      sourceUrl: `https://www.themoviedb.org/person/${p.id}`,
      role: p.character || "役名未発表",
    })),
  };
}
export async function collectTmdb(
  maxWorks: number,
  consume: (w: WorkRecord) => Promise<void>,
  report: (m: string) => void,
) {
  if (!process.env.TMDB_READ_TOKEN) return;
  const today = jstToday();
  const ids = new Set<number>();
  for (const region of ["JP", ""]) {
    for (let page = 1; page <= 3; page++) {
      try {
        const data = await tmdbGet<{
          results: Array<{ id: number }>;
          total_pages: number;
        }>(
          `/discover/tv?first_air_date.gte=${addDays(today, -100)}&first_air_date.lte=${addDays(today, 366)}&sort_by=popularity.desc&with_genres=18|10759|10765&without_genres=16&${region ? "with_origin_country=JP&" : ""}page=${page}`,
        );
        data.results.forEach((v) => ids.add(v.id));
        if (page >= data.total_pages) break;
      } catch {
        report(
          "TMDB新作一覧の取得に失敗しました。トークンと取得ログを確認してください。",
        );
        break;
      }
    }
  }
  for (const id of [...ids].slice(0, maxWorks)) {
    try {
      await consume(await refreshTmdb(String(id)));
    } catch {
      report(`TMDB作品 ${id} の取得・保存失敗`);
    }
  }
}
export async function tmdbIdFromImdb(imdb: string) {
  const result = await tmdbGet<{ tv_results: Array<{ id: number }> }>(
    `/find/${encodeURIComponent(imdb)}?external_source=imdb_id`,
  );
  return result.tv_results.length === 1 ? result.tv_results[0].id : null;
}
