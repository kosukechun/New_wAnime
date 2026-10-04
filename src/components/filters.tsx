"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { SlidersHorizontal, Search } from "lucide-react";
import {
  CATEGORIES,
  GENRES,
  PLATFORMS,
  SEASONS,
  STATUSES,
} from "@/lib/constants";
import type { SearchFilters } from "@/lib/search";
export function FilterForm({
  filters: f,
  currentYear,
}: {
  filters: SearchFilters;
  currentYear: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    for (const element of Array.from(form.current?.elements ?? [])) {
      if (!(
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement
      ))
        continue;
      if (element === document.activeElement) continue;
      if (element instanceof HTMLInputElement && element.type === "checkbox")
        element.checked = f.genres.includes(element.value);
      else if (element.name in f)
        element.value = String(f[element.name as keyof SearchFilters] ?? "");
      else if (element.name) element.value = "";
    }
  }, [f]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function apply() {
    if (timer.current) clearTimeout(timer.current);
    if (!form.current) return;
    const data = new FormData(form.current);
    const p = new URLSearchParams();
    for (const [k, v] of data.entries()) if (String(v)) p.append(k, String(v));
    if (!p.get("year")) p.delete("month");
    p.delete("page");
    startTransition(() =>
      router.replace(`${pathname}?${p}`, { scroll: false }),
    );
  }
  function changed() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(apply, 450);
  }
  const years = [
    ...new Set([
      ...(f.year ? [f.year] : []),
      ...Array.from(
        { length: currentYear - 1940 + 7 },
        (_, i) => currentYear + 5 - i,
      ),
    ]),
  ].sort((a, b) => b - a);
  const select = (
    name: string,
    label: string,
    values: Record<string, string>,
    value: string | number | undefined,
  ) => (
    <div className="field">
      <label htmlFor={`f-${name}`}>{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""}>
        <option value="">すべて</option>
        {Object.entries(values).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <aside className="filters">
      <button
        className="mobile-filter-toggle"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
      >
        <SlidersHorizontal
          size={14}
          style={{ display: "inline", marginRight: 6 }}
        />
        検索条件 {mobileOpen ? "を閉じる" : "を開く"}
      </button>
      <div className={`filter-body ${mobileOpen ? "" : "mobile-closed"}`}>
        <h2>
          <SlidersHorizontal
            size={15}
            style={{ display: "inline", marginRight: 7 }}
          />
          作品を絞り込む
        </h2>
        <form
          ref={form}
          action="/works"
          onChange={changed}
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <div className="field">
            <label htmlFor="f-q">キーワード</label>
            <input
              id="f-q"
              name="q"
              type="search"
              placeholder="作品名・原作・出演者など"
              defaultValue={f.q}
              maxLength={160}
            />
          </div>
          {select("category", "作品の種類", CATEGORIES, f.category)}
          <div className="field-row">
            <div className="field">
              <label htmlFor="f-year">放送年</label>
              <select id="f-year" name="year" defaultValue={f.year ?? ""}>
                <option value="">すべての年</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-month">開始月</label>
              <select id="f-month" name="month" defaultValue={f.month ?? ""}>
                <option value="">すべての月</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}月
                  </option>
                ))}
              </select>
            </div>
          </div>
          {select(
            "scope",
            "開始日の基準",
            { jp: "日本での開始日", world: "世界初公開日を含む" },
            f.scope,
          )}
          {select("season", "アニメの放送クール", SEASONS, f.season)}
          <p className="muted" style={{ fontSize: 10, marginTop: -8 }}>
            クール分類と初回開始月は別条件です。
          </p>
          <div className="field">
            <label>ジャンル（複数選択）</label>
            <div className="genres-select">
              {GENRES.map(([id, name]) => (
                <label className="check-pill" key={id}>
                  <input
                    type="checkbox"
                    name="genres"
                    value={id}
                    defaultChecked={f.genres.includes(id)}
                  />
                  {name}
                </label>
              ))}
            </div>
          </div>
          {select(
            "genreMode",
            "ジャンルの組み合わせ",
            { all: "すべてに一致（AND）", any: "いずれかに一致（OR）" },
            f.genreMode,
          )}
          {select(
            "platform",
            "日本の配信サービス",
            Object.fromEntries(PLATFORMS),
            f.platform,
          )}
          {select("status", "放送状態", STATUSES, f.status)}
          <div className="field">
            <label htmlFor="f-person">声優・俳優・女優</label>
            <input
              id="f-person"
              name="person"
              defaultValue={f.person}
              placeholder="出演者名を入力"
              maxLength={100}
            />
          </div>
          <details>
            <summary>さらに詳しい条件</summary>
            <div className="field">
              <label htmlFor="f-broadcaster">放送局</label>
              <input
                id="f-broadcaster"
                name="broadcaster"
                defaultValue={f.broadcaster}
                maxLength={100}
              />
            </div>
            <div className="field">
              <label htmlFor="f-company">制作会社</label>
              <input
                id="f-company"
                name="company"
                defaultValue={f.company}
                maxLength={100}
              />
            </div>
            {select(
              "sourceMedium",
              "原作媒体",
              {
                ORIGINAL: "オリジナル",
                MANGA: "漫画",
                NOVEL: "小説",
                LIGHT_NOVEL: "ライトノベル",
                VISUAL_NOVEL: "ビジュアルノベル",
                VIDEO_GAME: "ゲーム",
                OTHER: "その他",
              },
              f.sourceMedium,
            )}
            {select(
              "installment",
              "新作区分",
              { NEW: "完全新作", SEQUEL: "続編", REMAKE: "リメイク" },
              f.installment,
            )}
            {select(
              "region",
              "配信・放送の対象地域",
              { JP: "日本", US: "米国", GB: "英国", KR: "韓国" },
              f.region,
            )}
            <div className="field">
              <label htmlFor="f-from">開始日（期間）</label>
              <input
                id="f-from"
                type="date"
                name="from"
                defaultValue={f.from}
              />
            </div>
            <div className="field">
              <label htmlFor="f-to">終了日（期間）</label>
              <input id="f-to" type="date" name="to" defaultValue={f.to} />
            </div>
          </details>
          <input type="hidden" name="sort" value={f.sort} />
          {f.announced && <input type="hidden" name="announced" value="true" />}
          <button
            type="submit"
            className="primary"
            style={{ width: "100%", marginTop: 8 }}
            disabled={pending}
          >
            <Search size={14} style={{ display: "inline", marginRight: 7 }} />
            {pending ? "検索中…" : "この条件で検索"}
          </button>
          <Link
            href="/works"
            className="muted"
            style={{
              display: "block",
              textAlign: "center",
              fontSize: 11,
              marginTop: 10,
            }}
          >
            条件をリセット
          </Link>
        </form>
      </div>
    </aside>
  );
}
