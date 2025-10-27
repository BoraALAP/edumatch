/**
 * Chat Interface Component
 *
 * Real-time 2-person chat with AI grammar assistance.
 * Uses Supabase Realtime for live message updates.
 * Sends messages to AI moderation API for grammar checking.
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import type { Profile, Message, Match, CurriculumTopic } from "@/types";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInputProvider,
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Loader } from "@/components/ai-elements/loader";
import { Loader2Icon, MessageSquareIcon, SendIcon } from "lucide-react";
import { toast } from "sonner";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessage } from "@/components/chat/ChatMessage";
import {
  createMessageKey,
  isAIMessage,
  formatTimestamp,
} from "@/lib/chat/utils";
import type { ChatMessageUI } from "@/lib/chat/types";

type MatchWithDetails = Match & {
  curriculum_topic: CurriculumTopic | null;
};

interface ChatInterfaceProps {
  matchId: string;
  currentUserId: string;
  currentUserProfile: Profile | null;
  otherUser: Profile;
  match: MatchWithDetails;
}

export default function ChatInterface({
  matchId,
  currentUserId,
  currentUserProfile,
  otherUser,
  match,
}: ChatInterfaceProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });
  }, [messages]);

  const conversationItems: ChatMessageUI[] = useMemo(
    () =>
      sortedMessages.map((message): ChatMessageUI => {
        const isCurrentUser = message.sender_id === currentUserId;
        const aiMessage = isAIMessage(message);
        const role: "assistant" | "user" = isCurrentUser ? "user" : "assistant";

        const avatarSrc = aiMessage
          ? "/ai-coach.svg"
          : isCurrentUser
            ? (currentUserProfile?.avatar_url ?? "")
            : (otherUser.avatar_url ?? "");

        const avatarName = aiMessage
          ? "AI"
          : isCurrentUser
            ? currentUserProfile?.display_name ||
              currentUserProfile?.full_name ||
              "You"
            : otherUser.display_name || otherUser.full_name || "Partner";

        const isCorrection =
          aiMessage &&
          (message.sender_type === "ai_correction" ||
            message.message_type === "correction");

        return {
          key: createMessageKey(message),
          role,
          content: message.content ?? "",
          timestamp: formatTimestamp(message.created_at),
          avatarSrc,
          avatarName,
          isCurrentUser,
          isAI: aiMessage,
          isCorrection,
          isCorrect: false, // TODO: Compute from grammar_issues when backend adds this field
          grammarIssues: (message.grammar_issues as any) || undefined,
          severity: undefined, // TODO: Parse from grammar_issues when backend adds this field
        };
      }),
    [sortedMessages, currentUserId, currentUserProfile, otherUser],
  );

  const visibleMessageCount = conversationItems.length;
  const messageLabel = visibleMessageCount === 1 ? "message" : "messages";

  const markMessagesAsRead = useCallback(async () => {
    try {
      await supabase.rpc("mark_messages_as_read", {
        p_match_id: matchId,
        p_user_id: currentUserId,
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [supabase, matchId, currentUserId]);

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) {
        setMessages(data);
        // Mark messages as read
        await markMessagesAsRead();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, matchId, markMessagesAsRead]);

  // Fetch initial messages
  useEffect(() => {
    void fetchMessages();
  }, [fetchMessages]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message]);

          if ((payload.new as Message).sender_id !== currentUserId) {
            void markMessagesAsRead();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, matchId, currentUserId, markMessagesAsRead]);

  const handlePromptSubmit = async ({ text }: PromptInputMessage) => {
    const trimmedMessage = text?.trim();

    if (!trimmedMessage) {
      throw new Error("EMPTY_MESSAGE");
    }

    if (isSending) {
      throw new Error("SEND_IN_PROGRESS");
    }

    setIsSending(true);

    try {
      const { error } = await supabase.from("messages").insert({
        match_id: matchId,
        sender_id: currentUserId,
        sender_type: "user",
        content: trimmedMessage,
        message_type: "text",
      });

      if (error) throw error;

      // Call AI moderation - consume stream for instant corrections
      fetch("/api/chat/ai-moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          message: trimmedMessage,
          topic: match.curriculum_topic?.title || "General Conversation",
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("AI moderation failed");
          }

          // Consume the stream to trigger immediate processing
          const reader = response.body?.getReader();
          if (reader) {
            while (true) {
              const { done } = await reader.read();
              if (done) break;
            }
          }
        })
        .catch((err) => console.error("AI moderation error:", err));
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message", {
        description: "Please try again.",
      });
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <ChatHeader
        title={otherUser.display_name || otherUser.full_name || "Partner"}
        backHref="/dashboard"
        avatar={{
          src: otherUser.avatar_url,
          name: otherUser.display_name || otherUser.full_name || "Partner",
        }}
        badges={
          <>
            {match.curriculum_topic?.title && (
              <span className="text-xs text-muted-foreground truncate">
                Topic:{" "}
                <span className="text-foreground">
                  {match.curriculum_topic.title}
                </span>
              </span>
            )}
            {otherUser.proficiency_level && (
              <Badge variant="secondary" className="text-[11px] shrink-0">
                Level {otherUser.proficiency_level}
              </Badge>
            )}
            {match.created_at && (
              <span className="hidden md:inline truncate text-xs text-muted-foreground">
                Matched {new Date(match.created_at).toLocaleDateString()}
              </span>
            )}
          </>
        }
        actions={
          <>
            <Badge variant="secondary" className="text-xs">
              {visibleMessageCount} {messageLabel}
            </Badge>
            <Badge variant="outline" className="hidden sm:inline-flex text-xs">
              AI Assisted
            </Badge>
          </>
        }
      />

      <Conversation className="relative flex-1 bg-muted/40">
        <ConversationContent className="mx-auto w-full max-w-4xl">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
              <Loader size={18} /> Loading messages…
            </div>
          ) : conversationItems.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquareIcon className="size-6" />}
              title="Start the conversation"
              description="Say hello and introduce yourself. The AI coach will keep grammar on track while you chat."
            />
          ) : (
            conversationItems.map((item) => (
              <ChatMessage key={item.key} message={item} />
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-card p-4">
        <div className="mx-auto w-full max-w-4xl space-y-2">
          <PromptInputProvider>
            <PromptInput onSubmit={handlePromptSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  disabled={isSending}
                  placeholder="Type your message..."
                  rows={2}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <span className="text-xs text-muted-foreground">
                  Press Enter to send • Shift+Enter for new line
                </span>
                <PeerPromptSubmitButton isSending={isSending} />
              </PromptInputFooter>
            </PromptInput>
          </PromptInputProvider>
          <p className="text-xs text-muted-foreground">
            💡 The AI coach will provide gentle corrections and nudge the
            conversation when needed.
          </p>
        </div>
      </div>
    </div>
  );
}

function PeerPromptSubmitButton({ isSending }: { isSending: boolean }) {
  const { textInput } = usePromptInputController();
  const isDisabled = isSending || !textInput.value.trim();

  return (
    <PromptInputSubmit disabled={isDisabled}>
      {isSending ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <SendIcon className="size-4" />
      )}
    </PromptInputSubmit>
  );
}
