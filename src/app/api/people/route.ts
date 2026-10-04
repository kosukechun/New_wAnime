import { NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute } from "@/lib/api";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export const GET = apiRoute(async (req) => {
  const f = z
    .object({
      q: z.string().max(100).default(""),
      kind: z.enum(["VOICE_ACTOR", "ACTOR"]).optional(),
      verified: z.enum(["true"]).optional(),
      page: z.coerce.number().int().min(1).max(10000).default(1),
    })
    .parse(Object.fromEntries(new URL(req.url).searchParams));
  const c = { contains: f.q, mode: "insensitive" as const };
  const where = {
    AND: f.kind
      ? [{ OR: [{ kind: f.kind }, { credits: { some: { kind: f.kind } } }] }]
      : [],
    ...(f.verified ? { wikipediaUrl: { not: null } } : {}),
    ...(f.q
      ? { OR: [{ name: c }, { nativeName: c }, { aliases: { has: f.q } }] }
      : {}),
  };
  const [total, people] = await Promise.all([
    db.person.count({ where }),
    db.person.findMany({
      where,
      take: 24,
      skip: (f.page - 1) * 24,
      orderBy: [
        { nativeName: { sort: "asc", nulls: "last" } },
        { name: "asc" },
      ],
    }),
  ]);
  return NextResponse.json(
    { total, people },
    { headers: { "Cache-Control": "no-store" } },
  );
});
