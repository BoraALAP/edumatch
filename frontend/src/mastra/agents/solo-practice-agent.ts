/**
 * Solo Practice Agent (Coach) - Mastra Implementation
 *
 * This agent provides one-on-one conversation practice for individual learners.
 * Features:
 * - Engages students in conversation on specific topics
 * - Adjusts complexity based on proficiency level (A1-C2)
 * - Provides real-time corrections and encouragement
 * - Keeps conversation within assigned topic
 * - Supports voice interaction with OpenAI Realtime and ElevenLabs
 *
 * Migrated from OpenAI Agents SDK to Mastra for:
 * - Unified voice and text capabilities
 * - Better streaming support
 * - Multi-provider flexibility
 * - Built-in observability
 */

import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { OpenAIRealtimeVoice } from '@mastra/voice-openai-realtime';

export interface SoloPracticeContext {
  topic: string;
  studentLevel: string; // A1, A2, B1, B2, C1, C2
  learningGoals?: string[];
  conversationHistory: Array<{ role: 'student' | 'coach'; content: string }>;
  grammarFocus?: string[];
}

export interface SoloPracticeResponse {
  message: string;
  includesCorrection: boolean;
  correction?: {
    original: string;
    corrected: string;
    explanation: string;
  };
  suggestedNextTopic?: string;
}

/**
 * Get complexity guidelines based on CEFR level
 */
export function getComplexityGuidelines(level: string): string {
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
 * Build the instruction prompt for the agent
 */
export function buildSoloPracticeInstructions(context: SoloPracticeContext): string {
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

  return `You are a friendly, encouraging English conversation coach helping a student practice speaking.

Student Level: ${studentLevel} ${complexity}
Current Topic: "${topic}"${goalsContext}${grammarContext}

Your role:
1. **Engage naturally**: Have a genuine, interesting conversation about "${topic}"
2. **Ask questions**: Keep the conversation flowing with open-ended questions
3. **Adapt complexity**: Match your vocabulary and grammar to ${studentLevel} level
4. **Provide corrections**: If you notice grammar errors, gently correct them inline
5. **Stay on topic**: Keep the conversation focused on "${topic}"
6. **Be encouraging**: Praise good usage and effort

Response format:
- If no grammar issues: Just respond naturally to continue the conversation
- If grammar issues: Include a brief, friendly correction in your response

Correction style examples:
- "That's interesting! By the way, we say 'I went to Paris' instead of 'I go to Paris'. So, what did you do there?"
- "Great! Just a quick note: it's 'more beautiful' not 'more beautifuller'. What else did you notice about the city?"

**Safety** - No Negative thoughts or conversations, No Conversation about SEX, SUICIDE, VIOLENCE, GUNS, anything that can affect Student in bad way.

Keep responses:
- 2-3 sentences max
- Natural and conversational
- At ${studentLevel} vocabulary level
- Encouraging and positive

Conversation so far:
${historyText}`;
}

/**
 * Create the Solo Practice Agent with OpenAI Realtime Voice support
 * Voice is configured separately from the agent
 */
const voiceInstance = new OpenAIRealtimeVoice({
  model: 'gpt-4o-mini-realtime',
  speaker: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
  apiKey: process.env.OPENAI_API_KEY,
  debug: false,
});

/**
 * Create the Solo Practice Agent
 */
export const soloPracticeAgent = new Agent({
  name: 'solo-practice-coach',
  model: openai('gpt-4o-mini'),
  instructions: 'You are a friendly English conversation coach. You will receive context-specific instructions with each message.',
});

/**
 * Run the solo practice agent and get a response
 *
 * @param context - Conversation context including topic, level, history
 * @param studentMessage - The student's latest message
 * @returns Agent response with correction detection
 */
export async function runSoloPracticeAgent(
  context: SoloPracticeContext,
  studentMessage: string
): Promise<SoloPracticeResponse> {
  // Build instructions with full context
  const instructions = buildSoloPracticeInstructions(context);

  // Generate response using Mastra
  const response = await soloPracticeAgent.generate([
    { role: 'system', content: instructions },
    { role: 'user', content: studentMessage },
  ]);

  const message = response.text || 'I understand. Can you tell me more?';

  // Parse for corrections (basic detection)
  const includesCorrection = hasGrammarCorrection(message);

  return {
    message,
    includesCorrection,
  };
}

/**
 * Generate a starter prompt to begin solo practice
 *
 * @param context - Initial context with topic and level
 * @returns Engaging opening message
 */
export async function generateStarterPrompt(context: {
  topic: string;
  studentLevel: string;
  learningGoals?: string[];
}): Promise<string> {
  const { topic, studentLevel, learningGoals = [] } = context;

  const goalsContext =
    learningGoals.length > 0 ? `\nLearning goals: ${learningGoals.join(', ')}` : '';

  const instructions = `Generate a friendly, engaging opening message to start a conversation practice session.

Topic: "${topic}"
Student Level: ${studentLevel}${goalsContext}

Requirements:
1. Welcome the student warmly
2. Introduce the topic briefly
3. Ask an engaging opening question to start the conversation
4. Match vocabulary to ${studentLevel} level
5. Keep it to 2-3 sentences

Example for A1 level, topic "Travel":
"Hello! I'm excited to practice English with you today. Let's talk about travel! Have you traveled to any interesting places recently?"

Example for B2 level, topic "Technology":
"Hi there! Today we'll be discussing technology and its impact on our daily lives. I'd love to hear your thoughts - how has technology changed the way you communicate with friends and family?"

Generate a starter prompt now for the topic "${topic}" at ${studentLevel} level:`;

  const response = await soloPracticeAgent.generate([
    { role: 'system', content: instructions },
    { role: 'user', content: `Generate starter for topic: ${topic}` },
  ]);

  return response.text || `Hi! Let's talk about ${topic}. What interests you about this topic?`;
}

/**
 * Start a voice session with the solo practice agent
 *
 * @param context - Practice session context
 * @returns Voice session controller
 */
export async function startVoiceSession(context: SoloPracticeContext) {
  // Connect to voice
  await voiceInstance.connect();

  // Initial greeting
  const greeting = await generateStarterPrompt({
    topic: context.topic,
    studentLevel: context.studentLevel,
    learningGoals: context.learningGoals,
  });

  await voiceInstance.speak(greeting);

  return {
    agent: soloPracticeAgent,
    voice: voiceInstance,
    disconnect: async () => {
      // Voice sessions automatically close when connection ends
      await voiceInstance.connect(); // This will close the previous connection
    },
  };
}

/**
 * Detect whether a coach response includes a grammar correction cue
 */
export function hasGrammarCorrection(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('we say') ||
    normalized.includes('instead of') ||
    normalized.includes('quick note') ||
    normalized.includes('by the way')
  );
}
