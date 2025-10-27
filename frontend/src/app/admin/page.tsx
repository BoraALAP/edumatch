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

import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ActivityCharts } from "@/components/admin/ActivityCharts";
import { UserStatsSection } from "./sections/user-stats-section";
import { ActivityEngagementSection } from "./sections/activity-engagement-section";
import { TimeInvestmentSection } from "./sections/time-investment-section";
import { RecentActivitySection } from "./sections/recent-activity-section";

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["school_admin", "admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const schoolId = profile.school_id;

  if (!schoolId) {
    return (
      <Card className="border-dashed p-8 text-center text-muted-foreground">
        <p>
          Assign a school to this admin account to view analytics and manage
          users.
        </p>
      </Card>
    );
  }

  // Fetch analytics data in parallel
  const now = new Date();
  const thirtyDaysAgo = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const sevenDaysAgo = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

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
      .from("schools")
      .select(
        "id, name, admin_email, admin_name, max_students, is_active, invitation_settings",
      )
      .eq("id", schoolId)
      .maybeSingle(),

    // Total students
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("role", "student"),

    // Total teachers
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("role", "teacher"),

    // Pending invitations
    supabase
      .from("student_invitations")
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId)
      .eq("status", "pending"),

    // Active matches (peer conversations) - only for students
    supabase
      .from("matches")
      .select(
        `
        id,
        status,
        created_at,
        student1:profiles!matches_student1_id_fkey(id, school_id, role),
        student2:profiles!matches_student2_id_fkey(id, school_id, role)
      `,
      )
      .or(`student1.school_id.eq.${schoolId},student2.school_id.eq.${schoolId}`)
      .in("status", ["active", "pending"])
      .limit(100),

    // Messages in last 30 days - only from student matches
    supabase
      .from("messages")
      .select(
        `
        id,
        created_at,
        match_id,
        match:matches!inner(
          student1:profiles!matches_student1_id_fkey(school_id, role),
          student2:profiles!matches_student2_id_fkey(school_id, role)
        )
      `,
      )
      .gte("created_at", thirtyDaysAgo)
      .limit(10000),

    // Solo practice sessions in last 30 days
    supabase
      .from("session_reports")
      .select(
        "id, user_id, session_type, duration_minutes, created_at, profiles!inner(school_id)",
      )
      .eq("profiles.school_id", schoolId)
      .gte("created_at", thirtyDaysAgo)
      .limit(1000),

    // Recent student activity (last active)
    supabase
      .from("profiles")
      .select("id, display_name, full_name, last_active_at, role")
      .eq("school_id", schoolId)
      .eq("role", "student")
      .not("last_active_at", "is", null)
      .order("last_active_at", { ascending: false })
      .limit(10),
  ]);

  // Calculate analytics
  const totalStudents = studentCount ?? 0;
  const totalTeachers = teacherCount ?? 0;
  const pendingInvitationCount = pendingInvites ?? 0;

  type MatchParticipant = {
    school_id: string | null;
    role: string | null;
  } | null;
  type MatchWithParticipants = {
    student1: MatchParticipant | MatchParticipant[];
    student2: MatchParticipant | MatchParticipant[];
  };

  const extractParticipant = (
    participant: MatchParticipant | MatchParticipant[],
  ) => {
    if (Array.isArray(participant)) {
      return participant[0] ?? null;
    }
    return participant ?? null;
  };

  // Filter matches to only include students from this school (exclude admins/teachers)
  const schoolMatches = (
    (activeMatches ?? []) as MatchWithParticipants[]
  ).filter((match) => {
    const student1 = extractParticipant(match.student1);
    const student2 = extractParticipant(match.student2);

    return (
      (student1?.school_id === schoolId && student1?.role === "student") ||
      (student2?.school_id === schoolId && student2?.role === "student")
    );
  });

  // Filter messages to only include those from student matches in this school
  type MessageWithMatch = {
    match: MatchWithParticipants | MatchWithParticipants[] | null;
    created_at: string;
  };

  const studentMessages = ((recentMessages ?? []) as MessageWithMatch[]).filter(
    (msg) => {
      const matchData = Array.isArray(msg.match)
        ? (msg.match[0] ?? null)
        : msg.match;
      if (!matchData) return false;
      const student1 = extractParticipant(matchData.student1);
      const student2 = extractParticipant(matchData.student2);

      return (
        (student1?.school_id === schoolId && student1?.role === "student") ||
        (student2?.school_id === schoolId && student2?.role === "student")
      );
    },
  );

  const totalMessages = studentMessages.length;
  const messagesLast7Days = studentMessages.filter(
    (msg: { created_at: string }) =>
      new Date(msg.created_at) >= new Date(sevenDaysAgo),
  ).length;

  const totalSoloSessions = soloSessions?.length ?? 0;
  const totalPracticeMinutes =
    soloSessions?.reduce(
      (sum: number, session: { duration_minutes: number | null }) =>
        sum + (session.duration_minutes ?? 0),
      0,
    ) ?? 0;

  const activeStudentsLast7Days = new Set(
    recentActivity
      ?.filter(
        (p: { last_active_at: string | null }) =>
          p.last_active_at &&
          new Date(p.last_active_at) >= new Date(sevenDaysAgo),
      )
      .map((p: { id: string }) => p.id),
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
      day: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
      messages: count,
    };
  });

  // Prepare chart data - Practice time per day (last 7 days)
  const practicePerDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
    const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();

    const minutes = (soloSessions ?? [])
      .filter(
        (session: { created_at: string }) =>
          session.created_at >= dayStart && session.created_at <= dayEnd,
      )
      .reduce(
        (sum: number, session: { duration_minutes: number | null }) =>
          sum + (session.duration_minutes ?? 0),
        0,
      );

    return {
      day: new Date(dayStart).toLocaleDateString("en-US", { weekday: "short" }),
      minutes,
    };
  });

  return (
    <div className="space-y-8">
      {/* User Statistics */}
      <UserStatsSection
        totalStudents={totalStudents}
        totalTeachers={totalTeachers}
        pendingInvitationCount={pendingInvitationCount}
        activeStudentsLast7Days={activeStudentsLast7Days}
        maxStudents={maxStudents}
        capacityRemaining={capacityRemaining}
      />

      {/* Activity & Engagement */}
      <ActivityEngagementSection
        totalMessages={totalMessages}
        messagesLast7Days={messagesLast7Days}
        activeConversations={schoolMatches.length}
        totalSoloSessions={totalSoloSessions}
        totalPracticeMinutes={totalPracticeMinutes}
      />

      {/* Practice Time */}
      <TimeInvestmentSection
        totalPracticeMinutes={totalPracticeMinutes}
        totalStudents={totalStudents}
        totalSoloSessions={totalSoloSessions}
      />

      {/* Charts - Activity Trends */}
      <ActivityCharts
        messagesPerDay={messagesPerDay}
        practicePerDay={practicePerDay}
      />

      {/* Recently Active Students */}
      <RecentActivitySection recentActivity={recentActivity ?? []} />
    </div>
  );
}
