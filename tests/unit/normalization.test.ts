import { describe, it, expect } from "vitest";
import { normalizeGenres, safeUrl, plainText } from "../../src/lib/normalize";
import { normalizeTmdbOffers } from "../../src/lib/collector/tmdb";
import { normalizeTvmaze, tvShowSchema } from "../../src/lib/collector/tvmaze";
import { fuzzyDate } from "../../src/lib/collector/anilist";
describe("外部データの信頼性", () => {
  it("ジャンル表記を正規化する", () =>
    expect(
      normalizeGenres([
        "Fantasy",
        "ファンタジー",
        "Science-Fiction",
        "Unknown",
      ]),
    ).toEqual(["fantasy", "sf"]));
  it("危険なリンクとHTMLを描画しない", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("https://user:secret@example.com")).toBeNull();
    expect(plainText("<p>A &amp; B</p>")).toBe("A & B");
  });
  it("JPで確認できた料金区分だけ保存し、直接視聴URLを生成しない", () => {
    const offers = normalizeTmdbOffers(
      {
        results: {
          US: {
            flatrate: [
              { provider_id: 8, provider_name: "Netflix", logo_path: null },
            ],
          },
          JP: {
            link: "https://www.themoviedb.org/tv/1/watch?locale=JP",
            rent: [
              {
                provider_id: 9,
                provider_name: "Amazon Prime Video",
                logo_path: null,
              },
            ],
          },
        },
      },
      1,
    );
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({
      region: "JP",
      type: "RENT",
      platformId: "prime",
      watchUrl: null,
    });
    expect(offers[0].startDate).toBeUndefined();
    expect(normalizeTmdbOffers({ results: { US: {} } }, 1)).toEqual([]);
  });
  it("国外Netflixを日本の配信に推測で追加しない", () => {
    const show = tvShowSchema.parse({
      id: 1,
      name: "Example",
      url: "https://www.tvmaze.com/shows/1",
      type: "Scripted",
      language: "English",
      genres: ["Drama"],
      status: "Running",
      premiered: "2027-01-01",
      webChannel: { name: "Netflix", country: null },
    });
    const r = normalizeTvmaze(show);
    expect(r.jpPremiere).toBeUndefined();
    expect(r.offers).toBeUndefined();
    expect(r.worldPremiere).toBe("2027-01-01");
  });
  it("月しか分からないアニメに1日を補わない", () => {
    expect(fuzzyDate({ year: 2027, month: 1 })).toBeNull();
    expect(fuzzyDate({ year: 2027, month: 1, day: 5 })).toBe("2027-01-05");
  });
});
