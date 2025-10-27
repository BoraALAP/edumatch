/**
 * Voice Practice Types
 *
 * Purpose: Type definitions for voice practice sessions
 */

export interface VoicePracticeSession {
  id: string;
  student_id: string;
  topic: string;
  proficiency_level: string | null;
  learning_goals: string[] | null;
  grammar_focus: string[] | null;
  status: string;
  voice_provider: string | null;
  voice_speaker: string | null;
}

export interface Profile {
  id: string;
  proficiency_level: string | null;
  full_name: string | null;
}

export interface GrammarCorrection {
  original_text: string;
  corrected_text: string;
  explanation: string;
  category: string;
  severity: 'minor' | 'moderate' | 'major';
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export type SessionState = 'ready' | 'active' | 'paused' | 'ending' | 'ended';
