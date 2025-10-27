/**
 * Correction Message Component
 *
 * Purpose: Reusable component for displaying AI language corrections in both peer chat and solo practice
 * Design: Modern card-based interface with before/after comparisons
 *
 * Features:
 * - "Tips" badge with issue count
 * - Friendly encouragement messages
 * - Expandable detailed error cards with before/after split layout
 * - Severity-based visual indicators (minor/moderate/major)
 * - Streaming AI content support via Response component
 * - Two variants: default (full) and compact (inline)
 *
 * Handles all error types:
 * - Grammar (tense, articles, subject-verb, prepositions, etc.)
 * - Vocabulary (word choice, inappropriate words)
 * - Spelling (misspelled words)
 * - Idioms (unnatural phrasing)
 * - Punctuation (major errors)
 *
 * Used by:
 * - /app/practice/[sessionId]/sections/solo-practice-chat.tsx
 * - /components/chat/ChatInterface.tsx
 * - /app/chat/[matchId]/sections/peer-chat-interface.tsx
 */

"use client";

import { useState } from "react";
import { Response } from "@/components/ai-elements/response";
import { Badge } from "@/components/ui/badge";
import { ChevronDownIcon, ChevronUpIcon, Lightbulb } from "lucide-react";
import GrammarIssueDetail from "./GrammarIssueDetail";
import { cn } from "@/lib/utils";
import type { GrammarIssue, GrammarSeverity } from "@/lib/chat/types";

interface CorrectionMessageProps {
  content: string;
  grammarIssues?: GrammarIssue[];
  severity?: "minor" | "moderate" | "major";
  showDetails?: boolean;
  variant?: "default" | "compact";
}

export default function CorrectionMessage({
  content,
  grammarIssues,
  severity,
  showDetails = true,
  variant = "default",
}: CorrectionMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetailedIssues = grammarIssues && grammarIssues.length > 0;
  const issueCount = grammarIssues?.length || 0;



  // Default variant - full design with expandable cards
  return (
    <div className="space-y-3 p-2">
      {/* Header Section */}
      <div className="space-y-2">
        {/* Tips Badge with Issue Count */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center gap-2"
          >
            <Lightbulb className="size-4 " />
            Tips
            {hasDetailedIssues && (
              <span className="ml-1.5 opacity-75">
                ({issueCount} {issueCount === 1 ? "issue" : "issues"})
              </span>
            )}
          </div>
        </div>

        {/* Encouragement Message */}
        <div className="rounded-lg  p-3">
          <Response>{content}</Response>
        </div>
      </div>

      {/* Detailed Issues (Expandable) */}
      {hasDetailedIssues && showDetails && (
        <div className="space-y-2">
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 flex gap-4 flex-wrap ">
            {grammarIssues.map((issue, index) => (
              <GrammarIssueDetail key={index} issue={issue} showCategory />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
