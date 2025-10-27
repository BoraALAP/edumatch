/**
 * Solo Practice Interface Component
 *
 * Purpose: Main interface for solo practice topic selection
 * Features:
 * - Topic selection
 * - Session creation
 * - Navigation to chat interface
 */

'use client';

import { useState } from 'react';
import type { Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import PracticeTopicSelector from './practice-topic-selector';
import { PracticeTips, StartingPracticeLoading } from './practice-components';
import { createPracticeSession } from './practice-helpers';

type SoloPracticeProfile = Profile & {
  learning_goals?: string[] | null;
};

interface SoloPracticeInterfaceProps {
  profile: SoloPracticeProfile;
}

export default function SoloPracticeInterface({ profile }: SoloPracticeInterfaceProps) {
  const supabase = createClient();
  const [isStarting, setIsStarting] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const startPractice = async (topic: string) => {
    setIsStarting(true);
    setSelectedTopic(topic);

    try {
      const sessionId = await createPracticeSession({
        supabase,
        profile,
        topic,
      });

      // Redirect to the dedicated solo practice chat page
      window.location.href = `/practice/${sessionId}`;
    } catch (error) {
      console.error('Error starting practice:', error);
      setIsStarting(false);
      setSelectedTopic(null);
    }
  };

  // Show loading state while redirecting to chat
  if (isStarting && selectedTopic) {
    return <StartingPracticeLoading topic={selectedTopic} />;
  }

  // Topic selection view
  return (
    <div className="space-y-6">
      <PracticeTopicSelector
        interests={profile.interests || []}
        onSelectTopic={startPractice}
        disabled={isStarting}
      />

      <PracticeTips />
    </div>
  );
}
