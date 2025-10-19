'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import type { MatchStatus } from '@/types';

type PartnerSummary = {
  id: string;
  name: string;
  avatar_url: string | null;
  proficiency_level: string | null;
};

export type ChatSummary = {
  id: string;
  status: MatchStatus;
  updated_at: string | null;
  matched_interests: string[];
  partner: PartnerSummary | null;
  unread_count?: number;
};

interface ChatOverviewProps {
  matches: ChatSummary[];
  currentUserId: string;
}

const statusCategories = {
  active: ['active'] as MatchStatus[],
  archived: ['ended', 'cancelled'] as MatchStatus[],
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : '—';

const getInitials = (name: string) => name.slice(0, 1).toUpperCase();

export default function ChatOverview({ matches, currentUserId }: ChatOverviewProps) {
  const supabase = createClient();
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(
    new Map(matches.map(m => [m.id, m.unread_count || 0]))
  );

  // Subscribe to new messages for real-time unread count updates
  useEffect(() => {
    const matchIds = matches.map(m => m.id);

    // Subscribe to message inserts for all user's matches
    const channel = supabase
      .channel('dashboard-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${currentUserId}`,
        },
        async (payload) => {
          const newMessage = payload.new as { match_id: string; sender_type: string };

          // Only update if it's a user message in one of our matches
          if (newMessage.sender_type === 'user' && matchIds.includes(newMessage.match_id)) {
            // Fetch updated unread counts
            const { data: counts } = await supabase.rpc('get_unread_message_counts', {
              user_uuid: currentUserId,
            });

            if (counts) {
              const newUnreadMap = new Map<string, number>(
                (counts as Array<{ match_id: string; unread_count: string | number }>).map((item) => [
                  item.match_id,
                  Number(item.unread_count),
                ])
              );
              setUnreadCounts(newUnreadMap);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matches, currentUserId, supabase]);

  const { activeMatches, archivedMatches } = useMemo(() => {
    const active = matches.filter((match) => statusCategories.active.includes(match.status));
    const archived = matches.filter((match) => statusCategories.archived.includes(match.status));
    return { activeMatches: active, archivedMatches: archived };
  }, [matches]);

  const currentList = view === 'active' ? activeMatches : archivedMatches;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Chats</h2>
          <p className="text-sm text-muted-foreground">
            Switch between your current and archived conversations.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-border bg-muted p-1">
          {(
            [
              { key: 'active' as const, label: `Active (${activeMatches.length})` },
              { key: 'archived' as const, label: `Archived (${archivedMatches.length})` },
            ]
          ).map((option) => {
            const isSelected = view === option.key;
            return (
              <button
                key={option.key}
                type="button"
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isSelected ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setView(option.key)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {currentList.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <div className="text-4xl mb-3">{view === 'active' ? '💬' : '📁'}</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {view === 'active' ? 'No active chats yet' : 'No archived chats yet'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {view === 'active'
              ? 'Accept a pending request or find a new partner to start chatting.'
              : 'Archived conversations will appear here after they end.'}
          </p>
          {view === 'active' ? (
            <Button asChild>
              <Link href="/matches">Find a new partner</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/chat">Go to chats</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {currentList.map((match) => {
            const unreadCount = unreadCounts.get(match.id) || 0;
            const hasUnread = unreadCount > 0;
            return (
              <li key={match.id}>
                <Link
                  href={`/chat/${match.id}`}
                  className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted ${
                    hasUnread ? 'bg-primary/10' : ''
                  }`}
                >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-lg font-semibold">
                  {match.partner?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={match.partner.avatar_url}
                      alt={match.partner.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(match.partner?.name || 'U')
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {match.partner?.name || 'Conversation'}
                    </p>
                    {match.partner?.proficiency_level && (
                      <Badge variant="secondary" className="text-xs">
                        {match.partner.proficiency_level}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>Updated {formatDate(match.updated_at)}</span>
                    {match.matched_interests.length > 0 && (
                      <span>
                        {match.matched_interests.length} shared interest
                        {match.matched_interests.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground capitalize">
                  {match.status}
                </div>
              </Link>
            </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
