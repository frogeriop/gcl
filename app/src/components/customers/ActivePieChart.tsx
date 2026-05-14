'use client'

interface Props {
  active: number
  inactive: number
}

export function ActivePieChart({ active, inactive }: Props) {
  const total = active + inactive
  if (total === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r="35" fill="none" stroke="rgba(55,65,81,0.4)" strokeWidth="14" />
      </svg>
      <p style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '8px' }}>Sem dados</p>
    </div>
  )

  const pct = active / total
  const r = 35
  const cx = 45; const cy = 45
  const circ = 2 * Math.PI * r
  const activeDash = pct * circ
  const inactiveDash = circ - activeDash

  // SVG stroke-dasharray trick for donut chart
  const startAngle = -90 * (Math.PI / 180) // start from top
  const activeArc = pct * 2 * Math.PI
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(startAngle + activeArc)
  const y2 = cy + r * Math.sin(startAngle + activeArc)
  const largeArc = pct > 0.5 ? 1 : 0

  const activePct = Math.round(pct * 100)
  const inactivePct = 100 - activePct

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', height: '100%' }}>
      {/* SVG Donut */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          {/* Background track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(239,68,68,0.2)" strokeWidth="14" />
          {/* Active arc */}
          {pct > 0 && pct < 1 && (
            <path
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none" stroke="#10b981" strokeWidth="14"
              strokeLinecap="round"
            />
          )}
          {pct === 1 && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#10b981" strokeWidth="14" />
          )}
          {pct === 0 && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth="14" />
          )}
          {/* Center text */}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="#f9fafb" fontSize="14" fontWeight="800">{activePct}%</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#6b7280" fontSize="8">ativos</text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '90px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
            <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '500' }}>Ativos</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#34d399', lineHeight: 1, paddingLeft: '14px' }}>{active.toLocaleString('pt-BR')}</div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '500' }}>Inativos</span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f87171', lineHeight: 1, paddingLeft: '14px' }}>{inactive.toLocaleString('pt-BR')}</div>
        </div>
      </div>
    </div>
  )
}
