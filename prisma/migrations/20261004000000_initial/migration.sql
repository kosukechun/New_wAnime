-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('ANIME', 'DOMESTIC_DRAMA', 'FOREIGN_DRAMA');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('PLANNED', 'AIRING', 'FINISHED', 'DELAYED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "WatchStatus" AS ENUM ('INTERESTED', 'PLANNED', 'WATCHING', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "ScheduleKind" AS ENUM ('TV', 'STREAM');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('SUBSCRIPTION', 'RENT', 'BUY', 'FREE', 'ADS', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "englishTitle" TEXT,
    "originalTitle" TEXT,
    "synopsis" TEXT,
    "posterUrl" TEXT,
    "category" "Category" NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'UNKNOWN',
    "worldPremiere" DATE,
    "jpPremiere" DATE,
    "endDate" DATE,
    "declaredYear" INTEGER,
    "declaredMonth" INTEGER,
    "seasonYear" INTEGER,
    "season" TEXT,
    "sourceMedium" TEXT,
    "installment" TEXT,
    "episodeCount" INTEGER,
    "runtimeMinutes" INTEGER,
    "officialUrl" TEXT,
    "officialX" TEXT,
    "trailerUrl" TEXT,
    "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'REFERENCE',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkAlias" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "WorkAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkGenre" (
    "workId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "WorkGenre_pkey" PRIMARY KEY ("workId","genreId")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkCompany" (
    "workId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "WorkCompany_pkey" PRIMARY KEY ("workId","companyId")
);

-- CreateTable
CREATE TABLE "WorkExternalId" (
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "fingerprint" TEXT,
    "snapshot" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkExternalId_pkey" PRIMARY KEY ("source","externalId")
);

-- CreateTable
CREATE TABLE "Broadcaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,

    CONSTRAINT "Broadcaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "kind" "ScheduleKind" NOT NULL,
    "region" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "time" TEXT,
    "weekday" INTEGER,
    "instant" TIMESTAMP(3),
    "seasonNumber" INTEGER,
    "episodeNumber" INTEGER,
    "isPremiere" BOOLEAN NOT NULL DEFAULT false,
    "broadcasterId" TEXT,
    "label" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamingOffer" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'JP',
    "type" "OfferType" NOT NULL,
    "startDate" DATE,
    "exclusive" BOOLEAN,
    "early" BOOLEAN,
    "watchUrl" TEXT,
    "availabilityUrl" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamingOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nativeName" TEXT,
    "aliases" TEXT[],
    "kind" TEXT NOT NULL,
    "photoUrl" TEXT,
    "biography" TEXT,
    "birthday" DATE,
    "wikipediaUrl" TEXT,
    "wikidataId" TEXT,
    "wikiCheckedAt" TIMESTAMP(3),
    "sourceUrl" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonExternalId" (
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "PersonExternalId_pkey" PRIMARY KEY ("source","externalId")
);

-- CreateTable
CREATE TABLE "Credit" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "characterImage" TEXT,
    "source" TEXT NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeHistory" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "messages" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lease" (
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "status" "WatchStatus" NOT NULL DEFAULT 'INTERESTED',
    "memo" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","workId")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Work_category_jpPremiere_idx" ON "Work"("category", "jpPremiere");

-- CreateIndex
CREATE INDEX "Work_worldPremiere_idx" ON "Work"("worldPremiere");

-- CreateIndex
CREATE INDEX "Work_seasonYear_season_idx" ON "Work"("seasonYear", "season");

-- CreateIndex
CREATE INDEX "Work_status_idx" ON "Work"("status");

-- CreateIndex
CREATE INDEX "Work_updatedAt_idx" ON "Work"("updatedAt");

-- CreateIndex
CREATE INDEX "Work_title_idx" ON "Work"("title");

-- CreateIndex
CREATE INDEX "WorkAlias_title_idx" ON "WorkAlias"("title");

-- CreateIndex
CREATE UNIQUE INDEX "WorkAlias_workId_title_key" ON "WorkAlias"("workId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE INDEX "WorkGenre_genreId_idx" ON "WorkGenre"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE INDEX "WorkExternalId_workId_idx" ON "WorkExternalId"("workId");

-- CreateIndex
CREATE UNIQUE INDEX "Broadcaster_name_region_key" ON "Broadcaster"("name", "region");

-- CreateIndex
CREATE INDEX "Schedule_date_region_idx" ON "Schedule"("date", "region");

-- CreateIndex
CREATE INDEX "Schedule_workId_isPremiere_idx" ON "Schedule"("workId", "isPremiere");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_source_externalId_key" ON "Schedule"("source", "externalId");

-- CreateIndex
CREATE INDEX "StreamingOffer_platformId_region_idx" ON "StreamingOffer"("platformId", "region");

-- CreateIndex
CREATE UNIQUE INDEX "StreamingOffer_workId_platformId_region_type_source_key" ON "StreamingOffer"("workId", "platformId", "region", "type", "source");

-- CreateIndex
CREATE INDEX "Person_name_idx" ON "Person"("name");

-- CreateIndex
CREATE INDEX "Person_nativeName_idx" ON "Person"("nativeName");

-- CreateIndex
CREATE INDEX "PersonExternalId_personId_idx" ON "PersonExternalId"("personId");

-- CreateIndex
CREATE INDEX "Credit_personId_idx" ON "Credit"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "Credit_workId_personId_role_source_key" ON "Credit"("workId", "personId", "role", "source");

-- CreateIndex
CREATE INDEX "ChangeHistory_workId_createdAt_idx" ON "ChangeHistory"("workId", "createdAt");

-- CreateIndex
CREATE INDEX "SyncRun_startedAt_idx" ON "SyncRun"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- AddForeignKey
ALTER TABLE "WorkAlias" ADD CONSTRAINT "WorkAlias_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkGenre" ADD CONSTRAINT "WorkGenre_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkGenre" ADD CONSTRAINT "WorkGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkCompany" ADD CONSTRAINT "WorkCompany_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkCompany" ADD CONSTRAINT "WorkCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExternalId" ADD CONSTRAINT "WorkExternalId_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_broadcasterId_fkey" FOREIGN KEY ("broadcasterId") REFERENCES "Broadcaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamingOffer" ADD CONSTRAINT "StreamingOffer_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamingOffer" ADD CONSTRAINT "StreamingOffer_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonExternalId" ADD CONSTRAINT "PersonExternalId_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeHistory" ADD CONSTRAINT "ChangeHistory_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

