/**
 * Voice Session UI Component
 *
 * Purpose: Real-time voice conversation interface with AI coach
 * Features:
 * - Real-time voice conversation using OpenAI Realtime API via Mastra
 * - Audio capture and playback
 * - Voice waveform visualization
 * - Backend transcript and correction storage
 * - Session summary modal with accumulated analytics
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoiceToggle } from "@/components/voice/VoiceToggle";
import { VoiceWaveform } from "@/components/voice/VoiceWaveform";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useVoiceAudio } from "@/hooks/useVoiceAudio";
import { useVoiceEvents } from "@/hooks/useVoiceEvents";
import { createClient } from "@/lib/supabase/client";
import type { VoiceEvent } from "@/lib/voice/types";
import SessionSummaryModal from "@/components/practice/SessionSummaryModal";
import { Mic, Phone, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChatHeader } from "@/components/chat/ChatHeader";
import CorrectionMessage from "@/components/chat/CorrectionMessage";
import Threads from "@/components/Threads";
import {
  startVoiceSession,
  pauseVoiceSession,
  resumeVoiceSession,
  endVoiceSession,
  fetchCorrections,
  loadConversationHistory,
} from "./session-handlers";
import type {
  VoicePracticeSession,
  Profile,
  GrammarCorrection,
  ConversationMessage,
  SessionState,
} from "./types";

interface VoiceSessionUIProps {
  session: VoicePracticeSession;
  profile: Profile;
}

export default function VoiceSessionUI({
  session,
  profile,
}: VoiceSessionUIProps) {
  const router = useRouter();
  const supabase = createClient();

  const [sessionState, setSessionState] = useState<SessionState>("ready");
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<GrammarCorrection[]>([]);
  const [isLoadingCorrections, setIsLoadingCorrections] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationMessage[]
  >([]);

  const voiceSessionIdRef = useRef<string | null>(null);
  const sessionStateRef = useRef<SessionState>("ready");
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync ref with state
  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  // Custom hooks
  const {
    audioBufferRef,
    flushAudioBuffer,
    commitBufferedAudio,
    playAssistantAudio,
    cleanupAudio,
  } = useVoiceAudio();

  const clearCommitTimer = useCallback(() => {
    if (commitTimeoutRef.current) {
      clearTimeout(commitTimeoutRef.current);
      commitTimeoutRef.current = null;
    }
  }, []);

  // Handle voice events
  const handleVoiceEvents = useCallback(
    (events: VoiceEvent[]) => {
      if (!events.length) return;

      events.forEach((event) => {
        switch (event.type) {
          case "assistant_audio_chunk":
            setIsAISpeaking(true);
            void playAssistantAudio(event.audioBase64);
            break;

          case "assistant_audio_complete":
            setIsAISpeaking(false);
            break;

          case "error":
            setError(event.message);
            break;

          default:
            // All transcript and correction events are now handled server-side
            break;
        }
      });
    },
    [playAssistantAudio],
  );

  const { startEventPolling, stopEventPolling } = useVoiceEvents({
    onEvents: handleVoiceEvents,
  });

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
      console.log("[Voice Session] onAudioData called", {
        hasSessionId: !!voiceSessionIdRef.current,
        sessionState: sessionStateRef.current,
        bytes: audioData.byteLength,
      });

      if (!voiceSessionIdRef.current) {
        console.warn("[Voice Session] No session ID, dropping audio chunk");
        return;
      }

      if (sessionStateRef.current !== "active") {
        console.warn(
          "[Voice Session] Session not active, dropping audio chunk. State:",
          sessionStateRef.current,
        );
        return;
      }

      audioBufferRef.current.push(audioData);
      console.log("[Voice Session] Captured audio chunk", {
        bytes: audioData.byteLength,
        bufferedChunks: audioBufferRef.current.length,
      });

      const totalBytes = audioBufferRef.current.reduce(
        (sum, buf) => sum + buf.byteLength,
        0,
      );

      if (totalBytes >= 4800) {
        console.log("[Voice Session] Buffer threshold reached", { totalBytes });
        await flushAudioBuffer(voiceSessionIdRef.current);
      }

      clearCommitTimer();

      commitTimeoutRef.current = setTimeout(() => {
        if (voiceSessionIdRef.current) {
          void commitBufferedAudio(voiceSessionIdRef.current);
        }
        commitTimeoutRef.current = null;
      }, 600);
    },
    onError: (err) => {
      console.error("Audio capture error:", err);
      setError(err.message);
    },
  });

  // Effects
  useEffect(() => {
    if (sessionState !== "ended") {
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
      console.log("[Voice Session] Browser microphone permission confirmed");
    }
  }, [hasPermission]);

  // Load conversation history on mount
  useEffect(() => {
    const loadHistory = async () => {
      const history = await loadConversationHistory({
        sessionId: session.id,
        supabase,
      });
      setConversationHistory(history);
    };

    void loadHistory();
  }, [session.id, supabase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearCommitTimer();
      audioBufferRef.current = [];
      stopEventPolling();
      stopCapture();
      cleanupAudio();

      const activeSession = voiceSessionIdRef.current;
      if (activeSession) {
        void fetch(`/api/voice/session/${activeSession}/end`, {
          method: "POST",
        }).catch((err) =>
          console.error("Failed to end voice session on unmount:", err),
        );
        voiceSessionIdRef.current = null;
      }
    };
  }, [
    stopCapture,
    clearCommitTimer,
    stopEventPolling,
    cleanupAudio,
    audioBufferRef,
  ]);

  // Start voice conversation
  const handleStartConversation = async () => {
    try {
      setError(null);

      if (!voiceSessionIdRef.current) {
        const data = await startVoiceSession({ session, profile });
        console.log("[Voice Session] Session created successfully:", data);

        setIsAISpeaking(false);
        audioBufferRef.current = [];
        cleanupAudio();
        voiceSessionIdRef.current = data.voiceSessionId;

        console.log(
          "[Voice Session] Starting event polling for session:",
          data.voiceSessionId,
        );
        startEventPolling(data.voiceSessionId);
      }

      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setError("Microphone permission denied");
          stopEventPolling();
          const activeSession = voiceSessionIdRef.current;
          if (activeSession) {
            await fetch(`/api/voice/session/${activeSession}/end`, {
              method: "POST",
            }).catch((err) =>
              console.error(
                "Failed to end voice session after permission denial:",
                err,
              ),
            );
          }
          voiceSessionIdRef.current = null;
          return;
        }
        console.log("[Voice Session] Microphone permission granted");
      }

      audioBufferRef.current = [];
      const started = await startCapture();
      if (!started) {
        setError("Failed to start audio capture");
        stopEventPolling();
        const activeSession = voiceSessionIdRef.current;
        if (activeSession) {
          await fetch(`/api/voice/session/${activeSession}/end`, {
            method: "POST",
          }).catch((err) =>
            console.error(
              "Failed to end voice session after capture failure:",
              err,
            ),
          );
        }
        voiceSessionIdRef.current = null;
        return;
      }
      console.log("[Voice Session] Audio capture started");

      setSessionState("active");
      console.log("[Voice Session] Conversation started");
    } catch (err) {
      console.error("[Voice Session] Start error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start conversation",
      );
      stopEventPolling();
      const activeSession = voiceSessionIdRef.current;
      if (activeSession) {
        await fetch(`/api/voice/session/${activeSession}/end`, {
          method: "POST",
        }).catch((error) =>
          console.error(
            "Failed to end voice session after start error:",
            error,
          ),
        );
      }
      voiceSessionIdRef.current = null;
    }
  };

  // Pause voice conversation
  const handlePauseConversation = async () => {
    clearCommitTimer();
    stopCapture();

    if (voiceSessionIdRef.current) {
      await flushAudioBuffer(voiceSessionIdRef.current);
    }
    audioBufferRef.current = [];

    await pauseVoiceSession({ sessionId: session.id, supabase });
    setSessionState("paused");

    // Fetch corrections
    setIsLoadingCorrections(true);
    try {
      const fetchedCorrections = await fetchCorrections({
        sessionId: session.id,
        studentId: session.student_id,
        studentLevel: session.proficiency_level || profile.proficiency_level,
      });
      setCorrections(fetchedCorrections);
    } catch (err) {
      console.error("[Voice Session] Error fetching corrections:", err);
    } finally {
      setIsLoadingCorrections(false);
    }
  };

  // Resume voice conversation
  const handleResumeConversation = async () => {
    setError(null);
    setCorrections([]);

    await resumeVoiceSession({ sessionId: session.id, supabase });

    const started = await startCapture();
    if (started) {
      setSessionState("active");
      console.log("[Voice Session] Conversation resumed");
    }
  };

  // End voice session
  const handleEndSession = () => {
    setShowEndDialog(true);
  };

  const confirmEndSession = async () => {
    setShowEndDialog(false);
    setSessionState("ending");

    try {
      clearCommitTimer();
      stopCapture();

      if (voiceSessionIdRef.current) {
        await commitBufferedAudio(voiceSessionIdRef.current);
      }

      await endVoiceSession({
        sessionId: session.id,
        voiceSessionId: voiceSessionIdRef.current!,
        supabase,
      });

      stopEventPolling();
      voiceSessionIdRef.current = null;

      console.log("[Voice Session] Session ended successfully");
      setSessionState("ended");
      setIsAISpeaking(false);
      setShowSummaryModal(true);
    } catch (err) {
      console.error("[Voice Session] End error:", err);
      setError(err instanceof Error ? err.message : "Failed to end session");
      setSessionState("paused");
    }
  };

  if (sessionState === "ending") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Wrapping Up Session
            </h3>
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

  if (sessionState === "ended") {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="p-8 max-w-md text-center space-y-6">
            <div>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Session Ended
              </h2>
              <p className="text-muted-foreground">
                Your voice practice session has been completed. Review your
                detailed summary to see how you did.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="secondary"
                onClick={() => setShowSummaryModal(true)}
              >
                View Summary
              </Button>
              <Button onClick={() => router.push("/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          </Card>
        </div>
        {summaryModal}
      </>
    );
  }

  const isActive = sessionState === "active";
  const isPaused = sessionState === "paused";
  const isReady = sessionState === "ready";

  return (
    <div className="flex flex-col h-screen">
      <ChatHeader
        title="Voice Practice"
        subtitle={session.topic}
        backHref="/dashboard"
        badges={
          <Badge variant="secondary" className="text-xs">
            {session.proficiency_level || profile.proficiency_level}
          </Badge>
        }
        actions={
          <>
            {isActive && (
              <Badge variant="default" className="text-xs animate-pulse">
                Live
              </Badge>
            )}
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
          </>
        }
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-background relative pt-30">
        <div className="max-w-5xl mx-auto h-full flex flex-col p-4 gap-4 relative z-10">
          {/* Error Display */}
          {error && (
            <Card className="p-4 bg-destructive/10 border-destructive/40">
              <p className="text-sm text-destructive">{error}</p>
            </Card>
          )}

          {/* Conversation History (if exists) */}
          {conversationHistory.length > 0 && (
            <Card className="p-4 bg-muted/30 border-muted">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm text-foreground">
                      Previous Conversation ({conversationHistory.length}{" "}
                      messages)
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                  {conversationHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "text-sm p-2 rounded",
                        msg.role === "user"
                          ? "bg-primary/10 text-foreground ml-8"
                          : "bg-muted text-foreground mr-8",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-xs">
                          {msg.role === "user" ? "You:" : "Coach:"}
                        </span>
                        <span className="flex-1">{msg.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </Card>
          )}

          {/* Corrections Display (when paused) */}
          {isPaused && (
            <Card className="p-6 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">
                    Grammar Feedback
                  </h3>
                </div>
                {isLoadingCorrections && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
              </div>

              {isLoadingCorrections ? (
                <p className="text-sm text-muted-foreground">
                  Analyzing your speech...
                </p>
              ) : corrections.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-foreground font-medium mb-1">
                    Great job!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    No grammar issues detected in your recent speech. Keep it
                    up!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-3">
                    Here are {corrections.length} correction
                    {corrections.length !== 1 ? "s" : ""} to help you improve:
                  </p>
                  {corrections.map((correction, index) => (
                    <CorrectionMessage
                      key={index}
                      content={correction.explanation}
                      severity={correction.severity}
                      grammarIssues={[
                        {
                          original: correction.original_text,
                          correction: correction.corrected_text,
                          explanation: correction.explanation,
                          category: correction.category,
                          severity: correction.severity,
                        },
                      ]}
                      showDetails
                      variant="default"
                    />
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  💡 Review these corrections, then click Resume to continue
                  practicing
                </p>
              </div>
            </Card>
          )}

          {/* Threads Visual Background */}
          <Card className="h-[50vh]">
            <Threads
              amplitude={3}
              distance={0.5}
              enableMouseInteraction={true}
            />
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
                  {isReady && "Start"}
                  {isActive && "Pause"}
                  {isPaused && "Resume"}
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
                💡 Speak naturally. Your grammar, pronunciation, and fluency are
                being analyzed silently. You&apos;ll see a detailed summary when
                you end the session.
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
              Your session will be saved and you&apos;ll receive a detailed
              summary of your performance, including grammar corrections,
              pronunciation feedback, and improvement suggestions.
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
