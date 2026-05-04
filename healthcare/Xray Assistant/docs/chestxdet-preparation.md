# ChestX-Det Preparation

## Source Dataset

- Dataset repo: `healthcare/Xray Assistant/references/ChestX-Det-Dataset`
- Annotation files:
  - `healthcare/Xray Assistant/references/ChestX-Det-Dataset/ChestX_Det_train.json`
  - `healthcare/Xray Assistant/references/ChestX-Det-Dataset/ChestX_Det_test.json`
- Expected image directories after extracting upstream zips:
  - `healthcare/Xray Assistant/references/ChestX-Det-Dataset/train_data`
  - `healthcare/Xray Assistant/references/ChestX-Det-Dataset/test_data`

## Prepared Output

- YOLO output root: `healthcare/Xray Assistant/backend/data/prepared/chestxdet_yolo`
- YOLO config: `healthcare/Xray Assistant/backend/ml/configs/chestxdet_data.yaml`
- Conversion script: `healthcare/Xray Assistant/backend/ml/training/prepare_chestxdet_yolo.py`

## Class Names

- Atelectasis
- Calcification
- Cardiomegaly
- Consolidation
- Diffuse Nodule
- Effusion
- Emphysema
- Fibrosis
- Fracture
- Mass
- Nodule
- Pleural Thickening
- Pneumothorax

## What Was Found

- Train annotation records: `3025`
- Val/Test annotation records: `553`
- Total labeled boxes found in JSON: `9639`
- Non-empty annotated records: `2967`

## Image Availability

- Image files were **not present** in the cloned dataset repository at preparation time.
- The upstream repository only contains annotation JSON and documentation; image archives must be downloaded separately from the links in the upstream `README.md`.
- Because images were missing, the prepared YOLO folder structure was created, but train/val image and label counts are currently `0`.

## Current Prepared Counts

- `images/train`: `0`
- `images/val`: `0`
- `labels/train`: `0`
- `labels/val`: `0`
- Skipped items during actual conversion: not yet computed because the conversion script has not been run against extracted image directories.

## Notes

- The script uses the dataset's existing split directly:
  - `ChestX_Det_train.json` -> YOLO `train`
  - `ChestX_Det_test.json` -> YOLO `val`
- Image linking defaults to symlinks to avoid duplicating the dataset during local development.
