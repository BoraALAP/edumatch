/**
 * Admin Overview Page - Analytics Dashboard
 *
 * Displays key metrics and analytics for school administrators:
 * - Student activity and engagement statistics
 * - Practice session metrics (solo and peer)
 * - Message activity and conversation health
 * - User growth and onboarding status
 * - Real-time insights into student learning patterns
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { MessageSquare, Users, Clock, TrendingUp, BookOpen, Target } from 'lucide-react';
import { ActivityCharts } from '@/components/admin/ActivityCharts';

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

  // Fetch analytics data in parallel
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: school },
    { count: studentCount },
    { count: teacherCount },
    { count: pendingInvites },
    { data: activeMatches },
    { data: recentMessages },
    { data: soloSessions },
    { data: recentActivity },
  ] = await Promise.all([
    // School info
    supabase
      .from('schools')
      .select('id, name, admin_email, admin_name, max_students, is_active, invitation_settings')
      .eq('id', schoolId)
      .maybeSingle(),

    // Total students
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'student'),

    // Total teachers
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'teacher'),

    // Pending invitations
    supabase
      .from('student_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'pending'),

    // Active matches (peer conversations) - only for students
    supabase
      .from('matches')
      .select(`
        id,
        status,
        created_at,
        student1:profiles!matches_student1_id_fkey(id, school_id, role),
        student2:profiles!matches_student2_id_fkey(id, school_id, role)
      `)
      .or(`student1.school_id.eq.${schoolId},student2.school_id.eq.${schoolId}`)
      .in('status', ['active', 'pending'])
      .limit(100),

    // Messages in last 30 days - only from student matches
    supabase
      .from('messages')
      .select(`
        id,
        created_at,
        match_id,
        match:matches!inner(
          student1:profiles!matches_student1_id_fkey(school_id, role),
          student2:profiles!matches_student2_id_fkey(school_id, role)
        )
      `)
      .gte('created_at', thirtyDaysAgo)
      .limit(10000),

    // Solo practice sessions in last 30 days
    supabase
      .from('session_reports')
      .select('id, user_id, session_type, duration_minutes, created_at, profiles!inner(school_id)')
      .eq('profiles.school_id', schoolId)
      .gte('created_at', thirtyDaysAgo)
      .limit(1000),

    // Recent student activity (last active)
    supabase
      .from('profiles')
      .select('id, display_name, full_name, last_active_at, role')
      .eq('school_id', schoolId)
      .eq('role', 'student')
      .not('last_active_at', 'is', null)
      .order('last_active_at', { ascending: false })
      .limit(10),
  ]);

  // Calculate analytics
  const totalStudents = studentCount ?? 0;
  const totalTeachers = teacherCount ?? 0;
  const pendingInvitationCount = pendingInvites ?? 0;

  type MatchParticipant = { school_id: string | null; role: string | null } | null;
  type MatchWithParticipants = {
    student1: MatchParticipant | MatchParticipant[];
    student2: MatchParticipant | MatchParticipant[];
  };

  const extractParticipant = (participant: MatchParticipant | MatchParticipant[]) => {
    if (Array.isArray(participant)) {
      return participant[0] ?? null;
    }
    return participant ?? null;
  };

  // Filter matches to only include students from this school (exclude admins/teachers)
  const schoolMatches = ((activeMatches ?? []) as MatchWithParticipants[]).filter((match) => {
    const student1 = extractParticipant(match.student1);
    const student2 = extractParticipant(match.student2);

    return (
      (student1?.school_id === schoolId && student1?.role === 'student') ||
      (student2?.school_id === schoolId && student2?.role === 'student')
    );
  });

  // Filter messages to only include those from student matches in this school
  type MessageWithMatch = {
    match: MatchWithParticipants | MatchWithParticipants[] | null;
    created_at: string;
  };

  const studentMessages = ((recentMessages ?? []) as MessageWithMatch[]).filter((msg) => {
    const matchData = Array.isArray(msg.match) ? msg.match[0] ?? null : msg.match;
    if (!matchData) return false;
    const student1 = extractParticipant(matchData.student1);
    const student2 = extractParticipant(matchData.student2);

    return (
      (student1?.school_id === schoolId && student1?.role === 'student') ||
      (student2?.school_id === schoolId && student2?.role === 'student')
    );
  });

  const totalMessages = studentMessages.length;
  const messagesLast7Days = studentMessages.filter(
    (msg: { created_at: string }) => new Date(msg.created_at) >= new Date(sevenDaysAgo)
  ).length;

  const totalSoloSessions = soloSessions?.length ?? 0;
  const totalPracticeMinutes = soloSessions?.reduce(
    (sum: number, session: { duration_minutes: number | null }) => sum + (session.duration_minutes ?? 0),
    0
  ) ?? 0;

  const activeStudentsLast7Days = new Set(
    recentActivity?.filter(
      (p: { last_active_at: string | null }) =>
        p.last_active_at && new Date(p.last_active_at) >= new Date(sevenDaysAgo)
    ).map((p: { id: string }) => p.id)
  ).size;

  const maxStudents = school?.max_students ?? Infinity;
  const capacityRemaining = Number.isFinite(maxStudents)
    ? Math.max(maxStudents - totalStudents - pendingInvitationCount, 0)
    : null;

  // Prepare chart data - Messages per day (last 7 days)
  const messagesPerDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));

    const count = studentMessages.filter((msg: { created_at: string }) => {
      const msgDate = new Date(msg.created_at);
      return msgDate >= dayStart && msgDate <= dayEnd;
    }).length;

    return {
      day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
      messages: count,
    };
  });

  // Prepare chart data - Practice time per day (last 7 days)
  const practicePerDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
    const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();

    const minutes = (soloSessions ?? []).filter(
      (session: { created_at: string }) =>
        session.created_at >= dayStart && session.created_at <= dayEnd
    ).reduce((sum: number, session: { duration_minutes: number | null }) =>
      sum + (session.duration_minutes ?? 0), 0
    );

    return {
      day: new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short' }),
      minutes,
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground">Student activity and engagement insights</p>
        </div>
        <Button asChild>
          <Link href="/admin/directory">Manage Directory</Link>
        </Button>
      </div>

      {/* User Statistics */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-4">Users</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            title="Total Students"
            value={totalStudents}
            subtitle={`${pendingInvitationCount} pending invites`}
            trend={activeStudentsLast7Days > 0 ? `${activeStudentsLast7Days} active this week` : undefined}
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            title="Teachers"
            value={totalTeachers}
            subtitle="Teacher accounts"
          />
          <StatCard
            icon={<Target className="h-5 w-5" />}
            title="Capacity"
            value={Number.isFinite(maxStudents) ? `${totalStudents}/${maxStudents}` : 'Unlimited'}
            subtitle={
              capacityRemaining !== null
                ? `${capacityRemaining} spots available`
                : 'No limit set'
            }
            isWarning={capacityRemaining !== null && capacityRemaining < 10}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Active (7d)"
            value={activeStudentsLast7Days}
            subtitle={`${totalStudents > 0 ? Math.round((activeStudentsLast7Days / totalStudents) * 100) : 0}% engagement`}
          />
        </div>
      </section>

      {/* Activity & Engagement */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-4">Activity & Engagement (Last 30 days)</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={<MessageSquare className="h-5 w-5" />}
            title="Total Messages"
            value={totalMessages}
            subtitle={`${messagesLast7Days} in last 7 days`}
            trend={messagesLast7Days > 0 ? `${Math.round(messagesLast7Days / 7)} avg/day` : undefined}
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            title="Active Conversations"
            value={schoolMatches.length}
            subtitle="Peer practice sessions"
          />
          <StatCard
            icon={<BookOpen className="h-5 w-5" />}
            title="Solo Practice"
            value={totalSoloSessions}
            subtitle={`${totalPracticeMinutes} total minutes`}
            trend={totalSoloSessions > 0 ? `${Math.round(totalPracticeMinutes / totalSoloSessions)} min avg` : undefined}
          />
        </div>
      </section>

      {/* Practice Time */}
      <section>
        <h3 className="text-lg font-semibold text-foreground mb-4">Time Investment</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            title="Total Practice Time"
            value={`${Math.round(totalPracticeMinutes / 60)}h ${totalPracticeMinutes % 60}m`}
            subtitle="Solo practice sessions"
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            title="Avg per Student"
            value={totalStudents > 0 ? `${Math.round(totalPracticeMinutes / totalStudents)} min` : '0 min'}
            subtitle="Per student average"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Engagement Rate"
            value={`${totalStudents > 0 ? Math.round((totalSoloSessions / totalStudents) * 100) : 0}%`}
            subtitle={`${totalSoloSessions} sessions / ${totalStudents} students`}
          />
        </div>
      </section>

      {/* Charts - Activity Trends */}
      <ActivityCharts messagesPerDay={messagesPerDay} practicePerDay={practicePerDay} />

      {/* Recently Active Students */}
      <section>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Recently Active Students</h3>
              <p className="text-sm text-muted-foreground">Students who practiced recently</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/directory">View All</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {(recentActivity ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            )}
            {(recentActivity ?? []).slice(0, 8).map((student: { id: string; display_name: string | null; full_name: string | null; last_active_at: string | null }) => (
              <div key={student.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {student.display_name ?? student.full_name ?? 'Unnamed Student'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last active: {student.last_active_at ? new Date(student.last_active_at).toLocaleString() : 'Never'}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

// Stat Card Component with icon
function StatCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  isWarning = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: string;
  isWarning?: boolean;
}) {
  return (
    <Card className={`p-6 ${isWarning ? 'border-amber-500/40 bg-amber-500/5' : ''}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${isWarning ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
          <div className={isWarning ? 'text-amber-500' : 'text-primary'}>{icon}</div>
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      {trend && (
        <p className="text-xs text-primary mt-2 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </p>
      )}
    </Card>
  );
}
