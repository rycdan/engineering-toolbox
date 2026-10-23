import { useEffect, useMemo, useState } from 'react'
import { replaceQuery } from '../../app/hashRoute'
import { copyText } from '../../components/clipboard'
import { NumberWithUnit, SelectField, type Option } from '../../components/fields'
import { LinePlot } from '../../components/LinePlot'
import { SourceList } from '../../components/SourceList'
import { THERMAL_CALC_VERSION, sampleLengthCurve } from '../../engineering/thermal/expansion'
import { formatFixed, formatSignedSignificant, formatSignificant } from '../../engineering/format'
import {
  CTE_UNITS,
  CTE_UNIT_IDS,
  LENGTH_UNITS,
  LENGTH_UNIT_IDS,
  TEMPERATURE_UNITS,
  TEMPERATURE_UNIT_IDS,
  kelvinDifferenceToUnit,
  kelvinToTemperature,
  metersToLength,
  temperatureToKelvin,
  type TemperatureUnit,
} from '../../engineering/units'
import { parseNumber } from '../../engineering/outcome'
import { THERMAL_MODELS, findThermalModel } from '../../data/thermal'
import { MATERIALS } from '../../data/materials'
import { DATASET_VERSION } from '../../data/version'
import { buildThermalRecord } from './record'
import {
  DEFAULT_THERMAL_STATE,
  evaluateThermal,
  paramsToState,
  stateToParams,
  type ThermalFormState,
} from './thermalState'

const PATH = '/thermal'

const lengthOptions: Option<(typeof LENGTH_UNIT_IDS)[number]>[] = LENGTH_UNIT_IDS.map((u) => ({ value: u, label: LENGTH_UNITS[u].label }))
const tempOptions: Option<TemperatureUnit>[] = TEMPERATURE_UNIT_IDS.map((u) => ({ value: u, label: TEMPERATURE_UNITS[u].label }))
const cteOptions = CTE_UNIT_IDS.map((u) => ({ value: u, label: CTE_UNITS[u].label }))
const modelOptions = THERMAL_MODELS.map((m) => ({ value: m.id, label: m.label }))

function shareUrl(state: ThermalFormState): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}#${PATH}?${stateToParams(state).toString()}`
}

/** Show a temperature in the user's unit with K alongside. */
function tempText(kelvin: number, unit: TemperatureUnit, decimals = 2): string {
  const k = `${formatFixed(kelvin, decimals)} K`
  return unit === 'K' ? k : `${formatFixed(kelvinToTemperature(kelvin, unit), decimals)} ${TEMPERATURE_UNITS[unit].label} (${k})`
}

/** Enough significant digits that the change is visible in the final length. */
function finalLengthDigits(finalLength: number, change: number): number {
  if (change === 0) return 9
  return Math.min(15, Math.max(9, Math.ceil(Math.log10(Math.abs(finalLength / change))) + 4))
}

export function ThermalPage({ query }: { query: URLSearchParams }) {
  const [initial] = useState(() => paramsToState(query))
  const [state, setState] = useState<ThermalFormState>(initial.state)
  const [linkWarnings, setLinkWarnings] = useState<string[]>(initial.warnings)
  const [status, setStatus] = useState('')

  const evaluation = useMemo(() => evaluateThermal(state), [state])

  useEffect(() => {
    replaceQuery(PATH, stateToParams(state))
  }, [state])

  const update = <K extends keyof ThermalFormState>(key: K, value: ThermalFormState[K]) => {
    setState((s) => ({ ...s, [key]: value }))
    setStatus('')
  }

  const errorFor = (field: string): string | undefined => {
    if (evaluation.ok) return undefined
    const messages = evaluation.issues.filter((i) => i.field === field).map((i) => i.message)
    return messages.length > 0 ? messages.join(' ') : undefined
  }

  const model = state.method === 'model' ? findThermalModel(state.modelId) : undefined
  const material = model ? MATERIALS[model.materialId] : undefined

  const tempHint = (text: string, unit: TemperatureUnit) => {
    const v = parseNumber(text)
    if (v === null || unit === 'K') return undefined
    return `= ${formatFixed(temperatureToKelvin(v, unit), 2)} K`
  }

  const record = useMemo(() => {
    if (!evaluation.ok) return ''
    return buildThermalRecord(state, evaluation.resolved, evaluation.result, shareUrl(state), new Date())
  }, [evaluation, state])

  const plot = useMemo(() => {
    if (!evaluation.ok) return null
    const { inputs, method } = evaluation.resolved
    const tu = state.initialTUnit
    const lu = state.outLengthUnit
    const series = sampleLengthCurve(inputs, method).map((p) => ({
      x: kelvinToTemperature(p.kelvin, tu),
      y: metersToLength(p.lengthM, lu),
    }))
    const xi = kelvinToTemperature(inputs.initialK, tu)
    const xf = kelvinToTemperature(inputs.finalK, tu)
    return {
      series,
      markers: [
        { x: xi, y: metersToLength(inputs.initialLengthM, lu), label: 'Initial' },
        { x: xf, y: metersToLength(evaluation.result.finalLengthM, lu), label: 'Final' },
      ],
      highlight: [xi, xf] as [number, number],
      xLabel: `Temperature (${TEMPERATURE_UNITS[tu].label})`,
      yLabel: `Length (${LENGTH_UNITS[lu].label})`,
    }
  }, [evaluation, state.initialTUnit, state.outLengthUnit])

  const onCopyRecord = async () => setStatus((await copyText(record)) ? 'Calculation record copied.' : 'Copy failed. Select the record text manually.')
  const onCopyLink = async () => setStatus((await copyText(shareUrl(state))) ? 'Link copied.' : 'Copy failed.')
  const onReset = () => {
    setState(DEFAULT_THERMAL_STATE)
    setLinkWarnings([])
    setStatus('Inputs reset to the default example.')
  }

  return (
    <section className="page thermal" aria-labelledby="thermal-title">
      <header className="page-header">
        <h1 id="thermal-title">
          <span className="nav-number">5</span> Thermal Expansion &amp; Contraction
        </h1>
        <span className="badge badge-available">Available</span>
      </header>
      <p className="lede screen-only">
        Final length and length change of a part between two temperatures, from a sourced temperature-dependent model or
        your own constant CTE.
      </p>

      {linkWarnings.length > 0 && (
        <div className="notice notice-warning" role="alert">
          {linkWarnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <div className="calc-layout">
        <form className="card inputs screen-only" aria-label="Inputs" onSubmit={(e) => e.preventDefault()}>
          <h2>Inputs</h2>
          <fieldset className="segmented">
            <legend>Method</legend>
            <label>
              <input type="radio" name="method" value="model" checked={state.method === 'model'} onChange={() => update('method', 'model')} />
              Temperature-dependent model
            </label>
            <label>
              <input
                type="radio"
                name="method"
                value="constant-cte"
                checked={state.method === 'constant-cte'}
                onChange={() => update('method', 'constant-cte')}
              />
              Constant CTE
            </label>
          </fieldset>

          {state.method === 'model' ? (
            <>
              <SelectField label="Material model" name="model" value={state.modelId} options={modelOptions} onChange={(v) => update('modelId', v)} />
              {model && (
                <p className="field-hint">
                  Equation range {model.equationRangeK[0]}–{model.equationRangeK[1]} K (
                  {formatFixed(kelvinToTemperature(model.equationRangeK[0], 'C'), 2)} to{' '}
                  {formatFixed(kelvinToTemperature(model.equationRangeK[1], 'C'), 2)} °C,{' '}
                  {formatFixed(kelvinToTemperature(model.equationRangeK[0], 'F'), 2)} to{' '}
                  {formatFixed(kelvinToTemperature(model.equationRangeK[1], 'F'), 2)} °F). Measured data {model.dataRangeK[0]}–
                  {model.dataRangeK[1]} K.
                </p>
              )}
            </>
          ) : (
            <>
              <NumberWithUnit
                label="CTE (user supplied)"
                name="cte"
                value={state.cte}
                onChange={(v) => update('cte', v)}
                unit={state.cteUnit}
                unitOptions={cteOptions}
                onUnitChange={(u) => update('cteUnit', u)}
                error={errorFor('cte')}
                placeholder="from your datasheet"
                hint="Use a CTE stated for this temperature interval."
              />
              <SelectField
                label="CTE convention"
                name="convention"
                value={state.convention}
                options={[
                  { value: 'mean-linear', label: 'Mean CTE from initial length: Lf = Li(1 + αΔT)' },
                  { value: 'instantaneous-exponential', label: 'Constant instantaneous CTE: Lf = Li·exp(αΔT)' },
                ]}
                onChange={(v) => update('convention', v)}
              />
            </>
          )}

          <NumberWithUnit
            label="Initial length"
            name="length"
            value={state.length}
            onChange={(v) => update('length', v)}
            unit={state.lengthUnit}
            unitOptions={lengthOptions}
            onUnitChange={(u) => update('lengthUnit', u)}
            error={errorFor('length')}
            hint="Measured at the initial temperature."
          />
          <NumberWithUnit
            label="Initial temperature"
            name="initialT"
            value={state.initialT}
            onChange={(v) => update('initialT', v)}
            unit={state.initialTUnit}
            unitOptions={tempOptions}
            onUnitChange={(u) => update('initialTUnit', u)}
            error={errorFor('initialT')}
            hint={tempHint(state.initialT, state.initialTUnit)}
          />
          <NumberWithUnit
            label="Final temperature"
            name="finalT"
            value={state.finalT}
            onChange={(v) => update('finalT', v)}
            unit={state.finalTUnit}
            unitOptions={tempOptions}
            onUnitChange={(u) => update('finalTUnit', u)}
            error={errorFor('finalT')}
            hint={tempHint(state.finalT, state.finalTUnit)}
          />
          <div className="field-row">
            <SelectField label="Final length unit" name="outU" value={state.outLengthUnit} options={lengthOptions} onChange={(v) => update('outLengthUnit', v)} />
            <SelectField label="Change unit" name="dU" value={state.changeUnit} options={lengthOptions} onChange={(v) => update('changeUnit', v)} />
          </div>
          <div className="actions">
            <button type="button" onClick={onReset}>
              Reset
            </button>
          </div>
        </form>

        <div className="results-column">
          <section className="card result" aria-labelledby="result-title" aria-live="polite">
            <div className="card-title-row">
              <h2 id="result-title">Result</h2>
              {evaluation.ok && <span className="badge badge-computed">Computed</span>}
            </div>
            {evaluation.ok ? (
              <ThermalResultView state={state} evaluation={evaluation} />
            ) : (
              <div className="notice notice-error" role="alert">
                <strong>No result.</strong>
                <ul>
                  {evaluation.issues.map((i) => (
                    <li key={i.message}>{i.message}</li>
                  ))}
                </ul>
              </div>
            )}
            {evaluation.ok && (
              <div className="actions screen-only">
                <button type="button" onClick={onCopyRecord}>
                  Copy record
                </button>
                <button type="button" onClick={onCopyLink}>
                  Copy link
                </button>
                <button type="button" onClick={() => window.print()}>
                  Print record
                </button>
                <span className="status" role="status">
                  {status}
                </span>
              </div>
            )}
          </section>

          {plot && (
            <section className="card" aria-labelledby="plot-title">
              <h2 id="plot-title">Length vs. temperature</h2>
              <LinePlot
                {...plot}
                title="Part length versus temperature"
                description={
                  state.method === 'model'
                    ? `Length of this part across the model's equation range, passing through the initial length at the initial temperature. The shaded band spans initial to final temperature.`
                    : 'Length of this part under the constant-CTE estimate around the input interval. The shaded band spans initial to final temperature.'
                }
              />
              {state.method === 'model' && (
                <p className="field-hint">The plot spans the model’s full equation range. The shaded band is your temperature interval.</p>
              )}
            </section>
          )}
        </div>
      </div>

      {evaluation.ok && (
        <section className="print-only" aria-hidden="true">
          <pre className="record">{record}</pre>
        </section>
      )}

      <details className="card disclosure">
        <summary>Method and equations</summary>
        {state.method === 'model' && model ? (
          <div className="method">
            <p>
              <strong>{model.label}</strong>: the source publishes the integrated relative length change{' '}
              <code>ε(T) = {model.quantity}</code>, tabulated as <code>y = ε / {model.scale}</code>, with T in kelvin.
            </p>
            <pre>{model.equationText}</pre>
            <p>The curve is already integrated, so it is not integrated again. The final length uses the ratio method:</p>
            <pre>{'Lf = Li · (1 + ε(Tf)) / (1 + ε(Ti))\nΔL = Li · (ε(Tf) − ε(Ti)) / (1 + ε(Ti))'}</pre>
            <p>
              The ratio form also removes the fit’s small non-zero value at the nominal reference temperature (ε(293 K) ≈
              −3.6×10⁻⁷ for this model).
            </p>
            {model.breakpoints.map((bp) => (
              <p key={bp.kelvin}>
                <strong>Breakpoint at {bp.kelvin} K.</strong> Source: {bp.sourceWording}. This app assigns {bp.kelvin} K to the{' '}
                {bp.owner === 'upper' ? 'polynomial (upper) segment' : 'lower segment'}. {bp.rationale}
              </p>
            ))}
            <p>
              Temperatures outside {model.equationRangeK[0]}–{model.equationRangeK[1]} K are blocked. The app does not
              extrapolate.
            </p>
          </div>
        ) : (
          <div className="method">
            <p>The constant-CTE estimate uses your coefficient and one of two explicit conventions:</p>
            <pre>
              {'Mean CTE from initial length:   Lf = Li · (1 + α·ΔT)\nConstant instantaneous CTE:     Lf = Li · exp(α·ΔT)'}
            </pre>
            <p>
              They differ by about Li·(αΔT)²/2. ΔT is a temperature <em>difference</em> (1 °F = 5/9 K, with no offset).
              Choose the convention that matches how your CTE value is defined.
            </p>
          </div>
        )}
        <p className="field-hint">
          Calculation version {THERMAL_CALC_VERSION} · dataset {DATASET_VERSION}. Display rounding does not affect the
          calculation. Copied and printed records carry 12 significant figures.
        </p>
      </details>

      {state.method === 'model' && model && (
        <details className="card disclosure">
          <summary>Model coverage and sources</summary>
          <dl className="meta-grid">
            <dt>Material</dt>
            <dd>
              {material ? `${material.name}, ${material.designation}, condition ${material.condition}` : model.materialId}
            </dd>
            <dt>Product form</dt>
            <dd>{material?.productForm ?? 'Not specified'}</dd>
            <dt>Equation range</dt>
            <dd>
              {model.equationRangeK[0]}–{model.equationRangeK[1]} K
            </dd>
            <dt>Measured-data range</dt>
            <dd>
              {model.dataRangeK[0]}–{model.dataRangeK[1]} K
            </dd>
            <dt>Fit error</dt>
            <dd>
              {model.fitErrorPercent === null ? 'Not stated' : `${model.fitErrorPercent} %`}. {model.fitErrorBasis}
            </dd>
            <dt>Model</dt>
            <dd>
              {model.id}, revision {model.revision}
            </dd>
          </dl>
          <SourceList ids={model.sourceIds} />
        </details>
      )}
    </section>
  )
}

function ThermalResultView({
  state,
  evaluation,
}: {
  state: ThermalFormState
  evaluation: Extract<ReturnType<typeof evaluateThermal>, { ok: true }>
}) {
  const { result, resolved } = evaluation
  const du = LENGTH_UNITS[state.changeUnit].label
  const ou = LENGTH_UNITS[state.outLengthUnit].label
  const finalLength = metersToLength(result.finalLengthM, state.outLengthUnit)
  const change = metersToLength(result.changeM, state.changeUnit)
  const direction = result.changeM < 0 ? 'contraction' : result.changeM > 0 ? 'expansion' : 'no change'
  const model = resolved.method.kind === 'model' ? resolved.method.model : null
  // °C and K differences are identical, so only °F/°R get a second figure.
  const dTUnit = state.initialTUnit
  return (
    <>
      <div className="primary-result">
        <span className="primary-label">Length change ({direction})</span>
        <output className="primary-value" data-testid="change">
          {formatSignedSignificant(change, 5)} <span className="unit">{du}</span>
        </output>
      </div>
      <dl className="result-grid">
        <dt>Final length</dt>
        <dd data-testid="final-length">
          {formatSignificant(finalLength, finalLengthDigits(finalLength, metersToLength(result.changeM, state.outLengthUnit)))} {ou}
        </dd>
        <dt>Fractional strain ΔL/L</dt>
        <dd data-testid="strain">
          {formatSignedSignificant(result.strain * 1e6, 5)} µε ({formatSignedSignificant(result.strain * 100, 5)} %)
        </dd>
        <dt>Temperature interval</dt>
        <dd>
          {tempText(resolved.inputs.initialK, state.initialTUnit)} → {tempText(resolved.inputs.finalK, state.finalTUnit)}
        </dd>
        <dt>Temperature change</dt>
        <dd>
          {formatSignedSignificant(result.deltaTK, 6)} K
          {dTUnit !== 'K' && dTUnit !== 'C'
            ? ` (${formatSignedSignificant(kelvinDifferenceToUnit(result.deltaTK, dTUnit), 6)} ${TEMPERATURE_UNITS[dTUnit].label})`
            : ''}
        </dd>
        <dt>Mean CTE over interval</dt>
        <dd>
          {result.meanCtePerK === null
            ? 'n/a (ΔT = 0)'
            : `${formatSignificant(result.meanCtePerK * 1e6, 4)} ×10⁻⁶/K (${formatSignificant(result.meanCtePerK * 1e6 / 1.8, 4)} ×10⁻⁶/°F)`}
        </dd>
        <dt>Method</dt>
        <dd>{model ? `${model.label}, model rev. ${model.revision}` : `Constant CTE (${state.convention === 'mean-linear' ? 'mean, linear' : 'instantaneous, exponential'})`}</dd>
      </dl>
      <ul className="limitations" aria-label="Limitations for this result">
        {result.notes.map((n) => (
          <li key={n.text} className={n.severity === 'warning' ? 'limitation-warning' : undefined}>
            {n.severity === 'warning' && <strong>Warning: </strong>}
            {n.text}
          </li>
        ))}
        {model?.limitations.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </>
  )
}
