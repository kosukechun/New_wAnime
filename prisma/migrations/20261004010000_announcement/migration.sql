ALTER TABLE "Work" ADD COLUMN "announcedAt" DATE;
CREATE INDEX "Work_announcedAt_idx" ON "Work"("announcedAt");
