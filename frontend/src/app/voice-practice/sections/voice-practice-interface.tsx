/**
 * Voice Practice Interface Component
 *
 * Purpose: Main interface for voice practice topic selection
 * Features:
 * - Topic and speaker selection
 * - Session creation and resumption
 * - Browser compatibility checking
 */

'use client';

import { useState } from 'react';
import type { Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { isAudioCaptureSupported } from '@/lib/voice/audio-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import VoiceSpeakerSelector from './voice-speaker-selector';
import VoiceTopicSelector from './voice-topic-selector';
import {
  BrowserSupportWarning,
  VoicePracticeTips,
  StartingSessionLoading,
} from './voice-practice-components';
import { createOrResumeVoiceSession } from './voice-practice-helpers';

interface VoicePracticeInterfaceProps {
  profile: Profile;
}

export default function VoicePracticeInterface({ profile }: VoicePracticeInterfaceProps) {
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
      const sessionId = await createOrResumeVoiceSession({
        supabase,
        profile,
        topic,
        selectedSpeaker,
      });

      // Redirect to the voice practice session page
      window.location.href = `/voice-practice/${sessionId}`;
    } catch (error) {
      console.error('Error starting voice practice:', error);
      setIsStarting(false);
      setSelectedTopic(null);
    }
  };

  // Show loading state while redirecting
  if (isStarting && selectedTopic) {
    return <StartingSessionLoading topic={selectedTopic} />;
  }

  const isAudioSupported = isAudioCaptureSupported();

  return (
    <div className="space-y-6">
      {/* Browser Support Warning */}
      {!isAudioSupported && <BrowserSupportWarning />}

      {/* Voice Speaker Selection */}
      <VoiceSpeakerSelector
        selectedSpeaker={selectedSpeaker}
        onSelectSpeaker={setSelectedSpeaker}
      />

      {/* Topic Selection */}
      <VoiceTopicSelector
        interests={profile.interests || []}
        onSelectTopic={startVoicePractice}
        disabled={isStarting || !isAudioSupported}
      />

      {/* Voice Practice Tips */}
      <VoicePracticeTips />

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
