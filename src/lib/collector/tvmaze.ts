import { z } from "zod";
import { requestJson } from "../http";
import { addDays, jstParts, jstToday, parseDate } from "../dates";
import { normalizeGenres, plainText, safeUrl } from "../normalize";
import type { WorkRecord, ScheduleRecord } from "./types";
const image = z
  .object({ medium: z.string().nullable(), original: z.string().nullable() })
  .nullish();
const country = z
  .object({ code: z.string(), timezone: z.string().nullish() })
  .nullish();
const channel = z.object({ name: z.string(), country }).nullish();
export const tvShowSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
  type: z.string(),
  language: z.string().nullish(),
  genres: z.array(z.string()),
  status: z.string(),
  premiered: z.string().nullish(),
  ended: z.string().nullish(),
  officialSite: z.string().nullish(),
  summary: z.string().nullish(),
  image,
  runtime: z.number().nullish(),
  averageRuntime: z.number().nullish(),
  weight: z.number().nullish(),
  network: channel,
  webChannel: channel,
  externals: z
    .object({ imdb: z.string().nullish(), thetvdb: z.number().nullish() })
    .optional(),
  schedule: z
    .object({ time: z.string(), days: z.array(z.string()) })
    .optional(),
  _embedded: z
    .object({
      cast: z
        .array(
          z.object({
            person: z.object({
              id: z.number(),
              name: z.string(),
              url: z.string(),
              image,
              birthday: z.string().nullish(),
            }),
            character: z.object({ name: z.string(), image }),
          }),
        )
        .optional(),
    })
    .optional(),
});
type Show = z.infer<typeof tvShowSchema>;
const episodeSchema = z.object({
  id: z.number(),
  url: z.string(),
  airdate: z.string(),
  airtime: z.string(),
  airstamp: z.string().nullish(),
  season: z.number(),
  number: z.number().nullable(),
  show: tvShowSchema.optional(),
  _embedded: z.object({ show: tvShowSchema }).optional(),
});
type Episode = z.infer<typeof episodeSchema>;
export function normalizeTvmaze(
  s: Show,
  episodes: Episode[] = [],
  aliases: string[] = [],
): WorkRecord {
  const isAnime = s.type === "Animation";
  const jp =
    s.network?.country?.code === "JP" || s.webChannel?.country?.code === "JP";
  const countryCode =
    s.network?.country?.code ?? s.webChannel?.country?.code ?? "GLOBAL";
  const domestic = s.language === "Japanese";
  const sourceUrl = s.url;
  const schedules: ScheduleRecord[] = episodes
    .map((ep): ScheduleRecord => {
      const parts =
        countryCode === "JP" && ep.airstamp
          ? jstParts(ep.airstamp)
          : { date: ep.airdate, time: ep.airtime };
      return {
        source: "TVMAZE",
        externalId: String(ep.id),
        kind: s.network ? "TV" : "STREAM",
        region: countryCode,
        date: parts.date,
        time: parts.time || null,
        instant: ep.airstamp,
        seasonNumber: ep.season,
        episodeNumber: ep.number,
        isPremiere: ep.number === 1,
        broadcaster: s.network?.name,
        label: s.webChannel?.name,
        sourceUrl: ep.url,
      };
    })
    .filter((s) => !!parseDate(s.date));
  // 世界公開日を日本公開日に置き換えない。日本語の日本放送局データだけ参考扱い。
  const jpPremiere = jp && domestic ? s.premiered : undefined;
  const crossIds = [];
  if (s.externals?.imdb)
    crossIds.push({ source: "IMDB", externalId: s.externals.imdb });
  if (s.externals?.thetvdb)
    crossIds.push({
      source: "THETVDB",
      externalId: String(s.externals.thetvdb),
    });
  return {
    source: "TVMAZE",
    externalId: String(s.id),
    crossIds,
    title: s.name,
    originalTitle: s.name,
    aliases,
    synopsis: plainText(s.summary),
    posterUrl: safeUrl(s.image?.original),
    category: isAnime ? "ANIME" : domestic ? "DOMESTIC_DRAMA" : "FOREIGN_DRAMA",
    status:
      s.status === "Ended"
        ? "FINISHED"
        : s.status === "To Be Determined"
          ? "UNKNOWN"
          : s.premiered && s.premiered > jstToday()
            ? "PLANNED"
            : s.status === "Running"
              ? "AIRING"
              : "UNKNOWN",
    worldPremiere: s.premiered,
    jpPremiere,
    endDate: s.ended,
    runtimeMinutes: s.averageRuntime ?? s.runtime,
    officialUrl: safeUrl(s.officialSite),
    popularity: s.weight ?? 0,
    sourceUrl,
    genres: normalizeGenres(s.genres),
    companies: [],
    schedules,
    metadata: {
      language: s.language ?? null,
      broadcastDays: s.schedule?.days ?? [],
      broadcastTime: s.schedule?.time ?? null,
      region: countryCode,
    },
    people: s._embedded?.cast?.map((c) => ({
      source: "TVMAZE",
      externalId: String(c.person.id),
      name: c.person.name,
      aliases: [],
      kind: isAnime ? "VOICE_ACTOR" : "ACTOR",
      photoUrl: c.person.image?.medium,
      birthday: c.person.birthday,
      sourceUrl: c.person.url,
      role: c.character.name,
      characterImage: c.character.image?.medium,
    })),
  };
}
export async function collectTvmaze(
  maxWorks: number,
  consume: (w: WorkRecord) => Promise<void>,
  report: (m: string) => void,
) {
  const today = jstToday();
  const since = addDays(today, -100);
  const until = addDays(today, 366);
  const shows = new Map<number, { show: Show; episodes: Episode[] }>();
  const add = (ep: Episode) => {
    const s = ep.show ?? ep._embedded?.show;
    if (!s || !["Animation", "Scripted"].includes(s.type)) return;
    // アニメは日本語または Anime タグ。国外一般アニメーションを混ぜない。
    if (
      s.type === "Animation" &&
      s.language !== "Japanese" &&
      !s.genres.includes("Anime")
    )
      return;
    if (!parseDate(ep.airdate) || ep.airdate < since || ep.airdate > until)
      return;
    const item = shows.get(s.id) ?? { show: s, episodes: [] };
    if (!item.episodes.some((e) => e.id === ep.id)) item.episodes.push(ep);
    shows.set(s.id, item);
  };
  // 未来約12か月の公開済み予定。未発表予定を生成しない。
  try {
    const full = await requestJson<unknown[]>(
      "https://api.tvmaze.com/schedule/full",
    );
    for (const raw of full) {
      const ep = episodeSchema.safeParse(raw);
      if (ep.success) add(ep.data);
    }
  } catch {
    report(
      "TVmaze未来番組表の取得失敗。国内日別番組表と保存済み作品の更新を続行します。",
    );
  }
  for (let offset = -14; offset <= 14; offset++) {
    try {
      const raw = await requestJson<unknown[]>(
        `https://api.tvmaze.com/schedule?country=JP&date=${addDays(today, offset)}`,
      );
      for (const value of raw) {
        const e = episodeSchema.safeParse(value);
        if (e.success) add(e.data);
      }
    } catch {
      report(`TVmaze国内番組表 ${addDays(today, offset)} の取得失敗`);
    }
  }
  const ranked = [...shows.values()].sort((a, b) => {
    const score = (s: Show, es: Episode[]) =>
      (s.language === "Japanese" ? 1000 : 0) +
      (s.premiered && s.premiered >= since ? 200 : 0) +
      (es.some((e) => e.number === 1) ? 100 : 0) +
      (s.weight ?? 0);
    return score(b.show, b.episodes) - score(a.show, a.episodes);
  });
  // 国内作品だけで上限を使い切らないよう、海外の新作にも25%の枠を確保。
  const domestic = ranked.filter((e) => e.show.language === "Japanese");
  const foreign = ranked.filter(
    (e) =>
      e.show.language !== "Japanese" &&
      e.show.type === "Scripted" &&
      ((e.show.premiered && e.show.premiered >= since) ||
        e.episodes.some((ep) => ep.number === 1)),
  );
  const foreignSlots = Math.min(foreign.length, Math.ceil(maxWorks / 4));
  const sorted = [
    ...domestic.slice(0, maxWorks - foreignSlots),
    ...foreign.slice(0, foreignSlots),
  ];
  for (const item of ranked) {
    if (sorted.length >= maxWorks) break;
    if (!sorted.some((e) => e.show.id === item.show.id)) sorted.push(item);
  }
  for (const entry of sorted) {
    try {
      const s = tvShowSchema.parse(
        await requestJson(
          `https://api.tvmaze.com/shows/${entry.show.id}?embed=cast`,
        ),
      );
      const akas = await requestJson<
        Array<{ name: string; country?: { code: string } | null }>
      >(`https://api.tvmaze.com/shows/${s.id}/akas`);
      const record = normalizeTvmaze(
        s,
        entry.episodes,
        akas.map((a) => a.name),
      );
      const ja = akas.find((a) => a.country?.code === "JP")?.name;
      if (ja) {
        record.title = ja;
        record.englishTitle = s.name;
      }
      await consume(record);
    } catch {
      report(`TVmaze作品 ${entry.show.id} の取得・保存失敗`);
    }
  }
  if (!sorted.length)
    report(
      "TVmazeの収集範囲に作品がありません。データを削除せず次回取得を待ちます。",
    );
}
export async function refreshTvmaze(id: string) {
  const s = tvShowSchema.parse(
    await requestJson(`https://api.tvmaze.com/shows/${Number(id)}?embed=cast`),
  );
  const eps = await requestJson<unknown[]>(
    `https://api.tvmaze.com/shows/${s.id}/episodes`,
  );
  const akas = await requestJson<
    Array<{ name: string; country?: { code: string } | null }>
  >(`https://api.tvmaze.com/shows/${s.id}/akas`);
  const record = normalizeTvmaze(
    s,
    eps.flatMap((raw) => {
      const p = episodeSchema.safeParse(raw);
      return p.success ? [p.data] : [];
    }),
    akas.map((a) => a.name),
  );
  const ja = akas.find((a) => a.country?.code === "JP")?.name;
  if (ja) {
    record.title = ja;
    record.englishTitle = s.name;
  }
  record.schedulesComplete = true;
  return record;
}
