/**
 * Voice Toggle Component
 *
 * Purpose: Toggle button for enabling/disabling voice chat
 * Features:
 * - Toggle voice mode on/off
 * - Visual feedback for active state
 * - Permission request handling
 * - Microphone icon with animation
 */

'use client';

import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface VoiceToggleProps {
  isVoiceEnabled: boolean;
  isRecording?: boolean;
  hasPermission?: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceToggle({
  isVoiceEnabled,
  isRecording = false,
  hasPermission = false,
  onToggle,
  disabled = false,
  className,
}: VoiceToggleProps) {
  const getTooltipText = () => {
    if (disabled) return 'Voice chat unavailable';
    if (!hasPermission && isVoiceEnabled) return 'Requesting microphone permission...';
    if (isVoiceEnabled && isRecording) return 'Voice active - Click to disable';
    if (isVoiceEnabled) return 'Voice mode on - Click to disable';
    return 'Click to enable voice chat';
  };

  const getButtonVariant = () => {
    if (isVoiceEnabled && isRecording) return 'default';
    if (isVoiceEnabled) return 'secondary';
    return 'outline';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={getButtonVariant()}
            size="icon"
            onClick={onToggle}
            disabled={disabled}
            className={cn(
              'relative transition-all duration-200',
              isRecording && 'animate-pulse ring-2 ring-primary ring-offset-2',
              isVoiceEnabled && !isRecording && 'bg-primary/20',
              className
            )}
            aria-label={isVoiceEnabled ? 'Disable voice chat' : 'Enable voice chat'}
          >
            {isVoiceEnabled ? (
              <Mic className={cn('h-5 w-5', isRecording && 'text-primary')} />
            ) : (
              <MicOff className="h-5 w-5" />
            )}

            {/* Recording indicator */}
            {isRecording && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
