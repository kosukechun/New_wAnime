import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { z } from "zod";
const rl = createInterface({ input: stdin, output: stdout });
try {
  const email = z
    .email()
    .parse(
      (process.env.ADMIN_EMAIL ?? (await rl.question("管理者メールアドレス: ")))
        .trim()
        .toLowerCase(),
    );
  // パスワードをコマンド履歴に残さず、対話入力は非表示。
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    stdout.write("管理者パスワード (12文字以上、入力は非表示): ");
    rl.close();
    if (!stdin.isTTY)
      throw new Error(
        "非対話環境では ADMIN_PASSWORD 環境変数を設定してください",
      );
    stdin.setRawMode(true);
    stdin.resume();
    password = await new Promise<string>((resolve, reject) => {
      let value = "";
      const onData = (chunk: Buffer) => {
        const s = chunk.toString();
        if (s.includes("\u0003")) {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          reject(new Error("キャンセル"));
        } else if (s.includes("\r") || s.includes("\n")) {
          stdin.off("data", onData);
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write("\n");
          resolve(value);
        } else if (s === "\u007f" || s === "\b") value = value.slice(0, -1);
        else value += s;
      };
      stdin.on("data", onData);
    });
  }
  z.string().min(12).max(128).parse(password);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing)
    throw new Error(
      "既存ユーザーは変更しません。別メールで作成するかDB管理者が確認してください。",
    );
  await db.user.create({
    data: {
      email,
      name: "管理者",
      role: "ADMIN",
      passwordHash: await hashPassword(password),
    },
  });
  console.log("管理者を作成しました。");
} finally {
  rl.close();
  await db.$disconnect();
}
