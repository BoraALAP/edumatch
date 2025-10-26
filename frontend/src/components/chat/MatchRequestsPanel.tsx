'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface MatchRequestProfile {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  proficiency_level: string | null;
}

export interface MatchRequest {
  id: string;
  status: string;
  student1_id: string;
  student2_id: string | null;
  matched_interests: string[] | null;
  created_at: string | null;
  student1: MatchRequestProfile | null;
  student2: MatchRequestProfile | null;
}

interface MatchRequestsPanelProps {
  currentUserId: string;
  receivedRequests: MatchRequest[];
  outgoingRequests: MatchRequest[];
}

type MatchResponseAction = 'accept' | 'decline' | 'ignore';

export default function MatchRequestsPanel({
  currentUserId,
  receivedRequests,
  outgoingRequests,
}: MatchRequestsPanelProps) {
  const [incoming, setIncoming] = useState(receivedRequests);
  const [outgoing, setOutgoing] = useState(outgoingRequests);
  const [isProcessing, setIsProcessing] = useState<Record<string, MatchResponseAction | null>>({});
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setIncoming(receivedRequests);
  }, [receivedRequests]);

  useEffect(() => {
    setOutgoing(outgoingRequests);
  }, [outgoingRequests]);

  if (incoming.length === 0 && outgoing.length === 0) {
    return null;
  }

  console.log(outgoingRequests);

  const formatName = (profile: MatchRequestProfile | null) =>
    profile?.display_name || profile?.full_name || 'Anonymous user';

  const handleRespond = async (matchId: string, action: MatchResponseAction) => {
    const statusMap: Record<MatchResponseAction, string> = {
      accept: 'active',
      decline: 'declined',
      ignore: 'ignored',
    };

    setIsProcessing((prev) => ({ ...prev, [matchId]: action }));

    try {
      const { error } = await supabase
        .from('matches')
        .update({
          status: statusMap[action],
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchId)
        .eq('student2_id', currentUserId)
        .eq('status', 'pending');

      if (error) {
        console.error('Failed to update match status', error);
        alert('Something went wrong while responding to the match request.');
        return;
      }

      setIncoming((prev) => prev.filter((match) => match.id !== matchId));

      if (action === 'accept') {
        router.push(`/chat/${matchId}`);
        return;
      }

      router.refresh();
    } catch (error) {
      console.error('Unexpected error responding to match', error);
      alert('Failed to update match. Please try again.');
    } finally {
      setIsProcessing((prev) => ({ ...prev, [matchId]: null }));
    }
  };

  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <Card className="p-5 border-primary/30 bg-primary/10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">New Match Requests</h2>
            <p className="text-sm text-muted-foreground">
              Accept to start chatting, or decline/ignore if it is not a good fit.
            </p>
          </div>
          <div className="space-y-4">
            {incoming.map((match) => {
              const requester = match.student1;

              return (
                <div
                  key={match.id}
                  className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <Avatar className="hidden h-12 w-12 sm:flex">
                      <AvatarImage
                        src={requester?.avatar_url || undefined}
                        alt={formatName(requester)}
                      />
                      <AvatarFallback className="text-lg font-bold">
                        {formatName(requester)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{formatName(requester)}</p>
                        {requester?.proficiency_level && (
                          <Badge variant="secondary">{requester.proficiency_level}</Badge>
                        )}
                      </div>
                      {match.matched_interests && match.matched_interests.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Shared interests: {match.matched_interests.join(', ')}
                        </p>
                      )}
                      {match.created_at && (
                        <p className="text-xs text-muted-foreground">
                          Requested {new Date(match.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRespond(match.id, 'accept')}
                      disabled={Boolean(isProcessing[match.id])}
                    >
                      Yes, start chat
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRespond(match.id, 'decline')}
                      disabled={Boolean(isProcessing[match.id])}
                    >
                      No thanks
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRespond(match.id, 'ignore')}
                      disabled={Boolean(isProcessing[match.id])}
                    >
                      Ignore
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {outgoing.length > 0 && (
        <Card className="p-5 border border-dashed border-border bg-card">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-foreground">Pending Invitations</h2>
            <p className="text-sm text-muted-foreground">
              These partners still need to accept before a chat opens.
            </p>
          </div>
          <ul className="space-y-3">
            {outgoing.map((match) => {
              console.log(match);

              const partner = match.student2;

              return (
                <li
                  key={match.id}
                  className="flex flex-col gap-1 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{formatName(partner)}</p>
                    {match.matched_interests && match.matched_interests.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Shared interests: {match.matched_interests.join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">Waiting for response</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
