/**
 * AI Moderation API Route
 *
 * AI Conversation Agent ("Listener") - monitors chat messages and provides:
 * - Grammar corrections
 * - Topic redirection when conversation drifts
 * - Encouraging feedback
 *
 * Uses OpenAI GPT to analyze messages and interject when needed.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { runConversationAgent } from '@/lib/agents/conversation-agent';

// Cooldown to prevent AI from being too intrusive (30 seconds)
const AI_COOLDOWN_MS = 30000;
const lastAIInterjection = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, message, topic, recentMessages = [] } = body;

    if (!matchId || !message) {
      return NextResponse.json(
        { error: 'matchId and message are required' },
        { status: 400 }
      );
    }

    // Check cooldown
    const lastTime = lastAIInterjection.get(matchId) || 0;
    const now = Date.now();
    if (now - lastTime < AI_COOLDOWN_MS) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'cooldown'
      });
    }

    const supabase = await createClient();

    // Run the conversation agent with context
    const aiResponse = await runConversationAgent({
      topic,
      recentMessages,
      latestMessage: message,
    });

    // Only interject if AI has something to say (not just "OK")
    if (aiResponse && aiResponse !== 'OK' && aiResponse.length > 3) {
      // Determine the type of interjection
      const isGrammarCorrection = aiResponse.toLowerCase().includes('grammar') ||
                                   aiResponse.toLowerCase().includes('should be') ||
                                   aiResponse.toLowerCase().includes('correction');

      const messageType = isGrammarCorrection ? 'correction' : 'feedback';
      const senderType = isGrammarCorrection ? 'ai_correction' : 'ai_system';

      // Update cooldown
      lastAIInterjection.set(matchId, now);

      // Return streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Send start event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            senderType
          })}\n\n`));

          // Stream the response character by character
          for (const char of aiResponse) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'token',
              content: char
            })}\n\n`));
            // Small delay for visual effect
            await new Promise(resolve => setTimeout(resolve, 30));
          }

          // Insert the complete message in database
          console.log('Inserting AI message:', {
            match_id: matchId,
            sender_type: senderType,
            content: aiResponse,
            content_length: aiResponse.length,
            message_type: messageType,
          });

          const { data: messageData, error: insertError } = await supabase
            .from('messages')
            .insert({
              match_id: matchId,
              sender_id: null,
              sender_type: senderType,
              content: aiResponse,
              message_type: messageType,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error inserting AI message:', insertError);
          } else {
            console.log('AI message inserted successfully:', messageData);
          }

          // Send completion with message ID
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            messageId: messageData?.id,
            fullContent: aiResponse
          })}\n\n`));

          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // No interjection needed
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'no_action',
          reason: 'no_issues_found'
        })}\n\n`));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in AI moderation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
