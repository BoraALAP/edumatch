/**
 * Solo Practice Chat Interface Component
 *
 * Real-time AI conversation practice interface with streaming.
 * Features:
 * - AI SDK streaming for real-time responses
 * - Grammar corrections displayed inline
 * - Conversation history
 * - Progress tracking
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type ChatStatus, type UIMessage } from 'ai';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Loader } from '@/components/ai-elements/loader';
import {
  Message,
  MessageAvatar,
  MessageContent,
} from '@/components/ai-elements/message';
import { Response } from '@/components/ai-elements/response';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
  usePromptInputController,
} from '@/components/ai-elements/prompt-input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { MessageSquareIcon } from 'lucide-react';

interface SoloPracticeSession {
  id: string;
  student_id: string;
  topic: string;
  proficiency_level: string | null;
  learning_goals: string[] | null;
  grammar_focus: string[] | null;
  status: string;
  message_count: number;
  correction_count: number;
}

interface Profile {
  id: string;
  proficiency_level: string | null;
}

interface SoloPracticeChatInterfaceProps {
  sessionId: string;
  session: SoloPracticeSession;
  profile: Profile;
}

type PracticeMessage = UIMessage & {
  createdAt?: string | Date;
};

const extractMessageText = (message?: PracticeMessage): string => {
  if (!message) {
    return '';
  }

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter(
        (part): part is { type: 'text'; text: string } =>
          !!part && part.type === 'text' && typeof part.text === 'string'
      )
      .map((part) => part.text)
      .join('');
  }

  const content = (message as { content?: unknown }).content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) =>
        part && typeof part === 'object' && (part as any).type === 'text'
      )
      .map((part: any) => part.text as string)
      .join('');
  }

  return '';
};

const formatTimestamp = (value?: string | Date): string => {
  if (!value) {
    return 'Just now';
  }

  const date = typeof value === 'string' ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const createMessageKey = (message: PracticeMessage): string => {
  if (message.id) {
    return message.id;
  }

  const timestamp =
    typeof message.createdAt === 'string'
      ? message.createdAt
      : message.createdAt?.toISOString() ?? 'na';

  return `${message.role}-${extractMessageText(message)}-${timestamp}`;
};

export default function SoloPracticeChatInterface({
  sessionId,
  session,
  profile,
}: SoloPracticeChatInterfaceProps) {
  const supabase = createClient();
  const [isReady, setIsReady] = useState(false);
  const [initialMessages, setInitialMessages] = useState<PracticeMessage[]>([]);

  // Load initial messages from database first, BEFORE rendering useChat
  useEffect(() => {
    async function loadMessages() {
      try {
        console.log('[DEBUG] Loading messages for session:', sessionId);
        const { data, error } = await supabase
          .from('solo_practice_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[DEBUG] Error loading messages:', error);
          throw error;
        }

        console.log('[DEBUG] Loaded messages from DB:', data?.length || 0, 'messages');

        if (data && data.length > 0) {
          // Convert DB messages to AI SDK UI message format
          const msgs = data.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            parts: [
              {
                type: 'text' as const,
                text: msg.content,
              },
            ],
            createdAt: msg.created_at ? new Date(msg.created_at) : undefined,
          }));
          console.log('[DEBUG] Converted messages:', msgs);
          setInitialMessages(msgs);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        // Mark as ready to render useChat
        setIsReady(true);
      }
    }

    loadMessages();
  }, [sessionId, supabase]);

  // Don't render until initial messages are loaded
  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return <ChatInterface
    sessionId={sessionId}
    session={session}
    profile={profile}
    initialMessages={initialMessages}
  />;
}

function ChatInterface({
  sessionId,
  session,
  profile,
  initialMessages,
}: SoloPracticeChatInterfaceProps & { initialMessages: PracticeMessage[] }) {
  const supabase = createClient();

  const chat = useChat<PracticeMessage>({
    id: sessionId,
    // initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/practice/chat',
      body: {
        data: {
          sessionId,
          topic: session.topic,
          studentLevel: session.proficiency_level || profile.proficiency_level,
          learningGoals: session.learning_goals || [],
          grammarFocus: session.grammar_focus || [],
        },
      },
    }),
  });

  const { messages, status, error } = chat;

  const combinedMessages = useMemo(() => {
    const seen = new Set<string>();
    const merged: PracticeMessage[] = [];

    for (const message of [...initialMessages, ...messages]) {
      const key = createMessageKey(message);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(message);
    }

    return merged;
  }, [initialMessages, messages]);

  const visibleMessages = useMemo(
    () =>
      combinedMessages.filter(
        (message) => message.role === 'user' || message.role === 'assistant'
      ),
    [combinedMessages]
  );

  const visibleMessageCount = visibleMessages.length;
  const messageLabel = visibleMessageCount === 1 ? 'message' : 'messages';
  const isStreaming = status === 'streaming' || status === 'submitted';

  const handlePromptSubmit = async ({ text }: PromptInputMessage) => {
    const userMessage = text?.trim();

    if (!userMessage) {
      throw new Error('EMPTY_MESSAGE');
    }

    if (isStreaming) {
      throw new Error('STREAM_IN_PROGRESS');
    }

    const { error: insertError } = await supabase
      .from('solo_practice_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage,
      });

    if (insertError) {
      console.error('Error saving user message:', insertError);
      throw insertError;
    }

    const { error: countError } = await supabase.rpc(
      'increment_session_message_count',
      {
        p_session_id: sessionId,
        p_is_correction: false,
      }
    );

    if (countError) {
      console.error('Error updating session message count:', countError);
      throw countError;
    }

    try {
      await chat.sendMessage({ text: userMessage });
    } catch (sendError) {
      console.error('Error sending chat message:', sendError);
      throw sendError;
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-primary hover:text-primary/90">
              ←
            </Link>
            <div>
              <h2 className="text-foreground font-semibold">AI Practice Coach</h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {session.proficiency_level || profile.proficiency_level}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {session.topic}
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-muted-foreground text-sm">
            {visibleMessageCount} {messageLabel}
          </div>
        </div>
      </header>

      <Conversation
        className="relative size-full"
        style={{ height: '498px' }}
      >
        <ConversationContent>
          {visibleMessages.length === 0 ? (
            <ConversationEmptyState
              description="Messages will appear here as the conversation progresses."
              icon={<MessageSquareIcon className="size-6" />}
              title="Start a conversation"
            />
          ) : (
            visibleMessages.map((message) => {
              const key = createMessageKey(message);
              const messageText = extractMessageText(message);
              const isAssistant = message.role === 'assistant';
              const isAssistantTyping =
                isAssistant && messageText.trim().length === 0 && isStreaming;
              const timestampAlignment = isAssistant ? 'self-start' : 'self-end';

              return (
                <Message from={isAssistant ? 'assistant' : 'user'} key={key}>
                  <div className="flex max-w-3xl flex-col gap-1">
                    <MessageContent
                      className={cn(
                        'w-fit max-w-xl whitespace-pre-wrap wrap-break-word leading-relaxed text-sm',
                        isAssistant ? 'self-start' : 'self-end'
                      )}
                    >
                      {isAssistant ? (
                        isAssistantTyping ? (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader size={16} />
                            Coach is typing…
                          </span>
                        ) : (
                          <Response>{messageText}</Response>
                        )
                      ) : (
                        <p>{messageText}</p>
                      )}
                    </MessageContent>
                    <span
                      className={cn(
                        'text-xs text-muted-foreground pl-2 pr-2',
                        timestampAlignment
                      )}
                    >
                      {formatTimestamp(message.createdAt)}
                    </span>
                  </div>
                  {isAssistant && (
                    <MessageAvatar
                      className="bg-secondary text-secondary-foreground"
                      name="AI"
                      src="/ai-coach.svg"
                    />
                  )}
                </Message>
              );
            })
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {error && (
        <div className="bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error.message || 'We had trouble responding. Please try again.'}
        </div>
      )}

      <div className="border-t border-border bg-card p-4">
        <div className="mx-auto w-full max-w-4xl space-y-2">
          <PromptInputProvider>
            <PromptInput onSubmit={handlePromptSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  disabled={isStreaming}
                  placeholder="Type your message..."
                  rows={2}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <span className="text-xs text-muted-foreground">
                  Press Enter to send • Shift+Enter for new line
                </span>
                <PromptSubmitButton isStreaming={isStreaming} status={status} />
              </PromptInputFooter>
            </PromptInput>
          </PromptInputProvider>
          <p className="text-xs text-muted-foreground">
            💡 The AI coach will provide gentle corrections and keep the conversation going
          </p>
        </div>
      </div>
    </div>
  );
}

function PromptSubmitButton({
  status,
  isStreaming,
}: {
  status: ChatStatus;
  isStreaming: boolean;
}) {
  const { textInput } = usePromptInputController();
  const isDisabled = isStreaming || !textInput.value.trim();

  return (
    <PromptInputSubmit
      disabled={isDisabled}
      status={status}
      variant="default"
    />
  );
}
