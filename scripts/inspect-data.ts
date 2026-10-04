import "dotenv/config";
import { db } from "../src/lib/db";
try {
  console.log(
    JSON.stringify(
      {
        works: await db.work.groupBy({ by: ["category"], _count: true }),
        people: await db.person.groupBy({ by: ["kind"], _count: true }),
        schedules: await db.schedule.groupBy({ by: ["region"], _count: true }),
        samplePeople: await db.person.findMany({
          select: { id: true, name: true, birthday: true },
          take: 4,
        }),
        lastRun: await db.syncRun.findFirst({
          orderBy: { startedAt: "desc" },
          select: {
            status: true,
            fetched: true,
            errors: true,
            finishedAt: true,
          },
        }),
      },
      null,
      2,
    ),
  );
} finally {
  await db.$disconnect();
}
