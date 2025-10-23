/**
 * Student Roster Client Component
 *
 * Client-side roster with filtering and graduate management.
 * Features:
 * - Filter by role (student, teacher, all)
 * - Filter by seat type (regular, graduate, all)
 * - Mark students as graduates (admin action)
 * - Display comprehensive member information
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Student {
  id: string;
  full_name: string | null;
  display_name: string | null;
  role: string;
  seat_type: string | null;
  onboarding_completed: boolean | null;
  last_active_at: string | null;
  created_at: string | null;
  proficiency_level: string | null;
}

interface StudentRosterClientProps {
  students: Student[];
}

export default function StudentRosterClient({ students }: StudentRosterClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [seatFilter, setSeatFilter] = useState<string>('all');
  const [isMarkingGraduate, setIsMarkingGraduate] = useState<string | null>(null);

  // Filter students
  const filteredStudents = students.filter((student) => {
    const roleMatch = roleFilter === 'all' || student.role === roleFilter;
    const seatMatch =
      seatFilter === 'all' ||
      (seatFilter === 'regular' && student.seat_type === 'regular') ||
      (seatFilter === 'graduate' && student.seat_type === 'graduate') ||
      (seatFilter === 'none' && !student.seat_type);
    return roleMatch && seatMatch;
  });

  const handleMarkAsGraduate = async (studentId: string) => {
    if (!confirm('Mark this student as a graduate? They will keep their account but the seat type will change.')) {
      return;
    }

    setIsMarkingGraduate(studentId);

    try {
      const { data, error } = await supabase.rpc('rpc_mark_student_as_graduate', {
        student_id: studentId,
      });

      if (error) throw error;

      if (data?.success) {
        alert('Student successfully marked as graduate!');
        router.refresh();
      } else {
        throw new Error(data?.error || 'Failed to mark as graduate');
      }
    } catch (error) {
      console.error('Error marking student as graduate:', error);
      alert(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsMarkingGraduate(null);
    }
  };

  return (
    <Card>
      {/* Filters */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Role</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={roleFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setRoleFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={roleFilter === 'student' ? 'default' : 'outline'}
                onClick={() => setRoleFilter('student')}
              >
                Students
              </Button>
              <Button
                size="sm"
                variant={roleFilter === 'teacher' ? 'default' : 'outline'}
                onClick={() => setRoleFilter('teacher')}
              >
                Teachers
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Seat Type</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={seatFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setSeatFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={seatFilter === 'regular' ? 'default' : 'outline'}
                onClick={() => setSeatFilter('regular')}
              >
                Regular
              </Button>
              <Button
                size="sm"
                variant={seatFilter === 'graduate' ? 'default' : 'outline'}
                onClick={() => setSeatFilter('graduate')}
              >
                Graduate
              </Button>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-3">
          Showing {filteredStudents.length} of {students.length} members
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Seat Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Level</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Onboarding</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Active</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No members match the selected filters.
                </td>
              </tr>
            )}
            {filteredStudents.map((student) => (
              <tr key={student.id}>
                <td className="px-4 py-3 font-medium text-foreground">
                  {student.display_name ?? student.full_name ?? 'Unnamed Member'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="capitalize">
                    {student.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {student.seat_type ? (
                    <Badge variant={student.seat_type === 'graduate' ? 'secondary' : 'default'}>
                      {student.seat_type}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {student.proficiency_level || '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={student.onboarding_completed ? 'secondary' : 'outline'}>
                    {student.onboarding_completed ? 'Completed' : 'Pending'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {student.last_active_at
                    ? new Date(student.last_active_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-4 py-3">
                  {student.role === 'student' && student.seat_type === 'regular' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkAsGraduate(student.id)}
                      disabled={isMarkingGraduate === student.id}
                    >
                      {isMarkingGraduate === student.id ? 'Marking...' : 'Mark Graduate'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
