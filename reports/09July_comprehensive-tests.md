# Changelog - July 9, 2026

## Branch
- **Name:** `development`
- **Scope:** Backend test coverage audit and expansion. Reviewed the existing `backend/tests/` suite, identified untested security- and correctness-critical surface area, and added 4 new test files targeting the highest-value gaps: the entire `/presentations` router (previously untested), JWT/password primitives, file-upload validation, and PPTX-export SSRF guards.

## Starting State
Existing suite (27 tests, all still passing): `test_auth.py` (register/login/profile/email-change), `test_intent_service.py` (voice-command intent classification), `test_orchestration.py` (WebSocket transcript broadcast + slide-state persistence), `test_planner.py` (planner event CRUD + one IDOR check). Notably absent: any test of `app/api/v1/presentations.py` (upload, get, patch, delete, ai-state, export-pptx — the app's core resource), and no direct tests of `app/core/security.py` or the file-validation services.

## New Test Files

### 1. `backend/tests/test_presentations.py` (25 tests)
Covers the `/api/v1/presentations` router end-to-end. This was the single biggest coverage gap — every route in this file was previously unexercised by any test.

- **Upload validation**
  - `test_upload_rejects_invalid_extension` — non-PDF/PPTX filename → 400
  - `test_upload_rejects_empty_file` — zero-byte upload → 400
  - `test_upload_rejects_oversized_file` — exceeds `MAX_FILE_SIZE` → 400
  - `test_upload_rejects_content_that_does_not_match_extension` — `.pdf`-named file whose bytes aren't a real PDF (extension-spoofing attack) → magic-byte check rejects it, 400
  - `test_upload_requires_authentication` — no token → 401
  - `test_upload_pdf_success` — happy path with `pdf_service`/`embedding_service` mocked, asserts `201` + correct slide count
  - `test_upload_sanitizes_path_traversal_filename` — filename `../../../../etc/passwd.pdf` must not let the saved file escape `uploaded_files/`; asserts the stored `file_path` contains no `..` and stays inside the upload directory
- **Ownership / IDOR** (a user must never be able to read, rename, or delete another user's presentation — confirmed as `404`, not `403`, so existence isn't leaked)
  - `test_get_presentation_owner_can_access` / `test_get_presentation_other_user_gets_404`
  - `test_update_title_success` / `test_update_title_rejects_blank_title` / `test_update_title_other_user_gets_404`
  - `test_delete_presentation_removes_row_and_file` (asserts the on-disk file is actually deleted) / `test_delete_presentation_other_user_gets_404`
- **AI-state (`/ai-state` GET+PUT)**
  - `test_ai_state_roundtrip` — create an AI-generated presentation directly in the DB, verify GET returns it and PUT persists an update (title + slide count sync back to the `Presentation` row)
  - `test_ai_state_not_available_for_regular_upload` — a non-AI presentation has no ai-state → 404
  - `test_ai_state_other_user_gets_404` — IDOR check
- **Export PPTX**
  - `test_export_pptx_success_sanitizes_unicode_filename` — mocks `pptx_service.generate_pptx_from_state`, asserts the returned bytes match and the `Content-Disposition` header (built from a Turkish title with `ğ`/`ş`/`ı`) is pure ASCII with a correct RFC 5987 `filename*=UTF-8''...` fallback for the real Unicode name
  - `test_export_pptx_not_available_for_regular_upload` — 404 for non-AI presentations
- **Blanket auth check**
  - `test_presentation_endpoints_require_authentication` — parametrized over 6 routes/methods, confirms every one 401s without a token

### 2. `backend/tests/test_security_core.py` (12 tests)
Unit + integration tests for `app/core/security.py` and the `get_current_user` dependency every protected route relies on.

- Password hashing: hash ≠ plaintext, correct bcrypt prefix, `verify_password` true/false, and same password hashed twice yields two different hashes (salt is randomized).
- JWT creation: `create_access_token` embeds `sub` + `exp`, respects a custom `expires_delta`; a token signed with the wrong secret key fails to decode.
- `get_current_user` via a live protected endpoint (`/auth/me`):
  - No token → 401
  - Garbage/malformed token → 401
  - **Expired token** → 401 (token minted with `expires_delta=timedelta(seconds=-1)`)
  - **Token for a since-deleted user** → 401 (token issued, then the user row deleted, token replayed)
  - Token missing the `sub` claim → 401

### 3. `backend/tests/test_file_validation.py` (16 tests)
Unit tests for `app/services/file_validator.py` and `app/services/file_security.py` — the layer that inspects uploaded bytes before anything else touches them.

- `validate_file_type`: accepts real PDF (`%PDF-`) and PPTX (`PK\x03\x04`) magic bytes; rejects plain text, **rejects a Windows PE/EXE (`MZ`) payload named `deck.pdf`**, rejects an empty buffer, and **rejects an HTML/`<script>` payload disguised as a `.pdf`** (stored-XSS-via-preview attempt).
- `calculate_file_hash`: deterministic for identical content, differs for different content (duplicate-detection correctness).
- `clean_text`: strips null bytes and control characters, collapses/trims whitespace, preserves normal Unicode (Turkish) text untouched.
- `validate_item_count_and_size` (decompression-bomb guard): passes for a normal file, rejects a page/slide count above `MAX_ITEMS`, rejects a suspiciously large average page/slide size (few items, huge total size — the bomb signature), and doesn't divide-by-zero on a zero-item file.

### 4. `backend/tests/test_pptx_ssrf.py` (17 tests)
Tests the SSRF guard in `app/services/pptx_service.py` (`_is_public_ip`, `_fetch_image_bytes_safely`) that runs whenever a PPTX export fetches an image URL server-side. Without these checks a crafted image URL could reach an internal service or a cloud metadata endpoint from the server itself.

- `_is_public_ip` parametrized over public IPs (accepted) vs. private/RFC1918, loopback, **link-local (`169.254.169.254` — the AWS/GCP metadata address)**, multicast, unspecified, and IPv6 loopback/link-local (all rejected).
- `_fetch_image_bytes_safely`:
  - Non-`https` scheme rejected
  - Host outside the Unsplash allow-list rejected (`evil.example.com`)
  - Lookalike-domain attack rejected (`images.unsplash.com.evil.com`)
  - DNS resolution failure surfaces as a clean `ValueError`
  - **DNS-rebinding case**: an allow-listed hostname whose `getaddrinfo` result resolves to a private IP is still rejected (monkeypatched `socket.getaddrinfo`)
  - Same check specifically for the cloud metadata address

## Verification
- Full suite: `pytest -q` inside `backend/` → **97/97 passing** (27 pre-existing + 70 new), no regressions to the existing 4 files.
- Ran each new file individually during development to isolate failures before the full-suite run.

## Follow-up Round: Tier-A Gap Closure (same day)
After the initial pass, reviewed what was still untested and prioritized by risk (IDOR/auth first, pure-logic functions next, OpenAI-mocked services and background workers deferred to a later round — see "Not Covered" below, which stays accurate). Added:

### 5. `backend/tests/test_chat.py` (6 tests)
`POST /api/v1/chat/{presentation_id}` (RAG chat over a presentation) had zero coverage despite following the same ownership-check pattern as `presentations.py`.
- `test_chat_requires_authentication` — no token → 401
- `test_chat_success` — mocks `rag_service.ask_question`, asserts the response is passed through correctly
- `test_chat_nonexistent_presentation_returns_404`
- `test_chat_other_user_presentation_returns_404` — **IDOR check**; also asserts `rag_service.ask_question` was never called (no wasted OpenAI spend on a rejected request)
- `test_chat_rejects_blank_question` — schema validation (empty string) → 422
- `test_chat_service_error_returns_500` — an exception from `rag_service` is caught and surfaced as a clean 500, not a raw traceback

### 6. `backend/tests/test_planner.py` (+7 tests, extending the existing file)
The original file only covered create/list/delete + one IDOR case; `PUT /events/{id}` and `DELETE /events/{id}/reminder` were completely untested.
- `test_update_planner_event_success` — reschedule date/time/reminder/note, verify persisted
- `test_update_planner_event_other_user_gets_404` — IDOR on update
- `test_update_planner_event_rejects_reassignment_to_unowned_presentation` — **the update route independently re-validates presentation ownership** (a user could otherwise try to point their own event at someone else's presentation_id); confirmed this second ownership check is actually enforced
- `test_delete_planner_event_reminder_success` — reminder cleared, event itself survives
- `test_delete_planner_event_reminder_other_user_gets_404` — IDOR on reminder deletion

### 7. `backend/tests/test_generation_service.py` (7 tests)
Pure unit tests for `resolve_image_url()` — no mocking needed, deterministic keyword-scoring logic that auto-matches an AI slide's image prompt to a curated Unsplash URL.
- Keyword matching (technology, business), `alt`-text contributing to the match, full-phrase-over-partial-token scoring preference, case-insensitivity, no-match fallback to the first database entry, and — importantly — **every possible output stays within the curated URL set**, which is the invariant `pptx_service._fetch_image_bytes_safely`'s SSRF allow-list depends on.

## Verification (follow-up round)
- Full suite: `pytest -q` inside `backend/` → **115/115 passing** (97 previous + 18 new), zero regressions.

## Issues Found During Test Development

1. **`Slide.embedding` requires exactly 1536 dimensions, even on SQLite.** `pgvector.sqlalchemy.Vector(1536)` enforces the dimension count in its Python-side bind processor regardless of DB backend, so mocked embeddings in upload tests had to be full 1536-length vectors (`[0.0] * 1536`), not short placeholder lists — a 2-float mock raised `ValueError: expected 1536 dimensions, not 2` at insert time. Not a bug, just a test-construction constraint worth documenting since it'll bite the next person mocking `embedding_service`.

2. **`backend/uploaded_files/` is owned by `root:root` (mode 755)** on this machine, not the local dev user — likely leftover from an earlier Docker-as-root run. The real `/upload` endpoint cannot currently write to it outside a root-owned process. Tests that exercise the upload-success path work around this with `monkeypatch.chdir(tmp_path)` (the endpoint writes to a hardcoded relative `uploaded_files/` path), but this same permission issue will block manual/local testing of uploads until the directory ownership is fixed, e.g. `sudo chown -R $(whoami):$(whoami) backend/uploaded_files`.

## Not Covered (flagged for a future pass)
- `generation_service.generate_presentation_state()`'s OpenAI-backed generation flow (would need a mocked-completion test, similar to `test_intent_service.py`'s pattern) — `resolve_image_url()` is now covered, this is the remaining piece
- `ideas_service.py` (`generate_topic_ideas`, `chat_about_topic`) and its two routes in `ideas.py`
- `rag_service.ask_question()` itself is still only exercised indirectly (mocked) via `test_chat.py` — its internal vector-search/prompt logic has no direct unit test
- Rate limiting behavior (`app/core/limiter.py` is force-disabled whenever `TESTING=True`, by design — would need a dedicated non-TESTING-mode test to exercise)
- Real PDF/PPTX text-extraction correctness (`pdf_service.py`, `pptx_service.py` extraction paths) — current tests mock these out rather than exercising real parsing
- Background workers (`planner_reminder_service.py`, `file_cleanup.py`) — no user-facing endpoint, lowest priority
