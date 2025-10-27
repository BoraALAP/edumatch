/**
 * Voice Practice Page
 *
 * Voice conversation practice with AI Coach using OpenAI Realtime.
 * Features:
 * - Topic selection based on interests and curriculum
 * - Real-time voice conversation with AI
 * - Silent grammar, pronunciation, accent, and fluency analysis
 * - Post-session summary with accumulated corrections
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VoicePracticeInterface from './sections/voice-practice-interface';
import { PageHeader } from '@/components/layout/PageHeader';

export default async function VoicePracticePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.onboarding_completed) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Voice Practice"
        subtitle="Practice speaking with your AI voice coach"
        backHref="/dashboard"
        maxWidth="5xl"
      />

      <main className="max-w-5xl mx-auto pt-30 px-4 sm:px-6 lg:px-8 py-8">
        <VoicePracticeInterface profile={profile} />
      </main>
    </div>
  );
}
