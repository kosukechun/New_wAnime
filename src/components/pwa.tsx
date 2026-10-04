"use client";
import { useEffect, useState } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function PwaRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
export function InstallButton() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const listener = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", listener);
    return () => window.removeEventListener("beforeinstallprompt", listener);
  }, []);
  return event ? (
    <button
      className="primary"
      onClick={async () => {
        await event.prompt();
        await event.userChoice;
        setEvent(null);
      }}
    >
      アプリをインストール
    </button>
  ) : (
    <p className="muted">
      Edge / Chrome
      のアドレスバーにある「アプリをインストール」、iPhoneはSafariの共有
      →「ホーム画面に追加」を選んでください。
    </p>
  );
}
