import Link from "next/link";
import { UserRound } from "lucide-react";
export type PersonCardData = {
  id: string;
  name: string;
  nativeName: string | null;
  photoUrl: string | null;
  wikipediaUrl: string | null;
  kind: string;
};
export function PersonCard({
  person: p,
  role,
}: {
  person: PersonCardData;
  role?: string;
}) {
  return (
    <article className="person-card">
      {p.wikipediaUrl ? (
        <a
          href={p.wikipediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${p.nativeName ?? p.name}の日本語Wikipedia`}
        >
          {p.photoUrl ? (
            <img src={p.photoUrl} alt={p.nativeName ?? p.name} loading="lazy" />
          ) : (
            <span
              className="avatar"
              style={{ display: "grid", placeItems: "center" }}
            >
              <UserRound />
            </span>
          )}
          <h3>{p.nativeName ?? p.name}</h3>
        </a>
      ) : (
        <Link href={`/people/${p.id}`}>
          {p.photoUrl ? (
            <img src={p.photoUrl} alt={p.nativeName ?? p.name} loading="lazy" />
          ) : (
            <span
              className="avatar"
              style={{ display: "grid", placeItems: "center" }}
            >
              <UserRound />
            </span>
          )}
          <h3>{p.nativeName ?? p.name}</h3>
        </Link>
      )}
      <p className="role">
        {role ?? (p.kind === "VOICE_ACTOR" ? "声優" : "俳優・女優")}
      </p>
      <Link href={`/people/${p.id}`} className="wiki">
        プロフィール・出演作品 →
      </Link>
      {p.wikipediaUrl ? (
        <a
          className="wiki"
          href={p.wikipediaUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Wikipedia ↗
        </a>
      ) : (
        <span className="muted" style={{ fontSize: 10 }}>
          Wikipedia記事未確認
        </span>
      )}
    </article>
  );
}
