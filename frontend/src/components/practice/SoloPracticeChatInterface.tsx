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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { MessageSquareIcon, CheckCircle2, Flag } from 'lucide-react';
import CorrectionMessage from '@/components/chat/CorrectionMessage';
import type { GrammarIssue } from '@/components/chat/GrammarIssueDetail';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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
  messageType?: 'text' | 'correction' | 'encouragement' | 'topic_redirect';
  grammarIssues?: GrammarIssue[];
  correctionSeverity?: 'minor' | 'moderate' | 'major';
  isCorrect?: boolean; // Added to indicate grammatically correct messages
};

type TextPart = { type: 'text'; text: string };

const isTextPart = (part: unknown): part is TextPart => {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    (part as { type?: unknown }).type === 'text' &&
    'text' in part &&
    typeof (part as { text?: unknown }).text === 'string'
  );
};

const extractMessageText = (message?: PracticeMessage): string => {
  if (!message) {
    return '';
  }

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter(isTextPart)
      .map((part) => part.text)
      .join('');
  }

  const content = (message as { content?: unknown }).content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter(isTextPart)
      .map((part) => part.text)
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
          .from('text_practice_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[DEBUG] Error loading messages:', error);
          throw error;
        }

        console.log('[DEBUG] Loaded messages from DB:', data?.length || 0, 'messages');

        if (data && data.length > 0) {
          // Convert DB messages to AI SDK UI message format with correction metadata
          const msgs = data.map((msg) => ({
            id: msg.id,
            role: msg.role,
            parts: [
              {
                type: 'text' as const,
                text: msg.content,
              },
            ],
            createdAt: msg.created_at ? new Date(msg.created_at) : undefined,
            messageType: msg.message_type || 'text',
            grammarIssues: msg.grammar_issues || undefined,
            correctionSeverity: msg.correction_severity || undefined,
            isCorrect: msg.is_correct || false,
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
  const router = useRouter();
  const [realtimeMessages, setRealtimeMessages] = useState<PracticeMessage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const chat = useChat<PracticeMessage>({
    id: sessionId,
    // Note: useChat doesn't support initialMessages - we merge them in combinedMessages instead
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

  // Subscribe to real-time messages (user messages, corrections, AND AI responses from DB)
  useEffect(() => {
    const channel = supabase
      .channel(`text_practice:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'text_practice_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          console.log('[DEBUG] Real-time message received:', newMsg.role, newMsg.message_type);

          // Add ALL messages from DB (user messages, corrections, and responses)
          // This ensures proper ordering based on DB timestamps
          const formattedMsg: PracticeMessage = {
            id: newMsg.id,
            role: newMsg.role,
            parts: [{ type: 'text', text: newMsg.content }],
            createdAt: newMsg.created_at ? new Date(newMsg.created_at) : undefined,
            messageType: newMsg.message_type || 'text',
            grammarIssues: newMsg.grammar_issues,
            correctionSeverity: newMsg.correction_severity,
            isCorrect: newMsg.is_correct || false,
          };

          setRealtimeMessages((prev) => {
            console.log('[DEBUG] Adding to realtime messages, count:', prev.length + 1);
            return [...prev, formattedMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  const combinedMessages = useMemo(() => {
    // Use Map for better deduplication - prefer messages with DB IDs
    const messageMap = new Map<string, PracticeMessage>();
    const now = Date.now();

    // Process in order: initialMessages → realtimeMessages (with DB data) → streaming messages
    // This ensures DB messages take precedence over streaming messages
    const allMessages = [...initialMessages, ...realtimeMessages, ...messages];

    console.log('[DEBUG] Processing messages:', {
      initialCount: initialMessages.length,
      realtimeCount: realtimeMessages.length,
      streamingCount: messages.length,
      total: allMessages.length
    });

    for (const message of allMessages) {
      // Create content-based key for deduplication
      const contentKey = `${message.role}-${extractMessageText(message)}`;

      const existingMsg = messageMap.get(contentKey);

      // Prefer messages with database IDs (from real-time) over streaming messages
      const hasDbId = typeof message.id === 'string' && message.id.length > 10;
      const existingHasDbId = existingMsg && typeof existingMsg.id === 'string' && existingMsg.id.length > 10;

      if (!existingMsg || (hasDbId && !existingHasDbId)) {
        // Ensure all messages have timestamps
        if (!message.createdAt) {
          message.createdAt = new Date(now);
        }

        // Ensure messageType is set (default to 'text' if not set)
        if (!message.messageType && message.role === 'assistant') {
          message.messageType = 'text';
        }

        messageMap.set(contentKey, message);
      }
    }

    // Convert map to array and sort
    const merged = Array.from(messageMap.values());

    console.log('[DEBUG] After deduplication:', merged.length, 'messages');

    // Sort by timestamp AND message type to ensure corrections appear before AI responses
    return merged.sort((a, b) => {
      const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.getTime()) : 0;
      const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.getTime()) : 0;

      // If timestamps are within 5 seconds, prioritize corrections over conversation
      const timeDiff = Math.abs(aTime - bTime);
      if (timeDiff < 5000) {
        const aIsCorrection = a.messageType === 'correction';
        const bIsCorrection = b.messageType === 'correction';

        // Corrections should appear before non-corrections when timestamps are close
        if (aIsCorrection && !bIsCorrection) return -1;
        if (!aIsCorrection && bIsCorrection) return 1;
      }

      return aTime - bTime;
    });
  }, [initialMessages, realtimeMessages, messages]);

  const visibleMessages = useMemo(() => {
    const filtered = combinedMessages.filter(
      (message) => message.role === 'user' || message.role === 'assistant'
    );
    console.log('[DEBUG] Visible messages:', filtered.length);
    return filtered;
  }, [combinedMessages]);

  const visibleMessageCount = visibleMessages.length;
  const messageLabel = visibleMessageCount === 1 ? 'message' : 'messages';

  // Handle finishing the session
  const handleFinishSession = async () => {
    setIsFinishing(true);

    try {
      // Update session status to completed
      const { error } = await supabase
        .from('text_practice_sessions')
        .update({
          status: 'archived',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      toast.success('Session completed!', {
        description: 'Your practice session has been saved.',
      });

      // Redirect to practice page
      router.push('/practice');
    } catch (error) {
      console.error('Error finishing session:', error);
      toast.error('Failed to finish session. Please try again.');
      setIsFinishing(false);
    }
  };
  const isStreaming = status === 'streaming' || status === 'submitted';

  const handlePromptSubmit = async ({ text }: PromptInputMessage) => {
    const userMessage = text?.trim();

    console.log('[DEBUG] Submit handler called with:', userMessage);

    if (!userMessage) {
      throw new Error('EMPTY_MESSAGE');
    }

    // Prevent duplicate submissions
    if (isStreaming || isSubmitting) {
      console.log('[DEBUG] Submission blocked:', { isStreaming, isSubmitting });
      throw new Error('SUBMISSION_IN_PROGRESS');
    }

    setIsSubmitting(true);
    console.log('[DEBUG] Starting message submission');

    try {
      // Start AI conversation immediately for responsive UI
      // This adds the user message to the chat interface right away
      console.log('[DEBUG] Calling chat.sendMessage');
      const sendPromise = chat.sendMessage({ text: userMessage });
      console.log('[DEBUG] chat.sendMessage called, promise created');

      // Run DB save and grammar analysis in parallel (non-blocking)
      const messageIndex = combinedMessages.filter(m => m.role === 'user').length;

      // Save to database in background
      (async () => {
        try {
          const { data: savedMessage, error: insertError } = await supabase
            .from('text_practice_messages')
            .insert({
              session_id: sessionId,
              role: 'user',
              content: userMessage,
              message_type: 'text',
            })
            .select()
            .single();

          if (insertError || !savedMessage) {
            console.error('Error saving user message:', insertError);
            return;
          }

          // Update message count
          try {
            await supabase.rpc('increment_session_message_count', {
              p_session_id: sessionId,
              p_is_correction: false,
            });
          } catch (err) {
            console.error('Error updating message count:', err);
          }

          // Run grammar analysis (non-blocking)
          try {
            const response = await fetch('/api/practice/analyze-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                userMessageId: savedMessage.id,
                message: userMessage,
                studentLevel: session.proficiency_level || profile.proficiency_level,
                messageIndex,
                grammarFocus: session.grammar_focus || [],
              }),
            });

            const result = await response.json();
            console.log('[Grammar Analysis]', result);
            if (result.shouldCorrect) {
              console.log('[Correction Created]', result.correction);
            }
          } catch (err) {
            console.error('Grammar analysis error:', err);
          }
        } catch (err) {
          console.error('Error in message flow:', err);
        }
      })();

      // Wait for AI response to complete (but user message already shown)
      await sendPromise;
    } catch (sendError) {
      console.error('Error sending chat message:', sendError);
      throw sendError;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      <header className="border-b border-border bg-card px-4 py-3 shrink-0">
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

          <div className="flex items-center gap-3">
            <div className="text-muted-foreground text-sm">
              {visibleMessageCount} {messageLabel}
            </div>
            <Button
              onClick={handleFinishSession}
              disabled={isFinishing || visibleMessageCount < 3}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Flag className="w-4 h-4" />
              Finish Session
            </Button>
          </div>
        </div>
      </header>

      <Conversation
        className="relative flex-1 overflow-hidden"
      >
        <ConversationContent className="mx-auto w-full max-w-4xl">
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

              // Check if this is a correction message
              const isCorrection = isAssistant && message.messageType === 'correction';

              return (
                <Message from={isAssistant ? 'assistant' : 'user'} key={key}>
                  <div className="flex max-w-3xl flex-col gap-1">
                    <MessageContent
                      className={cn(
                        'w-fit max-w-xl whitespace-pre-wrap wrap-break-word leading-relaxed text-sm relative',
                        isAssistant ? 'self-start' : 'self-end',
                        isCorrection && 'bg-transparent p-0'
                      )}
                    >
                      {isAssistant ? (
                        isAssistantTyping ? (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader size={16} />
                            Coach is typing…
                          </span>
                        ) : isCorrection ? (
                          <CorrectionMessage
                            content={messageText}
                            grammarIssues={message.grammarIssues}
                            severity={message.correctionSeverity}
                            showDetails
                          />
                        ) : (
                          <Response>{messageText}</Response>
                        )
                      ) : (
                        <div className="flex items-start gap-2">
                          <p className="flex-1">{messageText}</p>
                          {message.isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          )}
                        </div>
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
                      className={cn(
                        'bg-secondary text-secondary-foreground',
                        isCorrection && 'ring-amber-200 dark:ring-amber-300/40'
                      )}
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
        <div className="bg-destructive/10 px-4 py-2 text-sm text-destructive shrink-0">
          {error.message || 'We had trouble responding. Please try again.'}
        </div>
      )}

      <div className="border-t border-border bg-card p-4 shrink-0">
        <div className="mx-auto w-full max-w-4xl space-y-2">
          <PromptInputProvider>
            <PromptInput onSubmit={handlePromptSubmit}>
              <PromptInputBody>
                <PromptInputTextarea
                  disabled={isStreaming || isSubmitting}
                  placeholder="Type your message..."
                  rows={2}
                />
              </PromptInputBody>
              <PromptInputFooter>
                <span className="text-xs text-muted-foreground">
                  Press Enter to send • Shift+Enter for new line
                </span>
                <PromptSubmitButton
                  isStreaming={isStreaming}
                  isSubmitting={isSubmitting}
                  status={status}
                />
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
  isSubmitting,
}: {
  status: ChatStatus;
  isStreaming: boolean;
  isSubmitting: boolean;
}) {
  const { textInput } = usePromptInputController();
  const isDisabled = isStreaming || isSubmitting || !textInput.value.trim();

  return (
    <PromptInputSubmit
      disabled={isDisabled}
      status={status}
      variant="default"
    />
  );
}
