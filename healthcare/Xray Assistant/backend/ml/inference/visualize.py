from pathlib import Path


def generate_annotated_image(image_path: str, detections: list[dict], output_dir: str) -> str | None:
    if not detections:
        return None

    try:
        import cv2
    except ImportError:
        return None

    image = cv2.imread(image_path)
    if image is None:
        return None

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    annotated_path = output_path / f"{Path(image_path).stem}_annotated{Path(image_path).suffix}"

    for detection in detections:
        bbox = detection.get("bbox", [])
        if len(bbox) != 4:
            continue

        x1, y1, x2, y2 = (int(value) for value in bbox)
        label = detection.get("label", "unknown")
        confidence = float(detection.get("confidence", 0.0))
        caption = f"{label} {confidence:.2f}"

        cv2.rectangle(image, (x1, y1), (x2, y2), (0, 180, 0), 2)
        cv2.putText(
            image,
            caption,
            (x1, max(y1 - 10, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 180, 0),
            2,
            cv2.LINE_AA,
        )

    cv2.imwrite(str(annotated_path), image)
    return str(annotated_path)
