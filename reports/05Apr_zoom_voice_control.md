# Changelog - April 05, 2026

## Zoom and Voice-Control Synchronization Improvements

### 1. Unified Zoom State for All Control Paths
- **Problem:** Region-based zoom, toolbar zoom, and voice zoom commands were not always operating on the same effective state, which caused inconsistent behavior after directional focus commands.
- **Solution:** Refactored `PresentationViewer` so all zoom operations use a single numeric zoom model (`100` = FIT) and share a common pan/scroll tracking flow.
- **Result:** Zoom in/out commands now continue from the current visual state instead of resetting to an unrelated center-fit perspective.

### 2. Region Zoom and Normal Zoom Work Together
- **Problem:** Commands like "zoom to top right" moved focus once, but subsequent zoom in/out commands could ignore that focused region.
- **Solution:** Added ratio-based pan state (`x`, `y`) and applied it consistently after zoom changes.
- **Result:** Directional focus is preserved while zooming, producing an interaction closer to hand-driven camera movement.

### 3. Manual Zoom and Pan Are Now Respected
- **Problem:** If the user manually changed zoom/pan, voice commands did not always continue from that exact current state.
- **Solution:** Added viewport scroll tracking to continuously recalculate and store current pan ratio when zoomed.
- **Result:** Voice commands now adapt to the user’s latest manual position and continue from there.

### 4. Zoom Step Adjustment Finalized
- **Iteration:** Zoom step was temporarily changed to `10` for finer increments, then reverted to `20` based on requested behavior for this branch.
- **Current Behavior:**
	- `Zoom in`: `+20`
	- `Zoom out`: `-20`

### 5. React Hook Lint Warning Fix (Without Breaking Zoom)
- **Issue:** ESLint reported missing dependencies in `useEffect` hooks for zoom and region command handling.
- **Fix:** Extracted primitive fields (`action`, `sequence`, `region`) from command objects and used those in hook logic/dependency arrays.
- **Result:** `react-hooks/exhaustive-deps` warnings were resolved without reintroducing the zoom regression.

### 6. Validation and Regression Safety
- **Frontend tests executed:** `npm test`
- **Status:** Passed (`3/3`)
- **Targeted lint check executed:** `npx eslint app/components/PresentationViewer.tsx`
- **Status:** No warnings related to missing hook dependencies after refactor.

---

## Files Impacted in This Update
- `frontend/app/components/PresentationViewer.tsx`

## Summary
This update stabilizes real-time presentation zoom behavior by aligning voice commands, region focus, and manual interaction under one consistent zoom/pan state model. It also resolves hook dependency lint warnings in a behavior-safe way and keeps zoom step behavior at `20` per branch requirement.

---

## Additional Work (Telemetry, Renderer Evaluation, Cross-Device)

### 7. Live Session Telemetry (Success/False Positive/Latency)
- Added telemetry aggregation in the orchestration WebSocket flow.
- Added a read endpoint for per-presentation telemetry:
	- `GET /api/v1/orchestration/telemetry/presentation/{presentation_id}`
- Reported metrics include:
	- `commands_received`
	- `commands_executed`
	- `success_rate`
	- `false_positive_estimate` (based on low-confidence rejections)
	- `avg_command_latency_ms`
	- `unknown_transcripts`
	- `per_intent`

### 8. Renderer Migration Evaluation (iframe vs coordinate-aware layer)
- **Evaluated Option A (Migrate to PDF.js/canvas):**
	- Pros: true coordinate system, stable `ZOOM_TO_POINT(x,y,scale)`, text-layer-aware targeting.
	- Cons: larger migration cost, full replacement of current viewer behaviors.
- **Evaluated Option B (Keep iframe + mapping overlay):**
	- Pros: low risk, preserves current production flow.
	- Cons: coordinate precision remains approximate.
- **Decision for this branch:** Keep iframe architecture and continue with slide-level semantic mapping + telemetry as an incremental path.

### 9. Cross-Device Validation Improvements
- Added pan-ratio clamping (`0..1`) to prevent out-of-range focus values on different viewport sizes.
- Added resize re-application logic so current focus is preserved when viewport changes (desktop resize / mobile orientation changes).
- This improves consistency for region-based commands across device classes without changing the current viewer architecture.
