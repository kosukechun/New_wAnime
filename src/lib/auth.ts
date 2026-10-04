import {
  randomBytes,
  scrypt as scryptCallback,
  createHash,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "./db";
const scrypt = promisify(scryptCallback);
export const COOKIE = "wanime_session";
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, value] = encoded.split(":");
  if (scheme !== "scrypt" || !salt || !value || value.length !== 128)
    return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(value, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length !== 64) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function startSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  await db.session.create({
    data: { tokenHash: tokenHash(token), userId, expiresAt },
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token)
    await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  jar.delete(COOKIE);
}
