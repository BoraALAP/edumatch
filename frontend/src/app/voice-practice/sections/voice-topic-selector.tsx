/**
 * Voice Topic Selector Component
 *
 * Purpose: Allow users to select practice topic
 * Features:
 * - Display available practice topics
 * - Show user interests as badges
 * - Handle topic selection
 */

'use client';

import { Card } from '@/components/ui/card';
import { SelectionButton } from '@/components/ui/selection-button';
import { ALL_PRACTICE_TOPICS } from '@/constants/onboarding';
import { Mic } from 'lucide-react';

interface VoiceTopicSelectorProps {
  interests: string[];
  onSelectTopic: (topic: string) => void;
  disabled?: boolean;
}

export default function VoiceTopicSelector({
  interests,
  onSelectTopic,
  disabled = false,
}: VoiceTopicSelectorProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Mic className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Choose a Topic</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Select a topic to start practicing. Speak naturally and the AI coach will help you improve.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALL_PRACTICE_TOPICS.map((topic) => (
          <SelectionButton
            key={topic}
            label={topic}
            onClick={() => onSelectTopic(topic)}
            disabled={disabled}
            badge={
              interests.includes(topic)
                ? { text: 'Your Interest', variant: 'secondary', className: 'mt-2' }
                : undefined
            }
          />
        ))}
      </div>
    </Card>
  );
}
