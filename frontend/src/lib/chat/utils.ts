/**
 * Chat Utility Functions
 *
 * Purpose: Shared utilities for all chat interfaces (peer, solo practice, voice)
 * Features:
 * - Timestamp formatting
 * - Message key generation
 * - Message type detection
 * - Content extraction
 */

/**
 * Format a timestamp for display in chat messages
 * @param value - Date string, Date object, or null
 * @returns Formatted time string (e.g., "2:30 PM") or "Just now"
 */
export function formatTimestamp(value?: string | Date | null): string {
  if (!value) {
    return "Just now";
  }

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Create a unique key for a chat message
 * Used for React list rendering
 * @param message - Message object with id or created_at
 * @returns Unique string key
 */
export function createMessageKey(message: {
  id?: string | number | null;
  created_at?: string | null;
  createdAt?: string | null;
  sender_type?: string | null;
  role?: string;
  content?: string | null;
}): string {
  // Prefer ID if available
  if (message.id !== undefined && message.id !== null) {
    return String(message.id);
  }

  // Fallback to constructed key
  const timestamp = message.created_at || message.createdAt || "na";
  const sender = message.sender_type || message.role || "user";
  const content = message.content || "";

  return `${sender}-${content.slice(0, 20)}-${timestamp}`;
}

/**
 * Check if a message is from AI
 * @param message - Message object
 * @returns true if message is from AI
 */
export function isAIMessage(message: {
  sender_type?: string | null;
  role?: string;
}): boolean {
  if (message.sender_type) {
    return message.sender_type.startsWith("ai");
  }

  if (message.role) {
    return message.role === "assistant";
  }

  return false;
}

/**
 * Extract text content from a message
 * Handles both string content and object content
 * @param message - Message with content field
 * @returns Extracted text content
 */
export function extractMessageText(message: {
  content?: string | { text?: string } | null;
}): string {
  if (!message.content) {
    return "";
  }

  if (typeof message.content === "string") {
    return message.content;
  }

  if (typeof message.content === "object" && "text" in message.content) {
    return message.content.text || "";
  }

  return "";
}

/**
 * Check if a message is a grammar correction
 * @param message - Message object
 * @returns true if message is a correction
 */
export function isCorrectionMessage(message: {
  sender_type?: string | null;
  message_type?: string | null;
  messageType?: string;
}): boolean {
  if (message.sender_type === "ai_correction") {
    return true;
  }

  if (
    message.message_type === "correction" ||
    message.messageType === "correction"
  ) {
    return true;
  }

  return false;
}
