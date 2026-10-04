import { describe, it, expect } from "vitest";
import { isInKnownBroadcastPeriod } from "../../src/lib/airing";
import { buildWorkWhere, parseSearch } from "../../src/lib/search";

const today = "2026-10-04";
describe("放送中の判定", () => {
  it("開始日だけで放送中を推測しない", () => {
    expect(
      isInKnownBroadcastPeriod(
        { jpPremiere: "2020-01-01", worldPremiere: null },
        today,
      ),
    ).toBe(false);
    expect(
      isInKnownBroadcastPeriod(
        { jpPremiere: null, worldPremiere: null, endDate: "2026-12-01" },
        today,
      ),
    ).toBe(false);
  });
  it("開始日と終了日の当日を含み、期間外を除外する", () => {
    for (const [start, end, expected] of [
      [today, "2026-12-01", true],
      ["2026-09-01", today, true],
      ["2026-10-05", "2026-12-01", false],
      ["2026-09-01", "2026-10-03", false],
    ] as const) {
      expect(
        isInKnownBroadcastPeriod(
          { jpPremiere: start, worldPremiere: null, endDate: end },
          today,
        ),
      ).toBe(expected);
    }
  });
  it("日本の開始日を世界初公開日より優先する", () => {
    expect(
      isInKnownBroadcastPeriod(
        {
          jpPremiere: "2026-10-05",
          worldPremiere: "2026-01-01",
          endDate: "2026-12-01",
        },
        today,
      ),
    ).toBe(false);
    expect(
      isInKnownBroadcastPeriod(
        {
          jpPremiere: null,
          worldPremiere: new Date("2026-09-01T00:00:00Z"),
          endDate: new Date("2026-12-01T00:00:00Z"),
        },
        today,
      ),
    ).toBe(true);
  });
  it("スイッチの共有URLで放送中判定を使い、オフでは解除する", () => {
    expect(buildWorkWhere(parseSearch(new URLSearchParams()), today)).toEqual({
      AND: [],
    });
    const where = buildWorkWhere(
      parseSearch(new URLSearchParams("status=AIRING&genres=fantasy")),
      today,
    );
    expect(JSON.stringify(where)).toContain('"UNKNOWN"');
    expect(JSON.stringify(where)).toContain("2026-10-04");
    expect(JSON.stringify(where)).toContain("fantasy");
    expect(
      buildWorkWhere(
        parseSearch(new URLSearchParams("status=FINISHED")),
        today,
      ),
    ).toEqual({ AND: [{ status: "FINISHED" }] });
  });
});
