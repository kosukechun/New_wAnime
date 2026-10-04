// CIの専用DBだけに投入する操作テスト用fixture。アプリ初回起動では呼ばない。
import { seedTaxonomy, saveWork } from "../../src/lib/collector/store";
import { db } from "../../src/lib/db";
if (
  !process.env.DATABASE_URL ||
  !new URL(process.env.DATABASE_URL).pathname.endsWith("_test")
)
  throw new Error("E2E fixture は専用 _test DBでだけ使用できます");
try {
  await seedTaxonomy();
  await saveWork({
    source: "TEST",
    externalId: "e2e-anime",
    title: "画面テスト用作品",
    aliases: [],
    category: "ANIME",
    status: "PLANNED",
    jpPremiere: "2027-04-05",
    sourceUrl: "https://example.com/test-fixture",
    genres: ["fantasy", "isekai"],
    companies: [],
    people: [
      {
        source: "TEST",
        externalId: "e2e-voice",
        name: "テスト用声優",
        kind: "VOICE_ACTOR",
        role: "テスト役",
        sourceUrl: "https://example.com/test-fixture",
      },
    ],
  });
} finally {
  await db.$disconnect();
}
