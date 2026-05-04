from __future__ import annotations

import argparse
import json
import os
import shutil
from dataclasses import dataclass
from pathlib import Path

from PIL import Image


@dataclass
class SplitStats:
    split_name: str
    total_records: int = 0
    prepared_images: int = 0
    empty_label_images: int = 0
    prepared_boxes: int = 0
    missing_images: int = 0
    skipped_records: int = 0
    skipped_boxes: int = 0


def parse_args() -> argparse.Namespace:
    script_path = Path(__file__).resolve()
    backend_root = script_path.parents[2]
    project_root = backend_root.parent
    dataset_root = project_root / "references" / "ChestX-Det-Dataset"
    output_root = backend_root / "data" / "prepared" / "chestxdet_yolo"

    parser = argparse.ArgumentParser(description="Prepare ChestX-Det annotations into YOLO detection format.")
    parser.add_argument("--dataset-root", type=Path, default=dataset_root)
    parser.add_argument("--train-images-dir", type=Path, default=None)
    parser.add_argument("--val-images-dir", type=Path, default=None)
    parser.add_argument("--output-root", type=Path, default=output_root)
    parser.add_argument("--link-mode", choices=("symlink", "copy"), default="symlink")
    return parser.parse_args()


def load_annotations(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def detect_class_names(*annotation_groups: list[dict]) -> list[str]:
    names: set[str] = set()
    for annotations in annotation_groups:
        for item in annotations:
            names.update(item.get("syms", []) or [])
    return sorted(names)


def ensure_structure(output_root: Path) -> None:
    for relative_path in (
        "images/train",
        "images/val",
        "labels/train",
        "labels/val",
    ):
        (output_root / relative_path).mkdir(parents=True, exist_ok=True)


def resolve_image_dirs(dataset_root: Path, train_images_dir: Path | None, val_images_dir: Path | None) -> tuple[Path, Path]:
    train_dir = train_images_dir or dataset_root / "train_data"
    val_dir = val_images_dir or dataset_root / "test_data"
    missing = [str(path) for path in (train_dir, val_dir) if not path.exists()]
    if missing:
        missing_list = ", ".join(missing)
        raise SystemExit(
            f"Missing image directories: {missing_list}. "
            "Download and extract ChestX-Det train_data.zip/test_data.zip first, "
            "or pass --train-images-dir and --val-images-dir explicitly."
        )
    return train_dir, val_dir


def normalize_box(box: list[float], width: int, height: int) -> list[float] | None:
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

    x_center = (x1 + x2) / 2.0 / width
    y_center = (y1 + y2) / 2.0 / height
    normalized_width = box_width / width
    normalized_height = box_height / height
    return [x_center, y_center, normalized_width, normalized_height]


def link_or_copy_image(source: Path, destination: Path, link_mode: str) -> None:
    if destination.exists() or destination.is_symlink():
        destination.unlink()

    if link_mode == "symlink":
        destination.symlink_to(source.resolve())
        return

    shutil.copy2(source, destination)


def write_label_file(path: Path, rows: list[str]) -> None:
    content = "\n".join(rows)
    if rows:
        content += "\n"
    path.write_text(content, encoding="utf-8")


def process_split(
    annotations: list[dict],
    image_dir: Path,
    output_root: Path,
    split_name: str,
    class_to_id: dict[str, int],
    link_mode: str,
) -> SplitStats:
    stats = SplitStats(split_name=split_name)
    images_out = output_root / "images" / split_name
    labels_out = output_root / "labels" / split_name

    for item in annotations:
        stats.total_records += 1
        file_name = item.get("file_name")
        if not file_name:
            stats.skipped_records += 1
            continue

        source_image = image_dir / file_name
        if not source_image.exists():
            stats.missing_images += 1
            continue

        try:
            with Image.open(source_image) as image:
                width, height = image.size
        except Exception:
            stats.skipped_records += 1
            continue

        rows: list[str] = []
        boxes = item.get("boxes", []) or []
        syms = item.get("syms", []) or []

        if len(boxes) != len(syms):
            stats.skipped_boxes += abs(len(boxes) - len(syms))

        for label, box in zip(syms, boxes):
            class_id = class_to_id.get(label)
            normalized_box = normalize_box(box, width, height)
            if class_id is None or normalized_box is None:
                stats.skipped_boxes += 1
                continue
            rows.append(
                f"{class_id} "
                f"{normalized_box[0]:.6f} {normalized_box[1]:.6f} "
                f"{normalized_box[2]:.6f} {normalized_box[3]:.6f}"
            )

        destination_image = images_out / source_image.name
        label_path = labels_out / f"{source_image.stem}.txt"
        link_or_copy_image(source_image, destination_image, link_mode)
        write_label_file(label_path, rows)

        stats.prepared_images += 1
        stats.prepared_boxes += len(rows)
        if not rows:
            stats.empty_label_images += 1

    return stats


def write_data_yaml(path: Path, output_root: Path, class_names: list[str]) -> None:
    yaml_content = "\n".join(
        [
            f"path: {output_root.resolve()}",
            "train: images/train",
            "val: images/val",
            f"nc: {len(class_names)}",
            f"names: {class_names}",
            "",
        ]
    )
    path.write_text(yaml_content, encoding="utf-8")


def main() -> None:
    args = parse_args()
    script_path = Path(__file__).resolve()
    backend_root = script_path.parents[2]
    dataset_root = args.dataset_root.resolve()
    output_root = args.output_root.resolve()
    ensure_structure(output_root)

    train_annotations = load_annotations(dataset_root / "ChestX_Det_train.json")
    val_annotations = load_annotations(dataset_root / "ChestX_Det_test.json")
    class_names = detect_class_names(train_annotations, val_annotations)
    class_to_id = {name: index for index, name in enumerate(class_names)}

    train_image_dir, val_image_dir = resolve_image_dirs(
        dataset_root=dataset_root,
        train_images_dir=args.train_images_dir.resolve() if args.train_images_dir else None,
        val_images_dir=args.val_images_dir.resolve() if args.val_images_dir else None,
    )

    train_stats = process_split(
        annotations=train_annotations,
        image_dir=train_image_dir,
        output_root=output_root,
        split_name="train",
        class_to_id=class_to_id,
        link_mode=args.link_mode,
    )
    val_stats = process_split(
        annotations=val_annotations,
        image_dir=val_image_dir,
        output_root=output_root,
        split_name="val",
        class_to_id=class_to_id,
        link_mode=args.link_mode,
    )

    config_path = backend_root / "ml" / "configs" / "chestxdet_data.yaml"
    write_data_yaml(config_path, output_root, class_names)

    summary = {
        "dataset_root": str(dataset_root),
        "train_images_dir": str(train_image_dir),
        "val_images_dir": str(val_image_dir),
        "output_root": str(output_root),
        "class_names": class_names,
        "train_stats": train_stats.__dict__,
        "val_stats": val_stats.__dict__,
    }
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
