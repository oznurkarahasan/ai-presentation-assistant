-- Adds reminder delivery tracking for planner reminder emails.
-- Safe to run multiple times.

ALTER TABLE planner_events
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS ix_planner_events_reminder_sent_at
ON planner_events (reminder_sent_at);
