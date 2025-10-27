/**
 * Matches Page
 *
 * Tinder-style matching interface for finding practice partners.
 * Shows student cards that can be swiped left (skip) or right (match).
 * Server component that fetches potential matches and user profile.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MatchingInterface from '@/components/matching/MatchingInterface';
import { PageHeader } from '@/components/layout/PageHeader';

export default async function MatchesPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get current user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile?.onboarding_completed) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen ">
      <PageHeader
        title="Find Practice Partners"
        subtitle="Swipe to connect with students who share your interests"
        backHref="/dashboard"
        maxWidth="4xl"
      />

      <main className="max-w-4xl mx-auto pt-30 px-4 sm:px-6 lg:px-8 py-8">
        <MatchingInterface userId={user.id} userProfile={profile} />
      </main>
    </div>
  );
}
