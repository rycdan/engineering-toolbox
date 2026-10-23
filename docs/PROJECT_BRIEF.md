# Engineering Toolbox — project kickoff

Use this document as the project brief and implementation instructions. Build the application in the repository open in VS Code. Preserve this brief as `docs/PROJECT_BRIEF.md` so future development sessions retain the requirements.

## Working instructions

Act as the implementation partner for this project. Inspect the repository and any `AGENTS.md` instructions first. Reuse an existing application and its conventions when present. For an empty repository, choose a straightforward web application foundation as described below.

Proceed with reasonable, reversible implementation decisions. Ask only when missing information materially affects engineering correctness, access, or a consequential product decision. Record assumptions and unresolved engineering questions in the repository. Missing source data should block the affected calculation or recommendation, not unrelated work.

Start with Iterations 0 and 1 below. Produce a working, reviewable application, run its applicable checks, and preserve the work in Git. Keep subsequent features in the roadmap rather than presenting unfinished tools as working calculators.

## Product objective

Create **Engineering Toolbox**, a practical web application for mechanical design, machining, and cryogenic engineering. It combines sourced reference data, transparent engineering calculations, and visual guides.

The initial users are engineers who need fast answers while designing parts in CAD and preparing drawings or machining operations. Prioritize readable dimensions, reliable units, dimensional limits, useful diagrams, and traceable results.

Engineering results must be reproducible from the saved input values, calculation version, and dataset version. Reference values, computed values, manufacturer guidance, and user-defined design presets must be distinguishable.

## Confirmed decisions

- Development takes place in VS Code, with meaningful iterations tracked in GitHub through the organization's permitted workflow. Do not depend on a Codex GitHub connector.
- Support inch and metric inputs and outputs.
- The locator assembly consists of **two dowel pins fixed in Part A**, mating with **one round hole and one elongated slot in Part B**. The slot's long axis lies along the line between the two nominal locator centers. The mating face constrains out-of-plane motion.
- A normal threaded-hole CAD chamfer preset targets an opening diameter **10% larger than nominal screw OD**. It is a configurable design rule, not a universal standard requirement.
- The requested helical-insert countersink preset is **120 degrees included angle and one pitch of axial countersink depth**. Here, `1P` means the countersink itself is one thread pitch deep; it does **not** mean the insert top coil's installation set-down. Keep these as separate inputs.
- Actual manufacturer instructions may differ from these presets. Show both without silently substituting one for the other.
- The general Materials tab starts with the user's catalog in Section 4, including hardness, material family, and glass-transition/melting information. This is a general material-properties reference, separate from the cryogenic calculators.
- The user's “PEEK CMF” means **Ensinger TECAPEEK CMF**. Preserve that product identity rather than substituting generic PEEK or carbon-fiber-filled PEEK.

## Application structure and user experience

Provide these primary destinations:

1. Fasteners & Hole Preparation
2. Machining Threads & Tolerances
3. Shaft & Hole Fits
4. Materials
5. Thermal Expansion & Contraction
6. Conductive Heat Flow
7. Bolt Torque & Preload
8. Pin & Slot GD&T Guide

Use a consistent layout: input controls, primary result, diagram or plot where useful, and expandable methods/sources. A desktop-first layout should remain usable on smaller screens. Use restrained styling, high legibility, selectable numbers, and accessible controls.

For the reference charts, use search and selectable column groups rather than forcing every field into one enormous visible table. Selecting a thread should carry its size and pitch between the fastener, machining-thread, and insert views.

Every calculator should eventually support reset, copyable results, unit conversion, reproducible URL state, and a printable calculation record. Display limitations next to the relevant result rather than burying them in a generic disclaimer.

## 1. Fasteners & Hole Preparation

Cover Unified inch threads, including UNC/UNF, and metric coarse/fine threads within explicitly documented coverage. Keep standard families and editions identifiable.

### Thread and drill data

- Nominal thread designation and numeric nominal major diameter.
- Pitch/TPI, basic major diameter, and applicable dimensional limits for the selected thread class.
- Close, normal/free, and loose clearance-hole choices, preserving each source's terminology. Store hole limits separately from suggested drill sizes.
- Cut-tap predrill diameter, acceptable range where available, and drill designation.
- Roll/form-tap predrill diameter and acceptable range as a separate process selection.
- State the material, engagement/thread-percentage assumption, and tool/source basis where those affect predrill selection. Never populate missing form-tap data by copying cut-tap data.

### Head geometry and counterbores

- Socket head cap screw (SHCS) head diameter and height, including dimensional limits.
- Associated counterbore diameter and depth, through-clearance hole, and source.
- Counterbore options for flush or user-specified recessed heads; use applicable head limits and clearances.
- Button head screw OD and height, including dimensional limits.
- Distinguish coarse/fine thread and screw-standard variants where applicable. Do not assume identical geometry or loadability across all head styles.

### CAD thread-entry chamfer calculator

Provide separate results for cut-tap and form-tap modeled bore diameters. Allow the user to override the modeled bore because CAD geometry may differ from the selected machining predrill.

Let `Ds` be nominal screw diameter, `db` the selected modeled cylindrical bore diameter, and `A` the included countersink angle:

```text
opening_diameter = 1.10 * Ds
axial_depth = (opening_diameter - db) / (2 * tan(A / 2))
```

Use 90 degrees included angle / 45 degrees per side as an explicitly labeled, editable ordinary-entry-chamfer starting preset. At 90 degrees, axial depth equals `(opening_diameter - db) / 2`. Reject a requested opening smaller than the bore. Show opening diameter, included angle, axial depth, and the appropriate CAD chamfer dimension with its convention labeled.

### Helical inserts and STI hole preparation

Select an insert manufacturer/family and thread size. Expose:

- Required finished internal thread designation after installation.
- STI holding-thread major, pitch, and minor diameter information/limits where specified.
- Installed insert external envelope, if specified.
- Free-state insert OD, if specified, as a distinct field.
- Tap tool OD/dimensions where useful and documented.
- Cutting STI tap predrill diameter/range.
- Forming STI tap predrill diameter/range for supported tools and materials.
- Manufacturer countersink dimensions and tolerances.
- Insert nominal length, full-thread depth, drill depth, and installation set-down as distinct concepts.
- The user's 120-degree / 1P axial-depth preset, separately selectable from manufacturer recommendations.

For this preset, where depth is measured from the surface to the countersink's intersection with the selected cylindrical bore:

```text
axial_depth = pitch
opening_diameter = db + 2 * pitch * tan(60 degrees)
                 = db + approximately 3.464101615 * pitch
```

Label the reference bore and depth origin on the section view. A depth referenced to the STI major diameter differs from one referenced to a predrill bore. Do not confuse this with tap chamfer lead length or insert set-down. Validate computed geometry against the chosen insert family's preparation requirements and show discrepancies.

If an insert or tool dimension is unavailable, display “not specified” or “not supported”; do not invent an insert OD or assume all helical-insert families share the same instructions.

## 2. Machining Threads & Tolerances

Create a dedicated tab for acceptable finished-thread dimensions, particularly **pitch diameter**, plus tap-limit charts inspired by the Guhring PDF in the source list.

### Finished-thread lookup

- Select thread family, size, pitch, internal/external feature, and class.
- Inch classes include 1A/2A/3A external and 1B/2B/3B internal where supported.
- Metric classes include applicable internal and external classes such as 6H and 6g; support additional classes as the sourced dataset permits.
- Display basic, minimum, and maximum pitch diameter, tolerance width, and applicable major/minor diameter limits.
- Include length of engagement when required by the governing calculation or table. Label any normal-engagement default.
- Provide an annotated thread-profile diagram identifying major, pitch, and minor diameters.
- Preserve governing standard, edition, rounding conventions, and applicability.

### Tap H/D limits and class chart

- Show actual selected-thread tolerance bands relative to basic pitch diameter.
- Overlay inch tap H-limit bands and appropriate metric D-limit/tap-tolerance-class bands.
- Toggle absolute dimensions versus deviations from basic; support inches, millimeters, and micrometers.
- Selecting a band reveals its numeric lower and upper pitch-diameter limits.
- Explain the distinction between a finished-thread class and the tap's manufactured tolerance band.
- Do not turn Guhring's illustrative approximate bars into universal numeric class limits. Derive actual bands from the selected thread and governing data.
- Source H/D conventions and any exceptions. Do not assume every metric manufacturer's tool uses the same marking convention.
- Avoid unconditional mappings such as “H3 always produces 2B.” Any tooling suggestions need a thread-, material-, process-, and manufacturer-specific basis.
- Explain that tap H3, metric thread 6H, and cylindrical-hole fit H7 are different designations.

Add a tooling panel for cutting/forming, material, manufacturer/tool, and applicable coating or plating requirements. Keep finished-thread product limits, tap manufacturing limits, and inspection-gage limits separate. Pitch diameter alone is not complete thread acceptance. Link to the applicable inspection method rather than declaring a thread acceptable from one dimension.

## 3. Shaft & Hole Fits

Provide both standard lookup and a custom mating-hole solver:

- ANSI/ASME B4.1 inch fits and ISO 286 metric fits, with editions and coverage recorded.
- Hole-basis and shaft-basis options.
- Display hole/shaft limits, tolerance bands, minimum/maximum signed clearance, and clearance/transition/interference classification.
- Custom mode accepts shaft diameter and upper/lower deviations, plus a desired fit or explicit clearance/interference interval. A shaft's dimensions alone cannot uniquely determine a mating hole.
- An unusual nominal diameter may still be covered by a standard size interval; do not require a preferred nominal size unnecessarily. Respect standard size-interval boundaries and rounding rules.
- Show nearest suitable standard options without falsely labeling a translated custom tolerance as a standard fit.
- Eventually compare assembly and service-temperature fits using the shared material models.

For independent shaft/hole size limits and signed diametral clearance `C = hole - shaft`, the widest permissible hole interval satisfying a requested clearance range is:

```text
hole_min = shaft_max + clearance_min
hole_max = shaft_min + clearance_max
```

Negative clearance represents interference. An inverted interval is infeasible. A zero-width interval requires explanation because it allows no manufacturing variation. Support limit dimensions and nominal-plus-deviations output.

Benchmark: shaft 9.990–10.000 mm, required clearance 0.010–0.040 mm => hole 10.010–10.030 mm.

## 4. General Material Properties and shared data

This tab is a **general, principally room-temperature material reference**, not the cryogenic calculator or a list limited to materials with NIST cryogenic fits. All requested materials should appear even when they lack a cryogenic model. A separate capability field may link to a verified calculator model; never imply cryogenic coverage from the presence of a room-temperature property.

### Required columns and behavior

- Material name, exact grade/alloy, and temper/heat-treatment/conditioning state.
- Material family and useful subfamily, searchable and filterable.
- Hardness value or range, **explicit hardness scale**, test method/load/dwell where available, and test temperature/conditioning. Preserve whether a value is typical, a minimum, a maximum, or a specified range.
- Glass transition `Tg` and melting information as independent fields, with Celsius/Fahrenheit display. Include a compact **“Tg / melting”** table column that labels each value; expand to separate Tg and melting columns when desired.
- For alloys, support melting/solidus-liquidus ranges rather than forcing a single melting point. For amorphous polymers, thermosets, laminates, or other materials without an applicable crystalline melting value, show an explicit status such as “not applicable,” “not reported,” or “decomposes before melting,” backed by the selected material source.
- Keep decomposition, heat-deflection temperature, Vicat softening, and service-temperature limits separate from Tg/Tm. Do not label Tg or melting as the allowable operating temperature.
- Other general properties: density, elastic modulus, Poisson ratio, yield/proof/ultimate strength where applicable, CTE over a stated interval, and thermal conductivity at a stated temperature. Offer column selection to keep the initial view readable.
- Show manufacturer/grade, product form, source, and verification status in row details. Allow missing values without substituting zero.

### Hardness sorting

The user wants hardness-based sorting. Default to **softest to hardest within comparable hardness-scale groups**, with a direction toggle and a visible active scale/group label. Provide a scale filter and family filter. Do not sort raw values from Shore D, HRB, HRC, HRA, Brinell, Vickers, Rockwell M/R, or ball-indentation tests together as if they share a numeric scale.

For metallic materials, an optional common-scale comparison is allowed only when a documented conversion covers that material, source scale, and range. Mark converted values as approximate, retain original measurements, and cite the conversion basis. Do not apply a steel conversion to copper, aluminum, cemented carbide, or polymers without an applicable basis. No invented global hardness score or Shore-to-metal conversion.

If the user later requests one qualitative cross-family soft-to-hard overview, label it as qualitative and distinct from measured hardness sorting. Do not introduce such a ranking silently.

Sort verified scalar typical values numerically within a comparable group. Preserve ranges as ranges; if a range midpoint is used for ordering, display that policy and do not imply exact ordering of overlapping ranges. Put unresolved/unavailable values after populated values and explain why they cannot be ranked yet.

### Starter catalog

Preserve every requested entry. This seed table is in the user's original order to audit coverage; the application sorts verified hardness records according to the policy above. The family assignments are catalog organization, not populated numeric property records. Source hardness and thermal transitions for the exact applicable condition before presenting values.

| Requested material / display label | Material family / subfamily | Identity or condition handling |
|---|---|---|
| Aluminum 2024-T3 | Metal / wrought aluminum alloy | Preserve T3 and applicable product form |
| Aluminum 5052-H32 | Metal / wrought aluminum alloy | Preserve H32 |
| Aluminum 6061-T6 | Metal / wrought aluminum alloy | Preserve T6 |
| Aluminum 7050-T7651 | Metal / wrought aluminum alloy | Preserve T7651 and product form |
| Aluminum 7075-T6 | Metal / wrought aluminum alloy | Preserve T6 |
| Aluminum MIC-6 (Alcoa/Arconic) | Metal / cast aluminum tooling plate | Retain trade name and user-provided brand aliases; verify applicable producer/datasheet |
| Aluminum Alca 5 (PCP) | Metal / aluminum tooling plate | Use exact PCP product data |
| Aluminum ATP-5 (Vista Metals) | Metal / aluminum tooling plate | Use exact Vista Metals product data |
| Copper C101 O60/O61 fully annealed | Metal / copper | Preserve both temper requests; split into condition variants if the source distinguishes properties |
| Copper C101 H00 1/8 Hard | Metal / copper | Separate temper record |
| Copper C101 H01 1/4 Hard | Metal / copper | Separate temper record |
| Copper C101 H02 1/2 Hard | Metal / copper | Separate temper record |
| Copper C101 H04 Full Hard | Metal / copper | Separate temper record |
| Copper C110 H02 half hard | Metal / copper | Preserve alloy and H02 |
| Copper 932 | Metal / copper alloy, bearing bronze | Retain requested search label; use C93200 as the normalized candidate and verify applicable casting form |
| Cartridge Brass (Copper C260) | Metal / copper alloy, brass | Temper/product form unspecified; establish an explicit sourced condition |
| Free-Cutting Brass (Copper C360) | Metal / copper alloy, brass | Temper/product form unspecified; establish an explicit sourced condition |
| Nitronic 60 | Metal / austenitic stainless steel | Preserve trade/alloy identity; condition must be specified |
| Stainless 15-5 H900 | Metal / precipitation-hardening stainless steel | Preserve H900 |
| Stainless 17-4 H900 | Metal / precipitation-hardening stainless steel | Preserve H900 |
| Stainless 18-8 | Metal / stainless steel family | Broad family label; do not silently treat as a unique grade or automatically replace with 304 |
| Stainless 304 | Metal / austenitic stainless steel | Source an explicit annealed/cold-worked condition |
| Stainless 304L | Metal / austenitic stainless steel | Separate alloy record; condition required |
| Stainless 316 | Metal / austenitic stainless steel | Separate alloy record; condition required |
| Stainless 316L | Metal / austenitic stainless steel | Separate alloy record; condition required |
| High speed steel M2 | Metal / high-speed tool steel | Annealed versus hardened/tempered state strongly affects hardness; do not choose silently |
| HSSCo M42 | Metal / cobalt high-speed tool steel | Preserve grade; state required |
| Tungsten Carbide YG8 | Cermet / cemented carbide | Verify manufacturer, binder/grade, test scale, and exact thermal interpretation |
| A2 tool steel | Metal / tool steel | Heat-treatment state required |
| O1 Tool Steel | Metal / tool steel | Heat-treatment state required |
| Ar500 Steel | Metal / abrasion-resistant steel | Verify supplier/product and specified hardness range; do not assume the label is an exact measured value |
| 1018 steel | Metal / low-carbon steel | Hot-rolled, cold-drawn, annealed, and other conditions must remain distinct |
| 4140 Steel | Metal / alloy steel | Annealed, prehard, or quenched/tempered condition required |
| G10 (FR4) | Composite / glass-fiber epoxy laminate | Preserve requested label; separate G10 and FR4 variants where the supplier distinguishes them; Tg is resin/product dependent |
| Titanium grade 2 | Metal / commercially pure titanium | Condition/product form required |
| Titanium grade 5 | Metal / titanium alloy | Source exact grade and condition |
| Titanium grade 23 | Metal / titanium alloy | Preserve distinct grade; condition required |
| HDPE | Polymer / polyethylene thermoplastic | Source a stated grade and specimen condition |
| PEEK | Polymer / PEEK thermoplastic | Unfilled baseline unless a different grade is explicitly selected; source manufacturer/grade |
| TECAPEEK CMF (user originally wrote PEEK CMF) | Polymer composite / ceramic-filled PEEK | User confirmed Ensinger TECAPEEK CMF; identify color/product variant in numeric records |
| Delrin | Polymer / POM acetal homopolymer product family | Retain branded entry; select a particular grade before assigning grade-specific values |
| Acetal | Polymer / POM thermoplastic | Retain generic entry separately; distinguish copolymer/homopolymer and avoid double-counting as an unrelated chemistry |
| Nylon 6/6 | Polymer / PA66 thermoplastic | Record dry versus conditioned state and any filler; do not silently interchange |
| PLA | Polymer / thermoplastic | Source exact grade and bulk/molded versus printed/annealed condition |
| PETG | Polymer / thermoplastic copolyester | Source exact grade and process condition |
| ABS | Polymer / amorphous thermoplastic | Grade dependent; do not substitute softening/HDT for melting |
| PTFE | Polymer / fluoropolymer thermoplastic | Specify unfilled versus filled and grade |
| Polycarbonate | Polymer / amorphous thermoplastic | Source exact grade and process condition |
| PVC | Polymer / vinyl thermoplastic | Rigid versus plasticized condition must be explicit |
| Acrylic | Polymer / PMMA thermoplastic | Verify chemistry and cast versus extruded grade |
| Vespel SP-1 | Polymer / unfilled polyimide | Preserve DuPont product and formed/stock-shape condition; do not invent Tg or melting where unobserved/not applicable |
| UHMW | Polymer / UHMW polyethylene | Normalize as UHMW-PE while preserving UHMW as an alias; source grade |

### Initial verified product example, not a substitute for sourcing the full catalog

Ensinger's **TECAPEEK CMF white** product page identifies ceramic-filled PEEK and reports **Shore D 90** (DIN EN ISO 868), **Tg 151 degrees C**, and **melting temperature 339 degrees C** (DIN EN ISO 11357). Source: https://www.ensingerplastics.com/en/shapes/peek-ceramic-tecapeek-cmf-white . Preserve the named white variant and verify the current source during implementation; do not silently apply every property to all variants or to generic PEEK. User confirmed the TECAPEEK CMF product family, not a color.

### Data and verification rules

Identify exact alloy, temper/condition, and applicable direction or purity information. For unspecified conditions, retain an unresolved row or create clearly labeled condition variants. A generic typical reference is acceptable only with an explicit condition and source, and must not imply a guaranteed specification.

Keep typical properties separate from design allowables. Do not extrapolate strength from a thermal-property dataset. For composites, indicate matrix/fiber system, layup/direction, and applicable test orientation; for polymers, retain conditioning and manufacturing method where they affect the property.

Every property/model needs source URL/document location, revision or retrieval date, units, material condition, test/temperature information, equation type and coefficients when applicable, reference temperature, scaling, direction, and reported uncertainty/fit error where available. Fit error is not automatically total material uncertainty. Missing, not applicable, not observed, and unverified are distinct states.

Use a versioned local dataset so runtime results do not depend on live website scraping. Keep import/verification tooling and source metadata in the repository. Record any distribution permissions or unresolved provenance issues before incorporating source tables. Add checks for hardness-scale-aware ordering, null handling, both Tg and Tm on one material, alloy melting ranges, condition variants, and the separation of general properties from cryogenic capability.

Supporting references for implementation:

- ASTM E140 explains material-specific, approximate hardness conversions; verify the applicable edition and conversion scope: https://store.astm.org/e0140-12a.html
- Copper Development Association C93200 identity and product-form properties: https://alloys.copper.org/alloy/C93200
- DuPont discussion of Vespel SP behavior without an observed melt/Tg before decomposition: https://www.dupont.com/knowledge/high-performance-polyimides-solutions-for-battery-and-hydrogen-powered-vehicles.html
- Victrex generic PEEK overview illustrating distinct Tg and Tm fields; do not substitute for a selected grade's datasheet: https://www.victrex.com/en/products/polymers/peek-polymers

## 5. Thermal Expansion & Cryogenic Contraction

Inputs: material, initial length, initial temperature, final temperature, and output units. Support both a constant-CTE estimate and sourced temperature-dependent models.

NIST may publish integrated relative length change rather than CTE. Never integrate such a strain curve again. For `epsilon(T) = (L(T) - Lref) / Lref`:

```text
Lf = Li * (1 + epsilon(Tf)) / (1 + epsilon(Ti))
```

For actual CTE data, integrate according to its documented definition and reference convention. For instantaneous `alpha = (1/L) dL/dT`, the exact length ratio is `exp(integral(alpha(T) dT))`; reference-length-normalized coefficients follow their own convention. Do not silently mix definitions.

Handle log-polynomial fits, scale factors, piecewise equations, and Kelvin conversion explicitly. Require source-backed behavior at breakpoints. Block unsupported temperature ranges by default and distinguish measured-data coverage from equation coverage.

Outputs: final length, signed change, fractional strain, temperature plot, and later a comparison of two materials' differential motion.

## 6. Conductive Heat Flow

Inputs: material/model, length, hot/cold temperatures, and cross section. Geometry options: direct area, rectangle width/height, round diameter, tube OD/ID, and AWG conductor area. Support parallel member count; AWG conductor area excludes insulation, and stranded constructions may require an override.

For a uniform constant-area member, steady one-dimensional conduction, no internal heat generation, and the stated endpoint conditions:

```text
heat_flow = (area / length) * integral(k(T) dT, cold, hot)
```

Show heat flow and effective conductance. Keep material conductivity and geometry-dependent conductance distinct. Preserve direction and copper purity/RRR distinctions where applicable. Contact resistance, intermediate intercepts, varying cross sections, and radiation are later extensions rather than hidden assumptions.

## 7. Bolt Torque & Preload

Support torque-to-preload and preload-to-torque. Initial method:

```text
torque = K * preload * nominal_diameter
```

Identify `K` as an empirical nut factor, not simply a coefficient of friction. Expose it and any selected source/process assumptions. Include torque and nut-factor ranges to show a preload range. Account for specified prevailing torque separately. Show tensile stress using sourced stress area and compare with a selected material/fastener proof or yield basis when available. Do not choose a universal safe torque or preload percentage. Separate head-style limitations where applicable.

## 8. Pin & Slot GD&T Guide

Start with **forward analysis of an existing design**. Add inverse recommendations only after the geometry and tolerance engine passes independently established benchmark cases.

### Inputs

- Both pins' size ranges and material/type.
- Part A and B materials and conditions.
- Part A retention-hole limits and installed-pin location/orientation assumptions.
- Part B round-hole limits, slot width/length limits, and orientation.
- Locator spacing, plate thickness, engagement depth, pin projection, and nearby wall geometry.
- Datum scheme, feature position/orientation controls, and RFS/MMC choices.
- Angular requirement explicitly defined as one-sided error, ± error, or total angular play. Include translational accuracy when specified.
- Assembly and operating temperatures.
- Retention/loading requirements when making a press-fit or engagement recommendation.

### Results and visuals

- Assembly feasibility, maximum angular deviation, and translational freedom.
- Nominal and worst-case positions in an interactive top view.
- Section view for press depth, mating engagement, and projection.
- Exaggerated tolerance-zone display with a clear scale indicator.
- Separate assembly feasibility from guaranteed alignment accuracy.
- Show the contributions of hole/slot clearance, feature location, and temperature.
- Eventually allocate tolerances between parts, identify infeasible requirements, and propose drawing callouts under a selected standard and datum scheme.

For intuition only, small-angle transverse budget is approximately `E = L * theta` with theta in radians. A one-sided 0.05-degree target over 100 mm is about 87 micrometers of transverse budget. This is not the completed GD&T solver or a unique prescription for position tolerance.

Account for coupled size/position states, MMC bonus, datum mobility where applicable, installed pin orientation, and slot geometry. Circular-feature diametrical position zones differ from the parallel-plane zone controlling a slot's width feature. Do not apply a diameter symbol indiscriminately. Assembly at virtual conditions does not alone guarantee angular accuracy over every permissible state.

Press-fit interference and engagement guidance must be supported for the actual pin, host material/geometry, and load. Diameter/material alone do not establish a unique press depth. Show a sourced preliminary rule only within its stated scope; do not present an unsupported diameter multiple as a validated recommendation.

## Implementation foundation

For an empty repository, a reasonable default is React + TypeScript with Vite, browser-side calculations, an established test runner such as Vitest, and browser checks with Playwright where available. Verify current compatible stable tooling against official documentation at implementation time; pin dependencies in the lockfile. Reuse existing tooling when appropriate.

Keep the initial application usable locally without accounts, a backend, or an AI API. Add server functionality only when an actual requirement needs it. Hosting remains undecided.

Suggested boundaries, adapted to the chosen framework:

```text
src/
  app/                 navigation and shared layout
  components/          reusable inputs, results, tables, diagrams
  engineering/         pure calculation functions and units
  data/                versioned materials, threads, fits, sources
  features/            tool-specific interfaces
tests/
  benchmarks/          independent worked examples and source cases
docs/
  PROJECT_BRIEF.md
  ROADMAP.md
  ENGINEERING_METHODS.md
  DATA_SOURCES.md
  DECISIONS.md
```

Use canonical internal units and explicit conversions at boundaries. Temperature points and temperature differences require different conversion handling. Separate precision used in calculation from precision displayed. Round hole/shaft limits conservatively where needed so formatting cannot silently invalidate a guarantee. Reject nonfinite values and invalid geometry.

## Iterations and first-session deliverables

### Iteration 0 — repository and engineering plan

- Inspect existing files, Git state, and configuration. Preserve unrelated work.
- Save this brief and create concise roadmap, methods, source, and decision documents.
- Record the confirmed geometry and chamfer conventions.
- Establish project scripts and the Git iteration policy below.

### Iteration 1 — runnable foundation and first complete calculator

- Build the application shell with all planned destinations visibly identified.
- Implement shared unit handling, sourced material-model structure, and result/source components.
- Deliver the first complete vertical slice: thermal expansion/contraction with constant-CTE input and at least one verified NIST material model, preferably 6061-T6 if its source is accessible and applicable.
- Implement the reference-strain method, dataset scaling, temperature-range validation, and a useful result plot.
- Validate against independent source/worked examples, zero temperature change, heating/cooling direction, and unit equivalence. Do not treat matching the app's own formula as independent validation.
- Label the other destinations as planned until their data and calculations are implemented. Do not fill them with plausible fake engineering results.
- Provide documented local run commands, applicable passing checks, and a concise account of what is complete and what remains.

### Subsequent iterations

1. Fastener reference and hole-preparation tools, including editable chamfer presets.
2. Machining-thread limits and interactive tap/class charts.
3. Standard and custom shaft/hole fits.
4. Conductive heat flow and torque/preload.
5. Pin/slot forward analysis and visual guide.
6. Validated inverse tolerance allocation and press-fit recommendations.
7. Shareable calculation state, export polish, and broader verified data coverage.

Reorder later features when requested, retaining each module's verification requirements.

## Git and GitHub iteration policy

- Track plans, code, methods, datasets, source metadata, and benchmark cases together.
- If no repository exists, initialize a local one on `main`. Preserve existing repository settings when present.
- Use short feature branches and small, descriptive commits at meaningful checkpoints. Do not accumulate the entire project into one final commit.
- Commit the initial brief/foundation, then each reviewable implementation increment. Preserve requested intermediate designs; a checkpoint containing known failures must be labeled clearly.
- Push feature branches to an already configured, authorized GitHub remote after meaningful iterations when authentication and policy permit. Never claim a local commit has reached GitHub without a successful push.
- If there is no remote or authentication is unavailable, finish and commit the local work, report the exact remaining connection step, and request only the missing remote/account information. Do not bypass administrator restrictions.
- Do not create a public repository, change visibility, force-push, rewrite shared history, or merge to the main branch without explicit authorization.
- Preserve individual iteration commits when merging unless the user requests squashing. Exclude credentials, dependency directories, generated build files, and local caches.
- At each handoff report branch, commit(s), push status, checks run, and material limitations. Add PR links when PRs are created through an authorized workflow.

## Verification requirements

Build meaningful tests around units, dimensional limits, source benchmarks, numerical integration, boundary temperatures, size-interval boundaries, and failure cases. For clearance/interference, independently check all endpoint combinations. For chamfers, check both forward geometry and dimensional conventions. For GD&T, use hand-checked cases before generalizing.

Source tables are not automatically machine-readable or implementation-ready. Document exact pages/sections, revisions, applicability, and any transcription checks. Avoid extrapolation or silently synthesizing missing engineering data. New source/algorithm revisions should preserve enough version information to reproduce earlier results.

## Starting source list

These are starting references from the planning discussion, not proof that every required numeric value has already been extracted or validated. Retrieve the exact applicable documents during implementation and record their editions and relevant pages. Preserve older supported editions where needed rather than silently changing results.

- Guhring, *Tap Tolerances and Approximate Limits* (three-page explanatory reference, including H/D limits and metric tap classes): https://guhring.com/media/support/Tapping-Tolerances-And-Approximate-Limits.pdf
- ASME B1.1, Unified inch screw threads (official preview): https://www.asme.org/wwwasmeorg/media/codes-standards/find-codes/c-t_b1_1_2024.pdf
- ISO 965-1, metric thread tolerances: https://www.iso.org/standard/87889.html
- ISO 965-2, limits of sizes: https://www.iso.org/standard/87890.html
- ISO 965-6, additional metric thread class limits: https://www.iso.org/standard/86908.html
- ASME B4.1, preferred limits and fits: https://webstore.ansi.org/standards/asme/ASMEB41967R2020
- ISO 286-1, limits and fits principles: https://www.iso.org/standard/45975.html
- ISO 286-2, hole and shaft tolerance tables: https://www.iso.org/standard/54915.html
- ASME B18.2.8, screw clearance holes: https://www.asme.org/codes-standards/find-codes-standards/clearance-holes-for-bolts-screws-and-studs
- ASME B18.3, inch socket screw dimensions and related hole preparation: https://www.asme.org/codes-standards/find-codes-standards/socket-cap-shoulder-set-screws-and-hex-keys-%28inch-series%29
- ISO 4762, metric socket head cap screws: https://www.iso.org/standard/34460.html
- ISO 12474, metric fine-pitch socket head cap screws: https://www.iso.org/standard/51434.html
- ISO 7380-1, metric button head screws: https://www.iso.org/standard/78699.html
- NIST cryogenic materials index: https://www.nist.gov/mml/acmd/nist-cryogenic-materials-property-database-index
- NIST 6061-T6 material model: https://trc.nist.gov/cryogenics/materials/6061%20Aluminum/6061_T6Aluminum_rev.htm
- NASA RP-1228, *Fastener Design Manual*: https://ntrs.nasa.gov/api/citations/19900009424/downloads/19900009424.pdf
- Stanley Heli-Coil catalog and hole preparation: https://www.stanleyengineeredfastening.com/-/media/web/sef/resources/docs/heli-coil/heli-coil_catalog_hc2000_rev12.pdf
- Böllhoff HELICOIL installation, including cutting/forming tooling: https://www.boellhoff.com/ch-en/products/assembly-technology/installation-of-helicoil-thread-inserts/
- SPIROL press-fit hole preparation: https://uk.spirol.com/assets/files/pins-wp-hole-preparation-for-press-fit-pins-uk.pdf
- ASME Y14.5, dimensioning and tolerancing: https://www.asme.org/codes-standards/find-codes-standards/y14-5-dimensioning-tolerancing

## Completion standard for each feature

A feature is complete when its defined scope works in the UI, units and invalid inputs are handled, source provenance is present, applicable numerical cases pass, and the result is committed. Document unsupported cases explicitly. Stop short of an engineering recommendation when the required evidence is absent, while continuing the rest of the authorized implementation.
