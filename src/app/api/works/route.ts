import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiRoute } from "@/lib/api";
import { buildWorkWhere, parseSearch, workInclude } from "@/lib/search";
export const dynamic = "force-dynamic";
export const GET = apiRoute(async (req) => {
  const filters = parseSearch(new URL(req.url).searchParams);
  const where = buildWorkWhere(filters);
  const dateField = filters.scope === "jp" ? "jpPremiere" : "worldPremiere";
  const orderBy =
    filters.sort === "announced"
      ? { announcedAt: { sort: "desc" as const, nulls: "last" as const } }
      : filters.sort === "updated"
        ? { updatedAt: "desc" as const }
        : filters.sort === "new"
          ? { createdAt: "desc" as const }
          : filters.sort === "popular"
            ? { popularity: "desc" as const }
            : { [dateField]: { sort: "asc" as const, nulls: "last" as const } };
  const [total, works] = await Promise.all([
    db.work.count({ where }),
    db.work.findMany({
      where,
      include: workInclude,
      orderBy: [orderBy, { id: "asc" }],
      take: 24,
      skip: (filters.page - 1) * 24,
    }),
  ]);
  return NextResponse.json(
    { total, works, page: filters.page, pages: Math.ceil(total / 24) },
    { headers: { "Cache-Control": "no-store" } },
  );
});
