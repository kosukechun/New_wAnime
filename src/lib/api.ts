import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { ZodError } from "zod";
import { db } from "./db";
import { currentUser } from "./auth";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_URL ?? "http://localhost:3000")
    .origin;
  if (origin !== expected)
    throw new ApiError(
      "送信元を確認できません。APP_URLとアクセスURLを一致させてください。",
      403,
    );
}
export async function requireUser(admin = false) {
  const u = await currentUser();
  if (!u) throw new ApiError("ログインしてください", 401);
  if (admin && u.role !== "ADMIN")
    throw new ApiError("管理者権限が必要です", 403);
  return u;
}
export async function rateLimit(key: string, max: number, minutes: number) {
  const hash = createHash("sha256").update(key).digest("hex");
  const rows = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt") VALUES (${hash}, 1, NOW() + ${minutes} * INTERVAL '1 minute')
    ON CONFLICT ("key") DO UPDATE SET "count" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
    "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < NOW() THEN EXCLUDED."expiresAt" ELSE "RateLimit"."expiresAt" END RETURNING "count"`;
  if (rows[0].count > max)
    throw new ApiError(
      "試行回数が多すぎます。しばらく待ってからお試しください。",
      429,
    );
}
export function requestIp(request: Request) {
  return process.env.TRUST_PROXY === "true"
    ? (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown")
    : "local";
}
export async function readBody(request: Request) {
  if (Number(request.headers.get("content-length")) > 100000)
    throw new ApiError("送信データが大きすぎます", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("データを送信してください");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 100000) {
      await reader.cancel();
      throw new ApiError("送信データが大きすぎます", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new ApiError("JSON形式が不正です");
  }
}
export function apiRoute(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (e) {
      const status =
        e instanceof ApiError ? e.status : e instanceof ZodError ? 400 : 503;
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof ZodError
            ? e.issues.map((i) => i.message).join(" / ")
            : "データベースまたは外部APIに接続できません。保存済みデータは保持されています。";
      // 生の例外や接続文字列をクライアント・ログへ出さない。
      console.error(
        `API error: ${status} ${e instanceof Error ? e.name : "Unknown"}`,
      );
      return NextResponse.json(
        { error: message },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}
