"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push("/favorites");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "接続に失敗しました");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel auth-panel">
      <span className="eyebrow">YOUR PERSONAL WATCHLIST</span>
      <h1>
        {mode === "login" ? "おかえりなさい。" : "観たい作品を、ひとつに。"}
      </h1>
      <p className="muted">
        PCとスマートフォンで、マイリストと視聴メモを共有できます。
      </p>
      <div className="auth-switch">
        <button
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={mode === "login" ? "primary" : ""}
        >
          ログイン
        </button>
        <button
          onClick={() => {
            setMode("register");
            setError("");
          }}
          className={mode === "register" ? "primary" : ""}
        >
          新規登録
        </button>
      </div>
      <form onSubmit={submit}>
        {mode === "register" && (
          <div className="field">
            <label htmlFor="name">表示名</label>
            <input
              id="name"
              name="name"
              required
              maxLength={50}
              autoComplete="nickname"
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">メールアドレス</label>
          <input
            id="email"
            type="email"
            name="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="password">パスワード（12文字以上）</label>
          <input
            id="password"
            type="password"
            name="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button
          className="primary"
          type="submit"
          disabled={busy}
          style={{ width: "100%" }}
        >
          {busy
            ? "処理しています…"
            : mode === "login"
              ? "ログイン"
              : "アカウントを作成"}
        </button>
      </form>
    </div>
  );
}
