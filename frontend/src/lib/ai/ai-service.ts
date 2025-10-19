/**
 * AI Service Manager
 *
 * Central service for managing AI providers.
 * Provides a simple API for the application to interact with AI features
 * without knowing which provider is being used.
 */

import type {
  AIProvider,
  AIProviderType,
  AIProviderConfig,
  ConversationContext,
  ConversationFeedback,
  GrammarCorrectionResult,
  TopicAdherenceResult,
  SessionSummary,
  AIMessage,
} from './types';
import { OpenAIAgentProvider } from './providers/openai-agent-provider';

/**
 * AI Service Class
 *
 * Singleton service that manages AI providers and provides
 * a unified interface for AI operations.
 */
class AIService {
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private defaultProvider: AIProviderType = 'openai';

  constructor() {
    // Initialize with OpenAI Agent provider as default
    this.registerProvider('openai', new OpenAIAgentProvider());
  }

  /**
   * Register a new AI provider
   */
  registerProvider(type: AIProviderType, provider: AIProvider): void {
    this.providers.set(type, provider);
  }

  /**
   * Get a specific provider
   */
  getProvider(type?: AIProviderType): AIProvider {
    const providerType = type || this.defaultProvider;
    const provider = this.providers.get(providerType);

    if (!provider) {
      throw new Error(`AI Provider "${providerType}" not found`);
    }

    return provider;
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(type: AIProviderType): void {
    if (!this.providers.has(type)) {
      throw new Error(`Cannot set default provider: "${type}" not registered`);
    }
    this.defaultProvider = type;
  }

  /**
   * Get current default provider type
   */
  getCurrentProviderType(): AIProviderType {
    return this.defaultProvider;
  }

  // ============================================================================
  // Conversation Monitoring API
  // ============================================================================

  /**
   * Monitor a conversation message and get AI feedback
   * Used by the Conversation Agent ("Listener")
   */
  async monitorConversation(
    context: ConversationContext,
    providerType?: AIProviderType
  ): Promise<ConversationFeedback> {
    const provider = this.getProvider(providerType);
    return provider.monitorConversation(context);
  }

  // ============================================================================
  // Grammar Checking API
  // ============================================================================

  /**
   * Check text for grammar issues
   */
  async checkGrammar(
    text: string,
    level?: string,
    providerType?: AIProviderType
  ): Promise<GrammarCorrectionResult> {
    const provider = this.getProvider(providerType);
    return provider.checkGrammar(text, level);
  }

  // ============================================================================
  // Topic Adherence API
  // ============================================================================

  /**
   * Check if message adheres to topic
   */
  async checkTopicAdherence(
    message: string,
    topic: string,
    context?: string[],
    providerType?: AIProviderType
  ): Promise<TopicAdherenceResult> {
    const provider = this.getProvider(providerType);
    return provider.checkTopicAdherence(message, topic, context);
  }

  // ============================================================================
  // Session Summary API
  // ============================================================================

  /**
   * Generate session summary and feedback
   * Used by the Feedback Agent ("Reviewer")
   */
  async generateSessionSummary(
    messages: AIMessage[],
    topic: string,
    studentLevel?: string,
    providerType?: AIProviderType
  ): Promise<SessionSummary> {
    const provider = this.getProvider(providerType);
    return provider.generateSessionSummary(messages, topic, studentLevel);
  }

  // ============================================================================
  // Voice API (Future)
  // ============================================================================

  /**
   * Transcribe audio to text
   */
  async transcribeAudio(audio: Blob, providerType?: AIProviderType) {
    const provider = this.getProvider(providerType);
    if (!provider.transcribeAudio) {
      throw new Error(`Provider "${provider.name}" does not support audio transcription`);
    }
    return provider.transcribeAudio(audio);
  }

  /**
   * Generate speech from text
   */
  async generateSpeech(
    text: string,
    options?: { voice?: string; speed?: number; pitch?: number },
    providerType?: AIProviderType
  ) {
    const provider = this.getProvider(providerType);
    if (!provider.generateSpeech) {
      throw new Error(`Provider "${provider.name}" does not support speech generation`);
    }
    return provider.generateSpeech(text, options);
  }

  // ============================================================================
  // Streaming API (Future)
  // ============================================================================

  /**
   * Get streaming response
   */
  streamResponse(prompt: string, providerType?: AIProviderType): ReadableStream<string> {
    const provider = this.getProvider(providerType);
    if (!provider.streamResponse) {
      throw new Error(`Provider "${provider.name}" does not support streaming`);
    }
    return provider.streamResponse(prompt);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global AI Service instance
 *
 * Import this to use AI features throughout the application:
 *
 * @example
 * ```typescript
 * import { aiService } from '@/lib/ai/ai-service';
 *
 * const feedback = await aiService.monitorConversation({
 *   topic: 'Travel',
 *   recentMessages: [...],
 *   latestMessage: 'I go to Paris yesterday',
 * });
 * ```
 */
export const aiService = new AIService();

/**
 * Export AIService class for testing or custom instances
 */
export { AIService };
