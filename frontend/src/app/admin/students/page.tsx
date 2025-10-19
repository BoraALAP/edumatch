import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';

export default async function StudentsPage() {
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
        <p>Assign a school to manage student accounts.</p>
      </Card>
    );
  }

  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, role, onboarding_completed, last_active_at, created_at')
    .eq('school_id', profile.school_id)
    .order('role', { ascending: true })
    .order('full_name', { ascending: true, nullsFirst: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Students & Teachers</h2>
        <p className="text-sm text-muted-foreground">
          Review onboarding status and last activity for members of your school.
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Onboarding</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Active</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(students ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No members found yet.
                  </td>
                </tr>
              )}
              {(students ?? []).map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {student.display_name ?? student.full_name ?? 'Unnamed Member'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{student.role}</td>
                  <td className="px-4 py-3">
                    <Badge variant={student.onboarding_completed ? 'secondary' : 'outline'}>
                      {student.onboarding_completed ? 'Completed' : 'Pending'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {student.last_active_at
                      ? new Date(student.last_active_at).toLocaleString()
                      : 'No activity yet'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {student.created_at ? new Date(student.created_at).toLocaleDateString() : '—'}
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
