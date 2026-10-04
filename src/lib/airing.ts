import type { Prisma } from "@/generated/prisma/client";
import { isoDate, jstToday, parseDate } from "./dates";

type BroadcastDates = {
  jpPremiere: Date | string | null;
  worldPremiere: Date | string | null;
  endDate?: Date | string | null;
};

// Missing dates never create an assumed episode count or broadcast duration.
export function isInKnownBroadcastPeriod(
  work: BroadcastDates,
  today = jstToday(),
) {
  const start = isoDate(work.jpPremiere ?? work.worldPremiere);
  const end = isoDate(work.endDate);
  return !!start && !!end && start <= today && today <= end;
}

export function currentlyAiringWhere(
  today = jstToday(),
  scope: "jp" | "world" = "jp",
  region = "JP",
): Prisma.WorkWhereInput {
  const date = parseDate(today)!;
  const startField =
    scope === "jp" && region === "JP" ? "jpPremiere" : "worldPremiere";
  const startsByToday: Prisma.WorkWhereInput =
    startField === "jpPremiere"
      ? {
          OR: [
            { jpPremiere: { lte: date } },
            { jpPremiere: null, worldPremiere: { lte: date } },
          ],
        }
      : { worldPremiere: { lte: date } };
  const noKnownStart: Prisma.WorkWhereInput =
    startField === "jpPremiere"
      ? { jpPremiere: null, worldPremiere: null }
      : { worldPremiere: null };
  return {
    AND: [
      { OR: [{ endDate: null }, { endDate: { gte: date } }] },
      {
        OR: [
          {
            status: "AIRING",
            OR: [startsByToday, noKnownStart],
          },
          {
            status: "UNKNOWN",
            AND: [startsByToday, { endDate: { gte: date } }],
          },
        ],
      },
    ],
  };
}
