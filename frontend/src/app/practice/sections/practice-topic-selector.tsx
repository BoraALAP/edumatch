/**
 * Practice Topic Selector Component
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

interface PracticeTopicSelectorProps {
  interests: string[];
  onSelectTopic: (topic: string) => void;
  disabled?: boolean;
}

export default function PracticeTopicSelector({
  interests,
  onSelectTopic,
  disabled = false,
}: PracticeTopicSelectorProps) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-foreground mb-2">Choose a Topic</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Select a topic to start practicing. The AI coach will help you improve your conversation
        skills.
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
