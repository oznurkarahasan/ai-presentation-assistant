# Changelog - May 26, 2026

## Branch
- **Name:** `73-topic-ideas`
- **Base Comparison:** `main...HEAD` (branched from `62-add-language-options-2`)
- **Scope:** Full implementation of the Topic Ideas feature — AI-powered idea generation with category shortcuts, trending ideas, favoriting, and a header-integrated search for quick access.

## Change Summary
- **10 files changed**
- **+1143 insertions / -27 deletions**
- Major delivery areas:
	- FastAPI endpoint for AI-powered topic idea generation
	- `TopicIdeas` page component (categories, trending section, favorites, AI chat panel)
	- `IdeasDropdownSearch` extracted component for header integration
	- `DashboardContext` extended with favorite and pending idea state
	- `layout.tsx` header updated to show favorites search on the ideas tab
	- EN/TR translations for all new UI strings

## Backend Updates

### 1. Topic Ideas API Endpoint
- Created `backend/app/api/v1/ideas.py`.
- `POST /api/v1/ideas/topics` — accepts `context`, `audience`, `purpose`, `num_ideas` (default 5), and `language` (`en` / `tr`).
- Uses `gpt-4o-mini` to generate structured topic ideas, each with a `title`, `description`, and `angle`.
- Response format: `{ "ideas": [{ "title": "...", "description": "...", "angle": "..." }] }`.
- `POST /api/v1/ideas/chat` — contextual follow-up chat on a selected idea; accepts `idea`, `chat_context`, `messages`, and `language`.
- Registered both routers in `backend/main.py`.

## Frontend Updates

### 2. TopicIdeas Page Component
- Created `frontend/app/dashboard/ideas/TopicIdeas.tsx` as the main view for the `?tab=ideas-topics` route entry in `frontend/app/dashboard/page.tsx`.
- Three-field generation form: **Context** (topic domain), **Audience**, and **Purpose** — all optional; generates ideas on submit.
- Split layout: idea list on the left, AI chat panel on the right (slide-over on mobile).

#### Category Shortcut Cards
- Eight category cards rendered below the form: Technology, Business, Science, Education, Health, Finance, Society, Startup.
- Each category carries locale-aware `label`, `context`, `audience`, and `purpose` values.
- Clicking a category auto-fills the form fields and immediately triggers generation — bypasses React state batching by passing values directly to the API call via an override parameter on `generate(params?)`.

#### Trending Topics Section
- On page mount, fetches 5 AI-generated ideas with locale-appropriate default parameters (no user input required).
- Results cached in `sessionStorage` under a locale-scoped key (`precue_trending_ideas_en` / `precue_trending_ideas_tr`):
	- Cache is read on subsequent tab switches and page refreshes within the same session.
	- Cache is cleared on logout so a fresh set is fetched on next login.
- A `trendingCtx` state captures the default parameters used for generation; passed as a context override when the user opens the AI chat from a trending card, so the AI has meaningful domain context even though the user filled no form fields.

#### Favorite (Star) Button
- Each idea card has a star button in the top-right corner.
- `toggleFavorite` adds or removes the idea from `favoriteTopicIdeas` in `DashboardContext`.
- `isFavorited` helper drives the filled/unfilled star visual.
- Favorites are persisted to `localStorage` under `precue_favorite_ideas` and survive logout/login cycles.
- Fixed HTML validity issue: `IdeaCard` changed from `motion.button` to `motion.div` with `role="button"` and `tabIndex={0}` so the internal star `<button>` does not nest inside another button element.

#### AI Chat Panel
- Selecting any idea card opens a slide-in chat panel pre-seeded with a welcome message.
- `handleSelectIdea(idea, ctxOverride?)` sets the chat context from either the live form values (user-generated ideas) or the `trendingCtx` override (trending ideas).
- Chat messages are sent to `POST /api/v1/ideas/chat` with the idea, context, full message history, and locale.

### 3. IdeasDropdownSearch Component
- Created `frontend/app/dashboard/ideas/IdeasDropdownSearch.tsx`.
- Extracted from `TopicIdeas.tsx` so the dashboard header (`layout.tsx`) can import and render it independently.
- Props: `ideas`, `onSelect`, `searchPlaceholder`, `noIdeasText`, `noResultsText`.
- Animated dropdown (Framer Motion) with outside-click-to-close and live filter by query.
- Selecting a favorite idea sets `pendingTopicIdea` in context, which `TopicIdeas` picks up via a `useEffect` to open the chat panel directly.

### 4. DashboardContext Extensions
- Added `favoriteTopicIdeas: SavedTopicIdea[]` with `localStorage` lazy initializer and a sync `useEffect` to persist on every change.
- Added `pendingTopicIdea: SavedTopicIdea | null` as a communication channel between the header search and the `TopicIdeas` component.
- `handleLogout` now clears `sessionStorage` keys for trending ideas so a fresh fetch occurs on next login.

### 5. Dashboard Header Integration
- `frontend/app/dashboard/layout.tsx` header now conditionally renders `IdeasDropdownSearch` instead of the standard search input when `activeTab === 'ideas-topics'`, matching the layout pattern used on the Presentations tab.
- Selecting a favorite from the dropdown sets `pendingTopicIdea` in context and navigates to the ideas tab if not already there.

### 6. Translation Updates
- Added to `frontend/messages/en.json` and `frontend/messages/tr.json` under the `topicIdeas` namespace:
	- `startWithCategory` — section label above category cards
	- `trendingTopics` — section label above trending ideas
	- `searchIdeas` — updated placeholder for favorites-only search (`"Search favorites..."`)
	- `noSavedIdeas` — updated empty state text (`"No favorites yet"`)
	- `noResults` — no search results text
	- Category labels and all chat/panel strings

## Functional Outcome
- Users land on the Topic Ideas tab and immediately see AI-generated trending ideas without filling any form.
- Eight category cards let users jump-start generation with one click, no typing required.
- Each generated idea can be starred; favorites persist across sessions.
- The header search on the ideas tab filters favorited ideas; selecting one opens the AI chat panel directly.
- AI chat for trending ideas receives meaningful domain context (not empty strings) because the default generation parameters are forwarded alongside the idea.
- Trending ideas are fetched once per login session per locale; `sessionStorage` caching prevents redundant API calls on tab switches and page refreshes.
