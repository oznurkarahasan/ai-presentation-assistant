# Changelog - July 7, 2026

## Branch
- **Name:** `76-ai-presentation-generation-2`
- **Scope:** Systematic backend cleanup following a full codebase duplication/architecture-debt audit (see `reports/.notes.md` for the complete 9-item backend + 8-item frontend findings list). This report covers the first 5 backend items, tackled one at a time with full verification after each.

## Change Summary
- **7 findings resolved**, each verified independently: syntax check, full `pytest` suite (27/27 passing throughout), Docker container reload with no errors, plus targeted behavioral verification for the riskiest changes (exact error-message diffing, live end-to-end test against the real PostgreSQL + pgvector database, mocked OpenAI round-trips, a real generated-and-reopened `.pptx` file).
- No user-facing API behavior changed except item 1, which makes previously-dead cleanup logic actually run.

## 1. File Cleanup Worker Wired Up (`999e153`)
- **Problem:** `app/services/file_cleanup.py` (139 lines) was entirely dead code — `cleanup_old_files()` and `cleanup_orphaned_files()` were never called from anywhere, so failed uploads and expired guest uploads accumulated on disk indefinitely.
- **Fix:** Added `run_cleanup_worker()` to `file_cleanup.py`, following the exact same background-task pattern already established by `planner_reminder_service.run_reminder_worker()` (loop + `asyncio.sleep` + `CancelledError` handling). Wired into `main.py`'s `lifespan()` alongside the existing reminder worker, with matching graceful-shutdown cancellation. Runs once every 24 hours.
- Removed `cleanup_orphaned_files()` — it was an incomplete stub that only counted and logged files without ever cross-referencing the database or actually deleting anything, despite its name/docstring implying otherwise.
- **Verified:** Docker logs show `"File cleanup worker started"` followed by a real cleanup cycle log line after reload.

## 2. Shared OpenAI Client (`1a795ba`)
- **Problem:** An identical lazy-init `get_client()` / `_client` singleton pattern was copy-pasted in 5 places: `generation_service.py`, `rag_service.py`, `intent_service.py`, `embedding_service.py`, `api/v1/ideas.py` — each with slightly different logging/error-wrapping.
- **Fix:** New `app/core/openai_client.py` with a single `get_openai_client()`. All 5 call sites now do `from app.core.openai_client import get_openai_client as get_client`, so no call-site code changed (`client = get_client()` still works everywhere).
- **Care taken:** `tests/test_intent_service.py` patches `app.services.intent_service.get_client` directly — the `as get_client` re-export preserves this exact patch target, confirmed by the full suite still passing.
- Cleaned up now-unused `AsyncOpenAI`/`settings`/`Optional` imports left behind in each file.

## 3. Shared `get_db()` Dependency (`e8b7ecd`)
- **Problem:** The FastAPI `get_db()` async generator was byte-identical in `auth.py`, `chat.py`, `presentations.py`, and `planner.py`.
- **Fix:** Moved to `app/core/database.py`; all 4 routers now import it from there.
- **Side-effect bug fix:** `tests/conftest.py` had a defensive workaround — because each router previously had its *own* `get_db` function object, the test client fixture had to import and override all 4 separately inside a `try/except ImportError` block (`"These modules might not exist yet"`). Now that all routers import the identical function object from `app.core.database`, a single `app.dependency_overrides[get_db]` covers every router — confirmed via `get_db is g1 is g2 is g3 is g4` inside the running container. Simplified `conftest.py` accordingly (removed ~10 now-redundant lines).

## 4. Shared File-Security Validation (`5aad6e8`)
- **Problem:** `pdf_service.py` and `pptx_service.py` each defined a byte-identical `clean_text()`, plus near-identical `validate_pdf_security()` / `validate_pptx_security()` "bomb protection" checks (item-count cap + average-item-size cap), differing only in wording ("page" vs "slide", "PDF" vs "PPTX").
- **Fix:** New `app/services/file_security.py` with a shared `clean_text()` and a parametrized `validate_item_count_and_size(file_label, item_label, item_count, file_size)`. Each service now calls the shared validator and layers only its own format-specific check on top (PDF keeps its encryption check; PPTX has none).
- **Verified:** Directly diffed the raised `ValidationError` messages against the originals — `"PDF has too many pages (600). Maximum allowed: 500"`, `"PPTX has too many slides (600)..."`, `"PDF file has unusually large pages..."` all match byte-for-byte.

## 5. Consolidated `vector_db.py` Save Functions
- **Problem:** `save_presentation_with_slides()` and `save_ai_presentation_with_slides()` were ~90% duplicate: both create a `Presentation` row, flush, validate slide/embedding count parity, build `Slide` rows, commit, and on any exception roll back and mark the row `FAILED` with the error message.
- **Fix:** Extracted `_save_presentation_with_slides(..., *, file_type, file_size=0, file_hash=None, is_ai_generated=False, ai_content_json=None)` holding the full shared logic. The two public functions are now thin wrappers computing their format-specific args (file size/type from disk for uploads; `FileType.AI` + `is_ai_generated=True` for AI generations) and delegating. Public signatures unchanged — both call sites in `presentations.py` use keyword arguments and needed no changes.
- **Verified end-to-end against the real Postgres + pgvector database** (not just unit-level): ran both code paths live inside the container with real 1536-dim embeddings — non-AI path produced `FileType.PDF, is_ai_generated=False, ai_content_json=None, status=COMPLETED`; AI path produced `FileType.AI, is_ai_generated=True, ai_content_json={...}, status=COMPLETED`. Both matched pre-refactor semantics exactly.

## 6. `ideas.py` Split into Schema + Service
- **Problem:** Every other feature follows a route → service → (schema) layering (`presentations.py` → `generation_service`, `chat.py` → `rag_service`), but `ideas.py` built its OpenAI client, held its system prompts, and called `chat.completions.create` directly inside the route handlers, with all Pydantic models defined inline in the same file. This made the prompt/parsing logic impossible to reuse or test without going through FastAPI.
- **Fix:**
  - New `app/schemas/ideas.py` — moved `TopicIdeasRequest`, `TopicIdea`, `TopicIdeasResponse`, `ChatMessageItem`, `TopicChatRequest`, `TopicChatResponse` out of the route module.
  - New `app/services/ideas_service.py` — moved `SYSTEM_PROMPT`, `CHAT_SYSTEM_PROMPT`, and the two OpenAI-calling functions (`generate_topic_ideas()`, `chat_about_topic()`), each now taking the request schema and returning the response schema directly, matching `generation_service.generate_presentation_state()`'s style.
  - `api/v1/ideas.py` is now a thin route module: auth dependency, delegate to the service, `try/except` → `HTTPException(500)` — same error-handling behavior as before, no upgrade in granularity (kept in scope).
- **Verified:** `POST /api/v1/ideas/topics` without a token still returns `401` (routing intact). With the real `AsyncOpenAI` client mocked out (`unittest.mock.patch`), ran both `ideas_service.generate_topic_ideas()` (JSON-mode response → parsed into `TopicIdea` objects) and `ideas_service.chat_about_topic()` (prompt formatting + message history truncation) end-to-end inside the running container — both produced correct output matching pre-refactor logic exactly.

## 7. Extracted PPTX Export Engine from `presentations.py` God-File
- **Problem:** `presentations.py` was an 825-line route module that, alongside its route handlers, also contained a full private PPTX-generation engine (`_generate_pptx_from_state`, ~185 lines) plus its SSRF-safe image-fetching helpers (`_fetch_image_bytes_safely`, `_is_public_ip`) and a color-conversion helper (`_hex_to_rgb`) — despite `pptx_service.py` already existing specifically for PPTX concerns (until now handling only extraction/preview conversion).
- **Fix:** Moved the entire block (`_ALLOWED_IMAGE_HOSTS`, `_is_public_ip`, `_fetch_image_bytes_safely`, `_hex_to_rgb`, and `_generate_pptx_from_state`, renamed to the public `generate_pptx_from_state`) into `pptx_service.py`. The `export-pptx` route now only does auth, DB fetch, delegates to `pptx_service.generate_pptx_from_state(state)` via `run_in_executor`, and formats the HTTP response (the ASCII/UTF-8 `Content-Disposition` filename logic stayed in the route since that's response formatting, not PPTX generation). `presentations.py` dropped from **825 to 568 lines**.
- **Simplification found along the way:** the moved function used to alias `from pptx import Presentation as PptxPresentation` to avoid colliding with `presentations.py`'s own `Presentation` (the SQLAlchemy model). `pptx_service.py` has no such collision — it already imports the real `pptx.Presentation` at module level for its existing functions — so the alias was dropped in favor of using that import directly.
- **Verified:** the container stopped cleanly mid-step for an unrelated reason (exit code 0, not a crash from this change) and was restarted. After restart: full `pytest` suite 27/27, `export-pptx` route still returns `401` without a token (routing intact), and — the strongest check — **called `pptx_service.generate_pptx_from_state()` directly with a real 3-slide `PresentationState`** (standard/left/background layouts, real Unsplash image URLs) and re-opened the resulting 234KB output with `python-pptx`: correct slide count, correct titles/bullets, correct sequential slide numbers (1, 2, 3), images embedded successfully (confirming the SSRF-guard helpers still work post-move).

## Remaining Work (not yet started)
From the original audit, items 8-9 (backend) and the full frontend list are still open:
- `api/v1/dashboard/planner/planner.py` is the only nested router; should flatten to `api/v1/planner.py`.
- Unused exception classes (`DatabaseError`, `AuthenticationError`, `ResourceNotFoundError`, `RateLimitError`) are never raised; some "not found" cases incorrectly return 400 via `ValidationError` instead of 404.
- Frontend: `PresentationEditor.tsx` god-component, duplicated session-storage parsing, duplicated auth-check boilerplate, duplicated auth-page scaffolding, no shared `types/`, no shared error-message util, repeated spinner markup.

## Verification Summary
Every item in this report was checked with all of the following before being considered done:
1. `python -m ast.parse` on every touched file (syntax).
2. Full backend `pytest` suite — stayed at 27/27 passing after each individual step.
3. Docker container (`presentation_backend`) log inspection after each change to confirm a clean `--reload` with no import errors or tracebacks.
4. Item-specific behavioral checks where the risk warranted it: exact exception-message diffing (item 4), live database round-trip with real embedding dimensions (item 5), mocked-OpenAI-client round-trips through the relocated service functions (item 6), a real generated `.pptx` re-opened and inspected slide-by-slide (item 7), and object-identity assertions (`is`) to confirm shared singletons are genuinely shared (items 2, 3).
