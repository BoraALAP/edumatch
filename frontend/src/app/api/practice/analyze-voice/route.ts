/**
 * Voice Analysis API Route
 *
 * Purpose: Analyze voice transcripts for grammar, pronunciation, accent, and fluency
 * Features:
 * - Silent background analysis during voice conversation
 * - Returns detailed analysis without displaying to user
 * - Stores analytics for post-session summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { aiService } from '@/lib/ai/ai-service';
import { analyticsService, type AnalyticsIssue } from '@/lib/analytics';

export const runtime = 'edge';
export const maxDuration = 30;

interface VoiceAnalysisRequest {
  sessionId: string;
  transcript: string;
  studentLevel: string;
}

interface VoiceAnalysisResponse {
  grammarIssues: AnalyticsIssue[];
  pronunciationIssues: AnalyticsIssue[];
  accentIssues: AnalyticsIssue[];
  fluencyIssues: AnalyticsIssue[];
  pronunciationScore?: number;
  fluencyScore?: number;
  accentScore?: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: VoiceAnalysisRequest = await request.json();
    const { sessionId, transcript, studentLevel } = body;

    if (!sessionId || !transcript) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Run parallel analysis for different aspects
    const [grammarResult, pronunciationResult, fluencyResult] = await Promise.all([
      // Grammar analysis
      analyzeGrammar(transcript, studentLevel),

      // Pronunciation analysis (simulated for now - would use speech API in production)
      analyzePronunciation(transcript),

      // Fluency analysis
      analyzeFluency(transcript),
    ]);

    // Accent analysis (if enabled in user profile)
    const accentResult = await analyzeAccent(transcript);

    const response: VoiceAnalysisResponse = {
      grammarIssues: grammarResult.issues,
      pronunciationIssues: pronunciationResult.issues,
      accentIssues: accentResult.issues,
      fluencyIssues: fluencyResult.issues,
      pronunciationScore: pronunciationResult.score,
      fluencyScore: fluencyResult.score,
      accentScore: accentResult.score,
    };

    // Store analytics in background (don't await)
    storeVoiceAnalytics(sessionId, user.id, transcript, response).catch((error) => {
      console.error('Error storing voice analytics:', error);
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error analyzing voice:', error);
    return NextResponse.json(
      { error: 'Failed to analyze voice transcript' },
      { status: 500 }
    );
  }
}

/**
 * Analyze grammar in transcript
 */
async function analyzeGrammar(
  transcript: string,
  studentLevel: string
): Promise<{ issues: AnalyticsIssue[] }> {
  try {
    const result = await aiService.checkGrammar(transcript, studentLevel);

    return {
      issues: result.issues.map((issue) => ({
        type: issue.type,
        severity: issue.severity,
        original: issue.original,
        suggestion: issue.suggestion,
        explanation: issue.explanation,
        position: issue.position,
      })),
    };
  } catch (error) {
    console.error('Error analyzing grammar:', error);
    return { issues: [] };
  }
}

/**
 * Analyze pronunciation (simulated - would use speech API in production)
 */
async function analyzePronunciation(
  transcript: string
): Promise<{ issues: AnalyticsIssue[]; score?: number }> {
  // TODO: Integrate with actual speech-to-text API for pronunciation analysis
  // For now, return empty analysis

  // Simulate pronunciation score (70-95 range)
  const score = Math.floor(Math.random() * 25) + 70;

  return {
    issues: [],
    score,
  };
}

/**
 * Analyze fluency (hesitations, filler words, pace)
 */
async function analyzeFluency(
  transcript: string
): Promise<{ issues: AnalyticsIssue[]; score?: number }> {
  const issues: AnalyticsIssue[] = [];

  // Detect filler words
  const fillerWords = ['um', 'uh', 'like', 'you know', 'i mean', 'so', 'well'];
  const fillerPattern = new RegExp(`\\b(${fillerWords.join('|')})\\b`, 'gi');
  const fillers = transcript.match(fillerPattern) || [];

  if (fillers.length > 3) {
    issues.push({
      type: 'filler_words',
      severity: fillers.length > 6 ? 'moderate' : 'minor',
      original: fillers.join(', '),
      suggestion: 'Try to reduce filler words for smoother speech',
      explanation: 'Filler words can interrupt the flow of conversation. Practice pausing instead.',
    });
  }

  // Detect repetitions
  const words = transcript.toLowerCase().split(/\s+/);
  const repetitions: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] === words[i + 1] && words[i].length > 2) {
      repetitions.push(words[i]);
    }
  }

  if (repetitions.length > 0) {
    issues.push({
      type: 'repetition',
      severity: 'minor',
      original: repetitions.join(', '),
      suggestion: 'Avoid repeating words unnecessarily',
      explanation: 'Word repetitions can indicate hesitation or lack of confidence.',
    });
  }

  // Calculate fluency score
  const wordCount = words.length;
  const fillerRatio = fillers.length / Math.max(wordCount, 1);
  const repetitionRatio = repetitions.length / Math.max(wordCount, 1);

  // Score: 100 - penalties
  const fillerPenalty = fillerRatio * 30;
  const repetitionPenalty = repetitionRatio * 20;
  const score = Math.max(50, Math.min(100, 100 - fillerPenalty - repetitionPenalty));

  return {
    issues,
    score: Math.round(score),
  };
}

/**
 * Analyze accent (basic - would use speech API in production)
 */
async function analyzeAccent(
  transcript: string
): Promise<{ issues: AnalyticsIssue[]; score?: number }> {
  // TODO: Integrate with actual speech API for accent analysis
  // For now, return empty analysis

  // Simulate accent score (60-90 range)
  const score = Math.floor(Math.random() * 30) + 60;

  return {
    issues: [],
    score,
  };
}

/**
 * Store voice analytics in database
 */
async function storeVoiceAnalytics(
  sessionId: string,
  studentId: string,
  transcript: string,
  analysis: VoiceAnalysisResponse
): Promise<void> {
  // Store each type of analysis separately
  const analyticsPromises = [];

  // Grammar analytics
  if (analysis.grammarIssues.length > 0) {
    analyticsPromises.push(
      analyticsService.recordConversationAnalytics({
        sessionId,
        sessionType: 'voice_practice',
        studentId,
        originalMessage: transcript,
        messageMode: 'voice',
        analysisType: 'grammar',
        issues: analysis.grammarIssues,
        transcript,
      })
    );
  }

  // Pronunciation analytics
  if (analysis.pronunciationIssues.length > 0 || analysis.pronunciationScore) {
    analyticsPromises.push(
      analyticsService.recordConversationAnalytics({
        sessionId,
        sessionType: 'voice_practice',
        studentId,
        originalMessage: transcript,
        messageMode: 'voice',
        analysisType: 'pronunciation',
        issues: analysis.pronunciationIssues,
        pronunciationScore: analysis.pronunciationScore,
        transcript,
      })
    );
  }

  // Fluency analytics
  if (analysis.fluencyIssues.length > 0 || analysis.fluencyScore) {
    analyticsPromises.push(
      analyticsService.recordConversationAnalytics({
        sessionId,
        sessionType: 'voice_practice',
        studentId,
        originalMessage: transcript,
        messageMode: 'voice',
        analysisType: 'fluency',
        issues: analysis.fluencyIssues,
        fluencyScore: analysis.fluencyScore,
        transcript,
      })
    );
  }

  // Accent analytics
  if (analysis.accentIssues.length > 0 || analysis.accentScore) {
    analyticsPromises.push(
      analyticsService.recordConversationAnalytics({
        sessionId,
        sessionType: 'voice_practice',
        studentId,
        originalMessage: transcript,
        messageMode: 'voice',
        analysisType: 'accent',
        issues: analysis.accentIssues,
        accentScore: analysis.accentScore,
        transcript,
      })
    );
  }

  await Promise.all(analyticsPromises);
}
