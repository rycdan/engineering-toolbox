# Data Sources

Every dataset value used at runtime is stored locally in versioned files under `src/data/`. The app never scrapes live websites. This file records where each value came from, how it was transcribed, and any unresolved provenance.

Dataset version: **`2026.10.0`** (see `src/data/version.ts`). Increment it when any runtime value changes. Older model revisions stay in the dataset so saved results can be reproduced.

## Sources in use

### S-NIST-6061-T6

- **Title:** NIST Cryogenic Material Properties — 6061-T6 Aluminum (UNS A96061)
- **URL:** https://trc.nist.gov/cryogenics/materials/6061%20Aluminum/6061_T6Aluminum_rev.htm
- **Retrieved:** 2026-10-22 (raw HTML downloaded; coefficients copied from the "Linear expansion" column of the second table)
- **Values used:** a = −4.1277E2, b = −3.0389E−1, c = 8.7696E−3, d = −9.9821E−6, e = 0, T_low = 18 K, f = −415.45. Units `[(L−L293)/L293] × 10⁵`. Data range 4–300 K, equation range 4–300 K, curve-fit error 4 % relative to data.
- **Transcription check:** the polynomial was re-evaluated with exact rationals and compared with NIST's published evaluated table (S-NIST-BRADLEY) at all 20 tabulated points from 18 K to 300 K. Nineteen points round exactly to the printed value. At 180 K the table prints −241.5, while the coefficients give −241.5508, which would round to −241.6. The 0.0008×10⁻⁵ excess (8×10⁻⁹ strain) is attributed to the table's own evaluation and is allowed explicitly in benchmark TE-B1. A coefficient transcription error would affect many points, not one.
- **Underlying data:** the NIST reference page (`references.htm#al6061`) lists sources for 6061 thermal conductivity, specific heat, and Young's modulus but **does not name the source of the linear-expansion data**. Open question Q-003.
- **Permissions:** U.S. Government work (NIST). Numeric coefficients are facts reproduced with attribution.

### S-NIST-BRADLEY

- **Title:** P. E. Bradley and R. Radebaugh, *Properties of Selected Materials at Cryogenic Temperatures*, NIST (tables computed from the NIST material-property equations)
- **URL:** https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=913059
- **Retrieved:** 2026-10-22. Text-native PDF, page 10, "Linear Thermal Expansion (in 10⁻⁵)", Al 6061 column.
- **Use:** benchmark TE-B1 (source-computed evaluation of the same equation). It is not independent measured data. It also documents NIST's handling below 18 K (6061 column blank below 18 K, while 3003/5083 continue the polynomial).
- **Also cited for:** fit error vs. experimental uncertainty (2–5 %) and sample-to-sample variation (page 1).

### S-NBS-MONO-29

- **Title:** R. J. Corruccini and J. J. Gniewek, *Thermal Expansion of Technical Solids at Low Temperatures: A Compilation from the Literature*, NBS Monograph 29 (1961)
- **URL / DOI:** https://nvlpubs.nist.gov/nistpubs/Legacy/MONO/nbsmonograph29.pdf, doi:10.6028/NBS.MONO.29
- **Retrieved:** 2026-10-22. Table 2.1, "Elements", aluminum column: `10⁵·(L293 − LT)/L293` at 0–300 K. The source sign is positive for contraction, so the app's convention uses the negation.
- **Transcription:** taken from the PDF's OCR text layer, because embedded page images could not be rendered in this environment. The values used (20–220 K in 10–20 K steps, then 260, 273, 280, 293, 300 K) form a monotonic sequence and agree with the NIST 6061-T6 fit within 1.5 %. 240 K is excluded because its OCR text ("lis") is ambiguous. **Visual verification against the scanned table is still pending** (Q-004). Values marked "estimated" in the source (≤ 10 K) are excluded.
- **Applicability:** pure aluminum, not 6061-T6. Monograph 29 does not tabulate 6061. Its Table 3.2 lists 2024-T4 and 7075-T6 at 116/144/200 K, but the OCR of that table is too scrambled to use without visual verification. TE-B2 is therefore a **material-proxy** check, not a 6061 acceptance test.
- **Permissions:** U.S. Government work.

## Starting source list (from the brief) — status

None of these have been transcribed into the dataset yet. Retrieve exact editions and pages during each module's iteration.

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
| NIST cryogenic materials index | Thermal / heat flow | 6061-T6 expansion used; others pending |
| NASA RP-1228 | Torque/preload | not retrieved |
| Stanley Heli-Coil catalog HC2000 rev 12 | Helical inserts | not retrieved |
| Böllhoff HELICOIL installation | Helical inserts | not retrieved |
| SPIROL press-fit hole preparation | Pin/slot | not retrieved |
| ASME Y14.5 | GD&T | not retrieved; licensed |
| Ensinger TECAPEEK CMF white | Materials | product example from brief; re-verify at implementation |
| ASTM E140, CDA C93200, DuPont Vespel, Victrex PEEK | Materials | not retrieved |

**Distribution note:** ASME and ISO tables are copyrighted. Before incorporating their tabulated values, decide how licensed content may be redistributed in a public repository/site (open question Q-001).
