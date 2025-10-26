/**
 * Onboarding Page
 *
 * Multi-step onboarding flow for new users to set up their profile.
 * Handles two flows:
 * 1. Individual signup: User signs up directly → role: 'individual'
 * 2. School invitation: User invited by admin → role from invitation metadata
 *
 * For invited users:
 * - Token passed via query params (?invited=true&token=XXX)
 * - After profile completion, automatically accepts invitation
 * - Role and school_id set from invitation, not from form
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingForm from '@/components/onboarding/OnboardingForm';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string; token?: string }>;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get query params
  const params = await searchParams;
  const isInvited = params.invited === 'true';
  const invitationToken = params.token;

  // Check if user already completed onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed, role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  // If already onboarded, redirect appropriately
  if (profile?.onboarding_completed) {
    if (profile.role === 'school_admin') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {isInvited ? 'Complete Your Profile' : 'Welcome to EduMatch!'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isInvited
              ? "You're almost there! Just a few more details to get started"
              : "Let's set up your profile to find the perfect practice partners"}
          </p>
        </header>

        <OnboardingForm
          userId={user.id}
          invitationToken={isInvited ? invitationToken : undefined}
        />
      </div>
    </div>
  );
}
