/**
 * Voice Practice Session Page
 *
 * Purpose: Real-time voice conversation with AI coach
 * Features:
 * - Voice session initialization
 * - Real-time AI voice conversation
 * - Background speech analysis (grammar, pronunciation, accent, fluency)
 * - Post-session summary with accumulated corrections
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VoicePracticeSession from '@/components/practice/VoicePracticeSession';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function VoicePracticeSessionPage({ params }: PageProps) {
  const supabase = await createClient();
  const { sessionId } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from('voice_practice_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .maybeSingle();

  if (sessionError || !session) {
    console.error('Session not found or error:', sessionError);
    redirect('/voice-practice');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen bg-background">
      <VoicePracticeSession session={session} profile={profile} />
    </div>
  );
}
