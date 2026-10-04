import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
if (existsSync("prisma/migrations/20261004000000_initial/migration.sql")) {
  console.error(
    "既存の初期マイグレーションは上書きしません。新しい変更は prisma migrate dev で作成してください。",
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema",
    "prisma/schema.prisma",
    "--script",
  ],
  { encoding: "utf8", env: process.env },
);
if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(1);
}
mkdirSync("prisma/migrations/20261004000000_initial", { recursive: true });
writeFileSync(
  "prisma/migrations/20261004000000_initial/migration.sql",
  result.stdout,
);
writeFileSync(
  "prisma/migrations/migration_lock.toml",
  'provider = "postgresql"\n',
);
console.log("初期マイグレーションを生成しました");
