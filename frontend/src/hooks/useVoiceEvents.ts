/**
 * Voice Events Hook
 *
 * Purpose: Manages event polling for voice sessions
 * Features:
 * - Poll for voice events from server
 * - Handle event lifecycle
 * - Cleanup on unmount
 */

import { useCallback, useRef } from 'react';
import type { VoiceEvent } from '@/lib/voice/types';

interface UseVoiceEventsProps {
  onEvents: (events: VoiceEvent[]) => void;
}

export function useVoiceEvents({ onEvents }: UseVoiceEventsProps) {
  const eventPollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const pollVoiceEvents = useCallback(
    async (sessionId: string) => {
      if (isPollingRef.current) {
        return;
      }

      isPollingRef.current = true;
      try {
        const response = await fetch(`/api/voice/session/${sessionId}/events`);
        if (response.status === 404) {
          console.warn('[Voice Events] Session ended or not found');
          if (eventPollTimerRef.current) {
            clearInterval(eventPollTimerRef.current);
            eventPollTimerRef.current = null;
          }
          return;
        }
        if (!response.ok) {
          throw new Error('Failed to load voice events');
        }

        const data = (await response.json()) as { events?: VoiceEvent[] };
        if (Array.isArray(data.events) && data.events.length > 0) {
          console.log(
            '[Voice Events] Received events:',
            data.events.length,
            data.events.map((e) => e.type)
          );
          onEvents(data.events);
        }
      } catch (err) {
        console.error('[Voice Events] Event polling error:', err);
      } finally {
        isPollingRef.current = false;
      }
    },
    [onEvents]
  );

  const startEventPolling = useCallback(
    (sessionId: string) => {
      if (eventPollTimerRef.current) {
        return;
      }

      // Kick off immediately to consume buffered events (like greeting)
      void pollVoiceEvents(sessionId);
      eventPollTimerRef.current = setInterval(() => {
        void pollVoiceEvents(sessionId);
      }, 600);
    },
    [pollVoiceEvents]
  );

  const stopEventPolling = useCallback(() => {
    if (eventPollTimerRef.current) {
      clearInterval(eventPollTimerRef.current);
      eventPollTimerRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  return {
    startEventPolling,
    stopEventPolling,
  };
}
