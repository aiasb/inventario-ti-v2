const CHART_HEIGHT = 96;

export function ColumnChart({ data, series }) {
  const max = Math.max(...data.flatMap((d) => series.map((s) => d[s.key] || 0)), 1);

  return (
    <div>
      <div className="flex gap-16 mb-12">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-6">
            <span style={{ width: 8, height: 8, borderRadius: 4, background: s.color, display: 'inline-block' }} />
            <span className="text-secondary" style={{ fontSize: 11.5 }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_HEIGHT + 22 }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: CHART_HEIGHT }}>
              {series.map((s) => (
                <div
                  key={s.key}
                  style={{
                    width: 10,
                    borderRadius: 3,
                    background: s.color,
                    height: Math.max(3, ((d[s.key] || 0) / max) * CHART_HEIGHT),
                  }}
                />
              ))}
            </div>
            <div className="text-muted mono" style={{ fontSize: 9.5, marginTop: 6 }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
