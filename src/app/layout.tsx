import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { ShellHeader } from "@/components/shell";
import { PwaRegistration } from "@/components/pwa";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "New_wAnime | 次の「観たい」に出会う。",
    template: "%s | New_wAnime",
  },
  description:
    "新作アニメ・国内ドラマ・海外ドラマを、放送年月・ジャンル・出演者・日本の配信サービスから探す。",
  applicationName: "New_wAnime",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "New_wAnime",
  },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c1115",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser().catch(() => null);
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('wanime-theme')||'dark'}catch(e){}",
          }}
        />
      </head>
      <body>
        <ShellHeader user={user} />
        <main className="container">{children}</main>
        <footer className="footer">
          <div className="container footer-inner">
            <div>
              <Link href="/" className="brand">
                New_wAnime
              </Link>
              <p>アニメとドラマの、新しい発見を。</p>
              <Link href="/install">アプリをインストール</Link> ·{" "}
              <Link href="/about">情報源・利用条件</Link>
            </div>
            <div className="credits">
              <p>
                放送日時は日本時間（JST）。取得元によって収録範囲や更新時刻が異なります。最新の案内は作品の公式サイトでもご確認ください。
              </p>
              <p>
                番組データ：
                <a
                  href="https://www.tvmaze.com/api"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  TVmaze（CC BY-SA）
                </a>{" "}
                ·{" "}
                <a
                  href="https://www.themoviedb.org"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  TMDB
                </a>{" "}
                · 日本の配信情報：
                <a
                  href="https://www.justwatch.com/jp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  JustWatch via TMDB
                </a>
              </p>
              <p>
                This product uses the TMDB API but is not endorsed or certified
                by TMDB.
              </p>
            </div>
          </div>
        </footer>
        <PwaRegistration />
      </body>
    </html>
  );
}
