/**
 * Chat Action Handlers
 *
 * Purpose: Business logic for chat operations
 * Features:
 * - Session completion
 * - Message submission with grammar analysis
 * - Database operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PracticeMessage } from './types';
import { toast } from 'sonner';

interface FinishSessionParams {
  supabase: SupabaseClient;
  sessionId: string;
  onComplete: () => void;
  onError: () => void;
}

export async function finishSession({
  supabase,
  sessionId,
  onComplete,
  onError,
}: FinishSessionParams) {
  try {
    const { error } = await supabase
      .from('text_practice_sessions')
      .update({
        status: 'archived',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) throw error;

    toast.success('Session completed!', {
      description: 'Your practice session has been saved.',
    });

    onComplete();
  } catch (error) {
    console.error('Error finishing session:', error);
    toast.error('Failed to finish session. Please try again.');
    onError();
  }
}

interface SubmitMessageParams {
  supabase: SupabaseClient;
  sessionId: string;
  userMessage: string;
  studentLevel: string | null;
  grammarFocus: string[];
  combinedMessages: PracticeMessage[];
  sendMessage: (message: { text: string }) => Promise<void>;
}

export async function submitMessage({
  supabase,
  sessionId,
  userMessage,
  studentLevel,
  grammarFocus,
  combinedMessages,
  sendMessage,
}: SubmitMessageParams) {
  // Start AI conversation immediately for responsive UI
  console.log('[DEBUG] Calling chat.sendMessage');
  const sendPromise = sendMessage({ text: userMessage });
  console.log('[DEBUG] chat.sendMessage called, promise created');

  // Run DB save and grammar analysis in parallel (non-blocking)
  const messageIndex = combinedMessages.filter((m) => m.role === 'user').length;

  // Save to database in background
  (async () => {
    try {
      const { data: savedMessage, error: insertError } = await supabase
        .from('text_practice_messages')
        .insert({
          session_id: sessionId,
          role: 'user',
          content: userMessage,
          message_type: 'text',
        })
        .select()
        .single();

      if (insertError || !savedMessage) {
        console.error('Error saving user message:', insertError);
        return;
      }

      // Update message count
      try {
        await supabase.rpc('increment_session_message_count', {
          p_session_id: sessionId,
          p_is_correction: false,
        });
      } catch (err) {
        console.error('Error updating message count:', err);
      }

      // Run grammar analysis (non-blocking)
      try {
        const response = await fetch('/api/practice/analyze-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            userMessageId: savedMessage.id,
            message: userMessage,
            studentLevel,
            messageIndex,
            grammarFocus,
          }),
        });

        const result = await response.json();
        console.log('[Grammar Analysis]', result);
        if (result.shouldCorrect) {
          console.log('[Correction Created]', result.correction);
        }
      } catch (err) {
        console.error('Grammar analysis error:', err);
      }
    } catch (err) {
      console.error('Error in message flow:', err);
    }
  })();

  // Wait for AI response to complete (but user message already shown)
  await sendPromise;
}
