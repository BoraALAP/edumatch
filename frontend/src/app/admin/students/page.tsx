/**
 * Students Page - School Admin
 *
 * Displays roster of all school members with filtering and seat management.
 * Features:
 * - Filter by role (student, teacher, all)
 * - Filter by seat type (regular, graduate, all)
 * - Display seat information
 * - Mark students as graduates
 * - View onboarding and activity status
 */

import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import StudentRosterClient from './StudentRosterClient';

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

  // Get school information for seat tracking
  const { data: school } = await supabase
    .from('schools')
    .select('name, seats_total, seats_regular_used, seats_graduate_used')
    .eq('id', profile.school_id)
    .single();

  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, role, seat_type, onboarding_completed, last_active_at, created_at, proficiency_level')
    .eq('school_id', profile.school_id)
    .order('role', { ascending: true })
    .order('full_name', { ascending: true, nullsFirst: false });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Students & Teachers</h2>
        <p className="text-sm text-muted-foreground">
          Manage school members, track seats, and mark students as graduates.
        </p>
      </div>

      {/* Seat Tracking Card */}
      {school && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{school.name}</h3>
              <p className="text-sm text-muted-foreground">Seat Allocation</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {school.seats_regular_used + school.seats_graduate_used} / {school.seats_total}
              </div>
              <p className="text-sm text-muted-foreground">
                {school.seats_total - (school.seats_regular_used + school.seats_graduate_used)} remaining
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Regular Seats</p>
              <p className="text-xl font-semibold text-foreground">{school.seats_regular_used}</p>
            </div>
            <div className="bg-secondary/10 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Graduate Seats</p>
              <p className="text-xl font-semibold text-foreground">{school.seats_graduate_used}</p>
            </div>
          </div>
          {/* Capacity warning */}
          {(school.seats_regular_used + school.seats_graduate_used) / school.seats_total >= 0.8 && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                ⚠️ {(school.seats_regular_used + school.seats_graduate_used) / school.seats_total >= 0.95
                  ? 'Critical: Nearly at capacity!'
                  : 'Warning: 80% capacity reached'}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Client-side roster with filtering */}
      <StudentRosterClient students={students || []} />
    </div>
  );
}
