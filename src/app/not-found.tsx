import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty" style={{ marginTop: 50 }}>
      <h1>ページが見つかりません</h1>
      <p>作品が未登録か、リンクが変更されています。</p>
      <Link className="button primary" href="/works">
        作品を探す
      </Link>
    </div>
  );
}
