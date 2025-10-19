/**
 * Chat Interface Component
 *
 * Real-time 2-person chat with AI grammar assistance.
 * Uses Supabase Realtime for live message updates.
 * Sends messages to AI moderation API for grammar checking.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import type { Profile, Message, Match, CurriculumTopic } from '@/types';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom immediately on initial load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        scrollToBottom('auto');
      }, 100);
    }
  }, [isLoading]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

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

  const submitMessage = async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || isSending) return;

    setIsSending(true);

    try {
      // Send message to database
      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: currentUserId,
        sender_type: 'user',
        content: trimmedMessage,
        message_type: 'text',
      });

      if (error) throw error;

      // Clear input
      setNewMessage('');

      // Send to AI moderation (async, don't wait)
      fetch('/api/chat/ai-moderate', {
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
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitMessage();
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-primary hover:text-primary/90">
              ←
            </Link>
            <Avatar className="w-10 h-10">
              <AvatarImage
                src={otherUser.avatar_url || undefined}
                alt={otherUser.display_name || otherUser.full_name || 'User'}
              />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-lg font-bold">
                {(otherUser.display_name || otherUser.full_name || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-foreground">
                {otherUser.display_name || otherUser.full_name}
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {otherUser.proficiency_level}
                </Badge>
                <span className="text-xs text-primary flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Active
                </span>
              </div>
            </div>
          </div>

          {match.curriculum_topic && (
            <Badge variant="outline" className="hidden sm:flex">
              Topic: {match.curriculum_topic.title}
            </Badge>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-muted p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="text-5xl mb-3">👋</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Start the conversation!</h3>
              <p className="text-sm text-muted-foreground">
                Say hello and introduce yourself. The AI will help with grammar as you chat.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => {
              const isCurrentUser = message.sender_id === currentUserId;
              const isAI = message.sender_type !== 'user';

              if (isAI) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className={`max-w-lg px-4 py-2 rounded-lg text-sm ${
                      message.sender_type === 'ai_correction'
                        ? 'bg-accent text-accent-foreground border border-accent'
                        : 'bg-primary/15 text-primary/95 border border-primary/30'
                    }`}>
                      <div className="flex items-start gap-2">
                        <span className="text-lg">
                          {message.sender_type === 'ai_correction' ? '✏️' : '✨'}
                        </span>
                        <div>
                          <p className="font-medium text-xs mb-1">
                            {message.sender_type === 'ai_correction' ? 'Grammar Tip' : 'AI Assistant'}
                          </p>
                          <p>{message.content}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-lg ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage
                        src={isCurrentUser ? currentUserProfile?.avatar_url || undefined : otherUser.avatar_url || undefined}
                        alt={isCurrentUser
                          ? currentUserProfile?.display_name || currentUserProfile?.full_name || 'You'
                          : otherUser.display_name || otherUser.full_name || 'User'}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-sm font-bold">
                        {isCurrentUser
                          ? (currentUserProfile?.display_name || currentUserProfile?.full_name || 'Y')[0].toUpperCase()
                          : (otherUser.display_name || otherUser.full_name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className={`px-4 py-2 rounded-lg ${
                        isCurrentUser
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-card text-foreground border border-border rounded-bl-none'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-1">
                        {message.created_at && new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              disabled={isSending}
              rows={1}
              className="flex-1 resize-none"
            />
            <Button type="submit" disabled={!newMessage.trim() || isSending}>
              {isSending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 The AI will provide helpful grammar corrections and keep the conversation on topic
          </p>
        </form>
      </div>
    </>
  );
}
