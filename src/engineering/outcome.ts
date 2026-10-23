/** A validation problem tied (optionally) to an input field. */
export interface Issue {
  field?: string
  message: string
}

/** Calculations return either a value or the reasons no value can be given. */
export type Outcome<T> = { ok: true; value: T } | { ok: false; issues: Issue[] }

export function ok<T>(value: T): Outcome<T> {
  return { ok: true, value }
}

export function fail<T>(issues: Issue[]): Outcome<T> {
  return { ok: false, issues }
}

/**
 * Parse a user-typed number. Blank text and anything that is not a complete
 * finite number (e.g. "1e", "1,5", "Infinity") return null rather than 0 or NaN.
 */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}
