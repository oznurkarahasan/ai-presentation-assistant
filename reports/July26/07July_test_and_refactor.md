# Changelog - July 7, 2026

## Branch
- **Name:** `83-refactor-frontend`
- **Scope:** Systematic cleanup following a full codebase duplication/architecture-debt audit (see `reports/.notes.md` for the complete 9-item backend + 8-item frontend findings list). This report covers all 9 backend items and all 8 frontend items, tackled one at a time with full verification after each.

## Change Summary
- **All 9 backend findings resolved**, each verified independently: syntax check, full `pytest` suite (27/27 passing throughout), Docker container reload with no errors, plus targeted behavioral verification for the riskiest changes (exact error-message diffing, live end-to-end test against the real PostgreSQL + pgvector database, mocked OpenAI round-trips, a real generated-and-reopened `.pptx` file, live `404` checks against a real user).
- **All 8 frontend findings resolved**, each verified with `tsc --noEmit`, `eslint` on every touched file, and live `fetch()` checks against the running dev container for every affected page.
- User-facing API behavior changed in two backend places: item 1 makes previously-dead cleanup logic actually run, and item 9 fixes several endpoints to correctly return `404` instead of `400` for not-found resources. One frontend behavioral fix: the editor's default slides no longer flash in Turkish before switching to the active locale.

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

## 8. Flattened the Nested `planner` Router
- **Problem:** `api/v1/dashboard/planner/planner.py` was the only nested router in the codebase — a 2-level folder for a single file, with an import path that stutters (`from app.api.v1.dashboard.planner import planner`). Investigation showed `dashboard/` used to hold sibling routers too (`library`, `profile`, `sessions` — only `__pycache__` remnants of them remain, no source), meaning the nesting wasn't an intentional design, just leftovers from an earlier, incomplete consolidation.
- **Fix:** `git mv dashboard/planner/planner.py` → `api/v1/planner.py`. Deleted the now-empty `dashboard/` package (both `__init__.py` files, no remaining source). Updated `main.py`'s import to a single line: `from app.api.v1 import auth, presentations, chat, orchestration, ideas, planner`. Route path (`/api/v1/planner/...`) and file contents unchanged — no other file imported the old module path, only the route path (already covered by `tests/test_planner.py`).
- **Verified:** syntax check, full `pytest` suite (27/27), clean container reload (`Application startup complete`, both workers started), and a live `GET /api/v1/planner/events` without a token returning `401` (routing intact).

## 9. Fixed Misused Exceptions: Wrong Status Codes + Dead Classes
- **Problem:** `app/core/exceptions.py` defined `DatabaseError`, `AuthenticationError`, `ResourceNotFoundError`, and `RateLimitError`, but none of them were ever raised anywhere in the codebase. Worse, `ResourceNotFoundError` already had a correct handler registered in `main.py` (→ 404), yet 7 "not found" cases in `presentations.py` (`get_presentation`, `get_ai_presentation_state`, `update_ai_presentation_state`, `export_ai_presentation_pptx`, `update_presentation_title`, `delete_presentation`, and session deletion) all raised `ValidationError` instead, incorrectly returning `400 Bad Request` for what should be `404 Not Found`. This was inconsistent with `auth.py`, `chat.py`, and `planner.py`, which already used the correct `404` status for their own not-found cases.
- **Fix:**
  - Replaced all 7 `raise ValidationError("... not found")` call sites in `presentations.py` with `raise ResourceNotFoundError(...)`, now correctly wired to the existing `404` handler.
  - Deleted `DatabaseError`, `AuthenticationError`, and `RateLimitError` from `exceptions.py` — confirmed via full-codebase grep that none were raised or imported anywhere (the same names imported in `presentations.py` from the `openai` package are unrelated third-party classes for OpenAI API errors, not these custom ones). Removed the now-unused `DatabaseError` handler and import from `main.py`.
- **Verified:** full `pytest` suite (27/27), clean container reload, and live end-to-end checks against a real registered/logged-in user: `GET`, `PATCH`, and `DELETE` on a nonexistent presentation ID now return `404` with the correct `detail` message (previously `400`); nonexistent AI-state and nonexistent session deletion also confirmed `404`.

---

# Frontend

## 1. Split the `PresentationEditor.tsx` God-Component
- **Problem:** 851 lines holding session-storage parsing, autosave/debounce, the image-picker modal (~110 lines of JSX), the toast system, zoom/fullscreen state, and every slide-mutation handler, all in one file.
- **Fix:** Extracted into focused pieces: `app/lib/editorDefaults.ts` (default slides + session-storage read/write), `app/hooks/useAutoSave.ts`, `app/hooks/useToast.ts` + `app/components/EditorToast.tsx`, `app/hooks/useZoomFullscreen.ts`, `app/components/ImagePickerModal.tsx` (self-contained, owns its own image-library fetch/cache), `app/hooks/useSlideMutations.ts` (all 11 slide CRUD handlers). `PresentationEditor.tsx` dropped from **851 to 295 lines** and is now mostly hook calls + JSX composition.
- **Verified:** `tsc --noEmit` and `eslint` clean; live `GET /editor` (both with and without a `presentationId`) rendered successfully with no runtime errors.

## 2. Deduplicated Session-Storage `JSON.parse` (4x → 1x)
- **Problem:** The same `sessionStorage.getItem('precue_generated_presentation')` key was parsed independently in 4 places in the original file (three lazy `useState` initializers plus a mount `useEffect`), each with its own try/catch.
- **Fix:** `readStoredPresentation()` in `editorDefaults.ts` parses it once; `PresentationEditor.tsx` calls it once via `useMemo` and derives `slides`/`selectedSlideId`/`metadata` from the single result.

## 3. Removed the Duplicate Hardcoded-vs-Localized Default Slides
- **Problem:** `DEFAULT_SLIDES` (a hardcoded Turkish 5-slide array) and a `buildLocalizedDefaultSlides(t)` function built from translation keys defined the *same* 5 slides twice. Worse, the original code rendered the hardcoded Turkish version first, then a mount effect silently swapped in the localized version a moment later — a visible flash of Turkish content for non-Turkish users.
- **Fix:** Deleted `DEFAULT_SLIDES` entirely. Since `t` from `useTranslations` is already resolved synchronously when the component runs, the lazy `useState` initializer calls `buildLocalizedDefaultSlides(t)` directly — correct content from the very first render, no swap effect needed.
- **Verified:** live-fetched `/editor`, confirmed no raw translation keys leaked into the HTML and the correct localized title rendered immediately.

## 4. Shared `useRequireAuth()` Hook
- **Problem:** "Check for a token, redirect if missing" was hand-rolled in `analyze/page.tsx`, `(ai-presentation)/editor/page.tsx`, and `DashboardContext.tsx` (three different redirect targets, one with a stricter `'undefined'`/`'null'`/`''` string check). Two more files (`AiGenerationForm.tsx`, `upload/page.tsx`) had a similar but *pre-flight* (not page-gate) shape. Note: the original audit also named `presentation/[id]/page.tsx`, but investigation showed its `access_token` read is for a WebSocket auth query param, not a page guard — left untouched.
- **Fix:** New `app/hooks/useRequireAuth.ts` exporting `useRequireAuth(redirectTo)` (page-gate, returns `isChecking`) and `hasValidAccessToken()` (raw check, for the two pre-flight call sites). In `editor/page.tsx`, the auth check was previously entangled with "has the presentation loaded" — separated into `isCheckingAuth` (from the hook) and its own `isPresentationReady` state.
- **Verified:** live-fetched `/analyze`, `/editor`, `/dashboard`, `/upload` — all 200, no errors; the SSR-hydration-safe `setState`-in-effect pattern needed the same lint exception the codebase already used for this exact case in `editor/page.tsx`.

## 5. `AuthCard` / `FormField` / `AlertBanner` for Login & Register
- **Problem:** `login/page.tsx` (222 lines) and `register/page.tsx` (271 lines) copy-pasted the entire visual skeleton — header, bordered card, labeled-icon input rows, success/error banners.
- **Fix:** New `app/components/auth/AuthCard.tsx` (wrapper + header + card, with `banner`/`footer` slots and a `cardClassName` override for login's `p-8` vs register's `p-6`), `AlertBanner.tsx` (success/error variant, self-contained `AnimatePresence`), `FormField.tsx` (icon + label + input, with a `labelExtra` slot for login's "forgot password" link). `login/page.tsx` → 175 lines, `register/page.tsx` → 196 lines.

## 6. Shared `getErrorMessage()` Axios-Error Util
- **Problem:** The exact "network error / 5xx / response detail / no-response" chain was hand-parsed in 11 places: login, register, forgot-password, reset-password, `AiGenerationForm.tsx`, `upload/page.tsx`, and **5 near-identical blocks in `Profile.tsx`** alone (email verification, email confirm, profile update, password update, account deletion).
- **Fix:** `app/lib/getErrorMessage.ts`, using `axios.isAxiosError()` as the type guard (more robust than the original files' hand-rolled duck-typing). Applied at all 11 sites; `upload/page.tsx` keeps its 401-specific "guest auth required" branch, delegating to the shared util only for the general case. `dashboard/page.tsx`'s status-code-to-i18n-key mapping was deliberately left alone — different concern (doesn't read `detail` from the response body).
- **Verified:** `Profile.tsx`'s now-unused `axios` import was removed; live-fetched all 6 affected pages plus `/dashboard?tab=profile`.

## 7. Consolidated Loading-Spinner Markup
- **Problem:** Raw spinner `<div>`s hand-copied with minor size/color drift across ~8 places.
- **Fix:** `app/components/Spinner.tsx` exports `Spinner` (the colored-ring-with-transparent-top pattern — `size`, `borderColorClassName`, `colorHex` props) applied in `analyze/page.tsx`, `PresentationViewer.tsx`, `AiSlidePreview.tsx` (dynamic runtime color), `ImagePickerModal.tsx`; and `ButtonSpinner` (the inverse-contrast white-ring pattern, zero props since it was byte-identical in all 4 places) applied in login/register/forgot-password/reset-password. The `editor/page.tsx` full-page double-layer spinner was left as-is — visually distinct (border-4, two nested layers) and single-use, not worth the extra prop surface.

## 8. Shared `types/` Folder
- **Problem:** Of 23 files with `interface` declarations, most were legitimate component-local Props (correct to keep local); the one genuine overlap was `PresentationSlide` (`SlideList.tsx`) and `AiSlide` (`AiSlidePreview.tsx`) — the same shape, drifted (`content_type: SlideLayoutId` vs a loose `string`; a narrower inline `image` type on `AiSlide`).
- **Fix:** New `app/types/presentation.ts` with the canonical `SlideImage`, `PresentationSlide`, `PresentationMetadata`. Deleted `AiSlide` entirely — `AiSlidePreview.tsx` and `usePresentationData.ts` now use `PresentationSlide`. Updated all 5 files that imported the old component-local versions (`editorDefaults.ts`, `SlideCanvas.tsx`, `PresentationEditor.tsx`, `useSlideMutations.ts`, `useAutoSave.ts`) to import from the shared location directly — no re-export shims left behind. `DashboardContext.tsx`'s existing role as the de facto shared source for `UserProfile`/`RecentPresentation`/`RecentSession` (already correctly reused by `Library.tsx`/`Sessions.tsx`) was left untouched.
- **Verified:** `tsc --noEmit` passed with 0 errors — confirms the stricter `SlideLayoutId` typing (replacing `AiSlide`'s loose `string`) didn't break any existing call site.

## Verification Summary

**Backend** — every item checked with:
1. `python -m ast.parse` on every touched file (syntax).
2. Full backend `pytest` suite — stayed at 27/27 passing after each individual step.
3. Docker container (`presentation_backend`) log inspection after each change to confirm a clean `--reload` with no import errors or tracebacks.
4. Item-specific behavioral checks where the risk warranted it: exact exception-message diffing (item 4), live database round-trip with real embedding dimensions (item 5), mocked-OpenAI-client round-trips through the relocated service functions (item 6), a real generated `.pptx` re-opened and inspected slide-by-slide (item 7), live routing check after the module flatten (item 8), and live end-to-end `404` verification against a real registered user for every fixed not-found case (item 9).

**Frontend** — every item checked with:
1. `npx tsc --noEmit` inside the running `presentation_frontend` container — 0 errors after every step.
2. `npx eslint` on every new/modified file — 0 errors after every step (two issues surfaced and were fixed along the way: a `react-hooks/set-state-in-effect` violation in `ImagePickerModal.tsx`'s search-reset logic, resolved with React's "adjust state during render" pattern; the same rule in `useRequireAuth.ts`, resolved with the same lint exception the codebase already uses for this SSR-hydration-safe case in `editor/page.tsx`).
3. A live `fetch()` from inside the container against every affected route after each step, checking for `200` status and the absence of Next.js error-page markers.
4. Docker container log inspection for tracebacks after each change; the container stopped once mid-session for an unrelated reason (clean exit code 0) and was restarted.
