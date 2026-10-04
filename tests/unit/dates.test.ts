import { describe, it, expect } from "vitest";
import {
  jstToday,
  jstParts,
  parseDate,
  monthRange,
  addDays,
  weekStart,
} from "../../src/lib/dates";
describe("JSTと日付の精度", () => {
  it("UTCの前日から日本の翌日へ変換する", () => {
    expect(jstToday(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
    expect(jstParts("2026-10-01T15:30:00Z")).toEqual({
      date: "2026-10-02",
      time: "00:30",
    });
  });
  it("不完全・存在しない日を推測しない", () => {
    expect(parseDate("2027-02-29")).toBeNull();
    expect(parseDate("2027-01")).toBeNull();
    expect(parseDate("2028-02-29")?.toISOString()).toBe(
      "2028-02-29T00:00:00.000Z",
    );
  });
  it("年をまたぐ月・週を正しく扱う", () => {
    expect(monthRange(2026, 12).lt.toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekStart("2027-01-03")).toBe("2026-12-28");
  });
});
