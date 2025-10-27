/**
 * Activity & Engagement Section - Admin Dashboard
 *
 * Purpose: Display activity metrics for the last 30 days
 * Features:
 * - Total messages count with 7-day average
 * - Active peer conversations count
 * - Solo practice sessions with total minutes
 *
 * Usage: /app/admin/page.tsx
 */

"use client";

import { Card } from "@/components/ui/card";
import { MessageSquare, Users, BookOpen, TrendingUp } from "lucide-react";

type ActivityEngagementProps = {
  totalMessages: number;
  messagesLast7Days: number;
  activeConversations: number;
  totalSoloSessions: number;
  totalPracticeMinutes: number;
};

export function ActivityEngagementSection({
  totalMessages,
  messagesLast7Days,
  activeConversations,
  totalSoloSessions,
  totalPracticeMinutes,
}: ActivityEngagementProps) {
  return (
    <section>
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Activity & Engagement (Last 30 days)
      </h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          title="Total Messages"
          value={totalMessages}
          subtitle={`${messagesLast7Days} in last 7 days`}
          trend={
            messagesLast7Days > 0
              ? `${Math.round(messagesLast7Days / 7)} avg/day`
              : undefined
          }
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          title="Active Conversations"
          value={activeConversations}
          subtitle="Peer practice sessions"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          title="Solo Practice"
          value={totalSoloSessions}
          subtitle={`${totalPracticeMinutes} total minutes`}
          trend={
            totalSoloSessions > 0
              ? `${Math.round(totalPracticeMinutes / totalSoloSessions)} min avg`
              : undefined
          }
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
}: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: string;
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
      {trend && (
        <p className="text-xs text-primary mt-2 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </p>
      )}
    </Card>
  );
}
