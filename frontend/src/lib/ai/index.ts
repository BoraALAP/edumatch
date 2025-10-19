/**
 * AI Services - Main Export
 *
 * Central export point for all AI-related services and types.
 */

// Core service
export { aiService, AIService } from './ai-service';

// Types
export type {
  AIProvider,
  AIProviderType,
  AIProviderConfig,
  AIMessage,
  ConversationContext,
  ConversationFeedback,
  GrammarIssue,
  GrammarCorrectionResult,
  TopicAdherenceResult,
  SessionSummary,
  TranscriptionResult,
  VoiceGenerationOptions,
} from './types';

// Providers (for custom configuration if needed)
export { OpenAIAgentProvider } from './providers/openai-agent-provider';
