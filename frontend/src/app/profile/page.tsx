/**
 * Profile Page
 *
 * Displays and allows editing of user profile information.
 * Server component that fetches user profile data.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileEditor from '@/components/profile/ProfileEditor';

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

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
    <div className="min-h-screen ">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <a href="/dashboard" className="text-primary hover:text-primary/90">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProfileEditor profile={profile} user={user} />
      </main>
    </div>
  );
}
