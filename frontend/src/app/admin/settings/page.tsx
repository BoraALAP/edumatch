/**
 * School Settings Page - Admin
 *
 * Configure school settings, invitation policies, and global matching.
 * Features:
 * - Global matching toggle (allow students to partner with individuals)
 * - Edit school information (name, admin details)
 * - Configure invitation policies (domains, default roles)
 * - Student visibility controls
 */

import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import SettingsClient from './SettingsClient';

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['school_admin', 'admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  if (!profile.school_id) {
    return (
      <Card className="border-dashed p-8 text-center text-muted-foreground">
        <p>Assign a school to configure settings.</p>
      </Card>
    );
  }

  const { data: school } = await supabase
    .from('schools')
    .select('id, name, admin_email, admin_name, is_active, invitation_settings, max_students, allow_global_matching')
    .eq('id', profile.school_id)
    .single();

  if (!school) {
    return (
      <Card className="border-dashed p-8 text-center text-muted-foreground">
        <p>School not found.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-foreground">School Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure school information, invitation policies, and matching preferences.
        </p>
      </header>

      <SettingsClient school={school} />
    </div>
  );
}
