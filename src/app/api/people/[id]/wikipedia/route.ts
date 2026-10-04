import { NextResponse } from "next/server";
import {
  apiRoute,
  checkOrigin,
  rateLimit,
  requestIp,
  ApiError,
} from "@/lib/api";
import { ensureWikipedia } from "@/lib/wikipedia";
export const POST = apiRoute(async (req) => {
  checkOrigin(req);
  await rateLimit(`wiki:${requestIp(req)}`, 20, 10);
  const id = new URL(req.url).pathname.split("/").at(-2)!;
  const person = await ensureWikipedia(id);
  if (!person) throw new ApiError("人物が見つかりません", 404);
  return NextResponse.json({
    url: person.wikipediaUrl,
    verified: !!person.wikipediaUrl,
  });
});
