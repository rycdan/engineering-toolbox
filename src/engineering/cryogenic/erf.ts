/**
 * Gauss error function, accurate to ~1e-15 absolute. JavaScript has no
 * built-in erf; NIST uses it to blend fits (Kevlar-49 k, silicon CTE).
 *
 * |x| ≤ 2.5: Maclaurin series. |x| > 2.5: erfc continued fraction.
 */
export function erf(x: number): number {
  if (Number.isNaN(x)) return Number.NaN
  if (x < 0) return -erf(-x)
  if (x > 6) return 1
  if (x <= 2.5) {
    // erf(x) = 2/√π · Σ (−1)^n x^(2n+1) / (n! (2n+1))
    let term = x
    let sum = x
    const x2 = x * x
    for (let n = 1; n < 200; n++) {
      term *= -x2 / n
      const add = term / (2 * n + 1)
      sum += add
      if (Math.abs(add) < 1e-17 * Math.abs(sum)) break
    }
    return (2 / Math.sqrt(Math.PI)) * sum
  }
  return 1 - erfcContinuedFraction(x)
}

/** erfc(x) for x > 2 via the Laplace continued fraction, evaluated bottom-up. */
function erfcContinuedFraction(x: number): number {
  let f = x
  for (let k = 60; k >= 1; k--) f = x + k / 2 / f
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / f
}
