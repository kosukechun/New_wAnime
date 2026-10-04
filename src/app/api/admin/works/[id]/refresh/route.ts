import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  apiRoute,
  checkOrigin,
  requireUser,
  rateLimit,
  ApiError,
} from "@/lib/api";
import { refreshTmdb } from "@/lib/collector/tmdb";
import { refreshTvmaze } from "@/lib/collector/tvmaze";
import { saveWork } from "@/lib/collector/store";
export const POST = apiRoute(async (req) => {
  checkOrigin(req);
  const u = await requireUser(true);
  await rateLimit(`refresh:${u.id}`, 20, 10);
  const id = new URL(req.url).pathname.split("/").at(-2)!;
  const source = await db.workExternalId.findFirst({
    where: { workId: id, source: { in: ["TVMAZE", "TMDB"] } },
  });
  if (!source)
    throw new ApiError("この取得元の個別更新は全体更新をご利用ください", 404);
  return NextResponse.json({
    result: await saveWork(
      source.source === "TMDB"
        ? await refreshTmdb(source.externalId)
        : await refreshTvmaze(source.externalId),
    ),
  });
});
