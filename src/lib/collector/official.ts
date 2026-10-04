import { z } from "zod";
import { parseDate } from "../dates";
import { GENRES, PLATFORMS } from "../constants";
import type { WorkRecord } from "./types";
const url = z
  .url()
  .refine(
    (v) =>
      ["https:", "http:"].includes(new URL(v).protocol) &&
      !new URL(v).username &&
      !new URL(v).password,
  );
const date = z
  .string()
  .refine((v) => !!parseDate(v), "日付は実在するYYYY-MM-DD形式にしてください");
export const officialSchema = z.object({
  sourceUrl: url,
  externalIds: z
    .array(
      z.object({
        source: z.enum(["TVMAZE", "TMDB", "MAL", "ANILIST", "IMDB", "THETVDB"]),
        externalId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
      }),
    )
    .min(1)
    .max(8),
  title: z.string().min(1).max(200),
  category: z.enum(["ANIME", "DOMESTIC_DRAMA", "FOREIGN_DRAMA"]),
  status: z.enum(["PLANNED", "AIRING", "FINISHED", "DELAYED", "UNKNOWN"]),
  synopsis: z.string().max(20000).optional(),
  jpPremiere: date.nullable().optional(),
  worldPremiere: date.nullable().optional(),
  endDate: date.nullable().optional(),
  announcedAt: date.nullable().optional(),
  aliases: z.array(z.string().max(200)).max(30).default([]),
  genres: z
    .array(z.enum(GENRES.map((g) => g[0]) as [string, ...string[]]))
    .default([]),
  companies: z.array(z.string().max(150)).max(30).default([]),
  posterUrl: url.optional(),
  officialUrl: url.optional(),
  officialX: url.optional(),
  trailerUrl: url.optional(),
  originalWorkTitle: z.string().max(200).optional(),
  staff: z.array(z.string().max(200)).max(50).optional(),
  sourceMedium: z.string().max(40).optional(),
  installment: z.enum(["NEW", "SEQUEL", "REMAKE"]).optional(),
  season: z.enum(["WINTER", "SPRING", "SUMMER", "FALL"]).optional(),
  seasonYear: z.number().int().min(1900).max(2200).optional(),
  schedules: z
    .array(
      z.object({
        id: z.string().max(100),
        kind: z.enum(["TV", "STREAM"]),
        date,
        time: z
          .string()
          .regex(/^(?:[01]\d|2[0-9]):[0-5]\d$/)
          .optional(),
        broadcaster: z.string().max(100).optional(),
        label: z.string().max(100).optional(),
        isPremiere: z.boolean().default(true),
      }),
    )
    .max(100)
    .default([]),
  offers: z
    .array(
      z.object({
        platformId: z.enum(PLATFORMS.map((p) => p[0]) as [string, ...string[]]),
        type: z.enum(["SUBSCRIPTION", "RENT", "BUY", "FREE", "ADS", "UNKNOWN"]),
        startDate: date.optional(),
        watchUrl: url,
        exclusive: z.boolean().optional(),
        early: z.boolean().optional(),
      }),
    )
    .max(50)
    .default([]),
  confirmed: z.literal(true),
});
export function normalizeOfficial(
  data: z.infer<typeof officialSchema>,
): WorkRecord {
  return {
    ...data,
    source: "OFFICIAL",
    externalId: `${data.externalIds[0].source}:${data.externalIds[0].externalId}`,
    crossIds: data.externalIds,
    confidence: "OFFICIAL",
    schedulesComplete: true,
    metadata: data.staff ? { staff: data.staff } : undefined,
    schedules: data.schedules.map((s) => ({
      ...s,
      source: "OFFICIAL",
      externalId: `${data.externalIds[0].externalId}:${s.id}`,
      region: "JP",
      sourceUrl: data.sourceUrl,
    })),
    offers: data.offers.map((o) => ({
      ...o,
      name: PLATFORMS.find((p) => p[0] === o.platformId)![1],
      region: "JP",
      sourceUrl: data.sourceUrl,
    })),
  };
}
