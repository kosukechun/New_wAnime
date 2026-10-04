import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { workInclude } from "@/lib/search";
import { WorkCard } from "@/components/work-card";
import { FavoriteEditor } from "@/components/favorite";
import { WATCH_STATUSES } from "@/lib/constants";
export const dynamic = "force-dynamic";
export const metadata = { title: "マイリスト" };
export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await currentUser();
  if (!user)
    return (
      <div className="empty" style={{ marginTop: 50 }}>
        <h1>観たい作品を、いつでも手元に。</h1>
        <p>
          ログインすると、マイリスト・視聴状態・メモをPCとスマートフォンで共有できます。
        </p>
        <Link className="button primary" href="/login">
          ログイン・新規登録
        </Link>
      </div>
    );
  const { status } = await searchParams;
  const valid =
    status && Object.keys(WATCH_STATUSES).includes(status)
      ? (status as keyof typeof WATCH_STATUSES)
      : undefined;
  const favorites = await db.favorite.findMany({
    where: { userId: user.id, ...(valid ? { status: valid } : {}) },
    include: { work: { include: workInclude } },
    orderBy: [
      { work: { jpPremiere: { sort: "asc", nulls: "last" } } },
      { updatedAt: "desc" },
    ],
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MY WATCHLIST</span>
          <h1>あなたの「観たい」。</h1>
          <p className="muted">{favorites.length}作品 · 放送開始日順</p>
        </div>
        <Link className="button" href="/calendar?favorites=true">
          カレンダーで見る
        </Link>
      </div>
      <nav className="category-tabs" style={{ marginTop: 0, marginBottom: 25 }}>
        <Link className={!valid ? "active" : ""} href="/favorites">
          すべて
        </Link>
        {Object.entries(WATCH_STATUSES).map(([k, v]) => (
          <Link
            className={valid === k ? "active" : ""}
            key={k}
            href={`/favorites?status=${k}`}
          >
            {v}
          </Link>
        ))}
      </nav>
      {favorites.length ? (
        <div className="grid-works">
          {favorites.map((f) => (
            <div key={f.workId}>
              <WorkCard work={f.work} favorite loggedIn />
              <div className="panel" style={{ padding: 13, marginTop: 15 }}>
                <FavoriteEditor
                  workId={f.workId}
                  loggedIn
                  initial={{ status: f.status, memo: f.memo }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>マイリストはまだ空です</h3>
          <p>気になる作品のブックマークを押して追加しましょう。</p>
          <Link className="button primary" href="/works">
            作品を探す
          </Link>
        </div>
      )}
    </>
  );
}
