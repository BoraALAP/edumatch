/**
 * Chat Interface Component
 *
 * Real-time 2-person chat with AI grammar assistance.
 * Uses Supabase Realtime for live message updates.
 * Sends messages to AI moderation API for grammar checking.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import type { Profile, Message, Match, CurriculumTopic } from '@/types';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message as ChatMessageItem, MessageContent, MessageAvatar } from '@/components/ai-elements/message';
import {
  PromptInputProvider,
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
  usePromptInputController,
} from '@/components/ai-elements/prompt-input';
import { Loader } from '@/components/ai-elements/loader';
import { Response } from '@/components/ai-elements/response';
import { cn } from '@/lib/utils';
import { Loader2Icon, MessageSquareIcon, SendIcon } from 'lucide-react';

const formatTimestamp = (value?: string | Date | null): string => {
  if (!value) {
    return 'Just now';
  }

  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const createMessageKey = (message: Message): string => {
  if (message.id !== undefined && message.id !== null) {
    return String(message.id);
  }

  const timestamp = message.created_at ?? 'na';
  return `${message.sender_type ?? 'user'}-${message.content}-${timestamp}`;
};

const isAIMessage = (message: Message): boolean => {
  return (message.sender_type ?? '').startsWith('ai');
};

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

  const conversationItems = useMemo(
    () =>
      sortedMessages.map((message) => {
        const isCurrentUser = message.sender_id === currentUserId;
        const aiMessage = isAIMessage(message);
        const role: 'assistant' | 'user' = isCurrentUser ? 'user' : 'assistant';

        const avatarSrc = aiMessage
          ? '/ai-coach.svg'
          : isCurrentUser
          ? currentUserProfile?.avatar_url ?? ''
          : otherUser.avatar_url ?? '';

        const avatarName = aiMessage
          ? 'AI'
          : isCurrentUser
          ? currentUserProfile?.display_name || currentUserProfile?.full_name || 'You'
          : otherUser.display_name || otherUser.full_name || 'Partner';

        const isCorrection =
          aiMessage &&
          (message.sender_type === 'ai_correction' || message.message_type === 'correction');

        return {
          key: createMessageKey(message),
          role,
          content: message.content ?? '',
          timestamp: formatTimestamp(message.created_at),
          avatarSrc,
          avatarName,
          isCurrentUser,
          isAI: aiMessage,
          isCorrection,
        };
      }),
    [sortedMessages, currentUserId, currentUserProfile, otherUser]
  );

  const visibleMessageCount = conversationItems.length;
  const messageLabel = visibleMessageCount === 1 ? 'message' : 'messages';

  // Fetch initial messages
  useEffect(() => {
    fetchMessages();
  }, [matchId]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message]);

          if ((payload.new as Message).sender_id !== currentUserId) {
            void markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setMessages(data);
        // Mark messages as read
        await markMessagesAsRead();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      // Use RPC function to mark all unread messages as read
      await supabase.rpc('mark_messages_as_read', {
        p_match_id: matchId,
        p_user_id: currentUserId,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handlePromptSubmit = async ({ text }: PromptInputMessage) => {
    const trimmedMessage = text?.trim();

    if (!trimmedMessage) {
      throw new Error('EMPTY_MESSAGE');
    }

    if (isSending) {
      throw new Error('SEND_IN_PROGRESS');
    }

    setIsSending(true);

    try {
      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: currentUserId,
        sender_type: 'user',
        content: trimmedMessage,
        message_type: 'text',
      });

      if (error) throw error;

      void fetch('/api/chat/ai-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          message: trimmedMessage,
          topic: match.curriculum_topic?.title || 'General Conversation',
        }),
      }).catch((err) => console.error('AI moderation error:', err));
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-primary hover:text-primary/90">
              ←
            </Link>
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage
                  src={otherUser.avatar_url || undefined}
                  alt={otherUser.display_name || otherUser.full_name || 'Partner'}
                />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-lg font-bold">
                  {(otherUser.display_name || otherUser.full_name || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-foreground">
                  {otherUser.display_name || otherUser.full_name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {match.curriculum_topic?.title && (
                    <span>
                      Topic: <span className="text-foreground">{match.curriculum_topic.title}</span>
                    </span>
                  )}
                  {otherUser.proficiency_level && (
                    <Badge variant="secondary" className="text-[11px]">
                      Level {otherUser.proficiency_level}
                    </Badge>
                  )}
                  {match.created_at && (
                    <span>
                      Matched {new Date(match.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {visibleMessageCount} {messageLabel}
            </Badge>
            <Badge variant="outline" className="hidden sm:inline-flex text-xs">
              AI Assisted
            </Badge>
          </div>
        </div>
      </header>

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
              <ChatMessageItem from={item.role} key={item.key}>
                <div className="flex max-w-3xl flex-col gap-1">
                  <MessageContent
                    className={cn(
                      'w-fit max-w-xl whitespace-pre-wrap break-words leading-relaxed text-sm',
                      item.role === 'assistant' ? 'self-start' : 'self-end',
                      item.isAI && item.isCorrection
                        ? 'group-[.is-assistant]:bg-amber-100 group-[.is-assistant]:text-amber-900 dark:group-[.is-assistant]:bg-amber-200/10 dark:group-[.is-assistant]:text-amber-100'
                        : item.isAI
                        ? 'group-[.is-assistant]:bg-secondary/80'
                        : ''
                    )}
                  >
                    {item.isAI ? (
                      <>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          {item.isCorrection ? 'Grammar Tip' : 'AI Assistant'}
                        </p>
                        <Response>{item.content}</Response>
                      </>
                    ) : (
                      <p>{item.content}</p>
                    )}
                  </MessageContent>
                  <span
                    className={cn(
                      'px-2 text-xs text-muted-foreground',
                      item.role === 'assistant' ? 'self-start' : 'self-end'
                    )}
                  >
                    {item.timestamp}
                  </span>
                </div>
                <MessageAvatar
                  className={cn(
                    item.isAI
                      ? 'bg-secondary text-secondary-foreground'
                      : 'bg-card text-foreground',
                    item.isAI && item.isCorrection
                      ? 'ring-amber-200 dark:ring-amber-300/40'
                      : item.isAI
                      ? 'ring-primary/40'
                      : 'ring-border'
                  )}
                  name={item.isAI ? 'AI' : item.avatarName}
                  src={item.avatarSrc}
                />
              </ChatMessageItem>
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
            💡 The AI coach will provide gentle corrections and nudge the conversation when needed.
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
