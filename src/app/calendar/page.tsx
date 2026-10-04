import Link from "next/link";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import {
  addDays,
  isoDate,
  jstToday,
  monthRange,
  parseDate,
  weekStart,
} from "@/lib/dates";
import { CATEGORIES, WEEKDAYS } from "@/lib/constants";
import { validScheduleSource } from "@/lib/search";
export const dynamic = "force-dynamic";
export const metadata = { title: "放送・配信カレンダー" };
type CalendarEvent = {
  key: string;
  workId: string;
  title: string;
  date: string;
  time: string | null;
  label: string;
  kind: string;
};
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const today = jstToday();
  const schema = z.object({
    year: z.coerce
      .number()
      .int()
      .min(1900)
      .max(2200)
      .default(Number(today.slice(0, 4))),
    month: z.coerce
      .number()
      .int()
      .min(1)
      .max(12)
      .default(Number(today.slice(5, 7))),
    view: z.enum(["month", "week"]).default("month"),
    date: z
      .string()
      .refine((v) => !!parseDate(v))
      .default(today),
    category: z.enum(["ANIME", "DOMESTIC_DRAMA", "FOREIGN_DRAMA"]).optional(),
    favorites: z.enum(["true"]).optional(),
  });
  const result = schema.safeParse(
    Object.fromEntries(Object.entries(await searchParams).filter(([, v]) => v)),
  );
  if (!result.success)
    return (
      <div className="empty">
        <h1>カレンダーの指定が不正です</h1>
        <Link href="/calendar">今月に戻る</Link>
      </div>
    );
  const f = result.data;
  const user = await currentUser();
  if (f.favorites && !user)
    return (
      <div className="empty" style={{ marginTop: 40 }}>
        <h1>マイリストの表示にはログインが必要です</h1>
        <Link className="button primary" href="/login">
          ログイン
        </Link>
      </div>
    );
  const range =
    f.view === "week"
      ? {
          gte: parseDate(weekStart(f.date))!,
          lt: parseDate(addDays(weekStart(f.date), 7))!,
        }
      : monthRange(f.year, f.month);
  const workFilter = {
    ...(f.category ? { category: f.category } : {}),
    ...(f.favorites ? { favorites: { some: { userId: user!.id } } } : {}),
    status: { not: "DELAYED" as const },
  };
  const [schedules, works, offers] = await Promise.all([
    db.schedule.findMany({
      where: {
        ...validScheduleSource,
        region: "JP",
        date: range,
        ...(f.view === "month" ? { isPremiere: true } : {}),
        work: workFilter,
      },
      include: {
        work: { select: { id: true, title: true } },
        broadcaster: true,
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      take: 1000,
    }),
    db.work.findMany({
      where: { ...workFilter, jpPremiere: range },
      select: { id: true, title: true, jpPremiere: true },
    }),
    db.streamingOffer.findMany({
      where: { region: "JP", startDate: range, work: workFilter },
      include: { platform: true, work: { select: { id: true, title: true } } },
    }),
  ]);
  const events: CalendarEvent[] = schedules.map((s) => ({
    key: s.id,
    workId: s.workId,
    title: s.work.title,
    date: isoDate(s.date)!,
    time: s.time,
    label: s.broadcaster?.name ?? s.label ?? "放送先未発表",
    kind: s.kind,
  }));
  for (const w of works)
    if (
      !events.some((e) => e.workId === w.id && e.date === isoDate(w.jpPremiere))
    )
      events.push({
        key: w.id,
        workId: w.id,
        title: w.title,
        date: isoDate(w.jpPremiere)!,
        time: null,
        label: "日本初公開 · 時刻未発表",
        kind: "TV",
      });
  for (const o of offers)
    if (
      !events.some(
        (e) =>
          e.workId === o.workId &&
          e.date === isoDate(o.startDate) &&
          e.label === o.platform.name,
      )
    )
      events.push({
        key: o.id,
        workId: o.workId,
        title: o.work.title,
        date: isoDate(o.startDate)!,
        time: null,
        label: o.platform.name,
        kind: "STREAM",
      });
  const unique = events.filter(
    (e, i) =>
      events.findIndex(
        (x) =>
          x.workId === e.workId &&
          x.date === e.date &&
          x.time === e.time &&
          x.label === e.label &&
          x.kind === e.kind,
      ) === i,
  );
  const link = (change: Record<string, string>) => {
    const p = new URLSearchParams(
      Object.entries(f)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    );
    for (const [k, v] of Object.entries(change)) p.set(k, v);
    return `/calendar?${p}`;
  };
  const previous = new Date(Date.UTC(f.year, f.month - 2, 1));
  const next = new Date(Date.UTC(f.year, f.month, 1));
  const eventList = (date: string) =>
    unique
      .filter((e) => e.date === date)
      .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"))
      .map((e) => (
        <Link
          className="calendar-event"
          key={e.key}
          href={`/works/${e.workId}`}
        >
          <span className="event-time">
            {e.kind === "STREAM" ? "▶" : "📺"} {e.time ?? "時刻未定"}
          </span>
          <br />
          <strong>{e.title}</strong>
          <br />
          <span className="muted">{e.label}</span>
        </Link>
      ));
  const first = isoDate(range.gte)!;
  const gridStart =
    f.view === "week" ? first : addDays(first, -parseDate(first)!.getUTCDay());
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLAN YOUR WATCHING</span>
          <h1>放送・配信カレンダー</h1>
          <p className="muted">
            {f.view === "month"
              ? "その日にスタートする作品をチェック。"
              : "今週の放送・配信予定を、曜日ごとに。"}{" "}
            日本時間（JST）
          </p>
        </div>
      </div>
      <form className="calendar-toolbar" action="/calendar">
        <input type="hidden" name="view" value={f.view} />
        {f.view === "week" ? (
          <input
            type="date"
            aria-label="週の基準日"
            name="date"
            defaultValue={f.date}
            style={{ width: "auto" }}
          />
        ) : (
          <input type="hidden" name="date" value={f.date} />
        )}
        <select
          aria-label="カレンダー年"
          name="year"
          defaultValue={f.year}
          disabled={f.view === "week"}
        >
          {Array.from(
            { length: 10 },
            (_, i) => Number(today.slice(0, 4)) - 3 + i,
          ).map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </select>
        <select
          aria-label="カレンダー月"
          name="month"
          defaultValue={f.month}
          disabled={f.view === "week"}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}月
            </option>
          ))}
        </select>
        <select
          aria-label="カレンダー分類"
          name="category"
          defaultValue={f.category ?? ""}
        >
          <option value="">すべての作品</option>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <input
            type="checkbox"
            name="favorites"
            value="true"
            defaultChecked={!!f.favorites}
          />
          マイリストのみ
        </label>
        <button type="submit" className="primary">
          表示
        </button>
      </form>
      <div className="calendar-toolbar">
        <Link
          className="button"
          href={
            f.view === "month"
              ? link({
                  year: String(previous.getUTCFullYear()),
                  month: String(previous.getUTCMonth() + 1),
                })
              : link({ date: addDays(f.date, -7) })
          }
        >
          ← 前{f.view === "month" ? "月" : "週"}
        </Link>
        <h2 style={{ margin: "0 auto" }}>
          {f.view === "month"
            ? `${f.year}年 ${f.month}月`
            : `${first} 〜 ${addDays(first, 6)}`}
        </h2>
        <Link
          className="button"
          href={
            f.view === "month"
              ? link({
                  year: String(next.getUTCFullYear()),
                  month: String(next.getUTCMonth() + 1),
                })
              : link({ date: addDays(f.date, 7) })
          }
        >
          次{f.view === "month" ? "月" : "週"} →
        </Link>
        <Link
          className={`button ${f.view === "month" ? "primary" : ""}`}
          href={link({ view: "month" })}
        >
          月間
        </Link>
        <Link
          className={`button ${f.view === "week" ? "primary" : ""}`}
          href={link({ view: "week" })}
        >
          週間
        </Link>
      </div>
      {f.view === "month" ? (
        <div className="calendar-grid">
          {WEEKDAYS.map((d) => (
            <div className="calendar-label" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: 42 }, (_, i) => {
            const date = addDays(gridStart, i);
            const outside = Number(date.slice(5, 7)) !== f.month;
            return (
              <div
                key={date}
                className={`calendar-day ${outside ? "outside" : ""} ${date === today ? "today" : ""}`}
              >
                <time dateTime={date}>{Number(date.slice(8, 10))}</time>
                {!outside && eventList(date)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="calendar-week">
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(gridStart, i);
            return (
              <section className="week-column" key={date}>
                <h3>
                  {date.slice(5)}（{WEEKDAYS[parseDate(date)!.getUTCDay()]}）
                </h3>
                {eventList(date).length ? (
                  eventList(date)
                ) : (
                  <p className="muted" style={{ fontSize: 12 }}>
                    確認済みの予定なし
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
      <div className="notice" style={{ marginTop: 20 }}>
        {unique.length}
        件の確認済み予定を表示。日本公開日・放送局・配信開始日が未確認の作品は掲載しません。
        {schedules.length === 1000
          ? "番組表は最大1,000件です。分類で絞り込んでください。"
          : ""}
      </div>
    </>
  );
}
