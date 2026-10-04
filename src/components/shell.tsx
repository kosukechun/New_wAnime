"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Home,
  Search,
  Users,
  Bookmark,
  Sun,
  Moon,
  Settings,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
const navigation = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/works", label: "作品を探す", icon: Search },
  { href: "/people", label: "出演者", icon: Users },
  { href: "/calendar", label: "カレンダー", icon: CalendarDays },
  { href: "/favorites", label: "マイリスト", icon: Bookmark },
];
const subscribe = () => () => {};
function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme ?? "dark",
    () => "dark",
  );
  const [override, setOverride] = useState<string | null>(null);
  const value = override ?? theme;
  const toggle = () => {
    const next = value === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("wanime-theme", next);
    setOverride(next);
  };
  return { value, toggle };
}
export function ShellHeader({
  user,
}: {
  user: { name: string; role: string } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  async function logout() {
    const r = await fetch("/api/auth/logout", { method: "POST" });
    if (r.ok) {
      router.push("/");
      router.refresh();
    }
  }
  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link href="/" className="brand">
            <img src="/icon.svg" alt="" />
            <span>
              New_wAnime<small>次の「観たい」に出会う。</small>
            </span>
          </Link>
          <nav className="nav" aria-label="メインナビゲーション">
            {navigation.map((n) => (
              <Link
                key={n.href}
                className={active(n.href) ? "active" : ""}
                href={n.href}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={theme.toggle}
              aria-label={
                theme.value === "dark"
                  ? "ライトモードに切り替え"
                  : "ダークモードに切り替え"
              }
            >
              {theme.value === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="icon-button" aria-label="管理画面">
                <Settings size={17} />
              </Link>
            )}
            {user ? (
              <>
                <Link href="/account" className="account-link">
                  {user.name.slice(0, 8)}
                </Link>
                <button className="account-link icon-button" onClick={logout}>
                  ログアウト
                </button>
              </>
            ) : (
              <Link href="/login" className="account-link">
                ログイン
              </Link>
            )}
          </div>
        </div>
      </header>
      <nav className="bottom-nav" aria-label="モバイルナビゲーション">
        {navigation.map((n) => (
          <Link
            key={n.href}
            className={active(n.href) ? "active" : ""}
            href={n.href}
          >
            <n.icon size={19} />
            {n.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
