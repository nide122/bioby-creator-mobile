#!/usr/bin/env python3
"""Merge batch-add-en-*.json / batch-add-zh-*.json into locales/*.json (before account block)."""

from __future__ import annotations

import json
from pathlib import Path

LOCALES = Path(__file__).resolve().parents[1] / "src" / "i18n" / "locales"


def merge(locale_name: str, pattern: str) -> None:
    path = LOCALES / locale_name
    data = json.loads(path.read_text(encoding="utf-8"))
    account = data.pop("account")
    batches = sorted(LOCALES.glob(pattern))
    if not batches:
        raise SystemExit(f"No files matched {pattern}")
    for bf in batches:
        chunk = json.loads(bf.read_text(encoding="utf-8"))
        overlap = set(data) & set(chunk)
        if overlap:
            raise SystemExit(f"{locale_name}: keys already exist: {sorted(overlap)}")
        data.update(chunk)
    data["account"] = account
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for bf in batches:
        bf.unlink()


if __name__ == "__main__":
    merge("en.json", "batch-add-en-*.json")
    merge("zh.json", "batch-add-zh-*.json")
    print("merged OK")
