"""
Shared text-cleaning and "bomb" security validation used by both pdf_service
and pptx_service — their per-page/per-slide checks and extracted-text
cleanup were previously duplicated almost verbatim in each file.
"""
import re

from app.core.exceptions import ValidationError
from app.core.logger import logger

MAX_ITEMS = 500           # max pages (PDF) / slides (PPTX)
MAX_ITEM_SIZE_KB = 5000   # 5MB per page/slide, average


def clean_text(text: str) -> str:
    """Removes null bytes/control characters and normalizes whitespace in extracted text."""
    text = text.replace('\x00', '')
    text = re.sub(r'[\x01-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def validate_item_count_and_size(
    *,
    file_label: str,
    item_label: str,
    item_count: int,
    file_size: int,
) -> None:
    """
    Bomb-protection: caps the number of pages/slides and flags a suspiciously
    large average page/slide size (a hallmark of decompression bombs).

    Raises:
        ValidationError: if the file fails either check.
    """
    if item_count > MAX_ITEMS:
        logger.warning(f"{file_label} has too many {item_label}s: {item_count}")
        raise ValidationError(
            f"{file_label} has too many {item_label}s ({item_count}). Maximum allowed: {MAX_ITEMS}"
        )

    avg_item_size = file_size / item_count if item_count > 0 else 0
    if avg_item_size > MAX_ITEM_SIZE_KB * 1024:
        logger.warning(f"{file_label} has suspicious {item_label} size: {avg_item_size / 1024:.2f}KB per {item_label}")
        raise ValidationError(
            f"{file_label} file has unusually large {item_label}s. This may be a malicious file."
        )

    logger.debug(f"{file_label} security validation passed: {item_count} {item_label}s, {file_size / 1024:.2f}KB")
