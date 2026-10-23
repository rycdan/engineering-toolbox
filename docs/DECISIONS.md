# Decisions, assumptions, and open questions

## Decisions

| ID | Date | Decision | Rationale / reversibility |
|---|---|---|---|
| D-001 | 2026-10-22 | React 19 + TypeScript 6.0 + Vite 8. Vitest for unit/benchmark tests, Playwright for browser checks, ESLint. Exact versions pinned in `package.json` and the lockfile. Releases younger than two weeks avoided. TypeScript stays on 6.0.x because typescript-eslint 8.71 supports `<6.1`. | Brief's suggested default for an empty repo. Browser-only, no backend. |
| D-002 | 2026-10-22 | Hash-based routing (`#/thermal?...`) and a relative Vite `base`. | Works on any static host, including GitHub Pages project paths, without server rewrites. The hash query also carries reproducible calculator state. |
| D-003 | 2026-10-22 | Hosting: **GitHub Pages** via a GitHub Actions workflow that runs checks before deploying from `main`. | User requested GitHub Pages on 2026-10-22. Brief left hosting undecided. Static hosting fits the no-backend design. |
| D-004 | 2026-10-22 | Canonical internal units: m, K, ΔK, 1/K. Temperature points and differences use separate conversion functions. | Brief §Implementation foundation. |
| D-005 | 2026-10-22 | Temperatures outside a model's equation range are blocked, with no extrapolation override in v1. | Brief: "block unsupported temperature ranges by default". Override deferred to the roadmap. |
| D-006 | 2026-10-22 | NIST 6061-T6 breakpoint: `T ≥ 18 K` uses the polynomial, `T < 18 K` uses `f`. | Source leaves `T = 18 K` unassigned. Discontinuity is 6.9×10⁻⁸ strain, below the table resolution. Tested. |
| D-007 | 2026-10-22 | Constant-CTE mode offers two labeled conventions: mean-CTE linear (default) and constant instantaneous (exponential). | Avoids silently mixing CTE definitions (brief §5). |
| D-008 | 2026-10-22 | Plots are hand-written SVG components, with no chart library. | Small, accessible, printable, and themeable, with no dependency risk. Revisit if interactive tolerance charts need more. |
| D-009 | 2026-10-22 | Reproducibility: every result record includes calculation version, dataset version, model id and revision, and all inputs with units. The URL hash includes the dataset version and warns on mismatch. | Brief §Product objective. |
| D-010 | 2026-10-22 | Planned destinations render a scope summary and status only, with no inputs and no numbers. | Brief: no plausible fake results. |
| D-011 | 2026-10-23 | Iteration 0–1 feature branch fast-forward merged to `main` to publish on GitHub Pages; individual commits preserved. | User requested GitHub Pages publication and enabled Pages (Source: GitHub Actions). Pages deploys only from `main`. |

## Assumptions

- A-001: The NIST 6061-T6 expansion curve applies to 6061-T6 in general product forms. NIST does not state product form or direction for this curve. The UI shows "product form not specified by source".
- A-002: NIST's `L293` reference is 293 K exactly (not 293.15 K). The ratio method makes the choice immaterial to computed length changes.
- A-003: Users enter lengths measured at the stated initial temperature.

## Open questions

- Q-001: How may ASME/ISO tabulated values (threads, fits, screws) be stored and redistributed in a public repository and public website? This blocks the dataset for Iterations 2–4, not the UI or calculation engines.
- Q-002: Which helical-insert manufacturer(s) and tool families should come first (Stanley Heli-Coil, Böllhoff HELICOIL, others)?
- Q-003: NIST does not name the measured data behind its 6061-T6 linear-expansion fit. If an original 6061-specific dataset can be identified (e.g., Clark 1968; LNG Materials and Fluids), add it as an independent benchmark.
- Q-004: Visually verify the NBS Monograph 29 Table 2.1 aluminum values, which were transcribed from the OCR text layer.
- Q-005: Should an explicitly labeled extrapolation override be offered for temperatures slightly above 300 K (e.g. 30–40 °C shop temperatures), or should the tool stay strictly within the equation range?
