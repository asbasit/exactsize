#!/usr/bin/env python3
"""Validate the ExactSize passportRules.json structure without third-party packages."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any

STATUSES = {"specified", "notSpecified", "notApplicable", "pathwayDependent"}


def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def default_data_path() -> Path | None:
    here = Path.cwd().resolve()
    for parent in (here, *here.parents):
        for relative in (
            Path("sites/exactsize/src/data/passportRules.json"),
            Path("src/data/passportRules.json"),
        ):
            candidate = parent / relative
            if candidate.is_file():
                return candidate
    return None


def is_iso_date(value: Any) -> bool:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def validate(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError) as exc:
        return [f"Could not parse {path}: {exc}"]

    def require(condition: bool, message: str) -> None:
        if not condition:
            errors.append(message)

    require(isinstance(data, dict), "root must be a JSON object")
    if not isinstance(data, dict):
        return errors

    meta = data.get("_meta")
    require(isinstance(meta, dict), "_meta must be an object")
    if isinstance(meta, dict):
        require(isinstance(meta.get("schemaVersion"), int) and meta["schemaVersion"] > 0,
                "_meta.schemaVersion must be a positive integer")
        require(is_iso_date(meta.get("lastVerified")), "_meta.lastVerified must be a valid YYYY-MM-DD date")
        statuses = meta.get("ruleStatuses")
        require(isinstance(statuses, list) and set(statuses) == STATUSES,
                f"_meta.ruleStatuses must contain exactly {sorted(STATUSES)}")

    sources = data.get("sources")
    require(isinstance(sources, list) and len(sources) > 0, "sources must be a non-empty array")
    source_ids: set[str] = set()
    if isinstance(sources, list):
        for i, source in enumerate(sources):
            prefix = f"sources[{i}]"
            if not isinstance(source, dict):
                errors.append(f"{prefix} must be an object")
                continue
            source_id = source.get("id")
            require(isinstance(source_id, str) and bool(source_id), f"{prefix}.id must be a non-empty string")
            if isinstance(source_id, str):
                require(source_id not in source_ids, f"duplicate source id: {source_id}")
                source_ids.add(source_id)
            require(isinstance(source.get("title"), str) and bool(source["title"].strip()),
                    f"{prefix}.title must be a non-empty string")
            url = source.get("url")
            require(isinstance(url, str) and url.startswith("https://"), f"{prefix}.url must be HTTPS")
            require(is_iso_date(source.get("checkedOn")), f"{prefix}.checkedOn must be a valid YYYY-MM-DD date")

    countries = data.get("countries")
    require(isinstance(countries, list) and len(countries) > 0, "countries must be a non-empty array")
    codes: set[str] = set()
    if isinstance(countries, list):
        for ci, country in enumerate(countries):
            prefix = f"countries[{ci}]"
            if not isinstance(country, dict):
                errors.append(f"{prefix} must be an object")
                continue
            code = country.get("code")
            require(isinstance(code, str) and re.fullmatch(r"[A-Z]{2}", code) is not None,
                    f"{prefix}.code must be an uppercase two-letter code")
            if isinstance(code, str):
                require(code not in codes, f"duplicate country code: {code}")
                codes.add(code)
            require(isinstance(country.get("name"), str) and bool(country["name"].strip()),
                    f"{prefix}.name must be a non-empty string")
            modes = country.get("modes")
            require(isinstance(modes, list) and len(modes) > 0, f"{prefix}.modes must be a non-empty array")
            mode_ids: set[str] = set()
            if not isinstance(modes, list):
                continue
            for mi, mode in enumerate(modes):
                mp = f"{prefix}.modes[{mi}]"
                if not isinstance(mode, dict):
                    errors.append(f"{mp} must be an object")
                    continue
                mode_id = mode.get("id")
                require(isinstance(mode_id, str) and re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", mode_id) is not None,
                        f"{mp}.id must be kebab-case")
                if isinstance(mode_id, str):
                    require(mode_id not in mode_ids, f"duplicate mode id in {code}: {mode_id}")
                    mode_ids.add(mode_id)
                require(isinstance(mode.get("label"), str) and bool(mode["label"].strip()),
                        f"{mp}.label must be a non-empty string")
                source_refs = mode.get("sourceIds")
                require(isinstance(source_refs, list) and len(source_refs) > 0,
                        f"{mp}.sourceIds must be a non-empty array")
                if isinstance(source_refs, list):
                    for source_ref in source_refs:
                        require(source_ref in source_ids, f"{mp} references unknown source id {source_ref!r}")
                for field in ("physicalPrint", "digitalUpload"):
                    record = mode.get(field)
                    require(isinstance(record, dict), f"{mp}.{field} must be an object")
                    if isinstance(record, dict):
                        require(record.get("status") in STATUSES, f"{mp}.{field}.status is invalid or missing")

                def check_nested_statuses(value: Any, location: str) -> None:
                    if isinstance(value, dict):
                        if "status" in value:
                            require(value["status"] in STATUSES, f"{location}.status has invalid value {value['status']!r}")
                        for key, child in value.items():
                            check_nested_statuses(child, f"{location}.{key}")
                    elif isinstance(value, list):
                        for index, child in enumerate(value):
                            check_nested_statuses(child, f"{location}[{index}]")

                check_nested_statuses(mode, mp)

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", nargs="?", help="Path to passportRules.json; auto-discovered from the current directory if omitted")
    args = parser.parse_args()
    path = Path(args.path).expanduser() if args.path else default_data_path()
    if path is None:
        print("ERROR: passportRules.json not found. Pass its path explicitly or run from the project tree.", file=sys.stderr)
        return 2
    path = path.resolve()
    errors = validate(path)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"FAILED: {len(errors)} issue(s) in {path}", file=sys.stderr)
        return 1
    print(f"PASS: passport rules data is valid: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
