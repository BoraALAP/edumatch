/**
 * AI Conversation Agent ("Listener")
 *
 * This agent monitors student conversations and provides:
 * - Grammar corrections
 * - Topic redirection when conversation drifts
 * - Encouraging feedback
 *
 * Now uses the AI Service abstraction layer for provider flexibility.
 */

import { aiService } from '@/lib/ai';
import type { ConversationContext, ConversationFeedback } from '@/lib/ai';

// Re-export types for backward compatibility
export type { ConversationContext, ConversationFeedback };

/**
 * Runs the conversation agent and returns the response
 *
 * This function now uses the AI Service abstraction layer,
 * which allows switching between different AI providers
 * (OpenAI Agents, Anthropic, etc.) without changing this code.
 */
export async function runConversationAgent(
  context: ConversationContext
): Promise<string> {
  // Use the AI Service to monitor the conversation
  const feedback = await aiService.monitorConversation(context);

  // Return the feedback message (or empty string if no interjection needed)
  return feedback.shouldInterject ? feedback.message : 'OK';
}

/**
 * Runs the conversation agent and returns full feedback details
 *
 * Use this version when you need more information about the feedback
 * (type, severity, etc.)
 */
export async function runConversationAgentDetailed(
  context: ConversationContext
): Promise<ConversationFeedback> {
  return aiService.monitorConversation(context);
}
