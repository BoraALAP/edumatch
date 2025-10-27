/**
 * Grammar Issue Detail Component
 *
 * Purpose: Displays individual language errors with before/after comparison
 * Design: Modern card-based layout with split before/after sections, severity-specific backgrounds
 *
 * Features:
 * - Before/After split layout with visual divider
 * - Severity-based card backgrounds (dark mode optimized)
 * - ShieldAlert icon for severity indication
 * - Category badges (Grammar, Vocabulary, Spelling, etc.)
 * - Detailed explanations
 * - Compact mode for inline display
 *
 * Supports all error types:
 * - Grammar: tense, articles, subject-verb agreement, prepositions, word order, plurals, pronouns
 * - Vocabulary: word choice, inappropriate words
 * - Spelling: misspelled words
 * - Idioms: unnatural phrasing
 * - Punctuation: major punctuation errors
 * - Pronunciation: vocal pronunciation issues (voice practice)
 * - Topic drift: off-topic conversation
 *
 * Used by:
 * - /components/chat/CorrectionMessage.tsx
 * - /app/practice/[sessionId]/sections/solo-practice-chat.tsx
 */

"use client";

import { Badge } from "@/components/ui/badge";
import {
  CircleX,
  BadgeCheck,
  ShieldAlert,
  AlertCircleIcon,
  InfoIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrammarIssue } from "@/lib/chat/types";
import { Separator } from "../ui/separator";
import { Card } from "../ui/card";

interface GrammarIssueDetailProps {
  issue: GrammarIssue;
  showCategory?: boolean;
  compact?: boolean;
}

/**
 * Severity configuration with icons and visual styles
 */
const severityConfig = {
  minor: {
    icon: InfoIcon,
    label: "Minor",
    textColor: "text-blue-400",
    cardBg: "bg-slate-900/80 border-blue-900/30",
  },
  moderate: {
    icon: AlertCircleIcon,
    label: "Moderate",
    textColor: "text-amber-400",
    cardBg: "bg-slate-900/80 border-amber-900/30",
  },
  major: {
    icon: ShieldAlert,
    label: "Major",
    textColor: "text-red-400",
    cardBg: "bg-red-950/40 border-red-900/30",
  },
};

/**
 * Category labels for error types
 * Maps database category values to human-readable labels
 */
const categoryLabels: Record<string, string> = {
  // Grammar categories
  grammar_tense: "Grammar",
  grammar_article: "Grammar",
  grammar_verb_agreement: "Grammar",
  grammar_preposition: "Grammar",
  grammar_word_order: "Grammar",
  grammar_plural: "Grammar",
  grammar_pronoun: "Grammar",

  // Language categories
  vocabulary: "Vocabulary",
  spelling: "Spelling",
  idiom: "Idiom",
  punctuation: "Punctuation",

  // Other categories
  pronunciation: "Pronunciation",
  topic_drift: "Topic",
  other: "Grammar",
};

/**
 * Get category color scheme
 */
const getCategoryStyle = (category?: string) => {
  if (!category) return "bg-secondary text-secondary-foreground";

  if (category.startsWith("grammar_")) {
    return "bg-red-950/40 text-red-400 border-red-900/30";
  }
  if (category === "vocabulary") {
    return "bg-blue-950/40 text-blue-400 border-blue-900/30";
  }
  if (category === "spelling") {
    return "bg-emerald-950/40 text-emerald-400 border-emerald-900/30";
  }

  return "bg-secondary text-secondary-foreground";
};

export default function GrammarIssueDetail({
  issue,
  showCategory = true,
  compact = false,
}: GrammarIssueDetailProps) {
  const severity = issue.severity || "moderate";
  const config = severityConfig[severity];
  const SeverityIcon = config.icon;
  const categoryLabel = issue.category
    ? categoryLabels[issue.category] || issue.category
    : "Grammar";
  const correctedText = issue.correction || issue.corrected || "";



  // Full variant - card with before/after split layout
  return (
    <Card
      className={cn(
        "p-6  min-w-2xs flex grow",
        `${severity === "major" ? "bg-red-950/30" : severity === "moderate" ? "bg-yellow-950/30" : "bg-sky-950/30"}`


      )}
    >
      {/* Before/After Split Section */}
      <div className="flex gap-3 md:gap-4 ">
        {/* Before Section */}

        <div className="flex gap-2 w-full px-4 ">
          <CircleX className="size-6 text-red-400 " />
          <div className="text-sm flex flex-col leading-relaxed mt-0.5">
            <span className="font-medium text-muted-foreground">Before</span>
            <span className="text-base font-medium">{issue.original}</span>
          </div>
        </div>


        {/* Vertical Divider (hidden on mobile) */}
        <div className="w-px h-8 flex bg-muted-foreground/30 " />


        {/* After Section */}
        <div className="flex gap-2 w-full px-4">
          <BadgeCheck className="size-6 text-emerald-400" />
          <div className="text-sm flex flex-col leading-relaxed mt-0.5">
            <span className="font-medium text-muted-foreground">After</span>
            <span className="text-base font-medium">{correctedText}</span>
          </div>
        </div>


      </div>


      <div className="flex flex-col gap-2 ">
        {/* Metadata Row - Severity and Category */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-muted-foreground/30">
          {/* Severity Indicator */}
          <div className="flex items-center  gap-1.5">
            <ShieldAlert className={cn("size-3.5", config.textColor)} />
            <span className={cn("text-xs font-medium", config.textColor)}>
              {config.label}
            </span>
          </div>

          {/* Category Badge */}
          {showCategory && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium px-2 py-1",
                getCategoryStyle(issue.category),
              )}
            >
              {categoryLabel}
            </Badge>
          )}
        </div>

        {/* Explanation */}
        {issue.explanation && (
          <div className="">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {issue.explanation}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
