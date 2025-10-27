/**
 * Chat Message Component
 *
 * Purpose: Unified message rendering for all chat interfaces
 * Features:
 * - Consistent message display (user/AI)
 * - Grammar correction highlighting
 * - Checkmark for correct messages
 * - Timestamp display
 * - Avatar support
 *
 * Used in:
 * - Peer chat (2-person conversations)
 * - Solo practice (1-person with AI)
 * - Voice practice (voice conversations with AI)
 */

"use client";

import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ai-elements/message";
import { Response } from "@/components/ai-elements/response";
import { Loader } from "@/components/ai-elements/loader";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import CorrectionMessage from "./CorrectionMessage";
import { formatTimestamp } from "@/lib/chat/utils";
import type { ChatMessageUI } from "@/lib/chat/types";

interface ChatMessageProps {
  message: ChatMessageUI;
  isStreaming?: boolean;
}

export function ChatMessage({
  message,
  isStreaming = false,
}: ChatMessageProps) {
  const isAssistantTyping =
    message.isAI && message.content.trim().length === 0 && isStreaming;
  const timestampAlignment = message.isAI ? "self-start" : "self-end";

  return (
    <Message from={message.role} key={message.key}>
      <div className="flex max-w-3xl flex-col gap-1">
        <MessageContent
          className={cn(
            "w-fit max-w-xl whitespace-pre-wrap wrap-break-word leading-relaxed text-sm relative",
            message.isAI ? "self-start" : "self-end",
            message.isCorrection && "bg-transparent p-0",
          )}
        >
          {message.isAI ? (
            isAssistantTyping ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader size={16} />
                AI is typing…
              </span>
            ) : message.isCorrection ? (
              <CorrectionMessage
                content={message.content}
                grammarIssues={message.grammarIssues}
                severity={message.severity}
                showDetails
              />
            ) : (
              <Response>{message.content}</Response>
            )
          ) : (
            <div className="flex items-start gap-2">
              <p className="flex-1">{message.content}</p>
              {message.isCorrect && (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              )}
            </div>
          )}
        </MessageContent>
        <span
          className={cn(
            "text-xs text-muted-foreground pl-2 pr-2",
            timestampAlignment,
          )}
        >
          {message.timestamp}
        </span>
      </div>
      {message.isAI && (
        <MessageAvatar
          className={cn(
            "bg-secondary text-secondary-foreground",
            message.isCorrection && "ring-amber-200 dark:ring-amber-300/40",
          )}
          name={message.avatarName || "AI"}
          src={message.avatarSrc || "/ai-coach.svg"}
        />
      )}
      {!message.isAI && message.avatarSrc && (
        <MessageAvatar
          className="bg-card text-foreground ring-border"
          name={message.avatarName || "User"}
          src={message.avatarSrc || ""}
        />
      )}
    </Message>
  );
}

/**
 * Convert a raw message to ChatMessageUI format
 * This helper can be used in both peer chat and solo practice
 */
export function toChatMessageUI(
  message: {
    id?: string | number | null;
    content?: string | { text?: string } | null;
    created_at?: string | null;
    createdAt?: string | null;
    role?: "user" | "assistant" | "system";
    sender_id?: string | null;
    sender_type?: string | null;
    message_type?: string | null;
    messageType?: string;
    grammar_issues?: any[] | null;
    grammarIssues?: any[];
    is_correct?: boolean | null;
    isCorrect?: boolean;
    correction_severity?: string | null;
    correctionSeverity?: string;
  },
  options: {
    currentUserId: string;
    aiAvatarSrc?: string;
    aiAvatarName?: string;
    userAvatarSrc?: string;
    userAvatarName?: string;
    key: string;
  },
): ChatMessageUI {
  const isAI =
    message.sender_type?.startsWith("ai") || message.role === "assistant";
  const isCurrentUser =
    message.sender_id === options.currentUserId || message.role === "user";
  const isCorrection =
    isAI &&
    (message.sender_type === "ai_correction" ||
      message.message_type === "correction" ||
      message.messageType === "correction");

  // Extract content
  let content = "";
  if (typeof message.content === "string") {
    content = message.content;
  } else if (typeof message.content === "object" && message.content?.text) {
    content = message.content.text;
  }

  return {
    key: options.key,
    role: isAI ? "assistant" : "user",
    content,
    timestamp: formatTimestamp(message.created_at || message.createdAt),
    avatarSrc: isAI ? options.aiAvatarSrc : options.userAvatarSrc,
    avatarName: isAI
      ? options.aiAvatarName || "AI"
      : options.userAvatarName || "You",
    isCurrentUser,
    isAI,
    isCorrection,
    isCorrect: message.is_correct ?? message.isCorrect ?? false,
    grammarIssues: message.grammar_issues || message.grammarIssues,
    severity: (message.correction_severity ||
      message.correctionSeverity) as any,
  };
}
