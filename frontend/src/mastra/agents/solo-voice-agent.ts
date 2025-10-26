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
  const { topic, studentLevel, learningGoals = [], grammarFocus = [] } = context;

  const goalsBlock = learningGoals.length
    ? `\nLearning goals: ${learningGoals.join(', ')}`
    : '';
  const grammarBlock = grammarFocus.length
    ? `\nGrammar focus areas: ${grammarFocus.join(', ')}`
    : '';
  const levelSupport = LEVEL_GUIDANCE[studentLevel] ?? LEVEL_GUIDANCE.B1;

  return `You are a friendly English conversation coach helping a student practice speaking via voice.

Student Level: ${studentLevel} ${levelSupport}
Current Topic: "${topic}"${goalsBlock}${grammarBlock}

Your role:
- Engage naturally about "${topic}"
- Ask encouraging follow-up questions that keep them speaking
- Match vocabulary and pace to the ${studentLevel} level
- Stay supportive and upbeat
- Provide gentle, helpful corrections when you notice grammar mistakes
- Suggest better ways to phrase things to help them improve
- Keep corrections brief and encouraging (e.g., "Great point! By the way, we'd say 'I went to the store' instead of 'I go to store'")
- Don't overwhelm them - maximum one correction every 2-3 turns
- Focus on the most important errors first

Correction style:
- First acknowledge what they said positively
- Then gently offer the correct version
- Briefly explain why it's better
- Keep moving the conversation forward

Response style:
- 2–3 sentences max per response
- Natural conversational tone and clear articulation
- Balance conversation flow with helpful feedback`;
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
