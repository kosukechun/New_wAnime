import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { dateLabel, timestampLabel } from "@/lib/dates";
import { CATEGORIES, STATUSES, OFFER_TYPES, WEEKDAYS } from "@/lib/constants";
import { FavoriteEditor } from "@/components/favorite";
import { PersonCard } from "@/components/person-card";
import { SyncButton } from "@/components/admin-actions";
import { Film } from "lucide-react";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const w = await db.work.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: w?.title ?? "作品詳細" };
}
export default async function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const w = await db.work.findUnique({
    where: { id },
    include: {
      aliases: true,
      genres: { include: { genre: true } },
      companies: { include: { company: true } },
      externalIds: true,
      offers: { include: { platform: true }, where: { region: "JP" } },
      schedules: {
        include: { broadcaster: true },
        orderBy: { date: "asc" },
        take: 150,
      },
      credits: { include: { person: true } },
      histories: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!w) notFound();
  const user = await currentUser();
  const favorite = user
    ? await db.favorite.findUnique({
        where: { userId_workId: { userId: user.id, workId: id } },
      })
    : null;
  const sourceLink = (url: string, label: string) => (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {label} ↗
    </a>
  );
  const jpSchedules = w.schedules.filter(
    (s) =>
      s.region === "JP" &&
      (w.confidence !== "OFFICIAL" || s.source === "OFFICIAL"),
  );
  return (
    <>
      <p className="breadcrumb">
        <Link href="/works">作品を探す</Link> / {CATEGORIES[w.category]} /{" "}
        {w.title}
      </p>
      <section className="detail-hero">
        <div>
          {w.posterUrl ? (
            <img
              className="detail-poster"
              src={w.posterUrl}
              alt={w.title}
              fetchPriority="high"
            />
          ) : (
            <div className="poster no-image">
              <Film size={38} />
              ビジュアル未発表
            </div>
          )}
        </div>
        <div className="detail-info">
          <span className="eyebrow">
            {CATEGORIES[w.category]} · {STATUSES[w.status]}
          </span>
          <h1>{w.title}</h1>
          {w.englishTitle && <p className="muted">{w.englishTitle}</p>}
          <div className="pill-row">
            {w.genres.map((g) => (
              <Link
                key={g.genreId}
                href={`/works?genres=${g.genreId}`}
                className="pill"
              >
                {g.genre.name}
              </Link>
            ))}
          </div>
          <div className="detail-actions">
            {w.officialUrl && sourceLink(w.officialUrl, "公式サイト")}
            {w.trailerUrl && sourceLink(w.trailerUrl, "PV・予告動画")}
            {w.officialX && sourceLink(w.officialX, "公式X")}
          </div>
          <p className="muted synopsis-preview">
            {w.synopsis?.slice(0, 230) ?? "あらすじは未発表です。"}
          </p>
          <p className="muted" style={{ fontSize: 11 }}>
            出典：{sourceLink(w.sourceUrl, w.sourceName)} · 確認{" "}
            {timestampLabel(w.checkedAt)}
            <br />
            {w.confidence === "OFFICIAL"
              ? "公式発表と照合した情報"
              : "外部データベースの参考情報。公式情報が確認でき次第、優先して反映します。"}
          </p>
          {user?.role === "ADMIN" && <SyncButton workId={id} />}
        </div>
      </section>
      <div className="details-grid">
        <div>
          <section className="panel">
            <h2>あらすじ</h2>
            <p className="long-copy muted">{w.synopsis ?? "未発表"}</p>
          </section>
          <section className="panel">
            <h2>作品情報</h2>
            <dl className="info-list">
              <dt>日本での開始日</dt>
              <dd>{dateLabel(w.jpPremiere)}</dd>
              <dt>世界初公開日</dt>
              <dd>
                {dateLabel(w.worldPremiere)}
                {!w.worldPremiere && w.declaredYear
                  ? `（${w.declaredYear}年${w.declaredMonth ? `${w.declaredMonth}月` : ""}予定、日付未定）`
                  : ""}
              </dd>
              <dt>公式発表日</dt>
              <dd>{dateLabel(w.announcedAt)}</dd>
              <dt>放送終了日</dt>
              <dd>{dateLabel(w.endDate)}</dd>
              <dt>話数 / 放送時間</dt>
              <dd>
                {w.episodeCount ? `${w.episodeCount}話` : "話数未発表"} /{" "}
                {w.runtimeMinutes ? `${w.runtimeMinutes}分` : "時間未発表"}
              </dd>
              <dt>制作会社</dt>
              <dd>
                {w.companies.map((c) => c.company.name).join("、") || "未発表"}
              </dd>
              <dt>原作名</dt>
              <dd>{w.originalWorkTitle ?? "未確認"}</dd>
              <dt>原作媒体</dt>
              <dd>{w.sourceMedium ?? "未確認"}</dd>
              <dt>新作区分</dt>
              <dd>
                {(
                  {
                    NEW: "完全新作",
                    SEQUEL: "続編",
                    REMAKE: "リメイク",
                  } as Record<string, string>
                )[w.installment ?? ""] ?? "未確認"}
              </dd>
              <dt>別タイトル</dt>
              <dd>
                {[w.originalTitle, ...w.aliases.map((a) => a.title)]
                  .filter(Boolean)
                  .join(" / ") || "未確認"}
              </dd>
              <dt>スタッフ</dt>
              <dd>
                {w.metadata &&
                typeof w.metadata === "object" &&
                !Array.isArray(w.metadata) &&
                Array.isArray(w.metadata.staff)
                  ? w.metadata.staff.join(" / ")
                  : "監督・脚本・原作者は確認中"}
              </dd>
              <dt>外部データID</dt>
              <dd>
                {w.externalIds
                  .map((x) => `${x.source}: ${x.externalId}`)
                  .join(" / ")}
              </dd>
            </dl>
          </section>
          <section className="panel">
            <h2>日本の放送・配信予定</h2>
            {jpSchedules.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>時刻</th>
                      <th>放送局 / 配信</th>
                      <th>回</th>
                      <th>出典</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jpSchedules.map((s) => (
                      <tr key={s.id}>
                        <td>
                          {dateLabel(s.date)}（
                          {WEEKDAYS[s.weekday ?? s.date.getUTCDay()]}）
                        </td>
                        <td>{s.time ?? "未定"}</td>
                        <td>
                          {s.kind === "TV" ? "📺 " : "▶ "}
                          {s.broadcaster?.name ?? s.label ?? "未発表"}
                        </td>
                        <td>
                          {s.isPremiere
                            ? "初回"
                            : s.episodeNumber
                              ? `第${s.episodeNumber}話`
                              : "未確認"}
                        </td>
                        <td>{sourceLink(s.sourceUrl, s.source)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">
                日本での放送日時は未確認です。公式サイトの放送・配信案内をご確認ください。
              </p>
            )}
            <p className="muted" style={{ fontSize: 11, marginTop: 15 }}>
              日時はJST。番組表の出典から取得した予定を表示します。
            </p>
          </section>
          <section className="section">
            <div className="section-head">
              <h2>
                {w.category === "ANIME"
                  ? "キャラクター・声優"
                  : "登場人物・出演者"}
              </h2>
            </div>
            {w.credits.length ? (
              <div className="people-grid">
                {w.credits.map((c) => (
                  <PersonCard key={c.id} person={c.person} role={c.role} />
                ))}
              </div>
            ) : (
              <div className="notice">
                出演者情報は未発表、または取得元に収録されていません。
              </div>
            )}
          </section>
          <section className="panel" style={{ marginTop: 30 }}>
            <h2>取得・更新履歴</h2>
            {w.histories.map((h) => (
              <p key={h.id} className="muted" style={{ fontSize: 12 }}>
                {timestampLabel(h.createdAt)} ·{" "}
                {sourceLink(h.sourceUrl, h.source)} の変更を反映
              </p>
            ))}
          </section>
        </div>
        <aside>
          <section className="panel">
            <FavoriteEditor
              workId={id}
              initial={
                favorite
                  ? { status: favorite.status, memo: favorite.memo }
                  : null
              }
              loggedIn={!!user}
            />
          </section>
          <section className="panel">
            <h2>日本で観られるサービス</h2>
            {w.offers.length ? (
              w.offers.map((o) => (
                <div className="offer" key={o.id}>
                  <div className="offer-brand">
                    {o.platform.logoUrl && (
                      <img src={o.platform.logoUrl} alt="" loading="lazy" />
                    )}
                    {o.platform.name}
                    <span className="pill">{OFFER_TYPES[o.type]}</span>
                  </div>
                  <p className="offer-info">
                    配信開始：{dateLabel(o.startDate)}
                    {o.exclusive ? " · 独占配信" : ""}
                    {o.early ? " · 先行配信" : ""}
                  </p>
                  <div className="offer-links">
                    {o.watchUrl && sourceLink(o.watchUrl, "作品を観る")}
                    {o.availabilityUrl &&
                      sourceLink(o.availabilityUrl, "視聴ページを確認")}
                  </div>
                  <p className="muted" style={{ fontSize: 10, marginTop: 8 }}>
                    確認 {timestampLabel(o.checkedAt)} ·{" "}
                    {sourceLink(o.sourceUrl, o.source)}
                  </p>
                </div>
              ))
            ) : (
              <p className="muted">配信情報未確認</p>
            )}
            <p className="muted" style={{ fontSize: 10, marginTop: 15 }}>
              TMDBの配信情報はJustWatch提供。サービスへの直接リンクが取得できない場合は、視聴先の確認ページをご案内します。独占・先行情報は確認できた場合だけ表示します。
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
