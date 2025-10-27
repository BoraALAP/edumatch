/**
 * Dashboard Sidebar Section
 *
 * Purpose: Display sidebar cards for practice options and user info
 * Features:
 * - Solo practice card
 * - Voice practice card
 * - Find partner card
 * - User profile summary card
 *
 * Usage: /app/dashboard/page.tsx
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

type Profile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  proficiency_level: string | null;
  interests: string[] | null;
  [key: string]: unknown;
};

type User = {
  email?: string;
  created_at: string;
  user_metadata?: {
    full_name?: string;
  };
  app_metadata?: {
    provider?: string;
  };
};

type DashboardSidebarProps = {
  profile: Profile;
  user: User;
};

export function DashboardSidebar({ profile, user }: DashboardSidebarProps) {
  return (
    <aside className="space-y-6">
      {/* Solo Practice Card */}
      <Card className="border border-white/10 p-6 backdrop-blur">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Practice Solo
          </h2>
          <p className="text-sm text-muted-foreground">
            Practice conversation with your AI coach anytime, anywhere.
          </p>
        </div>
        <Button asChild>
          <Link href="/practice">Start Solo Practice</Link>
        </Button>
      </Card>

      {/* Voice Practice Card */}
      <Card className="border border-primary/30 bg-primary/5 p-6 backdrop-blur">
        <div className="mb-4 space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Try Voice Practice
          </h2>
          <p className="text-sm text-muted-foreground">
            Speak with the AI coach in real time. We'll track pronunciation,
            fluency, and accent so you can review feedback afterward.
          </p>
        </div>
        <Button asChild>
          <Link href="/voice-practice">Start Voice Session</Link>
        </Button>
      </Card>

      {/* Find Partner Card */}
      <Card className="border border-white/10 p-6 backdrop-blur">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Need a fresh conversation?
          </h2>
          <p className="text-sm text-muted-foreground">
            Find a new partner based on shared interests and proficiency level.
          </p>
        </div>
        <Button asChild>
          <Link href="/matches">Find a new partner</Link>
        </Button>
      </Card>

      {/* User Profile Summary */}
      <Card className="border border-white/10 bg-background/60 p-6 backdrop-blur">
        <div className="flex items-start gap-4">
          <ProfileAvatar profile={profile} email={user.email} />
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {profile.display_name || profile.full_name || user.email}
            </h2>
            <p className="text-sm text-muted-foreground">
              {profile.proficiency_level
                ? `Level: ${profile.proficiency_level}`
                : "Level not set"}
            </p>
            <p className="text-sm text-muted-foreground">
              Joined {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Email:</span>{" "}
            {user.email}
          </div>
          <div>
            <span className="font-medium text-foreground">Provider:</span>{" "}
            {user.app_metadata?.provider || "N/A"}
          </div>
          {profile.interests && profile.interests.length > 0 && (
            <div>
              <span className="font-medium text-foreground">Interests:</span>{" "}
              {profile.interests.slice(0, 3).join(", ")}
              {profile.interests.length > 3 ? "…" : ""}
            </div>
          )}
        </div>

        <div className="mt-6">
          <Button asChild variant="outline">
            <Link href="/profile">Settings</Link>
          </Button>
        </div>
      </Card>
    </aside>
  );
}
