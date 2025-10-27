/**
 * Dashboard Main Content Section
 *
 * Purpose: Display pending requests banner, chat overview, and match requests
 * Features:
 * - Pending requests notification banner
 * - Chat overview with all conversations
 * - Match requests panel (incoming and outgoing)
 *
 * Usage: /app/dashboard/page.tsx
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import ChatOverview from "@/components/dashboard/ChatOverview";
import MatchRequestsPanel, {
  MatchRequest,
} from "@/components/chat/MatchRequestsPanel";
import type { MatchStatus } from "@/types";

type MatchSummary = {
  id: string;
  status: MatchStatus;
  updated_at: string;
  matched_interests: string[];
  partner: {
    id: string;
    name: string;
    avatar_url: string | null;
    proficiency_level: string | null;
  } | null;
  unread_count: number;
  session_type: "solo" | "peer" | string;
};

type DashboardMainContentProps = {
  currentUserId: string;
  pendingRequestCount: number;
  matchSummaries: MatchSummary[];
  receivedRequests: MatchRequest[];
  outgoingRequests: MatchRequest[];
};

export function DashboardMainContent({
  currentUserId,
  pendingRequestCount,
  matchSummaries,
  receivedRequests,
  outgoingRequests,
}: DashboardMainContentProps) {
  return (
    <section className="space-y-6">
      {/* Pending Requests Banner */}
      {pendingRequestCount > 0 && (
        <Card className="border border-primary/40 bg-primary/15 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4">
            <div>
              <p className="text-sm font-semibold text-primary">
                New requests ({pendingRequestCount})
              </p>
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

      {/* Chat Overview */}
      <ChatOverview matches={matchSummaries} currentUserId={currentUserId} />

      {/* Match Requests Panel */}
      <MatchRequestsPanel
        currentUserId={currentUserId}
        receivedRequests={receivedRequests}
        outgoingRequests={outgoingRequests}
      />
    </section>
  );
}
