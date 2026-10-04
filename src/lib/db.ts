import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDb = globalThis as unknown as { wanimeDb?: PrismaClient };
export const db =
  globalDb.wanimeDb ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        process.env.DATABASE_URL ?? "postgresql://localhost:5432/wanime",
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    }),
  });
if (process.env.NODE_ENV !== "production") globalDb.wanimeDb = db;
