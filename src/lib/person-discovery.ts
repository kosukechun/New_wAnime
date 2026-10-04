import { requestJson } from "./http";
import { tmdbGet } from "./collector/tmdb";
import { safeUrl, plainText } from "./normalize";
import { z } from "zod";
import { wikiPersonCandidates } from "./wikipedia";
export type PersonCandidate = {
  source: "TVMAZE" | "TMDB";
  externalId: string;
  name: string;
  photoUrl: string | null;
  birthday: string | null;
  sourceUrl: string;
  aliases: string[];
  biography: string | null;
};
const tvPerson = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
  birthday: z.string().nullish(),
  image: z.object({ medium: z.string().nullable() }).nullish(),
});
export async function externalPerson(
  source: "TVMAZE" | "TMDB",
  id: string,
): Promise<PersonCandidate> {
  if (!/^\d+$/.test(id)) throw new Error("外部人物IDが不正です");
  if (source === "TVMAZE") {
    const p = tvPerson.parse(
      await requestJson(`https://api.tvmaze.com/people/${id}`),
    );
    return {
      source,
      externalId: String(p.id),
      name: p.name,
      photoUrl: safeUrl(p.image?.medium),
      birthday: p.birthday ?? null,
      sourceUrl: safeUrl(p.url) ?? `https://www.tvmaze.com/people/${p.id}`,
      aliases: [],
      biography: null,
    };
  }
  const p = z
    .object({
      id: z.number(),
      name: z.string(),
      birthday: z.string().nullable(),
      profile_path: z.string().nullable(),
      biography: z.string().nullable(),
      also_known_as: z.array(z.string()),
    })
    .parse(await tmdbGet(`/person/${id}`));
  return {
    source,
    externalId: String(p.id),
    name: p.name,
    photoUrl: p.profile_path
      ? `https://image.tmdb.org/t/p/w185${p.profile_path}`
      : null,
    birthday: p.birthday,
    sourceUrl: `https://www.themoviedb.org/person/${p.id}`,
    aliases: p.also_known_as,
    biography: plainText(p.biography),
  };
}
export async function discoverPeople(query: string) {
  const found: PersonCandidate[] = [];
  try {
    const res = await requestJson<Array<{ person: unknown }>>(
      `https://api.tvmaze.com/search/people?q=${encodeURIComponent(query)}`,
    );
    for (const r of res.slice(0, 8)) {
      const p = tvPerson.safeParse(r.person);
      if (p.success)
        found.push({
          source: "TVMAZE",
          externalId: String(p.data.id),
          name: p.data.name,
          photoUrl: safeUrl(p.data.image?.medium),
          birthday: p.data.birthday ?? null,
          sourceUrl: p.data.url,
          aliases: [],
          biography: null,
        });
    }
  } catch {}
  if (process.env.TMDB_READ_TOKEN) {
    try {
      const res = await tmdbGet<{ results: Array<{ id: number }> }>(
        `/search/person?query=${encodeURIComponent(query)}`,
      );
      for (const p of res.results.slice(0, 6))
        found.push(await externalPerson("TMDB", String(p.id)));
    } catch {}
  }
  // 日本語名が外部DBに登録されていない場合も、Wikidataの人物IDから取得する。
  try {
    const wiki = await wikiPersonCandidates(query);
    for (const p of wiki.slice(0, 8)) {
      if (p.source !== "TVMAZE" && p.source !== "TMDB") continue;
      if (p.source === "TMDB" && !process.env.TMDB_READ_TOKEN) continue;
      if (
        found.some(
          (x) => x.source === p.source && x.externalId === p.externalId,
        )
      )
        continue;
      found.push(await externalPerson(p.source, p.externalId));
    }
  } catch {}
  return found;
}
