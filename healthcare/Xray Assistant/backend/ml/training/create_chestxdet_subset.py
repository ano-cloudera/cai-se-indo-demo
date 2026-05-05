from __future__ import annotations

import argparse
import json
import random
import shutil
from collections import Counter
from pathlib import Path
from typing import Any


TARGET_CLASSES = [
    "Pneumothorax",
    "Effusion",
    "Cardiomegaly",
    "Consolidation",
]
DEFAULT_TRAIN_LIMIT = 800
DEFAULT_TEST_LIMIT = 200
DEFAULT_SEED = 42


def parse_args() -> argparse.Namespace:
    project_root = Path(__file__).resolve().parents[3]
    dataset_root = project_root / "references" / "ChestX-Det-Dataset"
    output_root = project_root / "data" / "subset"

    parser = argparse.ArgumentParser(
        description="Create a smaller ChestX-Det subset for faster demo iteration.",
    )
    parser.add_argument("--dataset-root", type=Path, default=dataset_root)
    parser.add_argument("--output-root", type=Path, default=output_root)
    parser.add_argument("--train-limit", type=int, default=DEFAULT_TRAIN_LIMIT)
    parser.add_argument("--test-limit", type=int, default=DEFAULT_TEST_LIMIT)
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--copy-mode", choices=["copy", "symlink"], default="copy")
    parser.add_argument(
        "--classes",
        nargs="+",
        default=TARGET_CLASSES,
        help="Subset target classes.",
    )
    return parser.parse_args()


def load_records(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text())
    if not isinstance(data, list):
        raise ValueError(f"Expected a list annotation format in {path}, got {type(data).__name__}.")
    return [item for item in data if isinstance(item, dict)]


def normalize_record(record: dict[str, Any], target_classes: set[str]) -> dict[str, Any] | None:
    file_name = record.get("file_name")
    syms = record.get("syms", [])
    boxes = record.get("boxes", [])
    polygons = record.get("polygons", [])

    if not isinstance(file_name, str):
        return None
    if not isinstance(syms, list) or not isinstance(boxes, list) or not isinstance(polygons, list):
        return None

    filtered_syms: list[str] = []
    filtered_boxes: list[Any] = []
    filtered_polygons: list[Any] = []

    for index, label in enumerate(syms):
        if label not in target_classes:
            continue
        if index >= len(boxes):
            continue
        filtered_syms.append(label)
        filtered_boxes.append(boxes[index])
        filtered_polygons.append(polygons[index] if index < len(polygons) else [])

    if not filtered_syms:
        return None

    return {
        "file_name": file_name,
        "syms": filtered_syms,
        "boxes": filtered_boxes,
        "polygons": filtered_polygons,
    }


def select_subset(
    records: list[dict[str, Any]],
    limit: int,
    seed: int,
    target_classes: set[str],
) -> list[dict[str, Any]]:
    eligible = [normalized for record in records if (normalized := normalize_record(record, target_classes))]
    if len(eligible) <= limit:
        return eligible

    rng = random.Random(seed)
    selected_indices = sorted(rng.sample(range(len(eligible)), k=limit))
    return [eligible[index] for index in selected_indices]


def ensure_clean_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def link_or_copy(src: Path, dst: Path, copy_mode: str) -> None:
    if dst.exists() or dst.is_symlink():
        dst.unlink()

    if copy_mode == "symlink":
        dst.symlink_to(src)
    else:
        shutil.copy2(src, dst)


def materialize_subset(
    split_name: str,
    records: list[dict[str, Any]],
    image_root: Path,
    output_root: Path,
    copy_mode: str,
) -> tuple[list[dict[str, Any]], int, int]:
    output_images_dir = output_root / split_name
    ensure_clean_dir(output_images_dir)

    kept_records: list[dict[str, Any]] = []
    copied_count = 0
    missing_count = 0

    for record in records:
        src = image_root / record["file_name"]
        dst = output_images_dir / record["file_name"]
        if not src.exists():
            missing_count += 1
            continue

        link_or_copy(src, dst, copy_mode)
        kept_records.append(record)
        copied_count += 1

    return kept_records, copied_count, missing_count


def category_payload(target_classes: list[str], records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    present = {label for record in records for label in record.get("syms", [])}
    ordered = [label for label in target_classes if label in present]
    return [{"id": index + 1, "name": label} for index, label in enumerate(ordered)]


def write_subset_json(path: Path, records: list[dict[str, Any]], target_classes: list[str]) -> None:
    payload = {
        "format": "ChestX-Det-list-subset",
        "categories": category_payload(target_classes, records),
        "records": records,
    }
    path.write_text(json.dumps(payload, indent=2))


def class_counter(records: list[dict[str, Any]]) -> Counter[str]:
    counter: Counter[str] = Counter()
    for record in records:
        counter.update(record.get("syms", []))
    return counter


def main() -> None:
    args = parse_args()
    dataset_root = args.dataset_root.resolve()
    output_root = args.output_root.resolve()
    target_classes = set(args.classes)

    train_json = dataset_root / "ChestX_Det_train.json"
    test_json = dataset_root / "ChestX_Det_test.json"
    train_dir = dataset_root / "train"
    test_dir = dataset_root / "test"

    for required in [train_json, test_json, train_dir, test_dir]:
        if not required.exists():
            raise SystemExit(f"Required dataset path not found: {required}")

    ensure_clean_dir(output_root)

    train_records = load_records(train_json)
    test_records = load_records(test_json)

    selected_train = select_subset(train_records, args.train_limit, args.seed, target_classes)
    selected_test = select_subset(test_records, args.test_limit, args.seed + 1, target_classes)

    kept_train, copied_train, missing_train = materialize_subset(
        split_name="train",
        records=selected_train,
        image_root=train_dir,
        output_root=output_root,
        copy_mode=args.copy_mode,
    )
    kept_test, copied_test, missing_test = materialize_subset(
        split_name="test",
        records=selected_test,
        image_root=test_dir,
        output_root=output_root,
        copy_mode=args.copy_mode,
    )

    write_subset_json(output_root / "ChestX_Det_train_subset.json", kept_train, args.classes)
    write_subset_json(output_root / "ChestX_Det_test_subset.json", kept_test, args.classes)

    train_counts = class_counter(kept_train)
    test_counts = class_counter(kept_test)

    print("ChestX-Det subset creation complete")
    print(f"Dataset root: {dataset_root}")
    print(f"Output root: {output_root}")
    print(f"Target classes: {', '.join(args.classes)}")
    print(f"Copy mode: {args.copy_mode}")
    print(f"Seed: {args.seed}")
    print()
    print(f"Train selected: {len(selected_train)}")
    print(f"Train copied: {copied_train}")
    print(f"Train missing: {missing_train}")
    print(f"Train class counts: {dict(train_counts)}")
    print()
    print(f"Test selected: {len(selected_test)}")
    print(f"Test copied: {copied_test}")
    print(f"Test missing: {missing_test}")
    print(f"Test class counts: {dict(test_counts)}")


if __name__ == "__main__":
    main()
