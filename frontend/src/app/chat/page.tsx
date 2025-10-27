/**
 * Chat List Page
 *
 * Shows all active matches/conversations for the user.
 * Server component that fetches user matches from Supabase.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MatchRequestsPanel, {
  MatchRequest,
} from "@/components/chat/MatchRequestsPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { ChatListSection } from "./sections/chat-list-section";

export const dynamic = "force-dynamic";

type ProfileSummary = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  proficiency_level: string | null;
};

export default async function ChatListPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: activeMatchesData },
    { data: receivedRequestsData },
    { data: outgoingRequestsData },
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .eq("status", "active")
      .or(`student1_id.eq.${user.id},student2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false }),
    supabase
      .from("matches")
      .select("*")
      .eq("status", "pending")
      .eq("student2_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("matches")
      .select("*")
      .eq("status", "pending")
      .eq("student1_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const allMatches = [
    ...(activeMatchesData ?? []),
    ...(receivedRequestsData ?? []),
    ...(outgoingRequestsData ?? []),
  ];

  const profileIds = Array.from(
    new Set(
      allMatches.flatMap((match) =>
        [match.student1_id, match.student2_id].filter(Boolean),
      ),
    ),
  ) as string[];

  const { data: profileRows } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, full_name, avatar_url, proficiency_level")
        .in("id", profileIds)
    : { data: [] as ProfileSummary[] };

  const profileMap = new Map<string, ProfileSummary>(
    (profileRows ?? []).map((profile) => [profile.id, profile]),
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

  const activeMatches = (activeMatchesData ?? []).map(attachProfiles);
  const receivedRequests = (receivedRequestsData ?? []).map(
    attachProfiles,
  ) as MatchRequest[];
  const outgoingRequests = (outgoingRequestsData ?? []).map(
    attachProfiles,
  ) as MatchRequest[];

  return (
    <div className="min-h-screen ">
      <PageHeader
        title="My Chats"
        subtitle="View and manage your conversations"
        backHref="/dashboard"
      />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto pt-30 px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <MatchRequestsPanel
            currentUserId={user.id}
            receivedRequests={receivedRequests}
            outgoingRequests={outgoingRequests}
          />

          <ChatListSection
            activeMatches={activeMatches}
            currentUserId={user.id}
          />
        </div>
      </main>
    </div>
  );
}
