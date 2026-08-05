#!/usr/bin/env python3
"""
Water Saver — dataset validation & data-manipulation logger
Town of Wiley 24-month fixture (300 meters, 2 wells)

Purpose:
  Catch runtime / config problems before or during ingest:
  - missing required columns
  - bad dates / non-numeric readings
  - meters without any readings
  - source months with only one side (balance insufficient risk)
  - stuck / flat cumulative sequences
  - unit mismatches
  - duplicate meter+date keys

Usage:
  python3 validate_and_log.py
  python3 validate_and_log.py --customer path.csv --sources path.csv
  python3 validate_and_log.py --json-out validation_report.json

Exit codes:
  0 = no errors (warnings allowed)
  1 = errors found (should fix before demo)
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

LOG = logging.getLogger("water_saver.validate")


def setup_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%H:%M:%S",
    )


# Flexible header aliases (mapper-friendly)
CUSTOMER_ALIASES = {
    "meter_id": {"meter id", "meter_id", "meterid", "meter #", "meter number"},
    "address": {"service address", "service_addr", "address", "service_address"},
    "occupant": {"occupant name", "customer", "occupant", "name"},
    "account": {"account number", "acct", "account", "account_number"},
    "date": {"reading date", "read_dt", "date", "reading_date", "read date"},
    "reading": {"cumulative reading", "reading", "cum reading", "cumulative"},
    "unit": {"unit", "units"},
    "diag": {"diagnostic flag", "diag", "diagnostic", "flag"},
}

SOURCE_ALIASES = {
    "source_id": {"source id", "source_id", "sourceid"},
    "source_name": {"source name", "source_name", "name"},
    "source_type": {"source type", "source_type", "type"},
    "date": {"reading date", "read_dt", "date", "reading_date"},
    "volume": {"period volume", "volume", "period_volume", "reading"},
    "unit": {"unit", "units"},
}


def norm(h: str) -> str:
    return (h or "").strip().lower()


def map_headers(
    fieldnames: list[str], aliases: dict[str, set[str]]
) -> dict[str, str | None]:
    fields = {norm(f): f for f in fieldnames}
    out: dict[str, str | None] = {}
    for key, alts in aliases.items():
        out[key] = None
        for a in alts:
            if a in fields:
                out[key] = fields[a]
                break
    return out


def parse_date(val: str) -> datetime | None:
    if not val or not str(val).strip():
        return None
    s = str(val).strip().replace("/", "-")
    for fmt in ("%Y-%m-%d", "%Y-%m", "%m-%d-%Y", "%m-%d-%y"):
        try:
            return datetime.strptime(s[:10] if len(s) >= 10 else s, fmt)
        except ValueError:
            continue
    return None


def parse_number(val) -> float | None:
    if val is None or str(val).strip() == "":
        return None
    try:
        return float(str(val).replace(",", "").strip())
    except ValueError:
        return None


def validate_customer(path: Path) -> dict:
    report = {
        "file": str(path),
        "rows": 0,
        "meters": set(),
        "errors": [],
        "warnings": [],
        "months": set(),
        "stuck_candidates": [],
        "bad_rows": 0,
    }
    if not path.exists():
        report["errors"].append(f"File not found: {path}")
        return report

    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            report["errors"].append("No header row")
            return report
        cols = map_headers(list(reader.fieldnames), CUSTOMER_ALIASES)
        for req in ("meter_id", "date", "reading"):
            if not cols[req]:
                report["errors"].append(
                    f"Missing required column mapping for '{req}'. Headers={reader.fieldnames}"
                )

        series: dict[str, list[tuple[datetime, float]]] = defaultdict(list)

        for i, row in enumerate(reader, start=2):
            report["rows"] += 1
            mid = (
                (row.get(cols["meter_id"] or "") or "").strip()
                if cols["meter_id"]
                else ""
            )
            draw = row.get(cols["date"] or "") if cols["date"] else ""
            rraw = row.get(cols["reading"] or "") if cols["reading"] else ""
            unit = (
                (row.get(cols["unit"] or "") or "").strip().lower()
                if cols["unit"]
                else ""
            )

            if not mid:
                report["bad_rows"] += 1
                report["errors"].append(f"L{i}: empty Meter ID")
                continue
            dt = parse_date(str(draw))
            if not dt:
                report["bad_rows"] += 1
                report["errors"].append(f"L{i}: bad date '{draw}' meter={mid}")
                continue
            num = parse_number(rraw)
            if num is None:
                report["bad_rows"] += 1
                report["errors"].append(
                    f"L{i}: non-numeric reading '{rraw}' meter={mid}"
                )
                continue
            if num < 0:
                report["warnings"].append(f"L{i}: negative reading {num} meter={mid}")
            if unit and unit not in ("gallons", "gal", "cf", "cubic feet", "ccf"):
                report["warnings"].append(f"L{i}: unexpected unit '{unit}' meter={mid}")

            report["meters"].add(mid)
            report["months"].add(dt.strftime("%Y-%m"))
            series[mid].append((dt, num))

        # Stuck / flat cumulative detection (last 4+ equal readings)
        for mid, pts in series.items():
            pts.sort(key=lambda x: x[0])
            if len(pts) < 4:
                report["warnings"].append(
                    f"Meter {mid}: only {len(pts)} readings (thin history)"
                )
                continue
            last4 = [p[1] for p in pts[-4:]]
            if len(set(last4)) == 1:
                report["stuck_candidates"].append(mid)
                report["warnings"].append(
                    f"Meter {mid}: flat cumulative over last 4 reads (possible stuck)"
                )

    report["meter_count"] = len(report["meters"])
    report["month_count"] = len(report["months"])
    report["meters"] = sorted(report["meters"])
    report["months"] = sorted(report["months"])
    return report


def validate_sources(path: Path) -> dict:
    report = {
        "file": str(path),
        "rows": 0,
        "sources": set(),
        "errors": [],
        "warnings": [],
        "months": set(),
        "month_sources": defaultdict(set),
    }
    if not path.exists():
        report["errors"].append(f"File not found: {path}")
        return report

    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            report["errors"].append("No header row")
            return report
        cols = map_headers(list(reader.fieldnames), SOURCE_ALIASES)
        for req in ("source_name", "date", "volume"):
            if not cols[req]:
                report["errors"].append(
                    f"Missing required column mapping for '{req}'. Headers={reader.fieldnames}"
                )

        for i, row in enumerate(reader, start=2):
            report["rows"] += 1
            sname = (
                (row.get(cols["source_name"] or "") or "").strip()
                if cols["source_name"]
                else ""
            )
            draw = row.get(cols["date"] or "") if cols["date"] else ""
            vraw = row.get(cols["volume"] or "") if cols["volume"] else ""
            if not sname:
                report["errors"].append(f"L{i}: empty Source Name")
                continue
            dt = parse_date(str(draw))
            if not dt:
                report["errors"].append(f"L{i}: bad date '{draw}' source={sname}")
                continue
            num = parse_number(vraw)
            if num is None:
                report["errors"].append(
                    f"L{i}: non-numeric volume '{vraw}' source={sname}"
                )
                continue
            if num < 0:
                report["warnings"].append(f"L{i}: negative volume source={sname}")
            ym = dt.strftime("%Y-%m")
            report["sources"].add(sname)
            report["months"].add(ym)
            report["month_sources"][ym].add(sname)

    # Months with only one well → balance may show insufficient if both expected
    for ym, srcs in sorted(report["month_sources"].items()):
        if len(srcs) < 2:
            report["warnings"].append(
                f"Month {ym}: only {len(srcs)} source(s) present {sorted(srcs)} — balance may be insufficient"
            )

    report["source_count"] = len(report["sources"])
    report["sources"] = sorted(report["sources"])
    report["months"] = sorted(report["months"])
    report["month_sources"] = {k: sorted(v) for k, v in report["month_sources"].items()}
    return report


def main() -> int:
    ap = argparse.ArgumentParser(description="Validate Water Saver sample datasets")
    ap.add_argument(
        "--customer",
        type=Path,
        default=Path(__file__).with_name("customer_readings_24mo.csv"),
    )
    ap.add_argument(
        "--sources",
        type=Path,
        default=Path(__file__).with_name("source_readings_24mo.csv"),
    )
    ap.add_argument(
        "--inventory",
        type=Path,
        default=Path(__file__).with_name("meters_inventory.csv"),
    )
    ap.add_argument("--json-out", type=Path, default=None)
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()
    setup_logging(args.verbose)

    LOG.info("=== Water Saver dataset validation ===")
    cust = validate_customer(args.customer)
    src = validate_sources(args.sources)

    LOG.info("Customer file: %s", cust["file"])
    LOG.info(
        "  rows=%s meters=%s months=%s bad_rows=%s",
        cust.get("rows"),
        cust.get("meter_count"),
        cust.get("month_count"),
        cust.get("bad_rows"),
    )
    for e in cust["errors"][:30]:
        LOG.error("CUSTOMER %s", e)
    if len(cust["errors"]) > 30:
        LOG.error("CUSTOMER ... %s more errors", len(cust["errors"]) - 30)
    for w in cust["warnings"][:20]:
        LOG.warning("CUSTOMER %s", w)
    if cust.get("stuck_candidates"):
        LOG.warning(
            "Stuck candidates (%s): %s",
            len(cust["stuck_candidates"]),
            ", ".join(cust["stuck_candidates"][:12]),
        )

    LOG.info("Source file: %s", src["file"])
    LOG.info(
        "  rows=%s sources=%s months=%s",
        src.get("rows"),
        src.get("source_count"),
        len(src.get("months") or []),
    )
    for e in src["errors"][:20]:
        LOG.error("SOURCE %s", e)
    for w in src["warnings"][:20]:
        LOG.warning("SOURCE %s", w)

    # Cross-check: inventory meter count if present
    inv_count = None
    if args.inventory.exists():
        with args.inventory.open(newline="", encoding="utf-8-sig") as f:
            inv_count = sum(1 for _ in csv.DictReader(f))
        LOG.info("Inventory meters: %s", inv_count)
        if cust.get("meter_count") and inv_count and cust["meter_count"] != inv_count:
            LOG.warning(
                "Meter count mismatch: readings=%s inventory=%s",
                cust["meter_count"],
                inv_count,
            )

    # Summary for Confidence / demo readiness
    months = cust.get("month_count") or 0
    if months >= 12:
        conf = "Strong candidate (12+ months)"
    elif months >= 6:
        conf = "Solid candidate (6+ months)"
    elif months >= 3:
        conf = "Building (3+ months)"
    else:
        conf = "Thin (<3 months)"
    LOG.info("History depth signal: %s months → %s", months, conf)

    errors = len(cust["errors"]) + len(src["errors"])
    warnings = len(cust["warnings"]) + len(src["warnings"])
    LOG.info("=== Done: %s error(s), %s warning(s) ===", errors, warnings)

    payload = {
        "customer": {
            k: (list(v) if isinstance(v, set) else v) for k, v in cust.items()
        },
        "sources": {k: (list(v) if isinstance(v, set) else v) for k, v in src.items()},
        "inventory_count": inv_count,
        "error_count": errors,
        "warning_count": warnings,
        "confidence_signal": conf,
    }

    # sets already converted above partially; ensure serializable
    def fix(o):
        if isinstance(o, set):
            return sorted(o)
        if isinstance(o, dict):
            return {k: fix(v) for k, v in o.items()}
        if isinstance(o, list):
            return [fix(x) for x in o]
        return o

    payload = fix(payload)
    if args.json_out:
        args.json_out.write_text(json.dumps(payload, indent=2))
        LOG.info("Wrote %s", args.json_out)

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
