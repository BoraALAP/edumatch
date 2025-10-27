/**
 * Dashboard Page
 *
 * Main dashboard for authenticated users.
 * Shows user profile and navigation to different features.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MatchRequest } from "@/components/chat/MatchRequestsPanel";
import type { MatchStatus } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { WelcomeCard } from "./sections/welcome-card";
import { DashboardMainContent } from "./sections/dashboard-main-content";
import { DashboardSidebar } from "./sections/dashboard-sidebar";

type ProfileSummary = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  proficiency_level: string | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user completed onboarding
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  console.log(profile);

  // Debug logging
  if (profileError) {
    console.error("Dashboard - Profile Error:", profileError);
    console.error("Dashboard - User ID:", user.id);

    // If profile doesn't exist at all, redirect to onboarding
    if (profileError.code === "PGRST116") {
      redirect("/onboarding");
    }

    // For other errors, throw to show the error
    throw new Error(`Failed to fetch profile: ${profileError.message}`);
  }

  // If no profile exists, redirect to onboarding
  if (!profile) {
    redirect("/onboarding");
  }

  // Handle school admins without a school
  if (profile.role === "school_admin" && !profile.school_id) {
    redirect("/schools/setup");
  }

  // Handle students who haven't completed onboarding
  if (profile.role !== "school_admin" && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  const isAdminUser =
    profile.role === "school_admin" || profile.role === "admin";

  // Fetch peer matches
  const { data: matchRows } = await supabase
    .from("matches")
    .select("* ")
    .or(`student1_id.eq.${user.id},student2_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  console.log("matchRows", matchRows);

  // Fetch text practice sessions
  const { data: textSessions } = await supabase
    .from("text_practice_sessions")
    .select("*")
    .eq("student_id", user.id)
    .order("updated_at", { ascending: false });

  // Fetch voice practice sessions
  const { data: voiceSessions } = await supabase
    .from("voice_practice_sessions")
    .select("*")
    .eq("student_id", user.id)
    .order("updated_at", { ascending: false });

  const allMatches = matchRows ?? [];

  const participantIds = Array.from(
    new Set(
      allMatches.flatMap((match) =>
        [match.student1_id, match.student2_id].filter(Boolean),
      ),
    ),
  ) as string[];

  const { data: participantProfiles } = participantIds.length
    ? await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, display_name, full_name, avatar_url, proficiency_level",
        )
        .in("id", participantIds)
    : { data: [] as ProfileSummary[] };

  console.log("participantProfiles", participantProfiles);

  const profileMap = new Map<string, ProfileSummary>(
    (participantProfiles ?? []).map((participant) => [
      participant.id,
      participant,
    ]),
  );

  const attachProfiles = <
    T extends { student1_id: string; student2_id: string | null },
  >(
    match: T,
  ) => ({
    ...match,
    student1: profileMap.get(match.student1_id) ?? null,
    student2: match.student2_id
      ? (profileMap.get(match.student2_id) ?? null)
      : null,
  });

  const decoratedMatches = allMatches.map(attachProfiles);

  console.log("decoratedMatches", decoratedMatches);

  const incomingRequests = decoratedMatches.filter(
    (match) => match.status === "pending" && match.student2_id === user.id,
  ) as MatchRequest[];
  const outgoingRequests = decoratedMatches.filter(
    (match) => match.status === "pending" && match.student1_id === user.id,
  ) as MatchRequest[];

  const pendingRequestCount = incomingRequests.length;

  const findOtherParticipant = (match: (typeof decoratedMatches)[number]) =>
    match.student1_id === user.id ? match.student2 : match.student1;

  // Fetch unread message counts using RPC
  const { data: unreadCounts } = await supabase.rpc(
    "get_unread_message_counts",
    { user_uuid: user.id },
  );

  const unreadMap = new Map<string, number>(
    (unreadCounts ?? []).map(
      (item: { match_id: string; unread_count: string }) => [
        item.match_id,
        Number(item.unread_count),
      ],
    ),
  );

  // Convert peer matches to summaries
  const peerMatchSummaries = decoratedMatches
    .filter((match) => match.session_type !== "solo") // Exclude old solo matches
    .map((match) => {
      const partner = findOtherParticipant(match);

      return {
        id: match.id,
        status: match.status as MatchStatus,
        updated_at: match.updated_at,
        matched_interests: match.matched_interests ?? [],
        partner: partner
          ? {
              id: partner.id,
              name:
                partner.display_name || partner.full_name || "Practice Partner",
              avatar_url: partner.avatar_url,
              proficiency_level: partner.proficiency_level,
            }
          : null,
        unread_count: unreadMap.get(match.id) ?? 0,
        session_type: match.session_type,
      };
    });

  // Convert text practice sessions to summaries
  const textSessionSummaries = (textSessions ?? []).map((session) => ({
    id: session.id,
    status: (session.status === "active"
      ? "active"
      : session.status === "completed"
        ? "completed"
        : "cancelled") as MatchStatus,
    updated_at: session.updated_at || session.created_at,
    matched_interests: [session.topic],
    partner: {
      id: "ai-coach-text",
      name: "AI Text Coach",
      avatar_url: null,
      proficiency_level: session.proficiency_level || profile.proficiency_level,
    },
    unread_count: 0,
    session_type: "solo" as const,
  }));

  // Convert voice practice sessions to summaries
  const voiceSessionSummaries = (voiceSessions ?? []).map((session) => ({
    id: session.id,
    status: (session.status === "active"
      ? "active"
      : session.status === "completed"
        ? "completed"
        : "cancelled") as MatchStatus,
    updated_at: session.updated_at || session.created_at,
    matched_interests: [session.topic],
    partner: {
      id: "ai-coach-voice",
      name: "AI Voice Coach",
      avatar_url: null,
      proficiency_level: session.proficiency_level || profile.proficiency_level,
    },
    unread_count: 0,
    session_type: "solo" as const,
  }));

  // Merge peer matches, text sessions, and voice sessions
  const matchSummaries = [
    ...peerMatchSummaries,
    ...textSessionSummaries,
    ...voiceSessionSummaries,
  ].sort((a, b) => {
    const dateA = new Date(a.updated_at || 0).getTime();
    const dateB = new Date(b.updated_at || 0).getTime();
    return dateB - dateA; // Most recent first
  });

  return (
    <div className="min-h-screen text-foreground">
      <PageHeader
        title="EduMatch Dashboard"
        subtitle="Ready to practice your English conversation skills?"
        actions={
          <>
            {isAdminUser && (
              <Button asChild variant="secondary">
                <Link href="/admin">Admin Panel</Link>
              </Button>
            )}
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="outline">
                Sign Out
              </Button>
            </form>
          </>
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pt-30 px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Card */}
        <WelcomeCard
          profile={profile}
          userEmail={user.email}
          userName={user.user_metadata?.full_name}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          {/* Main Content Section */}
          <DashboardMainContent
            currentUserId={user.id}
            pendingRequestCount={pendingRequestCount}
            matchSummaries={matchSummaries}
            receivedRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
          />

          {/* Sidebar */}
          <DashboardSidebar profile={profile} user={user} />
        </div>
      </main>
    </div>
  );
}
