/**
 * Solo Practice Chat Component
 *
 * Purpose: Wrapper component that loads initial messages before rendering chat
 * Features:
 * - Initial message loading
 * - Loading state
 * - Error handling
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SoloPracticeSession, Profile } from './types';
import { useInitialMessages } from './chat-hooks';
import ChatInterface from './chat-interface';

interface SoloPracticeChatProps {
  sessionId: string;
  session: SoloPracticeSession;
  profile: Profile;
}

export default function SoloPracticeChat({
  sessionId,
  session,
  profile,
}: SoloPracticeChatProps) {
  const supabase = createClient();
  const { isReady, initialMessages } = useInitialMessages(sessionId, supabase);

  // Don't render until initial messages are loaded
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <ChatInterface
      sessionId={sessionId}
      session={session}
      profile={profile}
      initialMessages={initialMessages}
    />
  );
}
