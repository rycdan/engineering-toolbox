# Engineering Toolbox — notes for Claude Code

Browser-only React 19 + TypeScript + Vite app for mechanical design, machining, and cryogenic engineering calculations. It is deployed to GitHub Pages from `main`.

## Read first

- `docs/PROJECT_BRIEF.md`: the authoritative requirements. Never drop a requirement from it.
- `docs/ROADMAP.md`: what is done and what comes next.
- `docs/DECISIONS.md`: decisions D-xxx and open questions Q-xxx. Add to it when you make or meet one.
- `docs/ENGINEERING_METHODS.md`, `docs/DATA_SOURCES.md`: methods, benchmarks, and provenance.
- `docs/DEVELOPMENT_SETUP.md`: machine setup and the deploy workflow.

## Commands

```sh
npm ci                 # install locked deps
npm run dev            # http://localhost:5173
npm run check          # typecheck + lint + unit/benchmark tests + build (run before every commit)
npm run e2e            # Playwright browser checks (needs: npx playwright install chromium)
npm run data:nist      # regenerate + re-verify the NIST dataset from data-sources/ snapshots
```

## Engineering rules (from the brief; non-negotiable)

- Never show plausible-looking numbers without a source. A planned tool shows its scope only, with no inputs or values.
- Calculation code lives in `src/engineering/` as pure functions with canonical units (m, K, ΔK, 1/K). Temperature points and temperature differences use different conversions.
- Reference data lives in `src/data/`, versioned (`src/data/version.ts`). Any value change bumps `DATASET_VERSION`, gets an entry in `docs/DATA_SOURCES.md`, and keeps earlier results reproducible.
- Validate against independent or source-published benchmarks (`tests/benchmarks/`), not the app's own formula. Document every tolerance.
- Block unsupported ranges instead of extrapolating. Show limitations next to results.
- Missing, not applicable, not observed, and unverified are distinct states, and none of them is ever shown as 0.
- Keep reference values, computed values, manufacturer guidance, and design presets distinguishable.
- The NIST dataset JSON is generated. Do not hand-edit `src/data/nist-cryogenic/*.json`; change `tools/nist-cryogenic/` and rerun `npm run data:nist`.

## Code conventions

- Match the surrounding style. Prettier-like formatting with no semicolons and single quotes. Comments are sparse and explain why.
- `src/` imports omit extensions. `src/engineering/cryogenic/equations.ts` imports `./erf.ts` explicitly so Node can run `tools/*.ts` directly (Node ≥ 22.18 type stripping; `erasableSyntaxOnly`).
- Routing is hash-based (`#/thermal?...`), and the URL carries the calculator state plus dataset/calculation versions.
- Plots are hand-written SVG (`src/components/LinePlot.tsx`); there is no chart library.

## Git workflow

- Work on `feature/<topic>` branches with small commits, and run `npm run check` before each.
- Push the feature branch; CI (`.github/workflows/ci.yml`) runs checks and Playwright.
- Merging to `main` deploys the public site (`.github/workflows/pages.yml`), so ask the user before merging. Fast-forward or merge-commit only; never squash, force-push, or rewrite pushed history without explicit permission.
- The GitHub account is `rycdan`; the remote is `https://rycdan@github.com/rycdan/engineering-toolbox.git`.

## Environment gotchas (Windows dev machine)

- After `winget install OpenJS.NodeJS.LTS`, open a new terminal (or refresh PATH) before `node`/`npm` work.
- Python's certificate bundle rejected trc.nist.gov ("certificate has expired"). Use `curl` (Windows Schannel) to fetch NIST pages, and do not disable TLS verification.
- `.gitattributes` normalizes line endings to LF, except `data-sources/**`, which stays byte-exact so manifest hashes hold.
- Stop dev/preview servers by port (`Get-NetTCPConnection -LocalPort 4173`), not by killing every `node.exe`.
