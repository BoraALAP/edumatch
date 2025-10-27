/**
 * Time Investment Section - Admin Dashboard
 *
 * Purpose: Display practice time analytics
 * Features:
 * - Total practice time (hours and minutes)
 * - Average practice time per student
 * - Overall engagement rate (sessions per student)
 *
 * Usage: /app/admin/page.tsx
 */

"use client";

import { Card } from "@/components/ui/card";
import { Clock, TrendingUp } from "lucide-react";

type TimeInvestmentProps = {
  totalPracticeMinutes: number;
  totalStudents: number;
  totalSoloSessions: number;
};

export function TimeInvestmentSection({
  totalPracticeMinutes,
  totalStudents,
  totalSoloSessions,
}: TimeInvestmentProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Time Investment
      </h3>
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
          value={
            totalStudents > 0
              ? `${Math.round(totalPracticeMinutes / totalStudents)} min`
              : "0 min"
          }
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
  );
}

// Stat Card Component
function StatCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-primary/10">
          <div className="text-primary">{icon}</div>
        </div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <p className="text-3xl font-bold text-foreground mb-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </Card>
  );
}
