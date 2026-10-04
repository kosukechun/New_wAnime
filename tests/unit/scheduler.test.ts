import { it, expect } from "vitest";
import { isSyncDue } from "../../src/lib/scheduler";
it("初回に取得し、24時間経過した保存データを更新する", () => {
  const finished = new Date("2026-10-04T00:00:00Z");
  expect(isSyncDue(null, 24, finished.getTime())).toBe(true);
  expect(isSyncDue(finished, 24, finished.getTime() + 23 * 3600000)).toBe(
    false,
  );
  expect(isSyncDue(finished, 24, finished.getTime() + 24 * 3600000)).toBe(true);
});
