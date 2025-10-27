/**
 * Voice Practice UI Components
 *
 * Purpose: Reusable UI components for voice practice
 * Features:
 * - Browser support warning
 * - Practice tips display
 * - Loading state
 */

'use client';

import { Card } from '@/components/ui/card';
import { Mic, Loader2 } from 'lucide-react';

export function BrowserSupportWarning() {
  return (
    <Card className="p-4 bg-destructive/10 border-destructive/40">
      <div className="flex items-start gap-3">
        <Mic className="h-5 w-5 text-destructive mt-0.5" />
        <div>
          <h3 className="font-semibold text-destructive">Browser Not Supported</h3>
          <p className="text-sm text-destructive/90 mt-1">
            Voice practice requires a modern browser with microphone support. Please use Chrome,
            Edge, or Safari.
          </p>
        </div>
      </div>
    </Card>
  );
}

export function VoicePracticeTips() {
  return (
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
  );
}

export function StartingSessionLoading({ topic }: { topic: string }) {
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
