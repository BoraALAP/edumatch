/**
 * Chat List Page
 *
 * Shows all active matches/conversations for the user.
 * Server component that fetches user matches from Supabase.
 */

import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import MatchRequestsPanel, { MatchRequest } from '@/components/chat/MatchRequestsPanel';

export const dynamic = 'force-dynamic';

type ProfileSummary = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  proficiency_level: string | null;
};

export default async function ChatListPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: activeMatchesData }, { data: receivedRequestsData }, { data: outgoingRequestsData }] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .eq('status', 'active')
      .or(`student1_id.eq.${user.id},student2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false }),
    supabase
      .from('matches')
      .select('*')
      .eq('status', 'pending')
      .eq('student2_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('matches')
      .select('*')
      .eq('status', 'pending')
      .eq('student1_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const allMatches = [
    ...(activeMatchesData ?? []),
    ...(receivedRequestsData ?? []),
    ...(outgoingRequestsData ?? []),
  ];

  const profileIds = Array.from(
    new Set(
      allMatches.flatMap((match) => [match.student1_id, match.student2_id].filter(Boolean))
    )
  ) as string[];

  const { data: profileRows } = profileIds.length
    ? await supabase
      .from('profiles')
      .select('id, display_name, full_name, avatar_url, proficiency_level')
      .in('id', profileIds)
    : { data: [] as ProfileSummary[] };

  const profileMap = new Map<string, ProfileSummary>(
    (profileRows ?? []).map((profile) => [profile.id, profile])
  );

  const attachProfiles = <T extends { student1_id: string; student2_id: string | null }>(match: T) => ({
    ...match,
    student1: profileMap.get(match.student1_id) ?? null,
    student2: match.student2_id ? profileMap.get(match.student2_id) ?? null : null,
  });

  const activeMatches = (activeMatchesData ?? []).map(attachProfiles);
  const receivedRequests = (receivedRequestsData ?? []).map(attachProfiles) as MatchRequest[];
  const outgoingRequests = (outgoingRequestsData ?? []).map(attachProfiles) as MatchRequest[];

  return (
    <div className="min-h-screen ">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-foreground">My Chats</h1>
            <a href="/dashboard" className="text-primary hover:text-primary/90">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <MatchRequestsPanel
            currentUserId={user.id}
            receivedRequests={receivedRequests}
            outgoingRequests={outgoingRequests}
          />

          {activeMatches.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">No active chats yet</h2>
              <p className="text-muted-foreground mb-6">
                Accept a match request above or find new partners to start chatting.
              </p>
              <Link
                href="/matches"
                className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Find Practice Partners
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeMatches.map((match) => {
                // Determine the other user in the conversation
                const otherUser =
                  match.student1_id === user.id ? match.student2 : match.student1;

                if (!otherUser) return null;

                return (
                  <Link key={match.id} href={`/chat/${match.id}`}>
                    <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-2xl font-bold flex-shrink-0">
                          {otherUser.avatar_url ? (
                            <Image
                              src={otherUser.avatar_url}
                              alt={otherUser.display_name || 'Profile'}
                              width={64}
                              height={64}
                              className="w-full h-full rounded-full object-cover"
                              unoptimized
                            />
                          ) : (
                            (otherUser.display_name || otherUser.full_name || 'U')[0].toUpperCase()
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-foreground truncate">
                              {otherUser.display_name || otherUser.full_name}
                            </h3>
                            <Badge variant="secondary" className="flex-shrink-0">
                              {otherUser.proficiency_level}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1 text-primary">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              Active
                            </span>
                            {match.matched_interests && match.matched_interests.length > 0 && (
                              <span>
                                {match.matched_interests.length} shared interest{match.matched_interests.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow */}
                        <svg
                          className="w-6 h-6 text-muted-foreground/80 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
