import Link from "next/link";
import { db } from "@/lib/db";
import { PersonCard } from "@/components/person-card";
import { jstToday, monthRange, parseDate } from "@/lib/dates";
import { z } from "zod";
import { ExternalPeopleSearch } from "@/components/external-people";
export const dynamic = "force-dynamic";
export const metadata = { title: "声優・俳優・女優を探す" };
const schema = z.object({
  q: z.string().max(100).default(""),
  kind: z.enum(["VOICE_ACTOR", "ACTOR"]).optional(),
  year: z.coerce.number().int().min(1900).max(2200).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  period: z.enum(["current", "next", "future"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const parsed = schema.safeParse(
    Object.fromEntries(Object.entries(await searchParams).filter(([, v]) => v)),
  );
  if (!parsed.success)
    return (
      <div className="empty">
        検索条件が不正です。<Link href="/people">リセット</Link>
      </div>
    );
  const f = parsed.data;
  const today = jstToday();
  const currentYear = Number(today.slice(0, 4));
  let year = f.year;
  let month = f.month;
  let range;
  if (f.period === "current" || f.period === "next") {
    const offset = f.period === "next" ? 1 : 0;
    const quarter = Math.floor((Number(today.slice(5, 7)) - 1) / 3) + offset;
    year = currentYear + Math.floor(quarter / 4);
    month = (quarter % 4) * 3 + 1;
    range = {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lt: new Date(Date.UTC(year, month + 2, 1)),
    };
  } else if (f.period === "future") range = { gte: parseDate(today)! };
  else if (year)
    range = month
      ? monthRange(year, month)
      : {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        };
  const c = { contains: f.q, mode: "insensitive" as const };
  const workFilter = range
    ? {
        OR: [
          { jpPremiere: range },
          { worldPremiere: range },
          {
            schedules: {
              some: { region: "JP", isPremiere: true, date: range },
            },
          },
        ],
      }
    : {};
  const where = {
    AND: f.kind
      ? [{ OR: [{ kind: f.kind }, { credits: { some: { kind: f.kind } } }] }]
      : [],
    ...(f.q
      ? { OR: [{ name: c }, { nativeName: c }, { aliases: { has: f.q } }] }
      : {}),
    ...(range ? { credits: { some: { work: workFilter } } } : {}),
  };
  const [total, people] = await Promise.all([
    db.person.count({ where }),
    db.person.findMany({
      where,
      orderBy: [{ nativeName: "asc" }, { name: "asc" }],
      take: 24,
      skip: (f.page - 1) * 24,
    }),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FOLLOW YOUR FAVORITES</span>
          <h1>好きな人から、作品に出会う。</h1>
          <p className="muted">
            声優・俳優・女優の出演作品と、これからの予定を検索。
          </p>
        </div>
      </div>
      <form action="/people" className="panel">
        <div className="chips" style={{ alignItems: "end" }}>
          <div className="field" style={{ flex: "2 1 200px", marginBottom: 0 }}>
            <label htmlFor="people-q">出演者名</label>
            <input
              id="people-q"
              name="q"
              defaultValue={f.q}
              placeholder="声優・女優・俳優の名前"
              type="search"
              maxLength={100}
            />
          </div>
          <div className="field" style={{ flex: "1 1 120px", marginBottom: 0 }}>
            <label htmlFor="people-kind">人物の種類</label>
            <select id="people-kind" name="kind" defaultValue={f.kind ?? ""}>
              <option value="">すべて</option>
              <option value="VOICE_ACTOR">声優</option>
              <option value="ACTOR">俳優・女優</option>
            </select>
          </div>
          <div className="field" style={{ flex: "1 1 100px", marginBottom: 0 }}>
            <label htmlFor="people-year">放送年</label>
            <select id="people-year" name="year" defaultValue={f.year ?? ""}>
              <option value="">すべての年</option>
              {Array.from(
                { length: currentYear - 1950 + 7 },
                (_, i) => currentYear + 5 - i,
              ).map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: "1 1 100px", marginBottom: 0 }}>
            <label htmlFor="people-month">開始月</label>
            <select id="people-month" name="month" defaultValue={f.month ?? ""}>
              <option value="">すべての月</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}月
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: "1 1 130px", marginBottom: 0 }}>
            <label htmlFor="people-period">出演時期</label>
            <select
              id="people-period"
              name="period"
              defaultValue={f.period ?? ""}
            >
              <option value="">指定年月 / 全期間</option>
              <option value="current">今期の出演</option>
              <option value="next">来期の出演</option>
              <option value="future">今後の出演予定</option>
            </select>
          </div>
          <button
            type="submit"
            className="primary"
            style={{ padding: "11px 24px" }}
          >
            検索する
          </button>
        </div>
      </form>
      <div className="section-head">
        <h2>
          検索結果 <small>{total}人</small>
        </h2>
        <Link href="/people">条件をリセット</Link>
      </div>
      {people.length ? (
        <div className="people-grid">
          {people.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>一致する出演者が見つかりません</h3>
          <p>
            日本語・英語・別名でもお試しください。取得元に未収録の出演者は表示できません。
          </p>
        </div>
      )}
      {total > 24 && (
        <nav className="pagination">
          {f.page > 1 && (
            <Link
              className="button"
              href={`/people?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries(f)
                    .filter(([, v]) => v != null)
                    .map(([k, v]) => [k, String(v)]),
                ),
                page: String(f.page - 1),
              })}`}
            >
              ← 前へ
            </Link>
          )}
          <span>
            {f.page} / {Math.ceil(total / 24)}
          </span>
          {f.page * 24 < total && (
            <Link
              className="button"
              href={`/people?${new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries(f)
                    .filter(([, v]) => v != null)
                    .map(([k, v]) => [k, String(v)]),
                ),
                page: String(f.page + 1),
              })}`}
            >
              次へ →
            </Link>
          )}
        </nav>
      )}
      {f.q.length >= 2 && <ExternalPeopleSearch key={f.q} query={f.q} />}
      <div className="notice" style={{ marginTop: 25 }}>
        名前・画像は、本人との一致を確認済みの場合に日本語Wikipediaへリンクします。未確認の場合はアプリ内プロフィールで確認できます。時期の検索には、明記した世界初公開日も含みます。
      </div>
    </>
  );
}
