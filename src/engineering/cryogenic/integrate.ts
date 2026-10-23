/**
 * Composite 5-point Gauss–Legendre quadrature on panels no wider than
 * `maxPanelK`. Used to integrate sourced CTE curves α(T), whose erf blends can
 * change over ~1 K, so panels default to 1 K. Exact for polynomials of degree ≤ 9
 * on each panel.
 */
const NODES = [0, -0.5384693101056831, 0.5384693101056831, -0.906179845938664, 0.906179845938664]
const WEIGHTS = [0.5688888888888889, 0.47862867049936647, 0.47862867049936647, 0.23692688505618908, 0.23692688505618908]

export function integrate(f: (x: number) => number, a: number, b: number, maxPanelK = 1): number {
  if (a === b) return 0
  if (b < a) return -integrate(f, b, a, maxPanelK)
  const panels = Math.max(1, Math.ceil((b - a) / maxPanelK))
  const h = (b - a) / panels
  let sum = 0
  for (let p = 0; p < panels; p++) {
    const mid = a + (p + 0.5) * h
    let panel = 0
    for (let n = 0; n < 5; n++) panel += WEIGHTS[n]! * f(mid + (NODES[n]! * h) / 2)
    sum += (panel * h) / 2
  }
  return sum
}
