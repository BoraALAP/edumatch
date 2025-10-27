/**
 * Chat Utility Functions
 *
 * Purpose: AI SDK-specific message utilities
 * Features:
 * - Message text extraction from AI SDK format (parts/content arrays)
 *
 * Note: General utilities like formatTimestamp and createMessageKey
 * are now shared in /lib/chat/utils.ts
 */

import type { PracticeMessage, TextPart } from "./types";

export const isTextPart = (part: unknown): part is TextPart => {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as { type?: unknown }).type === "text" &&
    "text" in part &&
    typeof (part as { text?: unknown }).text === "string"
  );
};

/**
 * Extract text from AI SDK message format
 * Handles messages with parts[] or content[] arrays
 */
export const extractMessageText = (message?: PracticeMessage): string => {
  if (!message) {
    return "";
  }

  // AI SDK messages can have parts array
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter(isTextPart)
      .map((part) => part.text)
      .join("");
  }

  // Or content can be a string or array
  const content = (message as { content?: unknown }).content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter(isTextPart)
      .map((part) => part.text)
      .join("");
  }

  return "";
};
