/** Axis scaling helpers for LinePlot. */

/** "Nice" tick values covering [min, max] with roughly `count` intervals. */
export function niceTicks(min: number, max: number, count = 6): number[] {
  if (!(max > min)) return [min]
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  const start = Math.ceil(min / step - 1e-9) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 1e-9; v += step) ticks.push(Number(v.toPrecision(12)))
  return ticks
}

/** Fewest decimals (0–10) that print every tick exactly at its value. */
export function tickDecimals(ticks: number[]): number {
  if (ticks.length < 2) return 2
  const step = Math.abs(ticks[1]! - ticks[0]!)
  for (let d = 0; d < 10; d++) {
    if (ticks.every((t) => Math.abs(Number(t.toFixed(d)) - t) < step * 1e-6)) return d
  }
  return 10
}
