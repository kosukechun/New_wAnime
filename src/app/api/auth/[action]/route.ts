import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  apiRoute,
  ApiError,
  checkOrigin,
  rateLimit,
  readBody,
  requestIp,
} from "@/lib/api";
import {
  currentUser,
  endSession,
  hashPassword,
  startSession,
  verifyPassword,
} from "@/lib/auth";
export const dynamic = "force-dynamic";
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(12, "パスワードは12文字以上にしてください").max(128),
  name: z.string().trim().min(1).max(50).optional(),
});
export const GET = apiRoute(async (req) => {
  if (!new URL(req.url).pathname.endsWith("/session"))
    throw new ApiError("見つかりません", 404);
  return NextResponse.json(
    { user: await currentUser() },
    { headers: { "Cache-Control": "no-store" } },
  );
});
export const POST = apiRoute(async (req) => {
  checkOrigin(req);
  const action = new URL(req.url).pathname.split("/").at(-1);
  if (action === "logout") {
    await endSession();
    return NextResponse.json({ ok: true });
  }
  if (action !== "login" && action !== "register")
    throw new ApiError("見つかりません", 404);
  await rateLimit(`auth:ip:${requestIp(req)}`, 40, 15);
  const data = credentials.parse(await readBody(req));
  await rateLimit(`auth:email:${data.email}`, 10, 15);
  const user = await db.user.findUnique({ where: { email: data.email } });
  if (action === "register") {
    if (process.env.REGISTRATION_ENABLED === "false")
      throw new ApiError("新規登録は停止中です", 403);
    if (user) throw new ApiError("このメールアドレスは登録できません", 409);
    const created = await db.user.create({
      data: {
        email: data.email,
        name: data.name ?? data.email.split("@")[0],
        passwordHash: await hashPassword(data.password),
      },
    });
    await startSession(created.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  }
  const valid = user
    ? await verifyPassword(data.password, user.passwordHash)
    : await verifyPassword(data.password, "scrypt:dummy:" + "00".repeat(64));
  if (!user || !valid)
    throw new ApiError("メールアドレスまたはパスワードが一致しません", 401);
  await startSession(user.id);
  return NextResponse.json({ ok: true });
});
