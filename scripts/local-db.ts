import "dotenv/config";
import EmbeddedPostgres from "embedded-postgres";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
const url = new URL(process.env.DATABASE_URL ?? "");
if (!["127.0.0.1", "localhost"].includes(url.hostname))
  throw new Error("db:local はローカルDB専用です");
mkdirSync("data", { recursive: true });
const postgres = new EmbeddedPostgres({
  databaseDir: "./data/postgres",
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  port: Number(url.port || 55432),
  persistent: true,
  authMethod: "scram-sha-256",
  postgresFlags: ["-h", "127.0.0.1"],
  onLog: () => {},
  onError: (e: unknown) => {
    if (String(e).includes("FATAL"))
      console.error(
        "PostgreSQL 起動エラー: ポートとdata/postgresを確認してください。",
      );
  },
});
if (!existsSync("data/postgres/PG_VERSION")) await postgres.initialise();
await postgres.start();
const client = postgres.getPgClient();
await client.connect();
const database = url.pathname.slice(1);
if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(database))
  throw new Error("DB名が不正です");
const found = await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [
  database,
]);
if (!found.rowCount) await postgres.createDatabase(database);
await client.end();
console.log(
  `PostgreSQL 稼働中: 127.0.0.1:${url.port} / ${database}（Ctrl+C で終了、データは保持）`,
);
let stopping = false;
const pidFile = "data/local-db.pid";
const stopFile = `data/stop-local-db.${process.pid}`;
writeFileSync(pidFile, String(process.pid));
async function stop() {
  if (stopping) return;
  stopping = true;
  await postgres.stop();
  if (existsSync(stopFile)) unlinkSync(stopFile);
  if (
    existsSync(pidFile) &&
    readFileSync(pidFile, "utf8") === String(process.pid)
  )
    unlinkSync(pidFile);
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {
  if (existsSync(stopFile)) void stop();
}, 1000);
