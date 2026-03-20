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

### 3. Backend RAG Prompt Stability
- **Prompt Engineering:** Refined the `rag_service.py` system instructions to strictly enforce the `[Sayfa X]` citation format.
- **Context Accuracy:** Ensured the RAG pipeline prioritize the "currently viewed slide" while retrieving semantic neighbors, providing more context-aware responses to user queries.
