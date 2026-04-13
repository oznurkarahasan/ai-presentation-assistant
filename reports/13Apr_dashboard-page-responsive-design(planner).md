# Changelog - April 13, 2026

## Branch
- **Name:** `51-dashboard-page-responsive-design`
- **Base Comparison:** `main...HEAD`
- **Scope:** Dashboard responsive redesign, Planner feature set, reminder email flow, and supporting backend/frontend updates.

## Change Summary
- **23 files changed**
- **+3457 insertions / -191 deletions**
- Major delivery areas:
	- Planner domain model + API + reminder worker (backend)
	- Responsive dashboard experience (frontend)
	- Library page expansion with direct planning action
	- Sessions/planner UX polishing
	- Planner API test coverage

## Backend Updates

### 1. New Planner Domain Model
- Added `PlannerEvent` model to `backend/app/models/presentation.py`.
- Linked relationships:
	- `User.planner_events`
	- `Presentation.planner_events`
- Added scheduling-related indexes for better query performance:
	- `(user_id, scheduled_at)`
	- `(presentation_id, scheduled_at)`
- Added reminder tracking field `reminder_sent_at`.

### 2. Planner API Endpoints
- Added new router at `backend/app/api/v1/dashboard/planner/planner.py`.
- Implemented endpoints:
	- `POST /api/v1/planner/events` (create)
	- `GET /api/v1/planner/events` (list, optional date filter)
	- `PUT /api/v1/planner/events/{event_id}` (update)
	- `DELETE /api/v1/planner/events/{event_id}` (delete event)
	- `DELETE /api/v1/planner/events/{event_id}/reminder` (remove reminder only)
- Event creation/update validates ownership of presentation and user.
- Timezone value is accepted and persisted on user profile when provided.

### 3. Planner Schemas
- Added `backend/app/schemas/planner.py` with:
	- `PlannerEventCreate`
	- `PlannerEventResponse`
- Added validation for:
	- `HH:MM` 24-hour time format
	- IANA timezone values (`zoneinfo` validation)

### 4. Reminder Email Worker
- Added `backend/app/services/planner_reminder_service.py`.
- Implemented periodic worker (`POLL_INTERVAL_SECONDS = 60`) to:
	- fetch due reminders (`reminder_at <= now` and not yet sent)
	- send one email per due event
	- mark `reminder_sent_at` after successful delivery
- Worker is started/stopped via app lifespan in `backend/main.py`.

### 5. Email Service Extension
- Added `send_presentation_reminder_email(...)` in `backend/app/services/email_service.py`.
- Reminder email now includes:
	- presentation title
	- scheduled date/time
	- optional note

### 6. Migration
- Added migration script:
	- `backend/scripts/migrations/2026_04_11_add_reminder_sent_at_to_planner_events.sql`
- Introduced `reminder_sent_at TIMESTAMPTZ` + index.

### 7. Additional Backend Improvements
- Chat DTO cleanup:
	- moved `ChatRequest` and `ChatResponse` from API module to `backend/app/schemas/chat.py`.
- Presentation title editing support:
	- added `PATCH /api/v1/presentations/{presentation_id}` in `backend/app/api/v1/presentations.py`.

## Frontend Updates

### 1. Dashboard Responsive Redesign
- Significant responsive refactor in:
	- `frontend/app/dashboard/page.tsx`
	- `frontend/app/dashboard/layout.tsx`
- Improved small-screen behavior for header/actions and content blocks.
- Added stronger adaptive spacing and control sizing for mobile/tablet/desktop.

### 2. Planner UI Delivery
- Added planner route page: `frontend/app/dashboard/planner/page.tsx`.
- Added full planner calendar implementation:
	- `frontend/app/dashboard/planner/PlannerCalendar.tsx`
- Implemented multi-view calendar modes:
	- day / week / month
- Event management from UI:
	- add event
	- edit event
	- delete event
	- remove reminder
- Reminder UX enhancements:
	- quick “30 minutes before” helper
	- hour/minute pickers
	- note step in creation flow

### 3. Library Experience Expansion
- Added large reusable library module:
	- `frontend/app/dashboard/library/Library.tsx`
- Added direct “Add to Planner” flow from library cards.
- Added planner modal inputs:
	- schedule date/time
	- reminder options
	- optional note
- Added local-to-UTC conversion before API submission.

### 4. Sessions & Styling
- Added sessions module at `frontend/app/dashboard/sessions/Sessions.tsx`.
- Updated global styles in `frontend/app/globals.css` to support new dashboard/planner visual behavior.
- Minor landing page update in `frontend/app/page.tsx`.
- Dependency lockfile updated: `frontend/package-lock.json`.

## Test Coverage
- Added planner API test file: `backend/tests/test_planner.py`.
- Scenario covered:
	- login
	- create planner event
	- list planner events by date
	- delete planner event
- Updated `backend/tests/conftest.py` dependency overrides for planner DB injection.

## Functional Outcome
- Users can now schedule presentations via dashboard planner.
- Reminder emails are delivered automatically for due reminders.
- Reminder delivery is tracked to avoid duplicate notifications.
- Dashboard planner and related pages provide improved responsive behavior on different screen sizes.
