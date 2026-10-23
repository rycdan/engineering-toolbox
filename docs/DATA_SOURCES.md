# Data Sources

Every dataset value used at runtime is stored locally in versioned files under `src/data/`. The app never scrapes live websites. This file records where each value came from, how it was transcribed, and any unresolved provenance.

Dataset version: **`2026.10.1`** (see `src/data/version.ts`). Increment it when any runtime value changes. Older model revisions stay in the dataset so saved results can be reproduced.

| Version | Date | Change |
|---|---|---|
| 2026.10.0 | 2026-10-22 | NIST 6061-T6 linear expansion (hand transcription) |
| 2026.10.1 | 2026-10-23 | Full NIST cryogenic material-property dataset (43 index entries, 128 property models, regenerator table). 6061-T6 values unchanged; its model id is now `al-6061-t6/linear-expansion` (the old id still resolves) |

## Sources in use

### S-NIST-CRYO — NIST Cryogenic Material Properties (all materials)

- **Index:** https://trc.nist.gov/cryogenics/materials/materialproperties.htm. All 43 links are included, in index order.
- **Retrieved:** 2026-10-23 with curl (Windows Schannel TLS). Python's bundled certificate store rejected the site's certificate as expired, so no verification was disabled; curl was used instead.
- **Snapshot:** `data-sources/nist-cryogenic/2026-10-23/`, containing the index, all 43 pages, and the four equation images (Kevlar-49 k, silicon CTE). `MANIFEST.json` records each URL and its SHA-256. Snapshots are stored byte-for-byte (`.gitattributes`: `-text`).
- **Extraction:** `tools/nist-cryogenic/extract.ts` (`npm run data:nist`) parses the coefficient tables into `src/data/nist-cryogenic/dataset.json`. It is strict: unknown row labels, unparseable numbers, missing coefficients, unexpected units, and hash mismatches all stop extraction. A test checks that the committed JSON equals a fresh extraction, so hand edits are not possible.
- **Contents:** 128 models: thermal conductivity, specific heat, linear expansion, expansion coefficient (CTE), and Young's modulus. Each model keeps its verbatim header and units, equation and data ranges, fit-error text, and extraction notes.
- **Normalizations, all recorded in model `notes`:**
  - Spaces inside numbers are removed (PVC "8.7335 E-3").
  - Blank or `---` coefficients are treated as 0 (OFHC copper CTE h, i).
  - Copper's single "low range / high range" pair is used as the equation range, with no separate data range.
  - Columns published over adjacent temperature ranges are merged into piecewise models, with the higher-range fit owning the boundary temperature: polystyrene expansion (two densities), 304 and 316 Young's modulus, 310 and 316 specific heat.
- **Special equation forms:**
  - OFHC copper k uses the rational form in √T, as published in the page text.
  - Kevlar-49 k and silicon CTE are published only as equation images. They were transcribed from the saved images (`images/`) and are confirmed by the evaluated tables below.
- **Regenerator materials:** the page is an Excel export, not a fitted equation. Its volumetric heat-capacity table (30 materials × 501 temperatures, 193 blank cells kept as `null`) is in `src/data/nist-cryogenic/regenerator-volumetric-heat-capacity.json`. No calculator uses it yet.
- **Not reproduced:** the property plots (images) on each page.
- **Underlying data:** NIST's reference list does not name the measured data behind some fits, for example 6061-T6 linear expansion (Q-003).
- **Permissions:** U.S. Government work (NIST). Coefficients are facts reproduced with attribution.

### S-NIST-BRADLEY — NIST evaluated tables (verification)

- **Title:** P. E. Bradley and R. Radebaugh, *Properties of Selected Materials at Cryogenic Temperatures*, NIST. Tables evaluated from the NIST material-property equations.
- **URL:** https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=913059. Saved as `data-sources/nist-bradley-radebaugh/…pdf` (retrieved 2026-10-22).
- **Use:** verification of every dataset model. `tools/nist-cryogenic/bradley_layout.py` extracts each table row's numbers with their positions (`tests/benchmarks/data/bradley-radebaugh-layout.json`). `tools/nist-cryogenic/verify-bradley.ts` then finds, for each model, the column whose printed values agree with the evaluated equation and classifies it. The result is `src/data/nist-cryogenic/bradley-verification.json`; a test recomputes it.
- **Not independent data:** the same equations evaluated by NIST. This checks transcription and interpretation, not the physics.
- **Results (128 models):**

  | Status | Count | Meaning |
  |---|---|---|
  | exact | 84 | Every compared cell matches to the printed precision |
  | agrees | 22 | Within 0.1 % (of value; of total contraction for linear expansion), consistent with coefficient rounding between page and tables |
  | differs | 6 | See below |
  | not tabulated | 16 | Balsa, beechwood/phenolic, glass fabric/polyester, glass mat/epoxy, copper k at RRR 150 and 500. Rests on the page alone |

- **Every linear-expansion and CTE model used by the thermal calculator is exact, agrees, or is not tabulated.**
- **Models that differ** (none is used by a calculator yet; each must be resolved or labeled before use):
  - **Apiezon N specific heat, copper specific heat, polyamide specific heat, G-10 normal-direction conductivity.** These differ systematically, growing with temperature to 0.55 %, 1.4 %, 3.9 %, and 2.2 % at the top of the range. That pattern is consistent with different fit revisions on the page and in the tables, not with a transcription error. For example, the page fit gives copper 389.4 J/(kg·K) at 300 K, while the tables give 384.0. Both are within the page's stated 5 % fit error.
  - **304 specific heat:** no table column agrees within 0.1 %. The tables print 1.849 J/(kg·K) at 4 K; the page fit gives 2.066.
  - **310 specific heat:** the high-range fit (47–300 K) matches exactly. The page's low-range fit (4–47 K) differs from the tables by up to 13 %, and at its own 47 K boundary it gives 99.8 J/(kg·K) against the high-range fit's 87.1, a 15 % jump. The low-range page coefficients look internally inconsistent (Q-006).
- **Documented anomalies in the tables.** These are handled explicitly and do not loosen tolerances:
  - **Beryllium expansion** columns are printed in percent although the header says 10⁻⁵.
  - **Silicon CTE** values are offset from their temperature column: one row late from 2 K to 100 K, then T − 10 K from 120 K up. Matched values agree within 0.05 %.
  - **Below T_low,** the tables print the polynomial instead of the page's constant f in the aluminum (3003/5083/6061 share one curve), stainless steel, and Ti-6Al-4V columns. One aluminum column is blank there instead. **The app follows the page**, which states y = f below T_low (D-013).
  - **6061-T6 at 180 K:** −241.5 is printed where the coefficients give −241.5508.
  - **Polystyrene foam headers** read "12.66" and "6.07 kg m⁻³", but the values match the page's 31.88 and 60.07 kg/m³ fits.
  - **Column-header names** cannot be tied to text positions reliably. Several materials share identical equations (304/304L/310/316 expansion and conductivity, the four nickel steels, Al 3003/5083/6061), so a match verifies values, not header placement.

### S-NBS-MONO-29 — measured contraction (independent benchmarks)

- **Title:** R. J. Corruccini and J. J. Gniewek, *Thermal Expansion of Technical Solids at Low Temperatures: A Compilation from the Literature*, NBS Monograph 29 (1961)
- **URL / DOI:** https://nvlpubs.nist.gov/nistpubs/Legacy/MONO/nbsmonograph29.pdf, doi:10.6028/NBS.MONO.29
- **Retrieved:** 2026-10-22. Table 2.1, "Elements": aluminum, copper, and silicon columns, `10⁵·(L293 − LT)/L293`. The source sign is positive for contraction.
- **Transcription:** from the PDF's OCR text layer; page images could not be rendered in this environment (**visual verification pending**, Q-004). Grüneisen-estimated values (marked "a") are excluded, as is aluminum 240 K (ambiguous OCR "lis").
- **Benchmarks:**
  - **TE-B2:** aluminum vs. the 6061-T6 model. A material proxy: 6061 itself is not tabulated.
  - **TE-B6 (copper):** integrated NIST CTE agrees within 0.72×10⁻⁵ from 20 to 300 K, about 0.2 % of the 326×10⁻⁵ total contraction.
  - **TE-B6 (silicon):** agrees within 0.43×10⁻⁵ from 40 to 300 K, including the contraction maximum near 120 K.
- **Permissions:** U.S. Government work.

## Starting source list (from the brief) — status

| Source | Module | Status |
|---|---|---|
| Guhring, *Tap Tolerances and Approximate Limits* | Machining threads | not retrieved |
| ASME B1.1 (2024 preview) | Threads | not retrieved; full standard is licensed |
| ISO 965-1/-2/-6 | Metric thread limits | not retrieved; licensed |
| ASME B4.1 | Inch fits | not retrieved; licensed |
| ISO 286-1/-2 | Metric fits | not retrieved; licensed |
| ASME B18.2.8 | Clearance holes | not retrieved; licensed |
| ASME B18.3 | Inch socket screws | not retrieved; licensed |
| ISO 4762, ISO 12474, ISO 7380-1 | Metric SHCS / fine / button head | not retrieved; licensed |
| NIST cryogenic materials index | Thermal / heat flow | **all 43 entries transcribed and verified** (2026-10-23) |
| NASA RP-1228 | Torque/preload | not retrieved |
| Stanley Heli-Coil catalog HC2000 rev 12 | Helical inserts | not retrieved |
| Böllhoff HELICOIL installation | Helical inserts | not retrieved |
| SPIROL press-fit hole preparation | Pin/slot | not retrieved |
| ASME Y14.5 | GD&T | not retrieved; licensed |
| Ensinger TECAPEEK CMF white | Materials | product example from brief; re-verify at implementation |
| ASTM E140, CDA C93200, DuPont Vespel, Victrex PEEK | Materials | not retrieved |

**Distribution note:** ASME and ISO tables are copyrighted. Before incorporating their tabulated values, decide how licensed content may be redistributed in a public repository/site (open question Q-001).
