/**
 * Display formatting. Calculations never round. These helpers only affect
 * what is shown. Output uses ASCII '-' and '.' so values paste cleanly into
 * CAD and spreadsheets.
 */

/** Round to `digits` significant figures, with plain notation for moderate magnitudes. */
export function formatSignificant(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const magnitude = Math.floor(Math.log10(Math.abs(value)))
  if (magnitude < -6 || magnitude >= 12) {
    return value.toExponential(digits - 1).replace('e+', 'e')
  }
  const decimals = Math.max(0, digits - 1 - magnitude)
  // toFixed handles the rounding. Re-check in case rounding bumped the magnitude (e.g. 9.9996 -> 10.000).
  const fixed = value.toFixed(Math.min(decimals, 100))
  const roundedMag = Math.floor(Math.log10(Math.abs(Number(fixed)) || 1))
  if (roundedMag > magnitude && decimals > 0) {
    return value.toFixed(Math.min(decimals - 1, 100))
  }
  return fixed
}

/** Like formatSignificant but always shows the sign ("+" for positive). */
export function formatSignedSignificant(value: number, digits: number): string {
  const text = formatSignificant(value, digits)
  return value > 0 ? `+${text}` : text
}

/** Fixed decimals, trimming nothing (used for temperatures). */
export function formatFixed(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return '—'
  const text = value.toFixed(decimals)
  return /^-0\.?0*$/.test(text) ? text.slice(1) : text
}
