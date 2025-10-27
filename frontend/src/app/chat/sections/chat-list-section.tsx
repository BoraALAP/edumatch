/**
 * Chat List Section
 *
 * Purpose: Display list of active conversations
 * Features:
 * - Shows active chat cards with user info
 * - Empty state when no chats exist
 * - Clickable cards that navigate to chat detail
 *
 * Usage: /app/chat/page.tsx
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Profile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  proficiency_level: string | null;
};

type Match = {
  id: string;
  student1_id: string;
  student2_id: string | null;
  matched_interests: string[] | null;
  student1: Profile | null;
  student2: Profile | null;
};

type ChatListSectionProps = {
  activeMatches: Match[];
  currentUserId: string;
};

export function ChatListSection({
  activeMatches,
  currentUserId,
}: ChatListSectionProps) {
  if (activeMatches.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-6xl mb-4">💬</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          No active chats yet
        </h2>
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
    );
  }

  return (
    <div className="space-y-4">
      {activeMatches.map((match) => {
        // Determine the other user in the conversation
        const otherUser =
          match.student1_id === currentUserId ? match.student2 : match.student1;

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
                      alt={otherUser.display_name || "Profile"}
                      width={64}
                      height={64}
                      className="w-full h-full rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    (otherUser.display_name ||
                      otherUser.full_name ||
                      "U")[0].toUpperCase()
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
                    {match.matched_interests &&
                      match.matched_interests.length > 0 && (
                        <span>
                          {match.matched_interests.length} shared interest
                          {match.matched_interests.length > 1 ? "s" : ""}
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
  );
}
