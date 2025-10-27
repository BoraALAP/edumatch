/**
 * Chat UI Components
 *
 * Purpose: Reusable UI components for chat interface
 * Features:
 * - Chat header with session info
 * - Message rendering
 * - Submit button with loading states
 */

"use client";

import type { ChatStatus } from "ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PromptInputSubmit,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Flag } from "lucide-react";
import type { PracticeMessage, SoloPracticeSession, Profile } from "./types";
import { extractMessageText } from "./chat-utils";
import { ChatMessage as SharedChatMessage } from "@/components/chat/ChatMessage";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { formatTimestamp } from "@/lib/chat/utils";
import type { ChatMessageUI } from "@/lib/chat/types";

interface SoloPracticeChatHeaderProps {
  session: SoloPracticeSession;
  profile: Profile;
  messageCount: number;
  onFinish: () => void;
  isFinishing: boolean;
}

export function SoloPracticeChatHeader({
  session,
  profile,
  messageCount,
  onFinish,
  isFinishing,
}: SoloPracticeChatHeaderProps) {
  const messageLabel = messageCount === 1 ? "message" : "messages";

  return (
    <ChatHeader
      title="AI Practice Coach"
      backHref="/dashboard"
      badges={
        <>
          <Badge variant="secondary" className="text-xs">
            {session.proficiency_level || profile.proficiency_level}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {session.topic}
          </Badge>
        </>
      }
      actions={
        <>
          <div className="text-muted-foreground text-sm">
            {messageCount} {messageLabel}
          </div>
          <Button
            onClick={onFinish}
            disabled={isFinishing || messageCount < 3}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Flag className="w-4 h-4" />
            Finish Session
          </Button>
        </>
      }
    />
  );
}

interface ChatMessageProps {
  message: PracticeMessage;
  isStreaming: boolean;
}

/**
 * ChatMessage wrapper for solo practice
 * Transforms PracticeMessage to ChatMessageUI and uses shared ChatMessage component
 */
export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const messageText = extractMessageText(message);
  const isAssistant = message.role === "assistant";
  const isCorrection = isAssistant && message.messageType === "correction";

  // Transform PracticeMessage to ChatMessageUI
  const chatMessageUI: ChatMessageUI = {
    key:
      message.id ||
      `${message.role}-${messageText.slice(0, 20)}-${message.createdAt}`,
    role: message.role as "user" | "assistant",
    content: messageText,
    timestamp: formatTimestamp(message.createdAt),
    avatarSrc: isAssistant ? "/ai-coach.svg" : undefined,
    avatarName: isAssistant ? "AI Coach" : "You",
    isCurrentUser: !isAssistant,
    isAI: isAssistant,
    isCorrection,
    isCorrect: message.isCorrect ?? false,
    grammarIssues: message.grammarIssues,
    severity: message.correctionSeverity,
  };

  return (
    <SharedChatMessage message={chatMessageUI} isStreaming={isStreaming} />
  );
}

interface PromptSubmitButtonProps {
  status: ChatStatus;
  isStreaming: boolean;
  isSubmitting: boolean;
}

export function PromptSubmitButton({
  status,
  isStreaming,
  isSubmitting,
}: PromptSubmitButtonProps) {
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
