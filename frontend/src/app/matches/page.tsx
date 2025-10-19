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
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-foreground">Find Practice Partners</h1>
            <a href="/dashboard" className="text-primary hover:text-primary/90">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MatchingInterface userId={user.id} userProfile={profile} />
      </main>
    </div>
  );
}
