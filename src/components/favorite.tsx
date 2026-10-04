"use client";
import { Bookmark, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WATCH_STATUSES } from "@/lib/constants";
type FavoriteData = { status: keyof typeof WATCH_STATUSES; memo: string };
export function FavoriteButton({
  workId,
  selected = false,
  loggedIn = false,
}: {
  workId: string;
  selected?: boolean;
  loggedIn?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/favorites", {
        method: selected ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className={`bookmark ${selected ? "selected" : ""}`}
        onClick={toggle}
        disabled={busy}
        aria-label={selected ? "マイリストから削除" : "マイリストに追加"}
        aria-pressed={selected}
      >
        {selected ? <Check size={15} /> : <Bookmark size={15} />}
      </button>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
export function FavoriteEditor({
  workId,
  initial,
  loggedIn,
}: {
  workId: string;
  initial: FavoriteData | null;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<keyof typeof WATCH_STATUSES>(
    initial?.status ?? "INTERESTED",
  );
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(remove = false) {
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/favorites", {
        method: remove ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId, status, memo }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage(
        remove ? "マイリストから削除しました" : "マイリストを保存しました",
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存失敗");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="favorite-editor">
      <h2>マイリスト</h2>
      <label className="muted" htmlFor={`status-${workId}`}>
        視聴状態
      </label>
      <select
        id={`status-${workId}`}
        value={status}
        onChange={(e) =>
          setStatus(e.target.value as keyof typeof WATCH_STATUSES)
        }
      >
        {Object.entries(WATCH_STATUSES).map(([k, v]) => (
          <option value={k} key={k}>
            {v}
          </option>
        ))}
      </select>
      <textarea
        aria-label="作品メモ"
        placeholder="観たい理由や、視聴のメモを残す…"
        rows={3}
        maxLength={4000}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />
      <div className="button-row">
        <button className="primary" onClick={() => save()} disabled={busy}>
          {loggedIn ? "保存する" : "ログインして保存"}
        </button>
        {initial && (
          <button onClick={() => save(true)} disabled={busy}>
            削除
          </button>
        )}
      </div>
      {message && (
        <p
          role="status"
          className="muted"
          style={{ marginTop: 10, fontSize: 12 }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
