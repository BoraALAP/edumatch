'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { MessageSquare, Archive } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { MatchStatus } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
  session_type?: string;
};

interface ChatOverviewProps {
  matches: ChatSummary[];
  currentUserId: string;
}

const statusCategories = {
  active: ['active', 'pending'] as MatchStatus[],
  archived: ['completed', 'cancelled'] as MatchStatus[],
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleString() : '—';

const getInitials = (name: string) => name.slice(0, 1).toUpperCase();

export default function ChatOverview({ matches, currentUserId }: ChatOverviewProps) {
  const supabase = createClient();
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

  const renderChatList = (chatList: ChatSummary[], type: 'active' | 'archived') => {
    if (chatList.length === 0) {
      return (
        <Empty className="border-0 px-6 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {type === 'active' ? <MessageSquare /> : <Archive />}
            </EmptyMedia>
            <EmptyTitle>
              {type === 'active' ? 'No active chats yet' : 'No archived chats yet'}
            </EmptyTitle>
            <EmptyDescription>
              {type === 'active'
                ? 'Accept a pending request or find a new partner to start chatting.'
                : 'Archived conversations will appear here after they end.'}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {type === 'active' ? (
              <Button asChild>
                <Link href="/matches">Find a new partner</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/chat">Go to chats</Link>
              </Button>
            )}
          </EmptyContent>
        </Empty>
      );
    }

    return (
      <ul className="divide-y divide-border">
        {chatList.map((match) => {
          const unreadCount = unreadCounts.get(match.id) || 0;
          const hasUnread = unreadCount > 0;
        return (
          <li key={match.id}>
            {(() => {
              const isSoloSession = match.session_type === 'solo';
              const isVoicePractice = isSoloSession && match.partner?.id === 'ai-coach-voice';
              const isTextPractice = isSoloSession && match.partner?.id === 'ai-coach-text';
              const destination = isSoloSession
                ? isVoicePractice
                  ? `/voice-practice/${match.id}`
                  : `/practice/${match.id}`
                : `/chat/${match.id}`;
              const topicTitle = match.matched_interests[0] || match.partner?.name || 'Conversation';
              const soloBadgeLabel = isVoicePractice
                ? 'Voice Practice'
                : isTextPractice
                  ? 'Text Practice'
                  : 'Solo Practice';
              return (
              <Link
                href={destination}
                className={`flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted ${hasUnread ? 'bg-primary/10' : ''
                  }`}
              >
                <Avatar className="size-12">
                  {isSoloSession ? (
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                      🤖
                    </AvatarFallback>
                  ) : match.partner?.avatar_url ? (
                    <>
                      <AvatarImage
                        src={match.partner.avatar_url}
                        alt={match.partner.name ?? 'Practice Partner'}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-lg font-semibold">
                        {getInitials(match.partner?.name || 'U')}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="text-lg font-semibold">
                      {getInitials(match.partner?.name || 'U')}
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {topicTitle}
                    </p>
                    {isSoloSession && (
                      <Badge variant="default" className="text-xs">
                        {soloBadgeLabel}
                      </Badge>
                    )}
                    {match.partner?.proficiency_level && (
                      <Badge variant="secondary" className="text-xs">
                        {match.partner.proficiency_level}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    {!isSoloSession && match.partner?.name && (
                      <span className="truncate">{match.partner.name}</span>
                    )}
                    <span>Updated {formatDate(match.updated_at)}</span>
                    {match.matched_interests.length > 1 && (
                      <span>
                        +{match.matched_interests.length - 1} more topics
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted-foreground capitalize">
                  {match.status}
                </div>
              </Link>
              );
            })()}
          </li>
        );
      })}
      </ul>
    );
  };

  return (
    <Card className="overflow-hidden">
      <Tabs defaultValue="active" className="w-full">
        <div className="flex flex-col gap-4 border-b border-border px-6 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Chats</h2>
            <p className="text-sm text-muted-foreground">
              Switch between your current and archived conversations.
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="active">
              Active ({activeMatches.length})
            </TabsTrigger>
            <TabsTrigger value="archived">
              Archived ({archivedMatches.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="m-0">
          {renderChatList(activeMatches, 'active')}
        </TabsContent>

        <TabsContent value="archived" className="m-0">
          {renderChatList(archivedMatches, 'archived')}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
