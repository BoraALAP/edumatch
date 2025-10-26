/**
 * Solo Practice Interface Component
 *
 * Topic selection interface for solo practice sessions.
 * Features:
 * - Topic selection from interests and curriculum
 * - Creates practice session and redirects to chat interface
 * - Loading state during session creation
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { SelectionButton } from '@/components/ui/selection-button';
import type { Profile } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { ALL_PRACTICE_TOPICS } from '@/constants/onboarding';
import { Loader2 } from 'lucide-react';

type SoloPracticeProfile = Profile & {
  learning_goals?: string[] | null;
};

interface SoloPracticeInterfaceProps {
  profile: SoloPracticeProfile;
}

export default function SoloPracticeInterface({
  profile,
}: SoloPracticeInterfaceProps) {
  const supabase = createClient();
  const [isStarting, setIsStarting] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const startPractice = async (topic: string) => {
    setIsStarting(true);
    setSelectedTopic(topic);

    try {
      // Create a text_practice_sessions record
      const { data: session, error: sessionError } = await supabase
        .from('text_practice_sessions')
        .insert({
          student_id: profile.id,
          topic,
          proficiency_level: profile.proficiency_level,
          learning_goals: profile.learning_goals ?? [],
          grammar_focus: [], // TODO: Get from curriculum
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating solo practice session:', sessionError);
        throw sessionError;
      }

      if (session) {
        // Redirect to the dedicated solo practice chat page
        window.location.href = `/practice/${session.id}`;
      }
    } catch (error) {
      console.error('Error starting practice:', error);
      setIsStarting(false);
      setSelectedTopic(null);
      // Note: Error handling should use a toast/dialog component in production
    }
  };

  // Show loading state while redirecting to chat
  if (isStarting && selectedTopic) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Starting Practice Session</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Preparing your conversation with the AI coach...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Topic selection view
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Choose a Topic
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Select a topic to start practicing. The AI coach will help you improve your
          conversation skills.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_PRACTICE_TOPICS.map((topic) => (
            <SelectionButton
              key={topic}
              label={topic}
              onClick={() => startPractice(topic)}
              disabled={isStarting}
              badge={
                profile.interests?.includes(topic)
                  ? { text: 'Your Interest', variant: 'secondary', className: 'mt-2' }
                  : undefined
              }
            />
          ))}
        </div>
      </Card>

      <Card className="p-6 bg-primary/5 border-primary/20">
        <h3 className="font-semibold text-foreground mb-2">💡 Practice Tips</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Try to use complete sentences</li>
          <li>Don&apos;t worry about making mistakes - that&apos;s how you learn!</li>
          <li>The AI coach will gently correct grammar errors</li>
          <li>Practice for at least 5-10 minutes to see improvement</li>
          <li>You can change topics anytime</li>
        </ul>
      </Card>
    </div>
  );
}
