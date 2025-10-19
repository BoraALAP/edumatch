/**
 * OpenAI Agent Provider
 *
 * Implements the AI Provider interface using OpenAI Agents SDK.
 * This is the current implementation that uses OpenAI's agent framework.
 */

import { Agent, run } from '@openai/agents';
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

export class OpenAIAgentProvider implements AIProvider {
  readonly type: AIProviderType = 'openai';
  readonly name = 'OpenAI Agents';

  private model: string;
  private temperature: number;

  constructor(config?: { model?: string; temperature?: number }) {
    this.model = config?.model || 'gpt-4o-mini';
    this.temperature = config?.temperature || 0.7;
  }

  // ============================================================================
  // Conversation Monitoring (Main feature using OpenAI Agents)
  // ============================================================================

  async monitorConversation(context: ConversationContext): Promise<ConversationFeedback> {
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

    // Create agent using OpenAI Agents SDK
    const agent = new Agent({
      name: 'ConversationListener',
      model: this.model,
      instructions: `You are a friendly English conversation tutor AI assistant. You monitor student conversations and provide brief, encouraging corrections when needed.

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
${conversationHistory}`,
    });

    // Run the agent
    const result = await run(agent, latestMessage);
    const response = result.finalOutput || '';

    // Parse the response to determine feedback type and severity
    return this.parseFeedbackResponse(response);
  }

  private parseFeedbackResponse(response: string): ConversationFeedback {
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

  // ============================================================================
  // Grammar Checking
  // ============================================================================

  async checkGrammar(text: string, level?: string): Promise<GrammarCorrectionResult> {
    const agent = new Agent({
      name: 'GrammarChecker',
      model: this.model,
      instructions: `You are a grammar checking assistant for English language learners${level ? ` at ${level} level` : ''}.

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

Text to check: "${text}"`,
    });

    const result = await run(agent, text);
    const response = result.finalOutput || '{}';

    try {
      return JSON.parse(response);
    } catch {
      return {
        hasIssues: false,
        issues: [],
      };
    }
  }

  // ============================================================================
  // Topic Adherence
  // ============================================================================

  async checkTopicAdherence(
    message: string,
    topic: string,
    context?: string[]
  ): Promise<TopicAdherenceResult> {
    const contextStr = context ? `\n\nRecent context:\n${context.join('\n')}` : '';

    const agent = new Agent({
      name: 'TopicChecker',
      model: this.model,
      instructions: `You check if a message is related to the topic: "${topic}"

Respond in this exact JSON format:
{
  "isOnTopic": boolean,
  "score": number (0-100),
  "redirectionSuggestion": "suggestion if off-topic or null"
}

Message: "${message}"${contextStr}`,
    });

    const result = await run(agent, message);
    const response = result.finalOutput || '{}';

    try {
      return JSON.parse(response);
    } catch {
      return {
        isOnTopic: true,
        score: 80,
      };
    }
  }

  // ============================================================================
  // Session Summary Generation
  // ============================================================================

  async generateSessionSummary(
    messages: AIMessage[],
    topic: string,
    studentLevel?: string
  ): Promise<SessionSummary> {
    const conversationText = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const agent = new Agent({
      name: 'SessionReviewer',
      model: this.model,
      instructions: `You are a session feedback agent. Analyze this conversation and provide a detailed summary.

Topic: "${topic}"
${studentLevel ? `Student Level: ${studentLevel}` : ''}

Respond in this exact JSON format:
{
  "overallFeedback": "2-3 sentences of encouraging overall feedback",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["area 1", "area 2"],
  "grammarPatterns": {"pattern": count},
  "vocabularyUsed": ["word1", "word2"],
  "topicAdherence": number (0-100),
  "participationScore": number (0-100),
  "nextSteps": ["next step 1", "next step 2"]
}

Conversation:
${conversationText}`,
    });

    const result = await run(agent, 'Generate summary');
    const response = result.finalOutput || '{}';

    try {
      return JSON.parse(response);
    } catch {
      return {
        overallFeedback: 'Great conversation!',
        strengths: [],
        areasForImprovement: [],
        grammarPatterns: {},
        vocabularyUsed: [],
        topicAdherence: 80,
        participationScore: 80,
        nextSteps: [],
      };
    }
  }

  // ============================================================================
  // Voice Features (Placeholders for future implementation)
  // ============================================================================

  async transcribeAudio(audio: Blob): Promise<TranscriptionResult> {
    // TODO: Implement using OpenAI Whisper API
    throw new Error('Voice transcription not yet implemented for OpenAI Agent provider');
  }

  async generateSpeech(text: string, options?: VoiceGenerationOptions): Promise<Blob> {
    // TODO: Implement using OpenAI TTS API
    throw new Error('Text-to-speech not yet implemented for OpenAI Agent provider');
  }

  // ============================================================================
  // Streaming (For future enhancement)
  // ============================================================================

  streamResponse(prompt: string): ReadableStream<string> {
    // TODO: Implement streaming with OpenAI Agents SDK
    throw new Error('Streaming not yet implemented for OpenAI Agent provider');
  }
}
