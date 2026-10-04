import { test, expect } from "@playwright/test";
test("一覧・検索・詳細・日本語UI", async ({ page, request }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /今月の新作アニメ/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-home.png",
    fullPage: true,
  });
  await page.goto("/works");
  await expect(page.locator("h1")).toContainText("観たい");
  const res = await request.get("/api/works?year=2027&month=13");
  expect(res.status()).toBe(400);
  await page
    .getByLabel("キーワード", { exact: true })
    .fill("__存在しない作品__");
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByText("条件に一致する作品がありません")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("キーワード", { exact: true })).toHaveValue(
    "__存在しない作品__",
  );
  await page.goto("/works");
  const cards = page.locator(".work-card");
  if (await cards.count()) {
    await cards.first().locator("a").first().click();
    await expect(
      page.getByRole("heading", { name: "作品情報", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "日本で観られるサービス" }),
    ).toBeVisible();
  }
});
test("スマートフォン幅・テーマ・カレンダー・PWA", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ["/", "/works", "/people", "/calendar", "/favorites"]) {
    await page.goto(url);
    await expect(page.locator("main [aria-busy='true']")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "ライトモードに切り替え" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const m = await (await request.get("/manifest.webmanifest")).json();
  expect(m.display).toBe("standalone");
  expect(m.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(
    true,
  );
  expect((await request.get("/sw.js")).ok()).toBe(true);
  await page.goto("/install");
  await expect(page.getByRole("heading", { name: "Windows 11" })).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /今月の新作アニメ/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-home.png",
    fullPage: true,
  });
  await page.screenshot({ path: "test-results/mobile-viewport.png" });
});
test("管理者APIとCSRFを認証なしで実行できない", async ({ request }) => {
  const origin = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  expect(
    (
      await request.post("/api/admin/sync", { headers: { Origin: origin } })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/admin/official", {
        headers: { Origin: origin },
        data: {},
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/admin/sync", {
        headers: { Origin: "https://evil.example" },
      })
    ).status(),
  ).toBe(403);
  expect((await request.get("/api/favorites")).status()).toBe(401);
});
test("ユーザー登録・端末間マイリスト共有・アカウント削除", async ({
  page,
  browser,
  request,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "test-only-long-password";
  await page.goto("/login");
  await page.getByRole("button", { name: "新規登録", exact: true }).click();
  await page.getByLabel("表示名").fill("E2Eユーザー");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード（12文字以上）").fill(password);
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await expect(page).toHaveURL(/favorites/);
  try {
    const session = await page.evaluate(async () => {
      const r = await fetch("/api/auth/session");
      return await r.json();
    });
    expect(session.user.role).toBe("USER");
    expect(await page.evaluate(() => document.cookie)).not.toContain(
      "wanime_session",
    );
    const csrf = await page.evaluate(async () => {
      const r = await fetch("/api/admin/sync", { method: "POST" });
      return r.status;
    });
    expect(csrf).toBe(403);
    const works = await (await request.get("/api/works")).json();
    if (works.works.length) {
      const workId = works.works[0].id;
      await page.goto(`/works/${workId}`);
      await page.getByLabel("作品メモ").fill("端末間で共有するメモ");
      await page.getByRole("button", { name: "保存する", exact: true }).click();
      await expect(page.getByText("マイリストを保存しました")).toBeVisible();
      const second = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      const mobile = await second.newPage();
      await mobile.goto("/login");
      await mobile.getByLabel("メールアドレス").fill(email);
      await mobile.getByLabel("パスワード（12文字以上）").fill(password);
      await mobile
        .locator("form")
        .getByRole("button", { name: "ログイン", exact: true })
        .click();
      await expect(mobile).toHaveURL(/favorites/);
      await expect(mobile.getByLabel("作品メモ")).toHaveValue(
        "端末間で共有するメモ",
      );
      await second.close();
    }
  } finally {
    await page.evaluate(
      async ({ password }) => {
        await fetch("/api/account", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, confirmed: true }),
        });
      },
      { password },
    );
  }
});
test("声優・俳優名から作品を検索し、確認済みWikipediaへリンクする", async ({
  page,
  request,
}) => {
  for (const kind of ["VOICE_ACTOR", "ACTOR"]) {
    const d = await (await request.get(`/api/people?kind=${kind}`)).json();
    if (!d.people.length) continue;
    const p = d.people[0];
    const works = await (
      await request.get(
        `/api/works?person=${encodeURIComponent(p.nativeName ?? p.name)}`,
      )
    ).json();
    expect(works.total).toBeGreaterThan(0);
  }
  const verified = await (
    await request.get("/api/people?kind=VOICE_ACTOR&verified=true")
  ).json();
  if (verified.people.length) {
    const p = verified.people[0];
    await page.goto(`/people/${p.id}`);
    await expect(
      page.getByRole("link", { name: "日本語Wikipedia ↗", exact: true }),
    ).toHaveAttribute("href", p.wikipediaUrl);
    expect(new URL(p.wikipediaUrl).hostname).toBe("ja.wikipedia.org");
  }
});
