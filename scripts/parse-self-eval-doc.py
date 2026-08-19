"""Parse self-evaluation DOCX extract into structured checklist JSON."""
from __future__ import annotations

import json
import re
from pathlib import Path

TEXT_PATH = Path(__file__).resolve().parents[1] / "docs" / "self-evaluation-tool-extract.txt"
OUT_PATH = Path(
    __file__).resolve().parents[1] / "src" / "features" / "self-evaluation" / "data" / "checklists.generated.json"

FACILITY_MAP = {
    "A. Self-Evaluation Tool for Daycare Facilities (Creches)": "daycare",
    "B. Self-Evaluation Tool for Home-Based ECD Facilities": "home_based",
    "C. ECD Mapping Tool for Community-Based ECD Facilities": "community_based",
    "D. Self-Evaluation Tool for School-Based and Model ECD Facilities": "school_model",
}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")[:48]


def is_item_num(s: str) -> bool:
    return bool(re.fullmatch(r"\d+", s))


def is_section_header(s: str) -> bool:
    return bool(re.match(r"^\d+\.\s", s)) and "Weighted" not in s


def is_subtotal(s: str) -> bool:
    return bool(re.match(r"^S/?TOTAL|^S/Total", s, re.I))


def is_weighted_header(s: str) -> bool:
    return bool(re.match(r"^Weighted\s+[Ss]core", s))


def is_sub_indicator(s: str) -> bool:
    return bool(re.match(r"^([a-z]\)|•)\s*", s, re.I))


def parse_items(lines: list[str]) -> list[dict]:
    items: list[dict] = []
    i = 0
    n = len(lines)

    while i < n:
        s = lines[i].strip()
        if is_subtotal(s):
            break
        if not s or is_weighted_header(s):
            i += 1
            continue
        if not is_item_num(s):
            i += 1
            continue

        item_num = int(s)
        i += 1
        text_lines: list[str] = []
        indicators: list[dict] = []

        while i < n:
            s = lines[i].strip()
            if not s:
                i += 1
                continue
            if is_subtotal(s):
                break
            if is_item_num(s):
                # Peek: if we already have text, this is weight or next item
                if text_lines and not indicators:
                    weight = int(s)
                    items.append(
                        {
                            "number": item_num,
                            "text": " ".join(text_lines),
                            "maxScore": weight,
                            "indicators": [],
                        }
                    )
                    i += 1
                    break
                if indicators:
                    break
                # no text yet — treat as malformed, skip
                i += 1
                continue

            if is_sub_indicator(s):
                label = s
                i += 1
                weight = 1
                if i < n and is_item_num(lines[i].strip()):
                    weight = int(lines[i].strip())
                    i += 1
                indicators.append({"label": label, "maxScore": weight})
                continue

            text_lines.append(s)
            i += 1
        else:
            i = n

        if text_lines and not any(x.get("number") == item_num for x in items[-1:]):
            if indicators:
                max_score = max(ind["maxScore"] for ind in indicators)
                items.append(
                    {
                        "number": item_num,
                        "text": " ".join(text_lines),
                        "maxScore": max_score,
                        "indicators": indicators,
                        "selectionMode": "any",
                    }
                )
            elif i < n and is_item_num(lines[i - 1].strip()) if i > 0 else False:
                pass
            else:
                # look ahead for weight on next non-empty
                j = i
                weight = 1
                while j < n:
                    t = lines[j].strip()
                    if not t:
                        j += 1
                        continue
                    if is_item_num(t):
                        weight = int(t)
                        i = j + 1
                    break
                items.append(
                    {
                        "number": item_num,
                        "text": " ".join(text_lines),
                        "maxScore": weight,
                        "indicators": [],
                    }
                )

    for idx, item in enumerate(items):
        item.setdefault("id", f"item-{item['number']}-{idx}")
        for ind_idx, ind in enumerate(item.get("indicators") or []):
            ind["id"] = f"{item['id']}-ind{ind_idx + 1}"

    return items


def parse_facility(lines: list[str]) -> dict:
    title = lines[0].strip()
    facility_id = FACILITY_MAP.get(title, slug(title))
    sections: list[dict] = []
    grand_total = None

    i = 1
    while i < len(lines):
        s = lines[i].strip()
        if s.startswith("Grand Total"):
            m = re.search(r"/(\d+)", s)
            if m:
                grand_total = int(m.group(1))
            break
        if is_section_header(s):
            sec_title = s
            i += 1
            body: list[str] = []
            subtotal_max = None
            while i < len(lines):
                s2 = lines[i].strip()
                if s2.startswith("Grand Total"):
                    break
                if is_section_header(s2):
                    break
                if is_subtotal(s2):
                    m = re.search(r"/(\d+)", s2)
                    if m:
                        subtotal_max = int(m.group(1))
                    i += 1
                    break
                if is_weighted_header(s2):
                    i += 1
                    while i < len(lines):
                        s3 = lines[i].strip()
                        if is_subtotal(s3) or is_section_header(s3) or s3.startswith("Grand Total"):
                            break
                        body.append(lines[i])
                        i += 1
                    continue
                i += 1
            items = parse_items(body)
            sections.append(
                {
                    "id": slug(sec_title),
                    "title": sec_title,
                    "subtotalMax": subtotal_max,
                    "items": items,
                }
            )
            continue
        i += 1

    for sec_idx, sec in enumerate(sections):
        for item in sec["items"]:
            item["id"] = f"{facility_id}-s{sec_idx + 1}-{item['number']}"
            for ind_idx, ind in enumerate(item.get("indicators") or []):
                ind["id"] = f"{item['id']}-ind{ind_idx + 1}"

    computed = sum(item["maxScore"] for sec in sections for item in sec["items"])

    return {
        "id": facility_id,
        "title": title,
        "version": "2024.1",
        "grandTotalMax": grand_total,
        "computedMaxScore": computed,
        "sectionCount": len(sections),
        "itemCount": sum(len(s["items"]) for s in sections),
        "sections": sections,
    }


def main() -> None:
    lines = TEXT_PATH.read_text(encoding="utf-8").splitlines()
    starts = [i for i, l in enumerate(lines) if re.match(r"^[A-D]\.\s", l.strip())]
    tools = []
    for idx, start in enumerate(starts):
        end = starts[idx + 1] if idx + 1 < len(starts) else len(lines)
        tools.append(parse_facility(lines[start:end]))

    payload = {
        "meta": {
            "source": "Self Evaluation Tool for Compliance with ECD Standards.docx",
            "generatedAt": "2026-08-18",
        },
        "ranks": [
            {"id": "green", "minPercent": 90, "maxPercent": 100, "labelRw": "Icyatsi (90%-100%)"},
            {"id": "blue", "minPercent": 70, "maxPercent": 89, "labelRw": "Ubururu (70%-89%)"},
            {"id": "yellow", "minPercent": 50, "maxPercent": 69, "labelRw": "Umuhondo (50%-69%)"},
            {"id": "red", "minPercent": 0, "maxPercent": 49, "labelRw": "Utukura (munsi ya 50%)"},
        ],
        "facilityTypes": tools,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    for tool in tools:
        print(
            f"{tool['id']}: sections={tool['sectionCount']} items={tool['itemCount']} "
            f"docMax={tool['grandTotalMax']} computed={tool['computedMaxScore']}"
        )


if __name__ == "__main__":
    main()
