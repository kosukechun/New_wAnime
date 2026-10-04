"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function CreditsButton({
  id,
  loggedIn,
}: {
  id: string;
  loggedIn: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const router = useRouter();
  async function load() {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setMessage(
      "外部APIの出演履歴を取得しています。数十秒〜数分かかることがあります。",
    );
    try {
      const r = await fetch(`/api/people/${id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offset }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage(
        `取得元の${d.total}作品中、${Math.min(offset + 30, d.total)}作品まで確認。新規${d.created}・変更${d.updated}・エラー${d.errors}件。`,
      );
      if (d.nextOffset == null) setDone(true);
      else setOffset(d.nextOffset);
      router.refresh();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "出演履歴に接続できませんでした",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ marginTop: 15 }}>
      <button disabled={busy || done} onClick={load}>
        {busy
          ? "出演作品を取得中…"
          : done
            ? "取得元の出演履歴を確認しました"
            : offset
              ? "次の30作品を取得"
              : "外部APIで出演作品を取得"}
      </button>
      {message && (
        <p
          role="status"
          className="muted"
          style={{ fontSize: 12, marginTop: 10 }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
