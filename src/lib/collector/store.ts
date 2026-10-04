import { createHash } from "node:crypto";
import { db } from "../db";
import { GENRES, PLATFORMS } from "../constants";
import { jstToday, parseDate } from "../dates";
import { safeUrl } from "../normalize";
import type { Prisma } from "@/generated/prisma/client";
import type { WorkRecord } from "./types";
export async function seedTaxonomy() {
  for (const [id, name] of GENRES)
    await db.genre.upsert({
      where: { id },
      create: { id, name },
      update: { name },
    });
  for (const [id, name] of PLATFORMS)
    await db.platform.upsert({
      where: { id },
      create: { id, name },
      update: { name },
    });
}
const asJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function saveWork(
  record: WorkRecord,
): Promise<"created" | "updated" | "unchanged"> {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(record))
    .digest("hex");
  const now = new Date();
  return db.$transaction(
    async (tx) => {
      const ids = [
        { source: record.source, externalId: record.externalId },
        ...(record.crossIds ?? []),
      ];
      const mappings = await tx.workExternalId.findMany({
        where: { OR: ids },
        include: { work: true },
      });
      if (new Set(mappings.map((m) => m.workId)).size > 1)
        throw new Error(
          "外部IDが複数作品と競合しています。自動統合を停止しました。",
        );
      const existing = mappings[0]?.work;
      const ownMapping = mappings.find(
        (m) => m.source === record.source && m.externalId === record.externalId,
      );
      const priority = (name: string) =>
        name === "OFFICIAL"
          ? 100
          : name === "MAL" || name === "ANILIST"
            ? 50
            : name === "TMDB"
              ? 40
              : 20;
      const authoritative =
        !existing ||
        priority(record.source) > priority(existing.sourceName) ||
        existing.sourceName === record.source;
      const fields = {
        title: record.title,
        englishTitle: record.englishTitle,
        originalTitle: record.originalTitle,
        originalWorkTitle: record.originalWorkTitle,
        synopsis: record.synopsis,
        posterUrl: safeUrl(record.posterUrl),
        category: record.category,
        status: record.status,
        worldPremiere:
          record.worldPremiere === undefined
            ? undefined
            : parseDate(record.worldPremiere),
        announcedAt:
          record.announcedAt === undefined
            ? undefined
            : parseDate(record.announcedAt),
        jpPremiere:
          record.jpPremiere === undefined
            ? undefined
            : parseDate(record.jpPremiere),
        endDate:
          record.endDate === undefined ? undefined : parseDate(record.endDate),
        declaredYear: record.declaredYear,
        declaredMonth: record.declaredMonth,
        seasonYear: record.seasonYear,
        season: record.season,
        sourceMedium: record.sourceMedium,
        installment: record.installment,
        episodeCount: record.episodeCount,
        runtimeMinutes: record.runtimeMinutes,
        officialUrl: safeUrl(record.officialUrl),
        officialX: safeUrl(record.officialX),
        trailerUrl: safeUrl(record.trailerUrl),
        popularity: record.popularity ?? 0,
        metadata: record.metadata ? asJson(record.metadata) : undefined,
        sourceUrl: record.sourceUrl,
        sourceName: record.source,
        confidence: record.confidence ?? "REFERENCE",
        checkedAt: now,
      };
      let work;
      if (!existing) work = await tx.work.create({ data: fields });
      else {
        const change: Prisma.WorkUpdateInput = authoritative
          ? fields
          : { checkedAt: now };
        if (!authoritative) {
          // 他の出典が未発表の項目だけ補完する。公式値を上書きしない。
          for (const k of [
            "synopsis",
            "posterUrl",
            "englishTitle",
            "originalTitle",
            "runtimeMinutes",
            "episodeCount",
          ] as const) {
            if (!existing[k] && fields[k] != null)
              Object.assign(change, { [k]: fields[k] });
          }
        }
        // @updatedAt は内容変更時だけ進める。
        if (ownMapping?.fingerprint === fingerprint)
          change.updatedAt = existing.updatedAt;
        work = await tx.work.update({
          where: { id: existing.id },
          data: change,
        });
      }
      for (const id of ids)
        await tx.workExternalId.upsert({
          where: { source_externalId: id },
          create: {
            ...id,
            workId: work.id,
            ...(id.source === record.source
              ? { fingerprint, snapshot: asJson(record) }
              : {}),
            checkedAt: now,
          },
          update: {
            checkedAt: now,
            ...(id.source === record.source
              ? { fingerprint, snapshot: asJson(record) }
              : {}),
          },
        });
      for (const title of [...new Set(record.aliases)].filter(Boolean))
        await tx.workAlias.upsert({
          where: { workId_title: { workId: work.id, title } },
          create: { workId: work.id, title },
          update: {},
        });
      if (authoritative)
        await tx.workGenre.deleteMany({ where: { workId: work.id } });
      for (const genreId of record.genres)
        await tx.workGenre.upsert({
          where: { workId_genreId: { workId: work.id, genreId } },
          create: { workId: work.id, genreId },
          update: {},
        });
      if (authoritative)
        await tx.workCompany.deleteMany({ where: { workId: work.id } });
      for (const name of record.companies) {
        const company = await tx.company.upsert({
          where: { name },
          create: { name },
          update: {},
        });
        await tx.workCompany.upsert({
          where: {
            workId_companyId: { workId: work.id, companyId: company.id },
          },
          create: { workId: work.id, companyId: company.id },
          update: {},
        });
      }
      if (record.schedulesComplete)
        await tx.schedule.deleteMany({
          where: {
            workId: work.id,
            source: record.source,
            date: { gte: parseDate(jstToday())! },
            externalId: {
              notIn: (record.schedules ?? []).map((s) => s.externalId),
            },
          },
        });
      for (const s of record.schedules ?? []) {
        const broadcaster = s.broadcaster
          ? await tx.broadcaster.upsert({
              where: { name_region: { name: s.broadcaster, region: s.region } },
              create: { name: s.broadcaster, region: s.region },
              update: {},
            })
          : null;
        const date = parseDate(s.date);
        if (!date) continue;
        const data = {
          ...s,
          broadcaster: undefined,
          date,
          instant: s.instant ? new Date(s.instant) : null,
          weekday: date.getUTCDay(),
          workId: work.id,
          broadcasterId: broadcaster?.id,
          checkedAt: now,
        };
        await tx.schedule.upsert({
          where: {
            source_externalId: { source: s.source, externalId: s.externalId },
          },
          create: data,
          update: data,
        });
      }
      if (record.offers !== undefined) {
        await tx.streamingOffer.deleteMany({
          where: { workId: work.id, source: record.source },
        });
        for (const o of record.offers) {
          await tx.platform.upsert({
            where: { id: o.platformId },
            create: {
              id: o.platformId,
              name: o.name,
              logoUrl: safeUrl(o.logoUrl),
            },
            update: { name: o.name, logoUrl: safeUrl(o.logoUrl) },
          });
          const rest = {
            platformId: o.platformId,
            region: o.region,
            type: o.type,
            exclusive: o.exclusive,
            early: o.early,
            sourceUrl: o.sourceUrl,
          };
          await tx.streamingOffer.create({
            data: {
              ...rest,
              startDate: parseDate(o.startDate),
              watchUrl: safeUrl(o.watchUrl),
              availabilityUrl: safeUrl(o.availabilityUrl),
              workId: work.id,
              source: record.source,
              checkedAt: now,
            },
          });
        }
      }
      if (record.people !== undefined) {
        await tx.credit.deleteMany({
          where: { workId: work.id, source: record.source },
        });
        for (const p of record.people) {
          const key = { source: p.source, externalId: p.externalId };
          const mapping = await tx.personExternalId.findUnique({
            where: { source_externalId: key },
            include: { person: true },
          });
          const personData = {
            name: p.name,
            nativeName: p.nativeName,
            aliases: [
              ...new Set([
                ...(p.aliases ?? []),
                ...(mapping?.person.aliases ?? []),
                ...(mapping?.person.nativeName
                  ? [mapping.person.nativeName]
                  : []),
              ]),
            ],
            kind: p.kind,
            photoUrl: safeUrl(p.photoUrl),
            biography: p.biography,
            birthday: parseDate(p.birthday),
            sourceUrl: p.sourceUrl,
            checkedAt: now,
          };
          const person = mapping
            ? await tx.person.update({
                where: { id: mapping.personId },
                data: personData,
              })
            : await tx.person.create({
                data: { ...personData, externalIds: { create: key } },
              });
          await tx.credit.upsert({
            where: {
              workId_personId_role_source: {
                workId: work.id,
                personId: person.id,
                role: p.role,
                source: record.source,
              },
            },
            create: {
              workId: work.id,
              personId: person.id,
              role: p.role,
              kind: p.kind,
              characterImage: safeUrl(p.characterImage),
              source: record.source,
            },
            update: { kind: p.kind, characterImage: safeUrl(p.characterImage) },
          });
        }
      }
      const changed = ownMapping?.fingerprint !== fingerprint;
      if (changed)
        await tx.changeHistory.create({
          data: {
            workId: work.id,
            source: record.source,
            sourceUrl: record.sourceUrl,
            changes: asJson({
              before: ownMapping?.snapshot ?? null,
              after: record,
              japanDate: jstToday(),
            }),
          },
        });
      return !existing ? "created" : changed ? "updated" : "unchanged";
    },
    { timeout: 30000 },
  );
}
