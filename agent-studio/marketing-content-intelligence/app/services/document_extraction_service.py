from __future__ import annotations

from io import BytesIO
from typing import Optional, Tuple

try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None

try:
    from docx import Document
except Exception:
    Document = None


class DocumentExtractionError(Exception):
    pass


class DocumentExtractionService:
    def extract_from_bytes(
        self,
        file_name: str,
        file_bytes: bytes,
    ) -> Tuple[str, str]:
        suffix = self._suffix(file_name)

        if suffix in {".txt", ".md"}:
            return self._extract_text(file_bytes), "plain_text"

        if suffix == ".docx":
            return self._extract_docx(file_bytes), "python_docx"

        if suffix == ".pdf":
            return self._extract_pdf(file_bytes), "pymupdf"

        raise DocumentExtractionError(f"Unsupported file type: {suffix}")

    @staticmethod
    def _suffix(file_name: str) -> str:
        parts = file_name.lower().rsplit(".", 1)
        if len(parts) == 2:
            return "." + parts[1]
        return ""

    @staticmethod
    def _extract_text(file_bytes: bytes) -> str:
        text = file_bytes.decode("utf-8", errors="ignore").strip()
        if not text:
            raise DocumentExtractionError("Extracted text is empty")
        return text

    @staticmethod
    def _extract_docx(file_bytes: bytes) -> str:
        if Document is None:
            raise DocumentExtractionError("python-docx is not installed")

        doc = Document(BytesIO(file_bytes))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]
        text = "\n\n".join(paragraphs).strip()

        if not text:
            raise DocumentExtractionError("DOCX extraction returned empty text")

        return text

    @staticmethod
    def _extract_pdf(file_bytes: bytes) -> str:
        if fitz is None:
            raise DocumentExtractionError("PyMuPDF is not installed")

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page_texts = []

        for page in doc:
            text = page.get_text("text")
            if text and text.strip():
                page_texts.append(text.strip())

        final_text = "\n\n".join(page_texts).strip()

        if not final_text:
            raise DocumentExtractionError("PDF extraction returned empty text")

        return final_text