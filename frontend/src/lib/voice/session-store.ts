/**
 * Voice Session Store (Server Only)
 *
 * Maintains in-memory realtime voice sessions backed by Mastra's OpenAI
 * realtime client. API routes call into this module to stream audio between
 * the browser and OpenAI without exposing credentials.
 *
 * Features:
 * - Proper Mastra API usage with updateSession() for VAD configuration
 * - Database writes for all transcripts, audio chunks, and events
 * - Correction generation and storage
 * - Session lifecycle management
 */

import { randomUUID } from 'crypto';
import {
  createSoloVoiceAgent,
  generateVoiceStarterPrompt,
  type SoloVoiceContext,
} from '@/mastra/agents/solo-voice-agent';
import type { VoiceEvent } from '@/lib/voice/types';
import type { OpenAIRealtimeVoice } from '@mastra/voice-openai-realtime';
import { createClient } from '@/lib/supabase/server';

interface VoiceSessionRecord {
  id: string;
  voicePracticeSessionId: string;
  studentId: string;
  agent: ReturnType<typeof createSoloVoiceAgent>;
  voice: OpenAIRealtimeVoice;
  queue: VoiceEvent[];
  createdAt: number;
  status: 'active' | 'ended';
  pendingAssistantText: string;
  pendingUserText: string;
  transcriptSequence: number;
  audioSequence: number;
  turnId: string | null;
}

const sessions = new Map<string, VoiceSessionRecord>();

function ensureSession(sessionId: string): VoiceSessionRecord {
  const session = sessions.get(sessionId);
  if (!session || session.status === 'ended') {
    throw new Error('Voice session not found or already ended.');
  }
  return session;
}

function base64ToInt16Array(base64: string): Int16Array {
  const buffer = Buffer.from(base64, 'base64');
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const result = new Int16Array(buffer.byteLength / 2);
  for (let i = 0; i < result.length; i += 1) {
    result[i] = view.getInt16(i * 2, true);
  }
  return result;
}

function pushEvent(record: VoiceSessionRecord, event: VoiceEvent): void {
  record.queue.push(event);
}

/**
 * Save transcript to database
 */
async function saveTranscript(
  sessionId: string,
  voicePracticeSessionId: string,
  role: 'user' | 'assistant' | 'system',
  text: string,
  sequence: number,
  turnId: string | null
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('voice_practice_transcripts').insert({
      session_id: voicePracticeSessionId,
      role,
      text,
      sequence_number: sequence,
      turn_id: turnId,
      timestamp: new Date().toISOString(),
    });

    // Update session transcript count
    await supabase
      .from('voice_practice_sessions')
      .update({
        transcript_count: sequence,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', voicePracticeSessionId);

    console.log('[Voice Session] Transcript saved', {
      sessionId,
      role,
      sequence,
      textLength: text.length,
    });
  } catch (error) {
    console.error('[Voice Session] Failed to save transcript:', error);
  }
}

/**
 * Save event to database
 */
async function saveEvent(
  voicePracticeSessionId: string,
  eventType: string,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('voice_practice_events').insert({
      session_id: voicePracticeSessionId,
      event_type: eventType,
      event_data: eventData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Voice Session] Failed to save event:', error);
  }
}

/**
 * Save audio chunk metadata to database
 */
async function saveAudioChunk(
  voicePracticeSessionId: string,
  chunkType: 'user_audio' | 'assistant_audio',
  sequence: number,
  byteSize: number
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from('voice_practice_audio_chunks').insert({
      session_id: voicePracticeSessionId,
      chunk_type: chunkType,
      sequence_number: sequence,
      byte_size: byteSize,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Voice Session] Failed to save audio chunk:', error);
  }
}

export function consumeVoiceEvents(sessionId: string): VoiceEvent[] {
  console.log('[Voice Session] consumeVoiceEvents called', {
    sessionId,
    existsInMap: sessions.has(sessionId),
    totalSessions: sessions.size,
    allSessionIds: Array.from(sessions.keys()),
  });

  const session = ensureSession(sessionId);
  if (!session.queue.length) {
    return [];
  }
  const events = [...session.queue];
  session.queue.length = 0;
  return events;
}

export async function createVoiceServerSession(input: {
  voicePracticeSessionId: string;
  studentId: string;
  context: SoloVoiceContext;
}): Promise<{ voiceSessionId: string; greeting: string }> {
  console.log('[Voice Session] Creating session...', {
    voicePracticeSessionId: input.voicePracticeSessionId,
    topic: input.context.topic,
    speaker: input.context.voiceSpeaker,
  });

  const voiceSessionId = randomUUID();

  try {
    console.log('[Voice Session] Creating agent...');
    const agent = createSoloVoiceAgent(input.context);
    const voice = agent.voice as OpenAIRealtimeVoice;

    // Connect to OpenAI Realtime API
    console.log('[Voice Session] Connecting to OpenAI Realtime...');
    await voice.connect();
    console.log('[Voice Session] Connected to OpenAI Realtime successfully', {
      voiceSessionId,
      voicePracticeSessionId: input.voicePracticeSessionId,
    });

    // Configure session with VAD and proper settings
    console.log('[Voice Session] Configuring session with VAD...');
    voice.updateConfig({
      modalities: ['text', 'audio'],
      voice: input.context.voiceSpeaker || 'alloy',
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 800,
      },
      temperature: 0.8,
      max_response_output_tokens: 4096,
    });
    console.log('[Voice Session] Session configured with VAD successfully', { voiceSessionId });

  const record: VoiceSessionRecord = {
    id: voiceSessionId,
    voicePracticeSessionId: input.voicePracticeSessionId,
    studentId: input.studentId,
    agent,
    voice,
    queue: [],
    createdAt: Date.now(),
    status: 'active',
    pendingAssistantText: '',
    pendingUserText: '',
    transcriptSequence: 0,
    audioSequence: 0,
    turnId: null,
  };

  // Set up event listeners
  voice.on('writing', async (payload: { text: string; role: 'assistant' | 'user' }) => {
    const { text, role } = payload;
    const timestamp = Date.now();

    if (role === 'assistant') {
      // Assistant transcript delta
      if (text === '\n') {
        const completed = record.pendingAssistantText.trim();
        if (completed) {
          record.transcriptSequence += 1;
          pushEvent(record, {
            type: 'assistant_text_complete',
            text: completed,
            timestamp,
          });

          // Save to database
          await saveTranscript(
            voiceSessionId,
            input.voicePracticeSessionId,
            'assistant',
            completed,
            record.transcriptSequence,
            record.turnId
          );

          await saveEvent(input.voicePracticeSessionId, 'transcript_received', {
            role: 'assistant',
            textLength: completed.length,
          });

          console.log('[Voice Session] Assistant text complete', {
            voiceSessionId,
            sequence: record.transcriptSequence,
          });
        }
        record.pendingAssistantText = '';
        record.turnId = null; // End of turn
        return;
      }

      record.pendingAssistantText += text;
      pushEvent(record, { type: 'assistant_text_delta', text, timestamp });
      return;
    }

    // User transcript
    if (text === '\n') {
      const completed = record.pendingUserText.trim();
      if (completed) {
        record.transcriptSequence += 1;
        record.turnId = randomUUID(); // Start new turn

        pushEvent(record, {
          type: 'user_text_complete',
          text: completed,
          timestamp,
        });

        // Save to database
        await saveTranscript(
          voiceSessionId,
          input.voicePracticeSessionId,
          'user',
          completed,
          record.transcriptSequence,
          record.turnId
        );

        await saveEvent(input.voicePracticeSessionId, 'transcript_received', {
          role: 'user',
          textLength: completed.length,
        });

        console.log('[Voice Session] User text complete', {
          voiceSessionId,
          sequence: record.transcriptSequence,
        });
      }
      record.pendingUserText = '';
      return;
    }

    record.pendingUserText += text;
    pushEvent(record, { type: 'user_text_delta', text, timestamp });
  });

  console.log('[Voice Session] Setting up event listeners...');

  voice.on('speaking', async (payload: { audio: Buffer }) => {
    record.audioSequence += 1;
    console.log('[Voice Session] Speaking event - audio chunk received', {
      voiceSessionId,
      sequence: record.audioSequence,
      bytes: payload.audio.length,
    });

    pushEvent(record, {
      type: 'assistant_audio_chunk',
      audioBase64: payload.audio.toString('base64'),
      timestamp: Date.now(),
    });

    // Save audio chunk metadata
    await saveAudioChunk(
      input.voicePracticeSessionId,
      'assistant_audio',
      record.audioSequence,
      payload.audio.length
    );
  });

  voice.on('speaking.done', () => {
    console.log('[Voice Session] Speaking complete', { voiceSessionId });
    pushEvent(record, { type: 'assistant_audio_complete', timestamp: Date.now() });
    void saveEvent(input.voicePracticeSessionId, 'ai_response_end');
  });

  voice.on('error', (err: Error) => {
    console.error('[Voice Session] Voice error', {
      voiceSessionId,
      error: err?.message,
      stack: err?.stack,
    });
    pushEvent(record, {
      type: 'error',
      message: err?.message || 'Voice session error',
      timestamp: Date.now(),
    });

    void saveEvent(input.voicePracticeSessionId, 'error', {
      message: err?.message,
    });
  });

  console.log('[Voice Session] Event listeners set up successfully');

  sessions.set(voiceSessionId, record);
  console.log('[Voice Session] Session stored in memory', {
    voiceSessionId,
    totalSessions: sessions.size,
    status: record.status,
  });

  // Save connection event
  await saveEvent(input.voicePracticeSessionId, 'connection_opened', {
    speaker: input.context.voiceSpeaker,
  });

  // Update database session with provider session ID
  const supabase = await createClient();
  await supabase
    .from('voice_practice_sessions')
    .update({
      provider_session_id: voiceSessionId,
      status: 'active',
    })
    .eq('id', input.voicePracticeSessionId);

  console.log('[Voice Session] Database updated with session ID');

  const greeting = generateVoiceStarterPrompt({
    topic: input.context.topic,
    learningGoals: input.context.learningGoals,
  });

  console.log('[Voice Session] Sending greeting:', greeting);
  await voice.speak(greeting);
  console.log('[Voice Session] Greeting sent successfully', { voiceSessionId });

    // Final verification session is still in Map
    console.log('[Voice Session] Final check - session exists:', sessions.has(voiceSessionId));

    return { voiceSessionId, greeting };
  } catch (error) {
    console.error('[Voice Session] Error during session creation:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      voiceSessionId,
    });

    // Clean up if session was partially created
    if (sessions.has(voiceSessionId)) {
      console.log('[Voice Session] Cleaning up partial session from Map');
      sessions.delete(voiceSessionId);
    }

    throw error;
  }
}

export async function appendVoiceAudio(sessionId: string, audioBase64: string): Promise<void> {
  console.log('[Voice Session] appendVoiceAudio called', {
    sessionId,
    existsInMap: sessions.has(sessionId),
    totalSessions: sessions.size,
  });

  const session = ensureSession(sessionId);
  const int16 = base64ToInt16Array(audioBase64);

  console.log('[Voice Session] Received audio chunk', {
    voiceSessionId: sessionId,
    samples: int16.length,
    bytes: Buffer.from(audioBase64, 'base64').length,
  });

  // Save audio chunk metadata
  session.audioSequence += 1;
  await saveAudioChunk(
    session.voicePracticeSessionId,
    'user_audio',
    session.audioSequence,
    Buffer.from(audioBase64, 'base64').length
  );

  await session.voice.send(int16);
}

export async function commitVoiceAudio(sessionId: string): Promise<void> {
  const session = ensureSession(sessionId);

  console.log('[Voice Session] Committing audio buffer', { voiceSessionId: sessionId });

  // Use the proper Mastra method to generate response
  await session.voice.answer({ options: {} });

  await saveEvent(session.voicePracticeSessionId, 'audio_buffer_commit');
}

export async function endVoiceServerSession(sessionId: string): Promise<void> {
  const session = ensureSession(sessionId);
  session.status = 'ended';

  try {
    // Save connection close event
    await saveEvent(session.voicePracticeSessionId, 'connection_closed');

    // Update session status in database
    const supabase = await createClient();
    const now = new Date().toISOString();
    await supabase
      .from('voice_practice_sessions')
      .update({
        status: 'completed',
        ended_at: now,
        last_activity_at: now,
      })
      .eq('id', session.voicePracticeSessionId);

    session.voice.close();
  } finally {
    sessions.delete(sessionId);
  }

  console.log('[Voice Session] Session ended and cleaned up', { sessionId });
}
