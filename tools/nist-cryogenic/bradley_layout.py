"""Extract the numeric table rows of NIST's "Properties of Selected Materials at
Cryogenic Temperatures" (Bradley & Radebaugh) with their horizontal positions.

    python -I tools/nist-cryogenic/bradley_layout.py

Writes tests/benchmarks/data/bradley-radebaugh-layout.json. Each row keeps the
temperature and every numeric token with its character-column centre, so the
benchmark test can identify a table column by position instead of by order
(blank cells would otherwise shift columns).

Requires pypdf (tested with 6.x): pip install pypdf
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import pypdf

ROOT = Path(__file__).resolve().parents[2]
PDF = ROOT / "data-sources/nist-bradley-radebaugh/properties-of-selected-materials-at-cryogenic-temperatures.pdf"
OUT = ROOT / "tests/benchmarks/data/bradley-radebaugh-layout.json"

# 1-based page numbers holding property tables, with the quantity tabulated.
PAGES = {
    5: "thermal-conductivity", 6: "thermal-conductivity", 7: "thermal-conductivity",
    8: "specific-heat", 9: "specific-heat",
    10: "linear-expansion", 11: "linear-expansion", 12: "linear-expansion",
    13: "expansion-coefficient",
    14: "youngs-modulus",
}
NUMBER = re.compile(r"^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$")


def main() -> None:
    reader = pypdf.PdfReader(str(PDF))
    pages = []
    for number, quantity in PAGES.items():
        text = reader.pages[number - 1].extract_text(extraction_mode="layout")
        heading = next(line.strip() for line in text.splitlines() if line.strip())
        rows = []
        for line in text.splitlines():
            if not re.match(r"^\s*\d+(\.\d+)?\s{2,}\S", line):
                continue
            tokens = [(m.start(), m.end(), m.group()) for m in re.finditer(r"\S+", line)]
            if not all(NUMBER.match(t[2]) for t in tokens):
                continue
            rows.append({
                "T": float(tokens[0][2]),
                "cells": [{"x": (s + e) / 2, "text": t} for s, e, t in tokens[1:]],
            })
        pages.append({"page": number, "quantity": quantity, "heading": heading, "rows": rows})
    out = {
        "source": "P. E. Bradley and R. Radebaugh, Properties of Selected Materials at Cryogenic Temperatures, NIST",
        "url": "https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=913059",
        "pdfSha256": hashlib.sha256(PDF.read_bytes()).hexdigest(),
        "extractedWith": f"pypdf {pypdf.__version__}, layout mode",
        "pages": pages,
    }
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {OUT.relative_to(ROOT)}: {sum(len(p['rows']) for p in pages)} rows")


if __name__ == "__main__":
    sys.exit(main())
