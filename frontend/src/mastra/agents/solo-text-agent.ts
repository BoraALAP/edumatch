/**
 * Solo Text Practice Agent
 *
 * Purpose: Text-based conversation coach for solo practice
 * Features:
 * - Text-only conversation
 * - Grammar and topic checking
 * - Adaptive complexity based on level
 * - Encouraging feedback
 */

import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { grammarCheckerTool, topicAdherenceTool } from '../tools';

export interface SoloTextContext {
  topic: string;
  studentLevel: string;
  learningGoals?: string[];
  conversationHistory: Array<{ role: 'student' | 'coach'; content: string }>;
  grammarFocus?: string[];
}

export interface SoloTextResponse {
  message: string;
  includesCorrection: boolean;
  correction?: string;
}

/**
 * Get complexity guidelines based on CEFR level
 */
function getComplexityGuidelines(level: string): string {
  const guidelines: Record<string, string> = {
    A1: '(Beginner: Use simple present/past tense, basic vocabulary, short sentences)',
    A2: '(Elementary: Simple tenses, common phrases, familiar topics)',
    B1: '(Intermediate: Past/present/future tenses, some complex sentences, everyday topics)',
    B2: '(Upper-Intermediate: All tenses, complex sentences, abstract topics)',
    C1: '(Advanced: Nuanced language, idiomatic expressions, sophisticated topics)',
    C2: '(Mastery: Native-like fluency, subtle distinctions, any topic)',
  };

  return guidelines[level] || guidelines.B1;
}

/**
 * Build the instruction prompt for the text agent
 */
export function buildSoloTextInstructions(context: SoloTextContext): string {
  const {
    topic,
    studentLevel,
    learningGoals = [],
    conversationHistory,
    grammarFocus = [],
  } = context;

  const complexity = getComplexityGuidelines(studentLevel);

  const historyText =
    conversationHistory.length > 0
      ? conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n')
      : 'This is the start of the conversation.';

  const grammarContext =
    grammarFocus.length > 0
      ? `\nGrammar focus areas: ${grammarFocus.join(', ')}`
      : '';

  const goalsContext =
    learningGoals.length > 0
      ? `\nLearning goals: ${learningGoals.join(', ')}`
      : '';

  return `You are a friendly, encouraging English conversation coach helping a student practice writing.

Student Level: ${studentLevel} ${complexity}
Current Topic: "${topic}"${goalsContext}${grammarContext}

Your role:
1. **Engage naturally**: Have a genuine, interesting conversation about "${topic}"
2. **Ask questions**: Keep the conversation flowing with open-ended questions
3. **Adapt complexity**: Match your vocabulary and grammar to ${studentLevel} level
4. **Stay on topic**: Keep the conversation focused on "${topic}"
5. **Be encouraging**: Praise good usage and effort
6. **Show interest**: React naturally to what the student shares

IMPORTANT: Do NOT correct grammar errors in your responses. Grammar corrections are handled separately by another system.
Your job is to keep the conversation flowing naturally and make the student feel comfortable practicing.

**Safety** - No Negative thoughts or conversations, No Conversation about SEX, SUICIDE, VIOLENCE, GUNS, anything that can affect Student in bad way.

Keep responses:
- 2-3 sentences max
- Natural and conversational
- At ${studentLevel} vocabulary level
- Encouraging and positive
- NO grammar corrections in your response

Conversation so far:
${historyText}`;
}

/**
 * Create the Solo Text Practice Agent
 */
export const soloTextAgent = new Agent({
  name: 'solo-text-coach',
  model: openai('gpt-4o-mini'),
  instructions: 'You are a friendly English conversation coach. You will receive context-specific instructions with each message.',
  tools: {
    check_grammar: grammarCheckerTool,
    check_topic_adherence: topicAdherenceTool,
  },
});

/**
 * Run the solo text practice agent
 */
export async function runSoloTextAgent(
  context: SoloTextContext,
  studentMessage: string
): Promise<SoloTextResponse> {
  const instructions = buildSoloTextInstructions(context);

  const response = await soloTextAgent.generate([
    { role: 'system', content: instructions },
    { role: 'user', content: studentMessage },
  ]);

  const message = response.text || 'I understand. Can you tell me more?';

  return {
    message,
    includesCorrection: false,
    correction: undefined,
  };
}

/**
 * Generate a starter prompt for text practice
 */
export async function generateTextStarterPrompt(context: {
  topic: string;
  studentLevel: string;
  learningGoals?: string[];
}): Promise<string> {
  const { topic, studentLevel, learningGoals = [] } = context;

  const goalsContext =
    learningGoals.length > 0 ? `\nLearning goals: ${learningGoals.join(', ')}` : '';

  const instructions = `Generate a friendly, engaging opening message to start a text-based conversation practice session.

Topic: "${topic}"
Student Level: ${studentLevel}${goalsContext}

Requirements:
1. Welcome the student warmly
2. Introduce the topic briefly
3. Ask an engaging opening question to start the conversation
4. Match vocabulary to ${studentLevel} level
5. Keep it to 2-3 sentences

Generate a starter prompt now for the topic "${topic}" at ${studentLevel} level:`;

  const response = await soloTextAgent.generate([
    { role: 'system', content: instructions },
    { role: 'user', content: `Generate starter for topic: ${topic}` },
  ]);

  return response.text || `Hi! Let's talk about ${topic}. What interests you about this topic?`;
}
