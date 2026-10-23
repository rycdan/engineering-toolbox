import { useId, type ReactNode } from 'react'

export interface Option<T extends string> {
  value: T
  label: string
  /** Options sharing a group render under one <optgroup>. */
  group?: string
}

function renderOptions<T extends string>(options: readonly Option<T>[]) {
  const groups = [...new Set(options.map((o) => o.group))]
  if (groups.length === 1 && groups[0] === undefined) {
    return options.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ))
  }
  return groups.map((g) => (
    <optgroup key={g ?? ''} label={g ?? 'Other'}>
      {options
        .filter((o) => o.group === g)
        .map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
    </optgroup>
  ))
}

interface SelectProps<T extends string> {
  label: string
  value: T
  options: readonly Option<T>[]
  onChange: (value: T) => void
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean
  name?: string
}

export function SelectField<T extends string>({ label, value, options, onChange, hideLabel, name }: SelectProps<T>) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? 'visually-hidden' : undefined}>
        {label}
      </label>
      <select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {renderOptions(options)}
      </select>
    </div>
  )
}

interface NumberWithUnitProps<U extends string> {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  unit: U
  unitOptions: readonly Option<U>[]
  onUnitChange: (unit: U) => void
  error?: string | undefined
  hint?: ReactNode
  placeholder?: string
}

/**
 * Text input (not type=number) so users can type freely and blank/invalid
 * text is reported rather than silently coerced to 0.
 */
export function NumberWithUnit<U extends string>(props: NumberWithUnitProps<U>) {
  const { label, name, value, onChange, unit, unitOptions, onUnitChange, error, hint, placeholder } = props
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="input-with-unit">
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />
        <select aria-label={`${label} unit`} name={`${name}-unit`} value={unit} onChange={(e) => onUnitChange(e.target.value as U)}>
          {unitOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {hint && (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  )
}
