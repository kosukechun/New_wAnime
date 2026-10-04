import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  apiRoute,
  checkOrigin,
  requireUser,
  readBody,
  rateLimit,
} from "@/lib/api";
import { discoverPeople, externalPerson } from "@/lib/person-discovery";
import { parseDate } from "@/lib/dates";
import { enrichPeople } from "@/lib/wikipedia";
export const POST = apiRoute(async (req) => {
  checkOrigin(req);
  const user = await requireUser();
  await rateLimit(`discover:${user.id}`, 10, 30);
  const d = z
    .discriminatedUnion("mode", [
      z.object({
        mode: z.literal("search"),
        q: z.string().trim().min(2).max(100),
      }),
      z.object({
        mode: z.literal("import"),
        source: z.enum(["TVMAZE", "TMDB"]),
        externalId: z.string().regex(/^\d+$/),
      }),
    ])
    .parse(await readBody(req));
  if (d.mode === "search")
    return NextResponse.json({ people: await discoverPeople(d.q) });
  // クライアントから受け取った氏名やプロフィールではなく、公式APIのIDで再取得する。
  const p = await externalPerson(d.source, d.externalId);
  const key = { source: p.source, externalId: p.externalId };
  const person = await db.$transaction(async (tx) => {
    const mapping = await tx.personExternalId.findUnique({
      where: { source_externalId: key },
      include: { person: true },
    });
    if (mapping) return mapping.person;
    return await tx.person.create({
      data: {
        name: p.name,
        aliases: p.aliases,
        photoUrl: p.photoUrl,
        biography: p.biography,
        birthday: parseDate(p.birthday),
        sourceUrl: p.sourceUrl,
        kind: "PERFORMER",
        externalIds: { create: key },
      },
    });
  });
  await enrichPeople(1, [person.id]).catch(() => {});
  return NextResponse.json({ id: person.id });
});
