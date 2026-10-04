"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function WikiButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch(`/api/people/${id}/wikipedia`, {
              method: "POST",
            });
            const d = await r.json();
            setMessage(
              d.url
                ? "本人との一致を確認しました。Wikipediaリンクを表示します。"
                : "本人と一致する日本語Wikipedia記事は未確認です。検索リンクをご利用ください。",
            );
            router.refresh();
          } catch {
            setMessage("Wikipedia APIに接続できませんでした。");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "本人との一致を確認中…" : "Wikipediaの記事を確認"}
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
