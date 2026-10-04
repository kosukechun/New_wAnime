import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { CATEGORIES, STATUSES, SEASONS } from "./constants";
import { monthRange, parseDate } from "./dates";
const num = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).optional();
export const searchSchema = z
  .object({
    q: z.string().max(160).optional(),
    category: z
      .enum(
        Object.keys(CATEGORIES) as [
          keyof typeof CATEGORIES,
          ...Array<keyof typeof CATEGORIES>,
        ],
      )
      .optional(),
    year: num(1900, 2200),
    month: num(1, 12),
    season: z
      .enum(
        Object.keys(SEASONS) as [
          keyof typeof SEASONS,
          ...Array<keyof typeof SEASONS>,
        ],
      )
      .optional(),
    status: z
      .enum(
        Object.keys(STATUSES) as [
          keyof typeof STATUSES,
          ...Array<keyof typeof STATUSES>,
        ],
      )
      .optional(),
    genres: z.array(z.string().max(50)).max(24).default([]),
    genreMode: z.enum(["all", "any"]).default("all"),
    person: z.string().max(100).optional(),
    platform: z.string().max(100).optional(),
    broadcaster: z.string().max(100).optional(),
    company: z.string().max(100).optional(),
    sourceMedium: z.string().max(100).optional(),
    installment: z.string().max(30).optional(),
    region: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .default("JP"),
    scope: z.enum(["jp", "world"]).default("jp"),
    from: z
      .string()
      .refine((v) => !!parseDate(v), "開始日が不正です")
      .optional(),
    to: z
      .string()
      .refine((v) => !!parseDate(v), "終了日が不正です")
      .optional(),
    sort: z
      .enum(["start", "updated", "new", "popular", "announced"])
      .default("start"),
    announced: z.enum(["true"]).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .refine((v) => !v.month || !!v.year, {
    message: "月を指定する場合は年も指定してください",
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "期間の終了日は開始日以降にしてください",
  });
export type SearchFilters = z.infer<typeof searchSchema>;
export const validScheduleSource: Prisma.ScheduleWhereInput = {
  OR: [{ source: "OFFICIAL" }, { work: { confidence: { not: "OFFICIAL" } } }],
};
export function premiereDateWhere(
  range: Prisma.DateTimeNullableFilter,
  region = "JP",
): Prisma.WorkWhereInput {
  return {
    OR: [
      ...(region === "JP" ? [{ jpPremiere: range }] : []),
      {
        schedules: {
          some: {
            ...validScheduleSource,
            isPremiere: true,
            region,
            date: range as Prisma.DateTimeFilter,
          },
        },
      },
    ],
  };
}
export function parseSearch(params: URLSearchParams) {
  const raw = Object.fromEntries([...params].filter(([, v]) => v !== ""));
  return searchSchema.parse({
    ...raw,
    genres: params
      .getAll("genres")
      .flatMap((v) => v.split(","))
      .filter(Boolean),
  });
}
const contains = (value: string) => ({
  contains: value.normalize("NFKC"),
  mode: "insensitive" as const,
});
export function buildWorkWhere(f: SearchFilters): Prisma.WorkWhereInput {
  const and: Prisma.WorkWhereInput[] = [];
  if (f.category) and.push({ category: f.category });
  if (f.status) and.push({ status: f.status });
  if (f.announced) and.push({ announcedAt: { not: null } });
  if (f.q) {
    const c = contains(f.q.trim());
    and.push({
      OR: [
        { title: c },
        { englishTitle: c },
        { originalTitle: c },
        { originalWorkTitle: c },
        { synopsis: c },
        { aliases: { some: { title: c } } },
        { companies: { some: { company: { name: c } } } },
        {
          credits: {
            some: {
              person: {
                OR: [{ name: c }, { nativeName: c }, { aliases: { has: f.q } }],
              },
            },
          },
        },
      ],
    });
  }
  if (f.genres.length) {
    if (f.genreMode === "all")
      f.genres.forEach((id) => and.push({ genres: { some: { genreId: id } } }));
    else and.push({ genres: { some: { genreId: { in: f.genres } } } });
  }
  if (f.person) {
    const c = contains(f.person);
    and.push({
      credits: {
        some: {
          person: {
            OR: [
              { name: c },
              { nativeName: c },
              { aliases: { has: f.person } },
            ],
          },
        },
      },
    });
  }
  if (f.platform)
    and.push({
      offers: {
        some: {
          region: f.region,
          platform:
            f.platform === "other"
              ? { id: { startsWith: "tmdb-" } }
              : { id: f.platform },
        },
      },
    });
  if (f.broadcaster)
    and.push({
      schedules: {
        some: {
          region: f.region,
          broadcaster: { name: contains(f.broadcaster) },
        },
      },
    });
  if (f.company)
    and.push({
      companies: { some: { company: { name: contains(f.company) } } },
    });
  if (f.sourceMedium) and.push({ sourceMedium: f.sourceMedium });
  if (f.installment) and.push({ installment: f.installment });
  if (f.season)
    and.push({ season: f.season, ...(f.year ? { seasonYear: f.year } : {}) });
  let range: Prisma.DateTimeNullableFilter | undefined;
  if (f.year && (!f.season || f.month))
    range = f.month
      ? monthRange(f.year, f.month)
      : {
          gte: new Date(Date.UTC(f.year, 0, 1)),
          lt: new Date(Date.UTC(f.year + 1, 0, 1)),
        };
  if (f.from || f.to) {
    const from = f.from ? parseDate(f.from)! : undefined;
    const existingFrom = range?.gte instanceof Date ? range.gte : undefined;
    range = {
      ...range,
      ...(from
        ? { gte: existingFrom && existingFrom > from ? existingFrom : from }
        : {}),
      ...(f.to ? { lte: parseDate(f.to)! } : {}),
    };
  }
  if (range) {
    if (f.scope === "jp") and.push(premiereDateWhere(range, f.region));
    else
      and.push({
        OR: [
          { worldPremiere: range },
          ...(!f.from && !f.to && f.year
            ? [
                {
                  worldPremiere: null,
                  declaredYear: f.year,
                  ...(f.month ? { declaredMonth: f.month } : {}),
                },
              ]
            : []),
        ],
      });
  }
  return { AND: and };
}
export const workInclude = {
  genres: { include: { genre: true } },
  offers: {
    include: { platform: true },
    where: { region: "JP" },
    orderBy: { platformId: "asc" as const },
  },
  schedules: {
    include: { broadcaster: true },
    where: { region: "JP", ...validScheduleSource },
    orderBy: { date: "asc" as const },
    take: 20,
  },
};
