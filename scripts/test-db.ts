import "dotenv/config";
import { Client } from "pg";
import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname))
  throw new Error("ローカルテストDBだけ作成できます");
const name = url.pathname.slice(1) + "_test";
if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error("DB名が不正です");
const client = new Client({ connectionString: url.toString() });
await client.connect();
if (
  !(await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [name]))
    .rowCount
)
  await client.query(`CREATE DATABASE "${name}"`);
await client.end();
url.pathname = "/" + name;
writeFileSync(".env.test", `TEST_DATABASE_URL=${url}\n`, { mode: 0o600 });
const run = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { env: { ...process.env, DATABASE_URL: url.toString() }, stdio: "inherit" },
);
if (run.status !== 0) process.exit(1);
console.log("専用テストDBを準備しました（本番DBは変更しません）。");
