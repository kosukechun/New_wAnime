import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { ensureWikipedia } from "@/lib/wikipedia";
import { dateLabel, jstToday } from "@/lib/dates";
import { WorkCard } from "@/components/work-card";
import { workInclude } from "@/lib/search";
import { WikiButton } from "@/components/wiki-button";
import { CreditsButton } from "@/components/credits-button";
export const dynamic = "force-dynamic";
export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const base = await db.person.findUnique({ where: { id } });
  if (!base) notFound();
  const p = (await ensureWikipedia(id)) ?? base;
  const user = await currentUser();
  const [favorites, credits] = await Promise.all([
    user
      ? db.favorite.findMany({
          where: { userId: user.id },
          select: { workId: true },
        })
      : Promise.resolve([]),
    db.credit.findMany({
      where: { personId: id },
      include: { work: { include: workInclude } },
      orderBy: { work: { worldPremiere: "desc" } },
    }),
  ]);
  const today = jstToday();
  const unique = credits.filter(
    (c, i) => credits.findIndex((x) => x.workId === c.workId) === i,
  );
  const future = unique.filter(
    (c) =>
      c.work.status === "PLANNED" ||
      (c.work.jpPremiere?.toISOString().slice(0, 10) ??
        c.work.worldPremiere?.toISOString().slice(0, 10) ??
        "") >= today,
  );
  const render = (cs: typeof credits) => (
    <div className="grid-works">
      {cs.map((c) => (
        <div key={c.id}>
          <WorkCard
            work={c.work}
            favorite={favorites.some((f) => f.workId === c.workId)}
            loggedIn={!!user}
          />
          <p className="accent" style={{ fontSize: 11, marginTop: 8 }}>
            役：{c.role}
          </p>
        </div>
      ))}
    </div>
  );
  return (
    <>
      <p className="breadcrumb">
        <Link href="/people">出演者を探す</Link> / {p.nativeName ?? p.name}
      </p>
      <section className="profile-hero">
        {p.wikipediaUrl ? (
          <a href={p.wikipediaUrl} target="_blank" rel="noopener noreferrer">
            {p.photoUrl && (
              <img
                className="avatar"
                src={p.photoUrl}
                alt={p.nativeName ?? p.name}
              />
            )}
          </a>
        ) : (
          p.photoUrl && (
            <img
              className="avatar"
              src={p.photoUrl}
              alt={p.nativeName ?? p.name}
            />
          )
        )}
        <div>
          <span className="eyebrow">
            {p.kind === "VOICE_ACTOR" ? "VOICE ACTOR" : "ACTOR"}
          </span>
          <h1>
            {p.wikipediaUrl ? (
              <a
                href={p.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {p.nativeName ?? p.name}
              </a>
            ) : (
              (p.nativeName ?? p.name)
            )}
          </h1>
          <p className="muted">{p.aliases.join(" / ")}</p>
          {p.wikipediaUrl ? (
            <a
              href={p.wikipediaUrl}
              className="button"
              target="_blank"
              rel="noopener noreferrer"
            >
              日本語Wikipedia ↗
            </a>
          ) : (
            <>
              <p className="muted" style={{ fontSize: 12 }}>
                日本語Wikipedia記事は未確認です。
              </p>
              <WikiButton id={id} />
              <a
                href={`https://ja.wikipedia.org/w/index.php?search=${encodeURIComponent(p.nativeName ?? p.name)}`}
                className="accent"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12 }}
              >
                Wikipediaで検索 ↗
              </a>
            </>
          )}
        </div>
      </section>
      <section className="panel">
        <h2>プロフィール</h2>
        <p className="long-copy muted">
          {p.biography ??
            "プロフィール本文は取得元に収録されていません。確認済みの外部ページをご参照ください。"}
        </p>
        <dl className="info-list">
          <dt>生年月日</dt>
          <dd>{dateLabel(p.birthday)}</dd>
          <dt>参照元</dt>
          <dd>
            <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">
              人物情報の取得元 ↗
            </a>
            {p.wikipediaUrl && (
              <>
                {" "}
                /{" "}
                <a
                  href={p.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Wikipedia（CC BY-SA）↗
                </a>
              </>
            )}
          </dd>
        </dl>
        <CreditsButton id={id} loggedIn={!!user} />
      </section>
      <div className="section-head">
        <h2>
          これからの出演作品<small>{future.length}作品</small>
        </h2>
      </div>
      {future.length ? (
        render(future)
      ) : (
        <div className="notice">
          取得済みデータに、今後の出演予定はありません。
        </div>
      )}
      <section className="section">
        <div className="section-head">
          <h2>
            収録済みの出演作品<small>{unique.length}作品</small>
          </h2>
          <Link
            href={`/works?person=${encodeURIComponent(p.nativeName ?? p.name)}`}
          >
            年月・ジャンルで絞り込む →
          </Link>
        </div>
        {unique.length ? (
          render(unique)
        ) : (
          <div className="notice">出演作品は未確認です。</div>
        )}
      </section>
    </>
  );
}
