/**
 * Session Summary Modal
 *
 * Purpose: Present accumulated analytics to the student after a practice session.
 * Features:
 * - Aggregates conversation analytics by analysis type
 * - Highlights strengths and areas for improvement
 * - Displays pronunciation / fluency / accent scores
 * - Surfaces notable grammar issues and filler words
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  AnalyticsService,
  type AnalyticsIssue,
  type AnalysisType,
} from '@/lib/analytics/analytics-service';
import type {
  ConversationAnalytics,
  IssueSeverity,
} from '@/lib/analytics/types';

interface SessionSummaryModalProps {
  sessionId: string;
  studentId: string;
  topic: string;
  proficiencyLevel?: string | null;
  sessionType?: 'text_practice' | 'voice_practice'; // Add session type to distinguish practice mode
  isOpen: boolean;
  onClose: () => void;
}

type SeverityCounts = Record<IssueSeverity, number>;

interface SummaryData {
  grammarIssues: AnalyticsIssue[];
  grammarSeverityCounts: SeverityCounts;
  topGrammarPatterns: Array<{ label: string; count: number }>;
  pronunciationScore?: number;
  pronunciationIssues: AnalyticsIssue[];
  fluencyScore?: number;
  fluencyIssues: AnalyticsIssue[];
  accentScore?: number;
  accentIssues: AnalyticsIssue[];
  fillerWordCounts: Array<{ word: string; count: number }>;
  hesitationsCount: number;
  totalAnalyses: number;
  strengths: string[];
  improvements: string[];
}

const severityLabels: Record<IssueSeverity, { label: string; className: string }> =
  {
    minor: { label: 'Minor', className: 'bg-emerald-500/15 text-emerald-600' },
    moderate: {
      label: 'Moderate',
      className: 'bg-amber-500/15 text-amber-600',
    },
    major: { label: 'Major', className: 'bg-red-500/15 text-red-600' },
  };

function average(values: Array<number | null | undefined>): number | undefined {
  const nums = values.filter(
    (value): value is number => typeof value === 'number' && !Number.isNaN(value)
  );
  if (nums.length === 0) {
    return undefined;
  }
  const total = nums.reduce((acc, value) => acc + value, 0);
  return total / nums.length;
}

function flattenIssues(records: ConversationAnalytics[] | undefined): AnalyticsIssue[] {
  if (!records) {
    return [];
  }
  return records.flatMap((record) => Array.isArray(record.issues) ? record.issues : []);
}

function countSeverity(issues: AnalyticsIssue[]): SeverityCounts {
  return issues.reduce<SeverityCounts>(
    (acc, issue) => {
      const severity = (issue.severity ?? 'minor') as IssueSeverity;
      acc[severity] = (acc[severity] ?? 0) + 1;
      return acc;
    },
    { minor: 0, moderate: 0, major: 0 }
  );
}

function aggregatePatterns(issues: AnalyticsIssue[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  issues.forEach((issue) => {
    const key = issue.type || 'general';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function countFillerWords(records: ConversationAnalytics[] | undefined) {
  if (!records) return [];

  const totals = new Map<string, number>();

  records.forEach((record) => {
    if (Array.isArray(record.filler_words)) {
      record.filler_words.forEach((word: unknown) => {
        if (typeof word === 'string' && word.trim().length > 0) {
          const lower = word.toLowerCase();
          totals.set(lower, (totals.get(lower) ?? 0) + 1);
        }
      });
    }
  });

  return Array.from(totals.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

const scoreToStrength = (label: string, score?: number): string | null => {
  if (typeof score !== 'number') return null;
  if (score >= 85) {
    return `${label} is excellent (${Math.round(score)}).`;
  }
  if (score >= 75) {
    return `${label} is strong (${Math.round(score)}).`;
  }
  return null;
};

const scoreToImprovement = (label: string, score?: number): string | null => {
  if (typeof score !== 'number') return null;
  if (score < 60) {
    return `Focus on improving ${label.toLowerCase()} (current score ${Math.round(
      score
    )}).`;
  }
  if (score < 75) {
    return `Keep practicing ${label.toLowerCase()} to reach a higher score (${Math.round(
      score
    )}).`;
  }
  return null;
};

export default function SessionSummaryModal({
  sessionId,
  studentId,
  topic,
  proficiencyLevel,
  isOpen,
  onClose,
}: SessionSummaryModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    async function fetchSummary() {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const service = new AnalyticsService(supabase);

        const { data, error: analyticsError } = await service.getSessionAnalyticsByType(
          sessionId,
          sessionType || 'voice_practice' // Default to voice_practice for backward compatibility
        );

        if (analyticsError) {
          throw new Error(analyticsError.message);
        }

        if (!data) {
          if (isMounted) {
            setSummary(null);
          }
          return;
        }

        const grouped = data as Partial<Record<AnalysisType, ConversationAnalytics[]>>;
        const grammarRecords = grouped.grammar ?? [];
        const pronunciationRecords = grouped.pronunciation ?? [];
        const fluencyRecords = grouped.fluency ?? [];
        const accentRecords = grouped.accent ?? [];

        const grammarIssues = flattenIssues(grammarRecords);
        const pronunciationIssues = flattenIssues(pronunciationRecords);
        const fluencyIssues = flattenIssues(fluencyRecords);
        const accentIssues = flattenIssues(accentRecords);

        const pronunciationScore = average(
          pronunciationRecords.map((record) => record.pronunciation_score)
        );
        const fluencyScore = average(
          fluencyRecords.map((record) => record.fluency_score)
        );
        const accentScore = average(accentRecords.map((record) => record.accent_score));
        const fillerWordCounts = countFillerWords(fluencyRecords);
        const hesitationsCount = fluencyRecords.reduce(
          (acc, record) => acc + (record.hesitations_count ?? 0),
          0
        );

        const strengths: string[] = [];
        const improvements: string[] = [];

        if (grammarIssues.length === 0) {
          strengths.push('No grammar issues detected. Great accuracy!');
        }

        const strongPronunciation = scoreToStrength('Pronunciation', pronunciationScore);
        const strongFluency = scoreToStrength('Fluency', fluencyScore);
        const strongAccent = scoreToStrength('Accent clarity', accentScore);

        [strongPronunciation, strongFluency, strongAccent]
          .filter((value): value is string => value !== null)
          .forEach((value) => strengths.push(value));

        if (fillerWordCounts.length === 0 && hesitationsCount === 0) {
          strengths.push('Smooth delivery with minimal hesitations.');
        }

        if (grammarIssues.length > 0) {
          const topPattern = aggregatePatterns(grammarIssues)[0];
          if (topPattern) {
            improvements.push(
              `Watch out for ${topPattern.label.replaceAll('_', ' ')} issues (${topPattern.count}).`
            );
          } else {
            improvements.push('Review grammar points highlighted below.');
          }
        }

        const pronunciationImprovement = scoreToImprovement(
          'Pronunciation',
          pronunciationScore
        );
        const fluencyImprovement = scoreToImprovement('Fluency', fluencyScore);
        const accentImprovement = scoreToImprovement('Accent clarity', accentScore);

        [pronunciationImprovement, fluencyImprovement, accentImprovement]
          .filter((value): value is string => value !== null)
          .forEach((value) => improvements.push(value));

        if (fillerWordCounts.length > 0) {
          const topFiller = fillerWordCounts[0];
          improvements.push(
            `Try to reduce filler words such as "${topFiller.word}" (${topFiller.count} times).`
          );
        }

        if (hesitationsCount > 3) {
          improvements.push(
            `You paused ${hesitationsCount} times. Practice breathing and pacing to stay fluid.`
          );
        }

        if (!isMounted) {
          return;
        }

        setSummary({
          grammarIssues,
          grammarSeverityCounts: countSeverity(grammarIssues),
          topGrammarPatterns: aggregatePatterns(grammarIssues),
          pronunciationScore,
          pronunciationIssues,
          fluencyScore,
          fluencyIssues,
          accentScore,
          accentIssues,
          fillerWordCounts,
          hesitationsCount,
          totalAnalyses:
            grammarRecords.length +
            pronunciationRecords.length +
            fluencyRecords.length +
            accentRecords.length,
          strengths,
          improvements,
        });
      } catch (err) {
        console.error('Failed to load session summary:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load session summary.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, [isOpen, sessionId, studentId]);

  const hasAnalytics = useMemo(() => {
    if (!summary) return false;

    return (
      summary.grammarIssues.length > 0 ||
      summary.pronunciationIssues.length > 0 ||
      summary.fluencyIssues.length > 0 ||
      summary.accentIssues.length > 0 ||
      typeof summary.pronunciationScore === 'number' ||
      typeof summary.fluencyScore === 'number' ||
      typeof summary.accentScore === 'number'
    );
  }, [summary]);

  const renderScoreCard = (
    label: string,
    score?: number,
    helper?: string
  ) => (
    <Card className="border border-border/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Badge variant="outline" className="text-xs">
          {score !== undefined ? `${Math.round(score)}` : 'Pending'}
        </Badge>
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground">
          {score !== undefined ? Math.round(score) : '—'}
        </p>
        <Progress value={score ?? 0} />
        {helper && (
          <p className="text-xs text-muted-foreground mt-1">{helper}</p>
        )}
      </div>
    </Card>
  );

  const renderIssueList = (
    title: string,
    issues: AnalyticsIssue[],
    emptyFallback: string,
  ) => (
    <Card className="border border-border/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Badge variant="secondary" className="text-xs">
          {issues.length}
        </Badge>
      </div>
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyFallback}</p>
      ) : (
        <div className="space-y-3">
          {issues.slice(0, 5).map((issue, index) => (
            <div key={`${issue.type}-${index}`} className="rounded-md border border-border/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {issue.type?.replaceAll('_', ' ') || 'Issue'}
                </p>
                {issue.severity && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-medium',
                      severityLabels[issue.severity as IssueSeverity]?.className
                    )}
                  >
                    {severityLabels[issue.severity as IssueSeverity]?.label ??
                      issue.severity}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {issue.original}
              </p>
              {issue.suggestion && (
                <p className="text-xs text-foreground mt-2">
                  <span className="font-medium">Suggestion:</span> {issue.suggestion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Session Summary
          </DialogTitle>
          <DialogDescription>
            Topic: <span className="font-medium text-foreground">{topic}</span>
            {proficiencyLevel ? (
              <>
                {' '}
                · Level:{' '}
                <span className="font-medium text-foreground">
                  {proficiencyLevel}
                </span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5">
            {isLoading ? (
              <Card className="p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">
                    Compiling your session insights...
                  </p>
                </div>
              </Card>
            ) : error ? (
              <Card className="p-6 bg-destructive/10 border-destructive/40">
                <p className="text-sm text-destructive">
                  Failed to load session summary. {error}
                </p>
              </Card>
            ) : !summary || !hasAnalytics ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  We&apos;re still processing the session analysis. Please check back in a moment.
                </p>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  {renderScoreCard(
                    'Pronunciation',
                    summary.pronunciationScore,
                    'Clarity and articulation of words.'
                  )}
                  {renderScoreCard(
                    'Fluency',
                    summary.fluencyScore,
                    'Pace, flow, and hesitations.'
                  )}
                  {renderScoreCard(
                    'Accent Clarity',
                    summary.accentScore,
                    'Understandability to native listeners.'
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderIssueList(
                    'Grammar Highlights',
                    summary.grammarIssues,
                    'No grammar issues detected. Nice work!'
                  )}
                  <Card className="border border-border/60 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Session Highlights</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground tracking-wide mb-2">
                          Strengths
                        </p>
                        {summary.strengths.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Keep practicing! Strengths will appear here as you progress.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {summary.strengths.slice(0, 4).map((item, index) => (
                              <li
                                key={`strength-${index}`}
                                className="flex items-start gap-2 text-sm text-foreground"
                              >
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <p className="text-xs uppercase text-muted-foreground tracking-wide mb-2">
                          Next Focus
                        </p>
                        {summary.improvements.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No urgent improvements. Keep up the great work!
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {summary.improvements.slice(0, 4).map((item, index) => (
                              <li
                                key={`improvement-${index}`}
                                className="flex items-start gap-2 text-sm text-foreground"
                              >
                                <ChevronRight className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderIssueList(
                    'Fluency Notes',
                    summary.fluencyIssues,
                    'No fluency issues detected. Smooth delivery!'
                  )}
                  {renderIssueList(
                    'Pronunciation Notes',
                    summary.pronunciationIssues,
                    'Pronunciation looked good throughout the session.'
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {renderIssueList(
                    'Accent Notes',
                    summary.accentIssues,
                    'Accent clarity was strong this session.'
                  )}

                  <Card className="border border-border/60 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">
                        Fluency Patterns
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground tracking-wide mb-2">
                          Filler Words
                        </p>
                        {summary.fillerWordCounts.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No filler words detected. Great pacing!
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {summary.fillerWordCounts.map((entry) => (
                              <Badge
                                key={entry.word}
                                variant="outline"
                                className="text-xs"
                              >
                                {entry.word} · {entry.count}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs uppercase text-muted-foreground tracking-wide mb-2">
                          Hesitations
                        </p>
                        <p className="text-sm text-foreground">
                          {summary.hesitationsCount} hesitation
                          {summary.hesitationsCount === 1 ? '' : 's'} detected.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {summary.topGrammarPatterns.length > 0 && (
                  <Card className="border border-border/60 p-4 space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      Most frequent grammar patterns
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {summary.topGrammarPatterns.map((pattern) => (
                        <Badge
                          key={pattern.label}
                          variant="outline"
                          className="text-xs"
                        >
                          {pattern.label.replaceAll('_', ' ')} · {pattern.count}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
