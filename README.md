# Engineering Toolbox

A browser-based toolbox for mechanical design, machining, and cryogenic engineering. It combines sourced reference data, transparent calculations, and visual guides. Every result shows its method, source, and limitations, and can be reproduced from its inputs, calculation version, and dataset version.

**GitHub Pages:** https://rycdan.github.io/engineering-toolbox/ — deployed from `main` by [.github/workflows/pages.yml](.github/workflows/pages.yml) once the repository has Pages enabled (Settings → Pages → Source: GitHub Actions).

## Status

| # | Tool | Status |
|---|---|---|
| 1 | Fasteners & Hole Preparation | Planned |
| 2 | Machining Threads & Tolerances | Planned |
| 3 | Shaft & Hole Fits | Planned |
| 4 | Materials | Planned |
| 5 | **Thermal Expansion & Contraction** | **Available** |
| 6 | Conductive Heat Flow | Planned |
| 7 | Bolt Torque & Preload | Planned |
| 8 | Pin & Slot GD&T Guide | Planned |

Planned tools appear in the app with their scope only. They show no inputs or numbers until their data and methods are verified. See [docs/ROADMAP.md](docs/ROADMAP.md).

### Thermal Expansion & Contraction (v1)

- **38 NIST cryogenic models** covering every material on the [NIST cryogenic material-properties index](https://trc.nist.gov/cryogenics/materials/materialproperties.htm) that has expansion data. These include aluminum alloys, stainless steels, Invar, Inconel 718, Ti-6Al-4V, nickel steels, beryllium, G-10, PTFE, nylon, PVC, foams, sapphire, OFHC copper, and silicon. Published strain curves use the ratio method `Lf = Li(1+ε(Tf))/(1+ε(Ti))` with each source's breakpoints and scaling. Copper and silicon integrate NIST's CTE curve. Temperatures outside each equation range are blocked, and each model shows its verification against NIST's evaluated tables.
- **Constant-CTE estimate** with your own coefficient, in two labeled conventions: mean-linear and instantaneous-exponential.
- Inch and metric lengths, K / °C / °F / °R temperatures, and CTE per K or per °F.
- Final length, signed change, strain, mean CTE over the interval, and a length-vs-temperature plot.
- Limitations shown next to the result, plus expandable method and source details.
- Reset, copy record, copy link (the URL reproduces the calculation and records the dataset and calculation versions), and a printable calculation record.

## Run locally

Requires Node.js ≥ 22.18 (developed on Node 24 LTS). New machine? See [docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md).

```sh
npm ci                 # install exact locked dependencies
npm run dev            # http://localhost:5173
npm run check          # typecheck + lint + unit/benchmark tests + production build
npx playwright install chromium   # once, for browser checks
npm run e2e            # Playwright checks against the production build
```

All scripts are listed in [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md#scripts).

## Verification

Engineering calculations are checked against sourced benchmarks, not only against the app's own formula. See [docs/ENGINEERING_METHODS.md](docs/ENGINEERING_METHODS.md#validation-tests-in-tests) and [tests/benchmarks/](tests/benchmarks/).

- **TE-B1 / TE-B5:** NIST's evaluated tables (Bradley & Radebaugh). All 128 transcribed NIST property models are compared column by column.
- **TE-B6:** copper and silicon integrated CTE vs. measured contraction (NBS Monograph 29).
- **DS-1:** the NIST dataset is regenerated from committed page snapshots and must match byte for byte.
- **TE-B2:** measured aluminum contraction from NBS Monograph 29 (material-proxy check).
- **TE-B3:** an exact-rational independent re-implementation.
- **TE-B4:** hand-worked constant-CTE cases.
- Invariants (zero ΔT, direction, round trip, unit equivalence) and rejection of invalid or out-of-range input.

## Project layout

```text
src/
  app/          navigation, routing, overview, destination registry
  components/   inputs, plot, source list, planned-tool placeholder
  engineering/  pure calculation functions, units, formatting
  data/         versioned models, sources, NIST cryogenic dataset (dataset version)
  features/     tool UIs (thermal)
tests/
  unit/         units, formatting, engine invariants, URL state
  benchmarks/   sourced and independent benchmark cases
e2e/            Playwright browser checks
data-sources/   dated source snapshots (NIST pages, NIST evaluated-table PDF) with hashes
tools/          dataset extraction and verification scripts
docs/           brief, roadmap, methods, data sources, decisions, Git policy
```

## Documentation

- [Development setup and handoff](docs/DEVELOPMENT_SETUP.md): new-machine setup, workflow, current status
- [Project brief](docs/PROJECT_BRIEF.md): authoritative requirements
- [Roadmap](docs/ROADMAP.md)
- [Engineering methods](docs/ENGINEERING_METHODS.md)
- [Data sources](docs/DATA_SOURCES.md)
- [Decisions, assumptions, open questions](docs/DECISIONS.md)
- [Git workflow](docs/GIT_WORKFLOW.md)

## Disclaimer

Reference data and calculations are provided for engineering estimation. Verify critical values against the governing specification, drawing, or manufacturer data for your application.
