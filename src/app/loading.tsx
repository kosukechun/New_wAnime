export default function Loading() {
  return (
    <div aria-label="読み込み中" aria-busy="true" style={{ paddingTop: 40 }}>
      <p className="muted">作品を読み込んでいます…</p>
      <div className="grid-works">
        {Array.from({ length: 8 }, (_, i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
    </div>
  );
}
