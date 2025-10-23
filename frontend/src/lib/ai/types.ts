/**
 * AI Provider Types and Interfaces
 *
 * Defines the abstraction layer for AI providers.
 * Allows switching between OpenAI, Anthropic, or other providers
 * without changing application logic.
 */

// ============================================================================
// Core Types
// ============================================================================

export type AIProviderType = 'mastra' | 'openai' | 'anthropic' | 'custom';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================================================
// Grammar Correction Types
// ============================================================================

export interface GrammarIssue {
  original: string;
  correction: string;
  explanation?: string;
  severity: 'minor' | 'moderate' | 'major';
}

export interface GrammarCorrectionResult {
  hasIssues: boolean;
  issues: GrammarIssue[];
  overallFeedback?: string;
}

// ============================================================================
// Topic Adherence Types
// ============================================================================

export interface TopicAdherenceResult {
  isOnTopic: boolean;
  score: number; // 0-100
  redirectionSuggestion?: string;
}

// ============================================================================
// Conversation Monitoring Types
// ============================================================================

export interface ConversationContext {
  topic: string;
  recentMessages: string[];
  latestMessage: string;
  studentLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  grammarFocus?: string[];
}

export interface ConversationFeedback {
  shouldInterject: boolean;
  feedbackType: 'grammar' | 'topic' | 'encouragement' | 'safety' | null;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// ============================================================================
// Voice/Audio Types
// ============================================================================

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
}

export interface VoiceGenerationOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
}

// ============================================================================
// Feedback/Summary Types
// ============================================================================

export interface SessionSummary {
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  grammarPatterns: Record<string, number>;
  vocabularyUsed: string[];
  topicAdherence: number; // 0-100
  participationScore: number; // 0-100
  nextSteps: string[];
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Main AI Provider Interface
 *
 * All AI providers must implement this interface.
 * This ensures consistency across different AI backends.
 */
export interface AIProvider {
  /**
   * Provider identification
   */
  readonly type: AIProviderType;
  readonly name: string;

  /**
   * Conversation Monitoring
   * Used by the Conversation Agent ("Listener")
   */
  monitorConversation(context: ConversationContext): Promise<ConversationFeedback>;

  /**
   * Grammar Correction
   * Analyzes text for grammar issues
   */
  checkGrammar(text: string, level?: string): Promise<GrammarCorrectionResult>;

  /**
   * Topic Adherence Check
   * Determines if conversation is on-topic
   */
  checkTopicAdherence(
    message: string,
    topic: string,
    context?: string[]
  ): Promise<TopicAdherenceResult>;

  /**
   * Generate Session Summary
   * Used by Feedback Agent ("Reviewer")
   */
  generateSessionSummary(
    messages: AIMessage[],
    topic: string,
    studentLevel?: string
  ): Promise<SessionSummary>;

  /**
   * Voice Transcription
   * Converts audio to text (for future voice chat)
   */
  transcribeAudio?(audio: Blob): Promise<TranscriptionResult>;

  /**
   * Text-to-Speech
   * Converts text to audio (for future voice chat)
   */
  generateSpeech?(text: string, options?: VoiceGenerationOptions): Promise<Blob>;

  /**
   * Streaming Support
   * Returns a ReadableStream for real-time responses
   */
  streamResponse?(prompt: string): ReadableStream<string>;
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface AIProviderConfig {
  type: AIProviderType;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  customEndpoint?: string;
  additionalOptions?: Record<string, unknown>;
}

// ============================================================================
// Factory Types
// ============================================================================

export interface AIProviderFactory {
  createProvider(config: AIProviderConfig): AIProvider;
  getProvider(type: AIProviderType): AIProvider | null;
  setDefaultProvider(type: AIProviderType): void;
}
