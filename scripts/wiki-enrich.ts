import "dotenv/config";
import { enrichPeople } from "../src/lib/wikipedia";
import { db } from "../src/lib/db";
try {
  console.log(await enrichPeople(1200));
} finally {
  await db.$disconnect();
}
