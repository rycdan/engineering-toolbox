# Git and GitHub iteration policy

Adapted from the brief's policy. It applies to every development session.

- Track plans, code, methods, datasets, source metadata, and benchmark cases together. A dataset value change needs its source entry in `docs/DATA_SOURCES.md` and a dataset version bump in the same commit.
- Work on short feature branches (`feature/<iteration>-<topic>`) with small, descriptive commits at meaningful checkpoints. Do not collect a whole iteration into one commit.
- Run `npm run check` before each commit. A checkpoint that knowingly contains failing checks must say so in its commit message.
- Push feature branches to the configured remote (`origin`) after meaningful iterations when authentication permits. Never claim a commit reached GitHub without a successful push.
- Do not force-push, rewrite shared history, change repository visibility, or merge to `main` without explicit authorization. When merging, keep individual iteration commits (fast-forward or merge commit) unless squashing is requested.
- `main` deploys to GitHub Pages through `.github/workflows/pages.yml`, which runs the checks first.
- Never commit credentials, `node_modules/`, `dist/`, test reports, or local caches (see `.gitignore`).
- At each handoff, report the branch, commits, push status, checks run, and limitations.

## Scripts

| Command | Purpose |
|---|---|
| `npm ci` | Install the exact locked dependencies |
| `npm run dev` | Local dev server (http://localhost:5173) |
| `npm run typecheck` | TypeScript project check |
| `npm run lint` | ESLint |
| `npm test` | Unit and benchmark tests (Vitest) |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run e2e` | Playwright browser checks against the production build (first run: `npx playwright install chromium`) |
| `npm run check` | typecheck + lint + test + build |
