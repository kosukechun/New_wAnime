import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { buildWorkWhere, parseSearch, workInclude } from "@/lib/search";
import { jstToday } from "@/lib/dates";
import { WorkGrid } from "@/components/work-card";
import { FilterForm } from "@/components/filters";
import { SortSelect } from "@/components/sort-select";
import { CATEGORIES } from "@/lib/constants";
export const dynamic = "force-dynamic";
export const metadata = { title: "作品を探す" };
export function paramsFromObject(
  raw: Record<string, string | string[] | undefined>,
) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
    else if (v) p.set(k, v);
  }
  return p;
}
export default async function WorksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = paramsFromObject(await searchParams);
  let f;
  try {
    f = parseSearch(params);
  } catch {
    return (
      <div className="empty" style={{ marginTop: 40 }}>
        <h1>検索条件を確認してください</h1>
        <p>年・月・期間などに不正な値があります。</p>
        <Link className="button" href="/works">
          条件をリセット
        </Link>
      </div>
    );
  }
  const where = buildWorkWhere(f);
  const user = await currentUser();
  const dateField = f.scope === "jp" ? "jpPremiere" : "worldPremiere";
  const orderBy =
    f.sort === "announced"
      ? { announcedAt: { sort: "desc" as const, nulls: "last" as const } }
      : f.sort === "updated"
        ? { updatedAt: "desc" as const }
        : f.sort === "new"
          ? { createdAt: "desc" as const }
          : f.sort === "popular"
            ? { popularity: "desc" as const }
            : { [dateField]: { sort: "asc" as const, nulls: "last" as const } };
  const [total, works, favorites] = await Promise.all([
    db.work.count({ where }),
    db.work.findMany({
      where,
      include: workInclude,
      orderBy: [orderBy, { id: "asc" }],
      take: 24,
      skip: (f.page - 1) * 24,
    }),
    user
      ? db.favorite.findMany({
          where: { userId: user.id },
          select: { workId: true },
        })
      : Promise.resolve([]),
  ]);
  const pages = Math.ceil(total / 24);
  const pageLink = (n: number) => {
    const p = new URLSearchParams(params);
    p.set("page", String(n));
    return `/works?${p}`;
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EXPLORE THE STORIES</span>
          <h1>次の「観たい」を見つける。</h1>
          <p className="muted">
            年月、ジャンル、好きな出演者から、あなたの一本へ。
          </p>
        </div>
      </div>
      <nav className="category-tabs" style={{ marginTop: 0, marginBottom: 25 }}>
        {[["", "すべて"], ...Object.entries(CATEGORIES)].map(([k, v]) => {
          const p = new URLSearchParams(params);
          if (k) p.set("category", k);
          else p.delete("category");
          p.delete("page");
          return (
            <Link
              key={k}
              href={`/works?${p}`}
              className={(f.category ?? "") === k ? "active" : ""}
            >
              {v}
            </Link>
          );
        })}
      </nav>
      <div className="search-layout">
        <FilterForm filters={f} currentYear={Number(jstToday().slice(0, 4))} />
        <div className="search-results">
          <div className="results-bar">
            <span>
              <strong className="accent">{total}</strong>{" "}
              <span className="muted">作品が見つかりました</span>
            </span>
            <Suspense>
              <SortSelect value={f.sort} />
            </Suspense>
          </div>
          {f.scope === "jp" && (f.year || f.from || f.to) && (
            <div className="notice" style={{ marginBottom: 20 }}>
              日本での初回放送・配信開始日が確認できた作品を表示しています。
              <Link
                className="accent"
                href={`/works?${new URLSearchParams({ ...Object.fromEntries(params), scope: "world" })}`}
              >
                世界初公開日も検索 →
              </Link>
            </div>
          )}
          {f.status === "AIRING" && (
            <div className="notice" style={{ marginBottom: 20 }}>
              放送中のみ表示しています。取得元の放送状態を基本に、未定作品は確認済みの開始・終了期間で判定します。未来の開始日や過去の終了日が分かる作品は除外します。日本での放送が未確認の海外作品は、取得元の放送状態を使用します。
            </div>
          )}
          {works.length ? (
            <WorkGrid
              works={works}
              favorites={favorites.map((f) => f.workId)}
              loggedIn={!!user}
            />
          ) : (
            <div className="empty">
              <h3>条件に一致する作品がありません</h3>
              <p>
                条件を減らすか、開始日の基準を「世界初公開日を含む」に変更してください。
                <br />
                未確認の配信サービスや出演者は検索結果に含まれません。
              </p>
              <Link className="button" href="/works">
                すべての作品を見る
              </Link>
            </div>
          )}
          {pages > 1 && (
            <nav className="pagination" aria-label="ページ切り替え">
              {f.page > 1 && (
                <Link className="button" href={pageLink(f.page - 1)}>
                  ← 前へ
                </Link>
              )}
              <span className="muted">
                {f.page} / {pages}
              </span>
              {f.page < pages && (
                <Link className="button" href={pageLink(f.page + 1)}>
                  次へ →
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
