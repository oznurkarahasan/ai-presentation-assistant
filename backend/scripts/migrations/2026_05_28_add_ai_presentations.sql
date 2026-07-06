ALTER TYPE file_type_enum ADD VALUE IF NOT EXISTS 'AI';

ALTER TABLE presentations
    ADD COLUMN IF NOT EXISTS is_ai_generated boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS ai_content_json jsonb;

CREATE INDEX IF NOT EXISTS ix_presentations_is_ai_generated
    ON presentations (is_ai_generated);
