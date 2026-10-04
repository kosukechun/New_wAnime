import { it, expect } from "vitest";
import { matchesWikiPerson, type WikiEntity } from "../../src/lib/wikipedia";
import { hashPassword, verifyPassword } from "../../src/lib/auth";
const claim = (
  value: string | { id?: string; time?: string; precision?: number },
) => [{ mainsnak: { datavalue: { value } } }];
it("同名だけではWikipediaを紐付けず、外部IDで本人を確認する", () => {
  const p = {
    name: "Same Name",
    nativeName: null,
    aliases: [],
    birthday: null,
    externalIds: [{ source: "TMDB", externalId: "123" }],
  };
  const e = {
    id: "Q1",
    labels: { en: { value: "Same Name" } },
    claims: { P31: claim({ id: "Q5" }), P4985: claim("456") },
  } as WikiEntity;
  expect(matchesWikiPerson(p, e)).toBe(false);
  e.claims!.P4985 = claim("123");
  expect(matchesWikiPerson(p, e)).toBe(true);
  e.claims!.P31 = claim({ id: "Q4167410" });
  expect(matchesWikiPerson(p, e)).toBe(false);
});
it("名前・生年月日・職業の3条件を必要とする", () => {
  const p = {
    name: "Example Actor",
    nativeName: null,
    aliases: [],
    birthday: new Date("2000-01-02T00:00:00Z"),
    externalIds: [],
  };
  const e = {
    id: "Q2",
    labels: { en: { value: p.name } },
    claims: {
      P31: claim({ id: "Q5" }),
      P569: claim({ time: "+2000-01-02T00:00:00Z", precision: 11 }),
      P106: claim({ id: "Q33999" }),
    },
  } as WikiEntity;
  expect(matchesWikiPerson(p, e)).toBe(true);
  e.claims!.P569 = claim({ time: "+2000-01-01T00:00:00Z", precision: 11 });
  expect(matchesWikiPerson(p, e)).toBe(false);
});
it("パスワードをsalt付きで保存し照合する", async () => {
  const a = await hashPassword("example-long-password");
  const b = await hashPassword("example-long-password");
  expect(a).not.toBe(b);
  expect(a).not.toContain("example-long-password");
  expect(await verifyPassword("example-long-password", a)).toBe(true);
  expect(await verifyPassword("wrong-password", a)).toBe(false);
  expect(await verifyPassword("x", "broken")).toBe(false);
});
