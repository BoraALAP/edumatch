/**
 * Voice Practice Helper Functions
 *
 * Purpose: Utility functions for voice practice
 * Features:
 * - Extract learning goals from profile
 * - Session management logic
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/types';

export function getLearningGoals(profile: Profile): string[] {
  const maybeGoals = (profile as { learning_goals?: unknown }).learning_goals;
  if (Array.isArray(maybeGoals)) {
    return maybeGoals.filter((goal): goal is string => typeof goal === 'string');
  }
  return [];
}

export async function createOrResumeVoiceSession({
  supabase,
  profile,
  topic,
  selectedSpeaker,
}: {
  supabase: SupabaseClient;
  profile: Profile;
  topic: string;
  selectedSpeaker: string;
}): Promise<string> {
  // Check for existing active session with this topic
  const { data: existingSession } = await supabase
    .from('voice_practice_sessions')
    .select('*')
    .eq('student_id', profile.id)
    .eq('topic', topic)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSession) {
    console.log('[Voice Practice] Resuming existing active session:', existingSession.id);
    return existingSession.id;
  }

  // Create a new voice_practice_sessions record
  const { data: session, error: sessionError } = await supabase
    .from('voice_practice_sessions')
    .insert({
      student_id: profile.id,
      topic,
      proficiency_level: profile.proficiency_level,
      learning_goals: getLearningGoals(profile),
      grammar_focus: [],
      status: 'active',
      voice_speaker: selectedSpeaker,
      voice_provider: 'openai-realtime',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (sessionError) {
    console.error('Error creating voice practice session:', sessionError);
    throw sessionError;
  }

  console.log('[Voice Practice] Created new session:', session.id);
  return session.id;
}
