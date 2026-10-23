# Engineering Methods

Calculation definitions, conventions, and validation approach. Each implemented method has a calculation version recorded in results so earlier results can be reproduced.

## Units and numerics

- **Canonical internal units:** length in meters, temperature (points) in kelvin, temperature differences in kelvin, CTE in 1/K. Conversions happen only at input/output boundaries (`src/engineering/units.ts`).
- **Temperature points vs. differences:** points use offset conversions (`K = °C + 273.15`, `K = (°F + 459.67)·5/9`, `K = °R·5/9`). Differences use scale only (`ΔK = Δ°C = Δ°F·5/9 = Δ°R·5/9`). They are separate functions so an offset is never applied to a difference.
- **CTE units:** `1/K` = `1/°C`; `1/°F` = `1/°R`; `α[1/K] = 1.8 · α[1/°F]`. The UI shows CTE as ×10⁻⁶/K (µm/m·K) or ×10⁻⁶/°F (µin/in·°F).
- **Exact length factors:** 1 in = 0.0254 m exactly; 1 ft = 0.3048 m; 1 mil = 25.4 µm.
- **Validation:** non-finite inputs (NaN, ±∞, blank) are rejected. Lengths must be > 0. Temperatures must be > 0 K.
- **Precision:** calculations use IEEE-754 double precision with no intermediate rounding. Display rounding is applied only in formatting (`src/engineering/format.ts`), and copied records include more digits than the on-screen summary.
- **Cancellation:** length change is computed directly as a ratio difference (below), not as `Lf − Li` after computing `Lf`, so small changes on long parts keep their significant digits.

## Thermal expansion and contraction (calculation version `thermal-expansion@1.1.0`)

`1.0.0` (2026-10-22): reference-strain and constant-CTE methods. `1.1.0` (2026-10-23): adds integrated-CTE models (Method C) and the measured-data-range note; reference-strain and constant-CTE results are unchanged.

Outputs: final length `Lf`, signed change `ΔL = Lf − Li` (negative = contraction), fractional strain `ΔL/Li`, and the effective mean CTE over the interval, `ΔL / (Li·ΔT)` (informational).

### Method A — reference-strain model (sourced, temperature dependent)

Used when a source publishes integrated relative length change relative to a reference temperature, e.g. NIST's `ε(T) = (L(T) − L₂₉₃)/L₂₉₃`.

```text
Lf = Li · (1 + ε(Tf)) / (1 + ε(Ti))
ΔL = Li · (ε(Tf) − ε(Ti)) / (1 + ε(Ti))
```

- The curve is already integrated. It is **never integrated again**, and its slope is not reused as a CTE.
- The ratio form is required even when `Ti` equals the reference temperature. The fitted curve is not exactly zero at its nominal reference (for NIST 6061-T6, `ε(293 K) = −3.6×10⁻⁷`), and the ratio removes that offset.
- **Scaling:** the source's tabulated quantity `y` maps to strain through a stated factor (NIST 6061-T6: `ε = y × 10⁻⁵`). The factor is stored with the model, never inferred.
- **Kelvin:** model equations are evaluated in kelvin only. Inputs are converted first.
- **Piecewise models:** each segment states its interval and which side owns a breakpoint. The higher-temperature expression always owns the shared temperature. That is consistent with NIST's evaluated tables (e.g. Invar at 80 K prints the polynomial value) and with T > T_low wording (D-006, D-013). The discontinuity at each breakpoint is computed from the published expressions. Jumps of 1×10⁻⁷ strain or more are shown next to results (e.g. Invar: 2.1×10⁻⁶ at 80 K).
- **Range:** temperatures outside the model's **equation range** are blocked, with no extrapolation override. The source's **measured-data range** is shown separately. If an interval leaves the data range but stays inside the equation range, a warning appears next to the result (e.g. silicon below 13 K).

#### NIST models

All 36 NIST linear-expansion curves (31 materials, including direction and density variants) are reference-strain models generated from the NIST dataset ([DATA_SOURCES.md](DATA_SOURCES.md#s-nist-cryo--nist-cryogenic-material-properties-all-materials)). Model ids are `<material>/linear-expansion[/<variant>]`. The worked example below is 6061-T6.

#### NIST 6061-T6 aluminum (model `al-6061-t6/linear-expansion`, revision 1; formerly `nist-6061-t6-linear-expansion`)

Source: NIST Cryogenic Material Properties, 6061-T6 Aluminum (UNS A96061), "Linear expansion" column.

```text
y = (L − L293)/L293 × 10⁵
y = a + b·T + c·T² + d·T³ + e·T⁴     for T > T_low
y = f                                 for T < T_low
a = −4.1277E2, b = −3.0389E−1, c = 8.7696E−3, d = −9.9821E−6, e = 0
T_low = 18 K, f = −415.45
data range 4–300 K, equation range 4–300 K, curve-fit error relative to data 4 %
```

- **Breakpoint at 18 K:** the source states `T > T_low` and `T < T_low` but does not assign `T = 18 K`. The polynomial gives −415.4569 at 18 K and `f` = −415.45, a discontinuity of 6.9×10⁻³ ×10⁻⁵ (6.9×10⁻⁸ strain). That is below the source's coefficient resolution and below NIST's published evaluated table, which lists −415.5 at 18 K. The app assigns **T ≥ 18 K to the polynomial** (decision D-006). A test asserts the jump is < 1×10⁻⁷ strain.
- **Below 18 K:** the polynomial has a minimum near 18 K and would turn upward toward 4 K. NIST caps it with the constant `f`. Its evaluated table leaves 6061 blank below 18 K, while 3003 and 5083, which share the curve, continue on the raw polynomial. The app follows the 6061 page's piecewise definition and shows a note whenever a temperature is below 18 K.
- **Room-temperature limit:** 300 K is 26.85 °C / 80.33 °F. Warmer temperatures are blocked for this model.
- **Uncertainty:** the quoted 4 % is the fit error relative to data, not total material uncertainty. Bradley & Radebaugh note that experimental uncertainty (2–5 %) and sample-to-sample variation apply in addition.

### Method B — constant-CTE estimate (user supplied)

Two conventions, explicitly selectable and labeled:

1. **Mean CTE referenced to the initial length (default):** `Lf = Li·(1 + α·ΔT)`, so `ΔL = Li·α·ΔT`. Matches a handbook "mean coefficient over an interval" applied from the starting length.
2. **Constant instantaneous CTE** `α = (1/L)·dL/dT`: `Lf = Li·exp(α·ΔT)`, so `ΔL = Li·expm1(α·ΔT)`.

The two differ by about `Li·(αΔT)²/2`, negligible for ordinary ranges. `ΔT` is a temperature difference converted without offsets. A constant CTE carries no temperature range of its own, so the result shows a limitation note. When either temperature is below 200 K it also warns that constant room-temperature CTEs overestimate cryogenic contraction. Example: 22.6×10⁻⁶/K × 289 K = 0.65 %, versus NIST's 0.415 % for 6061-T6 from 293 K to 4 K.

### Method C — integrated CTE (NIST materials published only as α(T))

NIST gives OFHC copper and silicon a CTE curve but no linear-expansion curve. For these:

```text
ε(T) = ∫ α(T′) dT′  from 293 K to T        (α taken as (1/L293)·dL/dT)
Lf   = Li · (1 + ε(Tf)) / (1 + ε(Ti))
```

- **Definition:** NIST does not state whether its α is instantaneous `(1/L)·dL/dT` or referenced to `L293`. The app uses the reference-length convention, which matches NBS Monograph 29's definition `dL/(L293·dT)` and NIST's `(L − L293)/L293` strain quantity. The instantaneous convention would give `ln(1 + ε) = ∫α dT`, a difference of ≈ ε²/2: 5×10⁻⁶ strain for copper (0.16 % of its contraction) and below 10⁻⁷ for silicon. Both are inside the stated fit errors. The note is shown with every result.
- **Quadrature:** composite 5-point Gauss–Legendre on panels ≤ 1 K. It is exact for polynomials of degree ≤ 9 per panel, and the panels are fine enough for silicon's erf blends (≈1 K wide). A test integrates the analytic derivative of the 6061-T6 polynomial and recovers the published strain difference to 1×10⁻¹⁴.
- **Validation:** measured contraction (NBS Monograph 29). Copper is within 0.72×10⁻⁵ from 20 to 300 K; silicon is within 0.43×10⁻⁵ from 40 to 300 K, including its non-monotonic contraction (TE-B6).
- Sapphire has both curves; the published linear-expansion curve is used. Mixing definitions within one material is never allowed.

### NIST equation forms (all properties)

Evaluated in `src/engineering/cryogenic/equations.ts`; T in kelvin:

| Form | Used for |
|---|---|
| `y = Σ cᵢTⁱ`, with constant `f` below `T_low` | linear expansion (×10⁻⁵), Young's modulus (GPa) |
| `log₁₀ y = Σ cᵢ(log₁₀T)ⁱ` | thermal conductivity, specific heat, CTE |
| `log₁₀ k = (a + c√T + eT + gT^1.5 + iT²)/(1 + b√T + dT + fT^1.5 + hT²)` | OFHC copper k (RRR 50–500) |
| erf-blended log form (page image) | Kevlar-49 fiber and composite k |
| erf-blended piecewise form (page image), ×10⁻⁸/K | silicon CTE |
| tabulated, linear interpolation | regenerator volumetric heat capacity |

`erf` is implemented in `src/engineering/cryogenic/erf.ts` (series for |x| ≤ 2.5, continued fraction above; agrees with CPython `math.erf` to 1×10⁻¹⁴).

### Validation (tests in `tests/`)

Independent or source-derived benchmarks, not the app's formula checked against itself:

| ID | Benchmark | Independence | Tolerance |
|---|---|---|---|
| TE-B1 | NIST-published evaluated table (Bradley & Radebaugh) 6061 column, 18–300 K | Source-computed values, independent of this code; verifies coefficients, scaling, and breakpoint | ±0.5 in last published digit |
| TE-B2 | NBS Monograph 29 measured contraction of aluminum, 20–300 K, compared with the 6061-T6 model as `ε(T) − ε(293)` | Measured data (pure Al, not 6061; documented as a material-proxy check) | ≤ 4 % of total contraction from 293 K (NIST fit error), plus 0.5×10⁻⁵ table resolution |
| TE-B3 | Exact-rational re-evaluation (Python `fractions`) of selected length changes | Independent implementation and arithmetic, same source equation | 1×10⁻⁹ relative |
| TE-B4 | Hand-worked constant-CTE cases (steel, aluminum; °C and °F inputs) | Hand calculation recorded in test file | 1×10⁻¹² relative |
| TE-P1… | Properties: zero ΔT gives zero change; heating lengthens, cooling shortens; round trip Ti→Tf→Ti returns Li; unit equivalence (mm/in, K/°C/°F/°R) | Physical/algebraic invariants | 1×10⁻¹² relative |
| TE-F… | Failure cases: non-finite, non-positive length, T ≤ 0 K, out-of-range model temperatures | — | Must reject |
| TE-B5 | All 128 NIST dataset models vs. NIST's evaluated tables (Bradley & Radebaugh), by value-matched column | Source-computed tables; checks transcription, units, piecewise handling, and image-transcribed equations | Exact to printed precision, or ≤ 0.1 % (of total contraction for expansion); documented anomalies only; the list of differing models is fixed in the test |
| TE-B6 | OFHC copper and silicon integrated CTE vs. NBS Monograph 29 measured contraction | Measured data | Copper ≤ 1×10⁻⁵; silicon ≤ 0.5×10⁻⁵ |
| DS-1 | Dataset regenerated from the snapshots equals the committed JSON; snapshot SHA-256 match the manifest | Reproducibility | Byte-identical |
| TE-M… | Every thermal model: finite strain over its range, \|ε\| < 3 %, result and plot valid; registry ids unique; sources resolve | Invariants | — |

## Confirmed conventions for later modules

Recorded from the brief so they are not lost. Not yet implemented.

- **Locator assembly:** two dowel pins fixed in Part A. Part B has one round hole and one slot. The slot's long axis lies on the line between the two nominal locator centers. The mating face constrains out-of-plane motion.
- **Thread-entry CAD chamfer preset:** `opening = 1.10·Ds` (configurable design rule, not a standard requirement). `axial_depth = (opening − db)/(2·tan(A/2))`. Default `A = 90°` included (45°/side), labeled and editable, where `axial_depth = (opening − db)/2`. Reject `opening < db`. Report opening diameter, included angle, axial depth, and the CAD chamfer dimension with its convention labeled. Cut-tap and form-tap modeled bores are separate, and the bore is user-overridable.
- **Helical-insert countersink preset:** 120° included, axial depth = one pitch (1P) measured from the surface to the intersection with the selected cylindrical bore. `opening = db + 2·P·tan 60° ≈ db + 3.464101615·P`. 1P is **not** the insert set-down. Both are separate inputs. Manufacturer instructions are shown alongside, never silently substituted.
- **Custom fit solver:** `C = hole − shaft` (negative = interference). `hole_min = shaft_max + C_min`, `hole_max = shaft_min + C_max`. An inverted interval is infeasible. A zero-width interval needs an explanation.
- **Small-angle intuition (not the GD&T solver):** `E ≈ L·θ`. 0.05° one-sided over 100 mm ≈ 87 µm.
- **Torque:** `T = K·F·d` with K an empirical nut factor.
- **Heat flow:** `Q = (A/L)·∫k dT`, uniform section, steady 1-D, no generation.
