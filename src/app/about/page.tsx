export const metadata = { title: "情報源と利用条件" };
export default function AboutPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SOURCES & CREDITS</span>
          <h1>情報の出典と、確認できること。</h1>
        </div>
      </div>
      <section className="panel">
        <h2>作品・出演者情報</h2>
        <p className="muted">
          <a
            className="accent"
            href="https://www.tvmaze.com/api"
            target="_blank"
            rel="noopener noreferrer"
          >
            TVmaze API
          </a>{" "}
          の番組表・作品情報・出演者を取得します。データは{" "}
          <a
            className="accent"
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-SA
          </a>{" "}
          で提供され、TVmaze由来の加工データにも同じ条件が適用されます。各作品の詳細画面から元のページを確認できます。日本の作品、特にドラマの収録は網羅的ではありません。
        </p>
        <p className="muted">
          TMDBはAPIトークン設定後に有効になります。公式APIを通じてドラマ・出演者・画像を取得します。非営利用途での利用を想定しています。商用公開時は提供元のライセンスをご確認ください。
        </p>
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="/tmdb-logo.svg"
            alt="TMDB"
            style={{ width: 100, marginBottom: 12 }}
          />
        </a>
        <p className="muted">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
        <p className="muted">
          MALは公式APIのClient
          ID設定後に利用します。AniListは競合する一覧・視聴管理サービス等に制限があるため、許諾確認を必須とし、初期状態では無効です。禁止されたサイトのスクレイピングは行いません。
        </p>
      </section>
      <section className="panel">
        <h2>日本での配信情報</h2>
        <p className="muted">
          配信情報は{" "}
          <a
            className="accent"
            href="https://www.justwatch.com/jp"
            target="_blank"
            rel="noopener noreferrer"
          >
            JustWatch
          </a>{" "}
          がTMDBに提供する正規データのJP領域を使います。見放題・レンタル・購入・無料・広告付き無料を分けて表示します。
        </p>
        <p className="muted">
          このAPIは配信開始日、独占・先行、サービスへの作品別の直接リンクを通常提供しません。取得できない項目は未確認とし、代わりに視聴先の確認ページへ案内します。公式発表で確認できた情報は管理者が補正できます。
        </p>
      </section>
      <section className="panel">
        <h2>放送日と最新性</h2>
        <p className="muted">
          世界初公開日と日本での開始日は別々に保存しています。日付が未発表の作品に仮の日付を設定しません。番組表は日本時間に変換し、テレビ放送と配信開始を区別します。
        </p>
        <p className="muted">
          自動更新ワーカーは24時間ごとに公開済みの予定を収集します。未来12か月を検索範囲にしていますが、取得元に未発表・未収録の作品は収集できません。「常に最新」は提供元の反映時刻と接続状況に依存します。公式発表を優先し、各作品に出典URLと確認日時を記録します。
        </p>
      </section>
      <section className="panel">
        <h2>Wikipediaの人物確認</h2>
        <p className="muted">
          Wikidataの人物外部ID、または名前・生年月日・職業の一致を確認し、日本語Wikipediaへのリンクを設定します。同姓同名や候補が複数ある場合は自動リンクしません。Wikipedia本文はCC
          BY-SA、Wikidataの構造化データはCC0です。画像の権利は各取得元・権利者に帰属します。
        </p>
      </section>
      <section className="panel">
        <h2>アカウントと保存情報</h2>
        <p className="muted">
          アカウントはメールアドレス・表示名・パスワードのハッシュを保存します。認証用CookieはJavaScriptから読み出せない形式です。マイリスト・視聴メモはユーザーごとに分離して保存します。公開前に運営者の連絡先とプライバシーポリシーを追記してください。
        </p>
      </section>
    </>
  );
}
