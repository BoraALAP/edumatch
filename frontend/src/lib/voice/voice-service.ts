/**
 * Voice Service
 *
 * Purpose: Manage voice conversation sessions with OpenAI Realtime API via Mastra
 * Features:
 * - Initialize and manage voice sessions
 * - Send audio data to OpenAI Realtime API
 * - Receive and play audio responses
 * - Track transcripts for analytics
 * - Silent background analysis during conversation
 * - Session lifecycle management
 */

'use client';

import { OpenAIRealtimeVoice } from '@mastra/voice-openai-realtime';
import { pcm16ToBase64, base64ToPcm16, playPcm16Audio } from '@/lib/audio';
import { analyticsService, type AnalyticsIssue } from '@/lib/analytics';
import type { SoloPracticeContext } from '@/mastra/agents/solo-practice-agent';

export interface VoiceSessionConfig {
  sessionId: string;
  studentId: string;
  topic: string;
  studentLevel: string;
  model?: string;
  speaker?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  onTranscript?: (transcript: string, isStudent: boolean) => void;
  onAudioResponse?: (audioData: ArrayBuffer) => void;
  onError?: (error: Error) => void;
  onAnalysis?: (analysis: VoiceAnalysisResult) => void;
}

export interface VoiceAnalysisResult {
  grammarIssues: AnalyticsIssue[];
  pronunciationIssues: AnalyticsIssue[];
  accentIssues: AnalyticsIssue[];
  fluencyIssues: AnalyticsIssue[];
  pronunciationScore?: number;
  fluencyScore?: number;
  accentScore?: number;
}

export interface VoiceMessage {
  id: string;
  content: string;
  isStudent: boolean;
  timestamp: Date;
  audioUrl?: string;
  audioDuration?: number;
  analysis?: VoiceAnalysisResult;
}

export class VoiceSessionService {
  private voice: OpenAIRealtimeVoice | null = null;
  private config: VoiceSessionConfig;
  private isConnected = false;
  private messages: VoiceMessage[] = [];
  private currentStudentTranscript = '';
  private currentCoachTranscript = '';
  private accumulatedAnalysis: VoiceAnalysisResult = {
    grammarIssues: [],
    pronunciationIssues: [],
    accentIssues: [],
    fluencyIssues: [],
  };

  constructor(config: VoiceSessionConfig) {
    this.config = config;
  }

  /**
   * Initialize voice session
   */
  async initialize(initialInstructions: string): Promise<void> {
    try {
      this.voice = new OpenAIRealtimeVoice({
        model: this.config.model || 'gpt-4o-mini-realtime',
        speaker: this.config.speaker || 'alloy',
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        debug: false,
      });

      // Connect to OpenAI Realtime API
      await this.voice.connect();

      this.isConnected = true;

      // Set up event listeners
      this.setupEventListeners();

      // Send initial instructions
      await this.sendSystemMessage(initialInstructions);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to initialize voice session');
      this.config.onError?.(err);
      throw err;
    }
  }

  /**
   * Set up event listeners for voice session
   */
  private setupEventListeners(): void {
    if (!this.voice) return;

    // Listen for transcript updates
    this.voice.on?.('transcript', (data: { text: string; isFinal: boolean; role: 'user' | 'assistant' }) => {
      if (data.role === 'user') {
        this.currentStudentTranscript = data.text;
        if (data.isFinal) {
          this.handleStudentTranscript(data.text);
        }
      } else {
        this.currentCoachTranscript = data.text;
        if (data.isFinal) {
          this.handleCoachTranscript(data.text);
        }
      }

      this.config.onTranscript?.(data.text, data.role === 'user');
    });

    // Listen for audio responses
    this.voice.on?.('audio', async (data: { audio: string }) => {
      try {
        const pcm16 = base64ToPcm16(data.audio);
        this.config.onAudioResponse?.(pcm16.buffer);

        // Auto-play the response
        await playPcm16Audio(pcm16);
      } catch (error) {
        console.error('Error playing audio response:', error);
      }
    });

    // Listen for errors
    this.voice.on?.('error', (error: Error) => {
      this.config.onError?.(error);
    });
  }

  /**
   * Send audio data to the voice session
   */
  async sendAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.isConnected || !this.voice) {
      throw new Error('Voice session not connected');
    }

    try {
      // Convert PCM16 to Base64
      const base64Audio = pcm16ToBase64(audioData);

      // Send to OpenAI Realtime API
      await this.voice.send({
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to send audio');
      this.config.onError?.(err);
      throw err;
    }
  }

  /**
   * Commit the audio buffer (end of user speech)
   */
  async commitAudio(): Promise<void> {
    if (!this.isConnected || !this.voice) {
      throw new Error('Voice session not connected');
    }

    try {
      await this.voice.send({
        type: 'input_audio_buffer.commit',
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to commit audio');
      this.config.onError?.(err);
      throw err;
    }
  }

  /**
   * Handle finalized student transcript
   */
  private async handleStudentTranscript(transcript: string): Promise<void> {
    const message: VoiceMessage = {
      id: crypto.randomUUID(),
      content: transcript,
      isStudent: true,
      timestamp: new Date(),
    };

    this.messages.push(message);

    // Analyze the transcript silently in the background
    await this.analyzeTranscript(transcript, message.id);
  }

  /**
   * Handle finalized coach transcript
   */
  private handleCoachTranscript(transcript: string): void {
    const message: VoiceMessage = {
      id: crypto.randomUUID(),
      content: transcript,
      isStudent: false,
      timestamp: new Date(),
    };

    this.messages.push(message);
  }

  /**
   * Analyze transcript silently in the background
   */
  private async analyzeTranscript(transcript: string, messageId: string): Promise<void> {
    try {
      // Call analytics endpoint
      const response = await fetch('/api/practice/analyze-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.config.sessionId,
          transcript,
          studentLevel: this.config.studentLevel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze voice transcript');
      }

      const analysis: VoiceAnalysisResult = await response.json();

      // Accumulate analysis silently
      this.accumulatedAnalysis.grammarIssues.push(...analysis.grammarIssues);
      this.accumulatedAnalysis.pronunciationIssues.push(...analysis.pronunciationIssues);
      this.accumulatedAnalysis.accentIssues.push(...analysis.accentIssues);
      this.accumulatedAnalysis.fluencyIssues.push(...analysis.fluencyIssues);

      // Store in message
      const message = this.messages.find((m) => m.id === messageId);
      if (message) {
        message.analysis = analysis;
      }

      // Notify via callback (but don't display to user)
      this.config.onAnalysis?.(analysis);
    } catch (error) {
      console.error('Error analyzing transcript:', error);
      // Don't throw - analysis should be silent and non-blocking
    }
  }

  /**
   * Send a system message (instructions)
   */
  private async sendSystemMessage(content: string): Promise<void> {
    if (!this.isConnected || !this.voice) {
      throw new Error('Voice session not connected');
    }

    try {
      await this.voice.send({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'system',
          content: [{ type: 'input_text', text: content }],
        },
      });
    } catch (error) {
      console.error('Error sending system message:', error);
    }
  }

  /**
   * Speak a message (coach speaking)
   */
  async speak(message: string): Promise<void> {
    if (!this.isConnected || !this.voice) {
      throw new Error('Voice session not connected');
    }

    try {
      await this.voice.speak(message);

      // Add to messages
      this.messages.push({
        id: crypto.randomUUID(),
        content: message,
        isStudent: false,
        timestamp: new Date(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to speak message');
      this.config.onError?.(err);
      throw err;
    }
  }

  /**
   * Get accumulated analysis
   */
  getAccumulatedAnalysis(): VoiceAnalysisResult {
    return { ...this.accumulatedAnalysis };
  }

  /**
   * Get conversation messages
   */
  getMessages(): VoiceMessage[] {
    return [...this.messages];
  }

  /**
   * Clear accumulated analysis (e.g., after showing summary)
   */
  clearAccumulatedAnalysis(): void {
    this.accumulatedAnalysis = {
      grammarIssues: [],
      pronunciationIssues: [],
      accentIssues: [],
      fluencyIssues: [],
    };
  }

  /**
   * Generate session summary
   */
  async generateSessionSummary(): Promise<{
    totalMessages: number;
    studentMessages: number;
    coachMessages: number;
    analysis: VoiceAnalysisResult;
    strengths: string[];
    areasForImprovement: string[];
    keyTakeaways: string[];
  }> {
    const studentMessages = this.messages.filter((m) => m.isStudent);
    const coachMessages = this.messages.filter((m) => !m.isStudent);

    // Calculate average scores
    const pronunciationScores = studentMessages
      .map((m) => m.analysis?.pronunciationScore)
      .filter((s): s is number => s !== undefined);

    const fluencyScores = studentMessages
      .map((m) => m.analysis?.fluencyScore)
      .filter((s): s is number => s !== undefined);

    const accentScores = studentMessages
      .map((m) => m.analysis?.accentScore)
      .filter((s): s is number => s !== undefined);

    const avgPronunciation =
      pronunciationScores.length > 0
        ? pronunciationScores.reduce((a, b) => a + b, 0) / pronunciationScores.length
        : undefined;

    const avgFluency =
      fluencyScores.length > 0
        ? fluencyScores.reduce((a, b) => a + b, 0) / fluencyScores.length
        : undefined;

    const avgAccent =
      accentScores.length > 0
        ? accentScores.reduce((a, b) => a + b, 0) / accentScores.length
        : undefined;

    // Generate strengths and improvements
    const strengths: string[] = [];
    const areasForImprovement: string[] = [];

    if (avgPronunciation !== undefined) {
      if (avgPronunciation > 80) {
        strengths.push('Excellent pronunciation clarity');
      } else if (avgPronunciation < 60) {
        areasForImprovement.push('Focus on pronunciation practice');
      }
    }

    if (avgFluency !== undefined) {
      if (avgFluency > 80) {
        strengths.push('Great conversational fluency');
      } else if (avgFluency < 60) {
        areasForImprovement.push('Work on reducing hesitations');
      }
    }

    if (this.accumulatedAnalysis.grammarIssues.length === 0) {
      strengths.push('No grammar issues detected');
    } else if (this.accumulatedAnalysis.grammarIssues.length > 5) {
      areasForImprovement.push('Review grammar fundamentals');
    }

    return {
      totalMessages: this.messages.length,
      studentMessages: studentMessages.length,
      coachMessages: coachMessages.length,
      analysis: {
        ...this.accumulatedAnalysis,
        pronunciationScore: avgPronunciation,
        fluencyScore: avgFluency,
        accentScore: avgAccent,
      },
      strengths,
      areasForImprovement,
      keyTakeaways: [
        `You spoke ${studentMessages.length} times during this session`,
        ...strengths,
        ...areasForImprovement,
      ],
    };
  }

  /**
   * Disconnect voice session
   */
  async disconnect(): Promise<void> {
    if (this.voice && this.isConnected) {
      try {
        await this.voice.disconnect?.();
        this.isConnected = false;
        this.voice = null;
      } catch (error) {
        console.error('Error disconnecting voice session:', error);
      }
    }
  }

  /**
   * Check if session is connected
   */
  isSessionConnected(): boolean {
    return this.isConnected;
  }
}

/**
 * Create and initialize a voice session
 */
export async function createVoiceSession(
  config: VoiceSessionConfig,
  context: SoloPracticeContext
): Promise<VoiceSessionService> {
  const service = new VoiceSessionService(config);

  // Build initial instructions
  const instructions = `You are a friendly English conversation coach helping a student practice speaking.

Student Level: ${context.studentLevel}
Current Topic: "${context.topic}"

Your role:
1. Engage naturally in conversation about "${context.topic}"
2. Ask follow-up questions to keep the conversation flowing
3. Match vocabulary and grammar complexity to ${context.studentLevel} level
4. Be encouraging and positive
5. Keep responses brief (2-3 sentences)

IMPORTANT: Do NOT correct grammar or pronunciation in your responses. Those are being analyzed separately.
Your job is to maintain natural, engaging conversation.

**Safety** - Avoid any negative, inappropriate, or harmful topics.`;

  await service.initialize(instructions);

  return service;
}
