"""Export and apply Kinyarwanda translations for self-evaluation checklists."""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "src" / "features" / "self-evaluation" / "data" / "checklists.generated.json"
SOURCE_XLSX = ROOT / "docs" / "ECD Standard Question Draft.xlsx"
EXPORT_XLSX = ROOT / "docs" / "ECD-self-eval-translations.xlsx"
EXPORT_CSV = ROOT / "docs" / "ECD-self-eval-questions-for-translation.csv"

# Section title translations (English / Kinyarwanda)
SECTION_TITLES: dict[str, str] = {
    "grp_dc_s711": (
        "7.1.1 Care and Support for the Mother and Child During Pregnancy / "
        "7.1.1 Kwita no gufasha umubyeyi n'umwana mu gihe cyo gutwita"
    ),
    "grp_dc_s712": (
        "7.1.2 Care and Support for Children from Birth to 3 Years / "
        "7.1.2 Kwita no gufasha abana kuva bakivuka kugeza ku myaka 3"
    ),
    "grp_dc_s713": (
        "7.1.3 Day-Care Facility Staffing / 7.1.3 Abakozi b'ikigo cyita ku bana"
    ),
    "grp_dc_s714": (
        "7.1.4 Sanitary Facilities in a Day-Care Facility / "
        "7.1.4 Ibikoresho n'ahantu by'isuku mu kigo cyita ku bana"
    ),
    "grp_dc_s715": "7.1.5 Building Specifications / 7.1.5 Ibisabwa ku nyubako",
    "grp_dc_s716": (
        "7.1.6 The Physical Environment / 7.1.6 Imiterere y'aho ikigo giherereye"
    ),
    "grp_dc_s717": "7.1.7 Equipment / 7.1.7 Ibikoresho",
    "grp_dc_s718": "7.1.8 The Breastfeeding Room / 7.1.8 Icyumba cyo konsa",
    "grp_dc_s719": "7.1.9 Care, Learning and Play / 7.1.9 Kwita ku bana, kwiga no gukina",
    "grp_dc_s710": "7.1.10 Health / 7.1.10 Ubuzima",
    "grp_dc_s711n": "7.1.11 Food and Nutrition / 7.1.11 Ibiribwa n'imirire",
    "grp_dc_s712p": (
        "7.1.12 Children's Safety and Protection / 7.1.12 Umutekano no kurinda abana"
    ),
    "grp_dc_s712d": "7.1.12 Positive Discipline / 7.1.12 Uburere buboneye",
    "grp_dc_s713r": (
        "7.1.13 Record Keeping and Management / 7.1.13 Kubika no gucunga inyandiko"
    ),
    "grp_dc_s714c": (
        "7.1.14 Curriculum, Pedagogy and Assessment Tools / "
        "7.1.14 Integanyanyigisho, uburyo bwo kwigisha n'ibikoresho byo gusuzuma"
    ),
    "grp_dc_s715e": "7.1.15 Enrolment of Children / 7.1.15 Kwandikisha abana",
    "grp_ecd_s7211g": "7.2.1.1 Geographical Location / 7.2.1.1 Aho ikigo giherereye",
    "grp_ecd_s7211p": (
        "7.2.1.1 Physical Environment / 7.2.1.1 Imiterere y'aho ikigo giherereye"
    ),
    "grp_ecd_s7212c": (
        "7.2.1.2 Classrooms / Indoor Space / "
        "7.2.1.2 Ibyumba by'amashuri / ahantu h'imbere mu nyubako"
    ),
    "grp_ecd_s7212f": "7.2.1.2 Furniture / 7.2.1.2 Ibikoresho byo mu byumba",
    "grp_ecd_s7212k": "7.2.1.2 Kitchen / 7.2.1.2 Igikoni",
    "grp_ecd_s7212ks": "7.2.1.2 Kitchen Store / 7.2.1.2 Ububiko bw'igikoni",
    "grp_ecd_s7212t": "7.2.1.2 Toilets / 7.2.1.2 Ubwiherero",
    "grp_ecd_s7212s": "7.2.1.2 Sleeping Area / 7.2.1.2 Ahantu ho kuryama",
    "grp_ecd_s7212o": "7.2.1.2 Outdoor Play Area / 7.2.1.2 Ahantu ho gukinira hanze",
    "grp_ecd_s7212pe": "7.2.1.2 Play Equipment / 7.2.1.2 Ibikoresho byo gukina",
    "grp_ecd_s7213h": "7.2.1.3 Health / 7.2.1.3 Ubuzima",
    "grp_ecd_s7213n": "7.2.1.3 Food and Nutrition / 7.2.1.3 Ibiribwa n'imirire",
    "grp_ecd_s7214": (
        "7.2.1.4 Child Protection and Safety / 7.2.1.4 Kurinda abana n'umutekano wabo"
    ),
    "grp_ecd_s7215": (
        "7.2.1.5 Water, Sanitation and Hygiene (WASH) / "
        "7.2.1.5 Amazi, isuku n'isukura (WASH)"
    ),
    "grp_ecd_s7217a": (
        "7.2.1.7 Teaching and Learning Approaches / 7.2.1.7 Uburyo bwo kwigisha no kwiga"
    ),
    "grp_ecd_s7217o": (
        "7.2.1.7 Organizing Teaching, Learning and Play Activities / "
        "7.2.1.7 Gutegura ibikorwa byo kwigisha, kwiga no gukina"
    ),
    "grp_ecd_s7217r": (
        "7.2.1.7 Teaching, Learning and Play Resources / "
        "7.2.1.7 Ibikoresho byo kwigisha, kwiga no gukina"
    ),
    "grp_ecd_s7217f": (
        "7.2.1.7 Field and Study Visits / "
        "7.2.1.7 Ingendo zo kwiga no gusura ahantu hatandukanye"
    ),
    "grp_ecd_s7218": (
        "7.2.1.8 Establishment and Registration / 7.2.1.8 Gushinga no kwandikisha ikigo"
    ),
    "grp_ecd_s7219": (
        "7.2.1.9 Effective Partnership and Networking with Families and Communities / "
        "7.2.1.9 Ubufatanye bunoze n'imiryango ndetse n'abaturage"
    ),
    "grp_ecd_s72110": (
        "7.2.1.10 Assessment of Children's Development and Learning Progress / "
        "7.2.1.10 Gusuzuma imikurire y'abana n'intambwe bagezeho mu myigire"
    ),
    "grp_ecd_s72111": (
        "7.2.1.11 Qualifications, Training and Incentives for Caregivers and Cooks / "
        "7.2.1.11 Ubumenyi, amahugurwa n'uburyo bwo gushishikariza abarezi n'abateka"
    ),
}

# Sample question translations provided as reference style
QUESTION_TRANSLATIONS: dict[str, str] = {
    "dc_s711_pregnant_anc_access": (
        "Every pregnant woman has access to antenatal care immediately after missing her periods / "
        "Umubyeyi wese utwite atangira gukurikiranwa kwa muganga akimara kumenya ko atwite."
    ),
}

FACILITY_RELEVANT = {
    "daycare": "${facility_type}='daycare'",
    "ecd_3_5": "${facility_type}='ecd_3_5'",
}


def load_catalog() -> dict:
    return json.loads(JSON_PATH.read_text(encoding="utf-8"))


def save_catalog(catalog: dict) -> None:
    catalog["meta"]["generatedAt"] = date.today().isoformat()
    JSON_PATH.write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")


def is_blank(value: object) -> bool:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return True
    text = str(value).strip()
    return not text or text.lower() == "nan"


def clean_cell(value: object) -> str:
    if is_blank(value):
        return ""
    return str(value).strip()


def split_bilingual_field(text: str) -> tuple[str, str]:
    parts = str(text).split("/", 1)
    en = parts[0].strip()
    rw = parts[1].strip() if len(parts) > 1 else ""
    if rw.lower() == "nan":
        rw = ""
    return en, rw


def merge_bilingual(english: str, rw: str) -> str:
    en = clean_cell(english)
    rw = clean_cell(rw)
    if not rw:
        return en
    base_en = split_bilingual_field(en)[0]
    return f"{base_en} / {rw}"


def apply_section_titles(catalog: dict) -> int:
    count = 0
    for facility in catalog["facilityTypes"]:
        for section in facility["sections"]:
            bilingual = SECTION_TITLES.get(section["id"])
            if bilingual:
                section["title"] = bilingual
                count += 1
    return count


def apply_question_translations(catalog: dict, translations: dict[str, str]) -> int:
    count = 0
    for facility in catalog["facilityTypes"]:
        for section in facility["sections"]:
            for item in section["items"]:
                item_id = item["id"]
                if item_id in translations:
                    item["text"] = translations[item_id]
                    count += 1
                elif item_id in QUESTION_TRANSLATIONS:
                    item["text"] = QUESTION_TRANSLATIONS[item_id]
                    count += 1
    return count


def build_translation_rows_from_source() -> list[dict]:
    """Build translation rows from the Survey123 source (clean English labels)."""
    survey = pd.read_excel(SOURCE_XLSX, sheet_name="survey")
    rows: list[dict] = []
    current_group: dict | None = None

    for _, row in survey.iterrows():
        row_type = clean_cell(row.get("type"))
        name = clean_cell(row.get("name"))
        label = clean_cell(row.get("label"))
        relevant = clean_cell(row.get("relevant"))

        if row_type == "begin_group":
            facility_type = ""
            if "daycare" in relevant:
                facility_type = "daycare"
            elif "ecd_3_5" in relevant:
                facility_type = "ecd_3_5"
            if not facility_type:
                continue
            sec_en, sec_rw = split_bilingual_field(SECTION_TITLES.get(name, label))
            current_group = {
                "facility_type": facility_type,
                "section_id": name,
                "section_title_en": sec_en,
                "section_title_rw": sec_rw,
            }
            continue

        if row_type == "end_group":
            current_group = None
            continue

        if row_type != "select_one yes_no" or current_group is None:
            continue

        rows.append(
            {
                **current_group,
                "question_id": name,
                "question_number": len(
                    [r for r in rows if r.get("section_id") == current_group["section_id"]]
                ) + 1,
                "label_en": label,
                "label_rw": "",
            }
        )

    return rows


def write_translation_files(rows: list[dict]) -> None:
    df = pd.DataFrame(rows)
    EXPORT_CSV.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(EXPORT_CSV, index=False, encoding="utf-8-sig")
    with pd.ExcelWriter(EXPORT_XLSX, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="translations", index=False)
        guide = pd.DataFrame(
            {
                "column": ["label_rw"],
                "instructions": [
                    "Fill Kinyarwanda question text here. Use natural, professional language "
                    "for caregivers/inspectors. Do not translate word-for-word. "
                    "Section titles are pre-filled in section_title_rw.",
                ],
            }
        )
        guide.to_excel(writer, sheet_name="guide", index=False)
    print(f"Exported {len(rows)} questions to:")
    print(f"  CSV:   {EXPORT_CSV}")
    print(f"  Excel: {EXPORT_XLSX}")


def export_translations_workbook(catalog: dict) -> None:
    rows: list[dict] = []
    for facility in catalog["facilityTypes"]:
        for section in facility["sections"]:
            sec_en, sec_rw = split_bilingual_field(section["title"])
            for item in section["items"]:
                label_en, label_rw = split_bilingual_field(item["text"])
                rows.append(
                    {
                        "facility_type": facility["id"],
                        "section_id": section["id"],
                        "section_title_en": sec_en,
                        "section_title_rw": sec_rw,
                        "question_id": item["id"],
                        "question_number": item["number"],
                        "label_en": label_en,
                        "label_rw": label_rw,
                    }
                )

    write_translation_files(rows)


def load_translations_from_workbook(path: Path) -> dict[str, str]:
    sheet = "translations"
    if path.suffix.lower() == ".csv":
        df = pd.read_csv(path)
    else:
        df = pd.read_excel(path, sheet_name=sheet)
    translations: dict[str, str] = {}
    for _, row in df.iterrows():
        qid = clean_cell(row.get("question_id"))
        label_en = clean_cell(row.get("label_en"))
        label_rw = clean_cell(row.get("label_rw"))
        if qid and label_rw:
            translations[qid] = merge_bilingual(label_en, label_rw)
    return translations


def apply_from_source_xlsx(catalog: dict, xlsx_path: Path) -> int:
    """Merge label_rw column from Survey123 source if present."""
    survey = pd.read_excel(xlsx_path, sheet_name="survey")
    rw_col = None
    for col in survey.columns:
        if col in ("label_rw", "label::language (rw)") or "language (rw)" in str(col).lower():
            rw_col = col
            break
    if not rw_col:
        return 0

    translations: dict[str, str] = {}
    for _, row in survey.iterrows():
        name = str(row.get("name") or "").strip()
        label = str(row.get("label") or "").strip()
        rw = clean_cell(row.get(rw_col))
        if name and label and rw:
            translations[name] = merge_bilingual(label, rw)

    return apply_question_translations(catalog, translations)


def cmd_apply(workbook: Path | None = None) -> None:
    catalog = load_catalog()
    sections = apply_section_titles(catalog)
    questions = apply_question_translations(catalog, {})

    if workbook and workbook.exists():
        wb_translations = load_translations_from_workbook(workbook)
        questions += apply_question_translations(catalog, wb_translations)
    elif SOURCE_XLSX.exists():
        questions += apply_from_source_xlsx(catalog, SOURCE_XLSX)

    if EXPORT_CSV.exists() and workbook is None:
        wb_translations = load_translations_from_workbook(EXPORT_CSV)
        questions += apply_question_translations(catalog, wb_translations)
    elif EXPORT_XLSX.exists() and workbook is None:
        wb_translations = load_translations_from_workbook(EXPORT_XLSX)
        questions += apply_question_translations(catalog, wb_translations)

    save_catalog(catalog)
    print(f"Applied {sections} section titles, {questions} question translations")


def cmd_export() -> None:
    if not SOURCE_XLSX.exists():
        raise SystemExit(f"Source XLSX not found: {SOURCE_XLSX}")
    rows = build_translation_rows_from_source()
    write_translation_files(rows)


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in ("export", "apply"):
        print("Usage: python self-eval-translations.py export|apply [workbook.xlsx|.csv]")
        raise SystemExit(1)

    cmd = sys.argv[1]
    workbook = Path(sys.argv[2]) if len(sys.argv) > 2 else None

    if cmd == "export":
        cmd_export()
    else:
        cmd_apply(workbook)


if __name__ == "__main__":
    main()
