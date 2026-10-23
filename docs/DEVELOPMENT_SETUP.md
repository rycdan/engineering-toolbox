# Development setup and handoff

How to pick this project up on another computer and keep building it, by hand or with Claude Code.

## 1. Install the tools

| Tool | Version used | Needed for |
|---|---|---|
| Git | any recent | everything |
| Node.js | 24 LTS (≥ 22.18 works) | app, tests, data tools |
| Chromium for Playwright | installed by `npx playwright install chromium` | browser checks (`npm run e2e`) |
| GitHub CLI (`gh`) | optional | PRs, checking Actions runs |
| Python 3 + `pypdf` | optional, 3.13 / pypdf 6.21 | only to re-extract the NIST evaluated-table PDF (`npm run data:bradley-layout`) |
| Claude Code | optional | AI-assisted development. It reads `CLAUDE.md` automatically |

On Windows:

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id GitHub.cli -e      # optional
# open a NEW terminal afterwards so PATH picks up node/npm
```

On macOS: `brew install git node gh`.

## 2. Sign in to GitHub as `rycdan` and clone

```sh
git clone https://rycdan@github.com/rycdan/engineering-toolbox.git
cd engineering-toolbox
```

Putting `rycdan@` in the URL makes Git Credential Manager (bundled with Git for Windows) open a browser sign-in for that account on the first push. With `gh` installed you can instead run `gh auth login` and then `gh auth setup-git`.

Set the commit identity, either for this repo only or with `--global`. Use your GitHub email or your GitHub *noreply* address:

```sh
git config user.name "rycdan"
git config user.email "<your GitHub email or noreply address>"
```

## 3. Install, run, check

```sh
npm ci                          # exact locked dependencies
npx playwright install chromium # once per machine, for e2e
npm run dev                     # http://localhost:5173
npm run check                   # typecheck + lint + 278 unit/benchmark tests + build
npm run e2e                     # Playwright, against a production build on :4173
```

All scripts are listed in [GIT_WORKFLOW.md](GIT_WORKFLOW.md#scripts).

## 4. Day-to-day workflow

1. `git switch main && git pull`
2. `git switch -c feature/<topic>`
3. Make changes, run `npm run check`, and commit in small steps.
4. `git push -u origin feature/<topic>`. CI runs typecheck, lint, tests, build, and Playwright on GitHub.
5. When ready to publish: merge into `main` (fast-forward or merge commit) and `git push origin main`. The **Deploy to GitHub Pages** workflow reruns all checks and deploys only if they pass.

- **Live site:** https://rycdan.github.io/engineering-toolbox/
- **Actions:** https://github.com/rycdan/engineering-toolbox/actions
- **Pages setting** (already done): repository Settings → Pages → Source = *GitHub Actions*.

## 5. Working with Claude Code

- Start Claude Code in the repo folder. `CLAUDE.md` gives it the rules, commands, and workflow, and points it at the docs below.
- Good opening prompts:
  - "Read docs/ROADMAP.md and docs/DECISIONS.md, then start the next iteration: Conductive Heat Flow."
  - "Resolve open question Q-00x."
- The project brief requires sourced data and independent benchmarks. Expect the assistant to fetch sources, record them in `docs/DATA_SOURCES.md`, and add tests before showing any new numbers.
- Before merging to `main` (which deploys), the assistant should ask you. Say so explicitly when you want it to deploy.

## 6. Where things stand (2026-10-23)

- **Available:** Thermal Expansion & Contraction with 38 NIST material models: 36 published strain curves plus integrated CTE for OFHC copper and silicon. It also offers a user-entered constant CTE.
- **Data ready for upcoming tools:**
  - NIST thermal conductivity, specific heat, and Young's modulus for all 43 NIST index entries (`src/data/nist-cryogenic/`), verified against NIST's evaluated tables.
  - Regenerator volumetric heat-capacity table.
- **Planned, in roadmap order:**
  1. Fasteners & Hole Preparation
  2. Machining Threads & Tolerances
  3. Shaft & Hole Fits
  4. Conductive Heat Flow and Bolt Torque & Preload
  5. Pin & Slot GD&T
  6. Materials

  Order can change on request. Conductive Heat Flow is the quickest next step, because its data is already in place.
- **Open questions** (`docs/DECISIONS.md`):
  - Q-001: licensing of ASME/ISO tables in a public repo. This blocks threads, fits, and screws data.
  - Q-002: helical-insert manufacturer priority.
  - Q-003 / Q-004: provenance and visual checks of benchmark data.
  - Q-005: extrapolation override.
  - Q-006 / Q-007: NIST specific-heat and conductivity models that disagree with NIST's tables.
  - Q-008: regenerator data provenance.

## 7. Regenerating the NIST dataset

The app reads only committed JSON. To refresh from NIST:

1. Fetch the pages with `curl` into a **new dated folder**, `data-sources/nist-cryogenic/<YYYY-MM-DD>/`, and write a `MANIFEST.json` with SHA-256 hashes (see the existing one).
2. Point `SNAPSHOT_DIR` in `tools/nist-cryogenic/extract.ts` at it and run `npm run data:nist`.
3. Review the diff and the verification summary. Bump `DATASET_VERSION` and record the change in `docs/DATA_SOURCES.md`.

Keep the old snapshot so earlier results stay reproducible.

## 8. Troubleshooting

- **`node` not found right after installing:** open a new terminal.
- **Push fails with 403 / "Permission denied to <other account>":** Git is using another account's saved credentials. Use the `rycdan@` remote URL (step 2), or remove the `git:https://github.com` entries in Windows Credential Manager.
- **Playwright "browser not found":** run `npx playwright install chromium`.
- **Port 4173 or 5173 in use:** stop the old dev/preview server (it is a `node` process listening on that port).
- **Python `CERTIFICATE_VERIFY_FAILED` fetching trc.nist.gov:** use `curl` instead. Do not disable verification.
