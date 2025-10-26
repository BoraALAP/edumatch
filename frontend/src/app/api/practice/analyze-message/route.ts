/**
 * Solo Practice Message Analysis API
 *
 * Analyzes student messages for grammar errors and provides detailed correction data.
 * This endpoint is called separately from the main conversation API to:
 * - Enable comprehensive error tracking
 * - Generate structured correction data for reporting
 * - Separate correction logic from conversation flow
 *
 * Returns structured grammar analysis that gets stored in the database
 * for teacher dashboards and student progress reports.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai';

// Check every message for errors but manage correction frequency
const CORRECTION_COOLDOWN_MESSAGES = 1; // Check every message
const lastCorrectionIndex = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      userMessageId,
      message,
      studentLevel,
      messageIndex = 0,
      grammarFocus = []
    } = body;

    if (!sessionId || !userMessageId || !message) {
      return NextResponse.json(
        { error: 'sessionId, userMessageId, and message are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Analyze grammar using AI service - check EVERY message
    const grammarAnalysis = await aiService.checkGrammar(message, studentLevel);

    console.log('[Grammar Analysis] Full analysis result:', JSON.stringify(grammarAnalysis, null, 2));

    // Show ALL issues to help students learn (including minor ones)
    const allIssues = grammarAnalysis.issues;

    console.log('[Grammar Analysis] Total issues found:', allIssues.length);

    // If no issues, mark the message as correct with a checkmark
    if (!grammarAnalysis.hasIssues || allIssues.length === 0) {
      // Update the user message to mark it as correct
      await supabase
        .from('text_practice_messages')
        .update({
          grammar_issues: [],
          has_correction: false,
          is_correct: true, // Add this flag to indicate the message is grammatically correct
        })
        .eq('id', userMessageId);

      return NextResponse.json({
        success: true,
        shouldCorrect: false,
        reason: 'no_issues_found',
        analysis: grammarAnalysis,
        isCorrect: true
      });
    }

    // Check cooldown for showing corrections (but we still analyzed the message above)
    const lastCorrected = lastCorrectionIndex.get(sessionId) ?? -999;
    const messagesSinceLastCorrection = messageIndex - lastCorrected;

    if (messagesSinceLastCorrection < CORRECTION_COOLDOWN_MESSAGES) {
      // Store the issues but don't show correction yet
      await supabase
        .from('text_practice_messages')
        .update({
          grammar_issues: allIssues,
          has_correction: false,
          is_correct: false,
        })
        .eq('id', userMessageId);

      return NextResponse.json({
        success: true,
        shouldCorrect: false,
        reason: 'cooldown',
        messagesUntilNextCorrection: CORRECTION_COOLDOWN_MESSAGES - messagesSinceLastCorrection,
        hasIssues: true,
        issues: allIssues
      });
    }

    // Determine the primary correction category and severity
    const primaryIssue = allIssues[0];
    const correctionCategory = categorizeSent(primaryIssue);
    const overallSeverity = getOverallSeverity(allIssues);

    // Generate a friendly correction message
    const correctionMessage = await generateCorrectionMessage(
      message,
      allIssues
    );

    // Store the correction in the database
    const { data: correctionRecord, error: insertError } = await supabase
      .from('text_practice_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: correctionMessage,
        message_type: 'correction',
        corrected_message_id: userMessageId,
        grammar_issues: allIssues,
        ai_correction: grammarAnalysis.overallFeedback || correctionMessage,
        correction_type: correctionCategory,
        correction_severity: overallSeverity,
        has_correction: true,
        correction_metadata: {
          original_message: message,
          student_level: studentLevel,
          grammar_focus: grammarFocus,
          analysis_timestamp: new Date().toISOString(),
          total_issues_found: grammarAnalysis.issues.length,
          shown_issues: allIssues.length
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting correction message:', insertError);
      throw insertError;
    }

    // Update the cooldown
    lastCorrectionIndex.set(sessionId, messageIndex);

    // Update session correction count
    await supabase.rpc('increment_session_message_count', {
      p_session_id: sessionId,
      p_is_correction: true,
    });

    return NextResponse.json({
      success: true,
      shouldCorrect: true,
      correction: {
        id: correctionRecord.id,
        message: correctionMessage,
        category: correctionCategory,
        severity: overallSeverity,
        issues: allIssues,
      }
    });

  } catch (error) {
    console.error('Error in message analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Categorize language issue into correction category enum
 */
function categorizeIssue(issue: { original: string; corrected?: string; correction?: string; explanation?: string }): string {
  const explanation = (issue.explanation || '').toLowerCase();

  // Grammar errors
  if (explanation.includes('tense') || explanation.includes('past') || explanation.includes('present') || explanation.includes('future')) {
    return 'grammar_tense';
  } else if (explanation.includes('article') || explanation.includes('a/an/the')) {
    return 'grammar_article';
  } else if (explanation.includes('subject') && explanation.includes('verb')) {
    return 'grammar_verb_agreement';
  } else if (explanation.includes('preposition') || explanation.includes('at/in/on')) {
    return 'grammar_preposition';
  } else if (explanation.includes('word order') || explanation.includes('sentence structure')) {
    return 'grammar_word_order';
  } else if (explanation.includes('plural') || explanation.includes('singular')) {
    return 'grammar_plural';
  } else if (explanation.includes('pronoun') || explanation.includes('he/she/it')) {
    return 'grammar_pronoun';
  }

  // Vocabulary errors
  else if (explanation.includes('vocabulary') || explanation.includes('word choice') || explanation.includes('wrong word')) {
    return 'vocabulary';
  }

  // Spelling errors
  else if (explanation.includes('spelling') || explanation.includes('misspell')) {
    return 'spelling';
  }

  // Idiomatic/phrasing errors
  else if (explanation.includes('idiom') || explanation.includes('idiomatic') || explanation.includes('unnatural') || explanation.includes('awkward phrasing')) {
    return 'idiom';
  }

  // Punctuation errors
  else if (explanation.includes('punctuation') || explanation.includes('comma') || explanation.includes('period')) {
    return 'punctuation';
  }

  return 'other';
}

/**
 * Determine overall severity from multiple issues
 */
function getOverallSeverity(issues: Array<{ severity: string }>): 'minor' | 'moderate' | 'major' {
  const severityCounts = {
    major: issues.filter(i => i.severity === 'major').length,
    moderate: issues.filter(i => i.severity === 'moderate').length,
    minor: issues.filter(i => i.severity === 'minor').length,
  };

  if (severityCounts.major > 0) return 'major';
  if (severityCounts.moderate > 1) return 'major';
  if (severityCounts.moderate > 0) return 'moderate';
  return 'minor';
}

/**
 * Generate a friendly, encouraging correction message
 */
async function generateCorrectionMessage(
  originalMessage: string,
  issues: Array<{ original: string; correction?: string; corrected?: string; explanation?: string; severity: string }>
): Promise<string> {
  // For now, create a template-based message
  // In the future, this could use AI to generate more natural corrections

  const primaryIssue = issues[0];
  const correctedText = primaryIssue.correction || primaryIssue.corrected || '';

  if (issues.length === 1) {
    return `Great effort! Quick grammar tip: ${primaryIssue.explanation || `Try saying "${correctedText}" instead of "${primaryIssue.original}"`}`;
  } else {
    const issueList = issues.map(issue => {
      const corrected = issue.correction || issue.corrected || '';
      return `"${issue.original}" → "${corrected}"`;
    }).join(', ');

    return `Good work! I noticed a few grammar points to improve: ${issueList}. ${primaryIssue.explanation || 'Keep practicing!'}`;
  }
}

function categorizeSent(issue: { original: string; correction?: string; corrected?: string; explanation?: string }): string {
  return categorizeIssue(issue);
}
