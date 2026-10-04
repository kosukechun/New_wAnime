import "dotenv/config";
import { discoverPeople } from "../src/lib/person-discovery";
import { db } from "../src/lib/db";
try {
  console.log("日本語名の外部検索:", await discoverPeople("花澤香菜"));
  console.log("女優名の外部検索:", await discoverPeople("橋本環奈"));
  console.log(
    "本人確認済み:",
    await db.person.count({ where: { wikipediaUrl: { not: null } } }),
  );
  console.log(
    "声優検索:",
    await db.person.findMany({
      where: { nativeName: { contains: "花澤" } },
      select: {
        id: true,
        name: true,
        nativeName: true,
        wikipediaUrl: true,
        _count: { select: { credits: true } },
      },
    }),
  );
  console.log(
    "女優検索:",
    await db.person.findMany({
      where: { nativeName: { contains: "橋本" }, kind: "ACTOR" },
      select: {
        id: true,
        name: true,
        nativeName: true,
        _count: { select: { credits: true } },
      },
    }),
  );
} finally {
  await db.$disconnect();
}
