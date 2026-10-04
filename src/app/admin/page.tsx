import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { timestampLabel } from "@/lib/dates";
import { SyncButton, OfficialImport } from "@/components/admin-actions";
import { anilistEnabled } from "@/lib/collector/anilist";
export const dynamic = "force-dynamic";
export const metadata = { title: "情報更新・管理" };
export default async function AdminPage() {
  const user = await currentUser();
  if (user?.role !== "ADMIN")
    return (
      <div className="empty" style={{ marginTop: 40 }}>
        <h1>管理者権限が必要です</h1>
        <p>管理者アカウントでログインしてください。</p>
        <Link className="button primary" href="/login">
          ログイン
        </Link>
      </div>
    );
  const [workCount, personCount, userCount, runs] = await Promise.all([
    db.work.count(),
    db.person.count(),
    db.user.count(),
    db.syncRun.findMany({ orderBy: { startedAt: "desc" }, take: 30 }),
  ]);
  const last = runs[0];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">COLLECTION & OPERATIONS</span>
          <h1>情報更新と運用</h1>
          <p className="muted">最終完了 {timestampLabel(last?.finishedAt)}</p>
        </div>
        <SyncButton />
      </div>
      <div className="admin-stats">
        {[
          [workCount, "収録作品"],
          [personCount, "出演者"],
          [userCount, "ユーザー"],
          [last?.errors ?? 0, "前回のエラー"],
        ].map(([count, label]) => (
          <div className="stat" key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>取得元の接続状態</h2>
        <dl className="info-list">
          <dt>TVmaze</dt>
          <dd>有効（キー不要 / 番組表・作品・出演者）</dd>
          <dt>TMDB / JustWatch</dt>
          <dd>
            {process.env.TMDB_READ_TOKEN
              ? "設定済み（日本の配信情報・ドラマ）"
              : "未設定：TMDB_READ_TOKEN を .env に設定してください"}
          </dd>
          <dt>MAL</dt>
          <dd>
            {process.env.MAL_CLIENT_ID
              ? "設定済み（アニメ公式API）"
              : "未設定：MAL_CLIENT_ID が必要です"}
          </dd>
          <dt>AniList</dt>
          <dd>
            {anilistEnabled()
              ? "許諾確認済みとして有効"
              : "無効：利用条件上の許諾を得てから有効にしてください"}
          </dd>
          <dt>自動更新</dt>
          <dd>
            別プロセスの worker が起動している間、
            {process.env.SYNC_INTERVAL_HOURS ?? 24}時間ごとに取得
          </dd>
        </dl>
      </section>
      <section className="panel">
        <h2>更新ログ</h2>
        {runs.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>開始 / 完了</th>
                    <th>状態</th>
                    <th>取得</th>
                    <th>新規</th>
                    <th>変更</th>
                    <th>エラー</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {timestampLabel(r.startedAt)}
                        <br />
                        <span className="muted">
                          {timestampLabel(r.finishedAt)}
                        </span>
                      </td>
                      <td>{r.status}</td>
                      <td>{r.fetched}</td>
                      <td>{r.created}</td>
                      <td>{r.updated}</td>
                      <td>{r.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {runs.map((r) =>
              Array.isArray(r.messages) && r.messages.length ? (
                <details key={r.id} style={{ marginTop: 12 }}>
                  <summary>{timestampLabel(r.startedAt)} の詳細</summary>
                  <ul
                    className="muted"
                    style={{ fontSize: 12, paddingLeft: 20 }}
                  >
                    {r.messages.map((m, i) => (
                      <li key={i}>{String(m)}</li>
                    ))}
                  </ul>
                </details>
              ) : null,
            )}
          </>
        ) : (
          <p className="muted">まだ更新を実行していません。</p>
        )}
      </section>
      <section className="panel">
        <h2>公式発表による補正</h2>
        <OfficialImport />
      </section>
    </>
  );
}
