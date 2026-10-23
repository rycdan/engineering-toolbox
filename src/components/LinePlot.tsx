import { useId } from 'react'
import { niceTicks, tickDecimals } from './plotScale'

export interface PlotPoint {
  x: number
  y: number
}

export interface PlotMarker extends PlotPoint {
  label: string
}

interface LinePlotProps {
  series: PlotPoint[]
  markers?: PlotMarker[]
  /** Shade the x interval between two values (e.g. Ti → Tf). */
  highlight?: [number, number]
  xLabel: string
  yLabel: string
  title: string
  description: string
}

const W = 640
const H = 340
const M = { top: 16, right: 20, bottom: 52, left: 84 }

/** Static SVG line chart (D-008). */
export function LinePlot({ series, markers = [], highlight, xLabel, yLabel, title, description }: LinePlotProps) {
  const titleId = useId()
  const descId = useId()
  if (series.length < 2) return null

  const xs = series.map((p) => p.x).concat(markers.map((m) => m.x))
  const ys = series.map((p) => p.y).concat(markers.map((m) => m.y))
  let [xMin, xMax] = [Math.min(...xs), Math.max(...xs)]
  let [yMin, yMax] = [Math.min(...ys), Math.max(...ys)]
  if (xMax === xMin) [xMin, xMax] = [xMin - 1, xMax + 1]
  const yPad = (yMax - yMin) * 0.06 || Math.abs(yMax) * 1e-6 || 1
  yMin -= yPad
  yMax += yPad

  const xTicks = niceTicks(xMin, xMax)
  const yTicks = niceTicks(yMin, yMax, 5)
  const xDec = tickDecimals(xTicks)
  const yDec = tickDecimals(yTicks)

  const plotW = W - M.left - M.right
  const plotH = H - M.top - M.bottom
  const sx = (x: number) => M.left + ((x - xMin) / (xMax - xMin)) * plotW
  const sy = (y: number) => M.top + (1 - (y - yMin) / (yMax - yMin)) * plotH
  const path = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join('')

  return (
    <svg className="plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
      <title id={titleId}>{title}</title>
      <desc id={descId}>{description}</desc>
      {highlight && (
        <rect
          className="plot-highlight"
          x={Math.min(sx(highlight[0]), sx(highlight[1]))}
          y={M.top}
          width={Math.abs(sx(highlight[1]) - sx(highlight[0]))}
          height={plotH}
        />
      )}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line className="plot-grid" x1={M.left} x2={W - M.right} y1={sy(t)} y2={sy(t)} />
          <text className="plot-tick" x={M.left - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle">
            {t.toFixed(yDec)}
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <g key={`x${t}`}>
          <line className="plot-grid" x1={sx(t)} x2={sx(t)} y1={M.top} y2={M.top + plotH} />
          <text className="plot-tick" x={sx(t)} y={M.top + plotH + 18} textAnchor="middle">
            {t.toFixed(xDec)}
          </text>
        </g>
      ))}
      <rect className="plot-frame" x={M.left} y={M.top} width={plotW} height={plotH} />
      <path className="plot-line" d={path} />
      {markers.map((m) => (
        <g key={m.label}>
          <circle className="plot-marker" cx={sx(m.x)} cy={sy(m.y)} r={5} />
          <text
            className="plot-marker-label"
            x={sx(m.x) + (sx(m.x) > W / 2 ? -9 : 9)}
            y={sy(m.y) - 9}
            textAnchor={sx(m.x) > W / 2 ? 'end' : 'start'}
          >
            {m.label}
          </text>
        </g>
      ))}
      <text className="plot-axis-label" x={M.left + plotW / 2} y={H - 10} textAnchor="middle">
        {xLabel}
      </text>
      <text
        className="plot-axis-label"
        transform={`translate(16 ${M.top + plotH / 2}) rotate(-90)`}
        textAnchor="middle"
      >
        {yLabel}
      </text>
    </svg>
  )
}
