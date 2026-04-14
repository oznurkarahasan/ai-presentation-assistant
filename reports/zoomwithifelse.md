Walkthrough - Voice-Controlled Zoom
I have implemented the voice-controlled zoom functionality for the live presentation viewer. This allows the presenter to zoom in, zoom out, and reset the view using natural voice commands in both Turkish and English.

Changes Made
1. Enhanced Presentation Viewer
Refactoring: Wrapped the PresentationViewer in forwardRef to allow external control.
Incremental Zoom: Updated the zoom logic to use 10% steps (instead of 20%) for more precise control.
Center Scaling: Ensured the scaling is anchored to the center of the viewer.
Imperative API: Exposed zoomIn(), zoomOut(), and resetZoom() methods via useImperativeHandle.
2. Voice Command Orchestration
Local Detection: Implemented a performant if-else keyword detector in the frontend. This ensures zoom actions are triggered instantly without waiting for backend LLM analysis.
Multi-language Support:
Turkish Commands: "yakınlaştır", "büyüt", "yüzde 10 artır", "daha büyük", "küçült", "sıfırla", "normal boyuta dön", etc.
English Commands: "zoom in", "enlarge", "shrink", "zoom out", "reset", "reset zoom".
Robustness: Added support for common STT misspellings like "yüze on" instead of "yüzde on".
3. User Interface
Command Tips: Updated the side panel to dynamically show the new zoom commands based on the selected language.
How to Test
Start a live presentation and click "Sunuma Başla" (Start Presentation).
Say "Yakınlaştır" or "Zoom yap"; the slide should enlarge by 10% from the center.
Repeat to increase zoom further.
Say "Küçült" or "Uzaklaştır" to zoom out.
Say "Sıfırla" or "Normal boyuta dön" to return to the default fit view.