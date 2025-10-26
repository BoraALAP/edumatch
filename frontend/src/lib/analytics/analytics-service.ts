/**
 * Analytics Service
 *
 * Purpose: Central service for managing conversation analytics across all session types.
 * Features:
 * - Write analytics for grammar, pronunciation, accent, fluency
 * - Update user analytics summaries
 * - Support both solo practice and peer chat sessions
 * - Handle voice and text message modes
 * - Generate session reports
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AnalysisType,
  AnalyticsIssue,
  MessageMode,
  SessionType,
} from './types';

export interface ConversationAnalyticsInput {
  sessionId: string;
  sessionType: SessionType;
  messageId?: string;
  studentId: string;
  originalMessage: string;
  messageMode: MessageMode;
  analysisType: AnalysisType;
  issues: AnalyticsIssue[];

  // Voice-specific scores
  pronunciationScore?: number;
  fluencyScore?: number;
  accentScore?: number;
  wordsPerMinute?: number;
  hesitationsCount?: number;
  fillerWords?: string[];

  // Audio metadata
  audioUrl?: string;
  transcript?: string;
  audioDuration?: number;

  // Additional metrics
  topicRelevanceScore?: number;
  vocabularyLevel?: string;
  sentenceComplexity?: number;
}

export interface UserAnalyticsSummaryUpdate {
  studentId: string;
  sessionType?: SessionType;
  sessionDuration?: number;
  isVoiceSession?: boolean;
  correctionsReceived?: number;
  grammarCorrections?: number;
  pronunciationCorrections?: number;
  accentCorrections?: number;
  currentGrammarScore?: number;
  currentPronunciationScore?: number;
  grammarErrors?: Record<string, number>;
  difficultSounds?: string[];
}

export class AnalyticsService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Record conversation analytics for a message
   */
  async recordConversationAnalytics(input: ConversationAnalyticsInput): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('conversation_analytics')
        .insert({
          session_id: input.sessionId,
          session_type: input.sessionType,
          message_id: input.messageId,
          student_id: input.studentId,
          original_message: input.originalMessage,
          message_mode: input.messageMode,
          analysis_type: input.analysisType,
          issues: input.issues,
          pronunciation_score: input.pronunciationScore,
          fluency_score: input.fluencyScore,
          accent_score: input.accentScore,
          words_per_minute: input.wordsPerMinute,
          hesitations_count: input.hesitationsCount || 0,
          filler_words: input.fillerWords || [],
          audio_url: input.audioUrl,
          transcript: input.transcript,
          audio_duration: input.audioDuration,
          topic_relevance_score: input.topicRelevanceScore,
          vocabulary_level: input.vocabularyLevel,
          sentence_complexity: input.sentenceComplexity,
        });

      if (error) {
        console.error('Error recording conversation analytics:', error);
        return { success: false, error: error.message };
      }

      // Mark the message as having analytics
      if (input.messageId) {
        await this.markMessageAnalyzed(input.messageId, input.sessionType);
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error recording analytics:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Mark a message as analyzed
   */
  private async markMessageAnalyzed(messageId: string, sessionType: SessionType): Promise<void> {
    const tableName = sessionType === 'text_practice' ? 'text_practice_messages' :
                      sessionType === 'voice_practice' ? 'voice_practice_transcripts' :
                      'messages';

    await this.supabase
      .from(tableName)
      .update({
        has_analytics: true,
        analytics_processed_at: new Date().toISOString(),
      })
      .eq('id', messageId);
  }

  /**
   * Update user analytics summary
   */
  async updateUserAnalyticsSummary(update: UserAnalyticsSummaryUpdate): Promise<{ success: boolean; error?: string }> {
    try {
      // First, get the current summary or create if it doesn't exist
      const { data: currentSummary, error: fetchError } = await this.supabase
        .from('user_analytics_summary')
        .select('*')
        .eq('student_id', update.studentId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Error other than "not found"
        console.error('Error fetching user analytics summary:', fetchError);
        return { success: false, error: fetchError.message };
      }

      // Prepare the update data
      const updateData: Record<string, unknown> = {
        student_id: update.studentId,
      };

      if (currentSummary) {
        // Update existing summary
        updateData.total_sessions = (currentSummary.total_sessions || 0) + 1;

        if (update.sessionType === 'text_practice') {
          updateData.text_sessions = (currentSummary.text_sessions || 0) + 1;
        } else if (update.sessionType === 'voice_practice') {
          updateData.voice_sessions = (currentSummary.voice_sessions || 0) + 1;
        }

        if (update.sessionDuration) {
          updateData.total_practice_time_minutes =
            (currentSummary.total_practice_time_minutes || 0) + Math.round(update.sessionDuration / 60);
        }

        if (update.correctionsReceived) {
          updateData.total_corrections_received =
            (currentSummary.total_corrections_received || 0) + update.correctionsReceived;
        }

        if (update.grammarCorrections) {
          updateData.grammar_corrections =
            (currentSummary.grammar_corrections || 0) + update.grammarCorrections;
        }

        if (update.pronunciationCorrections) {
          updateData.pronunciation_corrections =
            (currentSummary.pronunciation_corrections || 0) + update.pronunciationCorrections;
        }

        if (update.accentCorrections) {
          updateData.accent_corrections =
            (currentSummary.accent_corrections || 0) + update.accentCorrections;
        }

        if (update.currentGrammarScore !== undefined) {
          updateData.current_grammar_score = update.currentGrammarScore;
        }

        if (update.currentPronunciationScore !== undefined) {
          updateData.current_pronunciation_score = update.currentPronunciationScore;
        }

        if (update.grammarErrors) {
          const currentErrors = (currentSummary.frequent_grammar_errors as Record<string, number>) || {};
          const mergedErrors = { ...currentErrors };

          Object.entries(update.grammarErrors).forEach(([errorType, count]) => {
            mergedErrors[errorType] = (mergedErrors[errorType] || 0) + count;
          });

          updateData.frequent_grammar_errors = mergedErrors;
        }

        if (update.difficultSounds) {
          const currentSounds = (currentSummary.difficult_sounds as string[]) || [];
          const uniqueSounds = Array.from(new Set([...currentSounds, ...update.difficultSounds]));
          updateData.difficult_sounds = uniqueSounds;
        }

        updateData.last_session_date = new Date().toISOString();

        // Calculate streak
        const lastSessionDate = currentSummary.last_session_date
          ? new Date(currentSummary.last_session_date)
          : null;

        if (lastSessionDate) {
          const daysSinceLastSession = Math.floor(
            (Date.now() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastSession === 1) {
            // Continue streak
            updateData.current_streak_days = (currentSummary.current_streak_days || 0) + 1;
            updateData.longest_streak_days = Math.max(
              currentSummary.longest_streak_days || 0,
              (updateData.current_streak_days as number)
            );
          } else if (daysSinceLastSession === 0) {
            // Same day, maintain streak
            updateData.current_streak_days = currentSummary.current_streak_days || 1;
          } else {
            // Streak broken
            updateData.current_streak_days = 1;
          }
        } else {
          updateData.current_streak_days = 1;
          updateData.longest_streak_days = 1;
        }
      } else {
        // Create new summary
        updateData.total_sessions = 1;
        updateData.text_sessions = update.sessionType === 'text_practice' ? 1 : 0;
        updateData.voice_sessions = update.sessionType === 'voice_practice' ? 1 : 0;
        updateData.total_practice_time_minutes = update.sessionDuration
          ? Math.round(update.sessionDuration / 60)
          : 0;
        updateData.total_corrections_received = update.correctionsReceived || 0;
        updateData.grammar_corrections = update.grammarCorrections || 0;
        updateData.pronunciation_corrections = update.pronunciationCorrections || 0;
        updateData.accent_corrections = update.accentCorrections || 0;
        updateData.current_grammar_score = update.currentGrammarScore;
        updateData.current_pronunciation_score = update.currentPronunciationScore;
        updateData.frequent_grammar_errors = update.grammarErrors || {};
        updateData.difficult_sounds = update.difficultSounds || [];
        updateData.current_streak_days = 1;
        updateData.longest_streak_days = 1;
        updateData.last_session_date = new Date().toISOString();
      }

      // Upsert the summary
      const { error: upsertError } = await this.supabase
        .from('user_analytics_summary')
        .upsert(updateData, { onConflict: 'student_id' });

      if (upsertError) {
        console.error('Error updating user analytics summary:', upsertError);
        return { success: false, error: upsertError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error updating user analytics summary:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get analytics for a session
   */
  async getSessionAnalytics(sessionId: string, sessionType: SessionType) {
    const { data, error } = await this.supabase
      .from('conversation_analytics')
      .select('*')
      .eq('session_id', sessionId)
      .eq('session_type', sessionType)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching session analytics:', error);
      return { data: null, error };
    }

    return { data, error: null };
  }

  /**
   * Get user analytics summary
   */
  async getUserAnalyticsSummary(studentId: string) {
    const { data, error } = await this.supabase
      .from('user_analytics_summary')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user analytics summary:', error);
      return { data: null, error };
    }

    return { data: data || null, error: null };
  }

  /**
   * Get analytics grouped by analysis type for a session
   */
  async getSessionAnalyticsByType(sessionId: string, sessionType: SessionType) {
    const { data, error } = await this.getSessionAnalytics(sessionId, sessionType);

    if (error || !data) {
      return { data: null, error };
    }

    // Group by analysis type
    const grouped = data.reduce((acc, record) => {
      const type = record.analysis_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(record);
      return acc;
    }, {} as Record<AnalysisType, typeof data>);

    return { data: grouped, error: null };
  }

  /**
   * Get recent analytics for a student (last N sessions)
   */
  async getRecentStudentAnalytics(studentId: string, limit = 10) {
    const { data, error } = await this.supabase
      .from('conversation_analytics')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent student analytics:', error);
      return { data: null, error };
    }

    return { data, error: null };
  }
}

// Export a default instance
export const analyticsService = new AnalyticsService();
