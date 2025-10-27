/**
 * Voice Audio Hook
 *
 * Purpose: Manages audio sending and playback for voice sessions
 * Features:
 * - Audio buffer management
 * - Send audio chunks to server
 * - Play assistant audio responses
 * - Audio context lifecycle
 */

import { useCallback, useRef } from 'react';
import {
  arrayBufferToBase64,
  base64ToFloat32,
  mergeAudioBuffers,
  PCM_SAMPLE_RATE,
} from '@/lib/voice/audio-utils';

export function useVoiceAudio() {
  const audioBufferRef = useRef<ArrayBuffer[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioPlaybackRef = useRef(0);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: PCM_SAMPLE_RATE });
      audioPlaybackRef.current = audioContextRef.current.currentTime;
    }
    return audioContextRef.current;
  }, []);

  const sendAudioToServer = useCallback(async (sessionId: string, buffer: ArrayBuffer) => {
    try {
      const base64 = arrayBufferToBase64(buffer);
      console.log('[Voice Audio] Sending audio to server:', {
        sessionId,
        bytes: buffer.byteLength,
      });

      const response = await fetch(`/api/voice/session/${sessionId}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64 }),
      });

      if (!response.ok) {
        throw new Error('Failed to stream audio to voice session.');
      }
      console.log('[Voice Audio] Audio sent successfully');
    } catch (err) {
      console.error('[Voice Audio] Failed to send audio chunk:', err);
      throw err;
    }
  }, []);

  const flushAudioBuffer = useCallback(
    async (sessionId: string) => {
      if (audioBufferRef.current.length === 0) {
        return;
      }

      const merged = mergeAudioBuffers(audioBufferRef.current);
      audioBufferRef.current = [];
      await sendAudioToServer(sessionId, merged);
    },
    [sendAudioToServer]
  );

  const commitVoiceBuffer = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/voice/session/${sessionId}/commit`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to commit voice buffer.');
      }
      console.log('[Voice Audio] Commit request sent', { sessionId });
    } catch (err) {
      console.error('[Voice Audio] Failed to commit audio buffer:', err);
      throw err;
    }
  }, []);

  const commitBufferedAudio = useCallback(
    async (sessionId: string) => {
      await flushAudioBuffer(sessionId);
      await commitVoiceBuffer(sessionId);
    },
    [flushAudioBuffer, commitVoiceBuffer]
  );

  const playAssistantAudio = useCallback(
    async (audioBase64: string) => {
      const audioContext = ensureAudioContext();
      if (!audioContext) return;

      try {
        const float32 = base64ToFloat32(audioBase64);
        const audioBuffer = audioContext.createBuffer(1, float32.length, PCM_SAMPLE_RATE);
        audioBuffer.getChannelData(0).set(float32);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        const startAt = Math.max(audioContext.currentTime, audioPlaybackRef.current);
        source.start(startAt);
        audioPlaybackRef.current = startAt + audioBuffer.duration;
      } catch (err) {
        console.error('[Voice Audio] Failed to play assistant audio chunk:', err);
      }
    },
    [ensureAudioContext]
  );

  const cleanupAudio = useCallback(() => {
    audioBufferRef.current = [];
    if (audioContextRef.current) {
      audioContextRef.current.close().catch((err) =>
        console.error('Failed to close audio context:', err)
      );
      audioContextRef.current = null;
    }
    audioPlaybackRef.current = 0;
  }, []);

  return {
    audioBufferRef,
    sendAudioToServer,
    flushAudioBuffer,
    commitVoiceBuffer,
    commitBufferedAudio,
    playAssistantAudio,
    cleanupAudio,
  };
}
