import { describe, expect, it } from 'vitest'
import { niceTicks, tickDecimals } from '../../src/components/plotScale'

describe('niceTicks', () => {
  it('covers 4–300 K with round steps', () => {
    expect(niceTicks(4, 300)).toEqual([50, 100, 150, 200, 250, 300])
  })
  it('handles narrow length ranges without float noise', () => {
    const ticks = niceTicks(99.58, 100.03, 5)
    expect(ticks).toEqual([99.6, 99.7, 99.8, 99.9, 100])
    expect(tickDecimals(ticks)).toBe(1)
  })
  it('includes negative and zero ticks', () => {
    expect(niceTicks(-269.15, 26.85)).toEqual([-250, -200, -150, -100, -50, 0])
  })
  it('uses enough decimals for 2.5×10ⁿ steps', () => {
    expect(tickDecimals([0, 0.25, 0.5, 0.75])).toBe(2)
    expect(tickDecimals([0, 2.5, 5])).toBe(1)
    expect(tickDecimals([50, 100, 150])).toBe(0)
  })
  it('degenerate range returns a single tick', () => {
    expect(niceTicks(5, 5)).toEqual([5])
  })
})
