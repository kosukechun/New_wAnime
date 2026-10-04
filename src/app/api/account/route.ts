import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  apiRoute,
  checkOrigin,
  requireUser,
  readBody,
  rateLimit,
  ApiError,
} from "@/lib/api";
import {
  endSession,
  hashPassword,
  startSession,
  verifyPassword,
} from "@/lib/auth";
export const PATCH = apiRoute(async (req) => {
  checkOrigin(req);
  const u = await requireUser();
  await rateLimit(`account:${u.id}`, 10, 15);
  const d = z
    .object({
      name: z.string().trim().min(1).max(50),
      currentPassword: z.string().max(128).optional(),
      newPassword: z.string().min(12).max(128).optional(),
    })
    .parse(await readBody(req));
  if (d.newPassword) {
    const saved = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    if (
      !d.currentPassword ||
      !(await verifyPassword(d.currentPassword, saved.passwordHash))
    )
      throw new ApiError("現在のパスワードが一致しません", 401);
    await db.$transaction([
      db.user.update({
        where: { id: u.id },
        data: { name: d.name, passwordHash: await hashPassword(d.newPassword) },
      }),
      db.session.deleteMany({ where: { userId: u.id } }),
    ]);
    await startSession(u.id);
  } else await db.user.update({ where: { id: u.id }, data: { name: d.name } });
  return NextResponse.json({ ok: true });
});
export const DELETE = apiRoute(async (req) => {
  checkOrigin(req);
  const u = await requireUser();
  await rateLimit(`delete:${u.id}`, 5, 15);
  const d = z
    .object({ password: z.string().max(128), confirmed: z.literal(true) })
    .parse(await readBody(req));
  const saved = await db.user.findUniqueOrThrow({ where: { id: u.id } });
  if (!(await verifyPassword(d.password, saved.passwordHash)))
    throw new ApiError("パスワードが一致しません", 401);
  await db.user.delete({ where: { id: u.id } });
  await endSession();
  return NextResponse.json({ ok: true });
});
