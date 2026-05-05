from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image


@dataclass
class SplitStats:
    split_name: str
    source_records: int = 0
    written_images: int = 0
    written_labels: int = 0
    written_boxes: int = 0
    missing_images: int = 0
    bad_records: int = 0
    skipped_boxes: int = 0


def parse_args() -> argparse.Namespace:
    project_root = Path(__file__).resolve().parents[3]
    subset_root = project_root / "data" / "subset"
    output_root = project_root / "data" / "prepared" / "chestxdet_yolo"
    yaml_path = project_root / "backend" / "ml" / "configs" / "chestxdet_subset_data.yaml"

    parser = argparse.ArgumentParser(description="Convert ChestX-Det subset annotations to YOLO format.")
    parser.add_argument("--subset-root", type=Path, default=subset_root)
    parser.add_argument("--output-root", type=Path, default=output_root)
    parser.add_argument("--yaml-path", type=Path, default=yaml_path)
    parser.add_argument("--link-mode", choices=("copy", "symlink"), default="copy")
    return parser.parse_args()


def load_subset(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected dict payload in {path}, got {type(payload).__name__}.")
    if "categories" not in payload or "records" not in payload:
        raise ValueError(f"Subset file is missing required keys in {path}.")
    return payload


def build_category_mapping(categories: list[dict[str, Any]]) -> tuple[list[str], dict[str, int]]:
    ordered = sorted(categories, key=lambda item: int(item["id"]))
    class_names = [str(item["name"]) for item in ordered]
    class_to_id = {name: index for index, name in enumerate(class_names)}
    return class_names, class_to_id


def ensure_clean_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    for child in path.iterdir():
        if child.is_dir() and not child.is_symlink():
            shutil.rmtree(child)
        else:
            child.unlink()


def normalize_box(box: list[Any], width: int, height: int) -> list[float] | None:
    if len(box) != 4 or width <= 0 or height <= 0:
        return None

    x1, y1, x2, y2 = [float(value) for value in box]
    x1 = min(max(x1, 0.0), float(width))
    y1 = min(max(y1, 0.0), float(height))
    x2 = min(max(x2, 0.0), float(width))
    y2 = min(max(y2, 0.0), float(height))

    box_width = x2 - x1
    box_height = y2 - y1
    if box_width <= 0 or box_height <= 0:
        return None

    x_center = ((x1 + x2) / 2.0) / width
    y_center = ((y1 + y2) / 2.0) / height
    width_norm = box_width / width
    height_norm = box_height / height
    return [x_center, y_center, width_norm, height_norm]


def link_or_copy(source: Path, destination: Path, link_mode: str) -> None:
    if destination.exists() or destination.is_symlink():
        destination.unlink()

    if link_mode == "symlink":
        destination.symlink_to(source.resolve())
    else:
        shutil.copy2(source, destination)


def write_label_file(path: Path, rows: list[str]) -> None:
    content = "\n".join(rows)
    if rows:
        content += "\n"
    path.write_text(content, encoding="utf-8")


def process_split(
    records: list[dict[str, Any]],
    source_dir: Path,
    images_out: Path,
    labels_out: Path,
    class_to_id: dict[str, int],
    link_mode: str,
    split_name: str,
) -> SplitStats:
    stats = SplitStats(split_name=split_name)

    for record in records:
        stats.source_records += 1
        file_name = record.get("file_name")
        syms = record.get("syms", [])
        boxes = record.get("boxes", [])

        if not isinstance(file_name, str) or not isinstance(syms, list) or not isinstance(boxes, list):
            stats.bad_records += 1
            continue
        if len(syms) != len(boxes):
            stats.bad_records += 1
            continue

        source_image = source_dir / file_name
        if not source_image.exists():
            stats.missing_images += 1
            continue

        try:
            with Image.open(source_image) as image:
                width, height = image.size
        except Exception:
            stats.bad_records += 1
            continue

        rows: list[str] = []
        for label, box in zip(syms, boxes):
            class_id = class_to_id.get(str(label))
            normalized = normalize_box(box, width, height)
            if class_id is None or normalized is None:
                stats.skipped_boxes += 1
                continue
            rows.append(
                f"{class_id} {normalized[0]:.6f} {normalized[1]:.6f} "
                f"{normalized[2]:.6f} {normalized[3]:.6f}"
            )

        if not rows:
            stats.bad_records += 1
            continue

        destination_image = images_out / source_image.name
        destination_label = labels_out / f"{source_image.stem}.txt"

        link_or_copy(source_image, destination_image, link_mode)
        write_label_file(destination_label, rows)

        stats.written_images += 1
        stats.written_labels += 1
        stats.written_boxes += len(rows)

    return stats


def write_data_yaml(path: Path, output_root: Path, class_names: list[str]) -> None:
    yaml = "\n".join(
        [
            f"path: {output_root.resolve()}",
            "train: images/train",
            "val: images/val",
            f"nc: {len(class_names)}",
            "names:",
            *[f"  - {name}" for name in class_names],
            "",
        ]
    )
    path.write_text(yaml, encoding="utf-8")


def main() -> None:
    args = parse_args()
    subset_root = args.subset_root.resolve()
    output_root = args.output_root.resolve()
    yaml_path = args.yaml_path.resolve()

    train_payload = load_subset(subset_root / "ChestX_Det_train_subset.json")
    test_payload = load_subset(subset_root / "ChestX_Det_test_subset.json")

    class_names, class_to_id = build_category_mapping(train_payload["categories"])
    test_class_names, _ = build_category_mapping(test_payload["categories"])
    if class_names != test_class_names:
        raise SystemExit("Train/test subset category mapping does not match.")

    images_train = output_root / "images" / "train"
    images_val = output_root / "images" / "val"
    labels_train = output_root / "labels" / "train"
    labels_val = output_root / "labels" / "val"

    for path in [images_train, images_val, labels_train, labels_val]:
        ensure_clean_dir(path)

    train_stats = process_split(
        records=train_payload["records"],
        source_dir=subset_root / "train",
        images_out=images_train,
        labels_out=labels_train,
        class_to_id=class_to_id,
        link_mode=args.link_mode,
        split_name="train",
    )
    val_stats = process_split(
        records=test_payload["records"],
        source_dir=subset_root / "test",
        images_out=images_val,
        labels_out=labels_val,
        class_to_id=class_to_id,
        link_mode=args.link_mode,
        split_name="val",
    )

    yaml_path.parent.mkdir(parents=True, exist_ok=True)
    write_data_yaml(yaml_path, output_root, class_names)

    print(
        json.dumps(
            {
                "subset_root": str(subset_root),
                "output_root": str(output_root),
                "yaml_path": str(yaml_path),
                "class_names": class_names,
                "train_stats": train_stats.__dict__,
                "val_stats": val_stats.__dict__,
                "link_mode": args.link_mode,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
