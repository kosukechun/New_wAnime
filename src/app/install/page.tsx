import { InstallButton } from "@/components/pwa";
export const metadata = { title: "アプリをインストール" };
export default function InstallPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TAKE YOUR STORIES WITH YOU</span>
          <h1>いつでも、すぐに開ける。</h1>
          <p className="muted">
            New_wAnimeをPCやスマートフォンに追加できます。
          </p>
        </div>
      </div>
      <section className="panel">
        <div className="install-box">
          <img src="/icon-192.png" alt="New_wAnimeアイコン" />
          <div>
            <h2 style={{ marginBottom: 5 }}>New_wAnime</h2>
            <p className="muted">専用ウィンドウで、次の「観たい」を探す。</p>
          </div>
        </div>
        <InstallButton />
      </section>
      <section className="panel">
        <h2>Windows 11</h2>
        <ol className="muted" style={{ paddingLeft: 22 }}>
          <li>EdgeまたはChromeで、このサイトを開きます。</li>
          <li>
            アドレスバーのインストールアイコンを選択します。Edgeではメニュー →
            アプリ → このサイトをアプリとしてインストールも使えます。
          </li>
          <li>アプリ名を確認してインストールします。</li>
          <li>デスクトップのショートカットやスタートメニューに追加します。</li>
        </ol>
        <p className="muted">
          開発環境では http://localhost:3000
          を利用できます。公開先ではHTTPSが必要です。PowerShell用のショートカット作成スクリプトも
          scripts/windows-shortcut.ps1 に用意しています。
        </p>
      </section>
      <section className="panel">
        <h2>スマートフォン</h2>
        <p className="muted">
          Android：Chromeで公開URLを開き、メニューから「アプリをインストール」または「ホーム画面に追加」。
          <br />
          iPhone：Safariで公開URLを開き、共有ボタン →「ホーム画面に追加」→
          追加。
        </p>
        <p className="muted">
          同じアカウントでログインすると、マイリストとメモが同期されます。オフライン中は接続案内を表示し、再接続後に最新の保存データを読み込みます。
        </p>
      </section>
    </>
  );
}
