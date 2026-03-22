# Changelog - March 19, 2026

## Added & Improved Features

### 1. Interactive AI Chat Reference Links (Analyze Page)
- **New Feature:** Implemented a regex-based parser for the Analyze Page chatbot that identifies page references such as `[Sayfa X]` or `[Page X]` within the assistant's responses.
- **Improved UX:** These references are now automatically converted into interactive buttons. When clicked, the presentation viewer instantly jumps to the specifically cited slide.
- **Technical Detail:** Used a robust `useCallback` hook (`handlePageJump`) combined with a custom rendering function (`renderMessageContent`) to ensure smooth, non-blocking navigation within the chat interface.

### 2. Presentation Viewer Refinement (PDF & Layout)
- **Aspect Ratio Optimization:** Updated the `PresentationViewer` component to dynamically calculate and enforce the document's original aspect ratio. This eliminates black bars and ensures a "Pixel Perfect" fit for both landscape and portrait presentations.
- **Custom Interaction Controls:** 
    - Disabled global scrolling within the viewer to prevent accidental page skips.
    - Implemented a custom toolbar that replaces the native browser PDF interface for a consistent, branded experience.
    - Added precise zoom constraints to maintain readability while preventing layout breakage.

---

# Changelog - March 20, 2026

## PresentationViewer — Layout & Scroll Overhaul (`components/PresentationViewer.tsx`)

### 1. Fixed Toolbar / Viewport Overlap (Layout Bug)
- **Problem:** The toolbar and the page viewport were both using `absolute inset-0` positioning, causing the toolbar (40px tall) to overlap the PDF content. The top 40px of every slide was hidden behind the toolbar.
- **Fix:** Replaced absolute positioning with a `flex-col` layout. The toolbar is now `flex-none h-10` and the viewport is `flex-1`, so they stack cleanly without overlap.

### 2. Scroll Removed — Page-by-Page Navigation Only
- **Problem:** The viewer allowed scrolling inside the frame, which could accidentally skip pages or show partial slides.
- **Fix:** In fit mode (no zoom), the viewport is `overflow-hidden`. Advancing slides is done exclusively via the prev/next buttons or the page number input in the toolbar. No scroll-to-navigate.

### 3. Zoom with Panning (No Page Scroll)
- **Behavior:** When zoom is active (> 100%), the viewport switches to `overflow-auto`, allowing the user to pan within the zoomed slide. When zoom is reset to FIT, scroll is locked again.
- **Scrollbar:** The container scrollbar is hidden visually (`scrollbarWidth: none`) while panning still works.

### 4. PDF Viewer's Native Browser Scrollbar Hidden
- **Problem:** Chrome's built-in PDF viewer renders its own scrollbar inside the iframe. URL fragment parameters (`scrollbar=0`) are ignored by Chrome's native viewer, so the scrollbar was always visible.
- **Fix:** The iframe is extended by 20px in width and height (`calc(100% + 20px)`), and the parent container clips it with `overflow-hidden`. The browser's PDF scrollbar is physically present but outside the visible area.

### 5. Portrait Slide Zoomed → Frame Expands to Landscape
- **New Behavior:** When a portrait-orientation slide is zoomed in, the outer container frame transitions from portrait aspect ratio to 16:9 (landscape). This gives the zoomed content more horizontal room.
- **How:** A derived flag `isZoomedPortrait` (`orientation === 'portrait' && zoom !== null`) overrides the container's `aspectRatio`, `width`, and `height` styles. The existing `transition-all duration-500` class makes this a smooth animation.
- **Resets automatically** when zoom is reset to FIT.

### 6. iframe Fragment Parameters
- The iframe `src` includes `#page=N&view=Fit&toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0` to suppress the browser PDF UI as much as possible. Note: Chrome ignores most of these except `#page=N`; the other parameters are effective in Adobe Acrobat plugin environments.

---

### 3. Backend RAG Prompt Stability
- **Prompt Engineering:** Refined the `rag_service.py` system instructions to strictly enforce the `[Sayfa X]` citation format.
- **Context Accuracy:** Ensured the RAG pipeline prioritize the "currently viewed slide" while retrieving semantic neighbors, providing more context-aware responses to user queries.
