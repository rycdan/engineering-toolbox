import { describe, expect, it } from 'vitest'
import {
  cteToPerKelvin,
  ctePerKelvinToUnit,
  kelvinDifferenceToUnit,
  kelvinToTemperature,
  lengthToMeters,
  metersToLength,
  temperatureDifferenceToKelvin,
  temperatureToKelvin,
  TEMPERATURE_UNIT_IDS,
  LENGTH_UNIT_IDS,
} from '../../src/engineering/units'
import { parseNumber } from '../../src/engineering/outcome'

describe('temperature points (offsets apply)', () => {
  it.each([
    [0, 'C', 273.15],
    [32, 'F', 273.15],
    [212, 'F', 373.15],
    [-459.67, 'F', 0],
    [491.67, 'R', 273.15],
    [77, 'K', 77],
    [-196, 'C', 77.15],
  ] as const)('%s %s = %s K', (value, unit, kelvin) => {
    expect(temperatureToKelvin(value, unit)).toBeCloseTo(kelvin, 10)
  })

  it('-40 °C equals -40 °F', () => {
    expect(temperatureToKelvin(-40, 'C')).toBeCloseTo(temperatureToKelvin(-40, 'F'), 10)
  })

  it.each(TEMPERATURE_UNIT_IDS)('round-trips through kelvin (%s)', (unit) => {
    for (const K of [4, 77.35, 293.15, 300]) {
      expect(temperatureToKelvin(kelvinToTemperature(K, unit), unit)).toBeCloseTo(K, 10)
    }
  })
})

describe('temperature differences (no offsets)', () => {
  it('9 °F difference = 5 K', () => {
    expect(temperatureDifferenceToKelvin(9, 'F')).toBeCloseTo(5, 12)
    expect(temperatureDifferenceToKelvin(9, 'R')).toBeCloseTo(5, 12)
  })
  it('°C difference equals K difference, without the 273.15 offset', () => {
    expect(temperatureDifferenceToKelvin(50, 'C')).toBe(50)
    expect(kelvinDifferenceToUnit(5, 'F')).toBeCloseTo(9, 12)
  })
  it('a difference of points equals the converted difference', () => {
    const dF = 70 - 32
    const dK = temperatureToKelvin(70, 'F') - temperatureToKelvin(32, 'F')
    expect(temperatureDifferenceToKelvin(dF, 'F')).toBeCloseTo(dK, 12)
  })
})

describe('length', () => {
  it('1 in = 25.4 mm exactly; 1 mil = 25.4 µm; 1 ft = 12 in', () => {
    expect(metersToLength(lengthToMeters(1, 'in'), 'mm')).toBeCloseTo(25.4, 12)
    expect(metersToLength(lengthToMeters(1, 'mil'), 'um')).toBeCloseTo(25.4, 10)
    expect(metersToLength(lengthToMeters(1, 'ft'), 'in')).toBeCloseTo(12, 12)
  })
  it.each(LENGTH_UNIT_IDS)('round-trips (%s)', (unit) => {
    expect(metersToLength(lengthToMeters(123.456, unit), unit)).toBeCloseTo(123.456, 10)
  })
})

describe('CTE', () => {
  it('1×10⁻⁶/°F = 1.8×10⁻⁶/K; /°C equals /K', () => {
    expect(cteToPerKelvin(1, 'ppm_per_F')).toBeCloseTo(1.8e-6, 18)
    expect(cteToPerKelvin(23.6, 'ppm_per_C')).toBeCloseTo(23.6e-6, 18)
    expect(ctePerKelvinToUnit(23.58e-6, 'ppm_per_F')).toBeCloseTo(13.1, 10)
  })
})

describe('parseNumber', () => {
  it.each(['1', '-2.5', '+3', '.5', '5.', '1e-3', '2.5E+2'])('accepts %s', (text) => {
    expect(parseNumber(text)).not.toBeNull()
  })
  it.each(['', '  ', 'abc', '1e', '1,5', 'Infinity', 'NaN', '1.2.3', '0x10', '1e999'])('rejects %j', (text) => {
    expect(parseNumber(text)).toBeNull()
  })
})
