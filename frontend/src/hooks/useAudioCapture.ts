/**
 * Audio Capture Hook
 *
 * Purpose: Custom React hook for WebRTC audio capture
 * Features:
 * - Request microphone permission
 * - Capture audio stream
 * - Record audio chunks
 * - Convert to PCM16 format for OpenAI Realtime API
 * - Real-time audio level monitoring
 * - Error handling and cleanup
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface AudioCaptureOptions {
  sampleRate?: number; // Default: 24000 (OpenAI Realtime API requirement)
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  onAudioData?: (audioData: ArrayBuffer) => void;
  onAudioLevel?: (level: number) => void;
  onError?: (error: Error) => void;
}

export interface AudioCaptureState {
  isCapturing: boolean;
  hasPermission: boolean | null;
  audioLevel: number;
  error: Error | null;
}

export function useAudioCapture(options: AudioCaptureOptions = {}) {
  const {
    sampleRate = 24000,
    echoCancellation = true,
    noiseSuppression = true,
    autoGainControl = true,
    onAudioData,
    onAudioLevel,
    onError,
  } = options;

  const [state, setState] = useState<AudioCaptureState>({
    isCapturing: false,
    hasPermission: null,
    audioLevel: 0,
    error: null,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Request microphone permission and initialize audio stream
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          echoCancellation,
          noiseSuppression,
          autoGainControl,
          channelCount: 1, // Mono
        },
      });

      mediaStreamRef.current = stream;

      setState((prev) => ({
        ...prev,
        hasPermission: true,
        error: null,
      }));

      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to get microphone permission');
      setState((prev) => ({
        ...prev,
        hasPermission: false,
        error: err,
      }));

      onError?.(err);
      return false;
    }
  }, [sampleRate, echoCancellation, noiseSuppression, autoGainControl, onError]);

  /**
   * Start capturing audio
   */
  const startCapture = useCallback(async (): Promise<boolean> => {
    console.log('[Audio Capture] Starting capture...');
    if (!mediaStreamRef.current) {
      console.log('[Audio Capture] No media stream, requesting permission...');
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        console.error('[Audio Capture] Permission denied');
        return false;
      }
    }

    try {
      // Create AudioContext
      console.log('[Audio Capture] Creating AudioContext with sample rate:', sampleRate);
      const audioContext = new AudioContext({ sampleRate });
      audioContextRef.current = audioContext;

      // Create analyser for audio level monitoring
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Create source from media stream
      const source = audioContext.createMediaStreamSource(mediaStreamRef.current!);

      // Create script processor for raw audio data
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (PCM16)
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Send audio data
        if (onAudioData) {
          console.log('[Audio Capture] Processing audio chunk:', pcm16.buffer.byteLength, 'bytes');
          onAudioData(pcm16.buffer);
        }
      };

      // Connect nodes
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination);

      // Set capturing state first
      setState((prev) => ({
        ...prev,
        isCapturing: true,
        error: null,
      }));

      // Start monitoring audio levels
      const isCapturingRef = { current: true };
      const monitorAudioLevel = () => {
        if (!analyserRef.current || !isCapturingRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average level (0-100)
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 255) * 100);

        setState((prev) => ({
          ...prev,
          audioLevel: normalizedLevel,
        }));

        onAudioLevel?.(normalizedLevel);

        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
      };

      monitorAudioLevel();

      console.log('[Audio Capture] Capture started successfully');
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to start audio capture');
      setState((prev) => ({
        ...prev,
        error: err,
      }));

      onError?.(err);
      return false;
    }
  }, [requestPermission, sampleRate, onAudioData, onAudioLevel, onError, state.isCapturing]);

  /**
   * Stop capturing audio
   */
  const stopCapture = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Disconnect and close processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    // Disconnect analyser
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isCapturing: false,
      audioLevel: 0,
    }));
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  return {
    ...state,
    startCapture,
    stopCapture,
    requestPermission,
  };
}
