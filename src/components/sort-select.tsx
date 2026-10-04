"use client";
import { useRouter, useSearchParams } from "next/navigation";
export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <select
      aria-label="並び順"
      value={value}
      onChange={(e) => {
        const p = new URLSearchParams(params);
        p.set("sort", e.target.value);
        p.delete("page");
        router.replace(`/works?${p}`, { scroll: false });
      }}
    >
      <option value="start">開始日順</option>
      <option value="popular">注目度順</option>
      <option value="updated">情報更新順</option>
      <option value="new">追加された順</option>
      <option value="announced">公式発表日順</option>
    </select>
  );
}
