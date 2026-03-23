import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

from app.core.logger import logger


_locks: Dict[str, asyncio.Lock] = {}


def _get_lock(presentation_id: str) -> asyncio.Lock:
    lock = _locks.get(presentation_id)
    if lock is None:
        lock = asyncio.Lock()
        _locks[presentation_id] = lock
    return lock


def _subtitle_directory() -> Path:
    backend_root = Path(__file__).resolve().parents[2]
    return backend_root / "uploaded_files" / "subtitles"


def _subtitle_file_path(presentation_id: str) -> Path:
    return _subtitle_directory() / f"presentation_{presentation_id}_subtitles.json"


async def append_subtitle(
    presentation_id: str,
    original_text: str,
    translated_text: str,
    source_language: str | None = None,
    target_language: str | None = None,
) -> str:
    cleaned_original = original_text.strip()
    cleaned_translated = translated_text.strip()

    if not cleaned_original:
        return ""

    subtitle_dir = _subtitle_directory()
    subtitle_dir.mkdir(parents=True, exist_ok=True)
    subtitle_path = _subtitle_file_path(presentation_id)

    subtitle_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "original_text": cleaned_original,
        "translated_text": cleaned_translated,
        "source_language": source_language,
        "target_language": target_language,
    }

    lock = _get_lock(presentation_id)
    async with lock:
        payload = {
            "presentation_id": presentation_id,
            "captions": []
        }

        if subtitle_path.exists():
            try:
                payload = json.loads(subtitle_path.read_text(encoding="utf-8"))
            except Exception as exc:
                logger.warning(
                    f"Subtitle JSON could not be parsed for presentation {presentation_id}: {exc}. Reinitializing file."
                )

        captions = payload.get("captions")
        if not isinstance(captions, list):
            payload["captions"] = []

        payload.setdefault("presentation_id", presentation_id)
        payload["captions"].append(subtitle_entry)

        subtitle_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    return str(subtitle_path)