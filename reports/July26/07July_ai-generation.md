# Changelog - July 7, 2026

## Branch
- **Name:** `76-ai-presentation-generation-2`
- **Base Comparison:** branch root (diverged after `72-fix-about-security` merge)
- **Scope:** End-to-end AI Presentation Generation feature — topic-to-deck generation via GPT-4o, a full slide editor UI, real PPTX export, and a round of security/bug/performance hardening on top of the initial build.

## Change Summary
- **17 files changed** (3 new components)
- **+4239 insertions / -62 deletions**
- Major delivery areas:
	- `POST /generate` endpoint — GPT-4o powered topic → `PresentationState` generation
	- Curated Unsplash image database with keyword-based auto-matching for slide visuals
	- Full slide editor: canvas, slide list, style panel, toolbar, status bar, speaker notes
	- Real PPTX export via `python-pptx`, replacing the earlier placeholder export
	- Autosave (debounced) editor state persisted to `ai_content_json`
	- EN/TR localization for the entire editor and generation form
	- Post-build hardening: SSRF fix on image fetch, PPTX filename encoding fix, slide-numbering bug, zoom/layout UI bugs, async/parallel export performance

## Backend Updates

### 1. Presentation Generation Schemas (`backend/app/schemas/presentation_generation.py`)
- New file. `PresentationGenerateRequest` — `topic`, `language`, optional `theme`, `slide_count` (4-20), `presentation_type`, `tone`, `audience`.
- `PresentationState` — `metadata` (title, theme, primary/accent color, font family) + `slides: list[PresentationSlide]`.
- `PresentationSlide` — `title`, `content_type` (`standard` / `left` / `right` / `background`), `items`, optional `image` (`SlideImage`), optional `speaker_note`.
- `id` on each slide is always backend-generated (`model_validator(mode="before")` overwrites any LLM-supplied id with a fresh `uuid4()`), so the AI can never inject its own slide identifiers.
- All schemas use `extra="forbid"` except `SlideImage` (`extra="ignore"`, since the LLM may emit extra descriptive keys we don't need).

### 2. Generation Service (`backend/app/services/generation_service.py`)
- New file. `generate_presentation_state()` builds a system + user prompt from the request, calls GPT-4o via `AsyncOpenAI`, and parses the response into a validated `PresentationState`.
- `UNSPLASH_IMAGE_DATABASE` — 25 curated stock photos tagged with keywords (business, tech, nature, education, etc.).
- `resolve_image_url(prompt, alt)` — scores each database entry against the AI's image `prompt`/`alt` text and returns the best keyword match, since the LLM returns image *descriptions* but no real URL.

### 3. Presentation Endpoints (`backend/app/api/v1/presentations.py`)
- `POST /generate` — generates a `PresentationState` and persists it on the `Presentation` row (`is_ai_generated=True`, `ai_content_json`).
- `GET /{id}/ai-state` / `PUT /{id}/ai-state` — load and save editor state; the PUT endpoint is scoped by `user_id` and `is_ai_generated`.
- `GET /{id}/export-pptx` — generates a real `.pptx` from the stored state using `python-pptx` (previously a placeholder). Slide backgrounds, per-layout image placement (`standard`/`left`/`right`/`background`), bullet items, speaker notes, and slide numbers are all rendered.
- Export is offloaded via `loop.run_in_executor(None, _generate_pptx_from_state, state)` so the blocking `python-pptx` + image-fetch work doesn't stall the event loop.

### 4. Security Hardening — SSRF Fix on Image Export
- **Problem:** `SlideImage.url` is client-writable through `PUT /{id}/ai-state`, and the exporter originally fetched it directly with `urllib.request.urlopen`, with no scheme or host restriction — a user could point a slide image at `http://169.254.169.254/...` (cloud metadata) or `file:///etc/passwd` and have the backend fetch it into the downloaded PPTX.
- **Fix:** added `_fetch_image_bytes_safely()` — restricts fetches to `https://images.unsplash.com` (the only legitimate source, per `UNSPLASH_IMAGE_DATABASE`), resolves the hostname and rejects private/loopback/link-local/reserved/multicast IPs (`_is_public_ip`), and disables redirect-following entirely so the allow-list can't be bypassed via a redirect.

### 5. Bug Fix — Wrong Slide Numbers in Exported PPTX
- `state.slides.index(slide_data)` matched by **value equality**, so two slides with identical content (e.g. two blank/divider slides) both resolved to the same page number.
- Fixed by switching the export loop to `enumerate(state.slides, start=1)`.

### 6. Bug Fix — CORS-Looking Failure on Export (actually a header encoding crash)
- **Symptom:** browser reported `No 'Access-Control-Allow-Origin' header` on `GET /export-pptx`, which looked like a CORS misconfiguration.
- **Root cause:** the `Content-Disposition` filename was built from the presentation title with no ASCII restriction; Turkish characters (`ğ`, `ş`, `ı`, etc.) are `str.isalnum()`-true in Python, so they passed the sanitizer untouched and reached `StreamingResponse.init_headers()`, which raised `UnicodeEncodeError` (HTTP headers must be latin-1/ASCII). The crash happened before any response — including CORS headers — could be sent, so the browser reported it as a blocked CORS request.
- **Fix:** filename is now built as an ASCII-only fallback (`filename=`) plus an RFC 5987 UTF-8-encoded value (`filename*=UTF-8''...`), so non-ASCII titles no longer crash the export and modern browsers still show the correct Turkish filename.

### 7. Performance — Parallel Image Fetch During Export
- Previously each slide's image was fetched sequentially inside the slide-building loop (up to ~5s × N slides worst case).
- Now all slide images are prefetched concurrently up front via `ThreadPoolExecutor` (`max_workers=min(8, N)`) before the export loop runs, cutting export time from O(N) sequential round-trips to roughly one.

## Frontend Updates

### 8. AI Generation Form (`frontend/app/dashboard/ai-presentation/AiGenerationForm.tsx`)
- New form for topic, language, theme, slide count, presentation type, tone, and audience.
- Submits to `POST /generate`, stores the returned state in `sessionStorage`, and redirects to the editor.

### 9. Editor Page & Route (`frontend/app/(ai-presentation)/editor/page.tsx`)
- New route at `/editor?presentationId=X`. Resolves auth, loads AI state from `sessionStorage` or fetches it from `/ai-state` when navigating directly to an existing presentation, then renders `PresentationEditor`.

### 10. Presentation Editor (`frontend/app/components/PresentationEditor.tsx`)
- The main editor shell: owns slide state, autosave (debounced `PUT /ai-state`), zoom, notes panel, left/right panel visibility, and wires together the toolbar, canvas, slide list, and style panel.
- Defaults: zoom starts at **150%** and the speaker-notes panel starts **open**, so new/reopened presentations land with notes visible and a readable zoom level rather than "fit" + closed notes.

### 11. Editor Toolbar (`frontend/app/components/EditorToolbar.tsx`, new)
- Title editing, autosave status indicator, layout selector, panel toggles, PPTX download, "send to analysis" action.
- Layout selector is always reachable regardless of viewport width or right-panel state: it renders icon-only below the `md` breakpoint and icon+label above it, fixing an earlier regression where narrowing the window while the right panel was collapsed left no way to change a slide's layout.

### 12. Editor Status Bar (`frontend/app/components/EditorStatusBar.tsx`, new)
- Slide indicator, zoom controls (in/out/fit + presets), notes toggle, fullscreen toggle.
- Fixed: the 75/100/150% zoom preset buttons previously all called `onZoomFit` regardless of which was clicked (so clicking "150%" silently reset zoom to "Fit"); they now call `onZoomChange(preset)` with their own value. The unused 50%/125%/200% presets (hidden via inline `display:none`) were removed instead of kept dead.

### 13. AI Slide Preview (`frontend/app/components/AiSlidePreview.tsx`, new)
- Read-only slide renderer shared by non-editor contexts (analyze / presentation view), rendering the same `standard`/`left`/`right`/`background` layouts as the editor canvas.

### 14. Slide Canvas & Slide List (`frontend/app/components/SlideCanvas.tsx`, `SlideList.tsx`)
- `SlideCanvas` — the editable slide surface: inline title/content/bullet editing, image prompt regeneration, drag-to-reorder items.
- `SlideList` — left-rail slide thumbnails with add/duplicate/delete/reorder.

### 15. Right Style Panel (`frontend/app/components/RightStylePanel.tsx`)
- Tabbed panel (Style / Slide / Notes): color palette presets, font family picker, per-slide layout switch, and speaker note editor.

### 16. Analyze & Presentation View Pages
- `frontend/app/analyze/page.tsx` and `frontend/app/presentation/[id]/page.tsx` updated to fetch and render AI-generated state (slides, colors) alongside the existing non-AI presentation flow.

### 17. Localization
- `frontend/messages/en.json` / `tr.json` — added the full `editor` namespace (toolbar, canvas, status bar, settings, misc) plus AI generation form strings, in both languages.

## Functional Outcome
- A user can describe a topic, generate a full AI-authored deck (title, per-slide content, matched imagery, speaker notes) in one request, and land directly in a full-featured editor.
- The editor autosaves in the background, supports slide reordering/duplication, per-slide layout and image changes, color/font theming, and speaker notes, all localized in EN/TR.
- Exporting to PPTX now produces a real file with correctly numbered slides, working images (safely fetched), and correct filenames for non-ASCII titles — the export path was the most bug-prone area post-build and is now the most hardened.
- The generation editor experience (zoom, notes panel, layout controls) defaults to a more immediately useful state on load.
