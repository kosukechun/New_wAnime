import "dotenv/config";
import { runSync, SyncBusyError } from "../src/lib/collector/sync";
import { db } from "../src/lib/db";
import { isSyncDue } from "../src/lib/scheduler";
const hours = Math.max(1, Number(process.env.SYNC_INTERVAL_HOURS) || 24);
let stopped = false;
process.on("SIGTERM", () => {
  stopped = true;
});
process.on("SIGINT", () => {
  stopped = true;
});
console.log(`情報収集ワーカー起動。更新間隔 ${hours} 時間`);
while (!stopped) {
  const last = await db.syncRun
    .findFirst({
      where: { status: { in: ["SUCCESS", "PARTIAL"] } },
      orderBy: { startedAt: "desc" },
    })
    .catch(() => null);
  if (isSyncDue(last?.finishedAt, hours)) {
    try {
      const r = await runSync();
      console.log(JSON.stringify({ time: new Date().toISOString(), ...r }));
    } catch (e) {
      console.error(
        e instanceof SyncBusyError
          ? "別の取得処理が実行中"
          : "DBまたは収集処理の接続失敗。60秒後に再確認します。",
      );
    }
  }
  await new Promise((r) => setTimeout(r, 60000));
}
await db.$disconnect();
