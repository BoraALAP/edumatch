/**
 * Correction Message Component
 *
 * Reusable component for displaying AI language corrections in both peer chat and solo practice.
 * Shows correction messages with special styling and optional detailed error breakdowns.
 *
 * Handles all types of language errors:
 * - Grammar (tense, articles, subject-verb, prepositions, etc.)
 * - Vocabulary (word choice, inappropriate words)
 * - Spelling (misspelled words)
 * - Idioms (unnatural phrasing)
 * - Punctuation (major errors)
 *
 * Features:
 * - "Grammar Tip" badge with severity indicator
 * - Color-coded by severity (minor/moderate/major)
 * - Expandable detailed error list with before/after comparisons
 * - Works with AI SDK Response component for streaming
 * - Two variants: default (full) and compact (inline)
 * - Consistent UX across chat types
 */

'use client';

import { useState } from 'react';
import { Response } from '@/components/ai-elements/response';
import { Badge } from '@/components/ui/badge';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import GrammarIssueDetail, { type GrammarIssue } from './GrammarIssueDetail';
import { cn } from '@/lib/utils';

interface CorrectionMessageProps {
  content: string;
  grammarIssues?: GrammarIssue[];
  severity?: 'minor' | 'moderate' | 'major';
  showDetails?: boolean;
  variant?: 'default' | 'compact';
}

export default function CorrectionMessage({
  content,
  grammarIssues,
  severity,
  showDetails = true,
  variant = 'default',
}: CorrectionMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetailedIssues = grammarIssues && grammarIssues.length > 0;

  const severityColors = {
    minor: 'from-blue-100/50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-900/10',
    moderate: 'from-amber-100/50 to-amber-50/50 dark:from-amber-950/20 dark:to-amber-900/10',
    major: 'from-red-100/50 to-red-50/50 dark:from-red-950/20 dark:to-red-900/10',
  };

  const gradientClass = severity ? severityColors[severity] : severityColors.moderate;

  if (variant === 'compact') {
    return (
      <div className="space-y-2 px-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs bg-amber-100/50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100 border-amber-200 dark:border-amber-800">
            💡 Grammar Tip
          </Badge>
        </div>
        <div className="text-sm">
          <Response>{content}</Response>
        </div>
        {hasDetailedIssues && (
          <div className="space-y-1.5 pl-2 border-l-2 border-amber-300 dark:border-amber-700">
            {grammarIssues.map((issue, index) => (
              <GrammarIssueDetail
                key={index}
                issue={issue}
                compact
                showCategory={false}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      {/* Header Badge */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "text-xs font-medium",
            "bg-amber-100/50 text-amber-900 border-amber-200",
            "dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800"
          )}
        >
          💡 Grammar Tip
          {severity && (
            <span className="ml-1.5 opacity-75">
              ({severity})
            </span>
          )}
        </Badge>
        {hasDetailedIssues && showDetails && (
          <Badge variant="secondary" className="text-xs">
            {grammarIssues.length} {grammarIssues.length === 1 ? 'issue' : 'issues'}
          </Badge>
        )}
      </div>

      {/* Main Correction Message */}
      <div className={cn(
        "rounded-lg p-3 bg-linear-to-br",
        gradientClass,
        "border border-amber-200 dark:border-amber-800/50"
      )}>
        <Response>{content}</Response>
      </div>

      {/* Detailed Issues (Expandable) */}
      {hasDetailedIssues && showDetails && (
        <div className="space-y-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
              "hover:text-foreground transition-colors"
            )}
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="size-3.5" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDownIcon className="size-3.5" />
                Show details
              </>
            )}
          </button>

          {isExpanded && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {grammarIssues.map((issue, index) => (
                <GrammarIssueDetail
                  key={index}
                  issue={issue}
                  showCategory
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
