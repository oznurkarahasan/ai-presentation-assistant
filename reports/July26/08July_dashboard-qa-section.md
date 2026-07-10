# Changelog - July 8, 2026

## Branch
- **Name:** `86-ai-analysis`
- **Base Comparison:** `7a6ad6b` (post `83-refactor-frontend` merge)
- **Scope:** New "Quality Analysis" dashboard section — an AI-generated presentation-quality scorecard (previously an empty sidebar placeholder), plus a free, non-AI practice-stats panel built from existing session data.

## Change Summary
- **13 files changed** (9 new)
- **+654 insertions / -4 deletions**
- Major delivery areas:
  - `POST /presentations/{id}/analyze` — GPT-4o-mini powered scoring (overall / readability / structure / visual balance) + per-slide feedback
  - New dashboard tab: presentation picker → AI analysis → animated SVG radar chart + slide-by-slide feedback
  - Client-side result caching (`sessionStorage`) so the analysis survives page refresh and re-selecting a presentation, without re-spending an API call
  - Free "Practice Stats" panel (session count, total rehearsal/live time, per-session duration bar chart) built entirely from already-collected `presentation_sessions` data — no AI cost
  - EN/TR localization for the whole section
  - Renamed the section from "AI Analysis" to "Quality Analysis" mid-build to avoid confusion with the existing `/analyze` (chat/Q&A) page

## Backend Updates

### 1. Analysis Schemas (`backend/app/schemas/analysis.py`)
- New file. `PresentationAnalysisRequest` (`language`), `SlideFeedback` (`page_number`, `strength`, `improvement`), `PresentationAnalysisResponse` (4 scores 0-100 + `summary` + `slide_feedback` list).

### 2. Analysis Service (`backend/app/services/analysis_service.py`)
- New file, following the existing `ideas_service.py` pattern (stateless, no DB persistence): builds a system + user prompt from the presentation's slide text, calls `gpt-4o-mini` via the shared `AsyncOpenAI` client with `response_format={"type": "json_object"}`, and parses the result into `PresentationAnalysisResponse`.
- Per-slide text is capped at 600 characters (`MAX_SLIDE_CHARS`) to bound prompt size/cost on large presentations.
- Note: `backend/app/models/presentation.py` already had an unused `PresentationAnalysis` table (`overall_score`, `readability_score`, etc.) from earlier work, but it was never wired to any service or endpoint. This feature deliberately does **not** persist to that table — it stays stateless like every other AI-generation feature in the app (Topic Ideas, AI Presentation Generation), and results are cached client-side instead (see below).

### 3. Analyze Endpoint (`backend/app/api/v1/presentations.py`)
- `POST /{presentation_id}/analyze` — ownership-checked (`Presentation.user_id == current_user.id`, `selectinload(Presentation.slides)`, same pattern as the existing `get_presentation` endpoint), raises `ResourceNotFoundError` if missing and `ValidationError` if the presentation has no slides, then delegates to `analysis_service.analyze_presentation()`.

## Frontend Updates

### 4. Shared Analysis Type (`frontend/app/types/analysis.ts`)
- New file. `SlideFeedback`, `PresentationAnalysis` — mirrors the backend schema, single source of truth for the hook and components below.

### 5. Analysis Hook (`frontend/app/hooks/useAiAnalysis.ts`)
- New file. `useAiAnalysis()` owns `result` / `isAnalyzing` / `error` state and the `analyze()` API call (errors normalized via the existing `getErrorMessage` util).
- Caches every successful result to `sessionStorage` (`precue_analysis_cache`, keyed by presentation id) — the same client-side caching pattern already used for Topic Ideas' trending-ideas cache. Exposes `getCachedAnalysis()` and `loadCached()` so a previously-analyzed presentation can be re-displayed instantly (from cache, no new AI call) after a page refresh or re-selecting it from the dropdown. Re-analyzing simply overwrites the cached entry — there is no history/trend across multiple runs.

### 6. Quality Analysis Page (`frontend/app/dashboard/analysis/AiAnalysis.tsx`)
- New file. Presentation picker (`<select>`, reusing `AiGenerationForm`'s existing select styling) sourced from `useDashboard().presentations`, filtered to `status === 'completed'`. Analyze / Re-analyze button.
- Persists the selected presentation id to `sessionStorage` (`precue_analysis_selected_id`) and restores both the selection and its cached result on mount, so a full page refresh doesn't lose the last-viewed analysis.
- Two-column layout once a presentation is selected: left column (summary + per-slide feedback, only once an analysis exists), right column (sticky) with the radar chart (once analyzed) and the practice-stats panel (shown immediately, independent of whether an analysis has been run).

### 7. Score Radar Chart (`frontend/app/dashboard/analysis/ScoreRadarChart.tsx`)
- New file. Hand-rolled SVG radar/spider chart (no charting library added — none existed in the project) plotting all 4 scores on 4 axes, gradient-filled polygon (primary → accent), framer-motion scale-in animation, vertex dots colored by a green/amber/red quality threshold, with a colored numeric legend below.

### 8. Practice Stats Panel (`frontend/app/dashboard/analysis/PracticeStats.tsx`, `SessionDurationChart.tsx`)
- New files. Reuses `useDashboard().recentSessions` (already fetched on dashboard mount — zero additional API cost) filtered to the selected presentation: total practice time, rehearsal count, live-session count, last-practiced date, and a colored animated bar chart of the last 10 sessions' durations (rehearsal = cyan, live = orange).

### 9. Wiring (`frontend/app/dashboard/page.tsx`, `frontend/app/dashboard/layout.tsx`)
- Routed `activeTab === 'ai-analysis'` to `<AiAnalysis />` (previously rendered nothing at all — the sidebar entry existed but had no corresponding view).
- Added `ai-analysis` to the compact-header tab list so the section gets a proper title instead of falling back to the default hero header.

### 10. Localization (`frontend/messages/en.json`, `frontend/messages/tr.json`)
- New `aiAnalysis` namespace (title, subtitle, picker/button labels, score labels, practice-stats labels) in both languages.
- Sidebar/header label (`dashboard.aiAnalysis`) changed from "AI Analysis" / "AI Analizi" to **"Quality Analysis" / "Kalite Analizi"** to avoid confusion with the pre-existing `/analyze` page (a different feature — presentation Q&A/chat).

## UX Iterations During Build
- Removed a redundant in-page `<h2>` title that duplicated the compact header's title.
- Removed the decorative icon from the Analyze button, keeping only the functional loading spinner.
- Moved the score cards from a flat top strip into the radar chart's legend to avoid showing the same 4 numbers twice.

## Verification
- Backend: `pytest` (27/27 passing, unaffected), manual live request via the browser confirmed `POST /api/v1/presentations/{id}/analyze` → `200 OK` end-to-end (DB fetch → OpenAI call → response), analyzing a real uploaded PDF and returning content-grounded feedback (not generic/templated output).
- Frontend: `tsc --noEmit` and `eslint app` (whole project) clean after every step; live SSR fetch of `/dashboard?tab=ai-analysis` returns 200 with no error markers.

## Considered, Not Implemented
- **Groq (free-tier) as an alternative to OpenAI for the 4 pure chat-completion services** (`ideas_service`, `analysis_service`, `intent_service`, `rag_service`) was discussed as a cost-reduction option, since the shared `AsyncOpenAI` client (`app/core/openai_client.py`) could point at Groq's OpenAI-compatible endpoint with minimal code change. `embedding_service.py` must stay on OpenAI regardless — Groq has no embeddings API. No code was changed; flagged as a possible follow-up, starting with `intent_service.py` (latency-critical, simple JSON output, most forgiving of a potential quality difference).
