-- Add missing updated_at triggers for practice session tables
-- This migration fixes the issue where updated_at is not automatically updated

-- Drop old trigger if it exists (solo_practice_sessions was renamed to text_practice_sessions)
DROP TRIGGER IF EXISTS update_solo_practice_sessions_updated_at ON text_practice_sessions;

-- Add trigger for text_practice_sessions
CREATE TRIGGER update_text_practice_sessions_updated_at
  BEFORE UPDATE ON text_practice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for voice_practice_sessions
CREATE TRIGGER update_voice_practice_sessions_updated_at
  BEFORE UPDATE ON voice_practice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update existing voice practice sessions to have proper updated_at values
-- (in case any were created without triggers)
UPDATE voice_practice_sessions
SET updated_at = COALESCE(last_activity_at, started_at, created_at, NOW())
WHERE updated_at IS NULL OR updated_at = created_at;

-- Update existing text practice sessions
UPDATE text_practice_sessions
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;
