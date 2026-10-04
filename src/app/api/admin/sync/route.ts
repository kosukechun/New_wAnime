import { NextResponse } from "next/server";
import {
  apiRoute,
  checkOrigin,
  requireUser,
  rateLimit,
  ApiError,
} from "@/lib/api";
import { runSync, SyncBusyError } from "@/lib/collector/sync";
export const dynamic = "force-dynamic";
export const maxDuration = 900;
export const POST = apiRoute(async (req) => {
  checkOrigin(req);
  const u = await requireUser(true);
  await rateLimit(`sync:${u.id}`, 2, 10);
  try {
    return NextResponse.json({ run: await runSync() });
  } catch (e) {
    if (e instanceof SyncBusyError) throw new ApiError(e.message, 409);
    throw e;
  }
});
