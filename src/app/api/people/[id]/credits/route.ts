import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  apiRoute,
  checkOrigin,
  requireUser,
  rateLimit,
  readBody,
  ApiError,
} from "@/lib/api";
import { requestJson } from "@/lib/http";
import { saveWork } from "@/lib/collector/store";
import { refreshTvmaze } from "@/lib/collector/tvmaze";
import { refreshTmdb, tmdbGet } from "@/lib/collector/tmdb";
import { acquireLease } from "@/lib/collector/sync";
import { z } from "zod";
export const dynamic = "force-dynamic";
export const maxDuration = 900;
export const POST = apiRoute(async (req) => {
  checkOrigin(req);
  const u = await requireUser();
  await rateLimit(`credits:${u.id}`, 4, 60);
  const { offset } = z
    .object({ offset: z.number().int().min(0).max(500).default(0) })
    .parse(await readBody(req));
  const id = new URL(req.url).pathname.split("/").at(-2)!;
  const p = await db.person.findUnique({
    where: { id },
    include: { externalIds: true },
  });
  if (!p) throw new ApiError("人物が見つかりません", 404);
  const source =
    p.externalIds.find((x) => x.source === "TVMAZE") ??
    (process.env.TMDB_READ_TOKEN
      ? p.externalIds.find((x) => x.source === "TMDB")
      : undefined);
  if (!source || !/^\d+$/.test(source.externalId))
    throw new ApiError(
      "この取得元の出演作品は、全体収集で更新してください",
      400,
    );
  const owner = await acquireLease(`person:${id}`, 10);
  if (!owner) throw new ApiError("この人物の作品を取得中です", 409);
  let created = 0,
    updated = 0,
    errors = 0,
    total = 0;
  try {
    if (source.source === "TVMAZE") {
      const rows = await requestJson<
        Array<{
          _embedded?: {
            show?: { id: number; type: string };
            character?: { name: string; image?: { medium?: string } };
          };
        }>
      >(
        `https://api.tvmaze.com/people/${source.externalId}/castcredits?embed[]=show&embed[]=character`,
      );
      const unique = rows.filter(
        (r, i) =>
          r._embedded?.show &&
          ["Scripted", "Animation"].includes(r._embedded.show.type) &&
          rows.findIndex(
            (x) => x._embedded?.show?.id === r._embedded?.show?.id,
          ) === i,
      );
      total = unique.length;
      for (const r of unique.slice(offset, offset + 30)) {
        try {
          const w = await refreshTvmaze(String(r._embedded!.show!.id));
          if (
            !w.people?.some(
              (c) =>
                c.source === source.source &&
                c.externalId === source.externalId,
            )
          ) {
            w.people ??= [];
            w.people.push({
              source: source.source,
              externalId: source.externalId,
              name: p.name,
              nativeName: p.nativeName,
              aliases: p.aliases,
              kind: p.kind,
              photoUrl: p.photoUrl,
              sourceUrl: p.sourceUrl,
              role: r._embedded?.character?.name ?? "役名未確認",
              characterImage: r._embedded?.character?.image?.medium,
            });
          }
          const saved = await saveWork(w);
          if (saved === "created") created++;
          if (saved === "updated") updated++;
        } catch {
          errors++;
        }
      }
    } else {
      const rows = await tmdbGet<{ cast: Array<{ id: number }> }>(
        `/person/${source.externalId}/tv_credits`,
      );
      const ids = [...new Set(rows.cast.map((c) => c.id))];
      total = ids.length;
      for (const workId of ids.slice(offset, offset + 30)) {
        try {
          const saved = await saveWork(await refreshTmdb(String(workId)));
          if (saved === "created") created++;
          if (saved === "updated") updated++;
        } catch {
          errors++;
        }
      }
    }
    return NextResponse.json({
      created,
      updated,
      errors,
      total,
      nextOffset: offset + 30 < total ? offset + 30 : null,
    });
  } finally {
    await db.lease.deleteMany({ where: { name: `person:${id}`, owner } });
  }
});
