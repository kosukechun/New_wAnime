import { describe, it, expect } from "vitest";
import { parseSearch, buildWorkWhere } from "../../src/lib/search";
describe("複合検索", () => {
  it("年と期間の条件を同時に守る", () => {
    const where = buildWorkWhere(
      parseSearch(
        new URLSearchParams("year=2027&from=2026-10-01&to=2027-04-01"),
      ),
    );
    expect(JSON.stringify(where)).toContain("2027-01-01");
    expect(JSON.stringify(where)).toContain("2027-04-01");
  });
  it("共有URLからすべての条件を組み合わせる", () => {
    const f = parseSearch(
      new URLSearchParams(
        "q=星&category=ANIME&year=2027&month=4&season=SPRING&genres=fantasy&genres=isekai&status=PLANNED&person=花澤香菜&platform=netflix&broadcaster=Tokyo&company=A&sourceMedium=MANGA&installment=SEQUEL&region=JP&scope=jp",
      ),
    );
    const where = buildWorkWhere(f);
    const serialized = JSON.stringify(where);
    for (const v of [
      "ANIME",
      "2027-04",
      "fantasy",
      "isekai",
      "PLANNED",
      "花澤香菜",
      "netflix",
      "MANGA",
      "SEQUEL",
      "SPRING",
    ])
      expect(serialized).toContain(v);
  });
  it("日本公開日検索に世界公開日を混ぜない", () => {
    const w = JSON.stringify(
      buildWorkWhere(parseSearch(new URLSearchParams("year=2027&month=1"))),
    );
    expect(w).toContain("jpPremiere");
    expect(w).not.toContain("worldPremiere");
  });
  it("ANDとORの複数ジャンルを区別する", () => {
    const all = buildWorkWhere(
      parseSearch(new URLSearchParams("genres=fantasy,romance")),
    );
    const any = buildWorkWhere(
      parseSearch(new URLSearchParams("genres=fantasy,romance&genreMode=any")),
    );
    expect(JSON.stringify(all)).not.toContain('"in"');
    expect(JSON.stringify(any)).toContain('"in"');
  });
  it("不正な年月・逆転した期間を拒否する", () => {
    for (const v of [
      "year=2027&month=13",
      "month=4",
      "from=2027-03-01&to=2027-02-01",
      "from=2027-02-30",
    ])
      expect(() => parseSearch(new URLSearchParams(v))).toThrow();
  });
});
