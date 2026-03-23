# Changelog - March 24, 2026

## Live Transcript & Translation Sidebar Improvements (`presentation/[id]`)

### 1. Transcript/Translate Panel UX Alignment
- **Visual Cleanup:** Removed the extra orange live-translation feedback line from the Translate panel to avoid duplicate/noisy output.
- **Balanced Layout:** Set both `Live Transcript` and `Translate` cards to the same fixed height (`h-[260px]`) for a consistent sidebar rhythm.
- **Hidden Scrollbars with Scroll Enabled:** Kept content scrollable while hiding scrollbar visuals in both cards and the sidebar container.

### 2. Reusable Scrollbar-Hide Utility
- **Global Utility Added:** Introduced `.no-scrollbar` in `app/globals.css`.
- **Cross-Browser Support:**
	- `scrollbar-width: none` (Firefox)
	- `-ms-overflow-style: none` (legacy Edge/IE)
	- `::-webkit-scrollbar { display: none; }` (Chrome/Safari)
- **Applied Areas:** Transcript card, Translate card, and the main sidebar scroll area.

### 3. Live Transcript Behavior Upgrade (Without Flow Break)
- **Before:** Transcript state was truncated to the last 200 characters.
- **Now:** Transcript accumulates all final recognized sentences, similar to Translate panel behavior.
- **Compatibility:** STT recognition flow, interim/final handling, and command orchestration logic remain unchanged.

### 4. Auto-Scroll to Latest Sentence
- **New Behavior:** Both Transcript and Translate cards auto-scroll to bottom when new content arrives.
- **Implementation:** Added dedicated refs and `useEffect` hooks to update `scrollTop = scrollHeight`.
- **Result:** Presenter no longer needs to manually scroll to see the latest sentence.

### 5. Language Defaults and Bidirectional Translation
- **Default Language Updated:** STT now starts in English by default (`en-US`).
- **Bidirectional Translation Enabled:**
	- If speaking language is English, target translation is Turkish.
	- If speaking language is Turkish, target translation is English.
- **Scope:** Applied to interim and final translation calls and synchronized with WebSocket payload language metadata.

### 6. Dynamic Translation Panel Copy
- **Adaptive Header:** Translation title now updates by selected speech language:
	- `Turkish Translate` (when source is English)
	- `English Translate` (when source is Turkish)
- **Adaptive Empty State Text:** Placeholder/help text is now language-direction aware.

---

## Files Updated
- `frontend/app/presentation/[id]/page.tsx`
- `frontend/app/globals.css`

---

## Summary
This update stabilizes and improves the live presentation sidebar UX by making transcript/translation outputs easier to follow in real time: consistent panel sizing, hidden-but-functional scrolling, full transcript history, automatic bottom-follow behavior, English-first startup, and fully bidirectional TR↔EN live translation while preserving the existing speech recognition and orchestration flow.
