/**
 * Voice Session Handlers
 *
 * Purpose: Business logic for voice session lifecycle
 * Features:
 * - Start voice session
 * - Pause/resume session
 * - End session and cleanup
 * - Fetch corrections
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { VoicePracticeSession, Profile, GrammarCorrection, ConversationMessage } from './types';

export async function startVoiceSession({
  session,
  profile,
}: {
  session: VoicePracticeSession;
  profile: Profile;
}): Promise<{ voiceSessionId: string; greeting?: string }> {
  const speaker = session.voice_speaker || 'alloy';
  const response = await fetch('/api/voice/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voicePracticeSessionId: session.id,
      studentId: session.student_id,
      context: {
        topic: session.topic,
        studentLevel: session.proficiency_level || profile.proficiency_level || 'B1',
        learningGoals: session.learning_goals || [],
        grammarFocus: session.grammar_focus || [],
        voiceSpeaker: speaker,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[Voice Session] Server error:', errorData);
    throw new Error(errorData.error || 'Failed to initialize voice session.');
  }

  const data = (await response.json()) as { voiceSessionId: string; greeting?: string };
  console.log('[Voice Session] Session created successfully:', data);
  return data;
}

export async function pauseVoiceSession({
  sessionId,
  supabase,
}: {
  sessionId: string;
  supabase: SupabaseClient;
}): Promise<void> {
  await supabase
    .from('voice_practice_sessions')
    .update({
      status: 'paused',
      paused_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  console.log('[Voice Session] Conversation paused');
}

export async function resumeVoiceSession({
  sessionId,
  supabase,
}: {
  sessionId: string;
  supabase: SupabaseClient;
}): Promise<void> {
  await supabase
    .from('voice_practice_sessions')
    .update({
      status: 'active',
      resumed_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  console.log('[Voice Session] Conversation resumed');
}

export async function endVoiceSession({
  sessionId,
  voiceSessionId,
  supabase,
}: {
  sessionId: string;
  voiceSessionId: string;
  supabase: SupabaseClient;
}): Promise<void> {
  // Update session status in database
  await supabase
    .from('voice_practice_sessions')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  // End voice session on server
  await fetch(`/api/voice/session/${voiceSessionId}/end`, { method: 'POST' });

  console.log('[Voice Session] Session ended successfully');
}

export async function fetchCorrections({
  sessionId,
  studentId,
  studentLevel,
}: {
  sessionId: string;
  studentId: string;
  studentLevel: string | null;
}): Promise<GrammarCorrection[]> {
  try {
    const response = await fetch('/api/voice/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        studentId,
        studentLevel,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[Voice Session] Loaded corrections:', data.corrections?.length || 0);
      return data.corrections || [];
    } else {
      console.error('[Voice Session] Failed to fetch corrections');
      return [];
    }
  } catch (err) {
    console.error('[Voice Session] Error fetching corrections:', err);
    return [];
  }
}

export async function loadConversationHistory({
  sessionId,
  supabase,
}: {
  sessionId: string;
  supabase: SupabaseClient;
}): Promise<ConversationMessage[]> {
  const { data: transcripts, error } = await supabase
    .from('voice_practice_transcripts')
    .select('role, text, timestamp')
    .eq('session_id', sessionId)
    .order('sequence_number', { ascending: true })
    .limit(100);

  if (error) {
    console.error('[Voice Session] Failed to load conversation history:', error);
    return [];
  }

  if (transcripts && transcripts.length > 0) {
    console.log('[Voice Session] Loaded', transcripts.length, 'previous messages');
    return transcripts as ConversationMessage[];
  }

  return [];
}
