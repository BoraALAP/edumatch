/**
 * Topic Adherence Tool
 *
 * Purpose: Tool for agents to check if conversation stays on topic
 * Features:
 * - Analyze topic relevance
 * - Provide redirection suggestions
 * - Topic drift detection
 */

import { aiService } from '@/lib/ai/ai-service';
import { z } from 'zod';

export const topicAdherenceTool = {
  name: 'check_topic_adherence',
  description: 'Check if the conversation is staying on the assigned topic',
  parameters: z.object({
    message: z.string().describe('The message to check'),
    topic: z.string().describe('The assigned conversation topic'),
    conversationHistory: z.array(z.string()).optional().describe('Recent conversation history'),
  }),
  execute: async ({
    message,
    topic,
    conversationHistory = [],
  }: {
    message: string;
    topic: string;
    conversationHistory?: string[];
  }) => {
    try {
      const result = await aiService.checkTopicAdherence(message, topic, conversationHistory);
      const reasoning = result.reasoning ?? 'Stay focused on the assigned topic.';

      return {
        isOnTopic: result.score >= 60,
        score: result.score,
        reasoning,
        shouldRedirect: result.score < 50,
        redirectionSuggestion: result.score < 50
          ? `Let's bring the conversation back to ${topic}. ${reasoning}`
          : null,
      };
    } catch (error) {
      console.error('Error checking topic adherence:', error);
      return {
        isOnTopic: true,
        score: 100,
        reasoning: 'Unable to check topic adherence',
        shouldRedirect: false,
        redirectionSuggestion: null,
        error: 'Failed to check topic adherence',
      };
    }
  },
};
