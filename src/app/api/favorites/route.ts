import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  apiRoute,
  checkOrigin,
  requireUser,
  readBody,
  ApiError,
} from "@/lib/api";
export const dynamic = "force-dynamic";
export const GET = apiRoute(async () => {
  const u = await requireUser();
  return NextResponse.json(
    {
      favorites: await db.favorite.findMany({
        where: { userId: u.id },
        include: { work: true },
        orderBy: { updatedAt: "desc" },
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
export const PUT = apiRoute(async (req) => {
  checkOrigin(req);
  const u = await requireUser();
  const data = z
    .object({
      workId: z.string().min(1).max(100),
      status: z
        .enum(["INTERESTED", "PLANNED", "WATCHING", "COMPLETED", "DROPPED"])
        .default("INTERESTED"),
      memo: z.string().max(4000).default(""),
    })
    .parse(await readBody(req));
  if (
    !(await db.work.findUnique({
      where: { id: data.workId },
      select: { id: true },
    }))
  )
    throw new ApiError("作品が見つかりません", 404);
  const f = await db.favorite.upsert({
    where: { userId_workId: { userId: u.id, workId: data.workId } },
    create: { ...data, userId: u.id },
    update: { status: data.status, memo: data.memo },
  });
  return NextResponse.json({ favorite: f });
});
export const DELETE = apiRoute(async (req) => {
  checkOrigin(req);
  const u = await requireUser();
  const { workId } = z
    .object({ workId: z.string().max(100) })
    .parse(await readBody(req));
  await db.favorite.deleteMany({ where: { userId: u.id, workId } });
  return NextResponse.json({ ok: true });
});
