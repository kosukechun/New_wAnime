import { beforeAll, afterAll, it, expect } from "vitest";
import { db } from "../../src/lib/db";
import { seedTaxonomy, saveWork } from "../../src/lib/collector/store";
import { buildWorkWhere, parseSearch } from "../../src/lib/search";
import { randomUUID } from "node:crypto";
import type { WorkRecord } from "../../src/lib/collector/types";
import { acquireLease } from "../../src/lib/collector/sync";
const id = randomUUID();
const record: WorkRecord = {
  source: "TVMAZE",
  externalId: `test-${id}`,
  crossIds: [{ source: "IMDB", externalId: `test-imdb-${id}` }],
  title: `DBテスト-${id}`,
  aliases: ["英語の別名"],
  category: "ANIME",
  status: "PLANNED",
  worldPremiere: "2027-04-02",
  jpPremiere: "2027-04-05",
  season: "SPRING",
  seasonYear: 2027,
  sourceUrl: "https://example.com/source",
  genres: ["fantasy", "isekai"],
  companies: ["テスト制作会社"],
  offers: [
    {
      platformId: "netflix",
      name: "Netflix",
      region: "JP",
      type: "SUBSCRIPTION",
      sourceUrl: "https://example.com/provider",
    },
  ],
  people: [
    {
      source: "TVMAZE",
      externalId: `test-person-${id}`,
      name: "テスト声優",
      kind: "VOICE_ACTOR",
      role: "主人公",
      sourceUrl: "https://example.com/person",
    },
  ],
};
beforeAll(async () => {
  await seedTaxonomy();
});
it("同じ収集処理が同時に実行されないようDBで排他する", async () => {
  const name = `test-lease-${id}`;
  const owner = await acquireLease(name, 1);
  try {
    expect(owner).not.toBeNull();
    expect(await acquireLease(name, 1)).toBeNull();
  } finally {
    await db.lease.deleteMany({ where: { name } });
  }
});
afterAll(async () => {
  await db.work.deleteMany({
    where: { title: { startsWith: `DBテスト-${id}` } },
  });
  await db.person.deleteMany({
    where: { externalIds: { some: { externalId: `test-person-${id}` } } },
  });
  await db.company.deleteMany({
    where: { name: "テスト制作会社", works: { none: {} } },
  });
  await db.$disconnect();
});
it("保存・更新・二重登録・外部ID統合・複合検索を実DBで確認する", async () => {
  expect(await saveWork(record)).toBe("created");
  expect(await saveWork(record)).toBe("unchanged");
  const alias = {
    ...record,
    source: "TMDB",
    externalId: `tmdb-${id}`,
    crossIds: record.crossIds,
  };
  expect(await saveWork(alias)).toBe("updated");
  expect(await db.work.count({ where: { title: record.title } })).toBe(1);
  const where = buildWorkWhere(
    parseSearch(
      new URLSearchParams(
        "category=ANIME&year=2027&month=4&season=SPRING&genres=fantasy,isekai&person=テスト声優&platform=netflix&company=テスト制作会社",
      ),
    ),
  );
  const result = await db.work.findMany({ where });
  expect(result.some((w) => w.title === record.title)).toBe(true);
  const work = await db.work.findFirstOrThrow({
    where: { title: record.title },
  });
  expect(await db.changeHistory.count({ where: { workId: work.id } })).toBe(2);
  const official = {
    ...record,
    source: "OFFICIAL",
    externalId: `official-${id}`,
    confidence: "OFFICIAL",
    jpPremiere: "2027-04-12",
  };
  await saveWork(official);
  await saveWork({ ...record, jpPremiere: "2027-04-07" });
  expect(
    (await db.work.findUniqueOrThrow({ where: { id: work.id } })).jpPremiere
      ?.toISOString()
      .slice(0, 10),
  ).toBe("2027-04-12");
  await saveWork({ ...official, offers: [] });
  expect(
    await db.streamingOffer.count({
      where: { workId: work.id, source: "OFFICIAL" },
    }),
  ).toBe(0);
});
it("DBのユーザー単位でマイリストを分離する", async () => {
  const users = await Promise.all(
    ["a", "b"].map((n) =>
      db.user.create({
        data: {
          email: `${n}-${id}@example.com`,
          name: n,
          passwordHash: "unused-test-hash",
        },
      }),
    ),
  );
  const work = await db.work.findFirstOrThrow({
    where: { title: record.title },
  });
  try {
    await db.favorite.create({
      data: { userId: users[0].id, workId: work.id, memo: "個人メモ" },
    });
    expect(await db.favorite.count({ where: { userId: users[1].id } })).toBe(0);
  } finally {
    await db.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  }
});
it("放送中のみ検索は明示状態・日付境界を守り、情報不足では推測しない", async () => {
  const cases = [
    {
      key: "explicit",
      status: "AIRING",
      jpPremiere: "2026-09-01",
      endDate: null,
      included: true,
    },
    {
      key: "unknown-dates",
      status: "AIRING",
      jpPremiere: null,
      endDate: null,
      included: true,
    },
    {
      key: "future",
      status: "AIRING",
      jpPremiere: "2026-10-05",
      endDate: null,
      included: false,
    },
    {
      key: "expired",
      status: "AIRING",
      jpPremiere: "2026-09-01",
      endDate: "2026-10-03",
      included: false,
    },
    {
      key: "estimated",
      status: "UNKNOWN",
      jpPremiere: "2026-10-04",
      endDate: "2026-10-04",
      included: true,
    },
    {
      key: "start-only",
      status: "UNKNOWN",
      jpPremiere: "2020-01-01",
      endDate: null,
      included: false,
    },
    {
      key: "finished",
      status: "FINISHED",
      jpPremiere: "2026-09-01",
      endDate: "2026-12-01",
      included: false,
    },
    {
      key: "delayed",
      status: "DELAYED",
      jpPremiere: "2026-09-01",
      endDate: "2026-12-01",
      included: false,
    },
    {
      key: "planned",
      status: "PLANNED",
      jpPremiere: "2026-09-01",
      endDate: "2026-12-01",
      included: false,
    },
    {
      key: "japan-future",
      status: "AIRING",
      jpPremiere: "2026-10-05",
      worldPremiere: "2026-09-01",
      endDate: null,
      included: false,
    },
  ] as const;
  const works = await Promise.all(
    cases.map((c) =>
      db.work.create({
        data: {
          title: `DBテスト-${id}-airing-${c.key}`,
          category: "ANIME",
          status: c.status,
          sourceUrl: "https://example.com/test-fixture",
          sourceName: "TEST",
          jpPremiere: c.jpPremiere ? new Date(c.jpPremiere) : null,
          worldPremiere:
            "worldPremiere" in c ? new Date(c.worldPremiere) : null,
          endDate: c.endDate ? new Date(c.endDate) : null,
        },
      }),
    ),
  );
  const result = await db.work.findMany({
    where: {
      AND: [
        { id: { in: works.map((w) => w.id) } },
        buildWorkWhere(
          parseSearch(new URLSearchParams("status=AIRING")),
          "2026-10-04",
        ),
      ],
    },
  });
  expect(result.map((w) => w.title).sort()).toEqual(
    cases
      .filter((c) => c.included)
      .map((c) => `DBテスト-${id}-airing-${c.key}`)
      .sort(),
  );
});
