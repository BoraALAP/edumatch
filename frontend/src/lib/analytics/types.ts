/**
 * Analytics Type Definitions
 *
 * Purpose: Type definitions for analytics across all session types
 */

export type SessionType = 'text_practice' | 'voice_practice' | 'peer_chat';
export type MessageMode = 'text' | 'voice';
export type AnalysisType =
  | 'grammar'
  | 'pronunciation'
  | 'accent'
  | 'fluency'
  | 'vocabulary'
  | 'topic_adherence'
  | 'spelling'
  | 'punctuation';

export type IssueSeverity = 'minor' | 'moderate' | 'major';

export interface AnalyticsIssue {
  type: string;
  severity: IssueSeverity;
  original: string;
  suggestion: string;
  explanation?: string;
  position?: {
    start: number;
    end: number;
  };
  phonetic?: {
    expected: string;
    actual: string;
  };
}

export interface GrammarIssue extends AnalyticsIssue {
  rule?: string;
  category?: 'verb' | 'noun' | 'adjective' | 'adverb' | 'preposition' | 'article' | 'punctuation' | 'other';
}

export interface PronunciationIssue extends AnalyticsIssue {
  phonetic: {
    expected: string;
    actual: string;
  };
  sound?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface AccentIssue extends AnalyticsIssue {
  accentFeature?: 'intonation' | 'stress' | 'rhythm' | 'vowel' | 'consonant';
  nativePattern?: string;
  targetPattern?: string;
}

export interface FluencyIssue extends AnalyticsIssue {
  fluencyType?: 'hesitation' | 'filler_word' | 'false_start' | 'repetition' | 'long_pause';
  duration?: number; // For pauses, in seconds
}

export interface ConversationAnalytics {
  id: string;
  session_id: string;
  session_type: SessionType;
  message_id?: string;
  student_id: string;
  original_message: string;
  message_mode: MessageMode;
  analysis_type: AnalysisType;
  issues: AnalyticsIssue[];

  // Voice-specific scores
  pronunciation_score?: number;
  fluency_score?: number;
  accent_score?: number;
  words_per_minute?: number;
  hesitations_count?: number;
  filler_words?: string[];

  // Audio metadata
  audio_url?: string;
  transcript?: string;
  audio_duration?: number;

  // Additional metrics
  topic_relevance_score?: number;
  vocabulary_level?: string;
  sentence_complexity?: number;

  created_at: string;
  updated_at: string;
}

export interface UserAnalyticsSummary {
  id: string;
  student_id: string;
  total_sessions: number;
  total_practice_time_minutes: number;
  peer_chat_sessions: number;
  voice_sessions: number;
  text_sessions: number;

  // Corrections tracking
  total_corrections_received: number;
  grammar_corrections: number;
  pronunciation_corrections: number;
  accent_corrections: number;
  fluency_corrections: number;
  vocabulary_corrections: number;

  // Current scores
  current_grammar_score?: number;
  current_pronunciation_score?: number;
  current_fluency_score?: number;
  current_accent_score?: number;

  // Improvement tracking
  grammar_improvement_rate?: number;
  pronunciation_improvement_rate?: number;
  fluency_improvement_rate?: number;

  // Pattern tracking
  frequent_grammar_errors: Record<string, number>;
  difficult_sounds: string[];
  common_filler_words: string[];

  // Engagement metrics
  current_streak_days: number;
  longest_streak_days: number;
  last_session_date?: string;

  created_at: string;
  updated_at: string;
}

export interface SessionReport {
  id: string;
  session_type: SessionType;
  match_id?: string;
  text_practice_session_id?: string;
  voice_practice_session_id?: string;
  school_id?: string;
  curriculum_topic_id?: string;

  // Session metrics
  total_messages: number;
  total_duration_seconds?: number;
  total_voice_duration_seconds?: number;
  participant_ids: string[];

  // Scoring
  avg_topic_adherence?: number;
  avg_participation?: number;
  pronunciation_avg_score?: number;
  fluency_avg_score?: number;
  accent_avg_score?: number;
  words_per_minute_avg?: number;

  // Issue counts
  total_corrections: number;
  total_grammar_issues: number;
  total_hesitations?: number;
  total_filler_words?: number;

  // Learning outcomes
  objectives_met?: string[];
  key_vocabulary_practiced?: string[];
  grammar_patterns_covered?: string[];
  difficult_sounds?: string[];
  pronunciation_improvements?: string[];

  // AI observations
  agent_observations?: string;
  conversation_highlights?: Record<string, unknown>;

  // Review
  teacher_notes?: string;
  flagged_for_review: boolean;

  // Meta
  generated_by?: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface SessionSummary {
  sessionId: string;
  sessionType: SessionType;
  duration: number;
  messageCount: number;

  // Overall scores
  grammarScore?: number;
  pronunciationScore?: number;
  fluencyScore?: number;
  accentScore?: number;
  topicAdherence?: number;

  // Issues by type
  grammarIssues: GrammarIssue[];
  pronunciationIssues: PronunciationIssue[];
  accentIssues: AccentIssue[];
  fluencyIssues: FluencyIssue[];

  // Highlights
  strengths: string[];
  areasForImprovement: string[];
  keyTakeaways: string[];

  // Next steps
  recommendedFocus?: string[];
}
