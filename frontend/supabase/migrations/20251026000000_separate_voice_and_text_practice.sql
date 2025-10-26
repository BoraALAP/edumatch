-- Separate Voice and Text Practice Sessions
-- This migration creates dedicated tables for voice practice and renames text practice tables

-- ============================================================================
-- PART 1: Delete test voice session data
-- ============================================================================

-- Delete voice sessions (test data)
DELETE FROM solo_practice_messages WHERE session_id IN (
  SELECT id FROM solo_practice_sessions WHERE voice_enabled = true
);
DELETE FROM conversation_analytics WHERE session_id IN (
  SELECT id FROM solo_practice_sessions WHERE voice_enabled = true
);
DELETE FROM solo_practice_sessions WHERE voice_enabled = true;

-- ============================================================================
-- PART 2: Create Voice Practice Tables
-- ============================================================================

-- Voice Practice Sessions Table
CREATE TABLE voice_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Session Context
  topic TEXT NOT NULL,
  proficiency_level TEXT,
  learning_goals TEXT[] DEFAULT ARRAY[]::TEXT[],
  grammar_focus TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Voice Configuration
  voice_provider TEXT NOT NULL DEFAULT 'openai-realtime' CHECK (voice_provider IN ('openai-realtime', 'elevenlabs')),
  voice_speaker TEXT DEFAULT 'alloy',
  provider_session_id TEXT, -- Session ID from external provider

  -- Session Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),

  -- Session Metrics
  message_count INTEGER DEFAULT 0,
  transcript_count INTEGER DEFAULT 0,
  correction_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  paused_at TIMESTAMPTZ,
  resumed_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  session_metadata JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice Practice Transcripts Table
CREATE TABLE voice_practice_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voice_practice_sessions(id) ON DELETE CASCADE,

  -- Transcript Data
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  text TEXT NOT NULL,

  -- Sequencing
  sequence_number INTEGER NOT NULL,
  turn_id UUID, -- Groups messages in same conversation turn

  -- Audio Metadata
  audio_duration_seconds NUMERIC,

  -- Processing Flags
  has_correction BOOLEAN DEFAULT false,
  has_analytics BOOLEAN DEFAULT false,
  analytics_processed_at TIMESTAMPTZ,

  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice Practice Audio Chunks Table
CREATE TABLE voice_practice_audio_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voice_practice_sessions(id) ON DELETE CASCADE,
  transcript_id UUID REFERENCES voice_practice_transcripts(id) ON DELETE SET NULL,

  -- Audio Data
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('user_audio', 'assistant_audio')),
  duration_seconds NUMERIC,
  sample_rate INTEGER DEFAULT 24000,
  format TEXT DEFAULT 'pcm16',
  byte_size INTEGER,

  -- Storage (if we store audio files)
  storage_url TEXT,

  -- Sequencing
  sequence_number INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice Practice Events Table
CREATE TABLE voice_practice_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voice_practice_sessions(id) ON DELETE CASCADE,

  -- Event Data
  event_type TEXT NOT NULL CHECK (event_type IN (
    'connection_opened',
    'connection_closed',
    'user_speech_start',
    'user_speech_end',
    'ai_response_start',
    'ai_response_end',
    'vad_detected',
    'turn_detected',
    'error',
    'session_paused',
    'session_resumed',
    'audio_buffer_commit',
    'transcript_received',
    'correction_generated'
  )),
  event_data JSONB DEFAULT '{}'::JSONB,

  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice Practice Corrections Table
CREATE TABLE voice_practice_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES voice_practice_sessions(id) ON DELETE CASCADE,
  transcript_id UUID REFERENCES voice_practice_transcripts(id) ON DELETE SET NULL,

  -- Correction Data
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  explanation TEXT,

  -- Classification
  category TEXT CHECK (category IN (
    'grammar_tense',
    'grammar_article',
    'grammar_verb_agreement',
    'grammar_preposition',
    'grammar_word_order',
    'grammar_plural',
    'grammar_pronoun',
    'vocabulary',
    'pronunciation',
    'idiom',
    'other'
  )),
  severity TEXT CHECK (severity IN ('minor', 'moderate', 'major')),

  -- User Interaction
  shown_to_user BOOLEAN DEFAULT false,
  shown_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 3: Create Indexes for Performance
-- ============================================================================

-- Voice Practice Sessions Indexes
CREATE INDEX idx_voice_practice_sessions_student_id ON voice_practice_sessions(student_id);
CREATE INDEX idx_voice_practice_sessions_status ON voice_practice_sessions(status);
CREATE INDEX idx_voice_practice_sessions_started_at ON voice_practice_sessions(started_at DESC);

-- Voice Practice Transcripts Indexes
CREATE INDEX idx_voice_practice_transcripts_session_id ON voice_practice_transcripts(session_id);
CREATE INDEX idx_voice_practice_transcripts_sequence ON voice_practice_transcripts(session_id, sequence_number);
CREATE INDEX idx_voice_practice_transcripts_timestamp ON voice_practice_transcripts(timestamp);

-- Voice Practice Audio Chunks Indexes
CREATE INDEX idx_voice_practice_audio_chunks_session_id ON voice_practice_audio_chunks(session_id);
CREATE INDEX idx_voice_practice_audio_chunks_transcript_id ON voice_practice_audio_chunks(transcript_id);
CREATE INDEX idx_voice_practice_audio_chunks_sequence ON voice_practice_audio_chunks(session_id, sequence_number);

-- Voice Practice Events Indexes
CREATE INDEX idx_voice_practice_events_session_id ON voice_practice_events(session_id);
CREATE INDEX idx_voice_practice_events_type ON voice_practice_events(event_type);
CREATE INDEX idx_voice_practice_events_timestamp ON voice_practice_events(timestamp);

-- Voice Practice Corrections Indexes
CREATE INDEX idx_voice_practice_corrections_session_id ON voice_practice_corrections(session_id);
CREATE INDEX idx_voice_practice_corrections_transcript_id ON voice_practice_corrections(transcript_id);

-- ============================================================================
-- PART 4: Rename Text Practice Tables
-- ============================================================================

-- Rename solo_practice_sessions to text_practice_sessions
ALTER TABLE solo_practice_sessions RENAME TO text_practice_sessions;

-- Rename solo_practice_messages to text_practice_messages
ALTER TABLE solo_practice_messages RENAME TO text_practice_messages;

-- Drop voice-related columns from text_practice_sessions
ALTER TABLE text_practice_sessions
  DROP COLUMN IF EXISTS voice_enabled,
  DROP COLUMN IF EXISTS voice_provider,
  DROP COLUMN IF EXISTS voice_session_id,
  DROP COLUMN IF EXISTS voice_metadata;

-- ============================================================================
-- PART 5: Update Analytics Tables
-- ============================================================================

-- Add voice_practice_session_id to conversation_analytics
ALTER TABLE conversation_analytics
  ADD COLUMN voice_practice_session_id UUID REFERENCES voice_practice_sessions(id) ON DELETE CASCADE,
  ADD COLUMN text_practice_session_id UUID;

-- Update session_type values
ALTER TABLE conversation_analytics
  DROP CONSTRAINT IF EXISTS conversation_analytics_session_type_check;

ALTER TABLE conversation_analytics
  ADD CONSTRAINT conversation_analytics_session_type_check
  CHECK (session_type IN ('solo_text_practice', 'solo_voice_practice', 'peer_chat'));

-- Add voice_practice_session_id to session_reports
ALTER TABLE session_reports
  ADD COLUMN voice_practice_session_id UUID REFERENCES voice_practice_sessions(id) ON DELETE SET NULL;

ALTER TABLE session_reports
  RENAME COLUMN solo_practice_session_id TO text_practice_session_id;

-- Update session_type values
ALTER TABLE session_reports
  DROP CONSTRAINT IF EXISTS session_reports_session_type_check;

ALTER TABLE session_reports
  ADD CONSTRAINT session_reports_session_type_check
  CHECK (session_type IN ('solo_text_practice', 'solo_voice_practice', 'peer_chat'));

-- ============================================================================
-- PART 6: Enable Row Level Security (RLS)
-- ============================================================================

-- Voice Practice Sessions RLS
ALTER TABLE voice_practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own voice practice sessions"
  ON voice_practice_sessions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Users can create their own voice practice sessions"
  ON voice_practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update their own voice practice sessions"
  ON voice_practice_sessions FOR UPDATE
  USING (auth.uid() = student_id);

-- Voice Practice Transcripts RLS
ALTER TABLE voice_practice_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transcripts from their sessions"
  ON voice_practice_transcripts FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM voice_practice_sessions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transcripts for their sessions"
  ON voice_practice_transcripts FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM voice_practice_sessions WHERE student_id = auth.uid()
    )
  );

-- Voice Practice Audio Chunks RLS
ALTER TABLE voice_practice_audio_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audio chunks from their sessions"
  ON voice_practice_audio_chunks FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM voice_practice_sessions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Users can create audio chunks for their sessions"
  ON voice_practice_audio_chunks FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM voice_practice_sessions WHERE student_id = auth.uid()
    )
  );

-- Voice Practice Events RLS
ALTER TABLE voice_practice_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events from their sessions"
  ON voice_practice_events FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM voice_practice_sessions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events for their sessions"
  ON voice_practice_events FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM voice_practice_sessions WHERE student_id = auth.uid()
    )
  );

-- Voice Practice Corrections RLS
ALTER TABLE voice_practice_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view corrections from their sessions"
  ON voice_practice_corrections FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM voice_practice_sessions WHERE student_id = auth.uid()
    )
  );

CREATE POLICY "Users can create corrections for their sessions"
  ON voice_practice_corrections FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM voice_practice_sessions WHERE student_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 7: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE voice_practice_sessions IS 'Voice practice sessions using OpenAI Realtime or ElevenLabs';
COMMENT ON TABLE voice_practice_transcripts IS 'Real-time transcripts from voice practice sessions (user and AI speech)';
COMMENT ON TABLE voice_practice_audio_chunks IS 'Audio chunk metadata for voice practice sessions';
COMMENT ON TABLE voice_practice_events IS 'Session lifecycle and interaction events for voice practice';
COMMENT ON TABLE voice_practice_corrections IS 'Grammar corrections shown to users during voice practice pauses';
COMMENT ON TABLE text_practice_sessions IS 'Text-based solo practice sessions (formerly solo_practice_sessions)';
COMMENT ON TABLE text_practice_messages IS 'Messages in text-based practice sessions (formerly solo_practice_messages)';
