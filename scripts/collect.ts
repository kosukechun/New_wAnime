import "dotenv/config";
import { runSync } from "../src/lib/collector/sync";
import { db } from "../src/lib/db";
try {
  const result = await runSync();
  console.log(
    JSON.stringify(
      {
        id: result.id,
        status: result.status,
        fetched: result.fetched,
        created: result.created,
        updated: result.updated,
        errors: result.errors,
        messages: result.messages,
      },
      null,
      2,
    ),
  );
  if (result.status === "FAILED") process.exitCode = 1;
} finally {
  await db.$disconnect();
}
