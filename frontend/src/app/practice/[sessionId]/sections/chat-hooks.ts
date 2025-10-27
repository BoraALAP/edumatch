/**
 * Chat Custom Hooks
 *
 * Purpose: Custom hooks for chat functionality
 * Features:
 * - Initial message loading
 * - Real-time message subscription
 * - Message deduplication
 */

import { useEffect, useState, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PracticeMessage } from './types';
import { extractMessageText } from './chat-utils';

export function useInitialMessages(sessionId: string, supabase: SupabaseClient) {
  const [isReady, setIsReady] = useState(false);
  const [initialMessages, setInitialMessages] = useState<PracticeMessage[]>([]);

  useEffect(() => {
    async function loadMessages() {
      try {
        console.log('[DEBUG] Loading messages for session:', sessionId);
        const { data, error } = await supabase
          .from('text_practice_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[DEBUG] Error loading messages:', error);
          throw error;
        }

        console.log('[DEBUG] Loaded messages from DB:', data?.length || 0, 'messages');

        if (data && data.length > 0) {
          const msgs = data.map((msg) => ({
            id: msg.id,
            role: msg.role,
            parts: [
              {
                type: 'text' as const,
                text: msg.content,
              },
            ],
            createdAt: msg.created_at ? new Date(msg.created_at) : undefined,
            messageType: msg.message_type || 'text',
            grammarIssues: msg.grammar_issues || undefined,
            correctionSeverity: msg.correction_severity || undefined,
            isCorrect: msg.is_correct || false,
          }));
          console.log('[DEBUG] Converted messages:', msgs);
          setInitialMessages(msgs);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsReady(true);
      }
    }

    loadMessages();
  }, [sessionId, supabase]);

  return { isReady, initialMessages };
}

export function useRealtimeMessages(sessionId: string, supabase: SupabaseClient) {
  const [realtimeMessages, setRealtimeMessages] = useState<PracticeMessage[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`text_practice:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'text_practice_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          console.log('[DEBUG] Real-time message received:', newMsg.role, newMsg.message_type);

          const formattedMsg: PracticeMessage = {
            id: newMsg.id,
            role: newMsg.role,
            parts: [{ type: 'text', text: newMsg.content }],
            createdAt: newMsg.created_at ? new Date(newMsg.created_at) : undefined,
            messageType: newMsg.message_type || 'text',
            grammarIssues: newMsg.grammar_issues,
            correctionSeverity: newMsg.correction_severity,
            isCorrect: newMsg.is_correct || false,
          };

          setRealtimeMessages((prev) => {
            console.log('[DEBUG] Adding to realtime messages, count:', prev.length + 1);
            return [...prev, formattedMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  return realtimeMessages;
}

export function useCombinedMessages(
  initialMessages: PracticeMessage[],
  realtimeMessages: PracticeMessage[],
  streamingMessages: PracticeMessage[]
) {
  return useMemo(() => {
    const messageMap = new Map<string, PracticeMessage>();
    const now = Date.now();

    const allMessages = [...initialMessages, ...realtimeMessages, ...streamingMessages];

    console.log('[DEBUG] Processing messages:', {
      initialCount: initialMessages.length,
      realtimeCount: realtimeMessages.length,
      streamingCount: streamingMessages.length,
      total: allMessages.length,
    });

    for (const message of allMessages) {
      const contentKey = `${message.role}-${extractMessageText(message)}`;
      const existingMsg = messageMap.get(contentKey);

      const hasDbId = typeof message.id === 'string' && message.id.length > 10;
      const existingHasDbId =
        existingMsg && typeof existingMsg.id === 'string' && existingMsg.id.length > 10;

      if (!existingMsg || (hasDbId && !existingHasDbId)) {
        if (!message.createdAt) {
          message.createdAt = new Date(now);
        }

        if (!message.messageType && message.role === 'assistant') {
          message.messageType = 'text';
        }

        messageMap.set(contentKey, message);
      }
    }

    const merged = Array.from(messageMap.values());

    console.log('[DEBUG] After deduplication:', merged.length, 'messages');

    return merged.sort((a, b) => {
      const aTime = a.createdAt
        ? typeof a.createdAt === 'string'
          ? new Date(a.createdAt).getTime()
          : a.createdAt.getTime()
        : 0;
      const bTime = b.createdAt
        ? typeof b.createdAt === 'string'
          ? new Date(b.createdAt).getTime()
          : b.createdAt.getTime()
        : 0;

      const timeDiff = Math.abs(aTime - bTime);
      if (timeDiff < 5000) {
        const aIsCorrection = a.messageType === 'correction';
        const bIsCorrection = b.messageType === 'correction';

        if (aIsCorrection && !bIsCorrection) return -1;
        if (!aIsCorrection && bIsCorrection) return 1;
      }

      return aTime - bTime;
    });
  }, [initialMessages, realtimeMessages, streamingMessages]);
}
