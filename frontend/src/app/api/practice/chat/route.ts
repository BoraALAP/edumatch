/**
 * Solo Practice Chat API Route - AI SDK Streaming
 *
 * Streaming endpoint for solo practice conversations using Mastra + AI SDK.
 * Provides real-time streaming responses for better UX.
 *
 * Uses:
 * - Mastra agent for AI orchestration
 * - Vercel AI SDK for streaming
 * - Real-time grammar corrections
 * - Saves AI responses to text_practice_messages table
 */

import { streamText, type CoreMessage, type LanguageModel, convertToCoreMessages } from 'ai';
import {
  soloPracticeAgent,
  buildSoloPracticeInstructions,
  hasGrammarCorrection,
} from '@/mastra/agents/solo-practice-agent';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { messages, data } = await req.json();

    const supabase = await createClient();

    // Extract context from data
    const {
      sessionId,
      topic,
      studentLevel,
      learningGoals = [],
      grammarFocus = [],
    } = data || {};

    if (!sessionId || !topic || !studentLevel) {
      return new Response(
        JSON.stringify({ error: 'sessionId, topic and studentLevel are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert UI messages to core messages using AI SDK utility
    const coreMessages: CoreMessage[] = convertToCoreMessages(messages ?? []);

    // Build conversation history for context
    const conversationHistory: Array<{ role: 'student' | 'coach'; content: string }> =
      coreMessages.slice(0, -1).map((msg) => ({
        role: msg.role === 'user' ? 'student' : 'coach',
        content: typeof msg.content === 'string' ? msg.content :
          msg.content.map(part => part.type === 'text' ? part.text : '').join(''),
      }));

    const systemInstructions = buildSoloPracticeInstructions({
      topic,
      studentLevel,
      learningGoals,
      conversationHistory,
      grammarFocus,
    });

    // Stream response using AI SDK
    const result = streamText({
      model: soloPracticeAgent.model as unknown as LanguageModel,
      system: systemInstructions,
      messages: coreMessages,
      temperature: 0.8,
      async onFinish({ text }) {
        // Save AI response to database
        try {
          // Detect if response contains correction
          const hasCorrection = hasGrammarCorrection(text);

          await supabase.from('text_practice_messages').insert({
            session_id: sessionId,
            role: 'assistant',
            content: text,
            has_correction: hasCorrection,
            correction_type: hasCorrection ? 'grammar' : null,
          });

          // Update session stats
          await supabase.rpc('increment_session_message_count', {
            p_session_id: sessionId,
            p_is_correction: hasCorrection,
          });
        } catch (error) {
          console.error('Error saving AI response:', error);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in solo practice chat:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
