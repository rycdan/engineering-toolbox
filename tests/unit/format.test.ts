import { describe, expect, it } from 'vitest'
import { formatFixed, formatPrecise, formatSignedSignificant, formatSignificant } from '../../src/engineering/format'

describe('formatSignificant', () => {
  it.each([
    [996.109655149, 9, '996.109655'],
    [-3.890344851, 5, '-3.8903'],
    [0.000123456, 3, '0.000123'],
    [9.9996, 4, '10.00'],
    [0, 4, '0'],
    [1234567, 3, '1234567'],
    [1.5e-9, 3, '1.50e-9'],
  ])('%s to %s sig figs = %s', (value, digits, expected) => {
    expect(formatSignificant(value, digits)).toBe(expected)
  })
  it('shows non-finite values as a dash rather than a number', () => {
    expect(formatSignificant(Number.NaN, 4)).toBe('—')
  })
})

describe('formatSignedSignificant / formatFixed', () => {
  it('adds + to positive values only', () => {
    expect(formatSignedSignificant(3.9055, 3)).toBe('+3.91')
    expect(formatSignedSignificant(-3.9055, 3)).toBe('-3.91')
  })
  it('does not show negative zero', () => {
    expect(formatFixed(-0.0001, 2)).toBe('0.00')
  })
})

describe('formatPrecise', () => {
  it.each([
    [293.15, 12, '293.15'],
    [20 + 273.15, 12, '293.15'],
    [100, 12, '100'],
    [-0.000389034485, 12, '-0.000389034485'],
    [1.5e-9, 12, '1.5e-9'],
  ])('%s → %s', (value, digits, expected) => {
    expect(formatPrecise(value, digits)).toBe(expected)
  })
})
