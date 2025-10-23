/**
 * Conversation Agent (Listener) - Mastra Implementation
 *
 * This agent monitors peer-to-peer conversations and provides real-time feedback.
 * Features:
 * - Monitors text conversations between students
 * - Detects grammar and phrasing issues
 * - Identifies off-topic messages and redirects conversation
 * - Maintains tone: friendly, peer-like, and educational
 * - Observes cooldown: minimal disruption to natural flow
 *
 * Migrated from OpenAI Agents SDK to Mastra for better streaming and observability.
 */

import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';

export interface ConversationContext {
  topic: string;
  recentMessages: string[];
  latestMessage: string;
  studentLevel?: string;
  grammarFocus?: string[];
}

export interface ConversationFeedback {
  shouldInterject: boolean;
  feedbackType: 'grammar' | 'topic' | 'encouragement' | 'safety' | null;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface GrammarCorrectionResult {
  hasIssues: boolean;
  issues: Array<{
    original: string;
    correction: string;
    explanation: string;
    severity: 'minor' | 'moderate' | 'major';
  }>;
  overallFeedback?: string;
}

export interface TopicAdherenceResult {
  isOnTopic: boolean;
  score: number; // 0-100
  redirectionSuggestion?: string;
}

/**
 * Create the Conversation Monitoring Agent
 */
export const conversationAgent = new Agent({
  name: 'conversation-listener',
  model: openai('gpt-4o-mini'),
  instructions: 'You are a conversation monitoring agent. You will receive context-specific instructions with each request.',
});

/**
 * Monitor a conversation and provide feedback if needed
 *
 * @param context - Conversation context including topic, messages, and student info
 * @returns Feedback with intervention recommendation
 */
export async function monitorConversation(
  context: ConversationContext
): Promise<ConversationFeedback> {
  const { topic, recentMessages, latestMessage, studentLevel, grammarFocus } = context;

  const conversationHistory =
    recentMessages.length > 0
      ? `Recent conversation:\n${recentMessages.join('\n')}\n\nLatest message: "${latestMessage}"`
      : `Message: "${latestMessage}"`;

  const levelContext = studentLevel ? `Student level: ${studentLevel}` : '';
  const grammarContext =
    grammarFocus && grammarFocus.length > 0
      ? `Grammar focus areas: ${grammarFocus.join(', ')}`
      : '';

  const instructions = `You are a friendly English conversation tutor AI assistant. You monitor student conversations and provide brief, encouraging corrections when needed.

Current conversation topic: "${topic}"
${levelContext}
${grammarContext}

Your role:
1. Check for grammar errors - if found, provide a brief, friendly correction
2. Check if the conversation is on-topic - if it's drifting away from "${topic}", gently redirect
3. Keep your responses very brief (1-2 sentences max)
4. Be encouraging and positive
5. Only interject if there's a clear issue - don't correct minor things

Important:
- If the message is grammatically correct AND on-topic, respond with just: "OK"
- If you need to correct or redirect, start with a friendly phrase like "Quick note:" or "By the way:"

Safety rules:
- Never discuss inappropriate topics (sex, violence, suicide, etc.)
- If students discuss negative topics, redirect to positive conversation

Context:
${conversationHistory}`;

  // Generate response using Mastra
  const response = await conversationAgent.generate([
    { role: 'system', content: instructions },
    { role: 'user', content: latestMessage },
  ]);

  const message = response.text || '';

  // Parse the response to determine feedback type and severity
  return parseFeedbackResponse(message);
}

/**
 * Parse agent response to structured feedback
 */
function parseFeedbackResponse(response: string): ConversationFeedback {
  const lowerResponse = response.toLowerCase();

  // No action needed
  if (response === 'OK' || response.length < 3) {
    return {
      shouldInterject: false,
      feedbackType: null,
      message: '',
      severity: 'low',
    };
  }

  // Determine feedback type
  let feedbackType: ConversationFeedback['feedbackType'] = 'encouragement';
  if (
    lowerResponse.includes('grammar') ||
    lowerResponse.includes('should be') ||
    lowerResponse.includes('correction')
  ) {
    feedbackType = 'grammar';
  } else if (lowerResponse.includes('topic') || lowerResponse.includes('back to')) {
    feedbackType = 'topic';
  } else if (
    lowerResponse.includes('inappropriate') ||
    lowerResponse.includes('not discuss') ||
    lowerResponse.includes("let's talk about")
  ) {
    feedbackType = 'safety';
  }

  // Determine severity
  let severity: ConversationFeedback['severity'] = 'low';
  if (feedbackType === 'safety') {
    severity = 'high';
  } else if (feedbackType === 'grammar') {
    severity = 'medium';
  }

  return {
    shouldInterject: true,
    feedbackType,
    message: response,
    severity,
  };
}

/**
 * Check grammar in a text message
 *
 * @param text - Text to check
 * @param level - Optional student level for appropriate feedback
 * @returns Grammar correction result
 */
export async function checkGrammar(
  text: string,
  level?: string
): Promise<GrammarCorrectionResult> {
  const instructions = `You are a grammar checking assistant for English language learners${level ? ` at ${level} level` : ''}.

Analyze the following text for grammar errors and respond in this exact JSON format:
{
  "hasIssues": boolean,
  "issues": [
    {
      "original": "the incorrect phrase",
      "correction": "the corrected phrase",
      "explanation": "brief explanation",
      "severity": "minor|moderate|major"
    }
  ],
  "overallFeedback": "brief encouraging feedback"
}

Text to check: "${text}"`;

  const response = await conversationAgent.generate([
    { role: 'system', content: instructions },
    { role: 'user', content: text },
  ]);

  try {
    return JSON.parse(response.text || '{}');
  } catch {
    return {
      hasIssues: false,
      issues: [],
    };
  }
}

/**
 * Check if a message adheres to the topic
 *
 * @param message - Message to check
 * @param topic - Expected topic
 * @param context - Optional recent conversation context
 * @returns Topic adherence result
 */
export async function checkTopicAdherence(
  message: string,
  topic: string,
  context?: string[]
): Promise<TopicAdherenceResult> {
  const contextStr = context ? `\n\nRecent context:\n${context.join('\n')}` : '';

  const instructions = `You check if a message is related to the topic: "${topic}"

Respond in this exact JSON format:
{
  "isOnTopic": boolean,
  "score": number (0-100),
  "redirectionSuggestion": "suggestion if off-topic or null"
}

Message: "${message}"${contextStr}`;

  const response = await conversationAgent.generate([
    { role: 'system', content: instructions },
    { role: 'user', content: message },
  ]);

  try {
    return JSON.parse(response.text || '{}');
  } catch {
    return {
      isOnTopic: true,
      score: 80,
    };
  }
}
