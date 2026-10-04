import { NextResponse } from "next/server";
import {
  apiRoute,
  checkOrigin,
  requireUser,
  readBody,
  rateLimit,
} from "@/lib/api";
import { officialSchema, normalizeOfficial } from "@/lib/collector/official";
import { saveWork, seedTaxonomy } from "@/lib/collector/store";
export const POST = apiRoute(async (req) => {
  checkOrigin(req);
  const user = await requireUser(true);
  await rateLimit(`official:${user.id}`, 30, 60);
  const data = officialSchema.parse(await readBody(req));
  await seedTaxonomy();
  return NextResponse.json({ result: await saveWork(normalizeOfficial(data)) });
});
