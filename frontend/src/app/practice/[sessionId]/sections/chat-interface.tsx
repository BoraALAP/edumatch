/**
 * Chat Interface Component
 *
 * Purpose: Main chat interface for practice sessions
 * Features:
 * - Real-time message display
 * - AI streaming responses
 * - Grammar corrections
 * - Session management
 */

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { MessageSquareIcon } from "lucide-react";
import type { PracticeMessage, SoloPracticeSession, Profile } from "./types";
import { useRealtimeMessages, useCombinedMessages } from "./chat-hooks";
import {
  SoloPracticeChatHeader,
  ChatMessage,
  PromptSubmitButton,
} from "./chat-components";
import { finishSession, submitMessage } from "./chat-actions";

interface ChatInterfaceProps {
  sessionId: string;
  session: SoloPracticeSession;
  profile: Profile;
  initialMessages: PracticeMessage[];
}

export default function ChatInterface({
  sessionId,
  session,
  profile,
  initialMessages,
}: ChatInterfaceProps) {
  const supabase = createClient();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const chat = useChat<PracticeMessage>({
    id: sessionId,
    transport: new DefaultChatTransport({
      api: "/api/practice/chat",
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
  const realtimeMessages = useRealtimeMessages(sessionId, supabase);
  const combinedMessages = useCombinedMessages(
    initialMessages,
    realtimeMessages,
    messages,
  );

  const visibleMessages = useMemo(() => {
    const filtered = combinedMessages.filter(
      (message) => message.role === "user" || message.role === "assistant",
    );
    console.log("[DEBUG] Visible messages:", filtered.length);
    return filtered;
  }, [combinedMessages]);

  const visibleMessageCount = visibleMessages.length;
  const isStreaming = status === "streaming" || status === "submitted";

  const handleFinishSession = useCallback(() => {
    setIsFinishing(true);
    finishSession({
      supabase,
      sessionId,
      onComplete: () => router.push("/practice"),
      onError: () => setIsFinishing(false),
    });
  }, [supabase, sessionId, router]);

  const handlePromptSubmit = useCallback(
    async ({ text }: PromptInputMessage) => {
      const userMessage = text?.trim();

      console.log("[DEBUG] Submit handler called with:", userMessage);

      if (!userMessage) {
        throw new Error("EMPTY_MESSAGE");
      }

      // Prevent duplicate submissions
      if (isStreaming || isSubmitting) {
        console.log("[DEBUG] Submission blocked:", {
          isStreaming,
          isSubmitting,
        });
        throw new Error("SUBMISSION_IN_PROGRESS");
      }

      setIsSubmitting(true);
      console.log("[DEBUG] Starting message submission");

      try {
        await submitMessage({
          supabase,
          sessionId,
          userMessage,
          studentLevel: session.proficiency_level || profile.proficiency_level,
          grammarFocus: session.grammar_focus || [],
          combinedMessages,
          sendMessage: chat.sendMessage,
        });
      } catch (sendError) {
        console.error("Error sending chat message:", sendError);
        throw sendError;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isStreaming,
      isSubmitting,
      supabase,
      sessionId,
      session.proficiency_level,
      session.grammar_focus,
      profile.proficiency_level,
      combinedMessages,
      chat.sendMessage,
    ],
  );

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      <SoloPracticeChatHeader
        session={session}
        profile={profile}
        messageCount={visibleMessageCount}
        onFinish={handleFinishSession}
        isFinishing={isFinishing}
      />

      <Conversation className="relative flex-1 overflow-hidden">
        <ConversationContent className="mx-auto w-full max-w-4xl">
          {visibleMessages.length === 0 ? (
            <ConversationEmptyState
              description="Messages will appear here as the conversation progresses."
              icon={<MessageSquareIcon className="size-6" />}
              title="Start a conversation"
            />
          ) : (
            visibleMessages.map((message) => (
              <ChatMessage
                key={message.id || `${message.role}-${message.createdAt}`}
                message={message}
                isStreaming={isStreaming}
              />
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {error && (
        <div className="bg-destructive/10 px-4 py-2 text-sm text-destructive shrink-0">
          {error.message || "We had trouble responding. Please try again."}
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
            💡 The AI coach will provide gentle corrections and keep the
            conversation going
          </p>
        </div>
      </div>
    </div>
  );
}
