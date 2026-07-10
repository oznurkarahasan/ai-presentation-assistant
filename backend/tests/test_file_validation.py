"""
Unit tests for the file upload security layer:
- app.services.file_validator (magic-byte type detection, hashing)
- app.services.file_security (text cleanup, decompression-bomb guards)

These guard the only unauthenticated-adjacent attack surface in the app
(anyone with an account can upload arbitrary bytes), so extension spoofing
and bomb-style payloads need explicit coverage.
"""
import os
import tempfile

import pytest

from app.core.exceptions import ValidationError
from app.services import file_validator, file_security


# --- file_validator.validate_file_type -----------------------------------

def test_validate_file_type_accepts_real_pdf_magic_bytes():
    content = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< >>\nendobj"
    mime = file_validator.validate_file_type(content, "deck.pdf")
    assert mime == "application/pdf"


def test_validate_file_type_accepts_real_pptx_magic_bytes():
    content = b"PK\x03\x04" + b"\x00" * 32
    mime = file_validator.validate_file_type(content, "deck.pptx")
    assert mime == "application/vnd.openxmlformats-officedocument.presentationml.presentation"


def test_validate_file_type_rejects_plain_text_content():
    content = b"just some plain text, not a real document"
    with pytest.raises(ValidationError):
        file_validator.validate_file_type(content, "deck.pdf")


def test_validate_file_type_rejects_spoofed_extension():
    """A file named `.pdf` whose bytes are actually an executable must be rejected —
    extension alone is not a trustworthy signal."""
    content = b"MZ\x90\x00\x03\x00\x00\x00"  # Windows PE/EXE magic bytes
    with pytest.raises(ValidationError):
        file_validator.validate_file_type(content, "totally-a-pdf.pdf")


def test_validate_file_type_rejects_empty_content():
    with pytest.raises(ValidationError):
        file_validator.validate_file_type(b"", "empty.pdf")


def test_validate_file_type_rejects_html_masquerading_as_pdf():
    """Guards against HTML/script payloads (e.g. stored-XSS-via-preview attempts)
    uploaded with a .pdf extension."""
    content = b"<html><script>alert(1)</script></html>"
    with pytest.raises(ValidationError):
        file_validator.validate_file_type(content, "innocuous.pdf")


# --- file_validator.calculate_file_hash -----------------------------------

def test_calculate_file_hash_is_deterministic():
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(b"same content")
        path = f.name
    try:
        assert file_validator.calculate_file_hash(path) == file_validator.calculate_file_hash(path)
    finally:
        os.remove(path)


def test_calculate_file_hash_differs_for_different_content():
    with tempfile.NamedTemporaryFile(delete=False) as f1:
        f1.write(b"content A")
        path1 = f1.name
    with tempfile.NamedTemporaryFile(delete=False) as f2:
        f2.write(b"content B")
        path2 = f2.name
    try:
        assert file_validator.calculate_file_hash(path1) != file_validator.calculate_file_hash(path2)
    finally:
        os.remove(path1)
        os.remove(path2)


# --- file_security.clean_text ---------------------------------------------

def test_clean_text_strips_null_bytes():
    assert "\x00" not in file_security.clean_text("hello\x00world")


def test_clean_text_strips_control_characters():
    dirty = "hello\x01\x02\x1fworld"
    cleaned = file_security.clean_text(dirty)
    assert cleaned == "helloworld"


def test_clean_text_collapses_whitespace_and_trims():
    assert file_security.clean_text("  hello    world  \n\t ") == "hello world"


def test_clean_text_preserves_normal_unicode_text():
    assert file_security.clean_text("Türkçe metin örneği") == "Türkçe metin örneği"


# --- file_security.validate_item_count_and_size (decompression-bomb guard) --

def test_validate_item_count_and_size_passes_for_normal_file():
    # 20 pages, 20KB average — well within limits.
    file_security.validate_item_count_and_size(
        file_label="PDF", item_label="page", item_count=20, file_size=20 * 1024,
    )


def test_validate_item_count_and_size_rejects_too_many_items():
    with pytest.raises(ValidationError):
        file_security.validate_item_count_and_size(
            file_label="PDF", item_label="page",
            item_count=file_security.MAX_ITEMS + 1,
            file_size=1024,
        )


def test_validate_item_count_and_size_rejects_suspiciously_large_average_item():
    """Hallmark of a decompression bomb: tiny page count but huge average size."""
    with pytest.raises(ValidationError):
        file_security.validate_item_count_and_size(
            file_label="PPTX", item_label="slide",
            item_count=1,
            file_size=(file_security.MAX_ITEM_SIZE_KB + 1) * 1024,
        )


def test_validate_item_count_and_size_handles_zero_items():
    # Should not raise a ZeroDivisionError.
    file_security.validate_item_count_and_size(
        file_label="PDF", item_label="page", item_count=0, file_size=0,
    )
