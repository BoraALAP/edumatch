/**
 * Practice UI Components
 *
 * Purpose: Reusable UI components for solo practice
 * Features:
 * - Practice tips display
 * - Loading state
 */

'use client';

import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function PracticeTips() {
  return (
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
  );
}

export function StartingPracticeLoading({ topic }: { topic: string }) {
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
