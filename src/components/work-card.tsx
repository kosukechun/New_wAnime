import Link from "next/link";
import { Film } from "lucide-react";
import { CATEGORIES, STATUSES, WEEKDAYS } from "@/lib/constants";
import { dateLabel, isoDate } from "@/lib/dates";
import { isInKnownBroadcastPeriod } from "@/lib/airing";
import { FavoriteButton } from "./favorite";
export type CardWork = {
  id: string;
  title: string;
  posterUrl: string | null;
  category: keyof typeof CATEGORIES;
  status: keyof typeof STATUSES;
  synopsis: string | null;
  jpPremiere: Date | string | null;
  worldPremiere: Date | string | null;
  endDate?: Date | string | null;
  declaredYear?: number | null;
  declaredMonth?: number | null;
  confidence?: string;
  genres: Array<{ genre: { name: string } }>;
  offers: Array<{ platform: { name: string } }>;
  schedules: Array<{
    date: Date | string;
    time: string | null;
    weekday: number | null;
    isPremiere: boolean;
    seasonNumber?: number | null;
    broadcaster: { name: string } | null;
  }>;
};
export function WorkCard({
  work: w,
  favorite = false,
  loggedIn = false,
}: {
  work: CardWork;
  favorite?: boolean;
  loggedIn?: boolean;
}) {
  const schedule = w.schedules.find((s) => s.isPremiere) ?? w.schedules[0];
  const date = w.jpPremiere ?? (schedule?.isPremiere ? schedule.date : null);
  const providers = [...new Set(w.offers.map((o) => o.platform.name))];
  const fallback = isoDate(w.worldPremiere);
  const inferredAiring = w.status === "UNKNOWN" && isInKnownBroadcastPeriod(w);
  return (
    <article className="work-card">
      <Link href={`/works/${w.id}`} aria-label={`${w.title}の詳細`}>
        <div className="poster">
          {w.posterUrl ? (
            <img
              src={w.posterUrl}
              alt={w.title}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="no-image">
              <Film size={36} />
              <span>ビジュアル未発表</span>
            </div>
          )}
          <div className="poster-overlay" />
          <span className="poster-badge">
            {inferredAiring ? "放送中（期間から判定）" : STATUSES[w.status]}
          </span>
          <span className="poster-date">
            {date
              ? dateLabel(date)
              : fallback
                ? `世界初公開 ${fallback}`
                : w.declaredYear
                  ? `${w.declaredYear}年${w.declaredMonth ? `${w.declaredMonth}月` : ""}予定`
                  : "放送日未発表"}
          </span>
        </div>
        <h3 className="card-title">{w.title}</h3>
      </Link>
      <FavoriteButton workId={w.id} selected={favorite} loggedIn={loggedIn} />
      <p className="card-meta">
        {CATEGORIES[w.category]}
        {schedule?.time
          ? ` · ${schedule.weekday != null ? WEEKDAYS[schedule.weekday] + "曜 " : ""}${schedule.time}`
          : ""}
        {schedule?.broadcaster ? ` · ${schedule.broadcaster.name}` : ""}
      </p>
      {schedule?.isPremiere && (schedule.seasonNumber ?? 0) > 1 && (
        <p className="card-meta">
          シーズン{schedule.seasonNumber}開始：{dateLabel(schedule.date)}
        </p>
      )}
      {w.confidence && w.confidence !== "OFFICIAL" && (
        <p className="card-meta">外部DBの参考情報</p>
      )}
      <div className="pill-row">
        {w.genres.slice(0, 3).map((g) => (
          <span className="pill" key={g.genre.name}>
            {g.genre.name}
          </span>
        ))}
      </div>
      <p className="provider-name" style={{ marginTop: 7, marginBottom: 0 }}>
        {providers.length ? providers.join(" · ") : "日本の配信情報未確認"}
      </p>
      {w.synopsis && <p className="card-synopsis">{w.synopsis}</p>}
    </article>
  );
}
export function WorkGrid({
  works,
  favorites = [],
  loggedIn = false,
}: {
  works: CardWork[];
  favorites?: string[];
  loggedIn?: boolean;
}) {
  return (
    <div className="grid-works">
      {works.map((w) => (
        <WorkCard
          key={w.id}
          work={w}
          favorite={favorites.includes(w.id)}
          loggedIn={loggedIn}
        />
      ))}
    </div>
  );
}
