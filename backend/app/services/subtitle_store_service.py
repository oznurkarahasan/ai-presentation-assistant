import asyncio
import json
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

    lock = _get_lock(presentation_id)
    async with lock:
        english_text = ""
        turkish_text = ""

        if subtitle_path.exists():
            try:
                payload = json.loads(subtitle_path.read_text(encoding="utf-8"))

                if isinstance(payload, dict):
                    existing_english = payload.get("english_text")
                    existing_turkish = payload.get("turkish_text")

                    if isinstance(existing_english, str):
                        english_text = existing_english.strip()
                    if isinstance(existing_turkish, str):
                        turkish_text = existing_turkish.strip()

                    # Backward-compatibility migration from old structure
                    captions = payload.get("captions")
                    if isinstance(captions, list):
                        migrated_english: list[str] = []
                        migrated_turkish: list[str] = []
                        for entry in captions:
                            if not isinstance(entry, dict):
                                continue
                            entry_original = (entry.get("original_text") or "").strip()
                            entry_translated = (entry.get("translated_text") or "").strip()
                            entry_source = (entry.get("source_language") or "").strip().lower()
                            entry_target = (entry.get("target_language") or "").strip().lower()

                            if entry_source == "english":
                                if entry_original:
                                    migrated_english.append(entry_original)
                                if entry_translated:
                                    migrated_turkish.append(entry_translated)
                            elif entry_source == "turkish":
                                if entry_original:
                                    migrated_turkish.append(entry_original)
                                if entry_translated:
                                    migrated_english.append(entry_translated)
                            else:
                                if entry_target == "turkish":
                                    if entry_original:
                                        migrated_english.append(entry_original)
                                    if entry_translated:
                                        migrated_turkish.append(entry_translated)
                                elif entry_target == "english":
                                    if entry_original:
                                        migrated_turkish.append(entry_original)
                                    if entry_translated:
                                        migrated_english.append(entry_translated)

                        if migrated_english and not english_text:
                            english_text = " ".join(migrated_english).strip()
                        if migrated_turkish and not turkish_text:
                            turkish_text = " ".join(migrated_turkish).strip()

                    # Fallback migration from previous aggregated keys
                    if not english_text and isinstance(payload.get("full_original_text"), str) and (source_language or "").strip().lower() == "english":
                        english_text = payload["full_original_text"].strip()
                    if not turkish_text and isinstance(payload.get("full_translated_text"), str) and (target_language or "").strip().lower() == "turkish":
                        turkish_text = payload["full_translated_text"].strip()

            except Exception as exc:
                logger.warning(
                    f"Subtitle JSON could not be parsed for presentation {presentation_id}: {exc}. Reinitializing file."
                )

        source = (source_language or "").strip().lower()
        target = (target_language or "").strip().lower()

        if source == "english":
            english_text = (f"{english_text} {cleaned_original}" if english_text else cleaned_original).strip()
            if cleaned_translated:
                turkish_text = (f"{turkish_text} {cleaned_translated}" if turkish_text else cleaned_translated).strip()
        elif source == "turkish":
            turkish_text = (f"{turkish_text} {cleaned_original}" if turkish_text else cleaned_original).strip()
            if cleaned_translated:
                english_text = (f"{english_text} {cleaned_translated}" if english_text else cleaned_translated).strip()
        elif target == "turkish":
            english_text = (f"{english_text} {cleaned_original}" if english_text else cleaned_original).strip()
            if cleaned_translated:
                turkish_text = (f"{turkish_text} {cleaned_translated}" if turkish_text else cleaned_translated).strip()
        elif target == "english":
            turkish_text = (f"{turkish_text} {cleaned_original}" if turkish_text else cleaned_original).strip()
            if cleaned_translated:
                english_text = (f"{english_text} {cleaned_translated}" if english_text else cleaned_translated).strip()

        payload = {
            "english_text": english_text,
            "turkish_text": turkish_text,
        }

        subtitle_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    return str(subtitle_path)