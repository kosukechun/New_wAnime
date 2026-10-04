export function isSyncDue(
  finishedAt: Date | null | undefined,
  hours: number,
  now = Date.now(),
) {
  return (
    !finishedAt || now - finishedAt.getTime() >= Math.max(1, hours) * 3600000
  );
}
