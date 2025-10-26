/**
 * Voice Waveform Component
 *
 * Purpose: Visual feedback for audio input levels
 * Features:
 * - Real-time audio level visualization
 * - Animated waveform bars
 * - Responsive to microphone input
 * - Smooth animations
 */

'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface VoiceWaveformProps {
  audioLevel: number; // 0-100
  isActive: boolean;
  barCount?: number;
  className?: string;
}

export function VoiceWaveform({
  audioLevel,
  isActive,
  barCount = 5,
  className,
}: VoiceWaveformProps) {
  const barsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!isActive) return;

    // Animate bars based on audio level
    const interval = setInterval(() => {
      barsRef.current.forEach((bar, index) => {
        if (!bar) return;

        // Create wave effect with varying heights
        const baseHeight = audioLevel / 100;
        const offset = Math.sin(Date.now() / 200 + index * 0.5) * 0.3;
        const height = Math.max(0.1, Math.min(1, baseHeight + offset));

        bar.style.transform = `scaleY(${height})`;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [audioLevel, isActive]);

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      {Array.from({ length: barCount }).map((_, index) => (
        <div
          key={index}
          ref={(el) => {
            if (el) barsRef.current[index] = el;
          }}
          className={cn(
            'h-8 w-1 rounded-full transition-all duration-100 origin-bottom',
            isActive ? 'bg-primary' : 'bg-muted-foreground/30'
          )}
          style={{
            transform: isActive ? undefined : 'scaleY(0.2)',
          }}
        />
      ))}
    </div>
  );
}
