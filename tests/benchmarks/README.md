# Benchmarks

Independent or source-derived cases. Matching the app's formula against itself does not count as validation. See `docs/ENGINEERING_METHODS.md` → Validation for the full table, and `docs/DATA_SOURCES.md` for provenance.

| ID | File | What it checks |
|---|---|---|
| TE-B1 | `data/nist-bradley-radebaugh-6061.json` | NIST's own evaluated table for 6061 (18–300 K). Checks coefficient transcription, ×10⁻⁵ scaling, and breakpoint |
| TE-B2 | `data/nbs-monograph-29-aluminum.json` | Measured pure-Al contraction vs. the 6061-T6 model (material proxy, 4 % fit error + table resolution) |
| TE-B3 | `data/exact-rational-6061.json` | Exact-rational Python re-implementation of the NIST equation and the ratio method |
| TE-B4 | `thermal-constant-cte.test.ts` | Hand-worked constant-CTE cases (SI and inch/°F, both conventions) |

## Regenerating TE-B3

```python
from fractions import Fraction as F
a, b, c, d = F("-412.77"), F("-0.30389"), F("0.0087696"), F("-0.0000099821")
f, t_low = F("-415.45"), 18

def y(T):
    T = F(T)
    return f if T < t_low else a + b*T + c*T**2 + d*T**3

def final_length(Li, Ti, Tf):
    ei, ef = y(Ti) / 10**5, y(Tf) / 10**5
    return Li * (1 + ef) / (1 + ei)

for Ti, Tf in [("293.15", 77), ("293.15", 4), (293, 4), (77, "293.15"), (300, 4), (4, 300), (20, 293)]:
    Lf = final_length(F(1000), F(Ti), F(Tf))
    print(Ti, Tf, f"{float(Lf):.9f}", f"{float(Lf - 1000):.9f}")
```
