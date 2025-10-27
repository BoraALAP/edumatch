/**
 * Welcome Card Section - Dashboard
 *
 * Purpose: Display user welcome message and quick action buttons
 * Features:
 * - User avatar and greeting
 * - Quick action buttons for voice practice, solo practice, and finding partners
 * - Responsive layout for mobile and desktop
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
  first_name: string | null;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  [key: string]: unknown;
};

type WelcomeCardProps = {
  profile: Profile;
  userEmail: string | undefined;
  userName: string | undefined;
};

export function WelcomeCard({
  profile,
  userEmail,
  userName,
}: WelcomeCardProps) {
  return (
    <Card className="border border-white/10 bg-background/60 p-6 backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <ProfileAvatar profile={profile} email={userEmail} />
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Welcome back, {profile.first_name || userName || userEmail}!
            </h2>
            <p className="text-muted-foreground mt-1">
              Ready to practice your English conversation skills?
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-col gap-2 sm:flex-row sm:ml-4">
          <Button asChild>
            <Link href="/voice-practice">Start Voice Practice</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/practice">Solo Practice</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/matches">Find a Partner</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
