/**
 * Mastra Configuration
 *
 * Central configuration for all Mastra agents in the EduMatch platform.
 * This replaces the OpenAI Agents SDK with Mastra's unified framework.
 *
 * Integrates with Vercel AI SDK for streaming chat interfaces.
 */

import { Mastra } from '@mastra/core/mastra';
import { soloPracticeAgent } from './agents/solo-practice-agent';
import { conversationAgent } from './agents/conversation-agent';
import { feedbackAgent } from './agents/feedback-agent';

/**
 * Main Mastra instance with all agents
 * Configured for AI SDK integration with streaming support
 */
export const mastra = new Mastra({
  agents: {
    soloPracticeAgent,
    conversationAgent,
    feedbackAgent,
  },
});

/**
 * Helper to get a specific agent by name
 */
export function getAgent(name: 'soloPracticeAgent' | 'conversationAgent' | 'feedbackAgent') {
  return mastra.getAgent(name);
}

/**
 * Export agent instances directly for convenience
 */
export { soloPracticeAgent, conversationAgent, feedbackAgent };
