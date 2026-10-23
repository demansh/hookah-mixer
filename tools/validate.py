import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data-src"
EVAL_DIR = REPO_ROOT / "eval"

TAG_ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")
CONCEPT_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:[-_][a-z0-9]+)*$")
PROPERTY_CATEGORY = "property"
COOLING_ROLE = "cooling"
FLAVOR_CATEGORIES = {
    "fruit_tropical", "fruit_orchard", "melon", "citrus", "berry", "dessert", "bakery", "candy", "spice",
    "herbal", "floral", "tea", "drink", "alcohol", "nut", "vegetable", "tobacco", "cooling",
}
TAG_CATEGORIES = FLAVOR_CATEGORIES | {PROPERTY_CATEGORY}
FLAVOR_ROLES = {"base", "accent", "support", COOLING_ROLE}
FLAVOR_ATTRIBUTES = {"intensity": (1, 5), "sweet": (0, 5), "sour": (0, 5), "fresh": (0, 5)}
FAMILIARITY_LEVELS = {"classic", "known", "rare"}
CONCEPT_KEYS = {"id", "phrases_ru", "phrases_en", "tags", "avoid"}
QUERY_TYPES = {"direct", "compound", "abstract"}
LANGS = {"ru", "en"}
SECTIONS = ["tags", "category_affinity", "pairings", "concepts", "eval"]
DESCRIPTION_WORDS_MIN = 3
DESCRIPTION_WORDS_MAX = 12


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    infos: list[str] = field(default_factory=list)

    def error(self, location: str, message: str) -> None:
        self.errors.append(f"{location}: {message}")

    def warn(self, location: str, message: str) -> None:
        self.warnings.append(f"{location}: {message}")

    def info(self, message: str) -> None:
        self.infos.append(message)


@dataclass
class TagIndex:
    all_ids: set[str] = field(default_factory=set)
    flavor_ids: set[str] = field(default_factory=set)
    category_by_id: dict[str, str] = field(default_factory=dict)


def normalize_term(term: str) -> str:
    return re.sub(r"\s+", " ", term.strip().lower().replace("ё", "е"))


def split_list(value: str) -> list[str]:
    return [part.strip() for part in value.split("|") if part.strip()]


def unordered_pair(first: str, second: str) -> tuple[str, str]:
    return tuple(sorted((first, second)))


def parse_int(value: str, location: str, column: str, low: int, high: int, report: Report) -> int | None:
    try:
        number = int(value)
    except ValueError:
        report.error(location, f"{column}='{value}' is not an integer")
        return None
    if not low <= number <= high:
        report.error(location, f"{column}={number} is outside {low}..{high}")
        return None
    return number


def parse_affinity(value: str, location: str, report: Report) -> float | None:
    try:
        affinity = float(value)
    except ValueError:
        report.error(location, f"affinity='{value}' is not a number")
        return None
    if not -1.0 <= affinity <= 1.0:
        report.error(location, f"affinity={affinity} is outside -1..1")
        return None
    return affinity


def read_csv(path: Path, required_columns: list[str], report: Report) -> list[tuple[str, dict[str, str]]]:
    if not path.exists():
        report.error(path.name, "file not found")
        return []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing_columns = set(required_columns) - set(reader.fieldnames or [])
        if missing_columns:
            report.error(path.name, f"missing columns: {', '.join(sorted(missing_columns))}")
            return []
        rows = []
        for line_number, raw_row in enumerate(reader, start=2):
            location = f"{path.name}:{line_number}"
            if None in raw_row:
                report.error(location, "more values than columns (unquoted comma?)")
                continue
            rows.append((location, {key: (value or "").strip() for key, value in raw_row.items()}))
        return rows


def read_yaml(path: Path, report: Report):
    if not path.exists():
        report.error(path.name, "file not found")
        return None
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as error:
        report.error(path.name, f"invalid YAML: {error}")
        return None


def check_weight(value, location: str, label: str, report: Report) -> None:
    if not isinstance(value, (int, float)) or not 0.1 <= value <= 1.0:
        report.error(location, f"{label} weight {value!r} must be a number in 0.1..1.0")


def validate_flavor_attributes(row: dict[str, str], location: str, report: Report) -> None:
    is_property = row["category"] == PROPERTY_CATEGORY
    attribute_columns = ["role", *FLAVOR_ATTRIBUTES]
    if is_property:
        filled = [column for column in attribute_columns if row[column]]
        if filled:
            report.error(location, f"property tags must leave {', '.join(filled)} empty")
        return
    if row["role"] not in FLAVOR_ROLES:
        report.error(location, f"role must be one of {sorted(FLAVOR_ROLES)}")
    if (row["role"] == COOLING_ROLE) != (row["category"] == "cooling"):
        report.error(location, "role 'cooling' is reserved for the cooling category and required there")
    for column, (low, high) in FLAVOR_ATTRIBUTES.items():
        if row[column] == "":
            report.error(location, f"{column} is empty")
        else:
            parse_int(row[column], location, column, low, high, report)


def validate_tags(report: Report) -> TagIndex:
    columns = [
        "id", "category", "role", *FLAVOR_ATTRIBUTES, "ru", "en",
        "synonyms_ru", "synonyms_en", "description_ru", "description_en",
    ]
    index = TagIndex()
    term_owners: dict[str, set[str]] = defaultdict(set)
    category_counts: Counter[str] = Counter()
    role_counts: Counter[str] = Counter()
    for location, row in read_csv(DATA_DIR / "tags.csv", columns, report):
        tag_id = row["id"]
        if not TAG_ID_PATTERN.match(tag_id):
            report.error(location, f"id '{tag_id}' must be lowercase latin, digits and underscores")
            continue
        if tag_id in index.all_ids:
            report.error(location, f"duplicate id '{tag_id}'")
            continue
        index.all_ids.add(tag_id)
        if row["category"] not in TAG_CATEGORIES:
            report.error(location, f"unknown category '{row['category']}'")
            continue
        index.category_by_id[tag_id] = row["category"]
        if row["category"] != PROPERTY_CATEGORY:
            index.flavor_ids.add(tag_id)
            role_counts[row["role"]] += 1
        category_counts[row["category"]] += 1
        validate_flavor_attributes(row, location, report)
        for column in ["ru", "en", "description_ru", "description_en"]:
            if not row[column]:
                report.error(location, f"{column} is empty")
        for column in ["description_ru", "description_en"]:
            word_count = len(row[column].split())
            if row[column] and not DESCRIPTION_WORDS_MIN <= word_count <= DESCRIPTION_WORDS_MAX:
                report.warn(location, f"{column} has {word_count} words, recommended "
                                      f"{DESCRIPTION_WORDS_MIN}..{DESCRIPTION_WORDS_MAX}")
        terms = [row["ru"], row["en"], *split_list(row["synonyms_ru"]), *split_list(row["synonyms_en"])]
        for term in filter(None, terms):
            term_owners[normalize_term(term)].add(tag_id)
    for term, owners in sorted(term_owners.items()):
        if len(owners) > 1:
            report.error("tags.csv", f"term '{term}' belongs to several tags: {', '.join(sorted(owners))}")
    report.info(f"{len(index.flavor_ids)} flavors + {len(index.all_ids) - len(index.flavor_ids)} properties")
    report.info("by category: " + ", ".join(f"{name} {count}" for name, count in sorted(category_counts.items())))
    report.info("by role: " + ", ".join(f"{name} {count}" for name, count in sorted(role_counts.items())))
    return index


def validate_category_affinity(report: Report) -> None:
    seen_pairs: set[tuple[str, str]] = set()
    for location, row in read_csv(DATA_DIR / "category_affinity.csv", ["a", "b", "affinity"], report):
        unknown = [category for category in (row["a"], row["b"]) if category not in FLAVOR_CATEGORIES]
        if unknown:
            report.error(location, f"unknown flavor category: {', '.join(unknown)}")
            continue
        pair = unordered_pair(row["a"], row["b"])
        if pair in seen_pairs:
            report.error(location, f"duplicate category pair {pair[0]} + {pair[1]}")
            continue
        seen_pairs.add(pair)
        parse_affinity(row["affinity"], location, report)
    category_count = len(FLAVOR_CATEGORIES)
    total_pairs = category_count * (category_count + 1) // 2
    report.info(f"{len(seen_pairs)} of {total_pairs} category pairs defined, the rest default to 0")


def validate_pairings(tags: TagIndex, report: Report) -> None:
    columns = ["a", "b", "affinity", "familiarity", "note_ru", "note_en"]
    seen_pairs: set[tuple[str, str]] = set()
    familiarity_counts: Counter[str] = Counter()
    paired_flavors: set[str] = set()
    for location, row in read_csv(DATA_DIR / "pairings.csv", columns, report):
        unknown = [flavor for flavor in (row["a"], row["b"]) if flavor not in tags.flavor_ids]
        if unknown:
            report.error(location, f"unknown flavor (or property tag): {', '.join(unknown)}")
            continue
        if row["a"] == row["b"]:
            report.error(location, "a flavor cannot pair with itself")
            continue
        pair = unordered_pair(row["a"], row["b"])
        if pair in seen_pairs:
            report.error(location, f"duplicate pair {pair[0]} + {pair[1]}")
            continue
        seen_pairs.add(pair)
        paired_flavors.update(pair)
        parse_affinity(row["affinity"], location, report)
        if row["familiarity"] not in FAMILIARITY_LEVELS:
            report.error(location, f"familiarity must be one of {sorted(FAMILIARITY_LEVELS)}")
        familiarity_counts[row["familiarity"]] += 1
        if bool(row["note_ru"]) != bool(row["note_en"]):
            report.warn(location, "note is filled in only one language")
    report.info(f"{len(seen_pairs)} pairs; familiarity: {dict(familiarity_counts)}")
    unpaired = sorted(tags.flavor_ids - paired_flavors)
    report.info(f"flavors without explicit pairs ({len(unpaired)}): {', '.join(unpaired)}")


def validate_concepts(tags: TagIndex, report: Report) -> set[str]:
    concepts = read_yaml(DATA_DIR / "concepts.yaml", report)
    if concepts is None:
        return set()
    if not isinstance(concepts, list):
        report.error("concepts.yaml", "top level must be a list")
        return set()
    concept_ids: set[str] = set()
    phrase_owners: dict[str, set[str]] = defaultdict(set)
    for index, concept in enumerate(concepts):
        if not isinstance(concept, dict):
            report.error(f"concepts.yaml[{index}]", "must be a mapping")
            continue
        concept_id = str(concept.get("id") or "")
        location = f"concepts.yaml:{concept_id or index}"
        if not CONCEPT_ID_PATTERN.match(concept_id):
            report.error(location, "id must be lowercase latin, digits and hyphens")
            continue
        if concept_id in concept_ids:
            report.error(location, f"duplicate id '{concept_id}'")
            continue
        concept_ids.add(concept_id)
        unknown_keys = set(concept) - CONCEPT_KEYS
        if unknown_keys:
            report.warn(location, f"unknown keys ignored: {', '.join(sorted(unknown_keys))}")
        for key in ["phrases_ru", "phrases_en"]:
            phrases = concept.get(key) or []
            if not isinstance(phrases, list):
                report.error(location, f"{key} must be a list")
                continue
            for phrase in phrases:
                phrase_owners[normalize_term(str(phrase))].add(concept_id)
        if not concept.get("phrases_ru"):
            report.error(location, "phrases_ru is empty")
        concept_tags = concept.get("tags")
        if not isinstance(concept_tags, dict) or not concept_tags:
            report.error(location, "tags must be a non-empty mapping tag: weight")
            concept_tags = {}
        for tag, weight in concept_tags.items():
            if tag not in tags.all_ids:
                report.error(location, f"unknown tag '{tag}'")
            check_weight(weight, location, f"tag '{tag}'", report)
        for tag in concept.get("avoid") or []:
            if tag not in tags.all_ids:
                report.error(location, f"unknown avoid tag '{tag}'")
            if tag in concept_tags:
                report.error(location, f"tag '{tag}' is both in tags and avoid")
    for phrase, owners in sorted(phrase_owners.items()):
        if len(owners) > 1:
            report.warn("concepts.yaml", f"phrase '{phrase}' is used by several concepts: {', '.join(sorted(owners))}")
    report.info(f"{len(concept_ids)} concepts, {len(phrase_owners)} phrases")
    return set(phrase_owners)


def validate_eval(tags: TagIndex, concept_phrases: set[str], report: Report) -> None:
    seen_queries: set[str] = set()
    type_counts: Counter[str] = Counter()
    lang_counts: Counter[str] = Counter()
    for path in sorted(EVAL_DIR.glob("*.jsonl")):
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if not line.strip():
                continue
            location = f"{path.name}:{line_number}"
            try:
                item = json.loads(line)
            except json.JSONDecodeError as error:
                report.error(location, f"invalid JSON: {error.msg}")
                continue
            query = normalize_term(str(item.get("q") or ""))
            if not query:
                report.error(location, "q is empty")
                continue
            if query in seen_queries:
                report.warn(location, f"duplicate query '{query}'")
            seen_queries.add(query)
            if item.get("lang") not in LANGS:
                report.error(location, f"lang must be one of {sorted(LANGS)}")
            if item.get("type") not in QUERY_TYPES:
                report.error(location, f"type must be one of {sorted(QUERY_TYPES)}")
            if not item.get("must"):
                report.error(location, "must is empty")
            for key in ["must", "ok", "forbid"]:
                for tag in item.get(key) or []:
                    if tag not in tags.all_ids:
                        report.error(location, f"unknown tag '{tag}' in {key}")
            overlap = set(item.get("must") or []) & set(item.get("forbid") or [])
            if overlap:
                report.error(location, f"tags in both must and forbid: {', '.join(sorted(overlap))}")
            if item.get("type") == "abstract" and query in concept_phrases:
                report.error(location, f"abstract query '{query}' copies a concept phrase, eval would measure recall")
            type_counts[item.get("type")] += 1
            lang_counts[item.get("lang")] += 1
    report.info(f"{len(seen_queries)} eval queries; types: {dict(type_counts)}; langs: {dict(lang_counts)}")


def collect_reports() -> dict[str, Report]:
    reports = {section: Report() for section in SECTIONS}
    tags = validate_tags(reports["tags"])
    validate_category_affinity(reports["category_affinity"])
    validate_pairings(tags, reports["pairings"])
    concept_phrases = validate_concepts(tags, reports["concepts"])
    validate_eval(tags, concept_phrases, reports["eval"])
    return reports


def print_section(name: str, report: Report) -> None:
    print(f"== {name} ==")
    for message in report.errors:
        print(f"  ERROR {message}")
    for message in report.warnings:
        print(f"  WARN  {message}")
    for message in report.infos:
        print(f"  INFO  {message}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate hookah-mixer source data")
    parser.add_argument("--only", choices=SECTIONS, action="append", help="show only these sections")
    args = parser.parse_args()
    selected_sections = args.only or SECTIONS

    reports = collect_reports()
    for section in selected_sections:
        print_section(section, reports[section])
    error_count = sum(len(reports[section].errors) for section in selected_sections)
    warning_count = sum(len(reports[section].warnings) for section in selected_sections)
    print(f"\n{error_count} errors, {warning_count} warnings")
    return 1 if error_count else 0


if __name__ == "__main__":
    sys.exit(main())
