/**
 * Dashboard Page
 *
 * Main dashboard for authenticated users.
 * Shows user profile and navigation to different features.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import MatchRequestsPanel, { MatchRequest } from '@/components/chat/MatchRequestsPanel';
import ChatOverview from '@/components/dashboard/ChatOverview';
import type { MatchStatus } from '@/types';

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
    redirect('/login');
  }

  // Check if user completed onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // If no profile exists or onboarding not completed, redirect to onboarding
  if (!profile || !profile.onboarding_completed) {
    redirect('/onboarding');
  }

  const isAdminUser = profile.role === 'school_admin' || profile.role === 'admin';

  const { data: matchRows } = await supabase
    .from('matches')
    .select('*')
    .or(`student1_id.eq.${user.id},student2_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  const allMatches = matchRows ?? [];

  const participantIds = Array.from(
    new Set(
      allMatches.flatMap((match) => [match.student1_id, match.student2_id].filter(Boolean))
    )
  ) as string[];

  const { data: participantProfiles } = participantIds.length
    ? await supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, proficiency_level')
      .in('id', participantIds)
    : { data: [] as ProfileSummary[] };

  const profileMap = new Map<string, ProfileSummary>(
    (participantProfiles ?? []).map((participant) => [participant.id, participant])
  );

  const attachProfiles = <T extends { student1_id: string; student2_id: string | null }>(match: T) => ({
    ...match,
    student1: profileMap.get(match.student1_id) ?? null,
    student2: match.student2_id ? profileMap.get(match.student2_id) ?? null : null,
  });

  const decoratedMatches = allMatches.map(attachProfiles);

  const incomingRequests = decoratedMatches.filter(
    (match) => match.status === 'pending' && match.student2_id === user.id
  ) as MatchRequest[];
  const outgoingRequests = decoratedMatches.filter(
    (match) => match.status === 'pending' && match.student1_id === user.id
  ) as MatchRequest[];

  const pendingRequestCount = incomingRequests.length;

  const findOtherParticipant = (match: typeof decoratedMatches[number]) =>
    match.student1_id === user.id ? match.student2 : match.student1;

  // Fetch unread message counts using RPC
  const { data: unreadCounts } = await supabase
    .rpc('get_unread_message_counts', { user_uuid: user.id });

  const unreadMap = new Map<string, number>(
    (unreadCounts ?? []).map((item: { match_id: string; unread_count: string }) => [item.match_id, Number(item.unread_count)])
  );

  const matchSummaries = decoratedMatches.map((match) => {
    const partner = findOtherParticipant(match);
    return {
      id: match.id,
      status: match.status as MatchStatus,
      updated_at: match.updated_at,
      matched_interests: match.matched_interests ?? [],
      partner: partner
        ? {
          id: partner.id,
          name: partner.display_name || partner.full_name || 'Practice Partner',
          avatar_url: partner.avatar_url,
          proficiency_level: partner.proficiency_level,
        }
        : null,
      unread_count: unreadMap.get(match.id) ?? 0,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-foreground">EduMatch Dashboard</h1>
            <div className="flex flex-wrap items-center justify-end gap-2">
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Card */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Welcome back, {user.user_metadata?.full_name || user.email}!
              </h2>
              <p className="text-muted-foreground mt-1">
                Ready to practice your English conversation skills?
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-6">
            {pendingRequestCount > 0 && (
              <Card className="border-primary/30 bg-primary/10">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-primary">New requests ({pendingRequestCount})</p>
                    <p className="text-sm text-muted-foreground">
                      You have new match invitations waiting for a response.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/chat">See all</Link>
                  </Button>
                </div>
              </Card>
            )}

            <ChatOverview matches={matchSummaries} currentUserId={user.id} />

            <MatchRequestsPanel
              currentUserId={user.id}
              receivedRequests={incomingRequests}
              outgoingRequests={outgoingRequests}
            />
          </section>

          <aside className="space-y-6">
            <Card className="p-6 bg-primary/10 border-primary/20">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">Need a fresh conversation?</h2>
                <p className="text-sm text-muted-foreground">
                  Find a new partner based on shared interests and proficiency level.
                </p>
              </div>
              <Button asChild>
                <Link href="/matches">Find a new partner</Link>
              </Button>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage
                    src={profile.avatar_url || undefined}
                    alt={profile.display_name || profile.full_name || 'Profile'}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xl font-semibold">
                    {(profile.display_name || profile.full_name || user.email || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {profile.display_name || profile.full_name || user.email}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {profile.proficiency_level ? `Level: ${profile.proficiency_level}` : 'Level not set'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Email:</span> {user.email}
                </div>
                <div>
                  <span className="font-medium text-foreground">Provider:</span>{' '}
                  {user.app_metadata?.provider || 'N/A'}
                </div>
                {profile.interests && profile.interests.length > 0 && (
                  <div>
                    <span className="font-medium text-foreground">Interests:</span>{' '}
                    {profile.interests.slice(0, 3).join(', ')}
                    {profile.interests.length > 3 ? '…' : ''}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Button asChild variant="outline">
                  <Link href="/profile">Edit profile</Link>
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}
