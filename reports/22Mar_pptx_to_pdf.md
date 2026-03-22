# Changelog - March 22, 2026

## PPTX-to-PDF Browser Preview (Upload + Analyze + Presentation)

### 1. Backend: PPTX → PDF Preview Conversion Pipeline
- **New Capability:** Added automatic PPTX-to-PDF preview conversion so PPTX files can be rendered in-browser with the same viewer flow used for PDFs.
- **How It Works:** During PPTX upload, backend now calls a conversion step and stores the generated preview file as `{original_pptx_path}.preview.pdf`.
- **Non-Breaking Behavior:** Conversion failures do not block upload or text extraction; they are logged and the system continues safely.
- **Infrastructure Update:** Backend Docker image now installs `libreoffice-impress` for headless conversion support.

### 2. Backend API Enhancements (`presentations.py`)
- **Presentation Detail Response Extended:** `GET /api/v1/presentations/{id}` now includes:
	- `orientation`
	- `aspect_ratio`
	- `pdf_preview_path` (for PPTX when preview exists)
- **On-Demand Backfill:** If a legacy PPTX has no preview yet, backend attempts conversion on read (detail endpoint) and returns preview path if created.
- **Optional Slide Payload:** Added `include_slides` query support to optionally return slide text content in the presentation detail response.
- **Upload Response Extended:** Upload endpoint now returns `pdf_preview_path` when available, enabling frontend to display preview immediately.
- **Delete Cleanup:** Presentation delete flow also removes generated `.preview.pdf` file if it exists.

### 3. Backend Service Updates (`pptx_service.py` / `pdf_service.py`)
- **Richer Extraction Metadata:** Both extraction services now return text plus layout metadata:
	- `slide_texts`
	- `orientation` (`portrait` / `landscape`)
	- `aspect_ratio`
- **Orientation Helpers Added:** Introduced helper methods for quick orientation/aspect detection from saved files.
- **LibreOffice Conversion Service:** Added asynchronous PPTX preview conversion utility with secure subprocess execution, timeout handling, and bookmark cleanup for better embedded PDF UX.

### 4. Frontend Upload Experience (`upload/page.tsx`)
- **Immediate PPTX Preview Support:** Upload page now consumes `pdf_preview_path` from backend response and displays converted preview inside iframe.
- **Unified Preview Behavior:** PDF and converted PPTX previews use consistent embedded rendering parameters.
- **Viewer Surface Cleanup:** Updated iframe clipping/offset styles to minimize native PDF viewer chrome and scrollbar visibility.

### 5. Shared Viewer Integration (`PresentationViewer.tsx`)
- **Reusable Viewer Component:** Added shared `PresentationViewer` and integrated it into both Analyze and Real-Time Presentation pages.
- **Consistent Controls:** Includes page navigation, fit/zoom controls, loading overlay, and polished toolbar layout.
- **Layout-Aware Rendering:** Viewer respects backend-provided `orientation` and `aspect_ratio` to render portrait/landscape documents more accurately.

### 6. Analyze & Presentation Page Behavior
- **Analyze Page:**
	- Uses `pdf_preview_path` when file type is PPTX, so browser rendering works without “coming soon” fallback.
	- Keeps AI chat page-reference interactions (`[Page X]`, `[Sayfa X]`) and routes clicks to slide navigation.
- **Presentation Page (`/presentation/[id]`):**
	- Migrated to shared viewer for consistency.
	- Includes keyboard navigation and fullscreen state sync improvements.

### 7. Security, Stability, and Maintenance Notes
- **Filename Safety:** Upload flow sanitizes incoming filenames and uses safe path joining.
- **Dependency/Tooling Refresh:** Frontend lockfile and Next.js patch update included in branch.
- **Structure Docs Updated:** Backend/frontend structure docs were refreshed to reflect the new component/service layout.

---

## Summary
This branch delivers end-to-end PPTX browser preview support by converting PPTX files to PDF on the backend and wiring that preview into existing frontend viewer flows. As a result, PPTX files now behave much closer to PDFs during upload, analyze, and live presentation usage, while preserving backward compatibility and non-blocking failure handling.
