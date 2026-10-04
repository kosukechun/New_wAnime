"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
export function SyncButton({ workId }: { workId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function update() {
    setBusy(true);
    setMessage("情報を取得しています。数分かかることがあります。");
    try {
      const res = await fetch(
        workId ? `/api/admin/works/${workId}/refresh` : "/api/admin/sync",
        { method: "POST" },
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMessage(
        d.run
          ? `更新完了：取得 ${d.run.fetched} 件 / 新規 ${d.run.created} 件 / 更新 ${d.run.updated} 件 / エラー ${d.run.errors} 件`
          : "作品情報を更新しました",
      );
      router.refresh();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "接続に失敗しました。取得ログを確認してください。",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button onClick={update} disabled={busy} className="primary">
        <RefreshCw size={14} style={{ display: "inline", marginRight: 7 }} />
        {busy ? "情報を更新中…" : workId ? "この作品を更新" : "最新情報を取得"}
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
export function OfficialImport() {
  const [json, setJson] = useState("");
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function save() {
    setBusy(true);
    try {
      const data = JSON.parse(json);
      const r = await fetch("/api/admin/official", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, confirmed }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage("公式情報を保存しました");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "入力を確認してください");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <p className="muted">
        公式サイトで確認した情報だけ登録してください。入力形式はREADMEと
        docs/official-import.example.json を参照してください。
      </p>
      <textarea
        aria-label="公式情報JSON"
        rows={10}
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder="確認済みの公式情報JSONを貼り付け"
      />
      <label style={{ display: "flex", gap: 8, margin: "13px 0" }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        出典URLの公式発表と、入力内容の一致を確認しました
      </label>
      <button
        className="primary"
        onClick={save}
        disabled={busy || !confirmed || !json}
      >
        公式情報を保存
      </button>
      {message && (
        <p role="status" className="muted" style={{ marginTop: 10 }}>
          {message}
        </p>
      )}
    </div>
  );
}
