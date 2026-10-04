import { randomUUID } from "node:crypto";
import { db } from "../db";
import { saveWork, seedTaxonomy } from "./store";
import { collectTvmaze, refreshTvmaze } from "./tvmaze";
import { collectTmdb, refreshTmdb, tmdbIdFromImdb } from "./tmdb";
import { collectAnilist, anilistEnabled } from "./anilist";
import { collectMal } from "./mal";
import type { WorkRecord } from "./types";
import { enrichPeople } from "../wikipedia";
export class SyncBusyError extends Error {}
export async function acquireLease(name: string, durationMinutes: number) {
  const owner = randomUUID();
  const rows = await db.$queryRaw<Array<{ owner: string }>>`
    INSERT INTO "Lease" ("name", "owner", "expiresAt") VALUES (${name}, ${owner}, NOW() + ${durationMinutes} * INTERVAL '1 minute')
    ON CONFLICT ("name") DO UPDATE SET "owner" = EXCLUDED."owner", "expiresAt" = EXCLUDED."expiresAt"
    WHERE "Lease"."expiresAt" < NOW() RETURNING "owner"`;
  return rows[0]?.owner === owner ? owner : null;
}
export async function runSync() {
  const owner = await acquireLease("collector", 15);
  if (!owner) throw new SyncBusyError("情報更新が実行中です");
  const run = await db.syncRun.create({ data: { source: "ALL" } });
  let fetched = 0,
    created = 0,
    updated = 0,
    errors = 0;
  const messages: string[] = [];
  const report = (m: string) => {
    errors++;
    if (messages.length < 100) messages.push(m);
  };
  const consume = async (record: WorkRecord) => {
    const result = await saveWork(record);
    fetched++;
    if (result === "created") created++;
    if (result === "updated") updated++;
    await db.lease.updateMany({
      where: { name: "collector", owner },
      data: { expiresAt: new Date(Date.now() + 15 * 60000) },
    });
  };
  const maxWorks = Math.max(
    10,
    Math.min(500, Number(process.env.SYNC_MAX_WORKS) || 160),
  );
  try {
    await seedTaxonomy();
    // 中断された以前のログを残す。
    await db.syncRun.updateMany({
      where: {
        status: "RUNNING",
        id: { not: run.id },
        startedAt: { lt: new Date(Date.now() - 15 * 60000) },
      },
      data: { status: "INTERRUPTED", finishedAt: new Date() },
    });
    const sources = [
      () => collectTvmaze(maxWorks, consume, report),
      () => collectTmdb(maxWorks, consume, report),
      () => collectMal(maxWorks, consume, report),
      () => collectAnilist(maxWorks, consume, report),
    ];
    for (const collect of sources) {
      try {
        await collect();
      } catch {
        report("取得元の処理が失敗しました。保存済みデータは保持しています。");
      }
    }
    // 番組表から消えた作品も更新し、終了・延期などを反映。
    const stale = await db.workExternalId.findMany({
      where: {
        source: "TVMAZE",
        checkedAt: { lt: new Date(Date.now() - 23 * 3600000) },
      },
      orderBy: { checkedAt: "asc" },
      take: 30,
    });
    for (const id of stale) {
      try {
        await consume(await refreshTvmaze(id.externalId));
      } catch {
        report(`保存済みTVmaze作品 ${id.externalId} の更新失敗`);
      }
    }
    if (process.env.TMDB_READ_TOKEN) {
      const staleTmdb = await db.workExternalId.findMany({
        where: {
          source: "TMDB",
          checkedAt: { lt: new Date(Date.now() - 23 * 3600000) },
        },
        orderBy: { checkedAt: "asc" },
        take: 30,
      });
      for (const id of staleTmdb) {
        try {
          await consume(await refreshTmdb(id.externalId));
        } catch {
          report(`保存済みTMDB作品 ${id.externalId} の更新失敗`);
        }
      }
      const anime = await db.work.findMany({
        where: { category: "ANIME", externalIds: { none: { source: "TMDB" } } },
        include: { externalIds: { where: { source: "IMDB" } } },
        take: 50,
      });
      for (const w of anime) {
        const imdb = w.externalIds[0]?.externalId;
        if (!imdb) continue;
        try {
          const id = await tmdbIdFromImdb(imdb);
          if (id) await consume(await refreshTmdb(String(id)));
        } catch {
          report(`作品 ${w.id} の日本配信情報取得失敗`);
        }
      }
    }
    if (!process.env.TMDB_READ_TOKEN)
      messages.push(
        "TMDB未接続：日本の配信サービス・追加ドラマ情報は未確認です。",
      );
    if (!anilistEnabled())
      messages.push("AniList無効：利用許諾を確認してから設定してください。");
    try {
      const wiki = await enrichPeople(200);
      messages.push(
        `Wikidata本人照合：${wiki.checked}人を確認、${wiki.verified}人が外部ID一致`,
      );
    } catch {
      report(
        "Wikidata本人照合に接続できません。Wikipediaリンクと日本語名の確認は次回へ持ち越します。",
      );
    }
    await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return await db.syncRun.update({
      where: { id: run.id },
      data: {
        status: errors ? (fetched ? "PARTIAL" : "FAILED") : "SUCCESS",
        fetched,
        created,
        updated,
        errors,
        messages,
        finishedAt: new Date(),
      },
    });
  } catch {
    return await db.syncRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        fetched,
        created,
        updated,
        errors: errors + 1,
        messages: [
          ...messages,
          "更新処理が停止しました。サーバーログを確認してください。",
        ],
        finishedAt: new Date(),
      },
    });
  } finally {
    await db.lease.deleteMany({ where: { name: "collector", owner } });
  }
}
