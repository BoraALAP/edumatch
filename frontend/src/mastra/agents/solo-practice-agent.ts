/**
 * Solo Practice Agent Facade
 *
 * This is a facade that delegates to the appropriate agent based on practice type:
 * - Text practice: Uses SoloTextAgent
 * - Voice practice: Uses SoloVoiceAgent
 *
 * Features:
 * - Unified interface for both text and voice practice
 * - Backward compatibility with existing code
 * - Delegates to specialized agents
 */

import {
  soloTextAgent,
  buildSoloTextInstructions,
  runSoloTextAgent,
  generateTextStarterPrompt,
  type SoloTextContext,
  type SoloTextResponse,
} from './solo-text-agent';
import {
  createSoloVoiceAgent,
  generateVoiceStarterPrompt,
  type SoloVoiceContext,
  SoloVoiceAgent,
} from './solo-voice-agent';

// Re-export types for backward compatibility
export type SoloPracticeContext = SoloTextContext;
export type SoloPracticeResponse = SoloTextResponse;

// Session type discriminator
export type PracticeType = 'text' | 'voice' | 'peer';

// Agent instances cache
const voiceAgentInstances = new Map<string, SoloVoiceAgent>();

// Backward compatibility exports
export const soloPracticeAgent = soloTextAgent;

export function buildSoloPracticeInstructions(context: SoloPracticeContext): string {
  return buildSoloTextInstructions(context);
}

/**
 * Run the solo practice agent (defaults to text mode for backward compatibility)
 *
 * @param context - Conversation context including topic, level, history
 * @param studentMessage - The student's latest message
 * @param practiceType - Type of practice session (text or voice)
 * @returns Agent response
 */
export async function runSoloPracticeAgent(
  context: SoloPracticeContext,
  studentMessage: string,
  practiceType: PracticeType = 'text'
): Promise<SoloPracticeResponse> {
  if (practiceType === 'voice') {
    throw new Error('Use createVoiceSession for voice practice. This function is for text only.');
  }

  // Delegate to text agent
  return runSoloTextAgent(context, studentMessage);
}

/**
 * Generate a starter prompt to begin solo practice
 *
 * @param context - Initial context with topic and level
 * @param practiceType - Type of practice (text or voice)
 * @returns Engaging opening message
 */
export async function generateStarterPrompt(
  context: {
    topic: string;
    studentLevel: string;
    learningGoals?: string[];
  },
  practiceType: PracticeType = 'text'
): Promise<string> {
  if (practiceType === 'voice') {
    return generateVoiceStarterPrompt(context);
  }

  return generateTextStarterPrompt(context);
}

/**
 * Create a voice session for solo practice
 *
 * @param sessionId - Unique session ID
 * @param context - Practice session context
 * @returns Voice agent instance
 */
export async function createVoiceSession(
  sessionId: string,
  context: SoloVoiceContext
): Promise<SoloVoiceAgent> {
  // Check if we already have an instance
  if (voiceAgentInstances.has(sessionId)) {
    const existing = voiceAgentInstances.get(sessionId)!;
    return existing;
  }

  // Create new voice agent
  const agent = await createSoloVoiceAgent(context);

  // Cache the instance
  voiceAgentInstances.set(sessionId, agent);

  // Generate and speak initial greeting
  const greeting = await generateVoiceStarterPrompt({
    topic: context.topic,
    studentLevel: context.studentLevel,
    learningGoals: context.learningGoals,
  });

  await agent.speak(greeting);

  return agent;
}

/**
 * End a voice session
 *
 * @param sessionId - Session ID
 */
export async function endVoiceSession(sessionId: string): Promise<void> {
  const agent = voiceAgentInstances.get(sessionId);
  if (agent) {
    await agent.disconnect();
    voiceAgentInstances.delete(sessionId);
  }
}

/**
 * Get an active voice session
 *
 * @param sessionId - Session ID
 * @returns Voice agent instance or null
 */
export function getVoiceSession(sessionId: string): SoloVoiceAgent | null {
  return voiceAgentInstances.get(sessionId) || null;
}

/**
 * @deprecated No longer used - corrections are now handled via separate analysis endpoint
 * Kept for backwards compatibility with existing code
 */
export function hasGrammarCorrection(message: string): boolean {
  void message;
  return false;
}
