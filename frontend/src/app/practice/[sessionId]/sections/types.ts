/**
 * Solo Practice Chat Types
 *
 * Purpose: Type definitions for solo practice chat
 */

import type { UIMessage } from "ai";
import type { GrammarIssue, GrammarSeverity } from "@/lib/chat/types";

export interface SoloPracticeSession {
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

export interface Profile {
  id: string;
  proficiency_level: string | null;
}

export type PracticeMessage = UIMessage & {
  createdAt?: string | Date;
  messageType?: "text" | "correction" | "encouragement" | "topic_redirect";
  grammarIssues?: GrammarIssue[];
  correctionSeverity?: GrammarSeverity;
  isCorrect?: boolean;
};

export type TextPart = { type: "text"; text: string };
