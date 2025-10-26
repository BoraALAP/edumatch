/**
 * Solo Practice Session Page
 *
 * Individual practice session with AI coach.
 * Server component that fetches session details and passes to client component.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SoloPracticeChatInterface from '@/components/practice/SoloPracticeChatInterface';

interface PracticeSessionPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export default async function PracticeSessionPage({ params }: PracticeSessionPageProps) {
  // Await params in Next.js 15
  const { sessionId } = await params;

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from('text_practice_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    redirect('/practice');
  }

  // Verify user owns this session
  if (session.student_id !== user.id) {
    redirect('/practice');
  }

  if (session.status !== 'active') {
    redirect('/practice');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/dashboard');
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <SoloPracticeChatInterface
        sessionId={sessionId}
        session={session}
        profile={profile}
      />
    </div>
  );
}
