"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PersonCandidate } from "@/lib/person-discovery";
export function ExternalPeopleSearch({ query }: { query: string }) {
  const [busy, setBusy] = useState(false);
  const [people, setPeople] = useState<PersonCandidate[]>([]);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function search() {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/people/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "search", q: query }),
      });
      const d = await r.json();
      if (r.status === 401) {
        router.push("/login");
        return;
      }
      if (!r.ok) throw new Error(d.error);
      setPeople(d.people);
      setMessage(
        d.people.length
          ? "同姓同名の場合は、画像・出典を確認して人物を選択してください。"
          : "取得元に一致する候補が見つかりませんでした。",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "外部検索に接続できません");
    } finally {
      setBusy(false);
    }
  }
  async function select(p: PersonCandidate) {
    setBusy(true);
    try {
      const r = await fetch("/api/people/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "import",
          source: p.source,
          externalId: p.externalId,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push(`/people/${d.id}`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "人物の取得に失敗しました");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" style={{ marginTop: 25 }}>
      <h2>取得元から出演者を探す</h2>
      <p className="muted">
        「{query}
        」を外部APIで検索します。ログイン後に人物を選ぶと、プロフィールから過去・今後の出演作品も取得できます。
      </p>
      <button disabled={busy} onClick={search}>
        {busy ? "確認中…" : "外部APIで人物を検索"}
      </button>
      {message && (
        <p className="muted" role="status" style={{ marginTop: 12 }}>
          {message}
        </p>
      )}
      {people.length > 0 && (
        <div className="people-grid" style={{ marginTop: 20 }}>
          {people.map((p) => (
            <article
              key={`${p.source}:${p.externalId}`}
              className="person-card"
            >
              {p.photoUrl && (
                <img src={p.photoUrl} alt={p.name} loading="lazy" />
              )}
              <h3>{p.name}</h3>
              <p className="muted" style={{ fontSize: 11 }}>
                {p.birthday ?? "生年月日未確認"} · {p.source}
              </p>
              <a
                className="accent"
                href={p.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11 }}
              >
                出典を確認 ↗
              </a>
              <button
                onClick={() => select(p)}
                disabled={busy}
                style={{
                  display: "block",
                  margin: "12px auto 0",
                  fontSize: 11,
                }}
              >
                この人物の出演作品を探す
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
