/**
 * Mastra Solo Voice Agent Helpers
 *
 * Wraps Mastra's speech-to-speech (STS) flow without custom classes so the
 * server can spin up lightweight realtime agents for each practice session.
 */

import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { OpenAIRealtimeVoice } from '@mastra/voice-openai-realtime';

export interface SoloVoiceContext {
  topic: string;
  studentLevel: string;
  learningGoals?: string[];
  grammarFocus?: string[];
  voiceSpeaker?: string;
  conversationHistory?: string; // Summary of previous conversation
}

export type SoloVoiceAgent = Agent & {
  voice: OpenAIRealtimeVoice;
  disconnect: () => Promise<void>;
};

const LEVEL_GUIDANCE: Record<string, string> = {
  A1: '(Beginner: simple present/past tense, basic vocabulary, short sentences)',
  A2: '(Elementary: simple tenses, common phrases, familiar topics)',
  B1: '(Intermediate: past/present/future tenses, some complex sentences, everyday topics)',
  B2: '(Upper-Intermediate: all tenses, complex sentences, abstract topics)',
  C1: '(Advanced: nuanced language, idiomatic expressions, sophisticated topics)',
  C2: '(Mastery: native-like fluency, subtle distinctions, any topic)',
};

function buildVoiceInstructions(context: SoloVoiceContext): string {
  const { topic, studentLevel, learningGoals = [], grammarFocus = [], conversationHistory } = context;

  const goalsBlock = learningGoals.length
    ? `\nLearning goals: ${learningGoals.join(', ')}`
    : '';
  const grammarBlock = grammarFocus.length
    ? `\nGrammar focus areas: ${grammarFocus.join(', ')}`
    : '';
  const historyBlock = conversationHistory
    ? `\n\nPREVIOUS CONVERSATION CONTEXT:\nThe student is resuming a conversation. Here's what was discussed before:\n${conversationHistory}\n\nAcknowledge you're continuing the conversation and pick up naturally from where you left off.`
    : '';
  const levelSupport = LEVEL_GUIDANCE[studentLevel] ?? LEVEL_GUIDANCE.B1;

  return `You are a friendly English conversation coach helping a student practice speaking via voice in REAL-TIME.${historyBlock}

Student Level: ${studentLevel} ${levelSupport}
Current Topic: "${topic}"${goalsBlock}${grammarBlock}

CRITICAL RULES:
1. ALWAYS listen for and acknowledge what the student ACTUALLY said
2. If you hear unclear or garbled speech, politely ask them to repeat
3. Provide corrections IMMEDIATELY when you hear mistakes - don't wait
4. Keep your responses SHORT (1-2 sentences) so students can interrupt you easily
5. Speak clearly and naturally with proper pacing

Your role:
- Engage naturally about "${topic}"
- Ask encouraging follow-up questions that keep them speaking
- Match vocabulary and pace to the ${studentLevel} level
- Stay supportive and upbeat
- ACTIVELY LISTEN and provide corrections for EVERY grammar mistake you hear
- Suggest better ways to phrase things to help them improve immediately

Correction style (USE THIS FOR EVERY MISTAKE):
Example: If student says "I go to store yesterday"
YOU SAY: "Great! Just a quick tip: we'd say 'I went to THE store yesterday'. Past tense 'went' and don't forget 'the'. So, what did you buy there?"

- ALWAYS give the correction right away
- Keep it brief (one sentence for correction)
- Then continue the conversation
- Focus on grammar, articles, and verb tenses

Response style:
- 1–2 SHORT sentences max per response
- This allows students to interrupt you if needed
- Natural conversational tone and clear articulation
- ALWAYS acknowledge what they said first before adding anything new
- If they repeat something similar multiple times, recognize you may have misheard the first time`;
}

export function generateVoiceStarterPrompt(context: {
  topic: string;
  studentLevel?: string;
  learningGoals?: string[];
}): string {
  const { topic, studentLevel, learningGoals = [] } = context;
  const goalLine = learningGoals.length
    ? ` I'm excited to help you work on ${learningGoals.join(', ')} today.`
    : '';
  const levelLine = studentLevel ? ` Let's aim for confident ${studentLevel} conversations.` : '';

  return `Hi there! Let's practice speaking about "${topic}".${goalLine}${levelLine} As we chat, I'll give you gentle tips to improve your English. What comes to mind first when you think about this topic?`;
}

export function createSoloVoiceAgent(context: SoloVoiceContext): SoloVoiceAgent {
  const voice = new OpenAIRealtimeVoice({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini-realtime-preview-2024-12-17',
    speaker: context.voiceSpeaker ?? 'alloy',
    debug: true,
  });

  const instructions = buildVoiceInstructions(context);

  // Note: Session configuration (VAD, modalities, etc.) happens after voice.connect()
  // in the session store using voice.updateSession()

  const agent = new Agent({
    name: 'solo-voice-coach',
    model: openai('gpt-4o-mini'),
    instructions,
    voice,
  }) as SoloVoiceAgent;

  agent.disconnect = async () => {
    voice.disconnect();
  };

  return agent;
}
