/**
 * Onboarding Page
 *
 * Multi-step onboarding flow for new users to set up their profile.
 * Collects: language level, interests, bio, and age.
 * After completion, redirects to dashboard.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingForm from '@/components/onboarding/OnboardingForm';

export default async function OnboardingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user already completed onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.onboarding_completed) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen  py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome to EduMatch!</h1>
          <p className="text-lg text-muted-foreground">Let&apos;s set up your profile to find the perfect practice partners</p>
        </div>

        <OnboardingForm userId={user.id} />
      </div>
    </div>
  );
}
