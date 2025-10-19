import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { InviteStudentsDialog } from './components/InviteStudentsDialog';
import { InvitationRowActions } from './components/InvitationRowActions';

export default async function InvitationsPage() {
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
        <p>Assign a school to manage invitations.</p>
      </Card>
    );
  }

  const { data: invitations } = await supabase
    .from('student_invitations')
    .select('id, email, status, role, created_at, expires_at, invited_by, accepted_at')
    .eq('school_id', profile.school_id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Invitations</h2>
          <p className="text-sm text-muted-foreground">Track and manage student and teacher invitations.</p>
        </div>
        <InviteStudentsDialog schoolId={profile.school_id ?? undefined} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sent</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(invitations ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No invitations found. Start by inviting your first group of students.
                  </td>
                </tr>
              )}
              {(invitations ?? []).map((invite) => (
                <tr key={invite.id}>
                  <td className="px-4 py-3 font-medium text-foreground">{invite.email}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{invite.role ?? 'student'}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        invite.status === 'pending'
                          ? 'secondary'
                          : invite.status === 'accepted'
                            ? 'default'
                            : 'outline'
                      }
                    >
                      {invite.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {invite.created_at ? new Date(invite.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {invite.status === 'accepted'
                      ? invite.accepted_at
                        ? `Accepted ${new Date(invite.accepted_at).toLocaleString()}`
                        : 'Accepted'
                      : new Date(invite.expires_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <InvitationRowActions invitationId={invite.id} status={invite.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
