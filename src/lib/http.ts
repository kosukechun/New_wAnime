const queues = new Map<string, Promise<unknown>>();
const lastRequests = new Map<string, number>();
export class UpstreamError extends Error {
  constructor(
    public source: string,
    public status: number,
  ) {
    super(`${source}: HTTP ${status}`);
  }
}
export async function requestJson<T>(
  url: string,
  init?: RequestInit,
  spacing = 650,
): Promise<T> {
  const origin = new URL(url).origin;
  const previous = queues.get(origin) ?? Promise.resolve();
  const task = previous
    .catch(() => {})
    .then(async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const wait = Math.max(
          0,
          spacing - (Date.now() - (lastRequests.get(origin) ?? 0)),
        );
        if (wait) await new Promise((r) => setTimeout(r, wait));
        lastRequests.set(origin, Date.now());
        try {
          const res = await fetch(url, {
            ...init,
            headers: {
              "User-Agent":
                process.env.COLLECTOR_USER_AGENT ?? "New_wAnime/1.0",
              ...init?.headers,
            },
            signal: AbortSignal.timeout(20000),
            cache: "no-store",
          });
          if (res.ok) return (await res.json()) as T;
          if (res.status === 429 || res.status >= 500) {
            const raw = res.headers.get("retry-after");
            const seconds = raw
              ? Number.isFinite(Number(raw))
                ? Number(raw)
                : Math.max(0, (Date.parse(raw) - Date.now()) / 1000)
              : 2 ** attempt * 2;
            await res.body?.cancel();
            if (attempt < 2 && seconds <= 60) {
              await new Promise((r) =>
                setTimeout(r, (seconds + Math.random()) * 1000),
              );
              continue;
            }
          } else await res.body?.cancel();
          throw new UpstreamError(origin, res.status);
        } catch (e) {
          if (e instanceof UpstreamError || attempt === 2)
            throw e instanceof UpstreamError
              ? e
              : new Error(`${origin}: 接続失敗またはタイムアウト`);
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        }
      }
      throw new Error(`${origin}: 取得失敗`);
    });
  queues.set(origin, task);
  return task;
}
