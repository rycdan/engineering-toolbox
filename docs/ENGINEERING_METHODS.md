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

## Thermal expansion and contraction (calculation version `thermal-expansion@1.0.0`)

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
- **Piecewise models:** each segment states its interval and which side owns a breakpoint. The model data records the source wording and the measured discontinuity at each breakpoint (see NIST 6061-T6 below), and a test checks that the discontinuity stays within the documented bound.
- **Range:** temperatures outside the model's **equation range** are blocked. The UI shows the source's **measured-data range** separately from the equation range. v1 has no extrapolation override.

#### NIST 6061-T6 aluminum (model `nist-6061-t6-linear-expansion`, revision 1)

Source: NIST Cryogenic Material Properties, 6061-T6 Aluminum (UNS A96061), "Linear expansion" column (see [DATA_SOURCES.md](DATA_SOURCES.md#s-nist-6061-t6)).

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

### Future: CTE-curve models

For sourced instantaneous `α(T)`: `Lf/Li = exp(∫α dT)`. For coefficients normalized to a reference length (`α* = (1/L_ref)·dL/dT`): `Lf = Li + L_ref·∫α* dT`, with `L_ref` inferred consistently. Not implemented in v1, and never mixed with Method A.

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

## Confirmed conventions for later modules

Recorded from the brief so they are not lost. Not yet implemented.

- **Locator assembly:** two dowel pins fixed in Part A. Part B has one round hole and one slot. The slot's long axis lies on the line between the two nominal locator centers. The mating face constrains out-of-plane motion.
- **Thread-entry CAD chamfer preset:** `opening = 1.10·Ds` (configurable design rule, not a standard requirement). `axial_depth = (opening − db)/(2·tan(A/2))`. Default `A = 90°` included (45°/side), labeled and editable, where `axial_depth = (opening − db)/2`. Reject `opening < db`. Report opening diameter, included angle, axial depth, and the CAD chamfer dimension with its convention labeled. Cut-tap and form-tap modeled bores are separate, and the bore is user-overridable.
- **Helical-insert countersink preset:** 120° included, axial depth = one pitch (1P) measured from the surface to the intersection with the selected cylindrical bore. `opening = db + 2·P·tan 60° ≈ db + 3.464101615·P`. 1P is **not** the insert set-down. Both are separate inputs. Manufacturer instructions are shown alongside, never silently substituted.
- **Custom fit solver:** `C = hole − shaft` (negative = interference). `hole_min = shaft_max + C_min`, `hole_max = shaft_min + C_max`. An inverted interval is infeasible. A zero-width interval needs an explanation.
- **Small-angle intuition (not the GD&T solver):** `E ≈ L·θ`. 0.05° one-sided over 100 mm ≈ 87 µm.
- **Torque:** `T = K·F·d` with K an empirical nut factor.
- **Heat flow:** `Q = (A/L)·∫k dT`, uniform section, steady 1-D, no generation.
