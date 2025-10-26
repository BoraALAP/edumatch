/**
 * Voice Practice Interface Component
 *
 * Purpose: Topic selection and voice session creation for voice practice
 * Features:
 * - Topic selection from interests and curriculum
 * - Voice speaker selection (alloy, echo, fable, onyx, nova, shimmer)
 * - Creates voice practice session
 * - Microphone permission check
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { SelectionButton } from '@/components/ui/selection-button';
import type { Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { ALL_PRACTICE_TOPICS } from '@/constants/onboarding';
import { Loader2, Mic, Volume2 } from 'lucide-react';
import { isAudioCaptureSupported } from '@/lib/audio';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VoicePracticeInterfaceProps {
  profile: Profile;
}

const VOICE_SPEAKERS = [
  { value: 'alloy', label: 'Alloy', description: 'Neutral and balanced' },
  { value: 'echo', label: 'Echo', description: 'Warm and friendly' },
  { value: 'fable', label: 'Fable', description: 'Clear and expressive' },
  { value: 'onyx', label: 'Onyx', description: 'Deep and authoritative' },
  { value: 'nova', label: 'Nova', description: 'Energetic and bright' },
  { value: 'shimmer', label: 'Shimmer', description: 'Soft and gentle' },
] as const;

function getLearningGoals(profile: Profile): string[] {
  const maybeGoals = (profile as { learning_goals?: unknown }).learning_goals;
  if (Array.isArray(maybeGoals)) {
    return maybeGoals.filter((goal): goal is string => typeof goal === 'string');
  }
  return [];
}

export default function VoicePracticeInterface({
  profile,
}: VoicePracticeInterfaceProps) {
  const supabase = createClient();
  const [isStarting, setIsStarting] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('alloy');
  const [showUnsupportedDialog, setShowUnsupportedDialog] = useState(false);

  const startVoicePractice = async (topic: string) => {
    // Check if audio capture is supported
    if (!isAudioCaptureSupported()) {
      setShowUnsupportedDialog(true);
      return;
    }

    setIsStarting(true);
    setSelectedTopic(topic);

    try {
      // Check for existing active session with this topic
      const { data: existingSession } = await supabase
        .from('voice_practice_sessions')
        .select('*')
        .eq('student_id', profile.id)
        .eq('topic', topic)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession) {
        // Resume existing session
        console.log('[Voice Practice] Resuming existing active session:', existingSession.id);
        window.location.href = `/voice-practice/${existingSession.id}`;
        return;
      }

      // Create a new voice_practice_sessions record
      const { data: session, error: sessionError } = await supabase
        .from('voice_practice_sessions')
        .insert({
          student_id: profile.id,
          topic,
          proficiency_level: profile.proficiency_level,
          learning_goals: getLearningGoals(profile),
          grammar_focus: [], // TODO: Get from curriculum
          status: 'active',
          voice_speaker: selectedSpeaker,
          voice_provider: 'openai-realtime',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating voice practice session:', sessionError);
        throw sessionError;
      }

      if (session) {
        // Redirect to the voice practice session page
        console.log('[Voice Practice] Created new session:', session.id);
        window.location.href = `/voice-practice/${session.id}`;
      }
    } catch (error) {
      console.error('Error starting voice practice:', error);
      setIsStarting(false);
      setSelectedTopic(null);
    }
  };

  // Show loading state while redirecting
  if (isStarting && selectedTopic) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Starting Voice Practice</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Preparing your voice conversation with the AI coach...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Browser Support Warning */}
      {!isAudioCaptureSupported() && (
        <Card className="p-4 bg-destructive/10 border-destructive/40">
          <div className="flex items-start gap-3">
            <Mic className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <h3 className="font-semibold text-destructive">Browser Not Supported</h3>
              <p className="text-sm text-destructive/90 mt-1">
                Voice practice requires a modern browser with microphone support. Please use Chrome, Edge, or Safari.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Voice Speaker Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Volume2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Choose AI Voice
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Select the voice you want your AI coach to use
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {VOICE_SPEAKERS.map((speaker) => (
            <SelectionButton
              key={speaker.value}
              label={speaker.label}
              description={speaker.description}
              onClick={() => setSelectedSpeaker(speaker.value)}
              isSelected={selectedSpeaker === speaker.value}
            />
          ))}
        </div>
      </Card>

      {/* Topic Selection */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Mic className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Choose a Topic
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Select a topic to start practicing. Speak naturally and the AI coach will help you improve.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_PRACTICE_TOPICS.map((topic) => (
            <SelectionButton
              key={topic}
              label={topic}
              onClick={() => startVoicePractice(topic)}
              disabled={isStarting || !isAudioCaptureSupported()}
              badge={
                profile.interests?.includes(topic)
                  ? { text: 'Your Interest', variant: 'secondary', className: 'mt-2' }
                  : undefined
              }
            />
          ))}
        </div>
      </Card>

      {/* Voice Practice Tips */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <h3 className="font-semibold text-foreground mb-2">🎙️ Voice Practice Tips</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Find a quiet place with minimal background noise</li>
          <li>Speak clearly and at a natural pace</li>
          <li>Your pronunciation, grammar, and fluency are being analyzed silently</li>
          <li>You will see a detailed summary when you finish the session</li>
          <li>Do not worry about mistakes – they help you learn!</li>
        </ul>
      </Card>

      {/* Unsupported Browser Dialog */}
      <AlertDialog open={showUnsupportedDialog} onOpenChange={setShowUnsupportedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Browser Not Supported</AlertDialogTitle>
            <AlertDialogDescription>
              Voice practice requires a modern browser with microphone access. Please use:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Google Chrome (recommended)</li>
                <li>Microsoft Edge</li>
                <li>Safari (macOS/iOS)</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
