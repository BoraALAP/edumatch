/**
 * Voice Corrections API
 *
 * Purpose: Generate grammar corrections for voice practice transcripts
 * Called when user pauses the session to show accumulated corrections
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const runtime = 'nodejs';

interface CorrectionRequest {
  sessionId: string;
  studentId: string;
  studentLevel?: string;
}

interface GrammarCorrection {
  original_text: string;
  corrected_text: string;
  explanation: string;
  category: string;
  severity: 'minor' | 'moderate' | 'major';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CorrectionRequest;
    const { sessionId, studentId, studentLevel } = body;

    if (!sessionId || !studentId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId and studentId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get all user transcripts from this session that haven't been corrected yet
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('voice_practice_transcripts')
      .select('*')
      .eq('session_id', sessionId)
      .eq('role', 'user')
      .eq('has_correction', false)
      .order('sequence_number', { ascending: true });

    if (transcriptsError) {
      console.error('[Voice Corrections] Error fetching transcripts:', transcriptsError);
      return NextResponse.json(
        { error: 'Failed to fetch transcripts' },
        { status: 500 }
      );
    }

    console.log('[Voice Corrections] Fetched transcripts:', {
      sessionId,
      count: transcripts?.length || 0,
      transcripts: transcripts?.map(t => ({ id: t.id, text: t.text }))
    });

    if (!transcripts || transcripts.length === 0) {
      console.log('[Voice Corrections] No uncorrected user transcripts found');
      return NextResponse.json({ corrections: [] });
    }

    // Combine all user text
    const combinedText = transcripts.map((t) => t.text).join(' ');
    console.log('[Voice Corrections] Combined text to analyze:', combinedText);

    // Generate corrections using AI
    const { text: aiResponse } = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0.3,
      prompt: `You are an English grammar coach analyzing voice transcripts from a ${studentLevel || 'B1'}-level student.

Analyze the following student speech and identify grammar errors. For each error:
1. Extract the exact problematic phrase
2. Provide the corrected version
3. Explain why it's wrong and how to fix it
4. Categorize the error (grammar_tense, grammar_article, grammar_verb_agreement, grammar_preposition, grammar_word_order, grammar_plural, grammar_pronoun, vocabulary, pronunciation, idiom, other)
5. Rate severity (minor, moderate, major)

Student speech: "${combinedText}"

Return ONLY a JSON array of corrections in this exact format:
[
  {
    "original_text": "exact problematic phrase",
    "corrected_text": "corrected version",
    "explanation": "brief, encouraging explanation",
    "category": "grammar_tense",
    "severity": "moderate"
  }
]

If there are no errors, return an empty array: []`,
    });

    console.log('[Voice Corrections] AI response:', aiResponse);

    let corrections: GrammarCorrection[] = [];
    try {
      corrections = JSON.parse(aiResponse) as GrammarCorrection[];
      console.log('[Voice Corrections] Parsed corrections:', corrections);
    } catch (parseError) {
      console.error('[Voice Corrections] Failed to parse AI response:', {
        error: parseError,
        response: aiResponse
      });
      corrections = [];
    }

    // Save corrections to database
    if (corrections.length > 0) {
      const correctionsToInsert = corrections.map((correction) => ({
        session_id: sessionId,
        transcript_id: transcripts[0]?.id, // Link to first transcript for reference
        original_text: correction.original_text,
        corrected_text: correction.corrected_text,
        explanation: correction.explanation,
        category: correction.category,
        severity: correction.severity,
        shown_to_user: true,
        shown_at: new Date().toISOString(),
      }));

      await supabase.from('voice_practice_corrections').insert(correctionsToInsert);

      // Mark transcripts as having corrections
      const transcriptIds = transcripts.map((t) => t.id);
      await supabase
        .from('voice_practice_transcripts')
        .update({ has_correction: true })
        .in('id', transcriptIds);

      // Update session correction count
      await supabase
        .from('voice_practice_sessions')
        .update({
          correction_count: corrections.length,
        })
        .eq('id', sessionId);

      // Save event
      await supabase.from('voice_practice_events').insert({
        session_id: sessionId,
        event_type: 'correction_generated',
        event_data: { count: corrections.length },
        timestamp: new Date().toISOString(),
      });

      console.log('[Voice Corrections] Generated and saved corrections', {
        sessionId,
        count: corrections.length,
      });
    }

    return NextResponse.json({ corrections });
  } catch (error) {
    console.error('Error generating corrections:', error);
    return NextResponse.json(
      { error: 'Failed to generate corrections' },
      { status: 500 }
    );
  }
}
