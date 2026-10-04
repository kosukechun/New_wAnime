import Link from "next/link";
import { ArrowUpRight, Search, Play } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import {
  jstToday,
  monthRange,
  weekStart,
  addDays,
  parseDate,
  timestampLabel,
} from "@/lib/dates";
import {
  workInclude,
  premiereDateWhere,
  validScheduleSource,
} from "@/lib/search";
import { WorkGrid } from "@/components/work-card";
import { CATEGORIES } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const today = jstToday();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const user = await currentUser();
  const favorites = user
    ? await db.favorite.findMany({
        where: { userId: user.id },
        select: { workId: true },
      })
    : [];
  const favoriteIds = favorites.map((f) => f.workId);
  const starts = (y: number, m: number): Prisma.WorkWhereInput =>
    premiereDateWhere(monthRange(y, m));
  const definitions: Array<{
    title: string;
    caption: string;
    where: Prisma.WorkWhereInput;
    href: string;
    sort?: "new" | "updated" | "popular" | "announced";
  }> = [
    {
      title: "今月の新作アニメ",
      caption: `${year}.${String(month).padStart(2, "0")}`,
      where: { category: "ANIME", ...starts(year, month) },
      href: `/works?category=ANIME&year=${year}&month=${month}`,
    },
    {
      title: "来月の新作アニメ",
      caption: `${nextYear}.${String(nextMonth).padStart(2, "0")}`,
      where: { category: "ANIME", ...starts(nextYear, nextMonth) },
      href: `/works?category=ANIME&year=${nextYear}&month=${nextMonth}`,
    },
    {
      title: "今月の新作ドラマ",
      caption: "国内・海外",
      where: {
        category: { in: ["DOMESTIC_DRAMA", "FOREIGN_DRAMA"] },
        ...starts(year, month),
      },
      href: `/works?year=${year}&month=${month}`,
    },
    {
      title: "来月の新作ドラマ",
      caption: "国内・海外",
      where: {
        category: { in: ["DOMESTIC_DRAMA", "FOREIGN_DRAMA"] },
        ...starts(nextYear, nextMonth),
      },
      href: `/works?year=${nextYear}&month=${nextMonth}`,
    },
    {
      title: "この先の注目作品",
      caption: "COMING SOON",
      where: {
        OR: [
          { status: "PLANNED" },
          { jpPremiere: { gte: parseDate(today)! } },
          { worldPremiere: { gte: parseDate(today)! } },
        ],
      },
      href: "/works?status=PLANNED&sort=popular",
      sort: "popular",
    },
    {
      title: "今週、放送・配信スタート",
      caption: "THIS WEEK",
      where: {
        OR: [
          {
            jpPremiere: {
              gte: parseDate(weekStart(today))!,
              lt: parseDate(addDays(weekStart(today), 7))!,
            },
          },
          {
            schedules: {
              some: {
                ...validScheduleSource,
                region: "JP",
                isPremiere: true,
                date: {
                  gte: parseDate(weekStart(today))!,
                  lt: parseDate(addDays(weekStart(today), 7))!,
                },
              },
            },
          },
        ],
      },
      href: "/calendar?view=week",
    },
    {
      title: "最近発表された作品",
      caption: "OFFICIAL ANNOUNCEMENTS",
      where: { announcedAt: { not: null } },
      href: "/works?sort=announced&announced=true",
      sort: "announced",
    },
    {
      title: "最近見つかった作品",
      caption: "NEW DISCOVERIES",
      where: {},
      href: "/works?sort=new",
      sort: "new",
    },
    {
      title: "情報が更新された作品",
      caption: "RECENT UPDATES",
      where: {},
      href: "/works?sort=updated",
      sort: "updated",
    },
    {
      title: "あなたのマイリスト",
      caption: "MY LIST",
      where: { id: { in: favoriteIds } },
      href: "/favorites",
    },
  ];
  const [sections, last, count] = await Promise.all([
    Promise.all(
      definitions.map(async (d) => ({
        ...d,
        works: await db.work.findMany({
          where: d.where,
          include: workInclude,
          take: 5,
          orderBy:
            d.sort === "announced"
              ? { announcedAt: "desc" }
              : d.sort === "new"
                ? { createdAt: "desc" }
                : d.sort === "updated"
                  ? { updatedAt: "desc" }
                  : d.sort === "popular"
                    ? { popularity: "desc" }
                    : { jpPremiere: { sort: "asc", nulls: "last" } },
        }),
      })),
    ),
    db.syncRun.findFirst({ orderBy: { startedAt: "desc" } }),
    db.work.count(),
  ]);
  const featured =
    sections[0].works[0] ?? sections[4].works[0] ?? sections[7].works[0];
  return (
    <>
      <section className="hero">
        {featured?.posterUrl && (
          <img
            className="hero-image"
            src={featured.posterUrl}
            alt=""
            fetchPriority="high"
          />
        )}
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow">DISCOVER YOUR NEXT STORY</span>
          <h1>
            {featured ? (
              featured.title
            ) : (
              <>
                新しい物語との出会いを、
                <br />
                もっと自由に。
              </>
            )}
          </h1>
          <div className="hero-meta">
            <span>
              {featured
                ? CATEGORIES[featured.category]
                : "アニメ · 国内ドラマ · 海外ドラマ"}
            </span>
            <span>
              ✦ {year}年{month}月の作品をチェック
            </span>
          </div>
          <p>
            {featured?.synopsis?.slice(0, 140) ??
              "放送スケジュール、配信サービス、好きな出演者。あなたにぴったりの一本を、ここから見つけよう。"}
          </p>
          <div className="hero-buttons">
            {featured && (
              <Link className="button primary" href={`/works/${featured.id}`}>
                <Play size={15} />
                作品の詳細を見る
              </Link>
            )}
            <Link className="button" href="/works">
              <Search size={15} />
              すべての作品を探す
            </Link>
          </div>
        </div>
        <span className="hero-counter">
          YOUR NEXT FAVORITE · {String(count).padStart(3, "0")}
        </span>
      </section>
      <div className="status-strip">
        <span>
          <i className="dot" />
          {count}作品を収録 · 最終取得 {timestampLabel(last?.finishedAt)}
        </span>
        <Link href="/about">
          出典の確認日時と収録範囲について{" "}
          <ArrowUpRight size={12} style={{ display: "inline" }} />
        </Link>
      </div>
      {last?.status === "FAILED" && (
        <div className="notice warning" style={{ marginTop: 15 }}>
          前回の更新で接続エラーがありました。保存済みの作品を表示しています。
        </div>
      )}
      {!last && (
        <div className="notice" style={{ marginTop: 15 }}>
          初回収集中の場合は完了後に再読み込みしてください。未取得の場合は管理者が情報更新を実行してください。
        </div>
      )}
      <nav className="category-tabs" aria-label="作品の分類">
        <Link className="active" href="/">
          すべて
        </Link>
        {Object.entries(CATEGORIES).map(([k, v]) => (
          <Link key={k} href={`/works?category=${k}`}>
            {v}
          </Link>
        ))}
      </nav>
      <p className="muted" style={{ marginTop: 15, fontSize: 11 }}>
        新作には続編シーズンの開始を含みます。外部DBの予定は参考情報です。公式発表を確認した情報を優先して表示します。
      </p>
      {sections.map((s) => (
        <section className="section" key={s.title}>
          <div className="section-head">
            <h2>
              {s.title}
              <small>{s.caption}</small>
            </h2>
            <Link href={s.href}>すべて見る ↗</Link>
          </div>
          {s.works.length ? (
            <WorkGrid
              works={s.works}
              favorites={favoriteIds}
              loggedIn={!!user}
            />
          ) : (
            <div className="notice">
              {s.title === "あなたのマイリスト"
                ? user
                  ? "気になる作品をブックマークすると、ここに表示されます。"
                  : "ログインすると、PCとスマートフォンでマイリストを共有できます。"
                : "日本での開始日が確認できた作品はまだありません。"}
              {s.title !== "あなたのマイリスト" && (
                <Link
                  className="accent"
                  href={`${s.href}${s.href.includes("?") ? "&" : "?"}scope=world`}
                >
                  {" "}
                  世界初公開日を含めて探す →
                </Link>
              )}
            </div>
          )}
        </section>
      ))}
      <p className="muted" style={{ marginTop: 25, fontSize: 11 }}>
        「最近見つかった作品」は当サービスへの追加順です。公式の発表日時とは異なります。日本の開始日が未確認の作品は、その旨を明記して別の公開日で表示します。
      </p>
    </>
  );
}
