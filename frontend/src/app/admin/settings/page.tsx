import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import type { InvitationSettings } from '@/types/schools';

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
    .select('id, name, admin_email, admin_name, is_active, invitation_settings, max_students')
    .eq('id', profile.school_id)
    .maybeSingle();

  const invitationSettings = (school?.invitation_settings ?? {}) as InvitationSettings;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-foreground">School Settings</h2>
        <p className="text-sm text-muted-foreground">Configure contact details and invitation policies.</p>
      </header>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Primary Admin</dt>
            <dd className="text-base text-foreground">{school?.admin_name ?? 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Admin Email</dt>
            <dd className="text-base text-foreground">{school?.admin_email ?? 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">School Status</dt>
            <dd className="text-base text-foreground">
              <Badge variant={school?.is_active ? 'secondary' : 'outline'}>
                {school?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Student Capacity</dt>
            <dd className="text-base text-foreground">{school?.max_students ?? 'Unlimited'}</dd>
          </div>
        </dl>
        <Button disabled className="mt-6" variant="outline">
          Edit contact info (coming soon)
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground">Invitation Policy</h3>
        <div className="mt-4 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-foreground">Require approval</p>
              <p className="text-sm text-muted-foreground">
                Invitations require manual approval before users can join.
              </p>
            </div>
            <Badge variant={invitationSettings.require_approval ? 'secondary' : 'outline'}>
              {invitationSettings.require_approval ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-foreground">Auto-accept by domain</p>
              <p className="text-sm text-muted-foreground">
                Automatically accepts users whose email domain matches the allowed list.
              </p>
            </div>
            <Badge variant={invitationSettings.auto_accept_domain ? 'secondary' : 'outline'}>
              {invitationSettings.auto_accept_domain ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <div>
            <p className="font-medium text-foreground">Allowed Domains</p>
            <p className="text-sm text-muted-foreground">
              {invitationSettings.allowed_domains?.length
                ? invitationSettings.allowed_domains.join(', ')
                : 'No domain restrictions configured.'}
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground">Default Student Settings</p>
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/40 p-4 text-xs text-muted-foreground">
              {JSON.stringify(invitationSettings.default_student_settings ?? {}, null, 2)}
            </pre>
          </div>
        </div>
        <Button disabled className="mt-6" variant="outline">
          Edit invitation settings (coming soon)
        </Button>
      </Card>
    </div>
  );
}
