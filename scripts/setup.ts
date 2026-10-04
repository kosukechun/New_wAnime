import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
mkdirSync("data", { recursive: true });
if (!existsSync(".env")) {
  const password = randomBytes(24).toString("hex");
  const template = readFileSync(".env.example", "utf8")
    .replace(
      "postgresql://wanime:CHANGE_ME@localhost:5432/wanime",
      `postgresql://wanime:${password}@127.0.0.1:55432/wanime`,
    )
    .replace("POSTGRES_PASSWORD=CHANGE_ME", `POSTGRES_PASSWORD=${password}`);
  writeFileSync(".env", template, { mode: 0o600 });
  console.log(".env を作成しました。秘密情報は表示・Git登録しません。");
} else console.log("既存 .env を保持しました。");
console.log(
  "別ターミナル: npm run db:local → 元のターミナル: npm run db:migrate → npm run collect → npm run dev",
);
