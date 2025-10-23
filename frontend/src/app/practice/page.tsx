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
import SoloPracticeInterface from '@/components/practice/SoloPracticeInterface';

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
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Solo Practice</h1>
              <p className="text-sm text-muted-foreground">
                Practice conversation with your AI coach
              </p>
            </div>
            <a href="/dashboard" className="text-primary hover:text-primary/90">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SoloPracticeInterface profile={profile} />
      </main>
    </div>
  );
}
