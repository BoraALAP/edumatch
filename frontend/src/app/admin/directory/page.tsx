/**
 * Directory Page - School Admin
 *
 * Consolidated view for managing school members and invitations.
 * Features:
 * - View all students and teachers
 * - Invite new members
 * - Track seat allocation
 * - Manage pending invitations
 * - Filter by role and seat type
 */

import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import DirectoryClient from "./sections/directory-client";

export default async function DirectoryPage() {
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

  if (!profile.school_id) {
    return (
      <Card className="border-dashed p-8 text-center text-muted-foreground">
        <p>Assign a school to manage your directory.</p>
      </Card>
    );
  }

  // Get school information for seat tracking
  const { data: school } = await supabase
    .from("schools")
    .select("name, seats_total, seats_regular_used, seats_graduate_used")
    .eq("id", profile.school_id)
    .single();

  // Get all members
  const { data: members } = await supabase
    .from("profiles")
    .select(
      "id, full_name, display_name, role, seat_type, onboarding_completed, last_active_at, created_at, proficiency_level",
    )
    .eq("school_id", profile.school_id)
    .order("role", { ascending: true })
    .order("full_name", { ascending: true, nullsFirst: false });

  // Get invitations
  const { data: invitations } = await supabase
    .from("student_invitations")
    .select(
      "id, email, status, role, created_at, expires_at, invited_by, accepted_at",
    )
    .eq("school_id", profile.school_id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <DirectoryClient
        school={school || undefined}
        members={members || []}
        invitations={invitations || []}
        schoolId={profile.school_id}
      />
    </div>
  );
}
