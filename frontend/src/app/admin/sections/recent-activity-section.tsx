/**
 * Recent Activity Section - Admin Dashboard
 *
 * Purpose: Display recently active students
 * Features:
 * - List of students who practiced recently
 * - Last active timestamp for each student
 * - Link to view full student directory
 *
 * Usage: /app/admin/page.tsx
 */

"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Student = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  last_active_at: string | null;
};

type RecentActivityProps = {
  recentActivity: Student[];
};

export function RecentActivitySection({ recentActivity }: RecentActivityProps) {
  return (
    <section>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Recently Active Students
            </h3>
            <p className="text-sm text-muted-foreground">
              Students who practiced recently
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/directory">View All</Link>
          </Button>
        </div>
        <div className="space-y-3">
          {recentActivity.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          )}
          {recentActivity.slice(0, 8).map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <div>
                <p className="font-medium text-foreground text-sm">
                  {student.display_name ??
                    student.full_name ??
                    "Unnamed Student"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last active:{" "}
                  {student.last_active_at
                    ? new Date(student.last_active_at).toLocaleString()
                    : "Never"}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
