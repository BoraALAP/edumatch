/**
 * User Statistics Section - Admin Dashboard
 *
 * Purpose: Display key user metrics for school administrators
 * Features:
 * - Total students count with pending invitations
 * - Teacher count
 * - School capacity tracking
 * - Active students in last 7 days with engagement percentage
 *
 * Usage: /app/admin/page.tsx
 */

"use client";

import { Card } from "@/components/ui/card";
import { Users, Target, TrendingUp } from "lucide-react";

type UserStatsProps = {
  totalStudents: number;
  totalTeachers: number;
  pendingInvitationCount: number;
  activeStudentsLast7Days: number;
  maxStudents: number;
  capacityRemaining: number | null;
};

export function UserStatsSection({
  totalStudents,
  totalTeachers,
  pendingInvitationCount,
  activeStudentsLast7Days,
  maxStudents,
  capacityRemaining,
}: UserStatsProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-foreground mb-4">Users</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          title="Total Students"
          value={totalStudents}
          subtitle={`${pendingInvitationCount} pending invites`}
          trend={
            activeStudentsLast7Days > 0
              ? `${activeStudentsLast7Days} active this week`
              : undefined
          }
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
          value={
            Number.isFinite(maxStudents)
              ? `${totalStudents}/${maxStudents}`
              : "Unlimited"
          }
          subtitle={
            capacityRemaining !== null
              ? `${capacityRemaining} spots available`
              : "No limit set"
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
  );
}

// Stat Card Component
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
    <Card
      className={`p-6 ${isWarning ? "border-amber-500/40 bg-amber-500/5" : ""}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`p-2 rounded-lg ${isWarning ? "bg-amber-500/10" : "bg-primary/10"}`}
        >
          <div className={isWarning ? "text-amber-500" : "text-primary"}>
            {icon}
          </div>
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
