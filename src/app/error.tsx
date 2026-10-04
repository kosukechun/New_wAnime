"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty" style={{ marginTop: 50 }}>
      <h1>情報を読み込めませんでした</h1>
      <p>
        接続状況をご確認ください。ローカルではPostgreSQLを起動してから再度お試しください。
      </p>
      <button className="primary" onClick={reset}>
        再読み込み
      </button>
    </div>
  );
}
