import { requestJson } from "./http";
import { db } from "./db";
import { normalizeText, plainText } from "./normalize";
import { isoDate } from "./dates";
import type { Person, PersonExternalId } from "@/generated/prisma/client";
type Claim = {
  rank?: string;
  mainsnak: {
    datavalue?: {
      value: string | { id?: string; time?: string; precision?: number };
    };
  };
};
export type WikiEntity = {
  id: string;
  labels?: Record<string, { value: string }>;
  aliases?: Record<string, Array<{ value: string }>>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, Claim[]>;
  sitelinks?: Record<string, { title: string; url: string }>;
};
const properties: Record<string, string> = { TMDB: "P4985", ANILIST: "P11227" };
const occupations = new Set(["Q33999", "Q10800557", "Q2405480", "Q947873"]);
export function matchesWikiPerson(
  person: Pick<Person, "name" | "nativeName" | "aliases" | "birthday"> & {
    externalIds: Pick<PersonExternalId, "source" | "externalId">[];
  },
  e: WikiEntity,
  props = properties,
) {
  const values = (p: string) =>
    (e.claims?.[p] ?? [])
      .filter((c) => c.rank !== "deprecated")
      .map((c) => c.mainsnak.datavalue?.value);
  if (!values("P31").some((v) => typeof v === "object" && v?.id === "Q5"))
    return false;
  if (
    person.externalIds.some(
      (x) =>
        props[x.source] &&
        values(props[x.source]).some((v) => v === x.externalId),
    )
  )
    return true;
  const labels = [
    ...Object.values(e.labels ?? {}).map((v) => v.value),
    ...Object.values(e.aliases ?? {})
      .flat()
      .map((v) => v.value),
  ].map(normalizeText);
  const sameName = [person.name, person.nativeName, ...person.aliases]
    .filter((v): v is string => !!v)
    .some((n) => labels.includes(normalizeText(n)));
  const birthday = isoDate(person.birthday);
  const sameBirthday =
    birthday &&
    values("P569").some(
      (v) =>
        typeof v === "object" &&
        v?.precision === 11 &&
        v.time?.slice(1, 11) === birthday,
    );
  return !!(
    sameName &&
    sameBirthday &&
    values("P106").some(
      (v) => typeof v === "object" && v.id && occupations.has(v.id),
    )
  );
}
export async function tvmazeProperty() {
  if (properties.TVMAZE) return;
  const result = await requestJson<{
    search: Array<{ id: string; label: string }>;
  }>(
    "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=TV%20Maze%20person%20ID&language=en&type=property&format=json",
  );
  const p = result.search.find(
    (p) => p.label.toLowerCase().replace(/\s/g, "") === "tvmazepersonid",
  );
  if (p && /^P\d+$/.test(p.id)) properties.TVMAZE = p.id;
}
async function loadBiography<T extends Person>(p: T): Promise<T> {
  if (!p.wikipediaUrl || p.biography) return p;
  try {
    const u = new URL(p.wikipediaUrl);
    if (u.hostname !== "ja.wikipedia.org" || !u.pathname.startsWith("/wiki/"))
      return p;
    const title = decodeURIComponent(u.pathname.slice(6));
    const result = await requestJson<{
      query?: { pages: Array<{ extract?: string }> };
    }>(
      `https://ja.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&format=json&formatversion=2`,
    );
    const biography = plainText(result.query?.pages[0]?.extract);
    if (biography) {
      await db.person.update({ where: { id: p.id }, data: { biography } });
      return { ...p, biography };
    }
  } catch {
    /* 確認済みリンクは維持し、本文を創作しない。 */
  }
  return p;
}
export async function ensureWikipedia(id: string) {
  const p = await db.person.findUnique({
    where: { id },
    include: { externalIds: true },
  });
  if (!p) return null;
  if (p.wikiCheckedAt && Date.now() - p.wikiCheckedAt.getTime() < 7 * 86400000)
    return await loadBiography(p);
  try {
    await tvmazeProperty();
    let search = await requestJson<{ search: Array<{ id: string }> }>(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(p.nativeName ?? p.name)}&language=ja&uselang=ja&limit=8&format=json`,
    );
    if (!search.search.length)
      search = await requestJson<{ search: Array<{ id: string }> }>(
        `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(p.name)}&language=en&limit=8&format=json`,
      );
    if (!search.search.length)
      return await db.person.update({
        where: { id },
        data: { wikiCheckedAt: new Date() },
      });
    const result = await requestJson<{ entities: Record<string, WikiEntity> }>(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${search.search.map((s) => s.id).join("|")}&props=labels|aliases|descriptions|claims|sitelinks/urls&languages=ja|en&format=json`,
    );
    const matches = Object.values(result.entities).filter((e) =>
      matchesWikiPerson(p, e),
    );
    const e = matches.length === 1 ? matches[0] : null;
    const url = e?.sitelinks?.jawiki?.url;
    let wikiUrl: string | null = null;
    if (url) {
      const u = new URL(url);
      if (u.protocol === "https:" && u.hostname === "ja.wikipedia.org")
        wikiUrl = u.toString();
    }
    const nativeName = e?.labels?.ja?.value;
    const updated = await db.person.update({
      where: { id },
      data: {
        wikipediaUrl: wikiUrl,
        wikidataId: e?.id ?? null,
        wikiCheckedAt: new Date(),
        ...(nativeName
          ? {
              nativeName,
              aliases: [...new Set([...p.aliases, p.name, nativeName])],
            }
          : {}),
      },
    });
    return await loadBiography(updated);
  } catch {
    return p;
  }
}
export async function enrichPeople(limit = 200, personIds?: string[]) {
  await tvmazeProperty();
  const people = await db.person.findMany({
    where: personIds
      ? { id: { in: personIds } }
      : {
          OR: [
            { wikiCheckedAt: null },
            { wikiCheckedAt: { lt: new Date(Date.now() - 30 * 86400000) } },
          ],
        },
    include: { externalIds: true },
    take: limit,
    orderBy: { name: "asc" },
  });
  let verified = 0;
  for (const [source, property] of Object.entries(properties)) {
    const ids = people.flatMap((p) =>
      p.externalIds
        .filter((x) => x.source === source && /^\d+$/.test(x.externalId))
        .map((x) => ({ person: p, id: x.externalId })),
    );
    for (let offset = 0; offset < ids.length; offset += 75) {
      const batch = ids.slice(offset, offset + 75);
      const query = `SELECT ?person ?externalId ?label ?article WHERE { VALUES ?externalId { ${batch.map((x) => JSON.stringify(x.id)).join(" ")} } ?person wdt:${property} ?externalId; wdt:P31 wd:Q5 . OPTIONAL { ?person rdfs:label ?label FILTER(LANG(?label)="ja") } OPTIONAL { ?article schema:about ?person; schema:isPartOf <https://ja.wikipedia.org/> . } }`;
      const result = await requestJson<{
        results: {
          bindings: Array<{
            person: { value: string };
            externalId: { value: string };
            label?: { value: string };
            article?: { value: string };
          }>;
        };
      }>(
        `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`,
        { headers: { Accept: "application/sparql-results+json" } },
        1500,
      );
      for (const x of batch) {
        const matches = result.results.bindings.filter(
          (b) => b.externalId.value === x.id,
        );
        // ID重複や複数人なら自動で紐付けない。
        const m = matches.length === 1 ? matches[0] : null;
        const article = m?.article?.value;
        const nativeName = m?.label?.value;
        const validUrl =
          article && new URL(article).hostname === "ja.wikipedia.org"
            ? article
            : null;
        await db.person.update({
          where: { id: x.person.id },
          data: {
            wikiCheckedAt: new Date(),
            ...(m
              ? {
                  wikidataId: m.person.value.split("/").at(-1),
                  wikipediaUrl: validUrl,
                  ...(nativeName
                    ? {
                        nativeName,
                        aliases: [
                          ...new Set([
                            ...x.person.aliases,
                            x.person.name,
                            nativeName,
                          ]),
                        ],
                      }
                    : {}),
                }
              : {}),
          },
        });
        if (m) verified++;
      }
    }
  }
  return { checked: people.length, verified };
}
export async function wikiPersonCandidates(query: string) {
  await tvmazeProperty();
  const search = await requestJson<{ search: Array<{ id: string }> }>(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=ja&uselang=ja&limit=8&format=json`,
  );
  if (!search.search.length) return [];
  const result = await requestJson<{ entities: Record<string, WikiEntity> }>(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${search.search.map((s) => s.id).join("|")}&props=labels|claims&languages=ja|en&format=json`,
  );
  return Object.values(result.entities)
    .filter((e) =>
      e.claims?.P31?.some(
        (c) =>
          typeof c.mainsnak.datavalue?.value === "object" &&
          c.mainsnak.datavalue.value.id === "Q5",
      ),
    )
    .flatMap((e) =>
      Object.entries(properties).flatMap(([source, property]) =>
        (e.claims?.[property] ?? []).flatMap((c) => {
          const value = c.mainsnak.datavalue?.value;
          return typeof value === "string" && /^\d+$/.test(value)
            ? [
                {
                  source,
                  externalId: value,
                  name:
                    e.labels?.ja?.value ?? e.labels?.en?.value ?? "氏名未確認",
                },
              ]
            : [];
        }),
      ),
    );
}
