/**
 * AI Moderation API Route
 *
 * AI Conversation Agent ("Listener") - monitors chat messages and provides:
 * - Grammar corrections
 * - Topic redirection when conversation drifts
 * - Encouraging feedback
 *
 * Powered by Mastra via the shared aiService abstraction to keep providers swappable.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai';

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

    // Run the conversation agent with context via Mastra provider
    const feedback = await aiService.monitorConversation({
      topic,
      recentMessages,
      latestMessage: message,
    });

    // Only interject if AI has something to say (not just "OK")
    if (feedback.shouldInterject && feedback.message && feedback.message.length > 3) {
      const aiResponse = feedback.message;

      // Determine sender/message type from structured feedback
      const messageType = feedback.feedbackType === 'grammar' ? 'correction' : 'feedback';
      const senderType =
        feedback.feedbackType === 'grammar' ? 'ai_correction' : 'ai_system';

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
            fullContent: aiResponse,
            feedbackType: feedback.feedbackType,
            severity: feedback.severity,
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
          reason: 'no_issues_found',
          feedbackType: feedback.feedbackType ?? null
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
