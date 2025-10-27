/**
 * Chat Type Definitions
 *
 * Purpose: Common types shared across all chat interfaces
 * Used by: Peer chat, solo practice, voice practice
 */

/**
 * Grammar issue severity levels
 */
export type GrammarSeverity = "minor" | "moderate" | "major";

/**
 * Message sender types
 */
export type MessageSenderType =
  | "user"
  | "ai"
  | "ai_correction"
  | "ai_redirect"
  | "system";

/**
 * Message types
 */
export type ChatMessageType =
  | "text"
  | "voice"
  | "correction"
  | "redirect"
  | "system";

/**
 * Message role (for AI SDK compatibility)
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * Grammar issue detail
 */
export interface GrammarIssue {
  original: string;
  correction: string;
  corrected?: string; // Alias for backward compatibility
  explanation?: string;
  category?: string;
  severity?: GrammarSeverity;
}

/**
 * Base chat message interface
 * Common fields across all chat types
 */
export interface BaseChatMessage {
  id?: string | number | null;
  content: string | { text?: string } | null;
  created_at?: string | null;
  createdAt?: string | null;
  role?: MessageRole;
  sender_type?: MessageSenderType | null;
  message_type?: ChatMessageType | null;
  messageType?: string;
  grammar_issues?: GrammarIssue[] | null;
  grammarIssues?: GrammarIssue[];
  is_correct?: boolean | null;
  isCorrect?: boolean;
  has_correction?: boolean | null;
  hasCorrection?: boolean;
  correction_severity?: GrammarSeverity | null;
  correctionSeverity?: GrammarSeverity;
  ai_correction?: string | null;
}

/**
 * Peer chat message (from messages table)
 */
export interface PeerChatMessage extends BaseChatMessage {
  match_id: string;
  sender_id: string;
  read_by?: string[] | null;
  audio_url?: string | null;
  transcript?: string | null;
  audio_duration?: number | null;
  topic_relevance_score?: number | null;
}

/**
 * Solo practice message (from text_practice_messages table)
 */
export interface SoloPracticeMessage extends BaseChatMessage {
  session_id: string;
  corrected_message_id?: string | null;
}

/**
 * Voice practice message (from voice_messages table)
 */
export interface VoicePracticeMessage extends BaseChatMessage {
  session_id: string;
  audio_url?: string | null;
  audio_duration?: number | null;
  pronunciation_issues?: any | null;
  fluency_score?: number | null;
}

/**
 * Generic chat message for UI rendering
 * Normalized interface for consistent UI
 */
export interface ChatMessageUI {
  key: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  avatarSrc?: string;
  avatarName: string;
  isCurrentUser: boolean;
  isAI: boolean;
  isCorrection: boolean;
  isCorrect?: boolean;
  grammarIssues?: GrammarIssue[];
  severity?: GrammarSeverity;
}
