import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import type { InvitationSettings } from '@/types/schools';

export default async function AdminOverviewPage() {
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

  const schoolId = profile.school_id;

  if (!schoolId) {
    return (
      <Card className="border-dashed p-8 text-center text-muted-foreground">
        <p>Assign a school to this admin account to view analytics and manage users.</p>
      </Card>
    );
  }

  const [{ data: school }, { count: studentCount }, { count: teacherCount }, { count: pendingInvites }, { data: recentInvitations }, { data: recentStudents }] = await Promise.all([
    supabase
      .from('schools')
      .select('id, name, admin_email, admin_name, max_students, is_active, invitation_settings')
      .eq('id', schoolId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'student'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'teacher'),
    supabase
      .from('student_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'pending'),
    supabase
      .from('student_invitations')
      .select('id, email, status, created_at, expires_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('profiles')
      .select('id, full_name, display_name, role, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const invitationSettings = (school?.invitation_settings ?? {}) as InvitationSettings;
  const maxStudents = school?.max_students ?? Infinity;
  const totalStudents = studentCount ?? 0;
  const pendingInvitationCount = pendingInvites ?? 0;
  const capacityRemaining = Number.isFinite(maxStudents)
    ? Math.max(maxStudents - totalStudents - pendingInvitationCount, 0)
    : null;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Active Students" value={totalStudents} footer={`${pendingInvitationCount} pending invitations`} />
        <SummaryCard title="Teachers" value={teacherCount ?? 0} footer="Teacher accounts in this school" />
        <SummaryCard
          title="Capacity"
          value={Number.isFinite(maxStudents) ? `${totalStudents}/${maxStudents}` : 'Unlimited'}
          footer={
            Number.isFinite(maxStudents) && capacityRemaining !== null
              ? `${capacityRemaining} spots remaining`
              : 'No cap configured'
          }
        />
        <SummaryCard
          title="Auto Acceptance"
          value={invitationSettings.auto_accept_domain ? 'Enabled' : 'Disabled'}
          footer={invitationSettings.allowed_domains?.length ? `${invitationSettings.allowed_domains.length} domains` : 'No domain restrictions'}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Recent Invitations</h2>
              <p className="text-sm text-muted-foreground">Latest invitations sent to this school</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/invitations">Manage</Link>
            </Button>
          </div>
          <div className="mt-6 space-y-4">
            {(recentInvitations ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No invitations sent yet.</p>
            )}
            {(recentInvitations ?? []).map((invitation) => (
              <div key={invitation.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium text-foreground">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Sent {new Date(invitation.created_at).toLocaleString()} · Expires {new Date(invitation.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant={invitation.status === 'pending' ? 'secondary' : invitation.status === 'accepted' ? 'default' : 'outline'}
                >
                  {invitation.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Latest Members</h2>
              <p className="text-sm text-muted-foreground">Recently added profiles</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/students">View all</Link>
            </Button>
          </div>
          <div className="mt-6 space-y-4">
            {(recentStudents ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No members found yet.</p>
            )}
            {(recentStudents ?? []).map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium text-foreground">{member.display_name ?? member.full_name ?? 'Unnamed Member'}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined {new Date(member.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={member.role === 'teacher' ? 'outline' : 'secondary'}>{member.role}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function SummaryCard({ title, value, footer }: { title: string; value: number | string; footer?: string }) {
  return (
    <Card className="p-6">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
      {footer && <p className="mt-1 text-xs text-muted-foreground">{footer}</p>}
    </Card>
  );
}
