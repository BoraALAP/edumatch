/**
 * Solo Practice Page
 *
 * Individual conversation practice with AI Coach.
 * Features:
 * - Topic selection based on interests and curriculum
 * - Real-time AI conversation partner
 * - Grammar corrections and feedback
 * - Practice history and progress tracking
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SoloPracticeInterface from './sections/practice-interface';
import { PageHeader } from '@/components/layout/PageHeader';

export default async function PracticePage() {
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
        title="Solo Practice"
        subtitle="Practice conversation with your AI coach"
        backHref="/dashboard"
        maxWidth="5xl"
      />

      <main className="max-w-5xl mx-auto pt-30 px-4 sm:px-6 lg:px-8 py-8">
        <SoloPracticeInterface profile={profile} />
      </main>
    </div>
  );
}
