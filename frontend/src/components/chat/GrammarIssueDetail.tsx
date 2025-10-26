/**
 * Grammar Issue Detail Component
 *
 * Displays individual language errors with before/after comparison.
 * Shows the original text, corrected version, explanation, and category.
 * Used within correction messages to provide detailed feedback.
 *
 * Supports all error types:
 * - Grammar: tense, articles, subject-verb agreement, prepositions, word order, plurals, pronouns
 * - Vocabulary: word choice, inappropriate words
 * - Spelling: misspelled words
 * - Idioms: unnatural phrasing
 * - Punctuation: major punctuation errors
 * - Pronunciation: vocal pronunciation issues (future)
 * - Topic drift: off-topic conversation
 *
 * Features:
 * - Visual before/after comparison
 * - Color-coded severity indicators (minor, moderate, major)
 * - Category badges for quick identification
 * - Detailed explanations
 * - Compact mode for inline display
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { AlertCircleIcon, CheckCircleIcon, InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GrammarIssue {
  original: string;
  correction: string;
  corrected?: string; // Alias for compatibility
  explanation?: string;
  category?: string;
  severity?: 'minor' | 'moderate' | 'major';
}

interface GrammarIssueDetailProps {
  issue: GrammarIssue;
  showCategory?: boolean;
  compact?: boolean;
}

const severityConfig = {
  minor: {
    icon: InfoIcon,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    label: 'Minor',
  },
  moderate: {
    icon: AlertCircleIcon,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    label: 'Moderate',
  },
  major: {
    icon: AlertCircleIcon,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    label: 'Important',
  },
};

const categoryLabels: Record<string, string> = {
  // Grammar categories
  grammar_tense: 'Tense',
  grammar_article: 'Article',
  grammar_verb_agreement: 'Subject-Verb',
  grammar_preposition: 'Preposition',
  grammar_word_order: 'Word Order',
  grammar_plural: 'Plural/Singular',
  grammar_pronoun: 'Pronoun',

  // Language categories
  vocabulary: 'Vocabulary',
  spelling: 'Spelling',
  idiom: 'Idiom',
  punctuation: 'Punctuation',

  // Other categories
  pronunciation: 'Pronunciation',
  topic_drift: 'Topic',
  other: 'Grammar',
};

export default function GrammarIssueDetail({
  issue,
  showCategory = true,
  compact = false,
}: GrammarIssueDetailProps) {
  const severity = issue.severity || 'moderate';
  const config = severityConfig[severity];
  const SeverityIcon = config.icon;
  const categoryLabel = issue.category ? categoryLabels[issue.category] || issue.category : undefined;
  const correctedText = issue.correction || issue.corrected || '';

  if (compact) {
    return (
      <div className="flex items-start gap-2 text-sm">
        <SeverityIcon className={cn('size-4 mt-0.5 shrink-0', config.color)} />
        <div className="flex-1 min-w-0">
          <span className="line-through text-muted-foreground">{issue.original}</span>
          <span className="mx-1.5 text-muted-foreground">→</span>
          <span className="font-medium text-foreground">{correctedText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border p-3 space-y-2', config.bgColor)}>
      {/* Header with severity and category */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SeverityIcon className={cn('size-4', config.color)} />
          <span className={cn('text-xs font-medium', config.color)}>
            {config.label}
          </span>
        </div>
        {showCategory && categoryLabel && (
          <Badge variant="outline" className="text-xs">
            {categoryLabel}
          </Badge>
        )}
      </div>

      {/* Before/After comparison */}
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <span className="size-1.5 rounded-full bg-red-500" />
            Before
          </div>
          <div className="flex-1 text-sm">
            <span className="line-through text-muted-foreground/80">{issue.original}</span>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <CheckCircleIcon className="size-3 text-green-600" />
            After
          </div>
          <div className="flex-1 text-sm">
            <span className="font-medium text-foreground">{correctedText}</span>
          </div>
        </div>
      </div>

      {/* Explanation */}
      {issue.explanation && (
        <div className="pt-1.5 border-t border-border/50">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {issue.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
