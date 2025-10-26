/**
 * Voice Practice Session Component
 *
 * Purpose: Real-time voice conversation interface with AI coach
 * Features:
 * - Real-time voice conversation using OpenAI Realtime API
 * - Audio capture and playback
 * - Live transcript display
 * - Background speech analysis (silent accumulation)
 * - Session summary modal with accumulated corrections
 * - Voice waveform visualization
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VoiceToggle } from '@/components/voice/VoiceToggle';
import { VoiceWaveform } from '@/components/voice/VoiceWaveform';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { createClient } from '@/lib/supabase/client';
import type { VoiceEvent } from '@/lib/voice/types';
import SessionSummaryModal from '@/components/practice/SessionSummaryModal';
import { Mic, Phone, Loader2, MessageSquare, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';

interface VoicePracticeSession {
  id: string;
  student_id: string;
  topic: string;
  proficiency_level: string | null;
  learning_goals: string[] | null;
  grammar_focus: string[] | null;
  status: string;
  voice_provider: string | null;
  voice_speaker: string | null;
}

interface Profile {
  id: string;
  proficiency_level: string | null;
  full_name: string | null;
}

interface VoicePracticeSessionProps {
  session: VoicePracticeSession;
  profile: Profile;
}

interface GrammarCorrection {
  original_text: string;
  corrected_text: string;
  explanation: string;
  category: string;
  severity: 'minor' | 'moderate' | 'major';
}

interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type SessionState = 'ready' | 'active' | 'paused' | 'ending' | 'ended';

const PCM_SAMPLE_RATE = 24000;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const byteLength = binary.length;
  const buffer = new ArrayBuffer(byteLength);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < byteLength; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const view = new DataView(buffer);
  const frameCount = byteLength / 2;
  const float32 = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i += 1) {
    const int16 = view.getInt16(i * 2, true);
    float32[i] = int16 / 32768;
  }
  return float32;
}

function mergeAudioBuffers(buffers: ArrayBuffer[]): ArrayBuffer {
  const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  buffers.forEach((buf) => {
    merged.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  });
  return merged.buffer;
}

export default function VoicePracticeSession({
  session,
  profile,
}: VoicePracticeSessionProps) {
  const router = useRouter();
  const supabase = createClient();

  const [sessionState, setSessionState] = useState<SessionState>('ready');

  // Sync ref with state
  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<GrammarCorrection[]>([]);
  const [isLoadingCorrections, setIsLoadingCorrections] = useState(false);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const audioBufferRef = useRef<ArrayBuffer[]>([]);
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSessionIdRef = useRef<string | null>(null);
  const sessionStateRef = useRef<SessionState>('ready');
  const eventPollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioPlaybackRef = useRef(0);

  const clearCommitTimer = useCallback(() => {
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
      commitTimeoutRef.current = null;
    }
  }, []);

  const sendAudioToServer = useCallback(
    async (buffer: ArrayBuffer) => {
      const sessionId = voiceSessionIdRef.current;
      if (!sessionId) {
        console.warn('[Voice] Cannot send audio: no session ID');
        return;
      }

      try {
        const base64 = arrayBufferToBase64(buffer);
        console.log('[Voice] Sending audio to server:', {
          sessionId,
          bytes: buffer.byteLength,
          base64Length: base64.length,
        });

        const response = await fetch(`/api/voice/session/${sessionId}/audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64 }),
        });

        if (!response.ok) {
          throw new Error('Failed to stream audio to voice session.');
        }
        console.log('[Voice] Audio sent successfully');
      } catch (err) {
        console.error('[Voice] Failed to send audio chunk:', err);
        setError(err instanceof Error ? err.message : 'Failed to send audio chunk');
      }
    },
    []
  );

  const commitVoiceBuffer = useCallback(async () => {
    const sessionId = voiceSessionIdRef.current;
    if (!sessionId) {
      return;
    }

    try {
      const response = await fetch(`/api/voice/session/${sessionId}/commit`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to commit voice buffer.');
      }
      console.log('[Voice Session] Commit request sent', { sessionId });
    } catch (err) {
      console.error('[Voice] Failed to commit audio buffer:', err);
      setError(err instanceof Error ? err.message : 'Failed to process audio buffer');
    }
  }, []);

  const flushAudioBuffer = useCallback(async () => {
    if (audioBufferRef.current.length === 0) {
      return;
    }

    const merged = mergeAudioBuffers(audioBufferRef.current);
    audioBufferRef.current = [];
    await sendAudioToServer(merged);
  }, [sendAudioToServer]);

  const commitBufferedAudio = useCallback(async () => {
    await flushAudioBuffer();
    await commitVoiceBuffer();
  }, [flushAudioBuffer, commitVoiceBuffer]);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: PCM_SAMPLE_RATE });
      audioPlaybackRef.current = audioContextRef.current.currentTime;
    }
    return audioContextRef.current;
  }, []);

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
        console.error('[Voice] Failed to play assistant audio chunk:', err);
      }
    },
    [ensureAudioContext]
  );

  const analyzeUserSpeech = useCallback(
    async (transcriptValue: string) => {
      try {
        const response = await fetch('/api/practice/analyze-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            studentId: session.student_id,
            transcript: transcriptValue,
            studentLevel: session.proficiency_level || profile.proficiency_level,
            learningGoals: session.learning_goals || [],
            grammarFocus: session.grammar_focus || [],
          }),
        });

        const result = await response.json();
        console.log('[Voice Analysis] Silent analysis completed:', result);
      } catch (err) {
        console.error('[Voice Analysis] Error:', err);
      }
    },
    [
      session.id,
      session.student_id,
      session.proficiency_level,
      session.learning_goals,
      session.grammar_focus,
      profile.proficiency_level,
    ]
  );

  const handleVoiceEvents = useCallback(
    (events: VoiceEvent[]) => {
      if (!events.length) {
        return;
      }

      events.forEach((event) => {
        switch (event.type) {
          case 'assistant_text_delta':
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant') {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    content: last.content + event.text,
                  },
                ];
              }

              return [
                ...prev,
                {
                  id: `${Date.now()}-assistant`,
                  role: 'assistant',
                  content: event.text,
                  timestamp: new Date(event.timestamp),
                },
              ];
            });
            break;

          case 'assistant_text_complete':
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant') {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    content: event.text,
                  },
                ];
              }
              return prev;
            });
            break;

          case 'user_text_delta':
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'user') {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    content: last.content + event.text,
                  },
                ];
              }

              return [
                ...prev,
                {
                  id: `${Date.now()}-user`,
                  role: 'user',
                  content: event.text,
                  timestamp: new Date(event.timestamp),
                },
              ];
            });
            break;

          case 'user_text_complete':
            setTranscript((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'user') {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    content: event.text,
                  },
                ];
              }
              return prev;
            });

            if (event.text.trim().length > 0) {
              void analyzeUserSpeech(event.text);
            }
            break;

          case 'assistant_audio_chunk':
            setIsAISpeaking(true);
            void playAssistantAudio(event.audioBase64);
            break;

          case 'assistant_audio_complete':
            setIsAISpeaking(false);
            break;

          case 'error':
            setError(event.message);
            break;
          default:
            break;
        }
      });
    },
    [analyzeUserSpeech, playAssistantAudio]
  );

  const pollVoiceEvents = useCallback(async () => {
    if (isPollingRef.current) {
      return;
    }

    const sessionId = voiceSessionIdRef.current;
    if (!sessionId) {
      return;
    }

    isPollingRef.current = true;
    try {
      const response = await fetch(`/api/voice/session/${sessionId}/events`);
      if (response.status === 404) {
        console.warn('[Voice] Session ended or not found');
        if (eventPollTimerRef.current) {
          clearInterval(eventPollTimerRef.current);
          eventPollTimerRef.current = null;
        }
        isPollingRef.current = false;
        voiceSessionIdRef.current = null;
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to load voice events');
      }

      const data = (await response.json()) as { events?: VoiceEvent[] };
      if (Array.isArray(data.events) && data.events.length > 0) {
        console.log('[Voice] Received events:', data.events.length, data.events.map(e => e.type));
        handleVoiceEvents(data.events);
      }
    } catch (err) {
      console.error('[Voice] Event polling error:', err);
    } finally {
      isPollingRef.current = false;
    }
  }, [handleVoiceEvents]);

  const startEventPolling = useCallback(() => {
    if (eventPollTimerRef.current) {
      return;
    }

    // Kick off immediately to consume buffered events (like greeting)
    void pollVoiceEvents();
    eventPollTimerRef.current = setInterval(() => {
      void pollVoiceEvents();
    }, 600);
  }, [pollVoiceEvents]);

  const stopEventPolling = useCallback(() => {
    if (eventPollTimerRef.current) {
      clearInterval(eventPollTimerRef.current);
      eventPollTimerRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  // Audio capture hook
  const {
    isCapturing,
    hasPermission,
    audioLevel,
    error: audioError,
    startCapture,
    stopCapture,
    requestPermission,
  } = useAudioCapture({
    sampleRate: 24000,
    onAudioData: async (audioData) => {
      console.log('[Voice Session] onAudioData called', {
        hasSessionId: !!voiceSessionIdRef.current,
        sessionState: sessionStateRef.current,
        bytes: audioData.byteLength,
      });

      if (!voiceSessionIdRef.current) {
        console.warn('[Voice Session] No session ID, dropping audio chunk');
        return;
      }

      if (sessionStateRef.current !== 'active') {
        console.warn('[Voice Session] Session not active, dropping audio chunk. State:', sessionStateRef.current);
        return;
      }

      audioBufferRef.current.push(audioData);
      console.log('[Voice Session] Captured audio chunk', {
        bytes: audioData.byteLength,
        bufferedChunks: audioBufferRef.current.length,
      });

      const totalBytes = audioBufferRef.current.reduce(
        (sum, buf) => sum + buf.byteLength,
        0
      );

      if (totalBytes >= 4800) {
        console.log('[Voice Session] Buffer threshold reached', { totalBytes });
        await flushAudioBuffer();
      }

      clearCommitTimer();

      commitTimeoutRef.current = setTimeout(() => {
        void commitBufferedAudio();
        commitTimeoutRef.current = null;
      }, 600);
    },
    onError: (err) => {
      console.error('Audio capture error:', err);
      setError(err.message);
    },
  });

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);
  useEffect(() => {
    if (sessionState !== 'ended') {
      setShowSummaryModal(false);
    }
  }, [sessionState]);

  useEffect(() => {
    if (audioError) {
      setError(audioError.message);
    }
  }, [audioError]);

  useEffect(() => {
    if (hasPermission) {
      console.log('[Voice Session] Browser microphone permission confirmed');
    }
  }, [hasPermission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCommitTimer();
      audioBufferRef.current = [];
      stopEventPolling();
      stopCapture();

      if (audioContextRef.current) {
        audioContextRef.current.close().catch((err) =>
          console.error('Failed to close audio context on cleanup:', err)
        );
        audioContextRef.current = null;
      }

      const activeSession = voiceSessionIdRef.current;
      if (activeSession) {
        void fetch(`/api/voice/session/${activeSession}/end`, { method: 'POST' }).catch(
          (err) => console.error('Failed to end voice session on unmount:', err)
        );
        voiceSessionIdRef.current = null;
      }
    };
  }, [stopCapture, clearCommitTimer, stopEventPolling]);

  // Analyze user speech in background (silent)
  // Start voice conversation
  const handleStartConversation = async () => {
    try {
      setError(null);

      if (!voiceSessionIdRef.current) {
        const speaker = session.voice_speaker || 'alloy';
        const response = await fetch('/api/voice/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voicePracticeSessionId: session.id,
            studentId: session.student_id,
            context: {
              topic: session.topic,
              studentLevel: session.proficiency_level || profile.proficiency_level || 'B1',
              learningGoals: session.learning_goals || [],
              grammarFocus: session.grammar_focus || [],
              voiceSpeaker: speaker,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('[Voice Session] Server error:', errorData);
          throw new Error(errorData.error || 'Failed to initialize voice session.');
        }

        const data = (await response.json()) as { voiceSessionId: string; greeting?: string };
        console.log('[Voice Session] Session created successfully:', data);

        setTranscript([]);
        setIsAISpeaking(false);
        audioBufferRef.current = [];
        if (audioContextRef.current) {
          audioContextRef.current.close().catch((err) =>
            console.error('Failed to close audio context:', err)
          );
          audioContextRef.current = null;
        }
        audioPlaybackRef.current = 0;
        voiceSessionIdRef.current = data.voiceSessionId;

        console.log('[Voice Session] Starting event polling for session:', data.voiceSessionId);
        startEventPolling();
      }

      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setError('Microphone permission denied');
          stopEventPolling();
          const activeSession = voiceSessionIdRef.current;
          if (activeSession) {
            await fetch(`/api/voice/session/${activeSession}/end`, { method: 'POST' }).catch(
              (err) => console.error('Failed to end voice session after permission denial:', err)
            );
          }
          voiceSessionIdRef.current = null;
          return;
        }
        console.log('[Voice Session] Microphone permission granted');
      }

      audioBufferRef.current = [];
      const started = await startCapture();
      if (!started) {
        setError('Failed to start audio capture');
        stopEventPolling();
        const activeSession = voiceSessionIdRef.current;
        if (activeSession) {
          await fetch(`/api/voice/session/${activeSession}/end`, { method: 'POST' }).catch(
            (err) => console.error('Failed to end voice session after capture failure:', err)
          );
        }
        voiceSessionIdRef.current = null;
        return;
      }
      console.log('[Voice Session] Audio capture started');

      setSessionState('active');
      console.log('[Voice Session] Conversation started');
    } catch (err) {
      console.error('[Voice Session] Start error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
      stopEventPolling();
      const activeSession = voiceSessionIdRef.current;
      if (activeSession) {
        await fetch(`/api/voice/session/${activeSession}/end`, { method: 'POST' }).catch(
          (error) => console.error('Failed to end voice session after start error:', error)
        );
      }
      voiceSessionIdRef.current = null;
    }
  };

  // Pause voice conversation
  const handlePauseConversation = async () => {
    clearCommitTimer();
    stopCapture();

    // Just flush buffered audio without requesting AI response
    await flushAudioBuffer();
    audioBufferRef.current = [];

    // Update session status in database
    await supabase
      .from('voice_practice_sessions')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    setSessionState('paused');
    console.log('[Voice Session] Conversation paused');

    // Fetch corrections for user's speech
    setIsLoadingCorrections(true);
    try {
      const response = await fetch('/api/voice/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          studentId: session.student_id,
          studentLevel: session.proficiency_level || profile.proficiency_level,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCorrections(data.corrections || []);
        console.log('[Voice Session] Loaded corrections:', data.corrections?.length || 0);
      } else {
        console.error('[Voice Session] Failed to fetch corrections');
      }
    } catch (err) {
      console.error('[Voice Session] Error fetching corrections:', err);
    } finally {
      setIsLoadingCorrections(false);
    }
  };

  // Resume voice conversation
  const handleResumeConversation = async () => {
    setError(null);
    setCorrections([]); // Clear corrections display

    // Update session status in database
    await supabase
      .from('voice_practice_sessions')
      .update({
        status: 'active',
        resumed_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    const started = await startCapture();
    if (started) {
      setSessionState('active');
      console.log('[Voice Session] Conversation resumed');
    }
  };

  // End voice session
  const handleEndSession = () => {
    setShowEndDialog(true);
  };

  const confirmEndSession = async () => {
    setShowEndDialog(false);
    setSessionState('ending');

    try {
      // Stop audio capture
      clearCommitTimer();
      stopCapture();

      // Commit any remaining audio
      await commitBufferedAudio();

      // Update session status
      await supabase
        .from('voice_practice_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      stopEventPolling();

      const activeSession = voiceSessionIdRef.current;
      if (activeSession) {
        await fetch(`/api/voice/session/${activeSession}/end`, { method: 'POST' });
        voiceSessionIdRef.current = null;
      }

      console.log('[Voice Session] Session ended successfully');
      setSessionState('ended');
      setIsAISpeaking(false);
      setShowSummaryModal(true);
    } catch (err) {
      console.error('[Voice Session] End error:', err);
      setError(err instanceof Error ? err.message : 'Failed to end session');
      setSessionState('paused');
    }
  };

  if (sessionState === 'ending') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Wrapping Up Session</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Saving your conversation and analysis...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render ended state
  const summaryModal = (
    <SessionSummaryModal
      sessionId={session.id}
      studentId={session.student_id}
      topic={session.topic}
      proficiencyLevel={session.proficiency_level || profile.proficiency_level}
      sessionType="voice_practice"
      isOpen={showSummaryModal}
      onClose={() => setShowSummaryModal(false)}
    />
  );

  if (sessionState === 'ended') {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="p-8 max-w-md text-center space-y-6">
            <div>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Session Ended</h2>
              <p className="text-muted-foreground">
                Your voice practice session has been completed. Review your detailed summary to see how you did.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" onClick={() => setShowSummaryModal(true)}>
                View Summary
              </Button>
              <Button onClick={() => router.push('/dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          </Card>
        </div>
        {summaryModal}
      </>
    );
  }

  const isActive = sessionState === 'active';
  const isPaused = sessionState === 'paused';
  const isReady = sessionState === 'ready';

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-primary hover:text-primary/90">
              ←
            </Link>
            <div>
              <h2 className="text-xl font-bold text-foreground">Voice Practice</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {session.proficiency_level || profile.proficiency_level}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {session.topic}
                </Badge>
                {isActive && (
                  <Badge variant="default" className="text-xs animate-pulse">
                    Live
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(isActive || isPaused) && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEndSession}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-background">
        <div className="max-w-5xl mx-auto h-full flex flex-col p-4 gap-4">
          {/* Error Display */}
          {error && (
            <Card className="p-4 bg-destructive/10 border-destructive/40">
              <p className="text-sm text-destructive">{error}</p>
            </Card>
          )}

          {/* Corrections Display (when paused) */}
          {isPaused && (
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Grammar Feedback</h3>
                </div>
                {isLoadingCorrections && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
              </div>

              {isLoadingCorrections ? (
                <p className="text-sm text-muted-foreground">Analyzing your speech...</p>
              ) : corrections.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-foreground font-medium mb-1">Great job!</p>
                  <p className="text-sm text-muted-foreground">
                    No grammar issues detected in your recent speech. Keep it up!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-3">
                    Here are {corrections.length} correction{corrections.length !== 1 ? 's' : ''} to help you improve:
                  </p>
                  {corrections.map((correction, index) => (
                    <div
                      key={index}
                      className="bg-background rounded-lg p-3 border border-border space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant={
                            correction.severity === 'major'
                              ? 'destructive'
                              : correction.severity === 'moderate'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {correction.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {correction.category.replace('grammar_', '').replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          You said: <span className="text-destructive line-through">{correction.original_text}</span>
                        </p>
                        <p className="text-sm text-foreground mt-1">
                          Better: <span className="text-primary font-medium">{correction.corrected_text}</span>
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground italic">
                        {correction.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  💡 Review these corrections, then click Resume to continue practicing
                </p>
              </div>
            </Card>
          )}

          {/* Transcript */}
          <Card className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Conversation</h2>
                <span className="text-xs text-muted-foreground ml-auto">
                  {transcript.length} {transcript.length === 1 ? 'message' : 'messages'}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {transcript.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <Volume2 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">
                      {isReady
                        ? 'Click "Start Conversation" to begin speaking with your AI coach'
                        : 'Start speaking to see the conversation here'}
                    </p>
                  </div>
                </div>
              ) : (
                transcript.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] rounded-lg p-3',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </Card>

          {/* Voice Controls */}
          <Card className="p-6 shrink-0">
            <div className="flex items-center justify-between gap-6">
              {/* Waveform */}
              <div className="flex-1">
                <VoiceWaveform
                  audioLevel={audioLevel}
                  isActive={isActive && isCapturing}
                />
              </div>

              {/* Toggle Button */}
              <div className="flex flex-col items-center gap-2">
                {isReady && (
                  <Button
                    size="lg"
                    onClick={handleStartConversation}
                    className="w-16 h-16 rounded-full"
                  >
                    <Mic className="w-6 h-6" />
                  </Button>
                )}

                {isActive && (
                  <VoiceToggle
                    isVoiceEnabled={true}
                    isRecording={isCapturing}
                    hasPermission={hasPermission ?? undefined}
                    onToggle={handlePauseConversation}
                    className="w-16 h-16"
                  />
                )}

                {isPaused && (
                  <Button
                    size="lg"
                    onClick={handleResumeConversation}
                    className="w-16 h-16 rounded-full"
                  >
                    <Mic className="w-6 h-6" />
                  </Button>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  {isReady && 'Start'}
                  {isActive && 'Pause'}
                  {isPaused && 'Resume'}
                </p>
              </div>

              {/* AI Status */}
              <div className="flex-1 flex justify-end">
                {isAISpeaking && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <div className="flex gap-1">
                      <span className="w-1 h-4 bg-primary rounded-full animate-pulse" />
                      <span className="w-1 h-4 bg-primary rounded-full animate-pulse delay-75" />
                      <span className="w-1 h-4 bg-primary rounded-full animate-pulse delay-150" />
                    </div>
                    <span>AI is speaking...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                💡 Speak naturally. Your grammar, pronunciation, and fluency are being analyzed silently.
                You&apos;ll see a detailed summary when you end the session.
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* End Session Confirmation Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Voice Practice Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Your session will be saved and you&apos;ll receive a detailed summary of your performance,
              including grammar corrections, pronunciation feedback, and improvement suggestions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Practicing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndSession}>
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {summaryModal}
    </div>
  );
}
