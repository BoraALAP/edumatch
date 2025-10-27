/**
 * Voice Speaker Selector Component
 *
 * Purpose: Allow users to select AI voice speaker for practice
 * Features:
 * - Display available OpenAI voice options
 * - Voice selection with descriptions
 */

'use client';

import { Card } from '@/components/ui/card';
import { SelectionButton } from '@/components/ui/selection-button';
import { Volume2 } from 'lucide-react';

const VOICE_SPEAKERS = [
  { value: 'alloy', label: 'Alloy', description: 'Neutral and balanced' },
  { value: 'echo', label: 'Echo', description: 'Warm and friendly' },
  { value: 'fable', label: 'Fable', description: 'Clear and expressive' },
  { value: 'onyx', label: 'Onyx', description: 'Deep and authoritative' },
  { value: 'nova', label: 'Nova', description: 'Energetic and bright' },
  { value: 'shimmer', label: 'Shimmer', description: 'Soft and gentle' },
] as const;

interface VoiceSpeakerSelectorProps {
  selectedSpeaker: string;
  onSelectSpeaker: (speaker: string) => void;
}

export default function VoiceSpeakerSelector({
  selectedSpeaker,
  onSelectSpeaker,
}: VoiceSpeakerSelectorProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Volume2 className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">Choose AI Voice</h2>
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
            onClick={() => onSelectSpeaker(speaker.value)}
            isSelected={selectedSpeaker === speaker.value}
          />
        ))}
      </div>
    </Card>
  );
}
