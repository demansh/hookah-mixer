import csv
import json
import sys

import yaml

from validate import DATA_DIR, FLAVOR_ATTRIBUTES, PROPERTY_CATEGORY, REPO_ROOT, collect_reports, split_list

OUTPUT_DIR = REPO_ROOT / "assets" / "data"
OBSOLETE_OUTPUTS = ["tags.json", "brands.json", "tobaccos.json", "rules.json"]


def read_rows(file_name: str) -> list[dict[str, str]]:
    with (DATA_DIR / file_name).open(encoding="utf-8-sig", newline="") as handle:
        return [{key: (value or "").strip() for key, value in row.items()} for row in csv.DictReader(handle)]


def localized(ru_value: str, en_value: str) -> dict[str, str]:
    return {"ru": ru_value or en_value, "en": en_value or ru_value}


def build_flavors() -> list[dict]:
    flavors = []
    for row in read_rows("tags.csv"):
        is_property = row["category"] == PROPERTY_CATEGORY
        flavor = {
            "id": row["id"],
            "category": row["category"],
            "kind": "property" if is_property else "flavor",
            "label": localized(row["ru"], row["en"]),
            "synonyms": {"ru": split_list(row["synonyms_ru"]), "en": split_list(row["synonyms_en"])},
        }
        if not is_property:
            flavor["role"] = row["role"]
            flavor.update({column: int(row[column]) for column in FLAVOR_ATTRIBUTES})
        flavors.append(flavor)
    return flavors


def build_graph() -> dict:
    return {
        "categoryAffinity": [
            {"a": row["a"], "b": row["b"], "affinity": float(row["affinity"])}
            for row in read_rows("category_affinity.csv")
        ],
        "pairs": [
            {
                "a": row["a"],
                "b": row["b"],
                "affinity": float(row["affinity"]),
                "familiarity": row["familiarity"],
                "note": localized(row["note_ru"], row["note_en"]) if row["note_ru"] or row["note_en"] else None,
            }
            for row in read_rows("pairings.csv")
        ],
    }


def build_concepts() -> list[dict]:
    concepts = yaml.safe_load((DATA_DIR / "concepts.yaml").read_text(encoding="utf-8")) or []
    return [
        {
            "id": concept["id"],
            "phrases": {"ru": concept.get("phrases_ru") or [], "en": concept.get("phrases_en") or []},
            "tags": concept["tags"],
            "avoid": concept.get("avoid") or [],
        }
        for concept in concepts
    ]


def write_json(file_name: str, payload) -> None:
    target = OUTPUT_DIR / file_name
    temporary = target.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    temporary.replace(target)
    print(f"  {target.relative_to(REPO_ROOT)}  {target.stat().st_size / 1024:.1f} KB")


def main() -> int:
    reports = collect_reports()
    errors = [message for report in reports.values() for message in report.errors]
    if errors:
        print("Build aborted, fix validation errors first (uv run tools/validate.py):")
        for message in errors:
            print(f"  ERROR {message}")
        return 1

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Built:")
    write_json("flavors.json", build_flavors())
    write_json("graph.json", build_graph())
    write_json("concepts.json", build_concepts())
    for file_name in OBSOLETE_OUTPUTS:
        (OUTPUT_DIR / file_name).unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
