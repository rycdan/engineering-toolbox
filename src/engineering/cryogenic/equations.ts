// Explicit .ts extension so Node tools (tools/nist-cryogenic) can import this module directly.
import { erf } from './erf.ts'

/**
 * Equation forms used by the NIST cryogenic material-property fits.
 * T is always in kelvin. Each form returns the source's tabulated quantity y
 * (before any unit scaling).
 *
 *  constant            y = value
 *  polynomial          y = Σ cᵢ·Tⁱ                                   (linear expansion, Young's modulus)
 *  log10-polynomial    log₁₀ y = Σ cᵢ·(log₁₀ T)ⁱ                      (k, cp, CTE)
 *  nist-copper-k       log₁₀ k = (a + c√T + eT + gT^1.5 + iT²)/(1 + b√T + dT + fT^1.5 + hT²)
 *  nist-kevlar-k       log₁₀ k = (a + b·x)·(1 − erf(2(x − c)))/2 + (d + e·exp(−x/f))·(1 + erf(2(x − c)))/2,  x = log₁₀ T
 *  nist-silicon-cte    α = {(4.8e−5·T³ + (aT⁵ + bT^5.5 + cT⁶ + dT^6.5 + eT⁷)·(1 + erf(T − 15))/2)·(1 − erf(0.2(T − 52)))/2
 *                          + (−47.6 + f(T − 76)² + g(T − 76)³ + h(T − 76)⁹)·(1 + erf(0.2(T − 52)))/2·(1 − erf(0.1(T − 200)))/2
 *                          + (i + j/T + k/T² + l/T³)·(1 + erf(0.1(T − 200)))/2}         (10⁻⁸/K)
 *  tabulated           linear interpolation between (T, y) points
 */
export type Equation =
  | { form: 'constant'; value: number }
  | { form: 'polynomial'; coefficients: number[] }
  | { form: 'log10-polynomial'; coefficients: number[] }
  | { form: 'nist-copper-k'; coefficients: number[] }
  | { form: 'nist-kevlar-k'; coefficients: number[] }
  | { form: 'nist-silicon-cte'; coefficients: number[] }
  | { form: 'tabulated'; points: [number, number][] }

/** Interval bound in kelvin with explicit ownership of the endpoint. */
export interface Bound {
  kelvin: number
  inclusive: boolean
}

export interface Segment {
  lower: Bound
  upper: Bound
  equation: Equation
}

function polynomial(c: readonly number[], x: number): number {
  let y = 0
  for (let i = c.length - 1; i >= 0; i--) y = y * x + (c[i] ?? 0)
  return y
}

function coefficient(c: readonly number[], i: number): number {
  return c[i] ?? 0
}

export function evaluateEquation(eq: Equation, T: number): number {
  switch (eq.form) {
    case 'constant':
      return eq.value
    case 'polynomial':
      return polynomial(eq.coefficients, T)
    case 'log10-polynomial':
      return 10 ** polynomial(eq.coefficients, Math.log10(T))
    case 'nist-copper-k': {
      const [a, b, c, d, e, f, g, h, i] = Array.from({ length: 9 }, (_, n) => coefficient(eq.coefficients, n)) as [
        number, number, number, number, number, number, number, number, number,
      ]
      const s = Math.sqrt(T)
      const num = a + c * s + e * T + g * T * s + i * T * T
      const den = 1 + b * s + d * T + f * T * s + h * T * T
      return 10 ** (num / den)
    }
    case 'nist-kevlar-k': {
      const [a, b, c, d, e, f] = Array.from({ length: 6 }, (_, n) => coefficient(eq.coefficients, n)) as [
        number, number, number, number, number, number,
      ]
      const x = Math.log10(T)
      const blend = erf(2 * (x - c))
      return 10 ** (((a + b * x) * (1 - blend)) / 2 + ((d + e * Math.exp(-x / f)) * (1 + blend)) / 2)
    }
    case 'nist-silicon-cte': {
      const [a, b, c, d, e, f, g, h, i, j, k, l] = Array.from({ length: 12 }, (_, n) => coefficient(eq.coefficients, n)) as [
        number, number, number, number, number, number, number, number, number, number, number, number,
      ]
      const low = 4.8e-5 * T ** 3 + (a * T ** 5 + b * T ** 5.5 + c * T ** 6 + d * T ** 6.5 + e * T ** 7) * ((1 + erf(T - 15)) / 2)
      const u = T - 76
      const mid = -47.6 + f * u ** 2 + g * u ** 3 + h * u ** 9
      const high = i + j / T + k / T ** 2 + l / T ** 3
      const w52 = erf(0.2 * (T - 52))
      const w200 = erf(0.1 * (T - 200))
      return low * ((1 - w52) / 2) + mid * ((1 + w52) / 2) * ((1 - w200) / 2) + high * ((1 + w200) / 2)
    }
    case 'tabulated': {
      const pts = eq.points
      if (pts.length === 0) return Number.NaN
      for (let n = 1; n < pts.length; n++) {
        const [t0, y0] = pts[n - 1]!
        const [t1, y1] = pts[n]!
        if (T <= t1) return y0 + ((y1 - y0) * (T - t0)) / (t1 - t0)
      }
      return pts[pts.length - 1]![1]
    }
  }
}

export function segmentContains(s: Segment, T: number): boolean {
  const aboveLower = s.lower.inclusive ? T >= s.lower.kelvin : T > s.lower.kelvin
  const belowUpper = s.upper.inclusive ? T <= s.upper.kelvin : T < s.upper.kelvin
  return aboveLower && belowUpper
}

export function findSegment(segments: readonly Segment[], T: number): Segment | undefined {
  return segments.find((s) => segmentContains(s, T))
}

/** Evaluate a piecewise equation; undefined outside every segment. */
export function evaluateSegments(segments: readonly Segment[], T: number): number | undefined {
  if (!Number.isFinite(T)) return undefined
  const s = findSegment(segments, T)
  return s ? evaluateEquation(s.equation, T) : undefined
}
