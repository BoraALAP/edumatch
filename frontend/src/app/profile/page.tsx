/**
 * Profile Page
 *
 * Displays and allows editing of user profile information.
 * Server component that fetches user profile data.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileEditor from '@/app/profile/sections/ProfileEditor';
import { PageHeader } from '@/components/layout/PageHeader';

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
      <PageHeader
        title="My Profile"
        subtitle="Manage your profile information and preferences"
        backHref="/dashboard"
        maxWidth="4xl"
      />

      <main className="max-w-4xl mx-auto pt-30 px-4 sm:px-6 lg:px-8 py-8">
        <ProfileEditor profile={profile} user={user} />
      </main>
    </div>
  );
}
