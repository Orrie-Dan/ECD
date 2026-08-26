"""Parse ECD Standard Question Draft.xlsx (Survey123 XLSForm) into checklist JSON."""
from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_XLSX = ROOT / "docs" / "ECD Standard Question Draft.xlsx"
OUT_PATH = ROOT / "src" / "features" / "self-evaluation" / "data" / "checklists.generated.json"

FACILITY_RELEVANT = {
    "daycare": r"\$\{facility_type\}='daycare'",
    "ecd_3_5": r"\$\{facility_type\}='ecd_3_5'",
}

RANKS = [
    {"id": "green", "minPercent": 90, "maxPercent": 100, "labelRw": "Icyatsi (90%-100%)"},
    {"id": "blue", "minPercent": 70, "maxPercent": 89, "labelRw": "Ubururu (70%-89%)"},
    {"id": "yellow", "minPercent": 50, "maxPercent": 69, "labelRw": "Umuhondo (50%-69%)"},
    {"id": "red", "minPercent": 0, "maxPercent": 49, "labelRw": "Utukura (munsi ya 50%)"},
]


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")[:64]


def merge_bilingual(english: str, rw: str) -> str:
    en = english.strip()
    rw = rw.strip()
    if not rw or rw == "nan":
        return en
    return f"{en} / {rw}"


def find_rw_column(columns: list[str]) -> str | None:
    for col in columns:
        if col in ("label_rw", "label::language (rw)") or "language (rw)" in str(col).lower():
            return col
    return None


def parse_facility_type(survey: pd.DataFrame, facility_id: str, title: str) -> dict:
    pattern = FACILITY_RELEVANT[facility_id]
    rw_col = find_rw_column(list(survey.columns))
    sections: list[dict] = []
    current_section: dict | None = None
    item_number = 0

    for _, row in survey.iterrows():
        row_type = str(row.get("type") or "").strip()
        name = str(row.get("name") or "").strip()
        label = str(row.get("label") or "").strip()
        relevant = str(row.get("relevant") or "").strip()
        label_rw = str(row.get(rw_col) or "").strip() if rw_col else ""

        if row_type == "begin_group" and re.search(pattern, relevant):
            sec_id = name if name else slug(label)
            current_section = {
                "id": sec_id,
                "title": merge_bilingual(label, label_rw),
                "subtotalMax": None,
                "items": [],
            }
            sections.append(current_section)
            item_number = 0
            continue

        if row_type == "end_group":
            current_section = None
            continue

        if row_type != "select_one yes_no" or not re.search(pattern, relevant):
            continue

        if current_section is None:
            continue

        item_number += 1
        item_id = name if name else f"{facility_id}-{sec_id}-{item_number}"
        current_section["items"].append(
            {
                "id": item_id,
                "number": item_number,
                "text": merge_bilingual(label, label_rw),
                "maxScore": 1,
                "indicators": [],
            }
        )

    computed = sum(item["maxScore"] for sec in sections for item in sec["items"])

    return {
        "id": facility_id,
        "title": title,
        "version": "2024.1",
        "grandTotalMax": None,
        "computedMaxScore": computed,
        "sectionCount": len(sections),
        "itemCount": sum(len(s["items"]) for s in sections),
        "sections": sections,
    }


def main() -> None:
    xlsx_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    if not xlsx_path.exists():
        raise SystemExit(f"XLSX not found: {xlsx_path}")

    survey = pd.read_excel(xlsx_path, sheet_name="survey")
    choices = pd.read_excel(xlsx_path, sheet_name="choices")
    settings = pd.read_excel(xlsx_path, sheet_name="settings")

    facility_choices = choices[choices["list_name"] == "facility_type"]
    facility_titles = {
        str(row["name"]): str(row["label"]) for _, row in facility_choices.iterrows()
    }

    version = "2024.1"
    if "version" in settings.columns and pd.notna(settings.iloc[0].get("version")):
        version = str(settings.iloc[0]["version"])

    tools = []
    for facility_id in FACILITY_RELEVANT:
        title = facility_titles.get(facility_id, facility_id)
        tool = parse_facility_type(survey, facility_id, title)
        tool["version"] = version
        tools.append(tool)

    payload = {
        "meta": {
            "source": "ECD Standard Question Draft.xlsx",
            "generatedAt": date.today().isoformat(),
        },
        "ranks": RANKS,
        "facilityTypes": tools,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    for tool in tools:
        print(
            f"{tool['id']}: sections={tool['sectionCount']} items={tool['itemCount']} "
            f"computed={tool['computedMaxScore']}"
        )


if __name__ == "__main__":
    main()
