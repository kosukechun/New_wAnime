"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AccountForm({ name }: { name: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const data = Object.fromEntries(Object.entries(raw).filter(([, v]) => v));
    try {
      const r = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage("アカウントを更新しました");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }
  async function remove(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      const r = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, confirmed }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push("/");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel">
        <h2>プロフィール・パスワード</h2>
        <form onSubmit={save}>
          <div className="field">
            <label htmlFor="account-name">表示名</label>
            <input
              id="account-name"
              name="name"
              defaultValue={name}
              maxLength={50}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="current-password">
              現在のパスワード（変更時のみ）
            </label>
            <input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              maxLength={128}
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">新しいパスワード（12文字以上）</label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
            />
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            パスワード変更後は、他の端末のセッションを終了します。
          </p>
          <button className="primary" disabled={busy}>
            更新する
          </button>
        </form>
        {message && (
          <p role="status" className="muted" style={{ marginTop: 10 }}>
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>アカウント削除</h2>
        <p className="muted">
          アカウントとマイリスト・視聴メモを削除します。削除後は復元できません。
        </p>
        <form onSubmit={remove}>
          <input
            type="password"
            name="password"
            aria-label="削除確認用パスワード"
            autoComplete="current-password"
            required
            maxLength={128}
          />
          <label style={{ display: "flex", gap: 8, margin: "15px 0" }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            アカウントとマイリストの削除を確認
          </label>
          <button disabled={busy || !confirmed}>アカウントを削除</button>
        </form>
      </section>
    </>
  );
}
