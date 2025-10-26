/**
 * Mastra Provider
 *
 * Implements the AI Provider interface using Mastra framework.
 * This replaces the OpenAI Agents SDK with Mastra's unified framework
 * for better voice support, streaming, and multi-provider capabilities.
 */

import type {
  AIProvider,
  AIProviderType,
  ConversationContext,
  ConversationFeedback,
  GrammarCorrectionResult,
  TopicAdherenceResult,
  SessionSummary,
  AIMessage,
  TranscriptionResult,
  VoiceGenerationOptions,
} from '../types';
import {
  monitorConversation,
  checkGrammar,
  checkTopicAdherence,
} from '@/mastra/agents/conversation-agent';
import type {
  GrammarCorrectionResult as MastraGrammarCorrectionResult,
} from '@/mastra/agents/conversation-agent';
import { generateSessionSummary } from '@/mastra/agents/feedback-agent';

export class MastraProvider implements AIProvider {
  readonly type: AIProviderType = 'mastra';
  readonly name = 'Mastra Framework';

  // ============================================================================
  // Conversation Monitoring
  // ============================================================================

  async monitorConversation(context: ConversationContext): Promise<ConversationFeedback> {
    return monitorConversation(context);
  }

  // ============================================================================
  // Grammar Checking
  // ============================================================================

  async checkGrammar(text: string, level?: string): Promise<GrammarCorrectionResult> {
    const result: MastraGrammarCorrectionResult = await checkGrammar(text, level);

    const issues = (result.issues ?? []).map((issue) => ({
      type: issue.type ?? 'grammar',
      original: issue.original,
      suggestion: issue.suggestion ?? issue.correction ?? issue.original,
      correction: issue.correction,
      explanation: issue.explanation,
      severity: issue.severity ?? 'minor',
      position: issue.position,
    }));

    return {
      hasIssues: (result.hasIssues ?? issues.length > 0) && issues.length > 0,
      issues,
      overallFeedback: result.overallFeedback,
    };
  }

  // ============================================================================
  // Topic Adherence
  // ============================================================================

  async checkTopicAdherence(
    message: string,
    topic: string,
    context?: string[]
  ): Promise<TopicAdherenceResult> {
    return checkTopicAdherence(message, topic, context);
  }

  // ============================================================================
  // Session Summary Generation
  // ============================================================================

  async generateSessionSummary(
    messages: AIMessage[],
    topic: string,
    studentLevel?: string
  ): Promise<SessionSummary> {
    return generateSessionSummary(messages, topic, studentLevel);
  }

  // ============================================================================
  // Voice Features (Future implementation)
  // ============================================================================

  async transcribeAudio(audio: Blob): Promise<TranscriptionResult> {
    void audio;
    // TODO: Implement using Mastra voice capabilities
    throw new Error('Voice transcription not yet implemented for Mastra provider');
  }

  async generateSpeech(text: string, options?: VoiceGenerationOptions): Promise<Blob> {
    void text;
    void options;
    // TODO: Implement using Mastra voice capabilities
    throw new Error('Text-to-speech not yet implemented for Mastra provider');
  }

  // ============================================================================
  // Streaming
  // ============================================================================

  streamResponse(prompt: string): ReadableStream<string> {
    void prompt;
    // TODO: Implement streaming with Mastra
    throw new Error('Streaming not yet implemented for Mastra provider');
  }
}
