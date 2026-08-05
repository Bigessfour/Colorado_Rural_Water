#!/usr/bin/env python3
"""Split monolithic 24mo customer CSVs into ~6-month chunks for safer ingest."""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path

CHUNKS = [
    ("2024-08", "2024-12", "2024H2"),
    ("2025-01", "2025-06", "2025H1"),
    ("2025-07", "2025-12", "2025H2"),
    ("2026-01", "2026-07", "2026H1"),
]

DATE_COLS = ("Reading Date", "read_dt", "Read Date", "Date", "read dt")


def ym(date_str: str) -> str | None:
    """Return YYYY-MM or None if unparseable (intentional bad rows stay out of chunks)."""
    s = (date_str or "").strip()
    if not s:
        return None
    # ISO-ish: 2024-08-12 or 2024/08/12
    m = re.match(r"^(\d{4})[-/](\d{1,2})([-/]\d{1,2})?", s)
    if m:
        return f"{int(m.group(1)):04d}-{int(m.group(2)):02d}"
    # US: M/D/YYYY or M/D/YY
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$", s)
    if m:
        month, _day, year = m.group(1), m.group(2), m.group(3)
        y = int(year) if len(year) == 4 else 2000 + int(year)
        return f"{y:04d}-{int(month):02d}"
    return None


def split_one(src: Path, messy: bool) -> None:
    with src.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        date_col = next((c for c in fieldnames if c in DATE_COLS), None)
        if not date_col:
            raise SystemExit(f"No date column in {src}: {fieldnames}")
        buckets = {label: [] for _, _, label in CHUNKS}
        skipped = 0
        for row in reader:
            month = ym(row.get(date_col, ""))
            if month is None:
                skipped += 1
                continue
            placed = False
            for start, end, label in CHUNKS:
                if start <= month <= end:
                    buckets[label].append(row)
                    placed = True
                    break
            if not placed:
                skipped += 1
    meter_col = next(
        (
            c
            for c in fieldnames
            if c.lower() in ("meter id", "meter_id", "meter #", "meter")
        ),
        fieldnames[0],
    )
    prefix = "customer_readings_MESSY" if messy else "customer_readings"
    for start, end, label in CHUNKS:
        rows = buckets[label]
        rows.sort(key=lambda r: (r.get(meter_col, ""), r.get(date_col, "")))
        dest = src.parent / f"{prefix}_{label}.csv"
        with dest.open("w", newline="", encoding="utf-8") as out:
            w = csv.DictWriter(out, fieldnames=fieldnames, extrasaction="ignore")
            w.writeheader()
            w.writerows(rows)
        print(
            f"{dest.name}: {len(rows)} rows ({dest.stat().st_size / 1024:.1f} KiB) [{start}..{end}]"
        )
    if skipped:
        print(
            f"  (skipped {skipped} row(s) with bad/out-of-range dates — expected on MESSY)"
        )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dir", type=Path, default=Path(__file__).resolve().parent)
    args = ap.parse_args()
    split_one(args.dir / "customer_readings_24mo.csv", messy=False)
    messy = args.dir / "customer_readings_24mo_MESSY.csv"
    if messy.exists():
        split_one(messy, messy=True)


if __name__ == "__main__":
    main()
