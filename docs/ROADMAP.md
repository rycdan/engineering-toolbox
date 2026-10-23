# Roadmap

Status of every destination and requirement in [PROJECT_BRIEF.md](PROJECT_BRIEF.md). The brief remains the authoritative requirement list; this file tracks sequencing and status. A tool is only marked **available** when it meets the brief's completion standard (scope works in the UI, units and invalid input handled, provenance shown, numerical cases pass, committed).

Status key: **available** · **in progress** · **planned** (visible in the app as a labeled placeholder, no calculations).

## Destinations

| # | Destination | Status | Iteration |
|---|---|---|---|
| 1 | Fasteners & Hole Preparation | planned | 2 |
| 2 | Machining Threads & Tolerances | planned | 3 |
| 3 | Shaft & Hole Fits | planned | 4 |
| 4 | Materials (general, room-temperature reference) | planned | 8 (data sourcing can start earlier) |
| 5 | Thermal Expansion & Contraction | **available**, 38 NIST models | 1, NIST dataset 2026-10-23 |
| 6 | Conductive Heat Flow | planned | 5 |
| 7 | Bolt Torque & Preload | planned | 5 |
| 8 | Pin & Slot GD&T Guide | planned | 6–7 |

## Completed

### Iteration 0 — repository and engineering plan

- Brief preserved as `docs/PROJECT_BRIEF.md`.
- Roadmap, methods, data-source, decision, and Git workflow documents.
- Confirmed geometry and chamfer conventions recorded in [ENGINEERING_METHODS.md](ENGINEERING_METHODS.md#confirmed-conventions-for-later-modules).
- Project scripts (`npm run check`, etc.) and the Git iteration policy ([GIT_WORKFLOW.md](GIT_WORKFLOW.md)).

### Iteration 1 — foundation and thermal expansion/contraction

- App shell with all eight destinations; seven are labeled planned.
- Shared units (length, temperature point vs. difference, CTE), finite-number validation, display formatting separate from calculation precision.
- Sourced material-model structure with dataset and calculation versions.
- Thermal calculator: constant-CTE estimate (two explicitly labeled conventions) and NIST 6061-T6 reference-strain model with the piecewise 18 K breakpoint, Kelvin conversion, ×10⁻⁵ scaling, and equation-range blocking.
- Result plot, expandable methods/sources, limitations next to results, reset, copyable record, printable record, reproducible URL state.
- Benchmarks against NIST's published evaluated table, measured NBS Monograph 29 aluminum contraction, and hand-worked constant-CTE cases.

### NIST cryogenic material dataset (2026-10-23)

- All 43 entries of the NIST cryogenic material-properties index snapshotted, extracted (128 property models: k, cp, linear expansion, CTE, E), and checked against NIST's evaluated tables (84 exact, 22 within 0.1 %, 6 differ and are documented, 16 not tabulated).
- Thermal calculator: 36 published strain curves plus integrated-CTE models for OFHC copper and silicon (validated against measured contraction), grouped by material family with variant, verification status, and coverage shown.
- Stored for later tools: thermal conductivity (heat flow), specific heat, Young's modulus, regenerator volumetric heat capacity.

## Remaining work by iteration

Later iterations may be reordered on request; each keeps its verification requirements.

### Iteration 2 — Fasteners & Hole Preparation (brief §1)

- Unified inch (UNC/UNF) and metric coarse/fine thread data with family/edition identity and documented coverage.
- Clearance holes (close / normal-free / loose, preserving source terminology); hole limits stored separately from suggested drills.
- Cut-tap and roll/form-tap predrill data as separate process selections with material, engagement, and tool basis. Never copy cut-tap data into form-tap fields.
- SHCS head diameter/height with limits; counterbore diameter/depth (flush and user-recessed); button-head OD/height. Separate coarse/fine and standard variants.
- CAD thread-entry chamfer calculator (separate cut-tap and form-tap modeled bores, bore override, editable 90° preset, opening = 1.10·Ds, reject opening < bore).
- Helical inserts / STI preparation: manufacturer/family selection, all distinct fields in brief §1, manufacturer countersink vs. the user's 120°/1P preset shown side by side, section view with labeled reference bore and depth origin, discrepancy checks. "Not specified"/"not supported" instead of invented values.
- Thread selection carried between fastener, machining-thread, and insert views.

### Iteration 3 — Machining Threads & Tolerances (brief §2)

- Finished-thread lookup (family, size, pitch, internal/external, class); basic/min/max pitch diameter, tolerance width, major/minor limits, length-of-engagement handling, annotated profile diagram, standard/edition/rounding preserved.
- Tap H/D limit chart: actual selected-thread bands, inch H-limit and metric D-limit overlays, absolute vs. deviation display (in/mm/µm), selectable bands with numeric limits, explanatory notes (tap H3 vs. thread 6H vs. fit H7; no unconditional H-to-class mapping; Guhring bars are illustrative only).
- Tooling panel (cutting/forming, material, manufacturer/tool, coating/plating). Product, tap, and gage limits kept separate; link to inspection method.

### Iteration 4 — Shaft & Hole Fits (brief §3)

- ASME B4.1 and ISO 286 lookup (hole/shaft basis, limits, bands, signed clearance range, classification), editions and size-interval coverage recorded.
- Custom mating-hole solver: `hole_min = shaft_max + clearance_min`, `hole_max = shaft_min + clearance_max`; infeasible and zero-width handling; limit and nominal±deviation output; conservative rounding; nearest standard options without mislabeling. Benchmark: shaft 9.990–10.000 mm, clearance 0.010–0.040 mm ⇒ hole 10.010–10.030 mm.
- Later: assembly vs. service-temperature fits using shared material models.

### Iteration 5 — Conductive Heat Flow and Bolt Torque & Preload (brief §6, §7)

- Heat flow: the verified NIST k(T) models are already in the dataset (43 conductivity models, including OFHC copper RRR 50–500). Models flagged "differs" (G-10 normal direction) need resolution or labeling first. `Q = (A/L)·∫k(T)dT`; area, rectangle, round, tube, AWG (conductor only, stranded override), parallel count; conductance vs. conductivity kept distinct; RRR/purity distinctions. Contact resistance, intercepts, varying sections, radiation are later extensions.
- Torque/preload: `T = K·F·d` both directions, K as empirical nut factor, torque/K ranges to preload range, prevailing torque separate, stress-area tensile stress vs. selected proof/yield basis. No universal safe torque.

### Iterations 6–7 — Pin & Slot GD&T Guide (brief §8)

- Forward analysis first: feasibility, max angular deviation, translational freedom, interactive top view with exaggerated zones and scale indicator, section view, contribution breakdown (clearance, location, temperature). Assembly feasibility separate from guaranteed accuracy.
- Inverse allocation and press-fit recommendations only after hand-checked benchmarks pass, with sourced, scoped press-fit rules.

### Iteration 8 — Materials tab and broader data (brief §4)

- Every catalog entry in brief §4 (no entries dropped), with family/subfamily, condition variants, hardness with explicit scale and statistic type, independent Tg / melting fields (alloy solidus–liquidus ranges, explicit not-applicable/not-reported/decomposes states), separate HDT/Vicat/decomposition/service fields, other general properties with conditions.
- Hardness sorting within comparable scale groups, direction toggle, active-group label, scale and family filters, ranges kept as ranges, unresolved values last with reasons. Optional documented conversions only where applicable (ASTM E140 scope).
- TECAPEEK CMF white product example (Ensinger) re-verified at implementation time.
- Capability field linking to verified calculator models; no implied cryogenic coverage.

### Iteration 9 — shareable state, export polish, and data coverage

- URL state, copy, and print for every calculator (thermal already has them).
- Two-material differential motion using the NIST expansion models.
- Re-check the NIST snapshot periodically (new materials or revised coefficients mean a new dated snapshot and a dataset version bump; older versions stay reproducible).

## Thermal tool: deferred items

- Two-material differential motion comparison.
- A property-explorer view (k, cp, E, α vs. T) for the NIST dataset, if wanted. It is not one of the brief's eight destinations.
- Optional, explicitly labeled extrapolation override outside a model's equation range (blocked in v1).
