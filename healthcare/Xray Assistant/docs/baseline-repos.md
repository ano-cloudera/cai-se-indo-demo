# Baseline Repositories

## Project Paths

- Project root: `healthcare/Xray Assistant`
- Backend root: `healthcare/Xray Assistant/backend`
- References root: `healthcare/Xray Assistant/references`

## Cloned Repositories

### 1. Ultralytics

- Repo name: `ultralytics`
- Upstream: `https://github.com/ultralytics/ultralytics`
- Local path: `healthcare/Xray Assistant/references/ultralytics`
- Purpose in this project:
  Baseline framework and reference implementation for YOLO11 model loading, prediction flow, model configs, and future adapter work for X-ray detection in local development before Cloudera AI deployment.

Key areas:

- `ultralytics/engine/`
  Core engine lifecycle, including generic prediction and results handling.
- `ultralytics/models/yolo/detect/`
  Detection-task specific predict, train, and validation entry points.
- `ultralytics/data/`
  Dataset loaders, builders, converters, and data utilities.
- `ultralytics/cfg/models/11/`
  YOLO11 model configuration files.
- `examples/`
  Reference usage patterns and inference examples.

Inference-related code likely lives in:

- `ultralytics/engine/predictor.py`
- `ultralytics/engine/model.py`
- `ultralytics/models/yolo/detect/predict.py`

### 2. ChestX-Det-Dataset

- Repo name: `ChestX-Det-Dataset`
- Upstream: `https://github.com/Deepwise-AILab/ChestX-Det-Dataset`
- Local path: `healthcare/Xray Assistant/references/ChestX-Det-Dataset`
- Purpose in this project:
  Chest X-ray specific reference dataset structure and annotation source for later dataset adaptation, label mapping, and evaluation planning.

Key areas:

- `ChestX_Det_train.json`
  Training annotations in repository root.
- `ChestX_Det_test.json`
  Test annotations in repository root.
- `pre-trained_PSPNet/`
  Reference segmentation-related code released by the dataset authors.
- `README.md`
  Dataset description, class list, annotation format, and external image download links.

Dataset annotations/files are located in:

- `healthcare/Xray Assistant/references/ChestX-Det-Dataset/ChestX_Det_train.json`
- `healthcare/Xray Assistant/references/ChestX-Det-Dataset/ChestX_Det_test.json`

Notes:

- The repository contains annotation metadata, but image files are downloaded separately from the links documented in the upstream `README.md`.
- No dataset files were copied into `backend/`.

## Safety Notes

- Upstream repositories were kept under `references/` only.
- No upstream code was modified.
- No model training or inference integration was implemented.
- An incomplete first clone attempt for `ultralytics` was preserved at:
  `healthcare/Xray Assistant/references/ultralytics.partial-20260504`
