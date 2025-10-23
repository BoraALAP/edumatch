/**
 * School Setup Page
 *
 * Post-authentication school information collection.
 * Redirects here after OAuth login from school signup flow.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import SchoolSetupForm from '@/components/schools/SchoolSetupForm';

export default async function SchoolSetupPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated, redirect to school signup
  if (!user) {
    redirect('/schools/signup');
  }

  // Check if email is confirmed
  const emailConfirmed = user.email_confirmed_at !== null;

  // If user already has a profile, redirect appropriately
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle();

  if (profile) {
    // Already has profile, redirect based on role
    if (profile.role === 'school_admin') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-foreground">EduMatch</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!emailConfirmed ? (
          // Email not confirmed - show waiting message
          <div className="text-center">
            <div className="text-6xl mb-6">📧</div>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Please Confirm Your Email
            </h1>
            <Card className="p-8 text-left">
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  We sent a confirmation link to:
                </p>
                <p className="text-lg font-semibold text-foreground bg-muted px-4 py-2 rounded-md">
                  {user.email}
                </p>
                <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Next steps:</p>
                  <ol className="list-decimal list-inside space-y-1 pl-2">
                    <li>Check your email inbox (and spam folder)</li>
                    <li>Click the confirmation link in the email</li>
                    <li>You&apos;ll be redirected back to complete school registration</li>
                  </ol>
                </div>
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Didn&apos;t receive the email? Check your spam folder or try signing up again.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          // Email confirmed - show school setup form
          <>
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Email Confirmed!
              </h1>
              <p className="text-muted-foreground">
                Now let&apos;s set up your school
              </p>
            </div>

            <Card className="p-8">
              <SchoolSetupForm userEmail={user.email || ''} />
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
