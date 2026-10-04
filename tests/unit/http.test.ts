import { it, expect, vi, afterEach } from "vitest";
import { requestJson, UpstreamError } from "../../src/lib/http";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("429 Retry-Afterを尊重して再試行する", async () => {
  vi.useFakeTimers();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response("", { status: 429, headers: { "retry-after": "2" } }),
    )
    .mockResolvedValueOnce(Response.json({ ok: true }));
  vi.stubGlobal("fetch", fetch);
  const p = requestJson("https://retry-test.example/api", undefined, 0);
  await vi.advanceTimersByTimeAsync(3100);
  expect(await p).toEqual({ ok: true });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("401を再試行せず、秘密付きURLを例外へ含めない", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("", { status: 401 }));
  vi.stubGlobal("fetch", fetch);
  const p = requestJson(
    "https://unauthorized-test.example/?key=private",
    undefined,
    0,
  );
  await expect(p).rejects.toBeInstanceOf(UpstreamError);
  expect(fetch).toHaveBeenCalledTimes(1);
});
